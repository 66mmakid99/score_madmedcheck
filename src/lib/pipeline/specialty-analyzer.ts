// src/lib/pipeline/specialty-analyzer.ts
// 의사 전문 시술분야 분석 모듈 - 의료관광 고객용 프로파일링

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// 장비/제품 → 기술/기전 매핑 데이터베이스
// ============================================

interface DeviceInfo {
  brand: string;
  technology: string[];
  mechanism: string[];
  category: string;
  koreanName?: string;
}

// 주요 미용의료 장비/제품 매핑
export const DEVICE_DATABASE: Record<string, DeviceInfo> = {
  // === 리프팅/타이트닝 장비 ===
  ulthera: {
    brand: 'Ulthera (Merz)',
    technology: ['HIFU', 'MFU-V', '초음파'],
    mechanism: ['리프팅', '타이트닝', '콜라겐 리모델링'],
    category: 'lifting',
    koreanName: '울쎄라',
  },
  ultherapy: {
    brand: 'Ulthera (Merz)',
    technology: ['HIFU', 'MFU-V', '초음파'],
    mechanism: ['리프팅', '타이트닝', '콜라겐 리모델링'],
    category: 'lifting',
    koreanName: '울쎄라피',
  },
  oligio: {
    brand: 'Oligio (Solta/Bausch)',
    technology: ['고주파', 'RF', 'Monopolar RF'],
    mechanism: ['리프팅', '타이트닝', '피부 탄력'],
    category: 'lifting',
    koreanName: '올리지오',
  },
  thermage: {
    brand: 'Thermage (Solta/Bausch)',
    technology: ['고주파', 'RF', 'Monopolar RF'],
    mechanism: ['리프팅', '타이트닝', '콜라겐 수축'],
    category: 'lifting',
    koreanName: '써마지',
  },
  thermageFLX: {
    brand: 'Thermage FLX (Solta/Bausch)',
    technology: ['고주파', 'RF', 'Monopolar RF', 'AccuREP'],
    mechanism: ['리프팅', '타이트닝', '콜라겐 수축'],
    category: 'lifting',
    koreanName: '써마지FLX',
  },
  shurink: {
    brand: 'Shurink (Classys)',
    technology: ['HIFU', '초음파'],
    mechanism: ['리프팅', '타이트닝'],
    category: 'lifting',
    koreanName: '슈링크',
  },
  shurinkUniverse: {
    brand: 'Shurink Universe (Classys)',
    technology: ['HIFU', '초음파', 'Linear HIFU'],
    mechanism: ['리프팅', '타이트닝', '피부 탄력'],
    category: 'lifting',
    koreanName: '슈링크 유니버스',
  },
  doublo: {
    brand: 'Doublo (Hironic)',
    technology: ['HIFU', '초음파'],
    mechanism: ['리프팅', '타이트닝'],
    category: 'lifting',
    koreanName: '더블로',
  },
  sofwave: {
    brand: 'Sofwave',
    technology: ['SUPERB', '초음파', 'Synchronous Ultrasound'],
    mechanism: ['리프팅', '타이트닝', '주름 개선'],
    category: 'lifting',
    koreanName: '소프웨이브',
  },

  // === 레이저 장비 ===
  picosure: {
    brand: 'PicoSure (Cynosure)',
    technology: ['피코레이저', 'Picosecond', '755nm'],
    mechanism: ['색소 치료', '문신 제거', '피부결 개선', '모공'],
    category: 'laser',
    koreanName: '피코슈어',
  },
  picoway: {
    brand: 'PicoWay (Candela)',
    technology: ['피코레이저', 'Picosecond', 'Multi-wavelength'],
    mechanism: ['색소 치료', '문신 제거', '피부 재생'],
    category: 'laser',
    koreanName: '피코웨이',
  },
  picoplus: {
    brand: 'PICOPLUS (Lutronic)',
    technology: ['피코레이저', 'Picosecond', '1064nm/532nm'],
    mechanism: ['색소 치료', '토닝', '피부결 개선'],
    category: 'laser',
    koreanName: '피코플러스',
  },
  fraxel: {
    brand: 'Fraxel (Solta)',
    technology: ['프락셔널 레이저', 'Fractional', '1550nm/1927nm'],
    mechanism: ['피부 재생', '흉터 치료', '주름 개선', '모공'],
    category: 'laser',
    koreanName: '프락셀',
  },
  halo: {
    brand: 'HALO (Sciton)',
    technology: ['하이브리드 프락셔널', 'Ablative + Non-ablative'],
    mechanism: ['피부 재생', '색소 치료', '피부결 개선'],
    category: 'laser',
    koreanName: '할로',
  },
  co2Laser: {
    brand: 'CO2 Fractional Laser',
    technology: ['프락셔널 CO2', 'Ablative Laser', '10600nm'],
    mechanism: ['피부 재생', '흉터 치료', '주름 개선', '리서페이싱'],
    category: 'laser',
    koreanName: 'CO2 프락셔널',
  },
  geniusRF: {
    brand: 'Genius (Lutronic)',
    technology: ['마이크로니들 RF', 'Microneedle RF'],
    mechanism: ['피부 재생', '흉터 치료', '모공', '탄력'],
    category: 'laser',
    koreanName: '지니어스',
  },
  infini: {
    brand: 'INFINI (Lutronic)',
    technology: ['마이크로니들 RF', 'Microneedle RF'],
    mechanism: ['피부 재생', '흉터 치료', '모공', '주름'],
    category: 'laser',
    koreanName: '인피니',
  },
  morpheus8: {
    brand: 'Morpheus8 (InMode)',
    technology: ['마이크로니들 RF', 'Fractional RF'],
    mechanism: ['피부 재생', '리프팅', '지방 감소', '흉터'],
    category: 'laser',
    koreanName: '모피어스8',
  },
  potenza: {
    brand: 'Potenza (Cynosure)',
    technology: ['마이크로니들 RF', 'Multi-needle RF'],
    mechanism: ['피부 재생', '흉터', '모공', '탄력'],
    category: 'laser',
    koreanName: '포텐자',
  },
  vbeam: {
    brand: 'VBeam (Candela)',
    technology: ['PDL', 'Pulsed Dye Laser', '595nm'],
    mechanism: ['혈관 치료', '홍조', '여드름 홍반', '흉터'],
    category: 'laser',
    koreanName: '브이빔',
  },
  excelV: {
    brand: 'Excel V (Cutera)',
    technology: ['혈관레이저', 'Nd:YAG + KTP'],
    mechanism: ['혈관 치료', '홍조', '색소', '피부 톤'],
    category: 'laser',
    koreanName: '엑셀브이',
  },
  clarity2: {
    brand: 'Clarity II (Lutronic)',
    technology: ['알렉산드라이트', 'Nd:YAG', '제모레이저'],
    mechanism: ['제모', '색소 치료', '혈관'],
    category: 'laser',
    koreanName: '클래리티2',
  },
  gentlemax: {
    brand: 'GentleMax Pro (Candela)',
    technology: ['알렉산드라이트', 'Nd:YAG', '제모레이저'],
    mechanism: ['제모', '색소 치료', '혈관'],
    category: 'laser',
    koreanName: '젠틀맥스프로',
  },

  // === 주사 시술 (필러/보톡스/스킨부스터) ===
  juvederm: {
    brand: 'Juvederm (Allergan)',
    technology: ['HA 필러', '히알루론산', 'Vycross'],
    mechanism: ['볼륨', '주름 개선', '윤곽 성형'],
    category: 'filler',
    koreanName: '쥬비덤',
  },
  restylane: {
    brand: 'Restylane (Galderma)',
    technology: ['HA 필러', '히알루론산', 'NASHA/OBT'],
    mechanism: ['볼륨', '주름 개선', '윤곽 성형'],
    category: 'filler',
    koreanName: '레스틸렌',
  },
  radiesse: {
    brand: 'Radiesse (Merz)',
    technology: ['CaHA 필러', '칼슘 하이드록시아파타이트'],
    mechanism: ['볼륨', '콜라겐 생성', '리프팅'],
    category: 'filler',
    koreanName: '래디에스',
  },
  sculptra: {
    brand: 'Sculptra (Galderma)',
    technology: ['PLLA', '폴리-L-락틱산'],
    mechanism: ['콜라겐 생성', '볼륨', '탄력'],
    category: 'filler',
    koreanName: '스컬트라',
  },
  ellanse: {
    brand: 'Ellanse (Sinclair)',
    technology: ['PCL 필러', '폴리카프로락톤'],
    mechanism: ['볼륨', '콜라겐 생성', '장기 지속'],
    category: 'filler',
    koreanName: '엘란세',
  },
  botox: {
    brand: 'Botox (Allergan)',
    technology: ['보툴리눔 톡신', 'Type A'],
    mechanism: ['주름 개선', '근육 이완', '사각턱', '승모근'],
    category: 'botox',
    koreanName: '보톡스',
  },
  dysport: {
    brand: 'Dysport (Galderma)',
    technology: ['보툴리눔 톡신', 'Type A'],
    mechanism: ['주름 개선', '근육 이완'],
    category: 'botox',
    koreanName: '디스포트',
  },
  xeomin: {
    brand: 'Xeomin (Merz)',
    technology: ['보툴리눔 톡신', 'Type A', 'Purified'],
    mechanism: ['주름 개선', '근육 이완'],
    category: 'botox',
    koreanName: '제오민',
  },
  profhilo: {
    brand: 'Profhilo (IBSA)',
    technology: ['HA 스킨부스터', 'Hybrid HA'],
    mechanism: ['피부 보습', '탄력', '피부결 개선'],
    category: 'skinbooster',
    koreanName: '프로파일로',
  },
  rejuran: {
    brand: 'Rejuran (Pharmaresearch)',
    technology: ['PDRN', '연어 DNA'],
    mechanism: ['피부 재생', '탄력', '항염'],
    category: 'skinbooster',
    koreanName: '리쥬란',
  },
  skinbooster: {
    brand: 'Restylane Skinboosters (Galderma)',
    technology: ['HA 스킨부스터', '히알루론산'],
    mechanism: ['피부 보습', '탄력', '피부결 개선'],
    category: 'skinbooster',
    koreanName: '스킨부스터',
  },
  exosome: {
    brand: 'Exosome Therapy',
    technology: ['엑소좀', '줄기세포 유래'],
    mechanism: ['피부 재생', '항노화', '세포 활성화'],
    category: 'regenerative',
    koreanName: '엑소좀',
  },

  // === 바디 시술 ===
  coolsculpting: {
    brand: 'CoolSculpting (Allergan)',
    technology: ['크라이오리폴리시스', 'Cryolipolysis', '냉각'],
    mechanism: ['지방 감소', '바디 컨투어링'],
    category: 'body',
    koreanName: '쿨스컬프팅',
  },
  emsculpt: {
    brand: 'EMSCULPT (BTL)',
    technology: ['HIFEM', '고강도 전자기장'],
    mechanism: ['근육 강화', '지방 감소', '바디 컨투어링'],
    category: 'body',
    koreanName: '엠스컬프트',
  },
  emsculptNeo: {
    brand: 'EMSCULPT NEO (BTL)',
    technology: ['HIFEM+', 'RF', '동시 적용'],
    mechanism: ['근육 강화', '지방 감소', '바디 컨투어링'],
    category: 'body',
    koreanName: '엠스컬프트 네오',
  },
  vanquish: {
    brand: 'Vanquish (BTL)',
    technology: ['RF', '고주파', 'Non-contact'],
    mechanism: ['지방 감소', '바디 컨투어링'],
    category: 'body',
    koreanName: '반퀴시',
  },
  liposonix: {
    brand: 'Liposonix (Solta)',
    technology: ['HIFU', '초음파'],
    mechanism: ['지방 감소', '바디 컨투어링'],
    category: 'body',
    koreanName: '라이포소닉스',
  },

  // === 스레드 리프팅 ===
  mintLift: {
    brand: 'MINT Lift',
    technology: ['PDO 실', '녹는 실'],
    mechanism: ['리프팅', 'V라인', '콜라겐 생성'],
    category: 'thread',
    koreanName: '민트 리프트',
  },
  silhouette: {
    brand: 'Silhouette Soft (Sinclair)',
    technology: ['PLLA 실', '녹는 실'],
    mechanism: ['리프팅', '콜라겐 생성'],
    category: 'thread',
    koreanName: '실루엣 소프트',
  },
  ultraVLift: {
    brand: 'Ultra V Lift',
    technology: ['PDO 실', '녹는 실'],
    mechanism: ['리프팅', '탄력', '콜라겐 생성'],
    category: 'thread',
    koreanName: '울트라V리프트',
  },
};

