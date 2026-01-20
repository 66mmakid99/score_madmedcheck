// src/lib/pipeline/gemini-client.ts
// Google Gemini API 클라이언트 - 무료 Vision 검증용

import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini 모델 ID
export const GEMINI_MODELS = {
  // Gemini 2.0 Flash - 무료 티어 (15 RPM, 100만 토큰/일)
  flash: 'gemini-2.0-flash-exp',
  // Gemini 1.5 Flash - 안정 버전
  flash15: 'gemini-1.5-flash',
} as const;

/**
 * 이미지 URL을 base64로 변환
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      data: base64,
      mimeType: contentType,
    };
  } catch {
    return null;
  }
}

/**
 * Gemini Vision으로 이미지 분석
 */
export async function analyzeImageWithGemini(
  apiKey: string,
  imageUrl: string,
  prompt: string,
  model: keyof typeof GEMINI_MODELS = 'flash15'
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODELS[model] });

    // 이미지 가져오기
    const imageData = await fetchImageAsBase64(imageUrl);
    if (!imageData) {
      console.error('Failed to fetch image:', imageUrl);
      return null;
    }

    const result = await geminiModel.generateContent([
      {
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      },
      { text: prompt },
    ]);

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return null;
  }
}

/**
 * 사진이 의료인/의사인지 검증
 */
export async function validateDoctorPhoto(
  apiKey: string,
  imageUrl: string,
  doctorName: string | null,
  hospitalName: string
): Promise<{
  isValid: boolean;
  confidence: number;
  reason: string;
}> {
  const prompt = `이 사진을 분석해주세요.

질문:
1. 이 사진에 사람이 있나요?
2. 전문적인 의료인/의사처럼 보이나요? (흰 가운, 병원 배경, 프로필 사진 스타일 등)
3. 광고/로고/일러스트가 아닌 실제 인물 사진인가요?

병원명: ${hospitalName}
${doctorName ? `의사명: ${doctorName}` : ''}

JSON으로 답변:
{
  "hasPerson": true/false,
  "looksProfessional": true/false,
  "isRealPhoto": true/false,
  "confidence": 0-100,
  "reason": "판단 이유"
}

JSON만 출력하세요.`;

  const response = await analyzeImageWithGemini(apiKey, imageUrl, prompt);

  if (!response) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Gemini API 호출 실패',
    };
  }

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'JSON 파싱 실패',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const isValid = parsed.hasPerson && parsed.looksProfessional && parsed.isRealPhoto;

    return {
      isValid,
      confidence: parsed.confidence || 0,
      reason: parsed.reason || '',
    };
  } catch {
    return {
      isValid: false,
      confidence: 0,
      reason: '응답 파싱 실패',
    };
  }
}
