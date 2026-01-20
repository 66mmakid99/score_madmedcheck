// src/lib/pipeline/conference-crawler.ts
// 학술대회 발표자 크롤링 및 학술활동 점수 산정

import { scrapeUrl } from './firecrawl';

// 학회 등급 및 정보
export type ConferenceTier = 'tier1' | 'tier2' | 'tier3' | 'international';

export interface ConferenceInfo {
  id: string;
  name: string;
  nameEn: string;
  url: string;
  tier: ConferenceTier;
  // 발표자 목록 페이지 패턴 (학회마다 다름)
  programPatterns: string[];
  // 연도별 학술대회 아카이브 URL 패턴
  archivePattern?: string;
}

// 한국 주요 미용의학 학회 목록
export const KOREAN_CONFERENCES: ConferenceInfo[] = [
  // Tier 1: 최상위 공신력
  {
    id: 'kda',
    name: '대한피부과학회',
    nameEn: 'KDA',
    url: 'https://www.derma.or.kr',
    tier: 'tier1',
    programPatterns: ['/conference/program', '/academic/schedule'],
  },
  {
    id: 'prs-korea',
    name: '대한성형외과학회',
    nameEn: 'PRS KOREA',
    url: 'https://www.plasticsurgery.or.kr',
    tier: 'tier1',
    programPatterns: ['/conference', '/program'],
  },
  {
    id: 'ksaps',
    name: '대한미용성형외과학회',
    nameEn: 'KSAPS',
    url: 'https://ksaps.or.kr',
    tier: 'tier1',
    programPatterns: ['/conference', '/schedule'],
  },
  {
    id: 'kosso',
    name: '대한비만학회',
    nameEn: 'KOSSO',
    url: 'https://www.kosso.or.kr',
    tier: 'tier1',
    programPatterns: ['/conference', '/program'],
  },

  // Tier 2: 주요 세부 학회
  {
    id: 'kaldat',
    name: '대한레이저피부모발학회',
    nameEn: 'KALDAT',
    url: 'https://kaldat.co.kr',
    tier: 'tier2',
    programPatterns: ['/conference', '/program', '/schedule'],
  },
  {
    id: 'ksdls',
    name: '대한피부레이저학회',
    nameEn: 'KSDLS',
    url: 'http://ksdls.org',
    tier: 'tier2',
    programPatterns: ['/conference', '/program'],
  },
  {
    id: 'kamprs',
    name: '대한악안면성형재건외과학회',
    nameEn: 'KAMPRS',
    url: 'https://www.kamprs.or.kr',
    tier: 'tier2',
    programPatterns: ['/conference', '/program'],
  },

  // Tier 3: 실무/임상 중심
  {
    id: 'kacas',
    name: '대한미용의사회',
    nameEn: 'KACAS',
    url: 'https://www.kacas.org',
    tier: 'tier3',
    programPatterns: ['/conf', '/program', '/schedule'],
  },
  {
    id: 'kacs',
    name: '한국피부비만성형학회',
    nameEn: 'KACS',
    url: 'http://www.kacs.co.kr',
    tier: 'tier3',
    programPatterns: ['/conference', '/program'],
  },
  {
    id: 'ons',
    name: '대한비만미용체형학회',
    nameEn: 'ONS',
    url: 'http://www.ons.or.kr',
    tier: 'tier3',
    programPatterns: ['/conference', '/program'],
  },

  // 국제 학회
  {
    id: 'imcas',
    name: 'IMCAS',
    nameEn: 'IMCAS World Congress',
    url: 'https://www.imcas.com',
    tier: 'international',
    programPatterns: ['/program', '/speakers', '/faculty'],
  },
  {
    id: 'amwc',
    name: 'AMWC',
    nameEn: 'AMWC Monaco',
    url: 'https://www.amwc-conference.com',
    tier: 'international',
    programPatterns: ['/program', '/speakers', '/faculty'],
  },
];

// 발표 유형
export type PresentationType =
  | 'keynote' // 기조강연
  | 'invited' // 초청강연
  | 'oral' // 구연발표
  | 'poster' // 포스터발표
  | 'live' // 라이브시연
  | 'panel' // 패널/좌장
  | 'unknown';

// 추출된 발표 정보
export interface ConferencePresentation {
  conferenceId: string;
  conferenceName: string;
  year: number;
  sessionName?: string;
  presentationType: PresentationType;
  presenterName: string;
  presenterAffiliation?: string; // 병원/소속
  presentationTitle?: string;
  date?: string;
}

// 발표자별 집계 결과
export interface PresenterActivitySummary {
  presenterName: string;
  affiliations: string[]; // 복수 소속 가능
  totalPresentations: number;
  byTier: Record<ConferenceTier, number>;
  byType: Record<PresentationType, number>;
  byYear: Record<number, number>;
  conferences: string[]; // 참여 학회 목록
  activityScore: number; // 산정된 학술활동 점수
}

