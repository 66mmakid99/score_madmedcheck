// src/lib/d1.ts
// Cloudflare D1 데이터베이스 클라이언트

import type { Doctor, Tier, DoctorType } from './types';

// D1 바인딩 타입 (Cloudflare Workers 런타임)
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: object;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// Astro 런타임 컨텍스트에서 D1 가져오기
export function getD1(runtime: { env?: { DB?: D1Database } } | undefined): D1Database | null {
  return runtime?.env?.DB || null;
}

// DB 행 -> Doctor 타입 변환
function rowToDoctor(row: Record<string, unknown>, rank?: number): Doctor {
  return {
    id: String(row.id || ''),
    hospital_name: String(row.hospital_name || ''),
    doctor_name: row.doctor_name ? String(row.doctor_name) : null,
    hospital_url: row.hospital_url ? String(row.hospital_url) : null,
    region: String(row.region || ''),
    specialist_type: (row.specialist_type as Doctor['specialist_type']) || '일반의',
    years_of_practice: Number(row.years_of_practice) || 0,
    has_fellow: Boolean(row.has_fellow),
    has_phd: Boolean(row.has_phd),
    sci_papers_first: Number(row.sci_papers_first) || 0,
    sci_papers_co: Number(row.sci_papers_co) || 0,
    if_bonus_count: Number(row.if_bonus_count) || 0,
    volume_awards: Number(row.volume_awards) || 0,
    trainer_count: Number(row.trainer_count) || 0,
    signature_cases: Number(row.signature_cases) || 0,
    has_safety_record: Boolean(row.has_safety_record),
    kol_count: Number(row.kol_count) || 0,
    society_count: Number(row.society_count) || 0,
    book_count: Number(row.book_count) || 0,
    foundation_score: Number(row.foundation_score) || 0,
    academic_score: Number(row.academic_score) || 0,
    clinical_score: Number(row.clinical_score) || 0,
    reputation_score: Number(row.reputation_score) || 0,
    total_score: Number(row.total_score) || 0,
    tier: (row.tier as Tier) || 'Diplomate',
    doctor_type: (row.doctor_type as DoctorType) || 'Guardian',
    verified_facts: parseJSON(row.verified_facts, []),
    radar_chart_data: parseJSON(row.radar_chart_data, { academic: 0, clinical: 0, career: 0, safety: 0, activity: 0 }),
    consulting_comment: String(row.consulting_comment || ''),
    updated_at: String(row.updated_at || ''),
    rank,
  };
}

function parseJSON<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

// TOP 100 조회
export async function getTop100(db: D1Database | null): Promise<Doctor[]> {
  if (!db) {
    console.warn('D1 not available, using sample data');
    return getSampleDoctors();
  }

  try {
    const result = await db
      .prepare(`
        SELECT * FROM doctors
        WHERE total_score >= 100
        ORDER BY total_score DESC
        LIMIT 100
      `)
      .all();

    if (!result.results || result.results.length === 0) {
      return getSampleDoctors();
    }

    return (result.results as Record<string, unknown>[]).map((row, i) => rowToDoctor(row, i + 1));
  } catch (error) {
    console.error('D1 getTop100 error:', error);
    return getSampleDoctors();
  }
}

// 의사 상세 조회
export async function getDoctorById(db: D1Database | null, id: string): Promise<Doctor | null> {
  if (!db) {
    const sample = getSampleDoctors().find((d) => d.id === id);
    return sample || null;
  }

  try {
    const row = await db.prepare('SELECT * FROM doctors WHERE id = ?').bind(id).first();

    if (!row) return null;
    return rowToDoctor(row as Record<string, unknown>);
  } catch (error) {
    console.error('D1 getDoctorById error:', error);
    return null;
  }
}

// 전체 의사 ID 목록 (빌드용)
export async function getAllDoctorIds(db: D1Database | null): Promise<string[]> {
  if (!db) {
    return getSampleDoctors().map((d) => d.id);
  }

  try {
    const result = await db.prepare('SELECT id FROM doctors WHERE total_score >= 100').all();

    if (!result.results) return getSampleDoctors().map((d) => d.id);
    return (result.results as { id: string }[]).map((r) => r.id);
  } catch (error) {
    console.error('D1 getAllDoctorIds error:', error);
    return getSampleDoctors().map((d) => d.id);
  }
}

