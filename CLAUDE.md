# CLAUDE.md - MadMedCheck 프로젝트 컨텍스트

> **새 세션 시작 시 이 파일부터 읽을 것!**
> 변경 로그 → 현재 상태 → 다음 할 일 순서로 확인

---

## 📋 변경 로그 (최신순)

### 2026-01-22
- **문서화** - CLAUDE.md 전면 업데이트 (현재 상태 반영)
- **버그 수정 완료 확인** - 크롤링 파이프라인 정상화

### 2026-01-21
- **버그 3건 수정 완료**
  1. URL 필터링 추가 (`naver-search.ts`) - SNS URL 자동 제외
  2. Gemini 모델명 수정 (`gemini-client.ts`) - 2.0-flash로 통일
  3. Rate limit 대응 (`gemini-client.ts`) - exponential backoff 재시도
- **AI 전환 완료** - Anthropic → Gemini 전면 전환 (무료 크레딧 활용)
- **하이브리드 검색** - 네이버 지도 + 웹 검색 병행

### 2026-01-20
- Groq → Gemini 전환 작업
- 프로젝트 초기 설정 완료

---

## 프로젝트 개요

**MadMedCheck** - AI 기반 의료인 검증 시스템
- 빌보드 HOT 100처럼 실력있는 의사 TOP 100 매주 업데이트
- 마케팅 자본이 아닌 실력(Human Capital)으로 평가
- AEO/GEO 최적화된 정적 사이트

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | Astro 4.0 (Hybrid SSR) |
| **UI** | Tailwind CSS 3.4 |
| **인터랙티브** | React 18 (Islands Architecture) |
| **호스팅** | Cloudflare Pages |
| **DB** | Cloudflare D1 (SQLite) |
| **차트** | Recharts |
| **AI** | Google Gemini 2.0 Flash |
| **크롤링** | Firecrawl API, Naver Map API |

---

## 현재 상태 (2026-01-22)

### 완료된 작업
- [x] 프로젝트 구조 생성 + Astro/Cloudflare/Tailwind 설정
- [x] 타입 정의 (Tier, DoctorType, Doctor)
- [x] Cloudflare D1 마이그레이션 (Supabase → D1)
- [x] 페이지: TOP 100 메인, 의사 상세(SSR), 평가 기준, 의사 제출, 관리자 대시보드
- [x] 컴포넌트: TierBadge, TypeBadge, DoctorCard, RadarChart
- [x] 데이터 수집 파이프라인 (네이버/Firecrawl/Gemini)
- [x] 학회 크롤러 + 보수적 배점 시스템
- [x] AEO/GEO/SEO 최적화 + 사이트맵
- [x] 의사 프로필 사진 추출 + AI 교차검증 (Gemini Vision)
- [x] 전문분야 프로파일링 (의료관광용 - KOL/장비 기반 분석)
- [x] 자동화 크롤링 (GitHub Actions + Cloudflare Cron Worker)
- [x] 비용 최적화 (Gemini 무료 티어, 월 ~$19)
- [x] **크롤링 버그 3건 수정** (URL 필터링, 모델명, Rate limit)

### 다음 할 일
1. **D1 데이터베이스 초기화** (아직 미완료 시)
   ```bash
   wrangler d1 create madmedcheck-db
   # wrangler.toml에 database_id 입력
   wrangler d1 execute madmedcheck-db --file=./d1-schema.sql
   ```
2. **환경변수 설정** (Cloudflare 대시보드)
3. **실 데이터 크롤링** 실행 (테스트: 청담역/강남역 피부과)
4. **학회 발표자 데이터 수집** (2023-2025)
5. **배포 테스트** (Cloudflare Pages)

---

## 핵심 파일 구조

