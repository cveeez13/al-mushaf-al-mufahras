/**
 * Quran Mushaf Styles — 17+ Different Print Designs
 *
 * Supported Mushaf Types:
 * - Madani (King Fahd, Saudi Arabia)
 * - Uthmani (Ottoman script)
 * - Hafs (Egyptian)
 * - Warsh (North African)
 * - Qaloon (North African)
 * - Doori (East African)
 * - Soosi (East African)
 * - Kisai (Traditional)
 * - Abu Amr (Traditional)
 * - Hisham (Traditional)
 * - Ibn Aamir (Levantine)
 * - Asim (Major tradition)
 * - Nafi (Medina school)
 * - Colored (Rainbow Quran)
 * - Minimal (Modern)
 * - Classic (Vintage book style)
 * - Digital (Contemporary)
 */

export type MushafType =
  | 'madani'
  | 'uthmani'
  | 'hafs'
  | 'warsh'
  | 'qaloon'
  | 'doori'
  | 'soosi'
  | 'kisai'
  | 'abu-amr'
  | 'hisham'
  | 'ibn-aamir'
  | 'asim'
  | 'nafi'
  | 'colored'
  | 'minimal'
  | 'classic'
  | 'digital';

export interface MushafStyle {
  id: MushafType;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  font: string; // Font stack
  fontFile?: string; // Optional custom font file
  fontSize: {
    base: number; // pixels
    verse: number;
    number: number;
  };
  padding: {
    page: number;
    column: number;
    line: number;
  };
  spacing: {
    lineHeight: number; // multiplier
    wordSpacing: number; // pixels
    letterSpacing: number; // pixels
  };
  colors: {
    text: string; // Hex
    background: string;
    border: string;
    pageNumber: string;
    verseNumber: string;
    watermark: string;
  };
  layout: {
    columns: number; // 1 or 2
    verseNumber: 'above' | 'below' | 'inline' | 'margin';
    frameVerse: boolean; // Border around verse number
    separators: boolean; // Line separators between verses
    watermark: boolean;
    pageHeader: boolean;
    surahName: boolean;
  };
  features: {
    hasPrecision: boolean; // High detail reproduction
    handwritten: boolean; // Mimics hand-calligraphy
    modern: boolean; // Contemporary design
    colored: boolean; // Multi-color support
    minimalist: boolean; // Sparse design
  };
  paper: {
    color: string; // Hex or 'cream' | 'white' | 'sepia'
    texture?: 'smooth' | 'aged' | 'linen';
    shadow: boolean; // Drop shadow on page
  };
  pageSize: {
    width: number; // pixels (base)
    height: number;
    aspectRatio: number; // width:height
  };
}

/**
 * 17+ Mushaf Style Definitions
 */
