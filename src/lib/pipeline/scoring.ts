// src/lib/pipeline/scoring.ts
// MMC Score 계산 로직

import type { ExtractedFacts } from './claude-analyzer';
import type { DoctorType, Tier } from '../types';

export interface Scores {
  foundation: number;
  academic: number;
  clinical: number;
  reputation: number;
  total: number;
}

export interface RadarChartData {
  academic: number;
  clinical: number;
  career: number;
  safety: number;
  activity: number;
}

/**
 * MMC Score 배점 기준 (CLAUDE.md 참조)
 *
 * Foundation (기본 자격)
 * - 전문의: +40, 일반의: +10
 * - 경력: 1년당 +2 (무제한)
 * - 펠로우: +10
 *
 * Academic (학술)
 * - SCI 1저자: +30/편, 공저: +5/편
 * - IF 5+ 보너스: +20/편
 * - 의학박사: +20
 *
 * Clinical Mastery (임상)
 * - 볼륨 인증: +30/건
 * - 트레이너: +20/건
 * - 시그니처 5천례: +10, 1만례: +50
 * - 무사고 10년+: +30
 *
 * Reputation (대외)
 * - 키닥터(KOL): +3/건
 * - 학회 임원: +5/건 (max 30)
 * - 저서: +10/권
 */

export function calculateScores(facts: ExtractedFacts): Scores {
  // Foundation Score
  let foundation = 0;
  if (facts.specialistType === '피부과전문의' || facts.specialistType === '성형외과전문의') {
    foundation += 40;
  } else if (facts.specialistType === '타과전문의') {
    foundation += 30;
  } else {
    foundation += 10; // 일반의
  }
  foundation += facts.yearsOfPractice * 2;
  if (facts.hasFellow) foundation += 10;

  // Academic Score
  let academic = 0;
  academic += facts.sciPapersFirst * 30;
  academic += facts.sciPapersCo * 5;
  academic += facts.ifBonusCount * 20;
  if (facts.hasPhd) academic += 20;

  // Clinical Score
  let clinical = 0;
  clinical += facts.volumeAwards * 30;
  clinical += facts.trainerCount * 20;
  if (facts.signatureCases >= 10000) {
    clinical += 50;
  } else if (facts.signatureCases >= 5000) {
    clinical += 10;
  }
  if (facts.hasSafetyRecord) clinical += 30;

  // Reputation Score
  let reputation = 0;
  reputation += facts.kolCount * 3;
  reputation += Math.min(facts.societyCount * 5, 30); // max 30
  reputation += facts.bookCount * 10;

  const total = foundation + academic + clinical + reputation;

  return { foundation, academic, clinical, reputation, total };
}

/**
 * 등급 기준
 * - Laureate: 500+
 * - Authority: 350+
 * - Master: 200+
 * - Diplomate: 100+
 */
export function determineTier(totalScore: number): Tier {
  if (totalScore >= 500) return 'Laureate';
  if (totalScore >= 350) return 'Authority';
  if (totalScore >= 200) return 'Master';
  return 'Diplomate';
}

/**
 * MAD-TI 유형 결정
 * - Scholar: 학술 강점 (academic > clinical)
 * - Maestro: 임상 강점 (clinical > academic)
 * - Pioneer: 트레이너 2건 이상
 * - Guardian: 안전 기록 + 학술/임상 균형
 * - Hexagon: 모든 영역 고르게 높음
 */
export function determineDoctorType(facts: ExtractedFacts, scores: Scores): DoctorType {
  const { academic, clinical, foundation, reputation } = scores;

  // Hexagon: 모든 영역이 일정 수준 이상
  const minThreshold = 30;
  if (
    foundation >= minThreshold &&
    academic >= minThreshold &&
    clinical >= minThreshold &&
    reputation >= minThreshold / 2
  ) {
    // 영역 간 편차가 작으면 Hexagon
    const values = [foundation, academic, clinical];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    if (variance < 2000) {
      return 'Hexagon';
    }
  }

  // Pioneer: 트레이너 2건 이상
  if (facts.trainerCount >= 2) {
    return 'Pioneer';
  }

  // Guardian: 안전 기록 있고 학술/임상 균형
  if (facts.hasSafetyRecord && Math.abs(academic - clinical) < 50) {
    return 'Guardian';
  }

  // Scholar vs Maestro
  if (academic > clinical) {
    return 'Scholar';
  }

  return 'Maestro';
}

/**
 * 레이더 차트 데이터 계산
 * 각 축은 0-100 스케일로 정규화
 */
export function calculateRadarData(facts: ExtractedFacts, scores: Scores): RadarChartData {
  // Academic: 논문 기반 (max 200점 기준)
  const academic = Math.min(100, (scores.academic / 200) * 100);

  // Clinical: 임상 점수 기반 (max 300점 기준)
  const clinical = Math.min(100, (scores.clinical / 300) * 100);

  // Career: 경력 + 자격 기반 (max 100점 기준)
  const career = Math.min(100, (scores.foundation / 100) * 100);

  // Safety: 무사고 기록 (있으면 100, 없으면 50)
  const safety = facts.hasSafetyRecord ? 100 : 50;

  // Activity: 대외 활동 (max 50점 기준)
  const activity = Math.min(100, (scores.reputation / 50) * 100);

  return {
    academic: Math.round(academic),
    clinical: Math.round(clinical),
    career: Math.round(career),
    safety: Math.round(safety),
    activity: Math.round(activity),
  };
}

/**
 * 전체 분석 결과 반환
 */
export function analyzeDoctor(facts: ExtractedFacts) {
  const scores = calculateScores(facts);
  const tier = determineTier(scores.total);
  const doctorType = determineDoctorType(facts, scores);
  const radarData = calculateRadarData(facts, scores);

  return {
    scores,
    tier,
    doctorType,
    radarData,
  };
}
