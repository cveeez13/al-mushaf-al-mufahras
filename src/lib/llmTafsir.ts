// @ts-nocheck
// @ts-nocheck
/**
 * LLM Tafsir Generator â€” Real API Integration
 * 
 * Supports:
 * - Google Gemini API
 * - OpenAI API (GPT-4, GPT-3.5)
 * - Anthropic Claude (future)
 * 
 * Features:
 * - Advanced prompt engineering with safety guardrails
 * - Response streaming (Server-Sent Events)
 * - Intelligent caching with versioning
 * - Fallback to pre-seeded database
 * - Rate limiting & quota management
 * - Cost tracking
 */

export type LLMProvider = 'gemini' | 'openai' | 'local-fallback';
export type ContentSafetyLevel = 'strict' | 'moderate' | 'permissive';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  safetyLevel: ContentSafetyLevel;
}

export interface LLMResponse {
  text: string;
  sources: string[];
  tokensUsed: { prompt: number; completion: number; total: number };
  cost: number;
  model: string;
  provider: LLMProvider;
  timestamp: number;
}

export interface StreamEvent {
  type: 'start' | 'chunk' | 'sources' | 'complete' | 'error';
  data: {
    text?: string;
    sources?: string[];
    error?: string;
    tokensUsed?: { prompt: number; completion: number; total: number };
    cost?: number;
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LLM Configuration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LLM_MODELS = {
  gemini: {
    'gemini-2.0-flash': {
      name: 'Gemini 2.0 Flash',
      costPer1kPrompt: 0.000075,
      costPer1kCompletion: 0.0003,
      contextWindow: 1000000,
      recommended: true,
    },
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      costPer1kPrompt: 0.00125,
      costPer1kCompletion: 0.005,
      contextWindow: 2000000,
      recommended: false,
    },
  },
  openai: {
    'gpt-4-turbo': {
      name: 'GPT-4 Turbo',
      costPer1kPrompt: 0.01,
      costPer1kCompletion: 0.03,
      contextWindow: 128000,
      recommended: false,
    },
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      costPer1kPrompt: 0.0005,
      costPer1kCompletion: 0.0015,
      contextWindow: 4096,
      recommended: true,
    },
  },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Advanced Prompt Engineering
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Build system prompt with safety guardrails
 */
export function buildSystemPrompt(
  dialect: 'egyptian' | 'msa',
  safetyLevel: ContentSafetyLevel = 'strict',
): string {
  const base = `Ø£Ù†Øª Ù…ÙØ³Ù‘Ø± Ù‚Ø±Ø¢Ù†ÙŠ Ù…ØªØ®ØµØµ. ØªØ´Ø±Ø­ Ø¢ÙŠØ§Øª Ø§Ù„Ù‚Ø±Ø¢Ù† Ø§Ù„ÙƒØ±ÙŠÙ… Ø¨Ø·Ø±ÙŠÙ‚Ø© Ù…Ø¨Ø³Ù‘Ø·Ø© ÙˆÙ…ÙˆØ«ÙˆÙ‚Ø©.

## Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
- Ø§Ù„Ø¯Ù‚Ø© Ø§Ù„Ø´Ø±Ø¹ÙŠØ© Ù‚Ø¨Ù„ ÙƒÙ„ Ø´ÙŠØ¡
- Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø­ØµØ±ÙŠ Ø¹Ù„Ù‰ Ø§Ù„ØªÙØ§Ø³ÙŠØ± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©
- Ø¹Ø¯Ù… Ø§Ù„Ø§Ø¬ØªÙ‡Ø§Ø¯ Ø§Ù„Ø´Ø®ØµÙŠ
- Ù†Ø³Ø¨ ÙƒÙ„ Ù‚ÙˆÙ„ Ù„ØµØ§Ø­Ø¨Ù‡

## Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©
âœ“ ØªÙØ³ÙŠØ± Ø§Ø¨Ù† ÙƒØ«ÙŠØ±
âœ“ ØªÙØ³ÙŠØ± Ø§Ù„Ø³Ø¹Ø¯ÙŠ
âœ“ Ø§Ù„ØªÙØ³ÙŠØ± Ø§Ù„Ù…ÙŠØ³Ø±
âœ“ ØªÙØ³ÙŠØ± Ø§Ù„Ø·Ø¨Ø±ÙŠ
âœ“ ØªÙØ³ÙŠØ± Ø§Ù„Ù‚Ø±Ø·Ø¨ÙŠ

## Ø§Ù„Ù…Ù…Ù†ÙˆØ¹Ø§Øª (Ù„Ø§ ØªØ®Ø§Ù„ÙÙ‡Ø§ ØªØ­Øª Ø£ÙŠ Ø¸Ø±Ù)
âœ— Ø§Ø®ØªØ±Ø§Ø¹ Ø£Ø­Ø§Ø¯ÙŠØ« ØºÙŠØ± Ù…ÙˆØ«Ù‚Ø©
âœ— Ù†Ø³Ø¨ Ø£Ù‚ÙˆØ§Ù„ Ù„Ø¹Ù„Ù…Ø§Ø¡ Ù„Ù… ÙŠÙ‚ÙˆÙ„ÙˆÙ‡Ø§
âœ— Ø¥ØµØ¯Ø§Ø± ÙØªØ§ÙˆÙ‰ Ø£Ùˆ Ø£Ø­ÙƒØ§Ù… ÙÙ‚Ù‡ÙŠØ©
âœ— Ø§Ù„Ø®Ø±ÙˆØ¬ Ø¹Ù† Ø§Ù„Ø³ÙŠØ§Ù‚ Ø§Ù„Ù‚Ø±Ø¢Ù†ÙŠ
âœ— Ø§Ù„Ù…Ø¨Ø§Ù„ØºØ© Ø£Ùˆ Ø§Ù„ØªÙ‚Ù„ÙŠÙ„ ÙÙŠ Ø§Ù„Ø´Ø±Ø­`;

  const dialectSpecific = dialect === 'egyptian'
    ? `\n\nØ£Ø³Ù„ÙˆØ¨ Ø§Ù„Ø´Ø±Ø­:
- Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø§Ù…ÙŠØ© Ø§Ù„Ù…ØµØ±ÙŠØ© Ø§Ù„Ø¨Ø³ÙŠØ·Ø© ÙˆØ§Ù„ÙˆØ¯ÙŠØ©
- ØªØ¬Ù†Ø¨ Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„ÙØµÙŠØ­Ø© Ø§Ù„Ù…Ø¹Ù‚Ø¯Ø©
- Ø§Ø³ØªØ®Ø¯Ù… ØªØ´Ø¨ÙŠÙ‡Ø§Øª Ù…Ù† Ø§Ù„Ø­ÙŠØ§Ø© Ø§Ù„ÙŠÙˆÙ…ÙŠØ©
- ÙƒÙ† Ù‚Ø±ÙŠØ¨Ø§Ù‹ Ù…Ù† Ø§Ù„Ù…Ø³ØªÙ…Ø¹ ÙˆÙƒØ£Ù†Ùƒ ØµØ¯ÙŠÙ‚Ù‡`
    : `\n\nØ£Ø³Ù„ÙˆØ¨ Ø§Ù„Ø´Ø±Ø­:
- Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„ÙØµØ­Ù‰ Ø§Ù„Ù…Ø¨Ø³Ø·Ø©
- Ø§Ø¬Ø¹Ù„ Ø§Ù„Ø´Ø±Ø­ ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆØ³Ù‡Ù„ Ø§Ù„ÙÙ‡Ù…
- ØªØ¬Ù†Ø¨ Ø§Ù„Ø¬Ù…Ù„ Ø§Ù„Ù…Ø¹Ù‚Ø¯Ø©
- Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„ØªØ±Ù‚ÙŠÙ… ÙˆØ§Ù„ÙÙ‚Ø±Ø§Øª`;

  const safetyGuardrail = safetyLevel === 'strict'
    ? `\n\n## Ø§Ù„Ø­Ø±Ø§Ø³Ø§Øª Ø§Ù„Ø£Ù…Ù†ÙŠØ© (Ù…Ø³ØªÙˆÙ‰ ØµØ§Ø±Ù…)
- ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙ„ Ù…ØµØ¯Ø± ØªÙ†Ø³Ø¨Ù‡
- ÙÙŠ Ø­Ø§Ù„Ø© Ø§Ù„Ø´ÙƒØŒ Ù‚Ù„: "Ù‚Ø§Ù„ Ø¨Ø¹Ø¶ Ø§Ù„Ø¹Ù„Ù…Ø§Ø¡"
- Ù„Ø§ ØªØµØ± Ø¹Ù„Ù‰ Ø±Ø£ÙŠ ÙˆØ§Ø­Ø¯ Ø¥Ø°Ø§ ÙƒØ§Ù† Ù‡Ù†Ø§Ùƒ Ø§Ø®ØªÙ„Ø§Ù Ù…Ø¹Ø±ÙˆÙ
- Ø£Ø¶Ù Ø¯Ø§Ø¦Ù…Ø§Ù‹: "ÙˆØ§Ù„Ø¹Ù„Ù…Ø§Ø¡ Ù‚Ø¯ ÙŠØ®ØªÙ„ÙÙˆÙ† ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø³Ø£Ù„Ø©"`
    : `\n\n## Ø§Ù„Ø­Ø±Ø§Ø³Ø§Øª Ø§Ù„Ø£Ù…Ù†ÙŠØ© (Ù…Ø³ØªÙˆÙ‰ Ù…Ø¹ØªØ¯Ù„)
- ØªØ£ÙƒØ¯ Ù…Ù† Ù†Ø³Ø¨Ø© Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ù„Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ù…ÙˆØ«ÙˆÙ‚Ø©
- Ø§Ø°ÙƒØ± Ø§Ù„Ø®Ù„Ø§Ù Ø¥Ù† ÙˆØ¬Ø¯
- ÙƒÙ† ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙÙŠ Ø§Ù„ØªÙ…ÙŠÙŠØ² Ø¨ÙŠÙ† Ø§Ù„ØªÙØ³ÙŠØ± ÙˆØ§Ù„Ø±Ø£ÙŠ`;

  return base + dialectSpecific + safetyGuardrail;
}

/**
 * Build user prompt for a specific verse
 */
export function buildUserPrompt(
  surah: number,
  ayah: number,
  verseText: string,
  previousContext?: string,
): string {
  const prompt = `Ø§Ø´Ø±Ø­ Ù„ÙŠ Ø§Ù„Ø¢ÙŠØ© Ø§Ù„ÙƒØ±ÙŠÙ…Ø© Ø¨ÙƒÙ„ Ø¨Ø³Ø§Ø·Ø©:

ðŸ“– **Ø§Ù„Ø³ÙˆØ±Ø©:** ${surah}
ðŸ“– **Ø§Ù„Ø¢ÙŠØ©:** ${ayah}
ðŸ“– **Ø§Ù„Ù†Øµ:** "${verseText}"

${previousContext ? `Ø§Ù„Ø³ÙŠØ§Ù‚ Ø§Ù„Ø³Ø§Ø¨Ù‚:\n${previousContext}\n\n` : ''}

Ø§Ù„Ù…Ø·Ù„ÙˆØ¨:
1. Ø´Ø±Ø­ Ù…Ø¨Ø³Ù‘Ø· Ù„Ù„Ø¢ÙŠØ© (2-3 ÙÙ‚Ø±Ø§Øª)
2. Ø§Ù„Ù…Ø¹Ù†Ù‰ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ø¨ÙƒÙ„Ù…Ø© ÙˆØ§Ø­Ø¯Ø©
3. Ø§Ù„ÙØ§Ø¦Ø¯Ø© Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ù…Ù† Ø§Ù„Ø¢ÙŠØ©
4. Ù†Ø³Ø¨ Ø§Ù„ØªÙØ³ÙŠØ± Ù„Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©

Ø§Ø¬Ø¹Ù„ Ø§Ù„Ø´Ø±Ø­ ÙˆØ§Ø¶Ø­Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹ Ù„Ù„ÙÙ‡Ù….`;

  return prompt;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Google Gemini API Integration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-2.0-flash',
): Promise<LLMResponse> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

