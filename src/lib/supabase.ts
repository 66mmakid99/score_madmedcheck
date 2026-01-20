// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Doctor } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// 환경변수가 없으면 null 클라이언트 반환
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };

// TOP 100 조회
export async function getTop100(): Promise<Doctor[]> {
  if (!supabase) {
    console.warn('Supabase not configured');
    return [];
  }

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .gte('total_score', 100)
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return [];
  }

  return (data || []).map((doc, i) => ({ ...doc, rank: i + 1 }));
}

// 의사 상세 조회
export async function getDoctorById(id: string): Promise<Doctor | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// 전체 의사 ID 목록 (빌드용)
export async function getAllDoctorIds(): Promise<string[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from('doctors')
    .select('id')
    .gte('total_score', 100);

  return (data || []).map((d) => d.id);
}

// 통계
export async function getStats() {
  if (!supabase) return { total: 0, avgScore: 0, tierCounts: {}, typeCounts: {} };

  const { data } = await supabase.from('doctors').select('tier, doctor_type, total_score');

  if (!data || data.length === 0) return { total: 0, avgScore: 0, tierCounts: {}, typeCounts: {} };

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
}
