// src/lib/types.ts

export type Tier = 'Laureate' | 'Authority' | 'Master' | 'Diplomate';
export type DoctorType = 'Scholar' | 'Maestro' | 'Pioneer' | 'Guardian' | 'Hexagon';
export type SpecialistType = '피부과전문의' | '성형외과전문의' | '일반의' | '타과전문의';

export interface RadarData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface Doctor {
  id: string;
  hospital_name: string;
  doctor_name: string | null;
  english_name: string | null; // 영문이름 (Google 검색으로 확인된 경우)
  photo_url: string | null; // 의사 프로필 사진 URL
  hospital_url: string | null;
  region: string;
  specialist_type: SpecialistType;
  years_of_practice: number;
  has_fellow: boolean;
  has_phd: boolean;
  sci_papers_first: number;
  sci_papers_co: number;
  if_bonus_count: number;
  volume_awards: number;
  trainer_count: number;
  signature_cases: number;
  has_safety_record: boolean;
  kol_count: number;
  society_count: number;
  book_count: number;
  // 학술대회 활동 (보수적 배점)
  conference_presentations: number; // 총 발표 횟수
  conference_activity_score: number; // 학술활동 점수 (max 50)
  foundation_score: number;
  academic_score: number;
  clinical_score: number;
  reputation_score: number;
  total_score: number;
  tier: Tier;
  doctor_type: DoctorType;
  verified_facts: string[];
  radar_chart_data: { academic: number; clinical: number; career: number; safety: number; activity: number };
  consulting_comment: string;

  // 전문분야 프로파일 (의료관광용)
  specialty_tagline: string | null; // 한줄 소개 (예: "리프팅/타이트닝 전문가")
  specialty_tagline_en: string | null; // 영문 소개 (예: "Lifting & Tightening Specialist")
  kol_products: KolProduct[]; // KOL 제품 목록
  equipment_list: EquipmentItem[]; // 보유 장비 목록
  specialty_categories: SpecialtyCategory[]; // 전문분야 카테고리
  technology_keywords: string[]; // 기술 키워드
  mechanism_keywords: string[]; // 기전 키워드

  updated_at: string;
  rank?: number;
}

// 전문분야 관련 타입
export interface KolProduct {
  product: string;
  year?: number;
  technologies: string[];
  mechanisms: string[];
}

export interface EquipmentItem {
  device: string;
  brand: string;
  technologies: string[];
  mechanisms: string[];
  category: string;
}

export interface SpecialtyCategory {
  category: string;
  label: string;
  confidence: number;
  keywords: string[];
}

export const TIER_INFO: Record<Tier, { label: string; labelKo: string; color: string; emoji: string }> = {
  Laureate: { label: 'Laureate', labelKo: '계관 의료인', color: 'tier-laureate', emoji: '👑' },
  Authority: { label: 'Authority', labelKo: '권위자', color: 'tier-authority', emoji: '⭐' },
  Master: { label: 'Master', labelKo: '마스터', color: 'tier-master', emoji: '🏅' },
  Diplomate: { label: 'Diplomate', labelKo: '인증의', color: 'tier-diplomate', emoji: '✓' },
};

export const TYPE_INFO: Record<DoctorType, { label: string; labelKo: string; color: string; emoji: string; tagline: string }> = {
  Scholar: { label: 'Scholar', labelKo: '학구파', color: 'type-scholar', emoji: '📜', tagline: '논문으로 증명합니다' },
  Maestro: { label: 'Maestro', labelKo: '실전파', color: 'type-maestro', emoji: '🖐️', tagline: '손끝의 감각' },
  Pioneer: { label: 'Pioneer', labelKo: '선구자', color: 'type-pioneer', emoji: '🚀', tagline: '트렌드 리더' },
  Guardian: { label: 'Guardian', labelKo: '수호자', color: 'type-guardian', emoji: '🛡️', tagline: '안전 제일' },
  Hexagon: { label: 'Hexagon', labelKo: '완전체', color: 'type-hexagon', emoji: '⬡', tagline: '모든 영역의 정점' },
};