// 통계
export async function getStats(db: D1Database | null) {
  const emptyStats = { total: 0, avgScore: 0, tierCounts: {} as Record<string, number>, typeCounts: {} as Record<string, number> };

  if (!db) {
    const samples = getSampleDoctors();
    return {
      total: samples.length,
      avgScore: Math.round(samples.reduce((sum, d) => sum + d.total_score, 0) / samples.length),
      tierCounts: { Laureate: 1, Authority: 1, Master: 1 },
      typeCounts: { Hexagon: 1, Scholar: 1, Maestro: 1 },
    };
  }

  try {
    const result = await db.prepare('SELECT tier, doctor_type, total_score FROM doctors').all();

    if (!result.results || result.results.length === 0) return emptyStats;

    const data = result.results as { tier: string; doctor_type: string; total_score: number }[];
    const tierCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let sum = 0;

    data.forEach((d) => {
      const tier = d.tier || 'Diplomate';
      const type = d.doctor_type || 'Guardian';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      sum += d.total_score || 0;
    });

    return {
      total: data.length,
      avgScore: Math.round(sum / data.length),
      tierCounts,
      typeCounts,
    };
  } catch (error) {
    console.error('D1 getStats error:', error);
    return emptyStats;
  }
}

// 파이프라인용 의사 데이터 입력 타입
export interface DoctorUpsertData {
  hospital_name: string;
  doctor_name: string | null;
  hospital_url: string | null;
  region: string;
  specialist_type: string;
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
  tier: string;
  doctor_type: string;
  verified_facts: string[];
  filtered_claims?: string[];
  radar_chart_data: { academic: number; clinical: number; career: number; safety: number; activity: number };
  consulting_comment: string;
  crawl_status?: 'pending' | 'completed' | 'failed';
  last_crawled_at?: string;
}

// 의사 데이터 저장/업데이트 (파이프라인용)
export async function upsertDoctor(db: D1Database, doctorData: DoctorUpsertData): Promise<string | null> {
  try {
    const result = await db
      .prepare(`
        INSERT INTO doctors (
          hospital_name, doctor_name, hospital_url, region, specialist_type,
          years_of_practice, has_fellow, has_phd,
          sci_papers_first, sci_papers_co, if_bonus_count, volume_awards, trainer_count,
          signature_cases, has_safety_record, kol_count, society_count, book_count,
          foundation_score, academic_score, clinical_score, reputation_score, total_score,
          tier, doctor_type, verified_facts, filtered_claims, radar_chart_data,
          consulting_comment, crawl_status, last_crawled_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(hospital_name, doctor_name) DO UPDATE SET
          hospital_url = excluded.hospital_url,
          region = excluded.region,
          specialist_type = excluded.specialist_type,
          years_of_practice = excluded.years_of_practice,
          has_fellow = excluded.has_fellow,
          has_phd = excluded.has_phd,
          sci_papers_first = excluded.sci_papers_first,
          sci_papers_co = excluded.sci_papers_co,
          if_bonus_count = excluded.if_bonus_count,
          volume_awards = excluded.volume_awards,
          trainer_count = excluded.trainer_count,
          signature_cases = excluded.signature_cases,
          has_safety_record = excluded.has_safety_record,
          kol_count = excluded.kol_count,
          society_count = excluded.society_count,
          book_count = excluded.book_count,
          foundation_score = excluded.foundation_score,
          academic_score = excluded.academic_score,
          clinical_score = excluded.clinical_score,
          reputation_score = excluded.reputation_score,
          total_score = excluded.total_score,
          tier = excluded.tier,
          doctor_type = excluded.doctor_type,
          verified_facts = excluded.verified_facts,
          filtered_claims = excluded.filtered_claims,
          radar_chart_data = excluded.radar_chart_data,
          consulting_comment = excluded.consulting_comment,
          crawl_status = excluded.crawl_status,
          last_crawled_at = excluded.last_crawled_at,
          updated_at = datetime('now')
        RETURNING id
      `)
      .bind(
        doctorData.hospital_name,
        doctorData.doctor_name,
        doctorData.hospital_url,
        doctorData.region,
        doctorData.specialist_type,
        doctorData.years_of_practice,
        doctorData.has_fellow ? 1 : 0,
        doctorData.has_phd ? 1 : 0,
        doctorData.sci_papers_first,
        doctorData.sci_papers_co,
        doctorData.if_bonus_count,
        doctorData.volume_awards,
        doctorData.trainer_count,
        doctorData.signature_cases,
        doctorData.has_safety_record ? 1 : 0,
        doctorData.kol_count,
        doctorData.society_count,
        doctorData.book_count,
        doctorData.foundation_score,
        doctorData.academic_score,
        doctorData.clinical_score,
        doctorData.reputation_score,
        doctorData.total_score,
        doctorData.tier,
        doctorData.doctor_type,
        JSON.stringify(doctorData.verified_facts),
        JSON.stringify(doctorData.filtered_claims || []),
        JSON.stringify(doctorData.radar_chart_data),
        doctorData.consulting_comment,
        doctorData.crawl_status || 'completed',
        doctorData.last_crawled_at || new Date().toISOString()
      )
      .first<{ id: string }>();

    return result?.id || null;
  } catch (error) {
    console.error('D1 upsertDoctor error:', error);
    return null;
  }
}

