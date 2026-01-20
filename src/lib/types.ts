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
  updated_at: string;
  rank?: number;
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