/**
 * 학술활동 점수 산정 (보수적 기준 + 감가상각)
 *
 * 배점 원칙:
 * - 학술발표는 빈번하므로 1회당 점수를 낮게 설정
 * - 한 학회에서 10회 발표해도 과도한 점수가 나오지 않도록 연간 상한 설정
 * - 학회 등급별 차등, 발표 유형별 차등
 * - **감가상각 적용**: 오래된 활동은 가치가 감소
 *
 * Tier별 기본 점수 (1회당):
 * - Tier 1 (대한피부과/성형외과학회): 0.5점
 * - Tier 2 (레이저/세부학회): 0.3점
 * - Tier 3 (실무학회): 0.1점
 * - International (IMCAS/AMWC): 1.0점
 *
 * 발표 유형별 가중치:
 * - keynote (기조강연): x3.0
 * - invited (초청강연): x2.0
 * - live (라이브시연): x2.0
 * - oral (구연발표): x1.0
 * - panel (좌장): x0.5
 * - poster: x0.3
 *
 * 감가상각률 (연도별):
 * - 올해: 100%
 * - 1년 전: 60%
 * - 2년 전: 36%
 * - 3년 전: 20%
 * - 4년 이상: 0% (만료)
 *
 * 추가 조정:
 * - 비활동 페널티: 최근 1년 활동 없으면 전체 50% 추가 감가
 *
 * 상한:
 * - 연간 최대: 10점
 * - 단일 학회 기간 최대: 3점
 * - 총 학술활동 점수 상한: 50점
 */
export function calculateActivityScore(summary: PresenterActivitySummary): number {
  const currentYear = new Date().getFullYear();

  const TIER_BASE_SCORE: Record<ConferenceTier, number> = {
    tier1: 0.5,
    tier2: 0.3,
    tier3: 0.1,
    international: 1.0,
  };

  const TYPE_MULTIPLIER: Record<PresentationType, number> = {
    keynote: 3.0,
    invited: 2.0,
    live: 2.0,
    oral: 1.0,
    panel: 0.5,
    poster: 0.3,
    unknown: 0.5,
  };

  // 감가상각률 (연도 차이별)
  const DEPRECIATION_RATE: Record<number, number> = {
    0: 1.0, // 올해: 100%
    1: 0.6, // 1년 전: 60%
    2: 0.36, // 2년 전: 36%
    3: 0.2, // 3년 전: 20%
    // 4년 이상: 0%
  };

  const YEARLY_CAP = 10; // 연간 최대 점수
  const TOTAL_CAP = 50; // 총 상한

  // 연도별 점수 계산 (감가상각 적용)
  let totalScore = 0;
  const yearsWithActivity: number[] = [];

  if (summary.byYear && Object.keys(summary.byYear).length > 0) {
    for (const [yearStr, count] of Object.entries(summary.byYear)) {
      const year = parseInt(yearStr);
      const yearDiff = currentYear - year;

      // 4년 이상은 만료 (0점)
      if (yearDiff >= 4) continue;

      yearsWithActivity.push(year);

      // 감가상각률 적용
      const depreciationRate = DEPRECIATION_RATE[yearDiff] || 0;

      // 평균 가중치 계산
      let avgMultiplier = 1.0;
      if (summary.byType) {
        const typeTotal = Object.values(summary.byType).reduce((a, b) => a + b, 0);
        if (typeTotal > 0) {
          avgMultiplier =
            Object.entries(summary.byType).reduce((sum, [type, cnt]) => {
              return sum + TYPE_MULTIPLIER[type as PresentationType] * cnt;
            }, 0) / typeTotal;
        }
      }

      // Tier별 평균 점수 계산 (연도별 상세 데이터 없으면 전체 비율로 추정)
      let avgTierScore = 0.3; // 기본값
      if (summary.byTier) {
        const tierTotal = Object.values(summary.byTier).reduce((a, b) => a + b, 0);
        if (tierTotal > 0) {
          avgTierScore =
            Object.entries(summary.byTier).reduce((sum, [tier, cnt]) => {
              return sum + (TIER_BASE_SCORE[tier as ConferenceTier] || 0.3) * cnt;
            }, 0) / tierTotal;
        }
      }

      // 해당 연도 점수 = 발표 수 × 평균 Tier 점수 × 유형 가중치 × 감가상각률
      let yearScore = count * avgTierScore * avgMultiplier * depreciationRate;

      // 연간 상한 적용
      yearScore = Math.min(yearScore, YEARLY_CAP);

      totalScore += yearScore;
    }
  } else {
    // 연도별 데이터 없으면 기존 방식으로 계산 (전체에 50% 감가 적용)
    for (const tier of Object.keys(summary.byTier) as ConferenceTier[]) {
      const count = summary.byTier[tier] || 0;
      const baseScore = TIER_BASE_SCORE[tier] || 0.3;
      totalScore += count * baseScore * 0.5; // 50% 감가 기본 적용
    }
  }

  // 비활동 페널티: 최근 1년간 활동 없으면 전체 50% 추가 감가
  const hasRecentActivity = yearsWithActivity.includes(currentYear) || yearsWithActivity.includes(currentYear - 1);
  if (!hasRecentActivity && yearsWithActivity.length > 0) {
    totalScore *= 0.5;
  }

  // 총 상한 적용
  totalScore = Math.min(totalScore, TOTAL_CAP);

  // 소수점 한자리까지
  return Math.round(totalScore * 10) / 10;
}