// 크롤링 로그 저장
export async function logCrawlError(db: D1Database, hospitalName: string, hospitalUrl: string | null, errorMessage: string): Promise<void> {
  try {
    await db
      .prepare('INSERT INTO crawl_logs (hospital_name, hospital_url, error_message, status) VALUES (?, ?, ?, ?)')
      .bind(hospitalName, hospitalUrl, errorMessage, 'failed')
      .run();
  } catch (error) {
    console.error('D1 logCrawlError error:', error);
  }
}

// 샘플 데이터 (빌드 시 또는 DB 미연결 시 사용)
function getSampleDoctors(): Doctor[] {
  return [
    {
      id: '1',
      hospital_name: '청담 S클리닉',
      doctor_name: '김명의',
      hospital_url: null,
      region: '청담역',
      specialist_type: '피부과전문의',
      years_of_practice: 18,
      has_fellow: true,
      has_phd: true,
      sci_papers_first: 4,
      sci_papers_co: 3,
      if_bonus_count: 2,
      volume_awards: 3,
      trainer_count: 5,
      signature_cases: 10000,
      has_safety_record: true,
      kol_count: 8,
      society_count: 4,
      book_count: 1,
      foundation_score: 86,
      academic_score: 175,
      clinical_score: 230,
      reputation_score: 29,
      total_score: 520,
      tier: 'Laureate',
      doctor_type: 'Hexagon',
      verified_facts: ['[학술] SCI 논문 4편 제1저자', '[임상] 써마지 FLX 골든레코드 2023', '[임상] 라이브서저리 5회'],
      radar_chart_data: { academic: 88, clinical: 92, career: 86, safety: 100, activity: 58 },
      consulting_comment: '모든 영역에서 균형잡힌 완전체(Hexagon) 유형입니다.',
      updated_at: new Date().toISOString(),
      rank: 1,
    },
    {
      id: '2',
      hospital_name: '강남 피부과',
      doctor_name: '이실장',
      hospital_url: null,
      region: '강남역',
      specialist_type: '일반의',
      years_of_practice: 15,
      has_fellow: false,
      has_phd: false,
      sci_papers_first: 0,
      sci_papers_co: 0,
      if_bonus_count: 0,
      volume_awards: 3,
      trainer_count: 5,
      signature_cases: 5000,
      has_safety_record: true,
      kol_count: 5,
      society_count: 0,
      book_count: 0,
      foundation_score: 40,
      academic_score: 0,
      clinical_score: 250,
      reputation_score: 15,
      total_score: 305,
      tier: 'Master',
      doctor_type: 'Maestro',
      verified_facts: ['[임상] 써마지/울쎄라/필러 3관왕', '[임상] 라이브서저리 5회', '[임상] 15년 무사고'],
      radar_chart_data: { academic: 0, clinical: 100, career: 40, safety: 100, activity: 30 },
      consulting_comment: '임상 실력이 압도적인 Maestro 유형입니다.',
      updated_at: new Date().toISOString(),
      rank: 2,
    },
    {
      id: '3',
      hospital_name: '신사 더마클리닉',
      doctor_name: '박교수',
      hospital_url: null,
      region: '신사역',
      specialist_type: '피부과전문의',
      years_of_practice: 12,
      has_fellow: true,
      has_phd: true,
      sci_papers_first: 6,
      sci_papers_co: 2,
      if_bonus_count: 1,
      volume_awards: 1,
      trainer_count: 2,
      signature_cases: 0,
      has_safety_record: false,
      kol_count: 3,
      society_count: 5,
      book_count: 2,
      foundation_score: 74,
      academic_score: 195,
      clinical_score: 80,
      reputation_score: 31,
      total_score: 380,
      tier: 'Authority',
      doctor_type: 'Scholar',
      verified_facts: ['[학술] SCI 논문 6편 제1저자', '[학술] 의학박사', '[활동] 학회 임원'],
      radar_chart_data: { academic: 98, clinical: 32, career: 74, safety: 50, activity: 62 },
      consulting_comment: '학술 역량이 뛰어난 Scholar 유형입니다.',
      updated_at: new Date().toISOString(),
      rank: 3,
    },
  ];
}
