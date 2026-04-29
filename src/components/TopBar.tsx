'use client';

import { useI18n, type Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/useTheme';
import { useSmartNightMode } from '@/lib/useSmartNightMode';
import OfflineIndicator from '@/components/OfflineIndicator';
import type { TabKey } from '@/app/page';

const TABS: { key: TabKey; ar: string; en: string; prefix?: string }[] = [
  { key: 'mushaf', ar: 'المصحف', en: 'Mushaf' },
  { key: 'topics', ar: 'المواضيع', en: 'Topics' },
  { key: 'bookmarks', ar: 'المفضلة', en: 'Bookmarks' },
  { key: 'stats', ar: 'الإحصائيات', en: 'Stats' },
  { key: 'tafsir', ar: 'التفسير', en: 'Tafsir' },
  { key: 'quiz', ar: 'الحفظ', en: 'Quiz' },
  { key: 'qiraat', ar: 'القراءات', en: 'Qiraat' },
  { key: 'hijri', ar: 'التقويم', en: 'Hijri', prefix: '📅 ' },
  { key: 'voice', ar: 'بحث صوتي', en: 'Voice', prefix: '🎙️ ' },
  { key: 'kids', ar: 'الأطفال', en: 'Kids', prefix: '🧒 ' },
  { key: 'a11y', ar: 'سهولة الوصول', en: 'A11y', prefix: '♿ ' },
  { key: 'khatma', ar: 'خطة الختمة', en: 'Khatma', prefix: '📖 ' },
  { key: 'reflections', ar: 'تأملات', en: 'Reflect', prefix: '✏️ ' },
  { key: 'mpquiz', ar: 'مسابقة', en: 'Battle', prefix: '⚔️ ' },
  { key: 'aitafsir', ar: 'اشرحلي', en: 'AI Tafsir', prefix: '🤖 ' },
  { key: 'quranmap', ar: 'الخريطة', en: 'Map', prefix: '🗺️ ' },
];

function tabLabel(tab: (typeof TABS)[number], lang: Lang): string {
  return `${tab.prefix ?? ''}${lang === 'ar' ? tab.ar : tab.en}`;
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" strokeWidth="2" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
      />
    </svg>
  );
}

function NightIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.85 5.7h5.99l-4.84 3.52 1.85 5.7L12 13.4l-4.85 3.52 1.85-5.7L4.16 7.7h5.99L12 2Z" />
    </svg>
  );
}

interface TopBarProps {
  currentPage: number;
  onMenuClick: () => void;
  onPageChange: (page: number) => void;
  activeTab: string;
  onTabChange: (tab: TabKey) => void;
}

export default function TopBar({ currentPage, onMenuClick, onPageChange, activeTab, onTabChange }: TopBarProps) {
  const { t, lang, toggleLang } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { nightState, setState: setNight } = useSmartNightMode();
  const isNight = nightState === 'on';
  const isDark = resolvedTheme === 'dark';
  const themeLabel = isNight
    ? (lang === 'ar' ? 'الوضع الليلي' : 'Night mode')
    : isDark
      ? (lang === 'ar' ? 'الوضع الداكن' : 'Dark mode')
      : (lang === 'ar' ? 'الوضع الفاتح' : 'Light mode');
  const themeButtonClass = isNight
    ? 'border-[var(--color-mushaf-gold)] bg-[color-mix(in_srgb,var(--color-mushaf-gold)_18%,var(--color-mushaf-paper))] text-[var(--color-mushaf-gold)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-mushaf-gold)_22%,transparent)]'
    : isDark
      ? 'border-[var(--color-mushaf-border)] bg-[color-mix(in_srgb,var(--color-mushaf-paper)_88%,black_12%)] text-[var(--color-mushaf-text)] hover:border-[var(--color-mushaf-gold)] hover:text-[var(--color-mushaf-gold)]'
      : 'border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] text-[var(--color-mushaf-text)] hover:border-[var(--color-mushaf-gold)] hover:text-[var(--color-mushaf-gold)]';

  return (
    <header className="bg-[var(--color-mushaf-paper)] border-b border-[var(--color-mushaf-border)] shrink-0">
      <div className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="p-2.5 rounded-lg text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 transition-colors shrink-0"
          aria-label={t('menu')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex flex-col items-center flex-1">
          <h1 className="text-base sm:text-lg font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)] whitespace-nowrap truncate">
            {t('appTitle')}
          </h1>
        </div>

        <div className="flex-1" />
        <OfflineIndicator />

        <button
          onClick={() => {
            if (theme === 'light' || (theme === 'system' && nightState === 'off')) {
              setTheme('dark');
              setNight('off');
            } else if ((theme === 'dark' || theme === 'system') && nightState !== 'on') {
              setTheme('dark');
              setNight('on');
            } else {
              setTheme('light');
              setNight('off');
            }
          }}
          className={`p-2.5 rounded-lg text-sm border transition-colors shrink-0 ${themeButtonClass}`}
          aria-label={themeLabel}
          title={themeLabel}
        >
          <span className="flex items-center justify-center" aria-hidden="true">
            {isNight ? <NightIcon /> : isDark ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>

        <button
          onClick={toggleLang}
          className="p-2.5 rounded-lg text-xs font-bold text-[var(--color-mushaf-text)] border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] hover:text-[var(--color-mushaf-gold)] transition-colors shrink-0"
          aria-label={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
        >
          {lang === 'ar' ? 'EN' : 'AR'}
        </button>

        <div className="hidden sm:flex items-center gap-2 mr-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2.5 rounded text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30 transition-colors"
            aria-label={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <input
            type="number"
            min={1}
            max={604}
            value={currentPage}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= 604) onPageChange(v);
            }}
            aria-label={lang === 'ar' ? 'رقم الصفحة' : 'Page number'}
            className="w-14 text-center text-sm bg-transparent border border-[var(--color-mushaf-border)] rounded px-1 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            dir="ltr"
          />
          <span className="text-xs text-[var(--color-mushaf-text)]/60">/ 604</span>

          <button
            onClick={() => onPageChange(Math.min(604, currentPage + 1))}
            disabled={currentPage >= 604}
            className="p-2.5 rounded text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30 transition-colors"
            aria-label={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-2 sm:px-3 pb-2 flex items-center gap-2">
        <nav
          className="flex gap-1 flex-1 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label={lang === 'ar' ? 'التنقل بين الأقسام' : 'Section navigation'}
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
            const idx = tabs.indexOf(e.target as HTMLElement);
            if (idx === -1) return;
            let next = -1;
            if (e.key === 'ArrowRight') next = (idx - 1 + tabs.length) % tabs.length;
            else if (e.key === 'ArrowLeft') next = (idx + 1) % tabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = tabs.length - 1;
            if (next !== -1) {
              e.preventDefault();
              tabs[next].focus();
            }
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="main-content"
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? 'bg-[var(--color-mushaf-gold)] text-white'
                  : 'text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30'
              }`}
            >
              {tabLabel(tab, lang)}
            </button>
          ))}
        </nav>

        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
            aria-label={lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-xs font-medium min-w-[2rem] text-center" dir="ltr">{currentPage}</span>
          <button
            onClick={() => onPageChange(Math.min(604, currentPage + 1))}
            disabled={currentPage >= 604}
            className="p-2 rounded text-[var(--color-mushaf-text)] hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
            aria-label={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
