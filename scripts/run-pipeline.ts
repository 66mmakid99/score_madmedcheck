// scripts/run-pipeline.ts
// 데이터 수집 파이프라인 실행 스크립트 (D1 버전)

import { config } from 'dotenv';
import { searchClinicsInRegion } from '../src/lib/pipeline/naver-search';
import { scrapeUrl, extractDoctorSections } from '../src/lib/pipeline/firecrawl';
import { extractFacts, generateConsultingComment } from '../src/lib/pipeline/claude-analyzer';
import { analyzeDoctor } from '../src/lib/pipeline/scoring';

config();

// 환경변수 확인
function validateEnv() {
  const required = [
    'NAVER_CLIENT_ID',
    'NAVER_CLIENT_SECRET',
    'FIRECRAWL_API_KEY',
    'ANTHROPIC_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 필수 환경변수가 없습니다:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  return {
    naverClientId: process.env.NAVER_CLIENT_ID!,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET!,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  };
}

// 크롤링 대상 지역
const REGIONS = [
  '청담역 피부과',
  '강남역 피부과',
  '신사역 피부과',
];

interface DoctorData {
  hospital_name: string;
  doctor_name: string | null;
  english_name: string | null;
  hospital_url: string | null;
  region: string;
  specialist_type: string;
  years_of_practice: number;
  has_fellow: number;
  has_phd: number;
  sci_papers_first: number;
  sci_papers_co: number;
  if_bonus_count: number;
  volume_awards: number;
  trainer_count: number;
  signature_cases: number;
  has_safety_record: number;
  kol_count: number;
  society_count: number;
  book_count: number;
  foundation_score: number;
  academic_score: number;
  clinical_score: number;
  reputation_score: number;
  total_score: number;
  tier: string;
  doctor_type: string;
  verified_facts: string;
  radar_chart_data: string;
  consulting_comment: string;
}

// SQL INSERT 문 생성
function generateInsertSQL(doctor: DoctorData): string {
  const escapeSql = (val: string | null) => val ? `'${val.replace(/'/g, "''")}'` : 'NULL';

  return `INSERT OR REPLACE INTO doctors (
    hospital_name, doctor_name, english_name, hospital_url, region,
    specialist_type, years_of_practice, has_fellow, has_phd,
    sci_papers_first, sci_papers_co, if_bonus_count,
    volume_awards, trainer_count, signature_cases, has_safety_record,
    kol_count, society_count, book_count,
    foundation_score, academic_score, clinical_score, reputation_score, total_score,
    tier, doctor_type, verified_facts, radar_chart_data, consulting_comment,
    crawl_status, updated_at
  ) VALUES (
    ${escapeSql(doctor.hospital_name)},
    ${escapeSql(doctor.doctor_name)},
    ${escapeSql(doctor.english_name)},
    ${escapeSql(doctor.hospital_url)},
    ${escapeSql(doctor.region)},
    ${escapeSql(doctor.specialist_type)},
    ${doctor.years_of_practice},
    ${doctor.has_fellow},
    ${doctor.has_phd},
    ${doctor.sci_papers_first},
    ${doctor.sci_papers_co},
    ${doctor.if_bonus_count},
    ${doctor.volume_awards},
    ${doctor.trainer_count},
    ${doctor.signature_cases},
    ${doctor.has_safety_record},
    ${doctor.kol_count},
    ${doctor.society_count},
    ${doctor.book_count},
    ${doctor.foundation_score},
    ${doctor.academic_score},
    ${doctor.clinical_score},
    ${doctor.reputation_score},
    ${doctor.total_score},
    ${escapeSql(doctor.tier)},
    ${escapeSql(doctor.doctor_type)},
    ${escapeSql(doctor.verified_facts)},
    ${escapeSql(doctor.radar_chart_data)},
    ${escapeSql(doctor.consulting_comment)},
    'completed',
    datetime('now')
  );`;
}

