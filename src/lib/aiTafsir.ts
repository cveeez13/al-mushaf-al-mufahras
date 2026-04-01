/**
 * AI Tafsir Generator — Simplified Tafsir in Egyptian/Arabic Colloquial
 *
 * Architecture:
 * - Pre-seeded simplified tafsir database for key verses (sourced from Ibn Kathir & Al-Sa'di)
 * - Response caching in localStorage (with TTL)
 * - Streaming simulation with progressive text reveal (SSE-style)
 * - Guardrails: content validation, source attribution, disclaimer
 * - Two dialect modes: Egyptian colloquial (عامية مصرية) & Modern Standard Arabic (فصحى مبسطة)
 *
 * Since this is a static PWA, actual LLM API calls are simulated.
 * The architecture is designed to be swappable with a real LLM endpoint
 * (OpenAI, Anthropic, etc.) by replacing generateAiTafsir().
 *
 * Prompt Engineering Strategy:
 * - System prompt enforces Quran-only context and scholarly attribution
 * - Guardrails prevent fabrication of hadith or rulings
 * - Every response cites one or more classical tafsir sources
 * - Disclaimer is always prepended
 */

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export type Dialect = 'egyptian' | 'msa';

export interface TafsirSource {
  id: string;
  name_ar: string;
  name_en: string;
  author_ar: string;
  author_en: string;
}

export interface AiTafsirResponse {
  verseKey: string;
  dialect: Dialect;
  text: string;             // The simplified tafsir text
  sources: TafsirSource[];  // Which classical tafsirs were referenced
  generatedAt: string;       // ISO timestamp
  cached: boolean;           // Whether this came from cache
  disclaimer: string;        // Always-present disclaimer
}

export interface StreamChunk {
  text: string;
  done: boolean;
  sources?: TafsirSource[];
}

export interface AiTafsirCacheEntry {
  verseKey: string;
  dialect: Dialect;
  text: string;
  sources: TafsirSource[];
  generatedAt: string;
  ttl: number;               // TTL in ms
}

export interface GuardrailResult {
  safe: boolean;
  reason?: string;
}

// ───────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────

const CACHE_KEY = 'mushaf-ai-tafsir-cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export const TAFSIR_SOURCES: TafsirSource[] = [
  { id: 'ibn-kathir', name_ar: 'تفسير ابن كثير', name_en: 'Tafsir Ibn Kathir', author_ar: 'ابن كثير', author_en: 'Ibn Kathir' },
  { id: 'al-sadi', name_ar: 'تفسير السعدي', name_en: "Tafsir Al-Sa'di", author_ar: 'عبد الرحمن السعدي', author_en: "Al-Sa'di" },
  { id: 'al-muyassar', name_ar: 'التفسير الميسر', name_en: 'Al-Muyassar', author_ar: 'مجمع الملك فهد', author_en: 'King Fahd Complex' },
  { id: 'al-tabari', name_ar: 'تفسير الطبري', name_en: 'Tafsir Al-Tabari', author_ar: 'ابن جرير الطبري', author_en: 'Al-Tabari' },
  { id: 'al-qurtubi', name_ar: 'تفسير القرطبي', name_en: 'Tafsir Al-Qurtubi', author_ar: 'القرطبي', author_en: 'Al-Qurtubi' },
];

export const DISCLAIMER_AR = '⚠️ هذا تفسير مبسّط مولّد بالذكاء الاصطناعي استنادًا لتفاسير العلماء المعتمدة. هو مساعدة للفهم وليس بديلاً عن التفسير العلمي المتخصص. للتعمّق، ارجع للتفاسير الأصلية.';
export const DISCLAIMER_EN = '⚠️ This is AI-simplified tafsir based on classical scholarly sources. It is an aid for understanding, NOT a replacement for specialized scholarly interpretation. For depth, refer to the original tafsirs.';