// 카테고리별 전문분야 한글 라벨
export const SPECIALTY_LABELS: Record<string, string> = {
  lifting: '리프팅/타이트닝',
  laser: '레이저 시술',
  filler: '필러/볼륨',
  botox: '보톡스/주름',
  skinbooster: '스킨부스터/피부재생',
  regenerative: '재생 치료',
  body: '바디 컨투어링',
  thread: '실 리프팅',
  pigment: '색소 치료',
  vascular: '혈관/홍조 치료',
  acne: '여드름/흉터',
  hairRemoval: '제모',
  antiAging: '안티에이징',
};

// ============================================
// 전문분야 분석 인터페이스
// ============================================

export interface SpecialtyProfile {
  // KOL 정보
  kolProducts: Array<{
    product: string;
    year?: number;
    technologies: string[];
    mechanisms: string[];
  }>;

  // 보유 장비
  equipment: Array<{
    device: string;
    brand: string;
    technologies: string[];
    mechanisms: string[];
    category: string;
  }>;

  // 주력 시술 분야 (추론된 결과)
  specialties: Array<{
    category: string;
    label: string;
    confidence: number; // 0-100
    keywords: string[];
  }>;

  // 핵심 기술 키워드
  technologyKeywords: string[];

  // 핵심 기전 키워드
  mechanismKeywords: string[];

