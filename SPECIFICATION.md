# MadMedCheck 기획 명세서

> **버전**: 1.0
> **최종 업데이트**: 2026-01-20
> **문서 작성**: Claude AI

---

## 1. 프로젝트 개요

### 1.1 비전
**"마케팅 자본이 아닌 실력으로 평가받는 의료인 인명사전"**

빌보드 HOT 100처럼 객관적 데이터로 의료인을 검증하되, 경쟁적 순위 대신 **인명사전(Biographical Dictionary)** 형태로 정보를 제공합니다.

### 1.2 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Anti-Fraud** | 자기 주장 = 0점. 제3자 검증 데이터만 인정 |
| **Human Capital** | 마케팅 비용이 아닌 실력(학술, 임상, 경력) 기반 평가 |
| **Supply-Chain 검증** | 소모품 구매량 등 객관적 데이터로 볼륨 인증 |
| **투명성** | 평가 기준과 데이터 출처 완전 공개 |

### 1.3 제품 콘셉트 변화

| 버전 | 콘셉트 | 특징 |
|------|--------|------|
| v1.0 (이전) | TOP 100 랭킹 | 빌보드 스타일, 순위/점수 노출 |
| **v2.0 (현재)** | **인명사전** | 가나다순 정렬, 순위 제거, 강점 게이지 시각화 |

---

## 2. 기술 아키텍처

### 2.1 기술 스택

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                             │
│  Astro 4.0 (Hybrid SSR) + React 18 (Islands) + Tailwind │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Pages                       │
│  - Static Pages (index, about, for-doctors)             │
│  - SSR Pages (doctor/[id])                              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare D1                          │
│  SQLite (doctors, crawl_logs, conference_presentations) │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Data Collection Pipeline                   │
│  Naver API → Firecrawl → Claude AI → Scoring → D1      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조

```
src/
├── pages/
│   ├── index.astro          # 메인 인명부 (검색/필터)
│   ├── about.astro          # 평가 기준 설명
│   ├── for-doctors.astro    # 의사 데이터 제출
│   ├── sitemap.xml.ts       # SEO 사이트맵
│   ├── admin/index.astro    # 관리자 대시보드
│   └── doctor/[id].astro    # 의사 상세 페이지 (SSR)
├── components/
│   ├── RadarChart.tsx       # 레이더 차트 (React)
│   ├── DoctorCard.astro     # 의사 카드
│   ├── TierBadge.astro      # 등급 배지
│   └── TypeBadge.astro      # 유형 배지
├── layouts/
│   └── Layout.astro         # 기본 레이아웃 (SEO/Schema.org)
└── lib/
    ├── types.ts             # TypeScript 타입 정의
    ├── d1.ts                # D1 데이터베이스 클라이언트
    └── pipeline/
        ├── index.ts         # 파이프라인 오케스트레이터
        ├── naver-search.ts  # 네이버 병원 검색
        ├── firecrawl.ts     # 웹 스크래핑
        ├── claude-analyzer.ts # AI 팩트 추출
        ├── scoring.ts       # MMC 점수 계산
        └── conference-crawler.ts # 학회 발표 크롤러
```

---

## 3. 데이터 모델

### 3.1 doctors 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT | UUID (Primary Key) |
| `hospital_name` | TEXT | 병원명 |
| `doctor_name` | TEXT | 의사 이름 |
| `english_name` | TEXT | 영문 이름 (ABC순 정렬용) |
| `hospital_url` | TEXT | 병원 웹사이트 |
| `region` | TEXT | 지역 (강남역, 청담역 등) |
| `specialist_type` | TEXT | 전문의 유형 |
| `years_of_practice` | INTEGER | 경력 연수 |
| `has_fellow` | INTEGER | 펠로우 여부 |
| `has_phd` | INTEGER | 의학박사 여부 |
| `sci_papers_first` | INTEGER | SCI 1저자 논문 수 |
| `sci_papers_co` | INTEGER | SCI 공저 논문 수 |
| `if_bonus_count` | INTEGER | IF 5+ 논문 수 |
| `volume_awards` | INTEGER | 볼륨 인증 횟수 |
| `trainer_count` | INTEGER | 트레이너 인증 횟수 |
| `signature_cases` | INTEGER | 시그니처 시술 건수 |
| `has_safety_record` | INTEGER | 무사고 기록 여부 |
| `kol_count` | INTEGER | KOL 활동 횟수 |
| `society_count` | INTEGER | 학회 임원 횟수 |
| `book_count` | INTEGER | 저서 수 |
| `conference_presentations` | INTEGER | 학회 발표 횟수 |
| `conference_activity_score` | REAL | 학술활동 점수 (max 50) |
| `foundation_score` | INTEGER | 기본 자격 점수 |
| `academic_score` | INTEGER | 학술 점수 |
| `clinical_score` | INTEGER | 임상 점수 |
| `reputation_score` | INTEGER | 대외활동 점수 |
| `total_score` | INTEGER | 총점 (내부용) |
| `tier` | TEXT | 등급 (내부용) |
| `doctor_type` | TEXT | 유형 |
| `verified_facts` | TEXT(JSON) | 검증된 팩트 목록 |
| `filtered_claims` | TEXT(JSON) | 필터링된 자기주장 |
| `radar_chart_data` | TEXT(JSON) | 레이더 차트 데이터 |
| `consulting_comment` | TEXT | AI 생성 코멘트 |
| `crawl_status` | TEXT | 크롤링 상태 |
| `updated_at` | TEXT | 업데이트 일시 |

