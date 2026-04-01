'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  type A11yPreferences,
  loadA11yPreferences,
  saveA11yPreferences,
  applyA11yToDOM,
  getDefaultA11y,
  announce,
} from '@/lib/accessibility';

export default function AccessibilityPanel() {
  const { lang } = useI18n();
  const isAr = lang === 'ar';

  const [prefs, setPrefs] = useState<A11yPreferences>(getDefaultA11y);

  // Load from localStorage on mount
  useEffect(() => {
    setPrefs(loadA11yPreferences());
  }, []);

  // Apply to DOM and persist on change
  useEffect(() => {
    applyA11yToDOM(prefs);
    saveA11yPreferences(prefs);
  }, [prefs]);

  const updatePref = useCallback(<K extends keyof A11yPreferences>(key: K, value: A11yPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    const defaults = getDefaultA11y();
    setPrefs(defaults);
    announce(isAr ? 'تم إعادة الإعدادات للافتراضي' : 'Settings reset to default');
  }, [isAr]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" role="region" aria-label={isAr ? 'إعدادات إمكانية الوصول' : 'Accessibility Settings'}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold" id="a11y-heading">
          ♿ {isAr ? 'إمكانية الوصول' : 'Accessibility'}
        </h2>
        <p className="text-sm opacity-60">
          {isAr
            ? 'تخصيص العرض لتسهيل القراءة — دعم عسر القراءة، التباين العالي، وقارئ الشاشة'
            : 'Customize display for easier reading — dyslexia support, high contrast, screen reader'}
        </p>
      </div>

      {/* ─── Dyslexia Mode ─────────────────────────────── */}
      <SettingSection
        icon="📖"
        title={isAr ? 'وضع عسر القراءة' : 'Dyslexia Mode'}
        description={isAr
          ? 'خط واضح بمسافات واسعة لتسهيل قراءة النص العربي'
          : 'Clear font with wide spacing for easier Arabic text reading'}
      >
        <ToggleSwitch
          id="dyslexia-mode"
          checked={prefs.dyslexiaMode}
          onChange={(v) => {
            updatePref('dyslexiaMode', v);
            announce(v
              ? (isAr ? 'تم تفعيل وضع عسر القراءة' : 'Dyslexia mode enabled')
              : (isAr ? 'تم إلغاء وضع عسر القراءة' : 'Dyslexia mode disabled'));
          }}
          label={isAr ? 'تفعيل وضع عسر القراءة' : 'Enable dyslexia mode'}
          isAr={isAr}
        />
      </SettingSection>

      {/* ─── Font Size ─────────────────────────────────── */}
      <SettingSection
        icon="🔤"
        title={isAr ? 'حجم الخط' : 'Font Size'}
        description={isAr ? 'تكبير النص لسهولة القراءة' : 'Enlarge text for easier reading'}
      >
        <SegmentedControl
          id="font-size"
          value={prefs.fontSize}
          onChange={(v) => {
            updatePref('fontSize', v as A11yPreferences['fontSize']);
            const labels = { normal: isAr ? 'عادي' : 'Normal', large: isAr ? 'كبير' : 'Large', xlarge: isAr ? 'كبير جداً' : 'Extra Large' };
            announce(`${isAr ? 'حجم الخط:' : 'Font size:'} ${labels[v as keyof typeof labels]}`);
          }}
          options={[
            { value: 'normal', label: isAr ? 'عادي' : 'Normal', ariaLabel: isAr ? 'حجم عادي' : 'Normal size' },
            { value: 'large', label: isAr ? 'كبير' : 'Large', ariaLabel: isAr ? 'حجم كبير' : 'Large size' },
            { value: 'xlarge', label: isAr ? 'كبير جداً' : 'XL', ariaLabel: isAr ? 'حجم كبير جداً' : 'Extra large size' },
          ]}
          groupLabel={isAr ? 'حجم الخط' : 'Font Size'}
        />
        {/* Preview */}
        <div className="mt-3 p-3 rounded-xl bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)]" aria-hidden="true">
          <p
            className="font-[var(--font-arabic)] text-center"
            dir="rtl"
            style={{
              fontSize: prefs.fontSize === 'xlarge' ? '2.5rem' : prefs.fontSize === 'large' ? '2rem' : '1.5rem',
              lineHeight: prefs.lineSpacing === 'xwide' ? '3.8' : prefs.lineSpacing === 'wide' ? '3' : '2.2',
              letterSpacing: prefs.dyslexiaMode ? '0.05em' : undefined,
              wordSpacing: prefs.dyslexiaMode ? '0.2em' : undefined,
            }}
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      </SettingSection>

      {/* ─── Line Spacing ──────────────────────────────── */}
      <SettingSection
        icon="↕️"
        title={isAr ? 'تباعد الأسطر' : 'Line Spacing'}
        description={isAr ? 'زيادة المسافة بين الأسطر' : 'Increase space between lines'}
      >
        <SegmentedControl
          id="line-spacing"
          value={prefs.lineSpacing}
          onChange={(v) => {
            updatePref('lineSpacing', v as A11yPreferences['lineSpacing']);
          }}
          options={[
            { value: 'normal', label: isAr ? 'عادي' : 'Normal', ariaLabel: isAr ? 'تباعد عادي' : 'Normal spacing' },
            { value: 'wide', label: isAr ? 'واسع' : 'Wide', ariaLabel: isAr ? 'تباعد واسع' : 'Wide spacing' },
            { value: 'xwide', label: isAr ? 'واسع جداً' : 'Extra', ariaLabel: isAr ? 'تباعد واسع جداً' : 'Extra wide spacing' },
          ]}
          groupLabel={isAr ? 'تباعد الأسطر' : 'Line Spacing'}
        />
      </SettingSection>

      {/* ─── High Contrast ─────────────────────────────── */}
      <SettingSection
        icon="🔲"
        title={isAr ? 'التباين العالي' : 'High Contrast'}
        description={isAr
          ? 'ألوان مواضيع أغمق ونص أوضح — متوافق مع WCAG AAA'
          : 'Darker topic colors & clearer text — WCAG AAA compliant'}
      >
        <ToggleSwitch
          id="high-contrast"
          checked={prefs.highContrast}
          onChange={(v) => {
            updatePref('highContrast', v);
            announce(v
              ? (isAr ? 'تم تفعيل التباين العالي' : 'High contrast enabled')
              : (isAr ? 'تم إلغاء التباين العالي' : 'High contrast disabled'));
          }}
          label={isAr ? 'تفعيل التباين العالي' : 'Enable high contrast'}
          isAr={isAr}
        />
      </SettingSection>

      {/* ─── Reduced Motion ────────────────────────────── */}
      <SettingSection
        icon="⏸️"
        title={isAr ? 'تقليل الحركة' : 'Reduce Motion'}
        description={isAr
          ? 'إيقاف الرسوم المتحركة والانتقالات'
          : 'Disable animations and transitions'}
      >
        <ToggleSwitch
          id="reduced-motion"
          checked={prefs.reducedMotion}
          onChange={(v) => updatePref('reducedMotion', v)}
          label={isAr ? 'تقليل الحركة' : 'Reduce motion'}
          isAr={isAr}
        />
      </SettingSection>

      {/* ─── Focus Highlight ───────────────────────────── */}
      <SettingSection
        icon="🎯"
        title={isAr ? 'إبراز التركيز' : 'Focus Highlight'}
        description={isAr
          ? 'إطار واضح حول العنصر المحدد عند استخدام لوحة المفاتيح'
          : 'Clear outline around focused element when using keyboard'}
      >
        <ToggleSwitch
          id="focus-highlight"
          checked={prefs.focusHighlight}
          onChange={(v) => updatePref('focusHighlight', v)}
          label={isAr ? 'إبراز التركيز' : 'Focus highlight'}
          isAr={isAr}
        />
      </SettingSection>

      {/* ─── Screen Reader Hints ───────────────────────── */}
      <SettingSection
        icon="🔊"
        title={isAr ? 'تلميحات قارئ الشاشة' : 'Screen Reader Hints'}
        description={isAr
          ? 'نصوص إضافية مخفية لمساعدة قارئات الشاشة'
          : 'Extra hidden text to help screen readers'}
      >
        <ToggleSwitch
          id="sr-hints"
          checked={prefs.screenReaderHints}
          onChange={(v) => updatePref('screenReaderHints', v)}
          label={isAr ? 'تلميحات قارئ الشاشة' : 'Screen reader hints'}
          isAr={isAr}
        />
      </SettingSection>

      {/* ─── Reset ─────────────────────────────────────── */}
      <div className="pt-4 border-t border-[var(--color-mushaf-border)]">
        <button
          onClick={resetAll}
          className="w-full py-3 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          aria-label={isAr ? 'إعادة جميع الإعدادات للافتراضي' : 'Reset all settings to default'}
        >
          {isAr ? '🔄 إعادة الإعدادات للافتراضي' : '🔄 Reset to Default'}
        </button>
      </div>

      {/* ─── WCAG Info ─────────────────────────────────── */}
      <div className="bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-sm">
          {isAr ? '📋 معايير إمكانية الوصول المدعومة' : '📋 Supported Accessibility Standards'}
        </h3>
        <ul className="text-xs space-y-1 opacity-70">
          <li>✅ WCAG 2.1 AA — {isAr ? 'نسب تباين ألوان كافية' : 'Sufficient color contrast ratios'}</li>
          <li>✅ {isAr ? 'دعم التنقل بلوحة المفاتيح فقط' : 'Keyboard-only navigation support'}</li>
          <li>✅ ARIA — {isAr ? 'أدوار وتسميات لقارئات الشاشة' : 'Roles & labels for screen readers'}</li>
          <li>✅ {isAr ? 'وضع عسر القراءة للنص العربي' : 'Arabic text dyslexia mode'}</li>
          <li>✅ {isAr ? 'تقليل الحركة لمن يعانون من حساسية للحركة' : 'Reduced motion for motion-sensitive users'}</li>
          <li>✅ {isAr ? 'يعمل مع NVDA، JAWS، VoiceOver' : 'Works with NVDA, JAWS, VoiceOver'}</li>
        </ul>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function SettingSection({ icon, title, description, children }: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-bold text-base flex items-center gap-2">
          <span aria-hidden="true">{icon}</span> {title}
        </h3>
        <p className="text-xs opacity-60 mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ToggleSwitch({ id, checked, onChange, label, isAr }: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  isAr: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm font-medium cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
            checked ? (isAr ? 'left-0.5' : 'left-7') : (isAr ? 'left-7' : 'left-0.5')
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function SegmentedControl({ id, value, onChange, options, groupLabel }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; ariaLabel: string }[];
  groupLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={groupLabel} className="flex gap-1 bg-[var(--color-mushaf-border)]/30 rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.ariaLabel}
          id={`${id}-${opt.value}`}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-[var(--color-mushaf-gold)] text-white shadow-sm'
              : 'hover:bg-[var(--color-mushaf-border)]/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