```
score_madmedcheck/
├── .github/workflows/
│   └── crawl.yml              # GitHub Actions 월간 크롤링
├── src/
│   ├── pages/
│   │   ├── index.astro        # TOP 100 메인 (필터/검색)
│   │   ├── about.astro        # 평가 기준 설명
│   │   ├── for-doctors.astro  # 의사 데이터 제출
│   │   ├── sitemap.xml.ts     # SEO 사이트맵
│   │   ├── admin/index.astro  # 관리자 대시보드
│   │   └── doctor/[id].astro  # 의사 상세 (SSR)
│   ├── components/
│   │   ├── RadarChart.tsx     # 레이더 차트 (React Island)
│   │   ├── DoctorCard.astro   # 의사 카드 컴포넌트
│   │   ├── TierBadge.astro    # 티어 배지
│   │   └── TypeBadge.astro    # 의사 유형 배지
│   ├── layouts/
│   │   └── Layout.astro       # 기본 레이아웃
│   └── lib/
│       ├── types.ts           # TypeScript 타입 정의
│       ├── d1.ts              # Cloudflare D1 클라이언트
│       └── pipeline/          # 데이터 수집 파이프라인
│           ├── index.ts               # 파이프라인 오케스트레이터
│           ├── naver-search.ts        # 네이버 검색 (지도+웹)
│           ├── firecrawl.ts           # 웹 스크래핑
│           ├── gemini-client.ts       # Gemini API 클라이언트 (텍스트+Vision)
│           ├── groq-client.ts         # Groq Llama 클라이언트 (레거시)
│           ├── claude-analyzer.ts     # AI 팩트 추출 (Gemini 사용)
│           ├── scoring.ts             # MMC 점수 계산
│           ├── conference-crawler.ts  # 학회 발표 크롤러
│           ├── image-extractor.ts     # 의사 사진 추출
│           ├── image-processor.ts     # 이미지 처리/최적화
│           ├── photo-validator.ts     # 사진 검증 (Gemini Vision)
│           └── specialty-analyzer.ts  # 전문분야 프로파일링
├── scripts/
│   └── run-pipeline.ts        # 수동 크롤링 스크립트
├── workers/
│   └── scheduled-crawler/     # Cloudflare Cron Worker
│       ├── index.ts
│       └── wrangler.toml
├── migrations/
│   └── 001_add_photo_url.sql  # D1 마이그레이션
├── d1-schema.sql              # D1 SQLite 스키마
├── wrangler.toml              # Cloudflare 설정
├── astro.config.mjs           # Astro 설정
├── tailwind.config.js         # Tailwind 설정
├── package.json               # 의존성 관리
└── SPECIFICATION.md           # 상세 기술 명세서
```

---

## 데이터 파이프라인 흐름

```
수동: npm run pipeline             → scripts/run-pipeline.ts
자동: GitHub Actions (월 1회)       → .github/workflows/crawl.yml
자동: Cloudflare Worker (주 2회)    → workers/scheduled-crawler/
                    ↓
        1. 네이버 검색 (naver-search.ts)
           └─ 병원 검색 → SNS URL 필터링 → 홈페이지 URL 추출
                    ↓
        2. 웹 스크래핑 (firecrawl.ts)
           └─ 병원 홈페이지 마크다운 변환
                    ↓
        3. AI 팩트 추출 (claude-analyzer.ts + gemini-client.ts)
           └─ Gemini 2.0 Flash로 검증 가능한 팩트 추출
                    ↓
        4. 사진 추출 & 검증 (image-extractor.ts + photo-validator.ts)
           └─ 웹사이트/구글 이미지에서 의사 사진 추출 → Gemini Vision 검증
                    ↓
        5. 전문분야 분석 (specialty-analyzer.ts)
           └─ KOL 제품, 장비, 서비스 카테고리 프로파일링
                    ↓
        6. 점수 계산 & 등급 결정 (scoring.ts)
           └─ 100점 미만 스킵 → 티어/유형 결정 → 레이더 차트 데이터
                    ↓
        7. D1 데이터베이스 저장 (d1.ts)
```

---

## 배점 시스템 (MMC Score)

### Foundation (기본 자격)
| 항목 | 점수 |
|------|------|
| 전문의 | +40 |
| 일반의 | +10 |
| 경력 | +2/년 (무제한) |
| 펠로우 | +10 |

### Academic (학술)
| 항목 | 점수 |
|------|------|
| SCI 1저자 | +30/편 |
| SCI 공저 | +5/편 |
| IF 5+ 보너스 | +20/편 |
| 의학박사 | +20 |

### Clinical Mastery (임상)
| 항목 | 점수 |
|------|------|
| 볼륨 인증 | +30/건 |
| 트레이너 | +20/건 |
| 시그니처 5천례 | +10 |
| 시그니처 1만례 | +50 |
| 무사고 10년+ | +30 |

### Reputation (대외)
| 항목 | 점수 |
|------|------|
| 키닥터(KOL) | +3/건 |
| 학회 임원 | +5/건 (max 30) |
| 저서 | +10/권 |

### Conference Activity (학술대회)
| 학회 티어 | 점수/회 |
|-----------|---------|
| Tier 1 (피부과/성형외과) | 0.5 |
| Tier 2 (레이저/세부) | 0.3 |
| Tier 3 (실무) | 0.1 |
| 국제 (IMCAS/AMWC) | 1.0 |

- 발표 유형 가중치: 기조강연 x3, 초청/라이브 x2
- 상한: 연간 10점, 단일 학회 3점, 총 50점

---

## 등급 & 유형

### 등급 기준 (Tier)
| 등급 | 점수 |
|------|------|
| Laureate | 500+ |
| Authority | 350+ |
| Master | 200+ |
| Diplomate | 100+ |

### 의사 유형 (MAD-TI)
| 유형 | 특성 |
|------|------|
| Scholar | 학술 우수 (논문 중심) |
| Maestro | 임상 마스터 (시술 볼륨) |
| Pioneer | 트레이너/혁신가 |
| Guardian | 안전 중심 |
| Hexagon | 균형잡힌 올라운더 |

