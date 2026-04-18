'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type Lang = 'ar' | 'en';

const translations = {
  // TopBar
  appTitle: { ar: 'المصحف المفهرس بالمواضيع', en: 'Al-Mushaf Al-Mufahras' },
  tabMushaf: { ar: 'المصحف', en: 'Mushaf' },
  tabIndex: { ar: 'الفهرس', en: 'Index' },
  tabSearch: { ar: 'البحث', en: 'Search' },
  tabTopics: { ar: 'المواضيع', en: 'Topics' },
  tabBookmarks: { ar: 'المفضلة', en: 'Bookmarks' },
  tabStats: { ar: 'الإحصائيات', en: 'Stats' },
  tabTafsir: { ar: 'التفسير', en: 'Tafsir' },
  tabQuiz: { ar: 'الحفظ', en: 'Quiz' },
  tabQiraat: { ar: 'القراءات', en: "Qira'at" },
  tabHijri: { ar: 'التقويم الهجري', en: 'Hijri Calendar' },
  tabVoice: { ar: 'البحث الصوتي', en: 'Voice Search' },
  tabKids: { ar: 'وضع الأطفال', en: 'Kids Mode' },
  tabA11y: { ar: 'إمكانية الوصول', en: 'Accessibility' },
  tabKhatma: { ar: 'خطة الختمة', en: 'Khatma Plan' },
  tabReflections: { ar: 'تأملات وملاحظات', en: 'Reflections & Notes' },
  tabMultiplayerQuiz: { ar: 'مسابقة جماعية', en: 'Multiplayer Quiz' },
  tabAiTafsir: { ar: 'اشرحلي ببساطة', en: 'AI Tafsir' },
  tabQuranMap: { ar: 'خريطة الأماكن القرآنية', en: 'Quran Places Map' },
  tabPublicApi: { ar: 'API المواضيع المفتوح', en: 'Public Topics API' },
  tabAdmin: { ar: 'الإدارة', en: 'Admin' },

  // Navigation
  prevPage: { ar: '← الصفحة السابقة', en: '← Previous Page' },
  nextPage: { ar: 'الصفحة التالية →', en: 'Next Page →' },
  page: { ar: 'صفحة', en: 'Page' },
  loading: { ar: 'جارٍ التحميل...', en: 'Loading...' },
  noVerses: { ar: 'لا توجد آيات في هذه الصفحة', en: 'No verses on this page' },
  surah: { ar: 'سورة', en: 'Surah' },
  ayah: { ar: 'آية', en: 'verse' },

  // Sidebar
  menu: { ar: 'القائمة', en: 'Menu' },
  filterByTopic: { ar: 'تصفية حسب الموضوع', en: 'Filter by Topic' },
  removeFilter: { ar: 'إزالة التصفية', en: 'Remove Filter' },
  surahIndex: { ar: 'فهرس السور', en: 'Surah Index' },
  searchQuran: { ar: 'البحث في القرآن', en: 'Search in Quran' },
  searchPlaceholder: { ar: 'ابحث عن كلمة أو آية...', en: 'Search for a word or verse...' },
  searchBtn: { ar: 'بحث', en: 'Search' },
  first100: { ar: 'عرض أول 100 نتيجة', en: 'Showing first 100 results' },

  // Dark mode
  themeSystem: { ar: 'تلقائي', en: 'Auto' },
  themeDark: { ar: 'داكن', en: 'Dark' },
  themeLight: { ar: 'فاتح', en: 'Light' },

  // Topic summary
  topicSummary: { ar: 'مواضيع الصفحة', en: 'Page Topics' },

  // Topics index
  topicsDirectory: { ar: 'دليل المواضيع', en: 'Topics Directory' },
  verses: { ar: 'آية', en: 'verses' },
  viewAll: { ar: 'عرض الكل', en: 'View All' },
  ofQuran: { ar: 'من القرآن', en: 'of Quran' },

  // Bookmarks
  bookmarks: { ar: 'المفضلة', en: 'Bookmarks' },
  addBookmark: { ar: 'إضافة للمفضلة', en: 'Bookmark' },
  removeBookmark: { ar: 'إزالة من المفضلة', en: 'Remove' },
  noBookmarks: { ar: 'لا توجد مفضلات بعد', en: 'No bookmarks yet' },
  clearBookmarks: { ar: 'مسح الكل', en: 'Clear All' },

  // Reading stats
  readingStats: { ar: 'إحصائيات القراءة', en: 'Reading Statistics' },
  pagesRead: { ar: 'صفحات مقروءة', en: 'Pages Read' },
  todayReading: { ar: 'اليوم', en: 'Today' },
  streak: { ar: 'أيام متتالية', en: 'Day Streak' },
  progress: { ar: 'التقدم', en: 'Progress' },

  // Audio
  playVerse: { ar: 'تشغيل الآية', en: 'Play verse' },
  playPage: { ar: 'تشغيل الصفحة', en: 'Play page' },
  stopAudio: { ar: 'إيقاف', en: 'Stop' },
  nowPlaying: { ar: 'يتم الآن تشغيل', en: 'Now playing' },

  tafsirComparison: { ar: 'مقارنة التفاسير', en: 'Tafsir Comparison' },
  selectVerse: { ar: 'اضغط على آية لعرض تفسيرها', en: 'Click a verse to view its tafsir' },

  // Advanced search
  searchByTopic: { ar: 'بحث بالموضوع', en: 'Search by Topic' },
  allTopics: { ar: 'كل المواضيع', en: 'All Topics' },
  noResults: { ar: 'لا توجد نتائج', en: 'No results found' },

  // Topics
  topic1: { ar: 'دلائل قدرة الله وعظمته', en: "Signs of Allah's Power & Greatness" },
  topic2: { ar: 'السيرة النبوية، صفات المؤمنين، الجنة', en: 'Seerah, Believers, Paradise' },
  topic3: { ar: 'آيات الأحكام والفقه', en: 'Rulings & Jurisprudence (Fiqh)' },
  topic4: { ar: 'قصص الأنبياء والأمم السابقة', en: 'Stories of Prophets & Past Nations' },
  topic5: { ar: 'مكانة القرآن ورد الشبهات', en: 'Status of Quran & Refuting Doubts' },
  topic6: { ar: 'اليوم الآخر، الموت، البعث، الحساب', en: 'Afterlife, Death, Resurrection, Judgment' },
  topic7: { ar: 'أوصاف النار وعذاب الكافرين', en: 'Hellfire & Punishment of Disbelievers' },
} as const;

export type TransKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TransKey) => string;
  isRtl: boolean;
  topicName: (topicId: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);

  const t = useCallback((key: TransKey): string => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  const topicName = useCallback((topicId: number): string => {
    const key = `topic${topicId}` as TransKey;
    return translations[key]?.[lang] || '';
  }, [lang]);

  const isRtl = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t, isRtl, topicName }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
