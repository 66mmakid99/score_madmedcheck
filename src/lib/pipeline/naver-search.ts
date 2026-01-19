// src/lib/pipeline/naver-search.ts
// 네이버 지도 API를 사용한 병원 검색

interface NaverSearchResult {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchResult[];
}

export interface HospitalBasicInfo {
  name: string;
  url: string | null;
  address: string;
  telephone: string;
  category: string;
}

export async function searchHospitals(
  query: string,
  clientId: string,
  clientSecret: string,
  display: number = 20
): Promise<HospitalBasicInfo[]> {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', 'comment'); // 리뷰 많은 순

  const response = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status} ${response.statusText}`);
  }

  const data: NaverSearchResponse = await response.json();

  return data.items.map((item) => ({
    name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
    url: item.link || null,
    address: item.roadAddress || item.address,
    telephone: item.telephone,
    category: item.category,
  }));
}

// 특정 지역의 피부과/성형외과 검색
export async function searchClinicsInRegion(
  region: string,
  specialty: '피부과' | '성형외과',
  clientId: string,
  clientSecret: string
): Promise<HospitalBasicInfo[]> {
  const query = `${region} ${specialty}`;
  return searchHospitals(query, clientId, clientSecret, 50);
}

// 여러 지역 일괄 검색
export async function searchClinicsInMultipleRegions(
  regions: string[],
  specialty: '피부과' | '성형외과',
  clientId: string,
  clientSecret: string,
  delayMs: number = 500 // API 레이트 리밋 방지
): Promise<Map<string, HospitalBasicInfo[]>> {
  const results = new Map<string, HospitalBasicInfo[]>();

  for (const region of regions) {
    try {
      const clinics = await searchClinicsInRegion(region, specialty, clientId, clientSecret);
      results.set(region, clinics);
      console.log(`✅ ${region}: ${clinics.length}개 병원 발견`);

      // 레이트 리밋 방지 딜레이
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error(`❌ ${region} 검색 실패:`, error);
      results.set(region, []);
    }
  }

  return results;
}