  const request = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3, // Low temperature for consistency
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  };

  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const promptTokens = data.usageMetadata?.promptTokenCount || 0;
    const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = promptTokens + completionTokens;

    const modelInfo = LLM_MODELS.gemini[model as keyof typeof LLM_MODELS.gemini];
    const cost =
      (promptTokens / 1000) * modelInfo.costPer1kPrompt +
      (completionTokens / 1000) * modelInfo.costPer1kCompletion;

    return {
      text,
      sources: extractSources(text),
      tokensUsed: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
      cost,
      model,
      provider: 'gemini',
      timestamp: Date.now(),
    };
  } catch (error) {
    throw new Error(`Gemini API call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OpenAI API Integration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function callOpenAIAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gpt-3.5-turbo',
): Promise<LLMResponse> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const request = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 1024,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    const modelInfo = LLM_MODELS.openai[model as keyof typeof LLM_MODELS.openai];
    const cost =
      (promptTokens / 1000) * modelInfo.costPer1kPrompt +
      (completionTokens / 1000) * modelInfo.costPer1kCompletion;

    return {
      text,
      sources: extractSources(text),
      tokensUsed: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
      cost,
      model,
      provider: 'openai',
      timestamp: Date.now(),
    };
  } catch (error) {
    throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Streaming (Server-Sent Events)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function* streamGeminiResponse(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string = 'gemini-2.0-flash',
): AsyncGenerator<StreamEvent> {
  try {
    yield { type: 'start', data: {} };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':streamGenerateContent';

    const request = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      yield {
        type: 'error',
        data: { error: `Gemini API error: ${response.statusText}` },
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', data: { error: 'No response body' } };
      return;
    }

    let buffer = '';
    const decoder = new TextDecoder();
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('}')) continue;

        try {
          const json = JSON.parse(line);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (text) {
            yield { type: 'chunk', data: { text } };
          }

          if (json.usageMetadata) {
            totalPromptTokens = json.usageMetadata.promptTokenCount || 0;
            totalCompletionTokens = json.usageMetadata.candidatesTokenCount || 0;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    yield {
      type: 'complete',
      data: {
        tokensUsed: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
          total: totalPromptTokens + totalCompletionTokens,
        },
      },
    };
  } catch (error) {
    yield {
      type: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Helpers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function extractSources(text: string): string[] {
  const sources = new Set<string>();
  const sourcePatterns = [
    /Ø§Ø¨Ù† ÙƒØ«ÙŠØ±/g,
    /Ø§Ù„Ø³Ø¹Ø¯ÙŠ/g,
    /Ø§Ù„ØªÙØ³ÙŠØ± Ø§Ù„Ù…ÙŠØ³Ø±/g,
    /Ø§Ù„Ø·Ø¨Ø±ÙŠ/g,
    /Ø§Ù„Ù‚Ø±Ø·Ø¨ÙŠ/g,
    /Ø§Ø¨Ù† Ø¬Ø±ÙŠØ±/g,
  ];

  for (const pattern of sourcePatterns) {
    if (pattern.test(text)) {
      sources.add(pattern.source.replace(/\//g, ''));
    }
  }

  return Array.from(sources);
}

export function calculateCost(
  provider: LLMProvider,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const models = provider === 'gemini' ? LLM_MODELS.gemini : LLM_MODELS.openai;
  const modelInfo = models[model as any];

  if (!modelInfo) return 0;

  return (
    (promptTokens / 1000) * modelInfo.costPer1kPrompt +
    (completionTokens / 1000) * modelInfo.costPer1kCompletion
  );
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

