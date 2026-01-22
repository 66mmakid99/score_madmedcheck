// workers/scheduled-crawler/index.ts
// Cloudflare Worker - 스케줄 기반 자동 크롤링

/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  NAVER_CLIENT_ID: string;
  NAVER_CLIENT_SECRET: string;
  FIRECRAWL_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  SERPAPI_KEY?: string;
  REMOVEBG_API_KEY?: string;
}

interface Hospital {
  name: string;
  url?: string;
  address?: string;
  telephone?: string;
}

// 크롤링 대상 지역
const REGIONS = [
  '청담역 피부과',
  '강남역 피부과',
  '신사역 피부과',
];

// 네이버 지도 API로 병원 검색
async function searchHospitals(
  query: string,
  clientId: string,
  clientSecret: string
): Promise<Hospital[]> {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '20');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    console.error(`네이버 API 오류: ${response.status}`);
    return [];
  }

  const data = await response.json() as { items: Array<{
    title: string;
    link: string;
    address: string;
    telephone: string;
  }> };

  return data.items.map((item) => ({
    name: item.title.replace(/<[^>]*>/g, ''),
    url: item.link || undefined,
    address: item.address,
    telephone: item.telephone,
  }));
}

// Firecrawl로 웹페이지 스크래핑
async function scrapeUrl(url: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });

  if (!response.ok) {
    console.error(`Firecrawl 오류: ${response.status}`);
    return '';
  }

  const data = await response.json() as { data?: { markdown?: string } };
  return data.data?.markdown || '';
}

// Claude로 팩트 추출
async function extractFacts(content: string, hospitalName: string, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `다음은 ${hospitalName}의 웹사이트 내용입니다. 의사의 이력정보를 JSON으로 추출하세요.

추출항목:
- doctorName: 의사 이름
- specialistType: "specialist" 또는 "general"
- yearsOfPractice: 경력 연수
- hasFellow: 펠로우 여부
- hasPhd: 의학박사 여부
- sciPapersFirst: SCI 1저자 논문 수
- sciPapersCo: SCI 공저 논문 수
- ifBonusCount: IF 5+ 논문 수
- volumeAwards: 볼륨 인증 수
- trainerCount: 트레이너 인증 수
- signatureCases: 시그니처 시술 수
- hasSafetyRecord: 무사고 기록 여부
- kolCount: KOL 건수
- societyCount: 학회 임원 수
- bookCount: 저서 수
- verifiedFacts: 검증된 사실들 배열

검증 가능한 사실만 추출하세요. 추측하지 마세요.

웹사이트 내용:
${content.slice(0, 15000)}

JSON만 응답하세요.`,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API 오류: ${response.status}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content.find(c => c.type === 'text')?.text || '{}';

  try {
    // JSON 부분만 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : getDefaultFacts();
  } catch {
    return getDefaultFacts();
  }
}

function getDefaultFacts() {
  return {
    doctorName: null,
    specialistType: 'general',
    yearsOfPractice: 0,
    hasFellow: false,
    hasPhd: false,
    sciPapersFirst: 0,
    sciPapersCo: 0,
    ifBonusCount: 0,
    volumeAwards: 0,
    trainerCount: 0,
    signatureCases: 0,
    hasSafetyRecord: false,
    kolCount: 0,
    societyCount: 0,
    bookCount: 0,
    verifiedFacts: [],
  };
}

