// src/lib/pipeline/photo-validator.ts
// AI 기반 의사 사진 교차검증 모듈
// Vision 작업은 복잡한 분석이므로 Sonnet 사용

import Anthropic from '@anthropic-ai/sdk';

// 모델 선택 (Vision 작업은 Sonnet 필요)
const MODEL_VISION = 'claude-3-5-sonnet-20241022';

interface PhotoValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  reason: string;
  photoUrl: string | null;
}

interface PhotoCandidate {
  url: string;
  source: 'website' | 'google' | 'serpapi';
  context?: string; // 이미지 주변 텍스트
}

/**
 * Claude Vision을 사용한 사진 교차검증
 * 여러 소스에서 추출된 사진들을 비교하여 동일 인물인지 확인
 */
export async function validateDoctorPhoto(
  candidates: PhotoCandidate[],
  doctorName: string,
  hospitalName: string,
  anthropicApiKey: string
): Promise<PhotoValidationResult> {
  if (candidates.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: '후보 이미지 없음',
      photoUrl: null,
    };
  }

  // 단일 이미지인 경우 컨텍스트 기반 검증
  if (candidates.length === 1) {
    return validateSinglePhoto(candidates[0], doctorName, hospitalName, anthropicApiKey);
  }

  // 여러 이미지인 경우 교차 검증
  return crossValidatePhotos(candidates, doctorName, hospitalName, anthropicApiKey);
}

/**
 * 단일 사진 컨텍스트 검증
 * 이미지 URL과 주변 컨텍스트를 분석하여 의사 프로필 사진인지 확인
 */
async function validateSinglePhoto(
  candidate: PhotoCandidate,
  doctorName: string,
  hospitalName: string,
  anthropicApiKey: string
): Promise<PhotoValidationResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  try {
    // 이미지 fetch 및 base64 변환
    const imageData = await fetchImageAsBase64(candidate.url);
    if (!imageData) {
      return {
        isValid: false,
        confidence: 0,
        reason: '이미지 로드 실패',
        photoUrl: null,
      };
    }

    const response = await client.messages.create({
      model: MODEL_VISION,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageData.mediaType,
                data: imageData.data,
              },
            },
            {
              type: 'text',
              text: `이 이미지가 의료인 프로필 사진으로 적합한지 분석해주세요.

의사 정보:
- 이름: ${doctorName}
- 병원: ${hospitalName}
- 이미지 출처: ${candidate.source}
${candidate.context ? `- 주변 텍스트: ${candidate.context}` : ''}

다음 기준으로 판단해주세요:
1. 인물 사진인가? (단체 사진, 제품 사진, 로고 등 제외)
2. 전문적인 프로필 사진처럼 보이는가?
3. 의료인/의사의 사진으로 보이는가? (가운, 진료실 배경 등)

JSON 형식으로 응답:
{
  "isValidProfile": true/false,
  "confidence": 0-100,
  "reason": "판단 근거"
}`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON not found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      isValid: result.isValidProfile && result.confidence >= 60,
      confidence: result.confidence,
      reason: result.reason,
      photoUrl: result.isValidProfile && result.confidence >= 60 ? candidate.url : null,
    };
  } catch (error) {
    console.error('  ⚠️ 단일 사진 검증 오류:', error);
    return {
      isValid: false,
      confidence: 0,
      reason: `검증 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
      photoUrl: null,
    };
  }
}

/**
 * 여러 사진 교차 검증
 * 웹사이트와 구글 검색 결과를 비교하여 동일 인물인지 확인
 */
async function crossValidatePhotos(
  candidates: PhotoCandidate[],
  doctorName: string,
  hospitalName: string,
  anthropicApiKey: string
): Promise<PhotoValidationResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  try {
    // 최대 3개 이미지만 비교
    const imagesToCompare = candidates.slice(0, 3);
    const imageContents: Anthropic.Messages.ImageBlockParam[] = [];

    for (const candidate of imagesToCompare) {
      const imageData = await fetchImageAsBase64(candidate.url);
      if (imageData) {
        imageContents.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mediaType,
            data: imageData.data,
          },
        });
      }
    }

    if (imageContents.length < 2) {
      // 비교할 이미지가 충분하지 않으면 첫 번째 이미지 단일 검증
      return validateSinglePhoto(candidates[0], doctorName, hospitalName, anthropicApiKey);
    }

    const response = await client.messages.create({
      model: MODEL_VISION,
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: `이 ${imageContents.length}개의 이미지가 동일 인물인지 교차 검증해주세요.

의사 정보:
- 이름: ${doctorName}
- 병원: ${hospitalName}

이미지 출처:
${imagesToCompare.map((c, i) => `${i + 1}. ${c.source}${c.context ? ` (${c.context})` : ''}`).join('\n')}

분석해주세요:
1. 이미지들이 동일 인물인가?
2. 의료인 프로필 사진으로 적합한가?
3. 가장 적합한 프로필 사진은 몇 번째인가?

JSON 형식으로 응답:
{
  "isSamePerson": true/false,
  "confidence": 0-100,
  "bestImageIndex": 0-based index or -1 if none suitable,
  "reason": "판단 근거"
}`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON not found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    const bestIndex = result.bestImageIndex;
    const bestUrl = bestIndex >= 0 && bestIndex < candidates.length ? candidates[bestIndex].url : null;

    return {
      isValid: result.isSamePerson && result.confidence >= 70,
      confidence: result.confidence,
      reason: result.reason,
      photoUrl: result.isSamePerson && result.confidence >= 70 && bestUrl ? bestUrl : null,
    };
  } catch (error) {
    console.error('  ⚠️ 교차 검증 오류:', error);
    // 오류 시 첫 번째 이미지 단일 검증 시도
    return validateSinglePhoto(candidates[0], doctorName, hospitalName, anthropicApiKey);
  }
}

/**
 * 이미지 URL을 base64로 변환
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MadMedCheck/1.0)',
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // 지원되는 미디어 타입 매핑
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    return { data: base64, mediaType };
  } catch (error) {
    console.error('  ⚠️ 이미지 fetch 오류:', url, error);
    return null;
  }
}

/**
 * 간단한 URL 기반 사전 필터링
 * Claude API 호출 전에 명백히 부적절한 URL 제외
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
 * 여러 소스에서 사진을 수집하고 검증
 */
export async function collectAndValidatePhoto(
  websitePhotoUrl: string | null,
  googlePhotoUrls: string[],
  doctorName: string,
  hospitalName: string,
  anthropicApiKey: string
): Promise<PhotoValidationResult> {
  const candidates: PhotoCandidate[] = [];

  // 웹사이트 사진 추가
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

  // 이미지가 없으면 null 반환
  if (candidates.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: '유효한 후보 이미지 없음',
      photoUrl: null,
    };
  }

  // AI 검증 실행
  return validateDoctorPhoto(candidates, doctorName, hospitalName, anthropicApiKey);
}