### 3.2 conference_presentations 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `conference_id` | TEXT | 학회 ID |
| `conference_name` | TEXT | 학회명 |
| `conference_tier` | TEXT | 학회 등급 |
| `year` | INTEGER | 발표 연도 |
| `presenter_name` | TEXT | 발표자 이름 |
| `presenter_affiliation` | TEXT | 소속 |
| `presentation_type` | TEXT | 발표 유형 |
| `presentation_title` | TEXT | 발표 제목 |

---

## 4. 배점 시스템 (MMC Score)

### 4.1 점수 구조

```
총점 = Foundation + Academic + Clinical + Reputation + Conference Activity
```

### 4.2 Foundation (기본 자격)

| 항목 | 배점 | 비고 |
|------|------|------|
| 피부과/성형외과 전문의 | +40점 | |
| 타과 전문의 | +30점 | |
| 일반의 | +10점 | |
| 경력 | +2점/년 | 무제한 |
| 펠로우 | +10점 | |

### 4.3 Academic (학술)

| 항목 | 배점 | 비고 |
|------|------|------|
| SCI 논문 (1저자) | +30점/편 | PubMed 검증 |
| SCI 논문 (공저) | +5점/편 | |
| IF 5+ 논문 | +20점/편 | 추가 보너스 |
| 의학박사 | +20점 | |

### 4.4 Clinical (임상)

| 항목 | 배점 | 비고 |
|------|------|------|
| 볼륨 인증 | +30점/건 | 제조사 공식 인증 |
| 트레이너 | +20점/건 | 제조사 공식 인증 |
| 시그니처 5,000례 | +10점 | |
| 시그니처 10,000례 | +50점 | |
| 무사고 10년+ | +30점 | |

### 4.5 Reputation (대외활동)

| 항목 | 배점 | 비고 |
|------|------|------|
| KOL 활동 | +3점/건 | |
| 학회 임원 | +5점/건 | 최대 30점 |
| 저서 | +10점/권 | |

### 4.6 Conference Activity (학술대회 활동) - 보수적 배점

#### 학회 등급별 기본 점수 (1회당)

| 등급 | 학회 예시 | 점수 |
|------|----------|------|
| Tier 1 | 대한피부과학회, 대한성형외과학회 | 0.5점 |
| Tier 2 | 대한레이저피부모발학회 | 0.3점 |
| Tier 3 | 대한미용의사회 | 0.1점 |
| International | IMCAS, AMWC | 1.0점 |

#### 발표 유형별 가중치

| 유형 | 가중치 |
|------|--------|
| 기조강연 (Keynote) | x3.0 |
| 초청강연 (Invited) | x2.0 |
| 라이브시연 (Live) | x2.0 |
| 구연발표 (Oral) | x1.0 |
| 좌장 (Panel) | x0.5 |
| 포스터 (Poster) | x0.3 |

#### 감가상각

| 연도 | 유지율 |
|------|--------|
| 올해 | 100% |
| 1년 전 | 60% |
| 2년 전 | 36% |
| 3년 전 | 20% |
| 4년 이상 | 0% (만료) |

#### 상한

- 연간 최대: 10점
- 단일 학회: 3점
- **총 상한: 50점**

---

## 5. 등급 및 유형 체계

### 5.1 등급 (Tier) - 내부용

| 등급 | 점수 기준 | 의미 |
|------|----------|------|
| **Laureate** | 500점+ | 계관 의료인 |
| **Authority** | 350점+ | 권위자 |
| **Master** | 200점+ | 마스터 |
| **Diplomate** | 100점+ | 인증의 |

### 5.2 유형 (MAD-TI Type)

| 유형 | 영문 | 조건 |
|------|------|------|
| **Scholar** | 학구파 | Academic > Clinical |
| **Maestro** | 실전파 | Clinical > Academic |
| **Pioneer** | 선구자 | Trainer 2건+ |
| **Guardian** | 수호자 | Safety + 학술/임상 균형 |
| **Hexagon** | 완전체 | 모든 영역 고르게 높음 |

---

## 6. 데이터 수집 파이프라인

