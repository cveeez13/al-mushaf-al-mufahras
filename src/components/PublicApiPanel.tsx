'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  API_VERSION,
  API_ENDPOINTS,
  handleApiRequest,
  createApiKey,
  getApiKeys,
  revokeApiKey,
  deleteApiKey,
  getUsageStats,
  getUsageLog,
  clearUsageLog,
  generateOpenApiSpec,
  type ApiKey,
  type ApiResponse,
  type ApiEndpoint,
  type ApiUsageEntry,
} from '@/lib/topicsApi';

// ═══════════════════════════════════════════════════
// Sub-tab type
// ═══════════════════════════════════════════════════

type ApiSubTab = 'docs' | 'playground' | 'keys' | 'dashboard';

// ═══════════════════════════════════════════════════
// Main Panel
// ═══════════════════════════════════════════════════

export default function PublicApiPanel() {
  const { lang } = useI18n();
  const [subTab, setSubTab] = useState<ApiSubTab>('docs');
  const [keys, setKeys] = useState<ApiKey[]>([]);

  const refreshKeys = useCallback(() => {
    setKeys(getApiKeys());
  }, []);

  useEffect(() => { refreshKeys(); }, [refreshKeys]);

  const subTabs: { key: ApiSubTab; ar: string; en: string; icon: string }[] = [
    { key: 'docs', ar: 'التوثيق', en: 'Docs', icon: '📖' },
    { key: 'playground', ar: 'تجربة', en: 'Playground', icon: '🧪' },
    { key: 'keys', ar: 'مفاتيح', en: 'API Keys', icon: '🔑' },
    { key: 'dashboard', ar: 'لوحة الاستخدام', en: 'Dashboard', icon: '📊' },
  ];

  return (
    <div className="flex flex-col h-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-xl font-bold text-[var(--color-mushaf-gold)]">
            🔌 {lang === 'ar' ? 'API المواضيع المفتوح' : 'Public Topics API'}
          </h2>
          <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-mono font-bold dark:bg-green-900 dark:text-green-200">
            {API_VERSION}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          {lang === 'ar'
            ? 'REST API مفتوح لبيانات تصنيف القرآن الموضوعي — 7 مواضيع، 6236 آية، 114 سورة'
            : 'Open REST API for Quran topic classification — 7 topics, 6236 verses, 114 surahs'}
        </p>

        {/* Sub-tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {subTabs.map(st => (
            <button
              key={st.key}
              onClick={() => setSubTab(st.key)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                subTab === st.key
                  ? 'bg-[var(--color-mushaf-gold)] text-white'
                  : 'bg-[var(--color-mushaf-border)]/20 hover:bg-[var(--color-mushaf-border)]/40'
              }`}
            >
              {st.icon} {lang === 'ar' ? st.ar : st.en}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {subTab === 'docs' && <DocsTab lang={lang} />}
        {subTab === 'playground' && <PlaygroundTab lang={lang} keys={keys} />}
        {subTab === 'keys' && <KeysTab lang={lang} keys={keys} onRefresh={refreshKeys} />}
        {subTab === 'dashboard' && <DashboardTab lang={lang} keys={keys} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Docs Tab — Swagger-like endpoint documentation
// ═══════════════════════════════════════════════════

function DocsTab({ lang }: { lang: 'ar' | 'en' }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showSpec, setShowSpec] = useState(false);

  const tagGroups: Record<string, ApiEndpoint[]> = {};
  for (const ep of API_ENDPOINTS) {
    for (const tag of ep.tags) {
      (tagGroups[tag] ??= []).push(ep);
    }
  }

  return (
    <div className="space-y-6">
      {/* Base URL */}
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm">
        <span className="text-gray-500">Base URL:</span>{' '}
        <span className="font-bold">/api/{API_VERSION}</span>
      </div>

      {/* Auth info */}
      <div className="p-3 rounded-lg border border-yellow-300/50 bg-yellow-50 dark:bg-yellow-900/20 text-sm">
        <strong>🔐 {lang === 'ar' ? 'المصادقة' : 'Authentication'}:</strong>{' '}
        {lang === 'ar'
          ? 'أضف مفتاح API في الهيدر: X-API-Key: qm_xxxxxxxx'
          : 'Include your API key in the header: X-API-Key: qm_xxxxxxxx'}
      </div>

      {/* Rate limit info */}
      <div className="p-3 rounded-lg border border-blue-300/50 bg-blue-50 dark:bg-blue-900/20 text-sm">
        <strong>⏱️ {lang === 'ar' ? 'حد الاستخدام' : 'Rate Limiting'}:</strong>{' '}
        {lang === 'ar'
          ? '60 طلب/دقيقة لكل مفتاح API. الهيدرات: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
          : '60 requests/min per API key. Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'}
      </div>

      {/* Endpoints by tag */}
      {Object.entries(tagGroups).map(([tag, endpoints]) => (
        <div key={tag}>
          <h3 className="text-lg font-bold mb-2">{tag}</h3>
          <div className="space-y-2">
            {endpoints.map((ep) => {
              const globalIdx = API_ENDPOINTS.indexOf(ep);
              const isOpen = expandedIdx === globalIdx;
              return (
                <div key={ep.path} className="border border-[var(--color-mushaf-border)] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedIdx(isOpen ? null : globalIdx)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-mushaf-border)]/10 transition-colors"
                  >
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">GET</span>
                    <code className="font-mono text-sm flex-1 text-start">/api/{API_VERSION}{ep.path}</code>
                    <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-[var(--color-mushaf-border)]/50 space-y-3">
                      <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                        {lang === 'ar' ? ep.description_ar : ep.description_en}
                      </p>

                      {/* Parameters */}
                      {ep.params && ep.params.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold mb-1 text-gray-500">
                            {lang === 'ar' ? 'المعاملات' : 'Parameters'}
                          </h4>
                          <div className="border border-[var(--color-mushaf-border)]/30 rounded overflow-x-auto">
                            <table className="w-full text-xs min-w-[400px]">
                              <thead>
                                <tr className="bg-[var(--color-mushaf-border)]/10">
                                  <th className="px-2 py-1 text-start">{lang === 'ar' ? 'اسم' : 'Name'}</th>
                                  <th className="px-2 py-1 text-start">{lang === 'ar' ? 'في' : 'In'}</th>
                                  <th className="px-2 py-1 text-start">{lang === 'ar' ? 'نوع' : 'Type'}</th>
                                  <th className="px-2 py-1 text-start">{lang === 'ar' ? 'مطلوب' : 'Required'}</th>
                                  <th className="px-2 py-1 text-start">{lang === 'ar' ? 'وصف' : 'Description'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ep.params.map(p => (
                                  <tr key={p.name} className="border-t border-[var(--color-mushaf-border)]/20">
                                    <td className="px-2 py-1 font-mono font-bold">{p.name}</td>
                                    <td className="px-2 py-1">{p.in}</td>
                                    <td className="px-2 py-1">{p.type}</td>
                                    <td className="px-2 py-1">{p.required ? '✅' : '—'}</td>
                                    <td className="px-2 py-1">{lang === 'ar' ? p.description_ar : p.description_en}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Response example */}
                      <div>
                        <h4 className="text-xs font-bold mb-1 text-gray-500">
                          {lang === 'ar' ? 'مثال الاستجابة' : 'Response Example'}
                        </h4>
                        <pre className="p-2 rounded bg-gray-900 text-green-400 text-xs overflow-x-auto max-h-48" dir="ltr">
                          {JSON.stringify({ ok: true, status: 200, data: ep.responseExample }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* OpenAPI Spec */}
      <div className="border-t border-[var(--color-mushaf-border)] pt-4">
        <button
          onClick={() => setShowSpec(!showSpec)}
          className="text-sm text-[var(--color-mushaf-gold)] hover:underline"
        >
          {showSpec ? '▲' : '▼'} {lang === 'ar' ? 'عرض مواصفة OpenAPI 3.0 كاملة' : 'View full OpenAPI 3.0 spec'}
        </button>
        {showSpec && (
          <pre className="mt-2 p-3 rounded bg-gray-900 text-gray-300 text-xs overflow-auto max-h-96" dir="ltr">
            {JSON.stringify(generateOpenApiSpec(), null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Playground Tab — Try endpoints live
// ═══════════════════════════════════════════════════

function PlaygroundTab({ lang, keys }: { lang: 'ar' | 'en'; keys: ApiKey[] }) {
  const activeKeys = keys.filter(k => k.active);
  const [selectedKey, setSelectedKey] = useState(activeKeys[0]?.key || '');
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedKey && activeKeys.length > 0) setSelectedKey(activeKeys[0].key);
  }, [activeKeys, selectedKey]);

  const ep = API_ENDPOINTS[selectedEndpoint];
  const pathParams = ep.params?.filter(p => p.in === 'path') || [];
  const queryParams = ep.params?.filter(p => p.in === 'query') || [];

  const buildPath = (): string => {
    let path = ep.path;
    for (const p of pathParams) {
      const val = paramValues[p.name] || p.example || '';
      path = path.replace(`:${p.name}`, val);
    }
    return `/api/${API_VERSION}${path}`;
  };

  const handleSend = async () => {
    if (!selectedKey) return;
    setLoading(true);
    setResponse(null);

    let path = ep.path;
    for (const p of pathParams) {
      const val = paramValues[p.name] || p.example || '';
      path = path.replace(`:${p.name}`, val);
    }

    const qp: Record<string, string> = {};
    for (const p of queryParams) {
      if (paramValues[p.name]) qp[p.name] = paramValues[p.name];
    }

    const res = await handleApiRequest('GET', `/api/${API_VERSION}${path}`, selectedKey, qp);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {activeKeys.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔑</div>
          <p className="text-sm text-gray-500">
            {lang === 'ar' ? 'أنشئ مفتاح API أولاً من تبويب "مفاتيح"' : 'Create an API key first from the "API Keys" tab'}
          </p>
        </div>
      ) : (
        <>
          {/* API Key selector */}
          <div>
            <label className="text-xs font-bold block mb-1">{lang === 'ar' ? 'مفتاح API' : 'API Key'}</label>
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm font-mono"
            >
              {activeKeys.map(k => (
                <option key={k.key} value={k.key}>{k.name} ({k.key.slice(0, 15)}...)</option>
              ))}
            </select>
          </div>

          {/* Endpoint selector */}
          <div>
            <label className="text-xs font-bold block mb-1">{lang === 'ar' ? 'نقطة النهاية' : 'Endpoint'}</label>
            <select
              value={selectedEndpoint}
              onChange={e => { setSelectedEndpoint(Number(e.target.value)); setParamValues({}); setResponse(null); }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm"
            >
              {API_ENDPOINTS.map((ep2, i) => (
                <option key={i} value={i}>
                  GET /api/{API_VERSION}{ep2.path} — {lang === 'ar' ? ep2.summary_ar : ep2.summary_en}
                </option>
              ))}
            </select>
          </div>

          {/* Parameters */}
          {ep.params && ep.params.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold block">{lang === 'ar' ? 'المعاملات' : 'Parameters'}</label>
              {ep.params.map(p => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold min-w-[60px]">
                    {p.name}
                    {p.required && <span className="text-red-500">*</span>}
                  </span>
                  <input
                    type="text"
                    value={paramValues[p.name] || ''}
                    onChange={e => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                    placeholder={p.example || (lang === 'ar' ? p.description_ar : p.description_en)}
                    className="flex-1 px-2 py-1 rounded border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm font-mono"
                  />
                  <span className="text-[10px] text-gray-400">{p.in}</span>
                </div>
              ))}
            </div>
          )}

          {/* Request preview */}
          <div className="p-2 rounded bg-gray-900 text-gray-300 font-mono text-xs" dir="ltr">
            <span className="text-green-400">GET</span> {buildPath()}
            {Object.entries(paramValues).filter(([k]) => queryParams.some(q => q.name === k) && paramValues[k]).length > 0 && (
              <span className="text-yellow-400">
                ?{Object.entries(paramValues)
                  .filter(([k, v]) => queryParams.some(q => q.name === k) && v)
                  .map(([k, v]) => `${k}=${v}`)
                  .join('&')}
              </span>
            )}
            <br />
            <span className="text-gray-500">X-API-Key:</span> <span className="text-blue-400">{selectedKey.slice(0, 20)}...</span>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--color-mushaf-gold)] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? (lang === 'ar' ? '⏳ جارٍ الإرسال...' : '⏳ Sending...')
              : (lang === 'ar' ? '🚀 إرسال الطلب' : '🚀 Send Request')}
          </button>

          {/* Response */}
          {response && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                  response.status >= 200 && response.status < 300 ? 'bg-green-600' :
                  response.status === 429 ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {response.status}
                </span>
                <span className="text-xs text-gray-400">
                  {lang === 'ar' ? 'الباقي:' : 'Remaining:'} {response.meta.rateLimit.remaining}/{response.meta.rateLimit.limit}
                </span>
                <span className="text-xs text-gray-400 font-mono">{response.meta.requestId}</span>
              </div>
              <pre className="p-3 rounded bg-gray-900 text-green-400 text-xs overflow-auto max-h-96" dir="ltr">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// API Keys Tab — Generate and manage keys
// ═══════════════════════════════════════════════════

function KeysTab({ lang, keys, onRefresh }: { lang: 'ar' | 'en'; keys: ApiKey[]; onRefresh: () => void }) {
  const [newKeyName, setNewKeyName] = useState('');
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    const k = createApiKey(newKeyName);
    setNewKeyName('');
    setJustCreated(k.key);
    onRefresh();
    setTimeout(() => setJustCreated(null), 10000);
  };

  return (
    <div className="space-y-4">
      {/* Create new key */}
      <div className="p-4 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
        <h3 className="font-bold text-sm mb-2">➕ {lang === 'ar' ? 'إنشاء مفتاح جديد' : 'Create New Key'}</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={lang === 'ar' ? 'اسم التطبيق أو المشروع...' : 'App or project name...'}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm"
            maxLength={50}
          />
          <button
            onClick={handleCreate}
            disabled={!newKeyName.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white font-bold text-sm disabled:opacity-50"
          >
            {lang === 'ar' ? 'إنشاء' : 'Create'}
          </button>
        </div>
        {justCreated && (
          <div className="mt-2 p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-300/50 text-sm">
            <p className="font-bold text-green-700 dark:text-green-300 mb-1">
              ✅ {lang === 'ar' ? 'تم إنشاء المفتاح! انسخه الآن — لن يظهر مرة أخرى بالكامل' : 'Key created! Copy it now — won\'t be shown in full again'}
            </p>
            <code className="block p-1.5 rounded bg-gray-900 text-green-400 text-xs font-mono break-all select-all" dir="ltr">
              {justCreated}
            </code>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="p-3 rounded-lg border border-orange-300/50 bg-orange-50 dark:bg-orange-900/20 text-xs">
        ⚠️ {lang === 'ar'
          ? 'حافظ على سرية مفاتيح API. لا تشاركها في الكود المفتوح أو على GitHub.'
          : 'Keep your API keys secret. Do not expose them in client-side code or on GitHub.'}
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {lang === 'ar' ? 'لا توجد مفاتيح بعد' : 'No API keys yet'}
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div
              key={k.key}
              className={`p-3 rounded-xl border transition-colors ${
                k.active
                  ? 'border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]'
                  : 'border-red-300/50 bg-red-50/50 dark:bg-red-900/10 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{k.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    k.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800'
                  }`}>
                    {k.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'ملغي' : 'Revoked')}
                  </span>
                </div>
                <div className="flex gap-1">
                  {k.active && (
                    <button
                      onClick={() => { revokeApiKey(k.key); onRefresh(); }}
                      className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Revoke'}
                    </button>
                  )}
                  {confirmDelete === k.key ? (
                    <button
                      onClick={() => { deleteApiKey(k.key); setConfirmDelete(null); onRefresh(); }}
                      className="px-2 py-1 rounded text-xs bg-red-600 text-white"
                    >
                      {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(k.key)}
                      className="px-2 py-1 rounded text-xs bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200"
                    >
                      {lang === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
              <code className="text-xs font-mono text-gray-400" dir="ltr">{k.key.slice(0, 15)}...{k.key.slice(-4)}</code>
              <div className="flex gap-4 mt-1 text-[10px] text-gray-400">
                <span>{lang === 'ar' ? 'طلبات:' : 'Requests:'} {k.totalRequests}</span>
                <span>{lang === 'ar' ? 'حد:' : 'Limit:'} {k.rateLimit}/{lang === 'ar' ? 'دقيقة' : 'min'}</span>
                <span>{lang === 'ar' ? 'أُنشئ:' : 'Created:'} {new Date(k.createdAt).toLocaleDateString()}</span>
                {k.lastUsedAt && <span>{lang === 'ar' ? 'آخر استخدام:' : 'Last:'} {new Date(k.lastUsedAt).toLocaleTimeString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Dashboard Tab — Usage analytics
// ═══════════════════════════════════════════════════

function DashboardTab({ lang, keys }: { lang: 'ar' | 'en'; keys: ApiKey[] }) {
  const [stats, setStats] = useState(getUsageStats());
  const [recentLog, setRecentLog] = useState<ApiUsageEntry[]>([]);
  const [filterKey, setFilterKey] = useState<string>('');

  useEffect(() => {
    setStats(getUsageStats(filterKey || undefined));
    setRecentLog(getUsageLog().slice(-20).reverse());
  }, [filterKey]);

  const handleClearLog = () => {
    clearUsageLog();
    setStats(getUsageStats());
    setRecentLog([]);
  };

  return (
    <div className="space-y-4">
      {/* Key filter */}
      {keys.length > 1 && (
        <select
          value={filterKey}
          onChange={e => setFilterKey(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-bg)] text-sm"
        >
          <option value="">{lang === 'ar' ? 'كل المفاتيح' : 'All Keys'}</option>
          {keys.map(k => (
            <option key={k.key} value={k.key.slice(0, 12) + '...'}>{k.name}</option>
          ))}
        </select>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests', value: stats.totalRequests, icon: '📊' },
          { label: lang === 'ar' ? 'آخر 24 ساعة' : 'Last 24h', value: stats.last24h, icon: '📈' },
          { label: lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days', value: stats.last7d, icon: '📅' },
          { label: lang === 'ar' ? 'متوسط الاستجابة' : 'Avg Response', value: `${stats.avgResponseTime}ms`, icon: '⚡' },
        ].map(card => (
          <div key={card.label} className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)] text-center">
            <div className="text-2xl">{card.icon}</div>
            <div className="text-xl font-bold mt-1">{card.value}</div>
            <div className="text-[10px] text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>

      {/* By endpoint */}
      {Object.keys(stats.byEndpoint).length > 0 && (
        <div className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
          <h4 className="font-bold text-sm mb-2">📍 {lang === 'ar' ? 'حسب النقطة' : 'By Endpoint'}</h4>
          <div className="space-y-1">
            {Object.entries(stats.byEndpoint)
              .sort((a, b) => b[1] - a[1])
              .map(([endpoint, count]) => (
                <div key={endpoint} className="flex items-center justify-between text-xs">
                  <code className="font-mono text-gray-500" dir="ltr">{endpoint}</code>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-[var(--color-mushaf-gold)]"
                      style={{ width: `${Math.max(8, (count / stats.totalRequests) * 150)}px` }}
                    />
                    <span className="font-bold min-w-[30px] text-end">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* By status code */}
      {Object.keys(stats.byStatus).length > 0 && (
        <div className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
          <h4 className="font-bold text-sm mb-2">🎯 {lang === 'ar' ? 'حسب الحالة' : 'By Status Code'}</h4>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stats.byStatus).map(([code, count]) => {
              const c = parseInt(code, 10);
              const color = c >= 200 && c < 300 ? 'bg-green-600' : c === 429 ? 'bg-yellow-600' : 'bg-red-600';
              return (
                <div key={code} className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold text-white ${color}`}>{code}</span>
                  <span className="text-xs">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent requests log */}
      <div className="p-3 rounded-xl border border-[var(--color-mushaf-border)] bg-[var(--color-mushaf-paper)]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm">📜 {lang === 'ar' ? 'آخر الطلبات' : 'Recent Requests'}</h4>
          {recentLog.length > 0 && (
            <button onClick={handleClearLog} className="text-xs text-red-500 hover:underline">
              {lang === 'ar' ? 'مسح السجل' : 'Clear Log'}
            </button>
          )}
        </div>
        {recentLog.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {lang === 'ar' ? 'لا توجد طلبات بعد. جرّب من تبويب "تجربة"!' : 'No requests yet. Try the Playground tab!'}
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {recentLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5 border-b border-[var(--color-mushaf-border)]/20 last:border-0">
                <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${
                  entry.status >= 200 && entry.status < 300 ? 'bg-green-600' :
                  entry.status === 429 ? 'bg-yellow-600' : 'bg-red-600'
                }`}>
                  {entry.status}
                </span>
                <code className="font-mono text-gray-500 flex-1" dir="ltr">{entry.method} {entry.endpoint}</code>
                <span className="text-gray-400">{entry.responseTime}ms</span>
                <span className="text-gray-300 text-[10px]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
