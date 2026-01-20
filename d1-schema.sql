-- MadMedCheck Cloudflare D1 스키마
-- wrangler d1 execute madmedcheck-db --file=./d1-schema.sql

-- 1. doctors 테이블
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 기본 정보
  hospital_name TEXT NOT NULL,
  doctor_name TEXT,
  english_name TEXT, -- 영문이름 (Google 검색으로 확인된 경우)
  photo_url TEXT, -- 의사 프로필 사진 URL
  hospital_url TEXT,
  region TEXT,

  -- 원본 데이터
  specialist_type TEXT DEFAULT '일반의',
  license_year INTEGER,
  years_of_practice INTEGER DEFAULT 0,
  has_fellow INTEGER DEFAULT 0,
  has_phd INTEGER DEFAULT 0,
  sci_papers_first INTEGER DEFAULT 0,
  sci_papers_co INTEGER DEFAULT 0,
  if_bonus_count INTEGER DEFAULT 0,
  h_index INTEGER DEFAULT 0,
  volume_awards INTEGER DEFAULT 0,
  trainer_count INTEGER DEFAULT 0,
  signature_cases INTEGER DEFAULT 0,
  has_safety_record INTEGER DEFAULT 0,
  kol_count INTEGER DEFAULT 0,
  society_count INTEGER DEFAULT 0,
  book_count INTEGER DEFAULT 0,

  -- 학술대회 활동 (보수적 배점)
  conference_presentations INTEGER DEFAULT 0,
  conference_activity_score REAL DEFAULT 0,

  -- 계산된 점수
  foundation_score INTEGER DEFAULT 0,
  academic_score INTEGER DEFAULT 0,
  clinical_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,

  -- 등급 및 유형
  tier TEXT DEFAULT 'Diplomate',
  doctor_type TEXT DEFAULT 'Guardian',

  -- 상세 데이터 (JSON TEXT)
  verified_facts TEXT DEFAULT '[]',
  filtered_claims TEXT DEFAULT '[]',
  radar_chart_data TEXT DEFAULT '{"academic":0,"clinical":0,"career":0,"safety":0,"activity":0}',
  consulting_comment TEXT,

  -- 전문분야 프로파일 (의료관광용)
  specialty_tagline TEXT, -- 한줄 소개 (예: "리프팅/타이트닝 전문가")
  specialty_tagline_en TEXT, -- 영문 소개 (예: "Lifting & Tightening Specialist")
  kol_products TEXT DEFAULT '[]', -- KOL 제품 목록 (JSON)
  equipment_list TEXT DEFAULT '[]', -- 보유 장비 목록 (JSON)
  specialty_categories TEXT DEFAULT '[]', -- 전문분야 카테고리 (JSON)
  technology_keywords TEXT DEFAULT '[]', -- 기술 키워드 (JSON)
  mechanism_keywords TEXT DEFAULT '[]', -- 기전 키워드 (JSON)

  -- 확장 클리닉 프로파일 (의료관광 고객용)
  clinic_positioning TEXT DEFAULT '{}', -- 클리닉 포지셔닝/철학 (JSON)
  service_portfolio TEXT DEFAULT '[]', -- 서비스 포트폴리오 (JSON)
  signature_programs TEXT DEFAULT '[]', -- 시그니처 프로그램 (JSON)
  target_segments TEXT DEFAULT '[]', -- 타겟 고객층 (JSON)
  medical_tourism_summary TEXT DEFAULT '{}', -- 의료관광 요약 (JSON)

  -- 메타데이터
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_crawled_at TEXT,
  crawl_status TEXT DEFAULT 'pending',

  -- 중복 방지
  UNIQUE(hospital_name, doctor_name)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_doctors_total_score ON doctors(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_doctors_tier ON doctors(tier);
CREATE INDEX IF NOT EXISTS idx_doctors_region ON doctors(region);
CREATE INDEX IF NOT EXISTS idx_doctors_type ON doctors(doctor_type);
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(doctor_name); -- 가나다순 정렬용
CREATE INDEX IF NOT EXISTS idx_doctors_english_name ON doctors(english_name); -- ABC순 정렬용

-- 3. 크롤링 로그 테이블
CREATE TABLE IF NOT EXISTS crawl_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  hospital_name TEXT,
  hospital_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'failed',
  created_at TEXT DEFAULT (datetime('now'))
);

-- 4. 학술대회 발표 기록 테이블
CREATE TABLE IF NOT EXISTS conference_presentations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conference_id TEXT NOT NULL,
  conference_name TEXT NOT NULL,
  conference_tier TEXT DEFAULT 'tier3', -- tier1, tier2, tier3, international
  year INTEGER NOT NULL,
  presenter_name TEXT NOT NULL,
  presenter_affiliation TEXT,
  presentation_type TEXT DEFAULT 'unknown', -- keynote, invited, oral, poster, live, panel, unknown
  presentation_title TEXT,
  session_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(conference_id, year, presenter_name, presentation_title)
);

CREATE INDEX IF NOT EXISTS idx_presentations_presenter ON conference_presentations(presenter_name);
CREATE INDEX IF NOT EXISTS idx_presentations_conference ON conference_presentations(conference_id, year);
CREATE INDEX IF NOT EXISTS idx_presentations_tier ON conference_presentations(conference_tier);

-- 5. 샘플 데이터 삽입 (테스트용)
INSERT OR REPLACE INTO doctors (
  id, hospital_name, doctor_name, english_name, region, specialist_type,
  years_of_practice, has_fellow, has_phd,
  sci_papers_first, sci_papers_co, if_bonus_count, volume_awards, trainer_count,
  signature_cases, has_safety_record, kol_count, society_count, book_count,
  foundation_score, academic_score, clinical_score, reputation_score, total_score,
  tier, doctor_type,
  verified_facts, radar_chart_data, consulting_comment
) VALUES
(
  '1', '청담 S클리닉', '김명의', 'Myeong-Ui Kim', '청담역', '피부과전문의',
  18, 1, 1,
  4, 3, 2, 3, 5,
  10000, 1, 8, 4, 1,
  86, 175, 230, 29, 520,
  'Laureate', 'Hexagon',
  '["[학술] SCI 논문 4편 제1저자", "[임상] 써마지 FLX 골든레코드 2023", "[임상] 라이브서저리 5회"]',
  '{"academic":88,"clinical":92,"career":86,"safety":100,"activity":58}',
  '모든 영역에서 균형잡힌 완전체(Hexagon) 유형입니다.'
),
(
  '2', '강남 피부과', '이실장', 'Siljang Lee', '강남역', '일반의',
  15, 0, 0,
  0, 0, 0, 3, 5,
  5000, 1, 5, 0, 0,
  40, 0, 250, 15, 305,
  'Master', 'Maestro',
  '["[임상] 써마지/울쎄라/필러 3관왕", "[임상] 라이브서저리 5회", "[임상] 15년 무사고"]',
  '{"academic":0,"clinical":100,"career":40,"safety":100,"activity":30}',
  '임상 실력이 압도적인 Maestro 유형입니다.'
),
(
  '3', '신사 더마클리닉', '박교수', 'Kyosu Park', '신사역', '피부과전문의',
  12, 1, 1,
  6, 2, 1, 1, 2,
  0, 0, 3, 5, 2,
  74, 195, 80, 31, 380,
  'Authority', 'Scholar',
  '["[학술] SCI 논문 6편 제1저자", "[학술] 의학박사", "[활동] 학회 임원"]',
  '{"academic":98,"clinical":32,"career":74,"safety":50,"activity":62}',
  '학술 역량이 뛰어난 Scholar 유형입니다.'
);
