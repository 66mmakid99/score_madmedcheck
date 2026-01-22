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

// 유효하지 않은 URL 패턴 (SNS, 블로그 등)
const INVALID_URL_PATTERNS = [
  'pf.kakao.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'facebook.com',
  'blog.naver.com',
  'cafe.naver.com',
  'booking.naver.com',
  'talk.naver.com',
  'modoo.at',
  'linktr.ee',
];

// URL이 유효한 병원 홈페이지인지 확인
function isValidHospitalUrl(url: string | null): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return !INVALID_URL_PATTERNS.some(pattern => lowerUrl.includes(pattern));
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
    const rawUrl = item.link || null;
    const validUrl = isValidHospitalUrl(rawUrl) ? rawUrl : null;

    if (rawUrl && !validUrl) {
      console.log(`  ⚠️ SNS URL 제외: ${rawUrl}`);
    }

    return {
      name: item.title?.replace(/<[^>]*>/g, '') || '이름없음', // HTML 태그 제거
      url: validUrl,
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

// 네이버 웹 검색으로 병원 홈페이지 URL 찾기
export async function findHospitalWebsite(
  hospitalName: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const query = `${hospitalName} 공식 홈페이지`;
  const url = new URL('https://openapi.naver.com/v1/search/webkr.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '10');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.log(`  ⚠️ 웹 검색 실패: ${hospitalName}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // 유효한 병원 홈페이지 URL 찾기
    for (const item of data.items) {
      const link = item.link;
      if (link && isValidHospitalUrl(link)) {
        // 병원 이름이 URL이나 제목에 포함되어 있는지 확인 (정확도 향상)
        const title = (item.title || '').replace(/<[^>]*>/g, '').toLowerCase();
        const normalizedName = hospitalName.replace(/의원|클리닉|병원|피부과|성형외과/g, '').trim().toLowerCase();

        if (title.includes(normalizedName) || link.toLowerCase().includes(normalizedName.replace(/\s/g, ''))) {
          console.log(`  🔗 홈페이지 발견: ${link}`);
          return link;
        }
      }
    }

    // 정확한 매칭이 없으면 첫 번째 유효한 URL 반환
    for (const item of data.items) {
      if (item.link && isValidHospitalUrl(item.link)) {
        console.log(`  🔗 홈페이지 추정: ${item.link}`);
        return item.link;
      }
    }

    return null;
  } catch (error) {
    console.error(`  ❌ 웹 검색 오류 (${hospitalName}):`, error);
    return null;
  }
}

// 하이브리드 검색: 지도에서 목록 + 웹검색으로 홈페이지 찾기
export async function searchClinicsHybrid(
  region: string,
  specialty: '피부과' | '성형외과',
  clientId: string,
  clientSecret: string
): Promise<HospitalBasicInfo[]> {
  // 1. 지도 API로 병원 목록 수집
  const clinics = await searchClinicsInRegion(region, specialty, clientId, clientSecret);

  // 2. URL이 없는 병원은 웹 검색으로 홈페이지 찾기
  const results: HospitalBasicInfo[] = [];

  for (const clinic of clinics) {
    if (clinic.url) {
      // 이미 유효한 URL이 있으면 그대로 사용
      results.push(clinic);
    } else {
      // 웹 검색으로 홈페이지 찾기
      console.log(`  🔍 웹 검색: ${clinic.name}`);
      const websiteUrl = await findHospitalWebsite(clinic.name, clientId, clientSecret);

      results.push({
        ...clinic,
        url: websiteUrl,
      });

      // API 레이트 리밋 방지
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  const withUrl = results.filter(c => c.url).length;
  console.log(`  📊 URL 확보: ${withUrl}/${results.length}개`);

  return results;
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
