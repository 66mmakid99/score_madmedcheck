// src/lib/pipeline/index.ts
// 전체 파이프라인 통합

import { createClient } from '@supabase/supabase-js';
import { searchClinicsInRegion, type HospitalBasicInfo } from './naver-search';
import { scrapeUrl, extractDoctorSections } from './firecrawl';
import { extractFacts, generateConsultingComment } from './claude-analyzer';
import { analyzeDoctor } from './scoring';

export interface PipelineConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  naverClientId: string;
  naverClientSecret: string;
  firecrawlApiKey: string;
  anthropicApiKey: string;
}

export interface PipelineResult {
  hospitalName: string;
  success: boolean;
  doctorId?: string;
  error?: string;
}

/**
 * 단일 병원 처리 파이프라인
 */
export async function processHospital(
  hospital: HospitalBasicInfo,
  region: string,
  config: PipelineConfig
): Promise<PipelineResult> {
  const { hospitalName } = { hospitalName: hospital.name };

  try {
    console.log(`\n📍 처리 중: ${hospitalName}`);

    // 1. 홈페이지 스크래핑
    let scrapedContent = '';
    if (hospital.url) {
      console.log(`  🔍 스크래핑: ${hospital.url}`);
      const scraped = await scrapeUrl(hospital.url, config.firecrawlApiKey);
      if (scraped.success) {
        scrapedContent = extractDoctorSections(scraped.markdown);
        console.log(`  ✅ 스크래핑 성공 (${scrapedContent.length}자)`);
      } else {
        console.log(`  ⚠️ 스크래핑 실패: ${scraped.error}`);
      }
    }

    // 스크래핑 실패 시 기본 정보만 사용
    if (!scrapedContent) {
      scrapedContent = `병원명: ${hospitalName}\n주소: ${hospital.address}\n전화: ${hospital.telephone}`;
    }

    // 2. Claude로 팩트 추출
    console.log(`  🤖 Claude 분석 중...`);
    const facts = await extractFacts(scrapedContent, hospitalName, config.anthropicApiKey);
    console.log(`  ✅ 팩트 ${facts.verifiedFacts.length}개 추출`);

    // 3. 점수 계산
    const { scores, tier, doctorType, radarData } = analyzeDoctor(facts);
    console.log(`  📊 점수: ${scores.total}점 (${tier})`);

    // 100점 미만은 저장하지 않음
    if (scores.total < 100) {
      console.log(`  ⏭️ 100점 미만으로 스킵`);
      return { hospitalName, success: true, error: 'Score below threshold' };
    }

    // 4. AI 코멘트 생성
    const comment = await generateConsultingComment(
      facts,
      scores,
      doctorType,
      tier,
      config.anthropicApiKey
    );

    // 5. Supabase 저장
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

    const doctorData = {
      hospital_name: hospitalName,
      doctor_name: facts.doctorName,
      hospital_url: hospital.url,
      region,
      specialist_type: facts.specialistType,
      years_of_practice: facts.yearsOfPractice,
      has_fellow: facts.hasFellow,
      has_phd: facts.hasPhd,
      sci_papers_first: facts.sciPapersFirst,
      sci_papers_co: facts.sciPapersCo,
      if_bonus_count: facts.ifBonusCount,
      volume_awards: facts.volumeAwards,
      trainer_count: facts.trainerCount,
      signature_cases: facts.signatureCases,
      has_safety_record: facts.hasSafetyRecord,
      kol_count: facts.kolCount,
      society_count: facts.societyCount,
      book_count: facts.bookCount,
      foundation_score: scores.foundation,
      academic_score: scores.academic,
      clinical_score: scores.clinical,
      reputation_score: scores.reputation,
      total_score: scores.total,
      tier,
      doctor_type: doctorType,
      verified_facts: JSON.stringify(facts.verifiedFacts),
      filtered_claims: JSON.stringify(facts.filteredClaims),
      radar_chart_data: JSON.stringify(radarData),
      consulting_comment: comment,
      crawl_status: 'completed',
      last_crawled_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('doctors')
      .upsert(doctorData, { onConflict: 'hospital_name,doctor_name' })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log(`  💾 저장 완료: ${data.id}`);
    return { hospitalName, success: true, doctorId: data.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ 오류: ${errorMessage}`);

    // 크롤링 로그 저장
    try {
      const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      await supabase.from('crawl_logs').insert({
        hospital_name: hospitalName,
        hospital_url: hospital.url,
        error_message: errorMessage,
        status: 'failed',
      });
    } catch {
      // 로그 저장 실패는 무시
    }

    return { hospitalName, success: false, error: errorMessage };
  }
}

/**
 * 지역별 일괄 처리 파이프라인
 */
export async function processRegion(
  region: string,
  specialty: '피부과' | '성형외과',
  config: PipelineConfig,
  delayMs: number = 2000
): Promise<PipelineResult[]> {
  console.log(`\n🏥 ${region} ${specialty} 크롤링 시작`);

  // 1. 네이버 검색으로 병원 리스트 가져오기
  const hospitals = await searchClinicsInRegion(
    region,
    specialty,
    config.naverClientId,
    config.naverClientSecret
  );

  console.log(`📋 ${hospitals.length}개 병원 발견`);

  // 2. 각 병원 처리
  const results: PipelineResult[] = [];

  for (const hospital of hospitals) {
    const result = await processHospital(hospital, region, config);
    results.push(result);

    // API 레이트 리밋 방지
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 3. 결과 요약
  const successful = results.filter((r) => r.success && r.doctorId).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`\n📊 ${region} 완료: 성공 ${successful}, 실패 ${failed}`);

  return results;
}

/**
 * 전체 파이프라인 실행
 */
export async function runFullPipeline(
  regions: string[],
  specialty: '피부과' | '성형외과',
  config: PipelineConfig
): Promise<Map<string, PipelineResult[]>> {
  console.log('🚀 MadMedCheck 데이터 수집 파이프라인 시작\n');
  console.log(`대상 지역: ${regions.join(', ')}`);
  console.log(`대상 진료과: ${specialty}\n`);

  const allResults = new Map<string, PipelineResult[]>();

  for (const region of regions) {
    const results = await processRegion(region, specialty, config);
    allResults.set(region, results);
  }

  // 전체 요약
  let totalSuccess = 0;
  let totalFailed = 0;
  allResults.forEach((results) => {
    totalSuccess += results.filter((r) => r.success && r.doctorId).length;
    totalFailed += results.filter((r) => !r.success).length;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 파이프라인 완료`);
  console.log(`   총 성공: ${totalSuccess}건`);
  console.log(`   총 실패: ${totalFailed}건`);
  console.log('='.repeat(50));

  return allResults;
}
