-- 마이그레이션: doctors 테이블 재생성 (모든 컬럼 포함)
-- D1은 파일 전체를 트랜잭션으로 처리하므로 DROP/CREATE 방식 사용

-- 기존 테이블 삭제
DROP TABLE IF EXISTS doctors;

-- 새 테이블 생성 (모든 컬럼 포함)
CREATE TABLE doctors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

  -- 기본 정보
  hospital_name TEXT NOT NULL,
  doctor_name TEXT,
  english_name TEXT,
  photo_url TEXT,
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

  -- 학술대회 활동
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
  specialty_tagline TEXT,
  specialty_tagline_en TEXT,
  kol_products TEXT DEFAULT '[]',
  equipment_list TEXT DEFAULT '[]',
  specialty_categories TEXT DEFAULT '[]',
  technology_keywords TEXT DEFAULT '[]',
  mechanism_keywords TEXT DEFAULT '[]',

  -- 확장 클리닉 프로파일
  clinic_positioning TEXT DEFAULT '{}',
  service_portfolio TEXT DEFAULT '[]',
  signature_programs TEXT DEFAULT '[]',
  target_segments TEXT DEFAULT '[]',
  medical_tourism_summary TEXT DEFAULT '{}',

  -- 메타데이터
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_crawled_at TEXT,
  crawl_status TEXT DEFAULT 'pending',

  -- 중복 방지
  UNIQUE(hospital_name, doctor_name)
);

-- 인덱스 생성
CREATE INDEX idx_doctors_total_score ON doctors(total_score DESC);
CREATE INDEX idx_doctors_tier ON doctors(tier);
CREATE INDEX idx_doctors_region ON doctors(region);
CREATE INDEX idx_doctors_type ON doctors(doctor_type);
CREATE INDEX idx_doctors_name ON doctors(doctor_name);
