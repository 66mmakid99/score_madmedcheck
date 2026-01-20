// src/lib/pipeline/claude-analyzer.ts
// Claude API를 사용한 팩트 추출 및 분석

import Anthropic from '@anthropic-ai/sdk';
import type { DoctorType, Tier } from '../types';

export interface ExtractedFacts {
  // 기본 정보
  doctorName: string | null;
  specialistType: '피부과전문의' | '성형외과전문의' | '일반의' | '타과전문의';
  yearsOfPractice: number;

  // 학력/자격
  hasFellow: boolean;
  hasPhd: boolean;

  // 학술 실적
  sciPapersFirst: number;
  sciPapersCo: number;
  ifBonusCount: number; // IF 5+ 논문

  // 임상 실적
  volumeAwards: number;
  trainerCount: number;
  signatureCases: number;
  hasSafetyRecord: boolean;

  // 대외 활동
  kolCount: number;
  societyCount: number;
  bookCount: number;

  // 검증된 팩트 목록
  verifiedFacts: string[];

  // 제외된 자기 주장
  filteredClaims: string[];
}

const EXTRACTION_PROMPT = `당신은 의료인 정보를 분석하는 전문가입니다. 주어진 텍스트에서 **객관적으로 검증 가능한 팩트**만 추출하세요.

## 추출 규칙

### 인정되는 팩트 (제3자 검증 가능)
- SCI 논문 (PubMed 검색 가능)
- 제조사 공식 인증 (볼륨 어워드, 트레이너, KOL 등)
- 학회 임원직 (공식 명단 확인 가능)
- 전문의 자격 (대한의사협회 확인 가능)
- 펠로우십/레지던트 (수련병원 확인 가능)
- 의학박사 학위 (학위수여기관 확인 가능)

### 제외되는 주장 (자기 주장)
- "~만족도 1위", "~최다 시술" (자체 통계)
- "~전문", "~특화" (자기 선언)
- 환자 후기/리뷰
- 언론 보도 (광고성)
- "~년 경력" (구체적 증빙 없는 경우)

## 출력 형식 (JSON)
{
  "doctorName": "이름 또는 null",
  "specialistType": "피부과전문의|성형외과전문의|일반의|타과전문의",
  "yearsOfPractice": 숫자,
  "hasFellow": boolean,
  "hasPhd": boolean,
  "sciPapersFirst": 숫자,
  "sciPapersCo": 숫자,
  "ifBonusCount": 숫자,
  "volumeAwards": 숫자,
  "trainerCount": 숫자,
  "signatureCases": 숫자,
  "hasSafetyRecord": boolean,
  "kolCount": 숫자,
  "societyCount": 숫자,
  "bookCount": 숫자,
  "verifiedFacts": ["[카테고리] 팩트 설명", ...],
  "filteredClaims": ["제외된 자기 주장", ...]
}

숫자가 확인되지 않으면 0, boolean이 확인되지 않으면 false로 설정하세요.
JSON만 출력하세요. 다른 설명은 하지 마세요.`;

export async function extractFacts(
  content: string,
  hospitalName: string,
  apiKey: string
): Promise<ExtractedFacts> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `병원명: ${hospitalName}\n\n---\n\n${content}\n\n---\n\n위 내용에서 팩트를 추출해주세요.`,
      },
    ],
    system: EXTRACTION_PROMPT,
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    // JSON 파싱 시도
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON not found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      doctorName: parsed.doctorName || null,
      specialistType: parsed.specialistType || '일반의',
      yearsOfPractice: Number(parsed.yearsOfPractice) || 0,
      hasFellow: Boolean(parsed.hasFellow),
      hasPhd: Boolean(parsed.hasPhd),
      sciPapersFirst: Number(parsed.sciPapersFirst) || 0,
      sciPapersCo: Number(parsed.sciPapersCo) || 0,
      ifBonusCount: Number(parsed.ifBonusCount) || 0,
      volumeAwards: Number(parsed.volumeAwards) || 0,
      trainerCount: Number(parsed.trainerCount) || 0,
      signatureCases: Number(parsed.signatureCases) || 0,
      hasSafetyRecord: Boolean(parsed.hasSafetyRecord),
      kolCount: Number(parsed.kolCount) || 0,
      societyCount: Number(parsed.societyCount) || 0,
      bookCount: Number(parsed.bookCount) || 0,
      verifiedFacts: Array.isArray(parsed.verifiedFacts) ? parsed.verifiedFacts : [],
      filteredClaims: Array.isArray(parsed.filteredClaims) ? parsed.filteredClaims : [],
    };
  } catch {
    console.error('Failed to parse Claude response:', responseText);
    return getEmptyFacts();
  }
}

function getEmptyFacts(): ExtractedFacts {
  return {
    doctorName: null,
    specialistType: '일반의',
    yearsOfPractice: 0,
    hasFellow: false,
    hasPhd: false,
    sciPapersFirst: 0,
    sciPapersCo: 0,
    ifBonusCount: 0,
    volumeAwards: 0,
    trainerCount: 0,
    signatureCases: 0,
    hasSafetyRecord: false,
    kolCount: 0,
    societyCount: 0,
    bookCount: 0,
    verifiedFacts: [],
    filteredClaims: [],
  };
}

// AI 코멘트 생성
export async function generateConsultingComment(
  facts: ExtractedFacts,
  scores: { foundation: number; academic: number; clinical: number; reputation: number; total: number },
  doctorType: DoctorType,
  tier: Tier,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const prompt = `의사 분석 결과를 바탕으로 한 줄 컨설팅 코멘트를 작성하세요.

## 의사 정보
- 등급: ${tier}
- 유형: ${doctorType}
- 총점: ${scores.total}점
- Foundation(기본): ${scores.foundation}점
- Academic(학술): ${scores.academic}점
- Clinical(임상): ${scores.clinical}점
- Reputation(대외): ${scores.reputation}점

## 검증된 팩트
${facts.verifiedFacts.join('\n')}

## 작성 규칙
- 1~2문장으로 짧게
- 해당 의사의 강점을 언급
- 유형에 맞는 코멘트
- 존댓말 사용

코멘트만 출력하세요.`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}