### 6.1 파이프라인 흐름

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Naver     │ -> │  Firecrawl  │ -> │   Claude    │
│   Search    │    │   Scraping  │    │   Analyzer  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
  병원 목록 수집      홈페이지 크롤링     팩트 추출
  (지역/진료과)       (마크다운 변환)     (자기주장 필터링)
                                           │
                                           ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     D1      │ <- │   Scoring   │ <- │  Conference │
│   Storage   │    │   Engine    │    │   Crawler   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   데이터 저장        점수 계산         학회 발표 수집
   (UPSERT)        등급/유형 결정      (15개+ 학회)
```

### 6.2 지원 학회 목록

#### Tier 1 (최상위)
- 대한피부과학회 (KDA)
- 대한성형외과학회 (PRS KOREA)
- 대한미용성형외과학회 (KSAPS)
- 대한비만학회 (KOSSO)

#### Tier 2 (주요)
- 대한레이저피부모발학회 (KALDAT)
- 대한피부레이저학회 (KSDLS)
- 대한악안면성형재건외과학회 (KAMPRS)

#### Tier 3 (실무)
- 대한미용의사회 (KACAS)
- 한국피부비만성형학회 (KACS)
- 대한비만미용체형학회 (ONS)

#### International
- IMCAS World Congress
- AMWC Monaco

---

## 7. UI/UX 설계

### 7.1 메인 페이지 (index.astro)

```
┌────────────────────────────────────────────────────────┐
│  검증된 의료인 인명부                                     │
│  Verified Medical Professionals                        │
├────────────────────────────────────────────────────────┤
│  [검증된 의료인: 150명] [지역: 12] [업데이트: Weekly]      │
├────────────────────────────────────────────────────────┤
│  🔍 [의료인 이름, 병원명으로 검색...]                      │
│  [가나다순▼] [전체 지역▼] [전체 전문분야▼] [검색]          │
├────────────────────────────────────────────────────────┤
│  총 150명의 검증된 의료인                                 │
├────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 김명의        │ │ 이실장        │ │ 박교수        │   │
│  │ Myeong-Ui Kim│ │ Siljang Lee  │ │ Kyosu Park   │   │
│  │ 청담 S클리닉   │ │ 강남 피부과    │ │ 신사 더마     │   │
│  │              │ │              │ │              │   │
│  │ 학술 ████░░░░ │ │ 학술 ░░░░░░░░ │ │ 학술 ████████ │   │
│  │ 임상 ████████ │ │ 임상 ████████ │ │ 임상 ██░░░░░░ │   │
│  │ 활동 ████░░░░ │ │ 활동 ██░░░░░░ │ │ 활동 ████░░░░ │   │
│  │              │ │              │ │              │   │
│  │ 모든 영역에서  │ │ 임상 경험이    │ │ 학술 연구에    │   │
│  │ 균형잡힌...   │ │ 풍부한...     │ │ 강점을 가진... │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└────────────────────────────────────────────────────────┘
```

### 7.2 의사 상세 페이지 (doctor/[id].astro)

```
┌────────────────────────────────────────────────────────┐
│  김명의 (Myeong-Ui Kim)                                │
│  피부과전문의 · 청담 S클리닉 · 경력 18년                   │
├────────────────────────────────────────────────────────┤
│           [레이더 차트]                                 │
│              학술                                      │
│               ▲                                       │
│        활동 ◀   ▶ 임상                                 │
│              ▼                                        │
│             경력                                       │
├────────────────────────────────────────────────────────┤
│  검증된 팩트                                            │
│  • [학술] SCI 논문 4편 제1저자                           │
│  • [임상] 써마지 FLX 골든레코드 2023                      │
│  • [임상] 라이브서저리 5회                               │
│  • [자격] 의학박사, 펠로우 수료                           │
├────────────────────────────────────────────────────────┤
│  AI 분석 코멘트                                         │
│  "모든 영역에서 균형잡힌 완전체(Hexagon) 유형입니다..."     │
└────────────────────────────────────────────────────────┘
```

---

## 8. SEO/AEO 최적화

### 8.1 Schema.org 마크업

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "검증된 의료인 인명부",
  "about": {
    "@type": "Physician",
    "name": "김명의",
    "medicalSpecialty": "Dermatology"
  }
}
```

### 8.2 적용된 최적화

- Open Graph / Twitter Card 메타태그
- Canonical URL
- JSON-LD 구조화 데이터
- Sitemap 자동 생성
- robots.txt

---

## 9. 개발 현황

### 9.1 완료된 기능 (v2.0)

