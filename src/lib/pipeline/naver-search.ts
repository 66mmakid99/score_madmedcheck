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

// 제외할 카테고리 키워드
const EXCLUDED_CATEGORIES = [
  '한의원',
  '한방',
  '치과',
  '정형외과',
  '내과',
  '산부인과',
  '소아과',
  '이비인후과',
  '안과',
  '정신과',
  '비뇨기과',
  '외과',
  '신경외과',
  '마취과',
  '약국',
  '한약',
];

// 제외할 이름 키워드
const EXCLUDED_NAMES = [
  '한의원',
  '한방',
  '치과',
  '약국',
  '의원', // 단독으로 "의원"만 있는 경우는 제외하지 않음
];

// 제외할 URL 패턴 (소셜미디어, 블로그 등 - 실제 병원 홈페이지가 아님)
const EXCLUDED_URL_PATTERNS = [
  'instagram.com',
  'facebook.com',
  'blog.naver.com',
  'cafe.naver.com',
  'youtube.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'kakao.com',
  'modoo.at', // 네이버 모두 (간이 페이지)
];

// URL이 실제 병원 홈페이지인지 확인
function isValidHospitalUrl(url: string | null): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return !EXCLUDED_URL_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

// 병원 필터링 함수
function filterClinics(
  clinics: HospitalBasicInfo[],
  targetSpecialty: '피부과' | '성형외과'
): HospitalBasicInfo[] {
  return clinics.filter((clinic) => {
    const name = clinic.name.toLowerCase();
    const category = clinic.category.toLowerCase();

    // 제외 카테고리 체크
    for (const excluded of EXCLUDED_CATEGORIES) {
      if (category.includes(excluded) || name.includes(excluded)) {
        console.log(`  🚫 제외: ${clinic.name} (${clinic.category})`);
        return false;
      }
    }

    // 타겟 진료과가 카테고리나 이름에 포함되어야 함
    const hasTargetSpecialty =
      category.includes(targetSpecialty) ||
      name.includes(targetSpecialty) ||
      category.includes('피부') ||
      name.includes('피부') ||
      category.includes('성형') ||
      name.includes('성형') ||
      category.includes('의원') ||
      category.includes('클리닉') ||
      name.includes('클리닉');

    if (!hasTargetSpecialty) {
      console.log(`  🚫 제외 (타겟 아님): ${clinic.name} (${clinic.category})`);
      return false;
    }

    return true;
  });
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
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Naver API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  let data: NaverSearchResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error('Naver API returned invalid JSON response');
  }

  if (!data.items || !Array.isArray(data.items)) {
    console.warn('Naver API returned no items');
    return [];
  }

  return data.items.map((item) => {
    const name = item.title?.replace(/<[^>]*>/g, '') || '이름없음'; // HTML 태그 제거
    const rawUrl = item.link || null;

    // 소셜미디어/블로그 URL 필터링
    let url = rawUrl;
    if (rawUrl && !isValidHospitalUrl(rawUrl)) {
      console.log(`  ⚠️ ${name}: 소셜미디어 URL 제외 (${rawUrl})`);
      url = null; // 실제 홈페이지가 아니면 null로 설정
    }

    return {
      name,
      url,
      address: item.roadAddress || item.address || '',
      telephone: item.telephone || '',
      category: item.category || '',
    };
  });
}

// 특정 지역의 피부과/성형외과 검색
export async function searchClinicsInRegion(
  region: string,
  specialty: '피부과' | '성형외과',
  clientId: string,
  clientSecret: string
): Promise<HospitalBasicInfo[]> {
  const query = `${region} ${specialty}`;
  const allClinics = await searchHospitals(query, clientId, clientSecret, 50);

  // 한의원, 치과 등 제외
  const filteredClinics = filterClinics(allClinics, specialty);

  console.log(`  📋 검색 ${allClinics.length}개 → 필터링 후 ${filteredClinics.length}개`);

  return filteredClinics;
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