---

## AI 모델 전략 (2026-01-22)

```
Gemini 2.0 Flash (무료 티어: 15 RPM, 100만 토큰/일)
├─ 팩트 추출 (claude-analyzer.ts)
├─ 코멘트 생성 (claude-analyzer.ts)
├─ 사진 교차검증 (photo-validator.ts)
└─ 전문분야 분석 (specialty-analyzer.ts)

비용: $0/월 (무료 크레딧)
├─ Google Cloud 무료 크레딧 ₩43만 (2026년 4월까지)
└─ Firecrawl: $19/월 (3000 크레딧)

총 월 예상 비용: ~$19
```

---

## 환경변수

### 필수
```bash
NAVER_CLIENT_ID=       # 네이버 지도 API
NAVER_CLIENT_SECRET=
FIRECRAWL_API_KEY=     # 웹 스크래핑 (firecrawl.dev)
GEMINI_API_KEY=        # Google Gemini API
```

### 선택
```bash
SERPAPI_KEY=           # 구글 이미지 검색 (사진 교차검증용)
PHOTOROOM_API_KEY=     # 배경 제거 (선택)
REMOVEBG_API_KEY=      # 배경 제거 (선택)
```

### Cloudflare (배포용)
```bash
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
# D1은 Cloudflare 자동 바인딩 (환경변수 불필요)
```

---

## 명령어

### 개발
```bash
npm run dev          # 개발 서버 (localhost:4321)
npm run build        # 빌드
npm run preview      # 빌드 프리뷰
npm run deploy       # Cloudflare Pages 배포
```

### 크롤링
```bash
# 수동 크롤링 (전체)
npm run pipeline

# 특정 지역 크롤링
npm run pipeline:region "청담역 피부과"
npm run pipeline:region "강남역 성형외과"
```

### D1 데이터베이스
```bash
# 데이터베이스 생성
wrangler d1 create madmedcheck-db

# 스키마 적용
wrangler d1 execute madmedcheck-db --file=./d1-schema.sql

# 데이터 조회
wrangler d1 execute madmedcheck-db --command "SELECT * FROM doctors"
wrangler d1 execute madmedcheck-db --command "SELECT hospital_name, total_score, tier FROM doctors ORDER BY total_score DESC"
```

---

## 자동화 크롤링

### 방법 1: GitHub Actions (권장)
- 스케줄: 매월 1일 09:00 KST
- 수동 실행: Actions → "Monthly Data Crawl" → Run workflow
- 파일: `.github/workflows/crawl.yml`
- 필요 Secrets:
  ```
  NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
  FIRECRAWL_API_KEY, GEMINI_API_KEY
  CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
  SERPAPI_KEY (선택)
  ```

### 방법 2: Cloudflare Cron Worker
- 스케줄: 매주 월요일 09:00 KST, 수요일 21:00 KST
- 파일: `workers/scheduled-crawler/`
- 배포:
  ```bash
  cd workers/scheduled-crawler
  wrangler deploy
  wrangler secret put NAVER_CLIENT_ID
  wrangler secret put GEMINI_API_KEY
  # ...
  ```

---

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

---

## Anti-Fraud 원칙

1. **자기 주장 = 0점** - 병원 홈페이지의 자기 홍보는 점수화하지 않음
2. **제3자 검증만 인정** - PubMed, 제조사 공식 인증, 학회 발표 기록
3. **Supply-Chain 검증** - 소모품 구매량 기반 볼륨 인증 (향후)

---

## 주요 의존성

```json
{
  "@google/generative-ai": "^0.24.1",  // Gemini API
  "astro": "^4.0.0",                    // 프레임워크
  "@astrojs/cloudflare": "^8.0.0",      // Cloudflare 어댑터
  "@astrojs/react": "^3.0.0",           // React Islands
  "recharts": "^2.10.3",                // 차트
  "sharp": "^0.34.5",                   // 이미지 처리
  "groq-sdk": "^0.37.0"                 // Groq (레거시)
}
```

---

## 참고 문서

- 기획서: `MadMedCheck_기획서.docx`
- 개발명세서: `MadMedCheck_개발명세서.docx`
- 상세 스펙: `SPECIFICATION.md`

---

## 트러블슈팅

### Gemini 404 에러
```
models/gemini-1.5-pro is not found
```
→ `gemini-client.ts`에서 모델을 `gemini-2.0-flash`로 변경 (완료)

### Gemini 429 Rate Limit
```
429 Too Many Requests - quotaValue: 10
```
→ exponential backoff 재시도 로직 추가됨 (2s, 4s, 8s)

### 모든 병원 10점 문제
→ SNS URL 필터링 누락이 원인. `naver-search.ts`에서 카카오톡/유튜브/인스타그램 등 필터링 추가 (완료)

### D1 바인딩 오류
→ `wrangler.toml`에 `database_id` 확인, 로컬 개발 시 `--local` 플래그 사용