| 카테고리 | 기능 | 상태 |
|----------|------|------|
| **인프라** | Astro 4.0 프로젝트 설정 | ✅ |
| | Cloudflare Pages 설정 | ✅ |
| | Cloudflare D1 마이그레이션 | ✅ |
| | Tailwind CSS 설정 | ✅ |
| **프론트엔드** | 인명부 메인 페이지 | ✅ |
| | 검색/필터 기능 | ✅ |
| | 가나다순/ABC순/지역/전문분야 정렬 | ✅ |
| | 강점 게이지 바 UI | ✅ |
| | 의사 상세 페이지 (SSR) | ✅ |
| | 레이더 차트 컴포넌트 | ✅ |
| | 평가 기준 페이지 | ✅ |
| | 의사 데이터 제출 페이지 | ✅ |
| | 관리자 대시보드 | ✅ |
| **백엔드** | D1 데이터베이스 스키마 | ✅ |
| | D1 CRUD 함수 | ✅ |
| | 타입 정의 | ✅ |
| **파이프라인** | 네이버 병원 검색 | ✅ |
| | Firecrawl 웹 스크래핑 | ✅ |
| | Claude AI 팩트 추출 | ✅ |
| | MMC 점수 계산 | ✅ |
| | 등급/유형 결정 로직 | ✅ |
| | 학회 크롤러 | ✅ |
| | 감가상각 시스템 | ✅ |
| **SEO** | Schema.org 마크업 | ✅ |
| | Sitemap 생성 | ✅ |
| | robots.txt | ✅ |
| **데이터** | 샘플 데이터 3건 | ✅ |

### 9.2 진행 중 / 미완료 기능

| 카테고리 | 기능 | 상태 | 우선순위 |
|----------|------|------|----------|
| **데이터** | D1 데이터베이스 초기화 | ⏳ | 🔴 높음 |
| | 실 데이터 크롤링 실행 | ⏳ | 🔴 높음 |
| | 학회 발표자 데이터 수집 (2023-2025) | ⏳ | 🔴 높음 |
| **환경설정** | Cloudflare 환경변수 설정 | ⏳ | 🔴 높음 |
| | - NAVER_CLIENT_ID | ⏳ | |
| | - NAVER_CLIENT_SECRET | ⏳ | |
| | - FIRECRAWL_API_KEY | ⏳ | |
| | - ANTHROPIC_API_KEY | ⏳ | |
| **인증** | 관리자 인증 시스템 | ❌ | 🟡 중간 |
| **기능** | 의사 데이터 제출 API | ❌ | 🟡 중간 |
| | 제출 데이터 검토 워크플로우 | ❌ | 🟡 중간 |
| | 자동 주간 업데이트 (Cron) | ❌ | 🟡 중간 |
| **UI** | 다크모드 지원 | ❌ | 🟢 낮음 |
| | 모바일 반응형 개선 | ❌ | 🟢 낮음 |
| | 의사 비교 기능 | ❌ | 🟢 낮음 |
| **분석** | 사용자 행동 분석 | ❌ | 🟢 낮음 |
| | 검색어 분석 | ❌ | 🟢 낮음 |

---

## 10. 배포 및 운영

### 10.1 배포 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# Cloudflare 배포
npm run deploy

# 데이터 파이프라인 실행
npm run pipeline
```

### 10.2 D1 관리 명령어

```bash
# 데이터베이스 생성
wrangler d1 create madmedcheck-db

# 스키마 적용
wrangler d1 execute madmedcheck-db --file=./d1-schema.sql

# 데이터 조회
wrangler d1 execute madmedcheck-db --command "SELECT * FROM doctors"
```

### 10.3 필요 환경변수

```env
# Cloudflare 대시보드에서 설정
NAVER_CLIENT_ID=네이버_개발자_클라이언트_ID
NAVER_CLIENT_SECRET=네이버_개발자_클라이언트_시크릿
FIRECRAWL_API_KEY=Firecrawl_API_키
ANTHROPIC_API_KEY=Anthropic_API_키

# D1은 Cloudflare 자동 바인딩 (환경변수 불필요)
```

---

## 11. 다음 단계 (로드맵)

### Phase 1: 데이터 구축 (우선)
1. Cloudflare 환경변수 설정
2. D1 데이터베이스 초기화
3. 강남/청담/신사 지역 피부과 크롤링
4. 학회 발표자 데이터 수집 (2023-2025)

### Phase 2: 기능 완성
1. 관리자 인증 시스템
2. 의사 데이터 제출 API 구현
3. 제출 데이터 검토 워크플로우
4. 자동 주간 업데이트 Cron Job

### Phase 3: 확장
1. 서울 외 지역 확장
2. 성형외과 데이터 수집
3. 사용자 피드백 시스템
4. 분석 대시보드

---

## 12. 참고 문서

- 기획서: `MadMedCheck_기획서.docx`
- 개발명세서: `MadMedCheck_개발명세서.docx`
- 프로젝트 컨텍스트: `CLAUDE.md`

---

*문서 끝*