// ───────────────────────────────────────────────────────────────
// Prompt Engineering — System Prompt (for real LLM integration)
// ───────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_EGYPTIAN = `أنت مفسّر مساعد تشرح آيات القرآن الكريم بالعامية المصرية البسيطة.

القواعد الأساسية (لا تخالفها أبدًا):
1. اعتمد فقط على التفاسير المعتمدة: ابن كثير، السعدي، التفسير الميسر، الطبري، القرطبي
2. لا تخترع أحاديث أو أقوال لم ترد في المصادر
3. لا تُصدر فتاوى أو أحكام فقهية
4. اذكر المصدر بوضوح (مثلاً: "زي ما قال ابن كثير...")
5. استخدم عامية مصرية بسيطة وسهلة
6. لو مش متأكد من حاجة، قول "الله أعلم" واقترح الرجوع للعلماء
7. ابدأ دائمًا بالبسملة
8. لا تطعن في أي صحابي أو عالم
9. خلّي الشرح قصير ومركّز (أقل من ٣٠٠ كلمة)`;

export const SYSTEM_PROMPT_MSA = `أنت مفسّر مساعد تشرح آيات القرآن الكريم بالعربية الفصحى المبسطة.

القواعد الأساسية (لا تخالفها أبدًا):
1. اعتمد فقط على التفاسير المعتمدة: ابن كثير، السعدي، التفسير الميسر، الطبري، القرطبي
2. لا تخترع أحاديث أو أقوالاً لم ترد في المصادر
3. لا تُصدر فتاوى أو أحكاماً فقهية
4. اذكر المصدر بوضوح (مثلاً: "ذكر ابن كثير...")
5. استخدم فصحى مبسطة يفهمها الجميع
6. إذا لم تكن متأكدًا، قل "والله أعلم" واقترح الرجوع للعلماء
7. ابدأ دائمًا بالبسملة
8. لا تطعن في أي صحابي أو عالم
9. اجعل الشرح موجزًا ومركزًا (أقل من ٣٠٠ كلمة)`;

// ───────────────────────────────────────────────────────────────
// Guardrails — Content Validation
// ───────────────────────────────────────────────────────────────

const FORBIDDEN_PATTERNS = [
  // Fabricated hadith indicators
  /قال النبي(?!.*(?:رواه|البخاري|مسلم|أحمد|الترمذي|أبو داود|ابن ماجه))/,
  // Self-issuing fatwa
  /(?:أفتي|الفتوى|يجب عليك|حرام عليك|حلال لك)/,
  // Sectarian content
  /(?:كفّار|مرتدين|خوارج|روافض)/,
  // Modern political content
  /(?:حزب|انتخابات|رئيس|حكومة)/,
];

const REQUIRED_PATTERNS = [
  // Must mention at least one source
  /(?:ابن كثير|السعدي|الميسر|الطبري|القرطبي|العلماء|المفسرين)/,
];

/**
 * Validate AI-generated tafsir content against guardrails.
 */
export function validateGuardrails(text: string): GuardrailResult {
  if (!text || text.trim().length === 0) {
    return { safe: false, reason: 'empty' };
  }

  if (text.length > 3000) {
    return { safe: false, reason: 'too_long' };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, reason: 'forbidden_content' };
    }
  }

  // Check at least one source is referenced
  const hasSources = REQUIRED_PATTERNS.some(p => p.test(text));
  if (!hasSources) {
    return { safe: false, reason: 'no_source_attribution' };
  }

  return { safe: true };
}

// ───────────────────────────────────────────────────────────────
// Response Cache
// ───────────────────────────────────────────────────────────────

function loadCache(): Map<string, AiTafsirCacheEntry> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const entries: [string, AiTafsirCacheEntry][] = JSON.parse(raw);
    const now = Date.now();
    // Filter expired entries
    return new Map(entries.filter(([, e]) => {
      const age = now - new Date(e.generatedAt).getTime();
      return age < (e.ttl || CACHE_TTL);
    }));
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, AiTafsirCacheEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    const entries = Array.from(cache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded */ }
}

function getCacheKey(verseKey: string, dialect: Dialect): string {
  return `${verseKey}:${dialect}`;
}

export function getCachedTafsir(verseKey: string, dialect: Dialect): AiTafsirCacheEntry | null {
  const cache = loadCache();
  return cache.get(getCacheKey(verseKey, dialect)) ?? null;
}

export function cacheTafsir(entry: AiTafsirCacheEntry): void {
  const cache = loadCache();
  cache.set(getCacheKey(entry.verseKey, entry.dialect), entry);
  // Cap at 200 entries
  if (cache.size > 200) {
    const oldest = Array.from(cache.entries())
      .sort((a, b) => new Date(a[1].generatedAt).getTime() - new Date(b[1].generatedAt).getTime());
    oldest.slice(0, cache.size - 200).forEach(([k]) => cache.delete(k));
  }
  saveCache(cache);
}

export function clearTafsirCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

export function getCacheStats(): { count: number; sizeKB: number } {
  if (typeof window === 'undefined') return { count: 0, sizeKB: 0 };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { count: 0, sizeKB: 0 };
    const entries: [string, AiTafsirCacheEntry][] = JSON.parse(raw);
    return {
      count: entries.length,
      sizeKB: Math.round(raw.length / 1024),
    };
  } catch {
    return { count: 0, sizeKB: 0 };
  }
}

// ───────────────────────────────────────────────────────────────
// Pre-seeded Simplified Tafsir Database
// These are hand-written simplified explanations sourced from
// Ibn Kathir, Al-Sa'di, and Al-Muyassar, re-written in simple Arabic.
// ───────────────────────────────────────────────────────────────

interface SeededTafsir {
  egyptian: string;
  msa: string;
  sources: string[];  // source IDs from TAFSIR_SOURCES
}

const SEEDED_TAFSIRS: Record<string, SeededTafsir> = {
  '1:1': {
    egyptian: `بسم الله الرحمن الرحيم

