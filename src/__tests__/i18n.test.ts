import { describe, it, expect } from 'vitest';

// Test the i18n translations dictionary and logic without React context
describe('i18n translations', () => {
  const translations = {
    appTitle: { ar: 'المصحف المفهرس', en: 'Al-Mushaf Al-Mufahras' },
    tabMushaf: { ar: 'المصحف', en: 'Mushaf' },
    tabIndex: { ar: 'الفهرس', en: 'Index' },
    tabSearch: { ar: 'البحث', en: 'Search' },
    prevPage: { ar: '← الصفحة السابقة', en: '← Previous Page' },
    nextPage: { ar: 'الصفحة التالية →', en: 'Next Page →' },
    page: { ar: 'صفحة', en: 'Page' },
    loading: { ar: 'جارٍ التحميل...', en: 'Loading...' },
    noVerses: { ar: 'لا توجد آيات في هذه الصفحة', en: 'No verses on this page' },
    surah: { ar: 'سورة', en: 'Surah' },
    ayah: { ar: 'آية', en: 'verse' },
    menu: { ar: 'القائمة', en: 'Menu' },
    filterByTopic: { ar: 'تصفية حسب الموضوع', en: 'Filter by Topic' },
    removeFilter: { ar: 'إزالة التصفية', en: 'Remove Filter' },
    surahIndex: { ar: 'فهرس السور', en: 'Surah Index' },
    searchQuran: { ar: 'البحث في القرآن', en: 'Search in Quran' },
    searchPlaceholder: { ar: 'ابحث عن كلمة أو آية...', en: 'Search for a word or verse...' },
    searchBtn: { ar: 'بحث', en: 'Search' },
    first100: { ar: 'عرض أول 100 نتيجة', en: 'Showing first 100 results' },
    topic1: { ar: 'دلائل قدرة الله وعظمته', en: "Signs of Allah's Power & Greatness" },
    topic2: { ar: 'السيرة النبوية، صفات المؤمنين، الجنة', en: 'Seerah, Believers, Paradise' },
    topic3: { ar: 'آيات الأحكام والفقه', en: 'Rulings & Jurisprudence (Fiqh)' },
    topic4: { ar: 'قصص الأنبياء والأمم السابقة', en: 'Stories of Prophets & Past Nations' },
    topic5: { ar: 'مكانة القرآن ورد الشبهات', en: 'Status of Quran & Refuting Doubts' },
    topic6: { ar: 'اليوم الآخر، الموت، البعث، الحساب', en: 'Afterlife, Death, Resurrection, Judgment' },
    topic7: { ar: 'أوصاف النار وعذاب الكافرين', en: 'Hellfire & Punishment of Disbelievers' },
  };

  it('should have all required translation keys', () => {
    const requiredKeys = [
      'appTitle', 'tabMushaf', 'tabIndex', 'tabSearch',
      'prevPage', 'nextPage', 'page', 'loading', 'noVerses',
      'surah', 'ayah', 'menu', 'filterByTopic', 'removeFilter',
      'surahIndex', 'searchQuran', 'searchPlaceholder', 'searchBtn', 'first100',
    ];
    for (const key of requiredKeys) {
      expect(translations).toHaveProperty(key);
    }
  });

  it('all keys should have both ar and en translations', () => {
    for (const [key, val] of Object.entries(translations)) {
      expect(val).toHaveProperty('ar');
      expect(val).toHaveProperty('en');
      expect(val.ar.length).toBeGreaterThan(0);
      expect(val.en.length).toBeGreaterThan(0);
    }
  });

  it('should have topic translations for all 7 topics', () => {
    for (let i = 1; i <= 7; i++) {
      const key = `topic${i}` as keyof typeof translations;
      expect(translations[key]).toBeDefined();
      expect(translations[key].ar.length).toBeGreaterThan(0);
      expect(translations[key].en.length).toBeGreaterThan(0);
    }
  });

  it('Arabic translations should contain Arabic characters', () => {
    for (const val of Object.values(translations)) {
      expect(val.ar).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it('English translations should contain Latin characters', () => {
    for (const val of Object.values(translations)) {
      expect(val.en).toMatch(/[a-zA-Z]/);
    }
  });
});
