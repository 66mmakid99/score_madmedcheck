-- MadMedCheck Supabase 테이블 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. doctors 테이블
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  hospital_name VARCHAR(255) NOT NULL,
  doctor_name VARCHAR(100),
  hospital_url TEXT,
  region VARCHAR(50),
  
  -- 원본 데이터
  specialist_type VARCHAR(50) DEFAULT '일반의',
  license_year INTEGER,
  years_of_practice INTEGER DEFAULT 0,
  has_fellow BOOLEAN DEFAULT FALSE,
  has_phd BOOLEAN DEFAULT FALSE,
  sci_papers_first INTEGER DEFAULT 0,
  sci_papers_co INTEGER DEFAULT 0,
  if_bonus_count INTEGER DEFAULT 0,
  h_index INTEGER DEFAULT 0,
  volume_awards INTEGER DEFAULT 0,
  trainer_count INTEGER DEFAULT 0,
  signature_cases INTEGER DEFAULT 0,
  has_safety_record BOOLEAN DEFAULT FALSE,
  kol_count INTEGER DEFAULT 0,
  society_count INTEGER DEFAULT 0,
  book_count INTEGER DEFAULT 0,
  
  -- 계산된 점수
  foundation_score INTEGER DEFAULT 0,
  academic_score INTEGER DEFAULT 0,
  clinical_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  
  -- 등급 및 유형
  tier VARCHAR(20) DEFAULT 'Diplomate',
  doctor_type VARCHAR(20) DEFAULT 'Guardian',
  
  -- 상세 데이터 (JSON)
  verified_facts JSONB DEFAULT '[]',
  filtered_claims JSONB DEFAULT '[]',
  radar_chart_data JSONB DEFAULT '{"academic":0,"clinical":0,"career":0,"safety":0,"activity":0}',
  consulting_comment TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_crawled_at TIMESTAMPTZ,
  crawl_status VARCHAR(20) DEFAULT 'pending',
  
  -- 중복 방지
  UNIQUE(hospital_name, doctor_name)
);

-- 2. 인덱스 생성
CREATE INDEX idx_doctors_total_score ON doctors(total_score DESC);
CREATE INDEX idx_doctors_tier ON doctors(tier);
CREATE INDEX idx_doctors_region ON doctors(region);
CREATE INDEX idx_doctors_type ON doctors(doctor_type);

-- 3. 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. TOP 100 View
CREATE OR REPLACE VIEW top_100_doctors AS
SELECT *
FROM doctors
WHERE total_score >= 100
ORDER BY total_score DESC
LIMIT 100;

-- 5. 크롤링 로그 테이블
CREATE TABLE crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name VARCHAR(255),
  hospital_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'failed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS (Row Level Security) 설정
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;

-- 읽기는 모두 허용
CREATE POLICY "Public read access" ON doctors FOR SELECT USING (true);
CREATE POLICY "Public read logs" ON crawl_logs FOR SELECT USING (true);

-- 7. 샘플 데이터 삽입 (테스트용)
INSERT INTO doctors (
  hospital_name, doctor_name, region, specialist_type,
  years_of_practice, has_fellow, has_phd,
  sci_papers_first, sci_papers_co, volume_awards, trainer_count,
  signature_cases, has_safety_record, kol_count, society_count, book_count,
  foundation_score, academic_score, clinical_score, reputation_score, total_score,
  tier, doctor_type,
  verified_facts, radar_chart_data, consulting_comment
) VALUES 
(
  '청담 S클리닉', '김명의', '청담역', '피부과전문의',
  18, true, true,
  4, 3, 3, 5,
  10000, true, 8, 4, 1,
  86, 175, 230, 29, 520,
  'Laureate', 'Hexagon',
  '["[학술] SCI 논문 4편 제1저자", "[임상] 써마지 FLX 골든레코드 2023", "[임상] 라이브서저리 5회"]',
  '{"academic":88,"clinical":92,"career":86,"safety":100,"activity":58}',
  '모든 영역에서 균형잡힌 완전체(Hexagon) 유형입니다.'
),
(
  '강남 피부과', '이실장', '강남역', '일반의',
  15, false, false,
  0, 0, 3, 5,
  5000, true, 5, 0, 0,
  40, 0, 250, 15, 305,
  'Master', 'Maestro',
  '["[임상] 써마지/울쎄라/필러 3관왕", "[임상] 라이브서저리 5회", "[임상] 15년 무사고"]',
  '{"academic":0,"clinical":100,"career":40,"safety":100,"activity":30}',
  '임상 실력이 압도적인 Maestro 유형입니다.'
),
(
  '신사 더마클리닉', '박교수', '신사역', '피부과전문의',
  12, true, true,
  6, 2, 1, 2,
  0, false, 3, 5, 2,
  74, 195, 80, 31, 380,
  'Authority', 'Scholar',
  '["[학술] SCI 논문 6편 제1저자", "[학술] 의학박사", "[활동] 학회 임원"]',
  '{"academic":98,"clinical":32,"career":74,"safety":50,"activity":62}',
  '학술 역량이 뛰어난 Scholar 유형입니다.'
);

-- 완료 메시지
SELECT 'MadMedCheck 테이블 생성 완료! 샘플 데이터 3건 삽입됨.' AS message;
