// src/lib/pipeline/image-extractor.ts
// 의사 프로필 사진 추출 모듈

/**
 * Firecrawl 스크래핑 결과에서 의사 사진 URL 추출
 */
export function extractDoctorPhotoFromMarkdown(
  markdown: string,
  doctorName: string | null
): string | null {
  if (!markdown) return null;

  // 이미지 URL 패턴 매칭
  const imagePatterns = [
    // Markdown 이미지 문법
    /!\[([^\]]*(?:원장|의사|대표|프로필|doctor|profile)[^\]]*)\]\(([^)]+)\)/gi,
    /!\[[^\]]*\]\(([^)]+(?:원장|의사|대표|프로필|doctor|profile)[^)]*)\)/gi,

    // HTML img 태그
    /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["'][^"']*(?:원장|의사|대표|프로필)[^"']*["'])?[^>]*>/gi,
    /<img[^>]*(?:alt=["'][^"']*(?:원장|의사|대표|프로필)[^"']*["'])[^>]*src=["']([^"']+)["'][^>]*>/gi,

    // 일반 이미지 URL (jpg, png, webp)
    /https?:\/\/[^\s<>"']+(?:원장|의사|doctor|profile|대표|ceo)[^\s<>"']*\.(?:jpg|jpeg|png|webp|gif)/gi,
  ];

  // 의사 이름이 있으면 이름 기반 패턴도 추가
  if (doctorName) {
    const namePattern = doctorName.replace(/\s+/g, '[-_\\s]?');
    imagePatterns.push(
      new RegExp(`https?://[^\\s<>"']+${namePattern}[^\\s<>"']*\\.(?:jpg|jpeg|png|webp|gif)`, 'gi')
    );
  }

  // 패턴 매칭 시도
  for (const pattern of imagePatterns) {
    const matches = markdown.match(pattern);
    if (matches && matches.length > 0) {
      // URL 추출
      const urlMatch = matches[0].match(/https?:\/\/[^\s<>"')]+/i);
      if (urlMatch) {
        const url = urlMatch[0];
        // 유효한 이미지 URL인지 확인
        if (isValidImageUrl(url)) {
          return url;
        }
      }
    }
  }

  // 대안: 페이지의 첫 번째 인물 사진 시도 (about, team, staff 섹션)
  const aboutSectionPattern = /(?:about|team|staff|소개|원장|의료진)[^]*?!\[[^\]]*\]\(([^)]+\.(?:jpg|jpeg|png|webp))\)/gi;
  const aboutMatch = aboutSectionPattern.exec(markdown);
  if (aboutMatch && aboutMatch[1]) {
    return aboutMatch[1];
  }

  return null;
}

/**
 * 유효한 이미지 URL인지 검증
 */
function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // 이미지 확장자 확인
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasImageExtension = imageExtensions.some(ext =>
      parsedUrl.pathname.toLowerCase().endsWith(ext)
    );

    // 제외할 패턴 (아이콘, 로고, 배너 등)
    const excludePatterns = [
      /icon/i,
      /logo/i,
      /banner/i,
      /button/i,
      /bg[-_]/i,
      /background/i,
      /sprite/i,
      /favicon/i,
      /placeholder/i,
      /loading/i,
      /thumbnail/i, // 너무 작은 썸네일 제외
    ];

    const isExcluded = excludePatterns.some(pattern =>
      pattern.test(url)
    );

    return hasImageExtension && !isExcluded;
  } catch {
    return false;
  }
}

/**
 * SerpAPI를 사용한 구글 이미지 검색
 */
export async function searchDoctorPhoto(
  doctorName: string,
  hospitalName: string,
  serpApiKey: string
): Promise<string | null> {
  const results = await searchDoctorPhotos(doctorName, hospitalName, serpApiKey, 1);
  return results.length > 0 ? results[0] : null;
}

/**
 * SerpAPI를 사용한 구글 이미지 검색 (여러 결과 반환)
 * 교차 검증을 위해 여러 이미지 URL 반환
 */
export async function searchDoctorPhotos(
  doctorName: string,
  hospitalName: string,
  serpApiKey: string,
  maxResults: number = 3
): Promise<string[]> {
  if (!serpApiKey) return [];

  try {
    const query = encodeURIComponent(`${doctorName} ${hospitalName} 원장`);
    const url = `https://serpapi.com/search.json?engine=google_images&q=${query}&api_key=${serpApiKey}&num=10`;

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️ SerpAPI 요청 실패: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: string[] = [];

    // 이미지 결과에서 적절한 사진들 수집
    if (data.images_results && data.images_results.length > 0) {
      for (const image of data.images_results) {
        if (results.length >= maxResults) break;

        const imageUrl = image.original || image.thumbnail;

        // 의료/병원 관련 이미지인지 확인
        if (imageUrl && isLikelyDoctorPhoto(imageUrl, image.title || '')) {
          results.push(imageUrl);
        }
      }

      // 결과가 부족하면 남은 이미지들도 추가
      if (results.length < maxResults) {
        for (const image of data.images_results) {
          if (results.length >= maxResults) break;

          const imageUrl = image.original || image.thumbnail;
          if (imageUrl && !results.includes(imageUrl)) {
            results.push(imageUrl);
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('  ❌ 구글 이미지 검색 오류:', error);
    return [];
  }
}

/**
 * 의사 프로필 사진일 가능성 판단
 */
function isLikelyDoctorPhoto(url: string, title: string): boolean {
  const positivePatterns = [
    /원장/,
    /의사/,
    /doctor/i,
    /대표/,
    /병원/,
    /클리닉/,
    /clinic/i,
    /derma/i,
    /피부과/,
    /성형/,
  ];

  const combinedText = `${url} ${title}`;
  return positivePatterns.some(pattern => pattern.test(combinedText));
}

/**
 * 이미지 URL을 Cloudflare Images 또는 다른 CDN으로 프록시
 * (선택적 - 외부 이미지 핫링크 방지 및 최적화용)
 */
export function getOptimizedImageUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;

  // 현재는 원본 URL 그대로 반환
  // 추후 Cloudflare Images 연동 시 변환 로직 추가 가능
  return originalUrl;
}