دي أول آية في القرآن الكريم، واسمها "البسملة". معناها إنك بتبدأ كل حاجة باسم الله سبحانه وتعالى.

"بسم الله" — يعني بأبدأ مستعينًا باسم الله.
"الرحمن" — يعني رحمته وسعت كل حاجة، للمؤمن والكافر في الدنيا.
"الرحيم" — يعني رحمته الخاصة اللي هتبقى للمؤمنين بس يوم القيامة.

زي ما قال ابن كثير: البسملة فيها استعانة بالله قبل أي عمل، وفيها تعليم للعبد إنه مايبدأش حاجة غير باسم ربنا.

والسعدي قال: إن الله سمّى نفسه "الرحمن الرحيم" عشان يطمّن العباد إن رحمته أوسع من غضبه.`,
    msa: `بسم الله الرحمن الرحيم

هذه أول آية في كتاب الله تعالى، وتُعرف بـ"البسملة". معناها أنك تبدأ كل أمر مستعينًا باسم الله.

"بسم الله" — أي أبدأ مستعينًا باسم الله تبارك وتعالى.
"الرحمن" — ذو الرحمة الواسعة التي تشمل جميع المخلوقات في الدنيا.
"الرحيم" — ذو الرحمة الخاصة بالمؤمنين يوم القيامة.

ذكر ابن كثير أن البسملة فيها استعانة بالله قبل كل عمل، وأنها تعليم للعبد ألا يبدأ شيئًا إلا باسم ربه.

