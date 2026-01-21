# CLAUDE.md - MadMedCheck 프로젝트 컨텍스트

## 프로젝트 개요
**MadMedCheck** - AI 기반 의료인 검증 시스템
- 빌보드 HOT 100처럼 실력있는 의사 TOP 100 매주 업데이트
- 마케팅 자본이 아닌 실력(Human Capital)으로 평가
- AEO/GEO 최적화된 정적 사이트

## 기술 스택
- **Frontend**: Astro 4.0 (Hybrid SSR)
- **UI**: Tailwind CSS
- **인터랙티브**: React 18 (Islands Architecture)
- **호스팅**: Cloudflare Pages
- **DB**: Cloudflare D1 (SQLite)
- **차트**: Recharts

## 현재 완료된 작업
- [x] 프로젝트 구조 생성
- [x] Astro + Cloudflare 설정
- [x] Tailwind 설정 (빌보드 스타일 UI)
- [x] 타입 정의 (Tier, DoctorType, Doctor)
- [x] **Cloudflare D1 마이그레이션** (Supabase → D1)
- [x] 기본 레이아웃
- [x] TOP 100 메인 페이지 (index.astro)
- [x] 의사 상세 페이지 ([id].astro)
- [x] 평가 기준 페이지 (/about)
- [x] 의사 데이터 제출 페이지 (/for-doctors)
- [x] **관리자 대시보드** (/admin)
- [x] 컴포넌트 (TierBadge, TypeBadge, DoctorCard, RadarChart)
- [x] 데이터 수집 파이프라인 (네이버/Firecrawl/Groq+Claude)
- [x] **학회 크롤러 + 보수적 배점 시스템**
- [x] AEO/GEO/SEO 최적화
- [x] 샘플 데이터 3건
- [x] **의사 프로필 사진 추출** (웹사이트 + 구글 이미지)
- [x] **AI 교차검증** (Gemini Vision 무료 티어로 검증)
- [x] **전문분야 프로파일링** (의료관광용 - KOL/장비 기반 분석)
- [x] **자동화 크롤링** (GitHub Actions + Cloudflare Cron Worker)
- [x] **비용 최적화** (Groq + Gemini 전환, 월 ~$31)

## 🚨 현재 크롤링 파이프라인 버그 (2026-01-21 발견)

### 버그 1: 잘못된 URL 크롤링 (치명적)
- **파일**: `src/lib/pipeline/naver-search.ts:136`
- **문제**: 네이버 지도 API의 `item.link`가 병원 홈페이지가 아닌 SNS 링크 반환
- **증상**: 카카오톡(`pf.kakao.com`), 유튜브(`youtube.com`) 등을 크롤링
- **결과**: 스크래핑 성공 (0자) → 팩트 0개 → 모든 병원 10점
- **수정 필요**:
  ```typescript
  // SNS URL 필터링 추가 필요
  const INVALID_URL_PATTERNS = [
    'pf.kakao.com',
    'youtube.com',
    'instagram.com',
    'facebook.com',
    'blog.naver.com',
    'cafe.naver.com',
  ];
  ```

### 버그 2: Gemini 모델 404 에러
- **파일**: `src/lib/pipeline/gemini-client.ts:12`
- **문제**: `gemini-1.5-pro` 모델이 API에서 더 이상 지원 안 함
- **에러**: `models/gemini-1.5-pro is not found for API version v1beta`
- **수정 필요**:
  ```typescript
  // 변경 전
  pro: 'gemini-1.5-pro',
  // 변경 후 (사용 가능한 모델로)
  pro: 'gemini-2.0-flash',  // 또는 gemini-1.5-flash-latest
  ```

### 버그 3: Gemini Rate Limit (429)
- **파일**: `src/lib/pipeline/gemini-client.ts:9`
- **문제**: `gemini-2.0-flash-exp` 분당 10회 제한 초과
- **에러**: `429 Too Many Requests - quotaValue: 10`
- **수정 필요**:
  - 요청 간격 증가 (현재 1초 → 6초+)
  - 또는 `gemini-1.5-flash` 모델 사용 (더 높은 쿼터)
  - 또는 exponential backoff 재시도 로직 추가

