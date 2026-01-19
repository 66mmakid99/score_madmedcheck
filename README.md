# 🏥 MadMedCheck

**AI 기반 의료인 검증 시스템** - 마케팅이 아닌 실력으로 평가받는 의료 시장

## 📋 개요

빌보드 HOT 100처럼 **실력있는 의사 TOP 100**을 매주 업데이트하는 서비스입니다.

- **Anti-Plutocracy**: 돈으로 상위 노출을 사는 시대는 끝
- **Meritocracy via AI**: 검증된 데이터만 반영
- **AEO/GEO 최적화**: AI가 읽을 수 있는 정적 사이트

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Astro (정적 사이트) |
| UI | Tailwind CSS |
| 인터랙티브 | React (Islands) |
| 호스팅 | Cloudflare Pages |
| DB | Supabase (PostgreSQL) |
| 차트 | Recharts |

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일에 Supabase 키 입력
```

### 3. Supabase 테이블 생성

Supabase SQL Editor에서 `supabase-schema.sql` 실행

### 4. 로컬 개발

```bash
npm run dev
```

### 5. 빌드 & 배포

```bash
npm run build
npm run deploy  # Cloudflare Pages
```

## 📁 폴더 구조

```
madmedcheck/
├── src/
│   ├── pages/
│   │   ├── index.astro         # TOP 100 메인
│   │   └── doctor/[id].astro   # 의사 상세
│   ├── components/
│   │   ├── DoctorCard.astro    # 의사 카드
│   │   ├── TierBadge.astro     # 등급 뱃지
│   │   ├── TypeBadge.astro     # 유형 뱃지
│   │   └── RadarChart.tsx      # 레이더 차트 (React)
│   ├── layouts/
│   │   └── Layout.astro        # 기본 레이아웃
│   └── lib/
│       ├── types.ts            # 타입 정의
│       └── supabase.ts         # Supabase 클라이언트
├── public/
├── astro.config.mjs
├── tailwind.config.js
├── wrangler.toml               # Cloudflare 설정
└── supabase-schema.sql         # DB 스키마
```

## 📊 평가 체계

### 등급 (Tier)
| 등급 | 기준 점수 |
|------|----------|
| 👑 Laureate | 500+ |
| ⭐ Authority | 350+ |
| 🏅 Master | 200+ |
| ✓ Diplomate | 100+ |

### 유형 (MAD-TI)
| 유형 | 특징 |
|------|------|
| 📜 Scholar | 학술 강점 |
| 🖐️ Maestro | 임상 강점 |
| 🚀 Pioneer | 트렌드 리더 |
| 🛡️ Guardian | 안전 제일 |
| ⬡ Hexagon | 완전체 |

## 🔗 Cloudflare Pages 배포

1. GitHub 연동 후 자동 배포
2. 환경변수 설정:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`

## 📄 라이선스

Private - MadMedCheck Team
