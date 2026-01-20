// src/lib/pipeline/groq-client.ts
// Groq API 클라이언트 - Llama 3.3 70B를 사용한 고속/저비용 추론

import Groq from 'groq-sdk';

// Groq 모델 ID
export const GROQ_MODELS = {
  // Llama 3.3 70B - 고성능 범용 모델 ($0.59/1M input, $0.79/1M output)
  versatile: 'llama-3.3-70b-versatile',
  // Llama 3.1 8B - 빠른 응답용 ($0.05/1M input, $0.08/1M output)
  fast: 'llama-3.1-8b-instant',
} as const;

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqCompletionOptions {
  model?: keyof typeof GROQ_MODELS;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Groq API를 사용한 텍스트 생성
 */
export async function groqComplete(
  apiKey: string,
  messages: GroqChatMessage[],
  options: GroqCompletionOptions = {}
): Promise<string> {
  const client = new Groq({ apiKey });

  const modelKey = options.model || 'versatile';
  const modelId = GROQ_MODELS[modelKey];

  const response = await client.chat.completions.create({
    model: modelId,
    messages: messages,
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature ?? 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Groq API returned empty response');
  }

  return content;
}

/**
 * 시스템 프롬프트와 사용자 메시지로 간단하게 호출
 */
export async function groqChat(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  options: GroqCompletionOptions = {}
): Promise<string> {
  return groqComplete(
    apiKey,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    options
  );
}
