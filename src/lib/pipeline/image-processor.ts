// src/lib/pipeline/image-processor.ts
// 의사 프로필 사진 배경 제거 및 합성 모듈

import sharp from 'sharp';

interface ProcessedImageResult {
  success: boolean;
  processedImageBase64: string | null;
  processedImageUrl: string | null;
  error?: string;
}

/**
 * Remove.bg API를 사용한 배경 제거
 */
async function removeBackground(imageUrl: string, apiKey: string): Promise<Buffer | null> {
  try {
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'regular', // auto, preview, small, regular, medium, full, hd, 4k
        type: 'person',
        format: 'png',
        crop: true,
        crop_margin: '10%',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('  ⚠️ Remove.bg API 오류:', response.status, errorText);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('  ⚠️ 배경 제거 오류:', error);
    return null;
  }
}

/**
 * 은은한 그라데이션 배경 생성
 * 의사 타입에 따라 다른 색상 사용
 */
function getGradientColors(doctorType: string): { start: string; end: string } {
  const gradients: Record<string, { start: string; end: string }> = {
    Scholar: { start: '#e0e7ff', end: '#c7d2fe' }, // 인디고 계열
    Maestro: { start: '#fee2e2', end: '#fecaca' }, // 레드 계열
    Pioneer: { start: '#ffedd5', end: '#fed7aa' }, // 오렌지 계열
    Guardian: { start: '#d1fae5', end: '#a7f3d0' }, // 그린 계열
    Hexagon: { start: '#ede9fe', end: '#ddd6fe' }, // 바이올렛 계열
  };

  return gradients[doctorType] || { start: '#f1f5f9', end: '#e2e8f0' }; // 기본 슬레이트 계열
}

/**
 * SVG 그라데이션 배경 생성
 */
function createGradientSvg(width: number, height: number, colors: { start: string; end: string }): Buffer {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="30%" r="80%" fx="50%" fy="30%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </radialGradient>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <!-- 은은한 빛 효과 -->
      <ellipse cx="${width * 0.3}" cy="${height * 0.2}" rx="${width * 0.4}" ry="${height * 0.3}"
               fill="white" opacity="0.15" filter="url(#blur)"/>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * 전문적인 프로필 배경 패턴 생성 (의료/클린 느낌)
 */
function createMedicalPatternSvg(width: number, height: number, colors: { start: string; end: string }): Buffer {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
        <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1" fill="white" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgGrad)"/>
      <rect width="100%" height="100%" fill="url(#dots)"/>
      <!-- 부드러운 비네팅 효과 -->
      <rect width="100%" height="100%" fill="url(#vignette)">
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" style="stop-color:transparent;stop-opacity:0" />
            <stop offset="100%" style="stop-color:#000;stop-opacity:0.05" />
          </radialGradient>
        </defs>
      </rect>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * 배경 제거 후 새 배경과 합성
 */
export async function processProfilePhoto(
  imageUrl: string,
  doctorType: string,
  removeBgApiKey: string
): Promise<ProcessedImageResult> {
  console.log(`  🎨 이미지 처리 시작...`);

  // 1. 배경 제거
  const foregroundBuffer = await removeBackground(imageUrl, removeBgApiKey);
  if (!foregroundBuffer) {
    return {
      success: false,
      processedImageBase64: null,
      processedImageUrl: null,
      error: '배경 제거 실패',
    };
  }

  console.log(`  ✅ 배경 제거 완료`);

  try {
    // 2. 전경 이미지 메타데이터 확인
    const foregroundImage = sharp(foregroundBuffer);
    const metadata = await foregroundImage.metadata();
    const width = metadata.width || 400;
    const height = metadata.height || 400;

    // 3. 그라데이션 배경 생성
    const gradientColors = getGradientColors(doctorType);
    const backgroundSvg = createGradientSvg(width, height, gradientColors);

    // 4. 배경과 전경 합성
    const composited = await sharp(backgroundSvg)
      .resize(width, height)
      .composite([
        {
          input: foregroundBuffer,
          gravity: 'center',
        },
      ])
      .png({ quality: 90 })
      .toBuffer();

    console.log(`  ✅ 배경 합성 완료`);

    // 5. Base64로 변환 (Data URL)
    const base64 = composited.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return {
      success: true,
      processedImageBase64: base64,
      processedImageUrl: dataUrl,
    };
  } catch (error) {
    console.error('  ⚠️ 이미지 합성 오류:', error);
    return {
      success: false,
      processedImageBase64: null,
      processedImageUrl: null,
      error: `이미지 합성 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * 원본 이미지에 부드러운 비네팅 효과만 적용 (배경 제거 없이)
 * Remove.bg API 키가 없을 때 대안
 */
export async function applyVignetteEffect(
  imageUrl: string,
  doctorType: string
): Promise<ProcessedImageResult> {
  try {
    // 이미지 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        success: false,
        processedImageBase64: null,
        processedImageUrl: null,
        error: '이미지 다운로드 실패',
      };
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 400;
    const height = metadata.height || 400;

    // 비네팅 오버레이 생성
    const vignetteSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" style="stop-color:transparent;stop-opacity:0" />
            <stop offset="80%" style="stop-color:#000;stop-opacity:0.15" />
            <stop offset="100%" style="stop-color:#000;stop-opacity:0.3" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#vignette)"/>
      </svg>
    `);

    // 합성
    const processed = await image
      .resize(400, 400, { fit: 'cover', position: 'top' })
      .composite([
        {
          input: vignetteSvg,
          blend: 'multiply',
        },
      ])
      .png({ quality: 90 })
      .toBuffer();

    const base64 = processed.toString('base64');

    return {
      success: true,
      processedImageBase64: base64,
      processedImageUrl: `data:image/png;base64,${base64}`,
    };
  } catch (error) {
    return {
      success: false,
      processedImageBase64: null,
      processedImageUrl: null,
      error: `비네팅 효과 적용 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * 이미지 처리 메인 함수
 * Remove.bg API 키가 있으면 배경 제거 + 합성, 없으면 비네팅만 적용
 */
export async function enhanceProfilePhoto(
  imageUrl: string,
  doctorType: string,
  removeBgApiKey?: string
): Promise<ProcessedImageResult> {
  if (removeBgApiKey) {
    return processProfilePhoto(imageUrl, doctorType, removeBgApiKey);
  } else {
    console.log(`  ⚠️ REMOVEBG_API_KEY 없음, 비네팅 효과만 적용`);
    return applyVignetteEffect(imageUrl, doctorType);
  }
}

/**
 * Cloudflare Images에 업로드 (선택적)
 * 나중에 구현 - 현재는 Data URL 사용
 */
export async function uploadToCloudflareImages(
  imageBuffer: Buffer,
  accountId: string,
  apiToken: string
): Promise<string | null> {
  // TODO: Cloudflare Images API 연동
  // https://developers.cloudflare.com/images/cloudflare-images/upload-images/
  return null;
}