### 버그 수정 우선순위
1. **[긴급]** URL 필터링 - SNS 링크 제외하고 실제 병원 홈페이지만 크롤링
2. **[긴급]** Gemini 모델명 업데이트
3. **[중요]** Rate limit 대응 로직 추가

---

## 다음 할 일 (우선순위)
1. **🔴 크롤링 버그 수정** (위 3개 버그)
2. **D1 데이터베이스 초기화**
   ```bash
   wrangler d1 create madmedcheck-db
   # wrangler.toml에 database_id 입력
   wrangler d1 execute madmedcheck-db --file=./d1-schema.sql
   ```
3. **환경변수 설정** (Cloudflare 대시보드)
4. **실 데이터 크롤링** 실행
5. **학회 발표자 데이터 수집** (2023-2025)

## 핵심 파일 위치
```
src/
├── pages/
│   ├── index.astro          # TOP 100 메인
│   ├── about.astro          # 평가 기준
│   ├── for-doctors.astro    # 의사 데이터 제출
│   ├── sitemap.xml.ts       # SEO 사이트맵
│   ├── admin/index.astro    # 관리자 대시보드
│   └── doctor/[id].astro    # 의사 상세 (SSR)
├── components/
│   ├── RadarChart.tsx       # 레이더 차트 (React)
│   └── *.astro              # Astro 컴포넌트
├── lib/
│   ├── types.ts             # 타입 정의
│   ├── d1.ts                # Cloudflare D1 클라이언트
│   └── pipeline/
│       ├── index.ts         # 통합 파이프라인
│       ├── naver-search.ts  # 네이버 검색
│       ├── firecrawl.ts     # 웹 스크래핑
│       ├── groq-client.ts   # Groq Llama 3.3 클라이언트
│       ├── gemini-client.ts # Google Gemini Vision 클라이언트
│       ├── claude-analyzer.ts # AI 분석 (Groq 사용)
│       ├── scoring.ts       # 점수 계산
│       ├── conference-crawler.ts # 학회 크롤러
│       ├── image-extractor.ts # 의사 사진 추출
│       ├── photo-validator.ts # AI 사진 교차검증 (Gemini Vision)
│       └── specialty-analyzer.ts # 전문분야 분석 (Groq Llama)
d1-schema.sql                # D1 SQLite 스키마
wrangler.toml                # Cloudflare 설정
```

## 배점 시스템 (MMC Score)
```
Foundation (기본 자격)
- 전문의: +40, 일반의: +10
- 경력: 1년당 +2 (무제한)
- 펠로우: +10

Academic (학술)
- SCI 1저자: +30/편, 공저: +5/편
- IF 5+ 보너스: +20/편
- 의학박사: +20

Clinical Mastery (임상)
- 볼륨 인증: +30/건
- 트레이너: +20/건
- 시그니처 5천례: +10, 1만례: +50
- 무사고 10년+: +30

Reputation (대외)
- 키닥터(KOL): +3/건
- 학회 임원: +5/건 (max 30)
- 저서: +10/권

Conference Activity (학술대회 발표) - 보수적 배점
- Tier 1 학회: 0.5점/회 (대한피부과/성형외과학회)
- Tier 2 학회: 0.3점/회 (레이저/세부학회)
- Tier 3 학회: 0.1점/회 (실무학회)
- 국제 학회: 1.0점/회 (IMCAS/AMWC)
- 발표 유형 가중치: 기조강연 x3, 초청/라이브 x2
- 상한: 연간 10점, 단일 학회 3점, 총 50점
```

## 등급 기준
- Laureate: 500+
- Authority: 350+
- Master: 200+
- Diplomate: 100+

