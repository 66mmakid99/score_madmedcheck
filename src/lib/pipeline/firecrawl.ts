// src/lib/pipeline/firecrawl.ts
// Firecrawl API를 사용한 웹 스크래핑

interface FirecrawlResponse {
  success: boolean;
  data?: {
    content: string;
    markdown: string;
    metadata: {
      title: string;
      description: string;
      language: string;
      sourceURL: string;
    };
  };
  error?: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  success: boolean;
  error?: string;
}

export async function scrapeUrl(url: string, apiKey: string): Promise<ScrapedContent> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status}`);
    }

    const data: FirecrawlResponse = await response.json();

    if (!data.success || !data.data) {
      return {
        url,
        title: '',
        content: '',
        markdown: '',
        success: false,
        error: data.error || 'Unknown error',
      };
    }

    return {
      url,
      title: data.data.metadata.title || '',
      content: data.data.content || '',
      markdown: data.data.markdown || '',
      success: true,
    };
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      markdown: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 여러 URL 일괄 스크래핑
export async function scrapeMultipleUrls(
  urls: string[],
  apiKey: string,
  delayMs: number = 1000 // Firecrawl 레이트 리밋 방지
): Promise<ScrapedContent[]> {
  const results: ScrapedContent[] = [];

  for (const url of urls) {
    if (!url) {
      results.push({
        url: '',
        title: '',
        content: '',
        markdown: '',
        success: false,
        error: 'Empty URL',
      });
      continue;
    }

    console.log(`🔍 스크래핑 중: ${url}`);
    const result = await scrapeUrl(url, apiKey);
    results.push(result);

    if (result.success) {
      console.log(`✅ 스크래핑 성공: ${result.title}`);
    } else {
      console.log(`❌ 스크래핑 실패: ${result.error}`);
    }

    // 레이트 리밋 방지 딜레이
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return results;
}

// 병원 홈페이지에서 의사 정보 추출을 위한 키워드 필터
export function extractDoctorSections(markdown: string): string {
  const keywords = [
    '의료진',
    '원장',
    '대표원장',
    '프로필',
    '약력',
    '학력',
    '경력',
    '논문',
    '수상',
    '인증',
    '자격',
    '전문의',
  ];

  const lines = markdown.split('\n');
  const relevantSections: string[] = [];
  let inRelevantSection = false;
  let sectionBuffer: string[] = [];

  for (const line of lines) {
    // 헤딩 체크 (# 또는 **굵은 텍스트**)
    const isHeading = line.startsWith('#') || /^\*\*[^*]+\*\*$/.test(line.trim());

    if (isHeading) {
      // 이전 섹션 저장
      if (inRelevantSection && sectionBuffer.length > 0) {
        relevantSections.push(sectionBuffer.join('\n'));
      }

      // 새 섹션 시작
      inRelevantSection = keywords.some((kw) => line.includes(kw));
      sectionBuffer = inRelevantSection ? [line] : [];
    } else if (inRelevantSection) {
      sectionBuffer.push(line);
    }
  }

  // 마지막 섹션 저장
  if (inRelevantSection && sectionBuffer.length > 0) {
    relevantSections.push(sectionBuffer.join('\n'));
  }

  return relevantSections.join('\n\n---\n\n');
}