/**
 * 학회 프로그램 페이지에서 발표자 정보 추출
 */
export async function extractPresentersFromConference(
  conference: ConferenceInfo,
  year: number,
  firecrawlApiKey: string
): Promise<ConferencePresentation[]> {
  const presentations: ConferencePresentation[] = [];

  // 각 프로그램 패턴 URL 시도
  for (const pattern of conference.programPatterns) {
    const url = `${conference.url}${pattern}`;

    try {
      console.log(`  📄 크롤링: ${url}`);
      const result = await scrapeUrl(url, firecrawlApiKey);

      if (!result.success || !result.markdown) {
        continue;
      }

      // 발표자 정보 파싱
      const extracted = parseConferenceProgram(result.markdown, conference, year);
      presentations.push(...extracted);

      if (extracted.length > 0) {
        console.log(`  ✅ ${extracted.length}건 발표 정보 추출`);
        break; // 성공하면 다음 패턴 시도 안함
      }
    } catch (error) {
      console.error(`  ⚠️ 크롤링 실패: ${url}`, error);
    }
  }

  return presentations;
}

/**
 * 학회 프로그램 마크다운에서 발표자 정보 파싱
 * (학회마다 형식이 다르므로 여러 패턴 시도)
 */
function parseConferenceProgram(
  markdown: string,
  conference: ConferenceInfo,
  year: number
): ConferencePresentation[] {
  const presentations: ConferencePresentation[] = [];

  // 공통 패턴들
  const patterns = [
    // 패턴 1: "발표자: 홍길동 (서울대병원)"
    /발표자[:\s]+([가-힣a-zA-Z\s]+)(?:\s*\(([^)]+)\))?/g,

    // 패턴 2: "연자: 김철수 원장 (강남클리닉)"
    /연자[:\s]+([가-힣a-zA-Z\s]+)(?:\s+원장|\s+교수|\s+선생님)?(?:\s*\(([^)]+)\))?/g,

    // 패턴 3: "좌장: 박영희 교수"
    /좌장[:\s]+([가-힣a-zA-Z\s]+)(?:\s+원장|\s+교수|\s+선생님)?(?:\s*\(([^)]+)\))?/g,

    // 패턴 4: "Speaker: Dr. Kim (Seoul Clinic)"
    /[Ss]peaker[:\s]+(?:Dr\.\s+)?([가-힣a-zA-Z\s]+)(?:\s*\(([^)]+)\))?/g,

    // 패턴 5: 테이블 형식 "| 홍길동 | 서울대병원 | 레이저 치료의 최신 동향 |"
    /\|\s*([가-힣]{2,4})\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g,

    // 패턴 6: "기조강연 - 홍길동 원장"
    /(기조강연|초청강연|특별강연)[^\n]*[-–]\s*([가-힣a-zA-Z\s]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const presenterName = cleanName(match[1] || match[2]);
      const affiliation = match[2] || match[3];

      if (presenterName && presenterName.length >= 2) {
        // 발표 유형 추론
        const presentationType = inferPresentationType(markdown, match.index);

        presentations.push({
          conferenceId: conference.id,
          conferenceName: conference.name,
          year,
          presenterName,
          presenterAffiliation: affiliation?.trim(),
          presentationType,
          presentationTitle: match[3]?.trim(),
        });
      }
    }
  }

  // 중복 제거 (같은 학회에서 같은 사람이 여러번 매칭될 수 있음)
  const unique = new Map<string, ConferencePresentation>();
  for (const p of presentations) {
    const key = `${p.presenterName}-${p.presentationTitle || 'unknown'}`;
    if (!unique.has(key)) {
      unique.set(key, p);
    }
  }

  return Array.from(unique.values());
}

/**
 * 이름 정제
 */