## AI 모델 전략 (Gemini 전면 전환 - 무료 크레딧 활용)
```
Gemini 2.0 Flash (무료 티어: 15 RPM, 100만 토큰/일)
- 팩트 추출 (claude-analyzer.ts → extractFacts)
- 코멘트 생성 (claude-analyzer.ts → generateConsultingComment)
- 사진 교차검증 (photo-validator.ts → gemini-client.ts)
- 월 예상 비용: $0 (무료)

Gemini 1.5 Pro (유료 시 $1.25/1M input, $5/1M output)
- 전문분야 프로파일 (specialty-analyzer.ts)
- 복잡한 클리닉 분석
- 월 예상 비용: $0 (무료 크레딧 활용)

Firecrawl ($19/월)
- 웹 스크래핑 (3000 크레딧/월)

총 월 예상 비용: ~$19 (Firecrawl만)
- 전국 2000+ 피부과 월 1회 크롤링 기준
- Google Cloud 무료 크레딧 ₩43만 활용 (2026년 4월까지)
```

## 환경변수 필요
```
# 필수
NAVER_CLIENT_ID=       # 네이버 지도 API
NAVER_CLIENT_SECRET=
FIRECRAWL_API_KEY=     # 웹 스크래핑
GEMINI_API_KEY=        # Gemini (전체 AI 분석 - 무료 크레딧)

# 선택
SERPAPI_KEY=           # 구글 이미지 검색 (사진 교차검증용)

# D1은 Cloudflare 자동 바인딩 (환경변수 불필요)
```

## 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 빌드
npm run deploy   # Cloudflare 배포

# D1 관리
wrangler d1 create madmedcheck-db
wrangler d1 execute madmedcheck-db --file=./d1-schema.sql
wrangler d1 execute madmedcheck-db --command "SELECT * FROM doctors"

# 수동 크롤링
npx tsx scripts/run-pipeline.ts
npx tsx scripts/run-pipeline.ts --region "청담역 피부과"
```

## 자동화 크롤링 설정

### 방법 1: GitHub Actions (권장)
월 1회 자동 실행, GitHub Secrets 설정 필요:
```
# 필수
NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
FIRECRAWL_API_KEY
GEMINI_API_KEY            # Gemini (전체 AI 분석)
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

# 선택
SERPAPI_KEY               # 구글 이미지 검색
```
- 파일: `.github/workflows/crawl.yml`
- 수동 실행: GitHub Actions → "Run workflow"

### 방법 2: Cloudflare Cron Worker
서버리스 환경에서 스케줄 실행:
```bash
# Worker 배포
cd workers/scheduled-crawler
wrangler deploy

# Secrets 설정 (Cloudflare 대시보드에서)
wrangler secret put NAVER_CLIENT_ID
wrangler secret put GEMINI_API_KEY
# ...
```
- 파일: `workers/scheduled-crawler/`
- 스케줄: 월 1회 자동 실행

## Anti-Fraud 원칙
- 자기 주장 = 0점
- 제3자 검증만 인정 (PubMed, 제조사 인증, 동료 평가)
- Supply-Chain 데이터 (소모품 구매량 기반 볼륨 인증)

## 학회 목록 (conference-crawler.ts)
### Tier 1 (최상위)
- 대한피부과학회 (KDA)
- 대한성형외과학회 (PRS KOREA)
- 대한미용성형외과학회 (KSAPS)
- 대한비만학회 (KOSSO)

### Tier 2 (주요)
- 대한레이저피부모발학회 (KALDAT)
- 대한피부레이저학회 (KSDLS)
- 대한악안면성형재건외과학회 (KAMPRS)

### Tier 3 (실무)
- 대한미용의사회 (KACAS)
- 한국피부비만성형학회 (KACS)
- 대한비만미용체형학회

## 참고 문서
- 기획서: MadMedCheck_기획서.docx
- 개발명세서: MadMedCheck_개발명세서.docx