  // 의료관광용 한줄 소개
  tagline: string;

  // 영문 태그라인
  taglineEn: string;
}

// ============================================
// 전문분야 분석 함수들
// ============================================

/**
 * 텍스트에서 장비/제품 언급 추출
 */
export function extractDeviceMentions(content: string): string[] {
  const mentions: Set<string> = new Set();
  const contentLower = content.toLowerCase();

  for (const [key, info] of Object.entries(DEVICE_DATABASE)) {
    // 영문명 체크
    if (contentLower.includes(key.toLowerCase())) {
      mentions.add(key);
    }
    // 한글명 체크
    if (info.koreanName && content.includes(info.koreanName)) {
      mentions.add(key);
    }
    // 브랜드명 체크
    const brandLower = info.brand.toLowerCase().split(' ')[0];
    if (contentLower.includes(brandLower)) {
      mentions.add(key);
    }
  }

  return Array.from(mentions);
}

/**
 * KOL 정보 추출 (키닥터 등)
 */
export function extractKolInfo(
  content: string
): Array<{ product: string; year?: number; technologies: string[]; mechanisms: string[] }> {
  const kolPatterns = [
    /(\d{4})년?\s*([\w가-힣]+)\s*(?:키닥터|KOL|트레이너|전문가|마스터|인스트럭터)/gi,
    /(?:키닥터|KOL|트레이너|전문가|마스터|인스트럭터)\s*[:\-]?\s*([\w가-힣]+)\s*(?:\((\d{4})\))?/gi,
    /([\w가-힣]+)\s*(?:골든레코드|Gold\s*Record|인증의)/gi,
  ];

  const results: Array<{ product: string; year?: number; technologies: string[]; mechanisms: string[] }> = [];
  const foundProducts = new Set<string>();

  for (const pattern of kolPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let product = '';
      let year: number | undefined;

      if (match[1] && /^\d{4}$/.test(match[1])) {
        year = parseInt(match[1]);
        product = match[2];
      } else {
        product = match[1] || match[2];
        if (match[2] && /^\d{4}$/.test(match[2])) {
          year = parseInt(match[2]);
        }
      }

      if (!product || foundProducts.has(product.toLowerCase())) continue;
      foundProducts.add(product.toLowerCase());

      // 제품과 매칭되는 장비 정보 찾기
      const deviceKey = findMatchingDevice(product);
      if (deviceKey && DEVICE_DATABASE[deviceKey]) {
        const device = DEVICE_DATABASE[deviceKey];
        results.push({
          product: device.koreanName || product,
          year,
          technologies: device.technology,
          mechanisms: device.mechanism,
        });
      } else {
        results.push({
          product,
          year,
          technologies: [],
          mechanisms: [],
        });
      }
    }
  }

  return results;
}