async function processHospital(
  hospital: { name: string; url?: string; address?: string; telephone?: string },
  region: string,
  config: ReturnType<typeof validateEnv>
): Promise<DoctorData | null> {
  const hospitalName = hospital.name;

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

    if (!scrapedContent) {
      scrapedContent = `병원명: ${hospitalName}\n주소: ${hospital.address || ''}\n전화: ${hospital.telephone || ''}`;
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
      return null;
    }

    // 4. AI 코멘트 생성
    const comment = await generateConsultingComment(
      facts,
      scores,
      doctorType,
      tier,
      config.anthropicApiKey
    );

    return {
      hospital_name: hospitalName,
      doctor_name: facts.doctorName,
      english_name: null,
      hospital_url: hospital.url || null,
      region: region.replace(' 피부과', '').replace(' 성형외과', ''),
      specialist_type: facts.specialistType,
      years_of_practice: facts.yearsOfPractice,
      has_fellow: facts.hasFellow ? 1 : 0,
      has_phd: facts.hasPhd ? 1 : 0,
      sci_papers_first: facts.sciPapersFirst,
      sci_papers_co: facts.sciPapersCo,
      if_bonus_count: facts.ifBonusCount,
      volume_awards: facts.volumeAwards,
      trainer_count: facts.trainerCount,
      signature_cases: facts.signatureCases,
      has_safety_record: facts.hasSafetyRecord ? 1 : 0,
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
      radar_chart_data: JSON.stringify(radarData),
      consulting_comment: comment,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ❌ 오류: ${errorMessage}`);
    return null;
  }
}

async function main() {
  console.log('🏥 MadMedCheck 데이터 수집 파이프라인\n');

  const envConfig = validateEnv();

  // 명령줄 인자 처리
  const args = process.argv.slice(2);
  let regions = REGIONS;

  if (args.includes('--region')) {
    const regionIndex = args.indexOf('--region');
    if (args[regionIndex + 1]) {
      regions = [args[regionIndex + 1]];
    }
  }

  if (args.includes('--help')) {
    console.log(`
사용법: npx tsx scripts/run-pipeline.ts [옵션]

옵션:
  --region <지역>   특정 지역만 크롤링 (예: "청담역 피부과")
  --help           도움말 표시

예시:
  npx tsx scripts/run-pipeline.ts
  npx tsx scripts/run-pipeline.ts --region "청담역 피부과"

결과:
  - 콘솔에 진행 상황 출력
  - crawl-results.sql 파일에 INSERT 문 저장
  - wrangler d1 execute로 D1에 적용
`);
    process.exit(0);
  }

  console.log(`대상 지역: ${regions.join(', ')}\n`);

  const allDoctors: DoctorData[] = [];
  const sqlStatements: string[] = [];

  for (const region of regions) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🏥 ${region} 크롤링 시작`);
    console.log('='.repeat(50));

    // 네이버 검색
    const hospitals = await searchClinicsInRegion(
      region,
      '피부과',
      envConfig.naverClientId,
      envConfig.naverClientSecret
    );

    console.log(`📋 ${hospitals.length}개 병원 발견\n`);

    for (const hospital of hospitals) {
      const doctor = await processHospital(hospital, region, envConfig);

      if (doctor) {
        allDoctors.push(doctor);
        sqlStatements.push(generateInsertSQL(doctor));
      }

      // API 레이트 리밋 방지 (2초 대기)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // SQL 파일 저장
  if (sqlStatements.length > 0) {
    const fs = await import('fs');
    const sqlContent = sqlStatements.join('\n\n');
    fs.writeFileSync('crawl-results.sql', sqlContent);
    console.log(`\n📄 SQL 파일 저장: crawl-results.sql`);
  }

  // 결과 요약
  console.log('\n' + '='.repeat(50));
  console.log(`✅ 파이프라인 완료`);
  console.log(`   총 수집: ${allDoctors.length}명`);
  console.log('='.repeat(50));

  if (allDoctors.length > 0) {
    console.log(`\n💡 D1에 적용하려면:`);
    console.log(`   npx wrangler d1 execute madmedcheck-db --file=crawl-results.sql --remote`);
  }
}

main().catch(console.error);