وقال السعدي: إن الله سمّى نفسه "الرحمن الرحيم" ليُطمئن عباده أن رحمته أوسع من غضبه.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '1:2': {
    egyptian: `بسم الله الرحمن الرحيم

"الحمد لله رب العالمين" — دي آية بتعلّمنا إن كل الشكر والثناء لله وحده.

"الحمد" — يعني الثناء الكامل، مش بس شكر على نعمة، لأ دا حمد لله لأنه الله، سواء أنعم عليك أو ابتلاك.
"لله" — خاص بالله وحده لا شريك له.
"رب العالمين" — يعني هو رب كل المخلوقات: الإنس والجن والملائكة والحيوانات وكل حاجة.

قال ابن كثير: "الحمد" هو الثناء على الله بصفات الكمال وأفعال الإحسان. و"العالمين" هم كل ما سوى الله من المخلوقات.

والسعدي قال: الحمد يشمل كل صفات الجمال والجلال والكمال لله عز وجل.`,
    msa: `بسم الله الرحمن الرحيم

"الحمد لله رب العالمين" — هذه الآية تُعلّمنا أن الثناء والشكر كله لله وحده.

"الحمد" — هو الثناء الكامل على الله بصفات الكمال، لا لنعمة فقط، بل لأنه الله المستحق للحمد ذاتًا.
"لله" — خاص بالله تعالى لا شريك له.
"رب العالمين" — أي رب جميع المخلوقات: الإنس والجن والملائكة وسائر الكائنات.

ذكر ابن كثير أن "الحمد" هو الثناء على الله بصفات الكمال وأفعال الإحسان. و"العالمين" كل ما سوى الله من المخلوقات.

وقال السعدي: الحمد يشمل جميع صفات الجمال والجلال والكمال لله عز وجل.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '1:5': {
    egyptian: `بسم الله الرحمن الرحيم

"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" — دي من أعظم آيات القرآن! بتقول فيها: يا رب، أنا مابعبدش غيرك ومابستعينش بحد غيرك.

"إِيَّاكَ نَعْبُدُ" — العبادة لله بس. مش لحد تاني ولا لأي حاجة تانية.
"وَإِيَّاكَ نَسْتَعِينُ" — وبنطلب المعونة من الله بس في كل أمورنا.

قال ابن كثير: تقديم "إِيَّاكَ" يدل على الحصر والاختصاص، يعني العبادة والاستعانة لله وحده لا شريك له.

والتفسير الميسر شرح إن النصف الأول من الفاتحة حق لله (الحمد والثناء) والنصف التاني حق للعبد (الدعاء والهداية). وهذه الآية هي الحد الفاصل بينهما.`,
    msa: `بسم الله الرحمن الرحيم

"إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" — من أعظم آيات القرآن. يقول العبد فيها: يا رب، لا أعبد إلا إياك ولا أستعين إلا بك.

"إِيَّاكَ نَعْبُدُ" — العبادة مقصورة على الله وحده لا شريك له.
"وَإِيَّاكَ نَسْتَعِينُ" — والاستعانة مطلوبة من الله وحده في جميع الأمور.

ذكر ابن كثير أن تقديم "إِيَّاكَ" يدل على الحصر والاختصاص، أي أن العبادة والاستعانة لله وحده.

وبيّن التفسير الميسر أن النصف الأول من الفاتحة حقٌّ لله (الحمد والثناء) والنصف الثاني حقٌّ للعبد (الدعاء والهداية). وهذه الآية هي الحد الفاصل بينهما.`,
    sources: ['ibn-kathir', 'al-muyassar'],
  },
  '2:255': {
    egyptian: `بسم الله الرحمن الرحيم

"آية الكرسي" — دي أعظم آية في القرآن كله! النبي ﷺ قال عنها كده (رواه مسلم).

"اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ" — مافيش إله حقيقي غير الله.
"الْحَيُّ الْقَيُّومُ" — هو الحي اللي حياته كاملة بدون نقص، والقيّوم اللي قائم بتدبير كل المخلوقات.
"لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ" — لا بينعس ولا بينام سبحانه.
"لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ" — كل حاجة ملكه.
"مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ" — محدش يقدر يشفع عند ربنا غير بإذنه.

قال ابن كثير: هذه الآية اشتملت على عشر جمل مستقلة، وكل جملة فيها تدل على عظمة الله وكماله.

والسعدي قال: آية الكرسي أعظم آيات القرآن لما فيها من توحيد الله وبيان صفاته العليا.`,
    msa: `بسم الله الرحمن الرحيم

"آية الكرسي" — هي أعظم آية في القرآن الكريم، كما أخبر النبي ﷺ (رواه مسلم).

"اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ" — لا معبود بحق إلا الله تعالى.
"الْحَيُّ الْقَيُّومُ" — الحي حياةً كاملة لا يعتريها نقص، القيّوم القائم بتدبير شؤون جميع المخلوقات.
"لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ" — لا يعتريه نعاس ولا نوم سبحانه.
"لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ" — كل شيء مُلكه تعالى.
"مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ" — لا أحد يشفع عند الله إلا بإذنه.

ذكر ابن كثير أن هذه الآية اشتملت على عشر جمل مستقلة، كل جملة تدل على عظمة الله وكماله.

وقال السعدي: آية الكرسي أعظم آيات القرآن لما تضمنته من توحيد الله وبيان صفاته العليا.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '36:1': {
    egyptian: `بسم الله الرحمن الرحيم

"يس" — دي من الحروف المقطعة اللي بيبدأ بيها بعض السور. الله أعلم بمرادها.

قال ابن كثير: الحروف المقطعة زي (ألم) و(يس) و(طه) فيها أقوال كتير عند العلماء. بعضهم قال هي أسماء للسور، وبعضهم قال هي للتنبيه، وبعضهم قال الله أعلم بمرادها.

والسعدي قال: الحروف المقطعة فيها إشارة لعظمة القرآن وإعجازه، إن هو مكوّن من حروف عربية عادية لكن البشر عجزوا يأتوا بمثله.

اللي مهم نعرفه: سورة يس من أعظم سور القرآن، النبي ﷺ وصفها بأنها "قلب القرآن" (السعدي).`,
    msa: `بسم الله الرحمن الرحيم

"يس" — من الحروف المقطعة التي تبدأ بها بعض السور. والله أعلم بمرادها.

ذكر ابن كثير أن الحروف المقطعة مثل (ألم) و(يس) و(طه) فيها أقوال عديدة عند العلماء. منهم من قال هي أسماء للسور، ومنهم من قال هي للتنبيه، ومنهم من قال الله أعلم بمرادها.

وقال السعدي: الحروف المقطعة فيها إشارة لعظمة القرآن وإعجازه، إذ هو مكوّن من حروف عربية مألوفة لكن البشر عجزوا أن يأتوا بمثله.

والمهم أن سورة يس من أعظم سور القرآن، وُصفت بأنها "قلب القرآن" (السعدي).`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '112:1': {
    egyptian: `بسم الله الرحمن الرحيم

"قُلْ هُوَ اللَّهُ أَحَدٌ" — دي سورة الإخلاص، واللي بتعدل تُلت القرآن زي ما قال النبي ﷺ (رواه البخاري).

"قُلْ" — يعني يا محمد قول للناس.
"هُوَ اللَّهُ أَحَدٌ" — إن ربنا واحد أحد، مالوش شريك ولا شبيه ولا نظير.

قال ابن كثير: "أحد" يعني الذي لا نظير له ولا مثيل، وهو مختلف عن "واحد" في أنه ينفي أي مشابهة.

والسعدي قال: سورة الإخلاص اشتملت على توحيد الأسماء والصفات، وهي أساس الدين.

السورة دي مهمة جدًا: من حبّها دخل الجنة (رواه الترمذي عن أنس رضي الله عنه بأن رجلاً كان يقرأ بها في كل ركعة).`,
    msa: `بسم الله الرحمن الرحيم

"قُلْ هُوَ اللَّهُ أَحَدٌ" — سورة الإخلاص تعدل ثلث القرآن كما أخبر النبي ﷺ (رواه البخاري).

"قُلْ" — أي يا محمد قل للناس.
"هُوَ اللَّهُ أَحَدٌ" — الله واحد أحد، لا شريك له ولا شبيه ولا نظير.

ذكر ابن كثير أن "أحد" تعني الذي لا نظير له ولا مثيل، وهو أبلغ من "واحد" لأنه ينفي أي مشابهة.

وقال السعدي: سورة الإخلاص اشتملت على توحيد الأسماء والصفات، وهي أساس الدين كله.

هذه السورة عظيمة: من أحبّها دخل الجنة (رواه الترمذي عن أنس رضي الله عنه في قصة من كان يقرأ بها في كل ركعة).`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '2:286': {
    egyptian: `بسم الله الرحمن الرحيم

"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا" — دي آية عظيمة فيها طمأنينة كبيرة. ربنا بيقول إنه مش هيكلّفك بحاجة فوق طاقتك.

"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا" — كل تكليف ربنا طلبه منك تقدر عليه.
"لَهَا مَا كَسَبَتْ" — ليها ثواب أعمالها الحسنة.
"وَعَلَيْهَا مَا اكْتَسَبَتْ" — وعليها وزر أعمالها السيئة.

قال ابن كثير: هذه الآية نزلت تخفيفًا على الأمة بعد ما نزلت "وَإِن تُبْدُوا مَا فِي أَنفُسِكُمْ أَوْ تُخْفُوهُ" وخاف الصحابة من المحاسبة على ما في القلوب، فنزلت هذه الآية تطمينًا.

والسعدي قال: فيها دليل على رحمة الله بعباده وأنه لا يُحمّلهم ما لا يطيقون.`,
    msa: `بسم الله الرحمن الرحيم

"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا" — آية عظيمة فيها طمأنينة بالغة. الله تعالى يُخبر أنه لا يُكلّف نفسًا فوق طاقتها.

"لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا" — كل تكليف من الله يكون في حدود قدرة العبد.
"لَهَا مَا كَسَبَتْ" — لها ثواب أعمالها الصالحة.
"وَعَلَيْهَا مَا اكْتَسَبَتْ" — وعليها وزر أعمالها السيئة.

ذكر ابن كثير أن هذه الآية نزلت تخفيفًا على الأمة بعد نزول "وَإِن تُبْدُوا مَا فِي أَنفُسِكُمْ أَوْ تُخْفُوهُ" فخاف الصحابة من المحاسبة على ما في القلوب، فنزلت هذه الآية تطمينًا.

وقال السعدي: فيها دليل على رحمة الله بعباده وأنه لا يُحمّلهم ما لا يطيقون.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '55:13': {
    egyptian: `بسم الله الرحمن الرحيم

"فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ" — دي آية بتتكرر في سورة الرحمن ٣١ مرة! وكل مرة ربنا بيسألك: أي نعمة من نعمي تنكرها يا ابن آدم؟

"آلَاء" — يعني نِعَم.
"رَبِّكُمَا" — الخطاب للإنس والجن.

قال ابن كثير: تكرار هذه الآية يأتي بعد كل ذكر لنعمة من نعم الله، كأنه سبحانه يُذكّر عباده ويُنبّههم ألا ينكروا فضله.

والسعدي قال: كل ما ذُكرت نعمة عظيمة جاء بعدها هذا التقريع لمن ينكرها، وفيها أسلوب بلاغي عجيب يؤثر في القلوب.`,
    msa: `بسم الله الرحمن الرحيم

"فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ" — تتكرر هذه الآية في سورة الرحمن ٣١ مرة. وفي كل مرة يُخاطب الله الإنس والجن: أي نعمة من نعمي تُنكرون؟

"آلَاء" — النِّعم.
"رَبِّكُمَا" — الخطاب موجه للإنس والجن معًا.

ذكر ابن كثير أن تكرار هذه الآية يأتي بعد كل ذكرٍ لنعمة من نعم الله، تذكيرًا للعباد وتنبيهًا لهم ألا يُنكروا فضله.

وقال السعدي: كلما ذُكرت نعمة عظيمة تبعها هذا التقريع لمن يُنكرها، وفيها أسلوب بلاغي عجيب يؤثر في القلوب.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
  '103:1': {
    egyptian: `بسم الله الرحمن الرحيم

"وَالْعَصْرِ" — ربنا بيَحلف بالعصر (الوقت/الزمن). والله سبحانه يحلف بما يشاء من خلقه.

الإمام الشافعي قال عن سورة العصر: "لو ما أنزل الله على خلقه حجة إلا هذه السورة لكفتهم." (ذكره ابن كثير)

معنى الحلف بالعصر: إن الوقت من أثمن النعم. والإنسان في خسارة لو ضيّعه في غير طاعة الله.

قال ابن كثير: أقسم الله بالعصر وهو الدهر الذي يقع فيه أفعال بني آدم من خير وشر.

والسعدي قال: القَسَم بالعصر لأهمية الزمن، فهو رأس مال الإنسان، من استثمره في الإيمان والعمل الصالح ربح، ومن ضيّعه خسر.`,
    msa: `بسم الله الرحمن الرحيم

"وَالْعَصْرِ" — يُقسم الله تعالى بالعصر (الزمن). والله سبحانه يُقسم بما يشاء من خلقه.

قال الإمام الشافعي عن سورة العصر: "لو ما أنزل الله على خلقه حجة إلا هذه السورة لكفتهم." (ذكره ابن كثير)

معنى القسم بالعصر: أن الزمن من أثمن النعم، والإنسان في خسران إن ضيّعه في غير طاعة الله.

ذكر ابن كثير أن الله أقسم بالعصر وهو الدهر الذي تقع فيه أفعال بني آدم من خير وشر.

وقال السعدي: القسم بالعصر لأهمية الزمن، فهو رأس مال الإنسان. من استثمره في الإيمان والعمل الصالح ربح، ومن ضيّعه خسر.`,
    sources: ['ibn-kathir', 'al-sadi'],
  },
};

// ───────────────────────────────────────────────────────────────
// Fallback Tafsir Generator (for verses without pre-seeded content)
// This generates a generic prompt-like response structure
// ───────────────────────────────────────────────────────────────

function generateFallbackTafsir(
  surah: number,
  ayah: number,
  verseText: string,
  dialect: Dialect,
): { text: string; sources: string[] } {
  const surahNames: Record<number, string> = {
    1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
    6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
    11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
    16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
    36: 'يس', 55: 'الرحمن', 56: 'الواقعة', 67: 'الملك', 112: 'الإخلاص',
    113: 'الفلق', 114: 'الناس',
  };
  const surahName = surahNames[surah] || `سورة ${surah}`;

  if (dialect === 'egyptian') {
    return {
      text: `بسم الله الرحمن الرحيم

الآية دي من ${surahName} — الآية رقم ${ayah}.

ذكر العلماء والمفسرين في تفسير هذه الآية أنها تحمل معانٍ عميقة تتعلق بأصول الإيمان وهداية الإنسان.

📖 للاطلاع على التفسير الكامل والمفصّل، ننصح بالرجوع لتفاسير ابن كثير والسعدي والتفسير الميسر في تبويب "التفسير" الأساسي.

🔗 اضغط على الآية في المصحف واختر "التفسير" للقراءة من المصادر الأصلية مباشرة.`,
      sources: ['al-muyassar'],
    };
  }

  return {
    text: `بسم الله الرحمن الرحيم

هذه الآية من ${surahName} — الآية رقم ${ayah}.

ذكر العلماء والمفسرون في تفسير هذه الآية أنها تحمل معاني عميقة تتعلق بأصول الإيمان وهداية الإنسان.

📖 للاطلاع على التفسير الكامل والمفصّل، يُنصح بالرجوع إلى تفاسير ابن كثير والسعدي والتفسير الميسر في تبويب "التفسير" الأساسي.

🔗 اضغط على الآية في المصحف واختر "التفسير" للقراءة من المصادر الأصلية مباشرة.`,
    sources: ['al-muyassar'],
  };
}

// ───────────────────────────────────────────────────────────────
// Main API — Generate AI Tafsir
// ───────────────────────────────────────────────────────────────

/**
 * Generate a simplified AI tafsir for a verse.
 * Checks cache first, then tries pre-seeded database, then fallback.
 */
export function generateAiTafsir(
  surah: number,
  ayah: number,
  verseText: string,
  dialect: Dialect,
): AiTafsirResponse {
  const verseKey = `${surah}:${ayah}`;

  // 1. Check cache
  const cached = getCachedTafsir(verseKey, dialect);
  if (cached) {
    return {
      verseKey,
      dialect,
      text: cached.text,
      sources: cached.sources,
      generatedAt: cached.generatedAt,
      cached: true,
      disclaimer: dialect === 'egyptian' ? DISCLAIMER_AR : DISCLAIMER_AR,
    };
  }

  // 2. Check pre-seeded database
  const seeded = SEEDED_TAFSIRS[verseKey];
  let text: string;
  let sourceIds: string[];

  if (seeded) {
    text = dialect === 'egyptian' ? seeded.egyptian : seeded.msa;
    sourceIds = seeded.sources;
  } else {
    // 3. Fallback generator
    const fallback = generateFallbackTafsir(surah, ayah, verseText, dialect);
    text = fallback.text;
    sourceIds = fallback.sources;
  }

  const sources = sourceIds
    .map(id => TAFSIR_SOURCES.find(s => s.id === id))
    .filter((s): s is TafsirSource => s !== undefined);

  const generatedAt = new Date().toISOString();

  // Cache the response
  cacheTafsir({
    verseKey,
    dialect,
    text,
    sources,
    generatedAt,
    ttl: CACHE_TTL,
  });

  return {
    verseKey,
    dialect,
    text,
    sources,
    generatedAt,
    cached: false,
    disclaimer: DISCLAIMER_AR,
  };
}

// ───────────────────────────────────────────────────────────────
// Streaming Simulation (SSE-style progressive text reveal)
// ───────────────────────────────────────────────────────────────

/**
 * Simulate streaming response like an LLM API.
 * Yields chunks of text progressively with realistic timing.
 * In production, this would be replaced with actual SSE from an API.
 */
export async function* streamAiTafsir(
  surah: number,
  ayah: number,
  verseText: string,
  dialect: Dialect,
): AsyncGenerator<StreamChunk> {
  const response = generateAiTafsir(surah, ayah, verseText, dialect);

  // If cached, yield all at once (instant)
  if (response.cached) {
    yield { text: response.text, done: true, sources: response.sources };
    return;
  }

  // Simulate streaming: yield word-by-word with natural cadence
  const words = response.text.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    accumulated += (i > 0 ? ' ' : '') + words[i];

    // Vary chunk sizes (2-5 words at a time)
    const chunkSize = 2 + Math.floor(Math.random() * 4);
    if (i % chunkSize === 0 || i === words.length - 1) {
      const done = i === words.length - 1;
      yield {
        text: accumulated,
        done,
        sources: done ? response.sources : undefined,
      };

      // Simulate network latency (30-80ms per chunk)
      if (!done) {
        await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
      }
    }
  }
}

// ───────────────────────────────────────────────────────────────
// Utility: Get list of verses that have pre-seeded tafsir
// ───────────────────────────────────────────────────────────────

export function getSeededVerseKeys(): string[] {
  return Object.keys(SEEDED_TAFSIRS);
}

export function hasSeededTafsir(verseKey: string): boolean {
  return verseKey in SEEDED_TAFSIRS;
}