/**
 * 제품명으로 장비 데이터베이스 매칭
 */
function findMatchingDevice(productName: string): string | null {
  const nameLower = productName.toLowerCase().replace(/\s+/g, '');

  for (const [key, info] of Object.entries(DEVICE_DATABASE)) {
    if (key.toLowerCase() === nameLower) return key;
    if (info.koreanName && info.koreanName.replace(/\s+/g, '') === productName.replace(/\s+/g, '')) return key;
    if (info.brand.toLowerCase().includes(nameLower)) return key;
  }

  return null;
}

/**
 * 장비 목록에서 전문분야 추론
 */
function inferSpecialtiesFromEquipment(
  equipment: Array<{ category: string; technologies: string[]; mechanisms: string[] }>
): Array<{ category: string; label: string; confidence: number; keywords: string[] }> {
  const categoryScores: Record<string, { count: number; keywords: Set<string> }> = {};

  for (const item of equipment) {
    if (!categoryScores[item.category]) {
      categoryScores[item.category] = { count: 0, keywords: new Set() };
    }
    categoryScores[item.category].count++;
    item.mechanisms.forEach((m) => categoryScores[item.category].keywords.add(m));
    item.technologies.forEach((t) => categoryScores[item.category].keywords.add(t));
  }

  // 추가 카테고리 매핑 (기전 기반)
  const allMechanisms = equipment.flatMap((e) => e.mechanisms);
  if (allMechanisms.some((m) => m.includes('색소'))) {
    if (!categoryScores['pigment']) categoryScores['pigment'] = { count: 0, keywords: new Set() };
    categoryScores['pigment'].count++;
  }
  if (allMechanisms.some((m) => m.includes('혈관') || m.includes('홍조'))) {
    if (!categoryScores['vascular']) categoryScores['vascular'] = { count: 0, keywords: new Set() };
    categoryScores['vascular'].count++;
  }
  if (allMechanisms.some((m) => m.includes('흉터') || m.includes('여드름'))) {
    if (!categoryScores['acne']) categoryScores['acne'] = { count: 0, keywords: new Set() };
    categoryScores['acne'].count++;
  }
  if (allMechanisms.some((m) => m.includes('제모'))) {
    if (!categoryScores['hairRemoval']) categoryScores['hairRemoval'] = { count: 0, keywords: new Set() };
    categoryScores['hairRemoval'].count++;
  }

  const totalEquipment = equipment.length || 1;

  return Object.entries(categoryScores)
    .map(([category, data]) => ({
      category,
      label: SPECIALTY_LABELS[category] || category,
      confidence: Math.min(100, Math.round((data.count / totalEquipment) * 100 + 20)),
      keywords: Array.from(data.keywords),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Claude를 사용한 전문분야 상세 분석
 */
export async function analyzeSpecialtyWithAI(
  scrapedContent: string,
  doctorName: string | null,
  hospitalName: string,
  kolInfo: Array<{ product: string; technologies: string[]; mechanisms: string[] }>,
  equipment: Array<{ device: string; technologies: string[]; mechanisms: string[] }>,
  anthropicApiKey: string
): Promise<{ tagline: string; taglineEn: string; additionalSpecialties: string[] }> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const equipmentSummary = equipment.map((e) => `${e.device}: ${e.mechanisms.join(', ')}`).join('\n');
  const kolSummary = kolInfo.map((k) => `${k.product}: ${k.mechanisms.join(', ')}`).join('\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `의사의 전문 시술분야를 분석하여 의료관광 고객용 소개 문구를 작성해주세요.

의사/병원 정보:
- 이름: ${doctorName || '원장'}
- 병원: ${hospitalName}

KOL/키닥터 정보:
${kolSummary || '없음'}

보유 장비 분석:
${equipmentSummary || '없음'}

홈페이지 내용 일부:
${scrapedContent.slice(0, 1500)}

다음 JSON 형식으로 응답해주세요:
{
  "tagline": "한글 태그라인 (예: 리프팅/타이트닝 전문가, 울쎄라/써마지 명의)",
  "taglineEn": "English tagline (e.g., Lifting & Tightening Specialist)",
  "additionalSpecialties": ["추가로 발견된 전문분야 키워드들"]
}

주의:
- 태그라인은 15자 이내로 간결하게
- 핵심 시술분야 2-3가지를 포함
- KOL 제품이 있으면 우선 반영`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON not found');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('  ⚠️ AI 전문분야 분석 오류:', error);

    // 폴백: 기본 태그라인 생성
    const topMechanisms = [...new Set(equipment.flatMap((e) => e.mechanisms))].slice(0, 3);
    const fallbackTagline = topMechanisms.length > 0 ? `${topMechanisms.join('/')} 전문` : '피부과 전문의';

    return {
      tagline: fallbackTagline,
      taglineEn: 'Dermatology Specialist',
      additionalSpecialties: [],
    };
  }
}

/**
 * 메인 전문분야 분석 함수
 */
export async function analyzeSpecialtyProfile(
  scrapedContent: string,
  doctorName: string | null,
  hospitalName: string,
  anthropicApiKey: string
): Promise<SpecialtyProfile> {
  console.log(`  🔬 전문분야 분석 중...`);

  // 1. 장비 언급 추출
  const deviceMentions = extractDeviceMentions(scrapedContent);
  console.log(`  📋 발견된 장비: ${deviceMentions.length}개`);

  // 2. 장비 정보 매핑
  const equipment = deviceMentions.map((key) => {
    const info = DEVICE_DATABASE[key];
    return {
      device: info.koreanName || key,
      brand: info.brand,
      technologies: info.technology,
      mechanisms: info.mechanism,
      category: info.category,
    };
  });

  // 3. KOL 정보 추출
  const kolProducts = extractKolInfo(scrapedContent);
  console.log(`  🏆 KOL 제품: ${kolProducts.length}개`);

  // 4. 전문분야 추론
  const specialties = inferSpecialtiesFromEquipment(equipment);

  // 5. 기술/기전 키워드 통합
  const technologyKeywords = [...new Set(equipment.flatMap((e) => e.technologies))];
  const mechanismKeywords = [...new Set(equipment.flatMap((e) => e.mechanisms))];

  // 6. AI로 태그라인 생성
  const aiResult = await analyzeSpecialtyWithAI(
    scrapedContent,
    doctorName,
    hospitalName,
    kolProducts,
    equipment,
    anthropicApiKey
  );

  console.log(`  ✅ 전문분야 분석 완료: ${aiResult.tagline}`);

  return {
    kolProducts,
    equipment,
    specialties,
    technologyKeywords,
    mechanismKeywords,
    tagline: aiResult.tagline,
    taglineEn: aiResult.taglineEn,
  };
}
