// src/lib/pipeline/gemini-client.ts
// Google Gemini API 클라이언트 - 텍스트 생성 + Vision

import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini 모델 ID (2026-01-21 업데이트)
// 참고: gemini-2.0-flash-exp는 분당 10회 제한, gemini-1.5-flash는 15 RPM
export const GEMINI_MODELS = {
  // 빠른 작업용 (팩트 추출, 코멘트) - 1.5-flash가 더 높은 쿼터
  flash: 'gemini-1.5-flash',
  flash20: 'gemini-2.0-flash',
  // 복잡한 분석용 (전문분야 프로파일)
  pro: 'gemini-1.5-flash',  // 1.5-pro 404 에러로 flash로 대체
  pro20: 'gemini-2.0-flash',
} as const;

export type GeminiModel = keyof typeof GEMINI_MODELS;

// 딜레이 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gemini 텍스트 생성 (Groq 대체)
 * Rate limit 대응: exponential backoff 재시도
 */
export async function geminiChat(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  options: {
    model?: GeminiModel;
    maxTokens?: number;
    temperature?: number;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const { model = 'flash', maxTokens = 4096, temperature = 0.3, maxRetries = 3 } = options;

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: GEMINI_MODELS[model],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  // System prompt + User message 결합
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiModel.generateContent(fullPrompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      lastError = error;

      // 429 Rate Limit 에러인 경우 재시도
      if (error?.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`  ⏳ Rate limit, ${waitTime/1000}초 후 재시도... (${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }

      // 다른 에러는 바로 throw
      console.error(`Gemini ${model} error:`, error);
      throw error;
    }
  }

  throw lastError;
}

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
