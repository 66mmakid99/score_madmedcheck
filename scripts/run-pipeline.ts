// scripts/run-pipeline.ts
// 데이터 수집 파이프라인 실행 스크립트

import { config } from 'dotenv';
import { runFullPipeline, type PipelineConfig } from '../src/lib/pipeline/index';

config();

// 환경변수 확인
function validateEnv(): PipelineConfig {
  const required = [
    'PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
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
    supabaseUrl: process.env.PUBLIC_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    naverClientId: process.env.NAVER_CLIENT_ID!,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET!,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  };
}

// 크롤링 대상 지역 (강남/청담 중심)
const REGIONS = [
  '청담역 피부과',
  '강남역 피부과',
  '신사역 피부과',
  '압구정역 피부과',
  '논현역 피부과',
];

async function main() {
  console.log('🏥 MadMedCheck 데이터 수집 파이프라인\n');

  const config = validateEnv();

  // 명령줄 인자로 지역 지정 가능
  const args = process.argv.slice(2);
  let regions = REGIONS;
  let specialty: '피부과' | '성형외과' = '피부과';

  if (args.includes('--region')) {
    const regionIndex = args.indexOf('--region');
    if (args[regionIndex + 1]) {
      regions = [args[regionIndex + 1]];
    }
  }

  if (args.includes('--specialty')) {
    const specialtyIndex = args.indexOf('--specialty');
    if (args[specialtyIndex + 1] === '성형외과') {
      specialty = '성형외과';
    }
  }

  if (args.includes('--help')) {
    console.log(`
사용법: npx tsx scripts/run-pipeline.ts [옵션]

옵션:
  --region <지역>      특정 지역만 크롤링 (예: "청담역 피부과")
  --specialty <진료과>  진료과 지정 (피부과 | 성형외과)
  --help              도움말 표시

예시:
  npx tsx scripts/run-pipeline.ts
  npx tsx scripts/run-pipeline.ts --region "청담역 피부과"
  npx tsx scripts/run-pipeline.ts --specialty 성형외과
`);
    process.exit(0);
  }

  try {
    await runFullPipeline(regions, specialty, config);
  } catch (error) {
    console.error('❌ 파이프라인 실행 오류:', error);
    process.exit(1);
  }
}

main();
