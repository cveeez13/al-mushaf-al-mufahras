'use client';

import { useI18n, type Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/useTheme';
import { useSmartNightMode } from '@/lib/useSmartNightMode';
import OfflineIndicator from '@/components/OfflineIndicator';
import type { TabKey } from '@/app/page';

// Module-level tab config — bypasses t() context lookup for hydration safety
const TABS: { key: string; ar: string; en: string; prefix?: string }[] = [
  { key: 'mushaf', ar: 'المصحف', en: 'Mushaf' },
  { key: 'topics', ar: 'المواضيع', en: 'Topics' },
  { key: 'bookmarks', ar: 'المفضلة', en: 'Bookmarks' },
  { key: 'stats', ar: 'الإحصائيات', en: 'Stats' },
  { key: 'tafsir', ar: 'التفسير', en: 'Tafsir' },
  { key: 'quiz', ar: 'الحفظ', en: 'Quiz' },
  { key: 'qiraat', ar: 'القراءات', en: 'Qiraat' },
  { key: 'hijri', ar: 'التقويم', en: 'Hijri', prefix: '📅 ' },
  { key: 'voice', ar: 'البحث الصوتي', en: 'Voice', prefix: '🎙️ ' },
  { key: 'kids', ar: 'الأطفال', en: 'Kids', prefix: '🧒 ' },
  { key: 'a11y', ar: 'إمكانية الوصول', en: 'A11y', prefix: '♿ ' },
  { key: 'khatma', ar: 'خطة الختمة', en: 'Khatma', prefix: '📅 ' },
  { key: 'reflections', ar: 'تأملات', en: 'Reflect', prefix: '✏️ ' },
  { key: 'mpquiz', ar: 'مسابقة', en: 'Battle', prefix: '⚔️ ' },
  { key: 'aitafsir', ar: 'اشرحلي', en: 'AI Tafsir', prefix: '🤖 ' },
  { key: 'quranmap', ar: 'خريطة', en: 'Map', prefix: '🗺️ ' },
  { key: 'publicapi', ar: 'API', en: 'API', prefix: '🔌 ' },
  { key: 'admin', ar: 'الإدارة', en: 'Admin', prefix: '🔑 ' },
];

function tabLabel(tab: typeof TABS[number], lang: Lang): string {
  return (tab.prefix || '') + (lang === 'ar' ? tab.ar : tab.en);
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
  const { theme, setTheme } = useTheme();
  const { nightState, setState: setNight } = useSmartNightMode();

  return (
    <header className="bg-[var(--color-mushaf-paper)] border-b border-[var(--color-mushaf-border)] shrink-0">
      {/* Top row: menu + title + controls */}
      <div className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="p-2.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors shrink-0"
          aria-label={t('menu')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="text-base sm:text-lg font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)] whitespace-nowrap truncate">
          {t('appTitle')}
        </h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Offline indicator */}
        <OfflineIndicator />

        {/* Combined theme / night mode toggle */}
        <button
          onClick={() => {
            if (theme === 'light' || (theme === 'system' && nightState === 'off')) {
              // → Dark
              setTheme('dark');
              setNight('off');
            } else if ((theme === 'dark' || theme === 'system') && nightState !== 'on') {
              // → Night
              setTheme('dark');
              setNight('on');
            } else {
              // → Light
              setTheme('light');
              setNight('off');
            }
          }}
          className={`p-2.5 rounded-lg text-sm border transition-colors shrink-0 ${
            nightState === 'on'
              ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/20 text-[var(--color-mushaf-gold)]'
              : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]'
          }`}
          aria-label={
            nightState === 'on'
              ? (lang === 'ar' ? 'الوضع الليلي — اضغط للتبديل' : 'Night mode — click to switch')
              : theme === 'dark'
                ? (lang === 'ar' ? 'الوضع الداكن — اضغط للتبديل' : 'Dark mode — click to switch')
                : (lang === 'ar' ? 'الوضع الفاتح — اضغط للتبديل' : 'Light mode — click to switch')
          }
        >
          <span aria-hidden="true">{nightState === 'on' ? '⭐' : theme === 'dark' ? '🌙' : '☀️'}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="p-2.5 rounded-lg text-xs font-bold border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] transition-colors shrink-0"
          aria-label={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>

        {/* Page navigator */}
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2.5 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30 transition-colors"
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
              const v = parseInt(e.target.value);
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
            className="p-2.5 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30 transition-colors"
            aria-label={lang === 'ar' ? 'الصفحة التالية' : 'Next page'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom row: scrollable tabs + mobile page nav */}
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
            if (next !== -1) { e.preventDefault(); tabs[next].focus(); }
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls="main-content"
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => onTabChange(tab.key as TabKey)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? 'bg-[var(--color-mushaf-gold)] text-white'
                  : 'hover:bg-[var(--color-mushaf-border)]/30'
              }`}
            >
              {tabLabel(tab, lang)}
            </button>
          ))}
        </nav>

        {/* Mobile-only compact page nav */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
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
            className="p-2 rounded hover:bg-[var(--color-mushaf-border)]/30 disabled:opacity-30"
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
