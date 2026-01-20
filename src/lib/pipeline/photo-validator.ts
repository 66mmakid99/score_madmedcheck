// src/lib/pipeline/photo-validator.ts
// Gemini Vision 기반 의사 사진 검증 모듈
// 무료 티어 사용 (15 RPM, 100만 토큰/일)

import { validateDoctorPhoto as validateWithGemini } from './gemini-client';

interface PhotoValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reason: string;
  photoUrl: string | null;
}

interface PhotoCandidate {
  url: string;
  source: 'website' | 'google';
  context?: string;
}

/**
 * 간단한 URL 기반 사전 필터링
 * API 호출 전에 명백히 부적절한 URL 제외
 */
export function preFilterPhotoUrl(url: string): boolean {
  const excludePatterns = [
    /icon/i,
    /logo/i,
    /banner/i,
    /button/i,
    /sprite/i,
    /favicon/i,
    /placeholder/i,
    /loading/i,
    /avatar.*default/i,
    /no[-_]?image/i,
    /blank/i,
    /empty/i,
    /1x1/,
    /pixel/i,
  ];

  return !excludePatterns.some((pattern) => pattern.test(url));
}

/**
 * Gemini Vision으로 단일 사진 검증
 */
async function validateSinglePhoto(
  candidate: PhotoCandidate,
  doctorName: string | null,
  hospitalName: string,
  geminiApiKey: string
): Promise<PhotoValidationResult> {
  console.log(`  🔍 Gemini Vision 검증 중: ${candidate.source}`);

  const result = await validateWithGemini(geminiApiKey, candidate.url, doctorName, hospitalName);

  return {
    isValid: result.isValid,
    confidence: result.confidence,
    reason: result.reason,
    photoUrl: result.isValid ? candidate.url : null,
  };
}

/**
 * 여러 소스에서 사진을 수집하고 검증 (Gemini 사용)
 */
export async function collectAndValidatePhoto(
  websitePhotoUrl: string | null,
  googlePhotoUrls: string[],
  doctorName: string | null,
  hospitalName: string,
  geminiApiKey: string
): Promise<PhotoValidationResult> {
  const candidates: PhotoCandidate[] = [];

  // 웹사이트 사진 우선
  if (websitePhotoUrl && preFilterPhotoUrl(websitePhotoUrl)) {
    candidates.push({
      url: websitePhotoUrl,
      source: 'website',
      context: '병원 공식 홈페이지',
    });
  }

  // 구글 검색 결과 추가 (최대 2개)
  for (const url of googlePhotoUrls.slice(0, 2)) {
    if (preFilterPhotoUrl(url)) {
      candidates.push({
        url,
        source: 'google',
        context: '구글 이미지 검색',
      });
    }
  }

  console.log(`  📷 검증 대상 이미지: ${candidates.length}개`);

  if (candidates.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: '유효한 후보 이미지 없음',
      photoUrl: null,
    };
  }

  // 첫 번째 후보부터 순차 검증 (Gemini 무료 티어 RPM 제한 고려)
  for (const candidate of candidates) {
    const result = await validateSinglePhoto(candidate, doctorName, hospitalName, geminiApiKey);

    if (result.isValid && result.confidence >= 60) {
      return result;
    }
  }

  // 모든 후보가 검증 실패 시
  return {
    isValid: false,
    confidence: 0,
    reason: '적합한 프로필 사진 없음',
    photoUrl: null,
  };
}

/**
 * 간단 검증 (API 키 없을 때) - 웹사이트 사진 그대로 사용
 */
export function collectPhotoWithoutValidation(
  websitePhotoUrl: string | null,
  googlePhotoUrls: string[]
): PhotoValidationResult {
  // 웹사이트 사진 우선
  if (websitePhotoUrl && preFilterPhotoUrl(websitePhotoUrl)) {
    return {
      isValid: true,
      confidence: 50, // 검증 없이 사용
      reason: '웹사이트 사진 사용 (검증 생략)',
      photoUrl: websitePhotoUrl,
    };
  }

  // 구글 사진
  const validGooglePhoto = googlePhotoUrls.find((url) => preFilterPhotoUrl(url));
  if (validGooglePhoto) {
    return {
      isValid: true,
      confidence: 30,
      reason: '구글 검색 사진 사용 (검증 생략)',
      photoUrl: validGooglePhoto,
    };
  }

  return {
    isValid: false,
    confidence: 0,
    reason: '사진 없음',
    photoUrl: null,
  };
}
