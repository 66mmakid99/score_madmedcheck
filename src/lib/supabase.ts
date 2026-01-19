// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Doctor } from './types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// TOP 100 조회
export async function getTop100(): Promise<Doctor[]> {
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
  const { data } = await supabase
    .from('doctors')
    .select('id')
    .gte('total_score', 100);

  return (data || []).map((d) => d.id);
}

// 통계
export async function getStats() {
  const { data } = await supabase.from('doctors').select('tier, doctor_type, total_score');

  if (!data) return { total: 0, avgScore: 0, tierCounts: {}, typeCounts: {} };

  const tierCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  let sum = 0;

  data.forEach((d) => {
    tierCounts[d.tier] = (tierCounts[d.tier] || 0) + 1;
    typeCounts[d.doctor_type] = (typeCounts[d.doctor_type] || 0) + 1;
    sum += d.total_score;
  });

  return {
    total: data.length,
    avgScore: Math.round(sum / data.length),
    tierCounts,
    typeCounts,
  };
}