function cleanName(name: string): string {
  return name
    .replace(/\s*(원장|교수|선생님|Dr\.|박사|전문의)\s*/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 발표 유형 추론 (주변 텍스트 기반)
 */
function inferPresentationType(markdown: string, position: number): PresentationType {
  // 위치 주변 200자 검사
  const context = markdown.substring(Math.max(0, position - 200), position + 200).toLowerCase();

  if (context.includes('기조강연') || context.includes('keynote')) {
    return 'keynote';
  }
  if (context.includes('초청강연') || context.includes('invited')) {
    return 'invited';
  }
  if (context.includes('라이브') || context.includes('live') || context.includes('시연')) {
    return 'live';
  }
  if (context.includes('좌장') || context.includes('chair') || context.includes('panel')) {
    return 'panel';
  }
  if (context.includes('포스터') || context.includes('poster')) {
    return 'poster';
  }
  if (context.includes('구연') || context.includes('oral')) {
    return 'oral';
  }

  return 'unknown';
}

/**
 * 발표자별 활동 집계
 */
export function aggregateByPresenter(
  presentations: ConferencePresentation[]
): Map<string, PresenterActivitySummary> {
  const summaries = new Map<string, PresenterActivitySummary>();

  for (const p of presentations) {
    const name = p.presenterName;

    if (!summaries.has(name)) {
      summaries.set(name, {
        presenterName: name,
        affiliations: [],
        totalPresentations: 0,
        byTier: { tier1: 0, tier2: 0, tier3: 0, international: 0 },
        byType: { keynote: 0, invited: 0, oral: 0, poster: 0, live: 0, panel: 0, unknown: 0 },
        byYear: {},
        conferences: [],
        activityScore: 0,
      });
    }

    const summary = summaries.get(name)!;
    summary.totalPresentations++;

    // 소속 추가
    if (p.presenterAffiliation && !summary.affiliations.includes(p.presenterAffiliation)) {
      summary.affiliations.push(p.presenterAffiliation);
    }

    // 학회 추가
    if (!summary.conferences.includes(p.conferenceName)) {
      summary.conferences.push(p.conferenceName);
    }

    // Tier별 집계
    const conf = KOREAN_CONFERENCES.find((c) => c.id === p.conferenceId);
    if (conf) {
      summary.byTier[conf.tier]++;
    }

    // 유형별 집계
    summary.byType[p.presentationType]++;

    // 연도별 집계
    summary.byYear[p.year] = (summary.byYear[p.year] || 0) + 1;
  }

  // 점수 계산
  for (const summary of summaries.values()) {
    summary.activityScore = calculateActivityScore(summary);
  }

  return summaries;
}

/**
 * 전체 학회 크롤링 실행
 */
export async function crawlAllConferences(
  years: number[],
  firecrawlApiKey: string
): Promise<{
  presentations: ConferencePresentation[];
  summaries: Map<string, PresenterActivitySummary>;
}> {
  const allPresentations: ConferencePresentation[] = [];

  console.log(`\n🎓 학술대회 발표자 크롤링 시작`);
  console.log(`대상 연도: ${years.join(', ')}`);
  console.log(`대상 학회: ${KOREAN_CONFERENCES.length}개\n`);

  for (const conference of KOREAN_CONFERENCES) {
    console.log(`\n📍 ${conference.name} (${conference.nameEn})`);

    for (const year of years) {
      console.log(`  📅 ${year}년`);

      try {
        const presentations = await extractPresentersFromConference(conference, year, firecrawlApiKey);

        allPresentations.push(...presentations);

        // API 레이트 리밋 방지
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ❌ ${conference.name} ${year} 크롤링 실패:`, error);
      }
    }
  }

  // 발표자별 집계
  const summaries = aggregateByPresenter(allPresentations);

  console.log(`\n📊 크롤링 완료`);
  console.log(`   총 발표: ${allPresentations.length}건`);
  console.log(`   발표자: ${summaries.size}명`);

  return { presentations: allPresentations, summaries };
}

/**
 * 의사 이름으로 학술활동 점수 조회
 */
export function getActivityScoreForDoctor(
  doctorName: string,
  summaries: Map<string, PresenterActivitySummary>
): { score: number; details: PresenterActivitySummary | null } {
  // 이름 정규화해서 검색
  const normalizedName = cleanName(doctorName);

  // 정확히 일치
  if (summaries.has(normalizedName)) {
    const summary = summaries.get(normalizedName)!;
    return { score: summary.activityScore, details: summary };
  }

  // 부분 일치 시도
  for (const [name, summary] of summaries) {
    if (name.includes(normalizedName) || normalizedName.includes(name)) {
      return { score: summary.activityScore, details: summary };
    }
  }

  return { score: 0, details: null };
}
