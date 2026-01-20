-- 마이그레이션: photo_url 및 누락된 컬럼 추가
-- 실행: wrangler d1 execute madmedcheck-db --file=./migrations/001_add_photo_url.sql --remote

-- photo_url 컬럼 추가
ALTER TABLE doctors ADD COLUMN photo_url TEXT;

-- 전문분야 프로파일 컬럼들 추가 (없을 경우)
ALTER TABLE doctors ADD COLUMN specialty_tagline TEXT;
ALTER TABLE doctors ADD COLUMN specialty_tagline_en TEXT;
ALTER TABLE doctors ADD COLUMN kol_products TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN equipment_list TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN specialty_categories TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN technology_keywords TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN mechanism_keywords TEXT DEFAULT '[]';

-- 확장 클리닉 프로파일 컬럼들 추가
ALTER TABLE doctors ADD COLUMN clinic_positioning TEXT DEFAULT '{}';
ALTER TABLE doctors ADD COLUMN service_portfolio TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN signature_programs TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN target_segments TEXT DEFAULT '[]';
ALTER TABLE doctors ADD COLUMN medical_tourism_summary TEXT DEFAULT '{}';
