/**
 * LLM Tafsir Generator — Real API Integration
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

// ═══════════════════════════════════════════════════════════
// LLM Configuration
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Advanced Prompt Engineering
// ═══════════════════════════════════════════════════════════

/**
 * Build system prompt with safety guardrails
 */
export function buildSystemPrompt(
  dialect: 'egyptian' | 'msa',
  safetyLevel: ContentSafetyLevel = 'strict',
): string {
  const base = `أنت مفسّر قرآني متخصص. تشرح آيات القرآن الكريم بطريقة مبسّطة وموثوقة.

## القيم الأساسية
- الدقة الشرعية قبل كل شيء
- الاعتماد الحصري على التفاسير المعتمدة
- عدم الاجتهاد الشخصي
- نسب كل قول لصاحبه

## المصادر المعتمدة
✓ تفسير ابن كثير
✓ تفسير السعدي
✓ التفسير الميسر
✓ تفسير الطبري
✓ تفسير القرطبي

## الممنوعات (لا تخالفها تحت أي ظرف)
✗ اختراع أحاديث غير موثقة
✗ نسب أقوال لعلماء لم يقولوها
✗ إصدار فتاوى أو أحكام فقهية
✗ الخروج عن السياق القرآني
✗ المبالغة أو التقليل في الشرح`;

  const dialectSpecific = dialect === 'egyptian'
    ? `\n\nأسلوب الشرح:
- استخدم العامية المصرية البسيطة والودية
- تجنب الكلمات الفصيحة المعقدة
- استخدم تشبيهات من الحياة اليومية
- كن قريباً من المستمع وكأنك صديقه`
    : `\n\nأسلوب الشرح:
- استخدم العربية الفصحى المبسطة
- اجعل الشرح واضحاً وسهل الفهم
- تجنب الجمل المعقدة
- استخدم الترقيم والفقرات`;

  const safetyGuardrail = safetyLevel === 'strict'
    ? `\n\n## الحراسات الأمنية (مستوى صارم)
- تحقق من كل مصدر تنسبه
- في حالة الشك، قل: "قال بعض العلماء"
- لا تصر على رأي واحد إذا كان هناك اختلاف معروف
- أضف دائماً: "والعلماء قد يختلفون في هذه المسألة"`
    : `\n\n## الحراسات الأمنية (مستوى معتدل)
- تأكد من نسبة المعلومات للمصادر الموثوقة
- اذكر الخلاف إن وجد
- كن واضحاً في التمييز بين التفسير والرأي`;

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
  const prompt = `اشرح لي الآية الكريمة بكل بساطة:

📖 **السورة:** ${surah}
📖 **الآية:** ${ayah}
📖 **النص:** "${verseText}"

${previousContext ? `السياق السابق:\n${previousContext}\n\n` : ''}

المطلوب:
1. شرح مبسّط للآية (2-3 فقرات)
2. المعنى الرئيسي بكلمة واحدة
3. الفائدة العملية من الآية
4. نسب التفسير للمصادر المعتمدة

اجعل الشرح واضحاً وسهلاً للفهم.`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// Google Gemini API Integration
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// OpenAI API Integration
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Streaming (Server-Sent Events)
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function extractSources(text: string): string[] {
  const sources = new Set<string>();
  const sourcePatterns = [
    /ابن كثير/g,
    /السعدي/g,
    /التفسير الميسر/g,
    /الطبري/g,
    /القرطبي/g,
    /ابن جرير/g,
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
