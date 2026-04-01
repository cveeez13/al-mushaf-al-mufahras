'use client';

/**
 * AdminDashboard — Full admin control panel for topic classification management.
 *
 * Tabs: Overview | Overrides | Sub-Topics | Audit Log | Settings
 * - Overview: Stats cards, classification confidence chart, recent activity
 * - Overrides: Search verse → change topic, view/revert existing overrides
 * - Sub-Topics: CRUD under the 7 main topics
 * - Audit Log: Searchable/filterable action history
 * - Settings: Change passphrase, export data
 */

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAdmin, type TopicOverride, type SubTopic, type AuditEntry } from '@/lib/useAdmin';
import { TOPICS, SURAH_NAMES, type Verse } from '@/lib/types';
import { getVersesForPage, searchVerses } from '@/lib/data';
import { changePassphrase } from '@/lib/adminAuth';

type AdminTab = 'overview' | 'overrides' | 'subtopics' | 'audit' | 'settings';

interface AdminDashboardProps {
  onGoToPage?: (page: number) => void;
}

export default function AdminDashboard({ onGoToPage }: AdminDashboardProps) {
  const { t, lang } = useI18n();
  const isAr = lang === 'ar';
  const admin = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Auth gate
  const [passInput, setPassInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSetup, setIsSetup] = useState(false);

  // If not admin, show login
  if (!admin.isAdmin) {
    return (
      <div className="p-6 max-w-md mx-auto mt-12">
        <div className="page-frame p-8 rounded-2xl text-center">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)] mb-2">
            {isAr ? 'لوحة التحكم' : 'Admin Dashboard'}
          </h2>
          <p className="text-sm opacity-60 mb-6">
            {admin.configured
              ? (isAr ? 'أدخل كلمة المرور للدخول' : 'Enter passphrase to login')
              : (isAr ? 'أنشئ كلمة مرور للمرة الأولى (6 أحرف على الأقل)' : 'Set up a passphrase (min 6 chars)')}
          </p>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setAuthError('');
            if (!admin.configured) {
              const ok = await admin.setup(passInput);
              if (ok) {
                setIsSetup(true);
                const logged = await admin.login(passInput);
                if (!logged) setAuthError(isAr ? 'خطأ في الإعداد' : 'Setup error');
              } else {
                setAuthError(isAr ? '6 أحرف على الأقل' : 'Min 6 characters');
              }
            } else {
              const ok = await admin.login(passInput);
              if (!ok) setAuthError(isAr ? 'كلمة مرور خاطئة' : 'Wrong passphrase');
            }
            setPassInput('');
          }}>
            <input
              type="password"
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              placeholder={isAr ? 'كلمة المرور...' : 'Passphrase...'}
              className="w-full p-3 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-center text-lg mb-3 focus:border-[var(--color-mushaf-gold)] outline-none"
              autoFocus
              minLength={6}
            />
            {authError && <div className="text-red-500 text-sm mb-3">{authError}</div>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[var(--color-mushaf-gold)] text-white font-bold hover:opacity-90 transition-opacity"
            >
              {admin.configured ? (isAr ? 'دخول' : 'Login') : (isAr ? 'إنشاء' : 'Setup')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: '📊' },
    { key: 'overrides', label: isAr ? 'تعديل التصنيف' : 'Overrides', icon: '✏️' },
    { key: 'subtopics', label: isAr ? 'مواضيع فرعية' : 'Sub-Topics', icon: '🏷️' },
    { key: 'audit', label: isAr ? 'سجل التغييرات' : 'Audit Log', icon: '📋' },
    { key: 'settings', label: isAr ? 'الإعدادات' : 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[var(--color-mushaf-gold)]">
          {isAr ? '🔧 لوحة تحكم المواضيع' : '🔧 Topic Admin Dashboard'}
        </h2>
        <button
          onClick={() => admin.logout()}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
        >
          {isAr ? 'خروج' : 'Logout'}
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-mushaf-gold)] text-white'
                : 'hover:bg-[var(--color-mushaf-border)]/30'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab admin={admin} isAr={isAr} />}
      {activeTab === 'overrides' && <OverridesTab admin={admin} isAr={isAr} onGoToPage={onGoToPage} />}
      {activeTab === 'subtopics' && <SubTopicsTab admin={admin} isAr={isAr} />}
      {activeTab === 'audit' && <AuditTab admin={admin} isAr={isAr} />}
      {activeTab === 'settings' && <SettingsTab admin={admin} isAr={isAr} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ admin, isAr }: { admin: ReturnType<typeof useAdmin>; isAr: boolean }) {
  const { stats } = admin;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={6236} label={isAr ? 'إجمالي الآيات' : 'Total Verses'}
          color="var(--color-mushaf-gold)"
        />
        <StatCard
          value={stats.totalOverrides} label={isAr ? 'تعديلات التصنيف' : 'Overrides'}
          color="var(--color-topic-orange)"
        />
        <StatCard
          value={stats.totalSubTopics} label={isAr ? 'مواضيع فرعية' : 'Sub-Topics'}
          color="var(--color-topic-purple)"
        />
        <StatCard
          value={stats.totalAuditEntries} label={isAr ? 'إجراءات مسجلة' : 'Audit Entries'}
          color="var(--color-topic-blue)"
        />
      </div>

      {/* Confidence breakdown */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'مستوى ثقة التصنيف' : 'Classification Confidence'}</h3>
        <div className="space-y-2">
          {[
            { label: isAr ? 'عالي' : 'High', count: stats.confidenceBreakdown.high, color: '#27AE60', pct: 7.2 },
            { label: isAr ? 'متوسط' : 'Medium', count: stats.confidenceBreakdown.medium, color: '#F1C40F', pct: 52.2 },
            { label: isAr ? 'منخفض' : 'Low', count: stats.confidenceBreakdown.low, color: '#E74C3C', pct: 40.6 },
          ].map(level => (
            <div key={level.label}>
              <div className="flex justify-between text-xs mb-1">
                <span>{level.label}</span>
                <span>{level.count} ({level.pct}%)</span>
              </div>
              <div className="h-2 bg-[var(--color-mushaf-border)]/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${level.pct}%`, backgroundColor: level.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic distribution */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'توزيع المواضيع' : 'Topic Distribution'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.values(TOPICS).map(topic => {
            const count = topic.id === 1 ? 1129 : topic.id === 2 ? 762 : topic.id === 3 ? 677 :
                          topic.id === 4 ? 1316 : topic.id === 5 ? 498 : topic.id === 6 ? 806 : 1048;
            const overrideCount = admin.stats.overridesByTopic[topic.id] || 0;
            const pct = ((count / 6236) * 100).toFixed(1);
            return (
              <div key={topic.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/20">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: topic.hex }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{isAr ? topic.name_ar : topic.name_en}</div>
                  <div className="text-xs opacity-50">{count} ({pct}%)</div>
                </div>
                {overrideCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">
                    +{overrideCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent audit */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'آخر الإجراءات' : 'Recent Actions'}</h3>
        {admin.auditLog.length === 0 ? (
          <p className="text-xs opacity-50">{isAr ? 'لا توجد إجراءات بعد' : 'No actions yet'}</p>
        ) : (
          <div className="space-y-1">
            {admin.auditLog.slice(0, 5).map((entry, i) => (
              <AuditRow key={i} entry={entry} isAr={isAr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overrides Tab ────────────────────────────────────────────

function OverridesTab({ admin, isAr, onGoToPage }: { admin: ReturnType<typeof useAdmin>; isAr: boolean; onGoToPage?: (page: number) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [newTopicId, setNewTopicId] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterTopic, setFilterTopic] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    // Check if it's a verse key format "surah:ayah"
    const keyMatch = searchQuery.match(/^(\d+):(\d+)$/);
    if (keyMatch) {
      const results = await searchVerses(searchQuery);
      // If exact key not found, try page-based
      if (results.length === 0) {
        const pageResults = await getVersesForPage(parseInt(keyMatch[1]));
        setSearchResults(pageResults);
      } else {
        setSearchResults(results);
      }
    } else {
      const results = await searchVerses(searchQuery);
      setSearchResults(results.slice(0, 50));
    }
  };

  const handleOverride = async () => {
    if (!selectedVerse || !reason.trim()) return;
    setSaving(true);
    await admin.overrideTopic(
      selectedVerse.verse_key,
      selectedVerse.topic.id,
      newTopicId,
      reason
    );
    setSaving(false);
    setSelectedVerse(null);
    setReason('');
  };

  const filteredOverrides = filterTopic
    ? admin.overrides.filter(o => o.new_topic_id === filterTopic)
    : admin.overrides;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'البحث عن آية لتعديل تصنيفها' : 'Search verse to reclassify'}</h3>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={isAr ? 'رقم السورة:الآية أو نص...' : 'surah:ayah or text...'}
            className="flex-1 p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm focus:border-[var(--color-mushaf-gold)] outline-none"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-medium hover:opacity-90"
          >
            {isAr ? 'بحث' : 'Search'}
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto space-y-1">
            {searchResults.map(v => {
              const override = admin.getOverrideForVerse(v.verse_key);
              return (
                <button
                  key={v.verse_key}
                  onClick={() => { setSelectedVerse(v); setNewTopicId(v.topic.id); }}
                  className={`w-full text-start p-2 rounded-lg text-xs hover:bg-[var(--color-mushaf-border)]/30 transition-colors ${
                    selectedVerse?.verse_key === v.verse_key ? 'ring-2 ring-[var(--color-mushaf-gold)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: TOPICS[v.topic.id]?.hex }} />
                    <span className="font-bold">{v.verse_key}</span>
                    <span className="opacity-50">{SURAH_NAMES[v.surah]}</span>
                    {override && <span className="text-orange-500">✏️</span>}
                  </div>
                  <div className="mt-1 line-clamp-1 text-[var(--color-mushaf-text)]/60">{v.text}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Override editor */}
      {selectedVerse && (
        <div className="page-frame p-4 rounded-xl border-2 border-[var(--color-mushaf-gold)]/30">
          <h3 className="text-sm font-bold mb-3">{isAr ? 'تعديل تصنيف الآية' : 'Edit Verse Classification'}</h3>

          <div className="text-sm mb-3 p-3 rounded-lg bg-[var(--color-mushaf-border)]/10 leading-relaxed">
            <span className="font-bold text-[var(--color-mushaf-gold)]">{selectedVerse.verse_key}</span>
            {' — '}{selectedVerse.text.slice(0, 120)}...
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs opacity-60">{isAr ? 'الحالي:' : 'Current:'}</span>
            <span className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: TOPICS[selectedVerse.topic.id]?.hex }} />
              {isAr ? TOPICS[selectedVerse.topic.id]?.name_ar : TOPICS[selectedVerse.topic.id]?.name_en}
            </span>
          </div>

          <div className="mb-3">
            <label className="text-xs opacity-60 mb-1 block">{isAr ? 'الموضوع الجديد:' : 'New topic:'}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.values(TOPICS).map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setNewTopicId(topic.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                    newTopicId === topic.id
                      ? 'ring-2 ring-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10'
                      : 'hover:bg-[var(--color-mushaf-border)]/20'
                  }`}
                >
                  <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: topic.hex }} />
                  <span className="truncate">{isAr ? topic.name_ar : topic.name_en}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs opacity-60 mb-1 block">{isAr ? 'سبب التعديل:' : 'Reason:'}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={isAr ? 'اشرح سبب تغيير التصنيف...' : 'Explain why this classification should change...'}
              className="w-full p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm resize-none h-20 focus:border-[var(--color-mushaf-gold)] outline-none"
              maxLength={500}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleOverride}
              disabled={saving || newTopicId === selectedVerse.topic.id || !reason.trim()}
              className="flex-1 py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
            >
              {saving ? '...' : (isAr ? 'حفظ التعديل' : 'Save Override')}
            </button>
            <button
              onClick={() => setSelectedVerse(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-mushaf-border)] text-sm hover:border-red-500 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Existing overrides */}
      <div className="page-frame p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">
            {isAr ? 'التعديلات الحالية' : 'Current Overrides'} ({filteredOverrides.length})
          </h3>
          <select
            value={filterTopic || ''}
            onChange={e => setFilterTopic(e.target.value ? parseInt(e.target.value) : null)}
            className="text-xs p-1 rounded border border-[var(--color-mushaf-border)] bg-transparent"
          >
            <option value="">{isAr ? 'الكل' : 'All'}</option>
            {Object.values(TOPICS).map(t => (
              <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
            ))}
          </select>
        </div>

        {filteredOverrides.length === 0 ? (
          <p className="text-xs opacity-50 text-center py-4">{isAr ? 'لا توجد تعديلات' : 'No overrides yet'}</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredOverrides.map(ov => (
              <div key={ov.verse_key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/20 text-xs">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: TOPICS[ov.original_topic_id]?.hex }} />
                <span>→</span>
                <span className="w-3 h-3 rounded" style={{ backgroundColor: TOPICS[ov.new_topic_id]?.hex }} />
                <span className="font-bold">{ov.verse_key}</span>
                <span className="flex-1 truncate opacity-50">{ov.reason}</span>
                <span className="opacity-30">{new Date(ov.updatedAt).toLocaleDateString()}</span>
                <button
                  onClick={() => admin.revertOverride(ov.verse_key)}
                  className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                  title={isAr ? 'تراجع' : 'Revert'}
                >
                  ↩
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Topics Tab ───────────────────────────────────────────

function SubTopicsTab({ admin, isAr }: { admin: ReturnType<typeof useAdmin>; isAr: boolean }) {
  const [parentId, setParentId] = useState(1);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [shade, setShade] = useState('#6699CC');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!nameAr.trim() || !nameEn.trim()) return;
    setCreating(true);
    await admin.createSubTopic(parentId, nameAr, nameEn, shade);
    setNameAr('');
    setNameEn('');
    setCreating(false);
  };

  // Group sub-topics by parent
  const grouped = new Map<number, SubTopic[]>();
  for (const st of admin.subTopics) {
    const arr = grouped.get(st.parent_topic_id) || [];
    arr.push(st);
    grouped.set(st.parent_topic_id, arr);
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'إنشاء موضوع فرعي' : 'Create Sub-Topic'}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs opacity-60 mb-1 block">{isAr ? 'الموضوع الرئيسي' : 'Parent Topic'}</label>
            <select
              value={parentId}
              onChange={e => setParentId(parseInt(e.target.value))}
              className="w-full p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm"
            >
              {Object.values(TOPICS).map(t => (
                <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs opacity-60 mb-1 block">{isAr ? 'اللون' : 'Color'}</label>
            <input
              type="color"
              value={shade}
              onChange={e => setShade(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--color-mushaf-border)] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
            placeholder={isAr ? 'الاسم بالعربي' : 'Arabic name'}
            className="p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm focus:border-[var(--color-mushaf-gold)] outline-none"
            dir="rtl"
            maxLength={100}
          />
          <input
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            placeholder={isAr ? 'الاسم بالإنجليزي' : 'English name'}
            className="p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm focus:border-[var(--color-mushaf-gold)] outline-none"
            dir="ltr"
            maxLength={100}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !nameAr.trim() || !nameEn.trim()}
          className="w-full py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
        >
          {creating ? '...' : (isAr ? 'إنشاء' : 'Create')}
        </button>
      </div>

      {/* Sub-topics by parent */}
      {Object.values(TOPICS).map(topic => {
        const subs = grouped.get(topic.id) || [];
        return (
          <div key={topic.id} className="page-frame p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: topic.hex }} />
              <h3 className="text-sm font-bold">{isAr ? topic.name_ar : topic.name_en}</h3>
              <span className="text-xs opacity-40">({subs.length})</span>
            </div>

            {subs.length === 0 ? (
              <p className="text-xs opacity-40 text-center py-2">{isAr ? 'لا توجد مواضيع فرعية' : 'No sub-topics'}</p>
            ) : (
              <div className="space-y-1">
                {subs.map(st => (
                  <div key={st.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/20 text-xs">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: st.color_shade }} />
                    <span className="font-medium">{isAr ? st.name_ar : st.name_en}</span>
                    <span className="opacity-40">{st.verse_keys.length} {isAr ? 'آية' : 'verses'}</span>
                    <span className="flex-1" />
                    <span className="opacity-30">{new Date(st.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => admin.deleteSubTopic(st.id)}
                      className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────

function AuditTab({ admin, isAr }: { admin: ReturnType<typeof useAdmin>; isAr: boolean }) {
  const [filter, setFilter] = useState<string>('');

  const actionLabels: Record<string, { ar: string; en: string; icon: string }> = {
    override_topic: { ar: 'تعديل تصنيف', en: 'Override', icon: '✏️' },
    revert_override: { ar: 'تراجع', en: 'Revert', icon: '↩' },
    create_subtopic: { ar: 'إنشاء فرعي', en: 'Create Sub', icon: '🏷️' },
    delete_subtopic: { ar: 'حذف فرعي', en: 'Delete Sub', icon: '🗑️' },
    assign_subtopic: { ar: 'تعيين فرعي', en: 'Assign Sub', icon: '📌' },
    login: { ar: 'دخول', en: 'Login', icon: '🔐' },
    logout: { ar: 'خروج', en: 'Logout', icon: '🚪' },
    export: { ar: 'تصدير', en: 'Export', icon: '📤' },
    import: { ar: 'استيراد', en: 'Import', icon: '📥' },
  };

  const filtered = filter
    ? admin.auditLog.filter(e => e.action === filter)
    : admin.auditLog;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-bold">{isAr ? 'سجل التغييرات' : 'Audit Log'} ({filtered.length})</h3>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs p-1 rounded border border-[var(--color-mushaf-border)] bg-transparent"
        >
          <option value="">{isAr ? 'كل الإجراءات' : 'All Actions'}</option>
          {Object.entries(actionLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {isAr ? val.ar : val.en}</option>
          ))}
        </select>
      </div>

      <div className="page-frame rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-xs opacity-50 text-center py-8">{isAr ? 'لا توجد إجراءات' : 'No entries'}</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto divide-y divide-[var(--color-mushaf-border)]/30">
            {filtered.map((entry, i) => (
              <AuditRow key={i} entry={entry} isAr={isAr} full />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────

function SettingsTab({ admin, isAr }: { admin: ReturnType<typeof useAdmin>; isAr: boolean }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  const handleChangePass = async () => {
    if (newPass.length < 6) {
      setPassMsg(isAr ? 'كلمة المرور قصيرة (6 أحرف على الأقل)' : 'Min 6 characters');
      return;
    }
    const ok = await changePassphrase(oldPass, newPass);
    setPassMsg(ok ? (isAr ? 'تم تغيير كلمة المرور ✓' : 'Passphrase changed ✓') : (isAr ? 'كلمة المرور القديمة خاطئة' : 'Wrong old passphrase'));
    setOldPass('');
    setNewPass('');
    setTimeout(() => setPassMsg(''), 3000);
  };

  const handleExport = async () => {
    try {
      const json = await admin.exportAdminData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mushaf-admin-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(isAr ? 'تم التصدير ✓' : 'Exported ✓');
      setTimeout(() => setExportMsg(''), 3000);
    } catch {
      setExportMsg(isAr ? 'فشل التصدير' : 'Export failed');
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Change passphrase */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'تغيير كلمة المرور' : 'Change Passphrase'}</h3>
        <div className="space-y-2">
          <input
            type="password"
            value={oldPass}
            onChange={e => setOldPass(e.target.value)}
            placeholder={isAr ? 'كلمة المرور الحالية' : 'Current passphrase'}
            className="w-full p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm focus:border-[var(--color-mushaf-gold)] outline-none"
          />
          <input
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder={isAr ? 'كلمة المرور الجديدة (6+ أحرف)' : 'New passphrase (6+ chars)'}
            className="w-full p-2 rounded-lg border border-[var(--color-mushaf-border)] bg-transparent text-sm focus:border-[var(--color-mushaf-gold)] outline-none"
            minLength={6}
          />
          <button
            onClick={handleChangePass}
            className="w-full py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white text-sm font-bold hover:opacity-90"
          >
            {isAr ? 'تغيير' : 'Change'}
          </button>
          {passMsg && <div className="text-xs text-center text-[var(--color-mushaf-gold)]">{passMsg}</div>}
        </div>
      </div>

      {/* Export admin data */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'تصدير بيانات الإدارة' : 'Export Admin Data'}</h3>
        <p className="text-xs opacity-50 mb-3">
          {isAr ? 'تصدير التعديلات والمواضيع الفرعية وسجل التغييرات' : 'Export overrides, sub-topics, and audit log'}
        </p>
        <button
          onClick={handleExport}
          className="w-full py-2 rounded-lg border border-[var(--color-mushaf-border)] text-sm hover:border-[var(--color-mushaf-gold)] transition-colors"
        >
          📤 {isAr ? 'تصدير' : 'Export JSON'}
        </button>
        {exportMsg && <div className="text-xs text-center text-[var(--color-mushaf-gold)] mt-2">{exportMsg}</div>}
      </div>

      {/* Session info */}
      <div className="page-frame p-4 rounded-xl">
        <h3 className="text-sm font-bold mb-3">{isAr ? 'معلومات الجلسة' : 'Session Info'}</h3>
        <div className="text-xs space-y-1 opacity-60">
          <div>{isAr ? 'الدور:' : 'Role:'} <span className="font-bold text-[var(--color-mushaf-gold)]">{admin.role}</span></div>
          <div>{isAr ? 'الجلسة تنتهي بعد 24 ساعة من آخر نشاط' : 'Session expires after 24h of inactivity'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="page-frame p-4 rounded-xl text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
      <div className="text-xs mt-1 opacity-50">{label}</div>
    </div>
  );
}

function AuditRow({ entry, isAr, full }: { entry: AuditEntry; isAr: boolean; full?: boolean }) {
  const icons: Record<string, string> = {
    override_topic: '✏️', revert_override: '↩', create_subtopic: '🏷️',
    delete_subtopic: '🗑️', assign_subtopic: '📌', login: '🔐',
    logout: '🚪', export: '📤', import: '📥',
  };

  return (
    <div className={`flex items-center gap-2 text-xs ${full ? 'p-3' : 'p-2 rounded-lg hover:bg-[var(--color-mushaf-border)]/20'}`}>
      <span>{icons[entry.action] || '•'}</span>
      <span className="font-medium">{entry.action}</span>
      {entry.target !== 'system' && (
        <span className="text-[var(--color-mushaf-gold)]">{entry.target}</span>
      )}
      {full && <span className="flex-1 truncate opacity-50">{entry.details}</span>}
      <span className="opacity-30 whitespace-nowrap">
        {new Date(entry.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}
      </span>
    </div>
  );
}