export const MUSHAF_STYLES: Record<MushafType, MushafStyle> = {
  // ═════════════════════════════════════════════════════════════
  // TRADITIONAL SCHOOLS
  // ═════════════════════════════════════════════════════════════

  madani: {
    id: 'madani',
    name_ar: 'المصحف المدني',
    name_en: 'Madani Mushaf',
    description_ar: 'أسلوب مصحف المدينة النبوية من طباعة الملك فهد',
    description_en: 'King Fahd Printing of the Quran - Madina style',
    icon: '📖',
    font: '"Traditional Arabic", "Scheherazade", serif',
    fontSize: { base: 24, verse: 20, number: 14 },
    padding: { page: 32, column: 24, line: 8 },
    spacing: { lineHeight: 2.2, wordSpacing: 6, letterSpacing: 1 },
    colors: {
      text: '#1a1a1a',
      background: '#f5f5dc',
      border: '#3d3d3d',
      pageNumber: '#3d3d3d',
      verseNumber: '#333333',
      watermark: '#e0e0e0',
    },
    layout: {
      columns: 2,
      verseNumber: 'above',
      frameVerse: true,
      separators: true,
      watermark: true,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: {
      color: '#f5f5dc',
      texture: 'linen',
      shadow: true,
    },
    pageSize: { width: 280, height: 400, aspectRatio: 0.7 },
  },

  uthmani: {
    id: 'uthmani',
    name_ar: 'الخط العثماني',
    name_en: 'Uthmani Script',
    description_ar: 'الخط الكلاسيكي العثماني التاريخي',
    description_en: 'Historical Ottoman calligraphic script',
    icon: '✍️',
    font: '"Uthmani", "Traditional Arabic", serif',
    fontSize: { base: 26, verse: 22, number: 16 },
    padding: { page: 28, column: 20, line: 6 },
    spacing: { lineHeight: 2.4, wordSpacing: 8, letterSpacing: 2 },
    colors: {
      text: '#2c1810',
      background: '#f9f6f0',
      border: '#5c4033',
      pageNumber: '#5c4033',
      verseNumber: '#3d2817',
      watermark: '#ede7e1',
    },
    layout: {
      columns: 1,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: true,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: true,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f9f6f0', texture: 'aged', shadow: true },
    pageSize: { width: 260, height: 380, aspectRatio: 0.68 },
  },

  hafs: {
    id: 'hafs',
    name_ar: 'رواية حفص',
    name_en: 'Hafs Narration',
    description_ar: 'رواية حفص عن عاصم - الأكثر انتشاراً',
    description_en: 'Most widely used Quranic recitation - Hafs from Asim',
    icon: '📚',
    font: '"Hafs Font", "Traditional Arabic", serif',
    fontSize: { base: 22, verse: 18, number: 12 },
    padding: { page: 30, column: 22, line: 7 },
    spacing: { lineHeight: 2.1, wordSpacing: 5, letterSpacing: 0.5 },
    colors: {
      text: '#1a1a1a',
      background: '#fffef8',
      border: '#333',
      pageNumber: '#555',
      verseNumber: '#333',
      watermark: '#f0f0f0',
    },
    layout: {
      columns: 2,
      verseNumber: 'inline',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#fffef8', texture: 'smooth', shadow: false },
    pageSize: { width: 300, height: 420, aspectRatio: 0.71 },
  },

  warsh: {
    id: 'warsh',
    name_ar: 'رواية ورش',
    name_en: 'Warsh Narration',
    description_ar: 'رواية ورش عن نافع - شائعة في شمال أفريقيا',
    description_en: 'Warsh narration - Common in North Africa',
    icon: '📖',
    font: '"Warsh Font", "Traditional Arabic", serif',
    fontSize: { base: 20, verse: 17, number: 11 },
    padding: { page: 28, column: 20, line: 6 },
    spacing: { lineHeight: 2.0, wordSpacing: 4, letterSpacing: 0 },
    colors: {
      text: '#1f1f1f',
      background: '#faf8f3',
      border: '#3a3a3a',
      pageNumber: '#4a4a4a',
      verseNumber: '#2a2a2a',
      watermark: '#e8e8e8',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#faf8f3', texture: 'smooth', shadow: true },
    pageSize: { width: 280, height: 400, aspectRatio: 0.7 },
  },

  qaloon: {
    id: 'qaloon',
    name_ar: 'رواية قالون',
    name_en: 'Qaloon Narration',
    description_ar: 'رواية قالون عن نافع - مشهورة بالمغرب',
    description_en: 'Qaloon from Nafi - Famous in Maghreb',
    icon: '📕',
    font: '"Qaloon Font", "Traditional Arabic", serif',
    fontSize: { base: 21, verse: 18, number: 12 },
    padding: { page: 29, column: 21, line: 7 },
    spacing: { lineHeight: 2.05, wordSpacing: 5, letterSpacing: 0.5 },
    colors: {
      text: '#1b1b1b',
      background: '#f8f6f1',
      border: '#3b3b3b',
      pageNumber: '#4b4b4b',
      verseNumber: '#2b2b2b',
      watermark: '#e5e5e5',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f8f6f1', texture: 'linen', shadow: true },
    pageSize: { width: 275, height: 395, aspectRatio: 0.7 },
  },

  // ═════════════════════════════════════════════════════════════
  // REGIONAL TRADITIONS
  // ═════════════════════════════════════════════════════════════

  doori: {
    id: 'doori',
    name_ar: 'رواية الدوري',
    name_en: 'Doori Narration',
    description_ar: 'رواية الدوري عن أبي عمرو - شرق أفريقيا',
    description_en: 'Doori from Abu Amr - East African tradition',
    icon: '📗',
    font: '"Doori Font", "Traditional Arabic", serif',
    fontSize: { base: 20, verse: 17, number: 11 },
    padding: { page: 27, column: 19, line: 6 },
    spacing: { lineHeight: 1.95, wordSpacing: 4, letterSpacing: 0 },
    colors: {
      text: '#1a1a1a',
      background: '#f7f5f0',
      border: '#3a3a3a',
      pageNumber: '#4a4a4a',
      verseNumber: '#2a2a2a',
      watermark: '#e0e0e0',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f7f5f0', texture: 'smooth', shadow: true },
    pageSize: { width: 270, height: 390, aspectRatio: 0.69 },
  },

  soosi: {
    id: 'soosi',
    name_ar: 'رواية السوسي',
    name_en: 'Soosi Narration',
    description_ar: 'رواية السوسي عن أبي عمرو',
    description_en: 'Soosi from Abu Amr',
    icon: '📔',
    font: '"Soosi Font", "Traditional Arabic", serif',
    fontSize: { base: 19, verse: 16, number: 11 },
    padding: { page: 26, column: 18, line: 6 },
    spacing: { lineHeight: 1.9, wordSpacing: 3, letterSpacing: 0 },
    colors: {
      text: '#1a1a1a',
      background: '#f6f4ef',
      border: '#3a3a3a',
      pageNumber: '#4a4a4a',
      verseNumber: '#2a2a2a',
      watermark: '#dcdcdc',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f6f4ef', texture: 'smooth', shadow: true },
    pageSize: { width: 265, height: 385, aspectRatio: 0.69 },
  },

  // ═════════════════════════════════════════════════════════════
  // HISTORICAL SCHOOLS
  // ═════════════════════════════════════════════════════════════

  kisai: {
    id: 'kisai',
    name_ar: 'الكسائي',
    name_en: 'Kisai School',
    description_ar: 'مدرسة الكسائي التاريخية',
    description_en: 'Historical Kisai school of Quranic reading',
    icon: '📚',
    font: '"Kisai Font", "Traditional Arabic", serif',
    fontSize: { base: 18, verse: 15, number: 10 },
    padding: { page: 25, column: 17, line: 5 },
    spacing: { lineHeight: 1.85, wordSpacing: 3, letterSpacing: -0.5 },
    colors: {
      text: '#2a2a2a',
      background: '#f4f2ed',
      border: '#4a4a4a',
      pageNumber: '#5a5a5a',
      verseNumber: '#3a3a3a',
      watermark: '#d8d8d8',
    },
    layout: {
      columns: 1,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f4f2ed', texture: 'aged', shadow: true },
    pageSize: { width: 240, height: 360, aspectRatio: 0.67 },
  },

  'abu-amr': {
    id: 'abu-amr',
    name_ar: 'أبو عمرو',
    name_en: 'Abu Amr School',
    description_ar: 'مدرسة أبي عمرو البصري',
    description_en: 'Abu Amr al-Basri school',
    icon: '📕',
    font: '"Abu Amr Font", "Traditional Arabic", serif',
    fontSize: { base: 19, verse: 16, number: 11 },
    padding: { page: 26, column: 18, line: 6 },
    spacing: { lineHeight: 1.9, wordSpacing: 3, letterSpacing: -0.25 },
    colors: {
      text: '#2b2b2b',
      background: '#f3f1ec',
      border: '#4b4b4b',
      pageNumber: '#5b5b5b',
      verseNumber: '#3b3b3b',
      watermark: '#d5d5d5',
    },
    layout: {
      columns: 1,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f3f1ec', texture: 'aged', shadow: true },
    pageSize: { width: 250, height: 370, aspectRatio: 0.68 },
  },

  hisham: {
    id: 'hisham',
    name_ar: 'هشام',
    name_en: 'Hisham School',
    description_ar: 'مدرسة هشام بن عمار الدمشقي',
    description_en: 'Hisham ibn Ammar school',
    icon: '📖',
    font: '"Hisham Font", "Traditional Arabic", serif',
    fontSize: { base: 20, verse: 17, number: 12 },
    padding: { page: 27, column: 19, line: 6 },
    spacing: { lineHeight: 1.95, wordSpacing: 4, letterSpacing: 0 },
    colors: {
      text: '#2c2c2c',
      background: '#f2f0eb',
      border: '#4c4c4c',
      pageNumber: '#5c5c5c',
      verseNumber: '#3c3c3c',
      watermark: '#d2d2d2',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f2f0eb', texture: 'aged', shadow: true },
    pageSize: { width: 260, height: 380, aspectRatio: 0.68 },
  },

  'ibn-aamir': {
    id: 'ibn-aamir',
    name_ar: 'ابن عامر',
    name_en: 'Ibn Aamir School',
    description_ar: 'مدرسة عبدالله بن عامر الشامي',
    description_en: 'Ibn Aamir al-Shami school',
    icon: '📗',
    font: '"Ibn Aamir Font", "Traditional Arabic", serif',
    fontSize: { base: 21, verse: 18, number: 12 },
    padding: { page: 28, column: 20, line: 7 },
    spacing: { lineHeight: 2.0, wordSpacing: 4, letterSpacing: 0.25 },
    colors: {
      text: '#2d2d2d',
      background: '#f1efea',
      border: '#4d4d4d',
      pageNumber: '#5d5d5d',
      verseNumber: '#3d3d3d',
      watermark: '#cfcfcf',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f1efea', texture: 'aged', shadow: true },
    pageSize: { width: 270, height: 390, aspectRatio: 0.69 },
  },

  asim: {
    id: 'asim',
    name_ar: 'عاصم',
    name_en: 'Asim School',
    description_ar: 'مدرسة عاصم بن أبي النجود',
    description_en: 'Asim ibn Abi al-Najud school',
    icon: '📘',
    font: '"Asim Font", "Traditional Arabic", serif',
    fontSize: { base: 22, verse: 19, number: 13 },
    padding: { page: 29, column: 21, line: 7 },
    spacing: { lineHeight: 2.05, wordSpacing: 5, letterSpacing: 0.5 },
    colors: {
      text: '#2e2e2e',
      background: '#f0eee9',
      border: '#4e4e4e',
      pageNumber: '#5e5e5e',
      verseNumber: '#3e3e3e',
      watermark: '#cccccc',
    },
    layout: {
      columns: 2,
      verseNumber: 'margin',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f0eee9', texture: 'aged', shadow: true },
    pageSize: { width: 280, height: 400, aspectRatio: 0.7 },
  },

  nafi: {
    id: 'nafi',
    name_ar: 'نافع',
    name_en: 'Nafi School',
    description_ar: 'مدرسة نافع المدني',
    description_en: 'Nafi al-Madani school',
    icon: '📙',
    font: '"Nafi Font", "Traditional Arabic", serif',
    fontSize: { base: 23, verse: 20, number: 14 },
    padding: { page: 30, column: 22, line: 8 },
    spacing: { lineHeight: 2.1, wordSpacing: 5, letterSpacing: 0.75 },
    colors: {
      text: '#2f2f2f',
      background: '#efedeb',
      border: '#4f4f4f',
      pageNumber: '#5f5f5f',
      verseNumber: '#3f3f3f',
      watermark: '#c9c9c9',
    },
    layout: {
      columns: 2,
      verseNumber: 'above',
      frameVerse: true,
      separators: true,
      watermark: true,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#efedeb', texture: 'linen', shadow: true },
    pageSize: { width: 290, height: 410, aspectRatio: 0.71 },
  },

  // ═════════════════════════════════════════════════════════════
  // MODERN DESIGNS
  // ═════════════════════════════════════════════════════════════

  colored: {
    id: 'colored',
    name_ar: 'ملون (قوس قزح)',
    name_en: 'Colored / Rainbow',
    description_ar: 'مصحف ملون بألوان الموضوعات والأماكن',
    description_en: 'Rainbow Quran with topic/place colors',
    icon: '🌈',
    font: '"Scheherazade", "Traditional Arabic", serif',
    fontSize: { base: 20, verse: 17, number: 12 },
    padding: { page: 28, column: 20, line: 7 },
    spacing: { lineHeight: 2.1, wordSpacing: 5, letterSpacing: 0.5 },
    colors: {
      text: '#1a1a1a',
      background: '#ffffff',
      border: '#cccccc',
      pageNumber: '#666666',
      verseNumber: '#3333cc',
      watermark: '#f5f5f5',
    },
    layout: {
      columns: 2,
      verseNumber: 'above',
      frameVerse: true,
      separators: true,
      watermark: false,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: true,
      handwritten: false,
      modern: true,
      colored: true,
      minimalist: false,
    },
    paper: { color: '#ffffff', texture: 'smooth', shadow: false },
    pageSize: { width: 300, height: 420, aspectRatio: 0.71 },
  },

  minimal: {
    id: 'minimal',
    name_ar: 'بسيط حديث',
    name_en: 'Minimal Modern',
    description_ar: 'تصميم بسيط وحديث',
    description_en: 'Clean, contemporary minimal design',
    icon: '✨',
    font: '"Scheherazade", "Traditional Arabic", sans-serif',
    fontSize: { base: 18, verse: 15, number: 10 },
    padding: { page: 24, column: 16, line: 5 },
    spacing: { lineHeight: 1.8, wordSpacing: 3, letterSpacing: 0 },
    colors: {
      text: '#333333',
      background: '#ffffff',
      border: '#dddddd',
      pageNumber: '#999999',
      verseNumber: '#666666',
      watermark: '#f9f9f9',
    },
    layout: {
      columns: 1,
      verseNumber: 'inline',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: true,
      colored: false,
      minimalist: true,
    },
    paper: { color: '#ffffff', texture: 'smooth', shadow: false },
    pageSize: { width: 240, height: 360, aspectRatio: 0.67 },
  },

  classic: {
    id: 'classic',
    name_ar: 'كلاسيكي عتيق',
    name_en: 'Classic Vintage',
    description_ar: 'مظهر كتاب عتيق قديم',
    description_en: 'Vintage book aesthetic',
    icon: '📕',
    font: '"Amiri", "Traditional Arabic", serif',
    fontSize: { base: 19, verse: 16, number: 11 },
    padding: { page: 32, column: 24, line: 8 },
    spacing: { lineHeight: 2.15, wordSpacing: 6, letterSpacing: 1 },
    colors: {
      text: '#3d2817',
      background: '#e8dcc8',
      border: '#8b7355',
      pageNumber: '#5c4033',
      verseNumber: '#6d4c41',
      watermark: '#d4c5b9',
    },
    layout: {
      columns: 1,
      verseNumber: 'margin',
      frameVerse: false,
      separators: true,
      watermark: true,
      pageHeader: true,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: true,
      modern: false,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#e8dcc8', texture: 'aged', shadow: true },
    pageSize: { width: 260, height: 400, aspectRatio: 0.65 },
  },

  digital: {
    id: 'digital',
    name_ar: 'حديث رقمي',
    name_en: 'Digital Modern',
    description_ar: 'تصميم رقمي معاصر بدون محاكاة الطباعة',
    description_en: 'Contemporary digital design',
    icon: '💻',
    font: '"Scheherazade New", "Traditional Arabic", sans-serif',
    fontSize: { base: 20, verse: 17, number: 11 },
    padding: { page: 20, column: 16, line: 5 },
    spacing: { lineHeight: 1.9, wordSpacing: 4, letterSpacing: 0 },
    colors: {
      text: '#1a1a1a',
      background: '#f8f8f8',
      border: '#e0e0e0',
      pageNumber: '#666666',
      verseNumber: '#0066cc',
      watermark: '#f0f0f0',
    },
    layout: {
      columns: 1,
      verseNumber: 'inline',
      frameVerse: false,
      separators: false,
      watermark: false,
      pageHeader: false,
      surahName: true,
    },
    features: {
      hasPrecision: false,
      handwritten: false,
      modern: true,
      colored: false,
      minimalist: false,
    },
    paper: { color: '#f8f8f8', texture: 'smooth', shadow: false },
    pageSize: { width: 320, height: 480, aspectRatio: 0.67 },
  },
};

/**
 * Get Mushaf style by type
 */
export function getMushafStyle(type: MushafType): MushafStyle {
  return MUSHAF_STYLES[type] || MUSHAF_STYLES.madani;
}

/**
 * Get all available Mushaf types
 */
export function getAllMushafTypes(): MushafType[] {
  return Object.keys(MUSHAF_STYLES) as MushafType[];
}

/**
 * Get Mushaf types by category
 */
export function getMushafTypesByCategory(
  category: 'traditional' | 'regional' | 'historical' | 'modern'
): MushafType[] {
  const map = {
    traditional: ['madani', 'uthmani', 'hafs', 'warsh', 'qaloon'],
    regional: ['doori', 'soosi'],
    historical: ['kisai', 'abu-amr', 'hisham', 'ibn-aamir', 'asim', 'nafi'],
    modern: ['colored', 'minimal', 'classic', 'digital'],
  };
  return map[category] as MushafType[];
}

/**
 * Find Mushaf types by feature
 */
export function findMushafByFeature(
  feature: keyof MushafStyle['features']
): MushafStyle[] {
  return Object.values(MUSHAF_STYLES).filter(
    s => s.features[feature] === true
  );
}
