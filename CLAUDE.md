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
- [x] 데이터 수집 파이프라인 (네이버/Firecrawl/Claude)
- [x] **학회 크롤러 + 보수적 배점 시스템**
- [x] AEO/GEO/SEO 최적화
- [x] 샘플 데이터 3건
- [x] **의사 프로필 사진 추출** (웹사이트 + 구글 이미지)
- [x] **AI 교차검증** (Claude Vision으로 동일 인물 확인)
- [x] **배경 제거 + 그라데이션 합성** (Remove.bg + Sharp)

## 다음 할 일 (우선순위)
1. **D1 데이터베이스 초기화**
   ```bash
   wrangler d1 create madmedcheck-db
   # wrangler.toml에 database_id 입력
   wrangler d1 execute madmedcheck-db --file=./d1-schema.sql
   ```
2. **환경변수 설정** (Cloudflare 대시보드)
3. **실 데이터 크롤링** 실행
4. **학회 발표자 데이터 수집** (2023-2025)

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
│       ├── claude-analyzer.ts # AI 분석
│       ├── scoring.ts       # 점수 계산
│       ├── conference-crawler.ts # 학회 크롤러
│       ├── image-extractor.ts # 의사 사진 추출
│       ├── photo-validator.ts # AI 사진 교차검증
│       └── image-processor.ts # 배경 제거 + 합성
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

## 환경변수 필요
```
# D1은 Cloudflare 자동 바인딩 (환경변수 불필요)
NAVER_CLIENT_ID=       # 네이버 지도 API
NAVER_CLIENT_SECRET=
FIRECRAWL_API_KEY=     # 웹 스크래핑
ANTHROPIC_API_KEY=     # AI 분석 + 사진 교차검증

# 선택사항
SERPAPI_KEY=           # 구글 이미지 검색 (사진 교차검증용)
REMOVEBG_API_KEY=      # 배경 제거 (없으면 비네팅만 적용)
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
```

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