// 점수 계산
function calculateScores(facts: ReturnType<typeof getDefaultFacts>) {
  const foundation =
    (facts.specialistType === 'specialist' ? 40 : 10) +
    (facts.yearsOfPractice * 2) +
    (facts.hasFellow ? 10 : 0);

  const academic =
    (facts.sciPapersFirst * 30) +
    (facts.sciPapersCo * 5) +
    (facts.ifBonusCount * 20) +
    (facts.hasPhd ? 20 : 0);

  const clinical =
    (facts.volumeAwards * 30) +
    (facts.trainerCount * 20) +
    (facts.signatureCases >= 10000 ? 50 : facts.signatureCases >= 5000 ? 10 : 0) +
    (facts.hasSafetyRecord ? 30 : 0);

  const reputation =
    (Math.min(facts.kolCount, 10) * 3) +
    (Math.min(facts.societyCount, 6) * 5) +
    (facts.bookCount * 10);

  const total = foundation + academic + clinical + reputation;

  let tier = 'Diplomate';
  if (total >= 500) tier = 'Laureate';
  else if (total >= 350) tier = 'Authority';
  else if (total >= 200) tier = 'Master';

  return { foundation, academic, clinical, reputation, total, tier };
}

// 메인 핸들러
async function handleScheduled(env: Env): Promise<void> {
  console.log('🏥 MadMedCheck 스케줄 크롤링 시작');

  let processedCount = 0;

  for (const region of REGIONS) {
    console.log(`\n📍 ${region} 크롤링 중...`);

    const hospitals = await searchHospitals(
      region,
      env.NAVER_CLIENT_ID,
      env.NAVER_CLIENT_SECRET
    );

    console.log(`  ${hospitals.length}개 병원 발견`);

    for (const hospital of hospitals) {
      try {
        // 스크래핑
        let content = '';
        if (hospital.url) {
          content = await scrapeUrl(hospital.url, env.FIRECRAWL_API_KEY);
        }

        if (!content) {
          content = `병원명: ${hospital.name}\n주소: ${hospital.address || ''}`;
        }

        // AI 분석
        const facts = await extractFacts(content, hospital.name, env.ANTHROPIC_API_KEY);
        const scores = calculateScores(facts);

        // 100점 미만 스킵
        if (scores.total < 100) {
          console.log(`  ⏭️ ${hospital.name}: ${scores.total}점 (스킵)`);
          continue;
        }

        // D1에 저장
        await env.DB.prepare(`
          INSERT OR REPLACE INTO doctors (
            hospital_name, doctor_name, hospital_url, region,
            specialist_type, years_of_practice, has_fellow, has_phd,
            sci_papers_first, sci_papers_co, if_bonus_count,
            volume_awards, trainer_count, signature_cases, has_safety_record,
            kol_count, society_count, book_count,
            foundation_score, academic_score, clinical_score, reputation_score, total_score,
            tier, verified_facts, crawl_status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'))
        `).bind(
          hospital.name,
          facts.doctorName,
          hospital.url || null,
          region.replace(' 피부과', ''),
          facts.specialistType,
          facts.yearsOfPractice,
          facts.hasFellow ? 1 : 0,
          facts.hasPhd ? 1 : 0,
          facts.sciPapersFirst,
          facts.sciPapersCo,
          facts.ifBonusCount,
          facts.volumeAwards,
          facts.trainerCount,
          facts.signatureCases,
          facts.hasSafetyRecord ? 1 : 0,
          facts.kolCount,
          facts.societyCount,
          facts.bookCount,
          scores.foundation,
          scores.academic,
          scores.clinical,
          scores.reputation,
          scores.total,
          scores.tier,
          JSON.stringify(facts.verifiedFacts)
        ).run();

        console.log(`  ✅ ${hospital.name}: ${scores.total}점 (${scores.tier})`);
        processedCount++;

        // Rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ❌ ${hospital.name}: ${error}`);
      }
    }
  }

  console.log(`\n✅ 크롤링 완료: ${processedCount}명 저장`);
}

// Worker export
export default {
  // HTTP 요청 핸들러 (수동 트리거)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/crawl') {
      // 인증 확인 (간단한 토큰 기반)
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.ANTHROPIC_API_KEY?.slice(0, 20)}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // 백그라운드에서 크롤링 실행
      // @ts-ignore - waitUntil은 ExecutionContext에서 제공
      (globalThis as any).ctx?.waitUntil(handleScheduled(env));

      return new Response(JSON.stringify({ status: 'started' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('MadMedCheck Crawler Worker', { status: 200 });
  },

  // 스케줄 트리거
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
