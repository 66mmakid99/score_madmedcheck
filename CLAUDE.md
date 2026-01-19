# CLAUDE.md - MadMedCheck 프로젝트 컨텍스트

## 프로젝트 개요
**MadMedCheck** - AI 기반 의료인 검증 시스템
- 빌보드 HOT 100처럼 실력있는 의사 TOP 100 매주 업데이트
- 마케팅 자본이 아닌 실력(Human Capital)으로 평가
- AEO/GEO 최적화된 정적 사이트

## 기술 스택
- **Frontend**: Astro (정적 사이트 생성)
- **UI**: Tailwind CSS
- **인터랙티브**: React (Islands Architecture)
- **호스팅**: Cloudflare Pages
- **DB**: Supabase (PostgreSQL)
- **차트**: Recharts

## 현재 완료된 작업
- [x] 프로젝트 구조 생성
- [x] Astro + Cloudflare 설정
- [x] Tailwind 설정
- [x] 타입 정의 (Tier, DoctorType, Doctor)
- [x] Supabase 클라이언트
- [x] 기본 레이아웃
- [x] TOP 100 메인 페이지 (index.astro)
- [x] 의사 상세 페이지 ([id].astro)
- [x] 컴포넌트 (TierBadge, TypeBadge, DoctorCard, RadarChart)
- [x] Supabase 스키마 SQL
- [x] 샘플 데이터 3건

## 다음 할 일 (우선순위)
1. **Supabase 연결 테스트** - .env에 키 입력 후 확인
2. **데이터 수집 파이프라인** 구축
   - 네이버 지도 API → 병원 리스트
   - Firecrawl → 홈페이지 스크래핑
   - SerpAPI → 구글 검색 보강
   - Claude API → 팩트 추출 & 점수 산정
3. **관리자 페이지** (src/pages/admin/)
   - 크롤링 트리거
   - 진행 상황 모니터링
4. **추가 페이지**
   - /about - 평가 기준 설명
   - /for-doctors - 의사 데이터 제출

## 핵심 파일 위치
```
src/
├── pages/
│   ├── index.astro          # TOP 100 메인
│   └── doctor/[id].astro    # 의사 상세
├── components/
│   ├── RadarChart.tsx       # 레이더 차트 (React)
│   └── *.astro              # Astro 컴포넌트
├── lib/
│   ├── types.ts             # 타입 정의
│   └── supabase.ts          # DB 클라이언트
supabase-schema.sql          # DB 테이블 생성 SQL
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
```

## 등급 기준
- Laureate: 500+
- Authority: 350+
- Master: 200+
- Diplomate: 100+

## 환경변수 필요
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
FIRECRAWL_API_KEY=
SERPAPI_KEY=
ANTHROPIC_API_KEY=
```

## 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 빌드
npm run deploy   # Cloudflare 배포
```

## Anti-Fraud 원칙
- 자기 주장 = 0점
- 제3자 검증만 인정 (PubMed, 제조사 인증, 동료 평가)
- Supply-Chain 데이터 (소모품 구매량 기반 볼륨 인증)

## 참고 문서
- 기획서: MadMedCheck_기획서.docx
- 개발명세서: MadMedCheck_개발명세서.docx
