'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useOffline } from '@/lib/useOffline';

export default function OfflineIndicator() {
  const { lang } = useI18n();
  const {
    isOnline, swStatus, syncStatus, cacheReady,
    storageUsage, storagePercent,
    triggerSync, exportData, importData, refreshStorageStats,
  } = useOffline();
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const isAr = lang === 'ar';

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Status icon/color
  const statusDot = isOnline
    ? 'bg-green-500'
    : 'bg-red-500 animate-pulse';

  const statusLabel = isOnline
    ? (isAr ? 'متصل' : 'Online')
    : (isAr ? 'غير متصل' : 'Offline');

  const swLabel = {
    unsupported: isAr ? 'غير مدعوم' : 'Unsupported',
    installing: isAr ? 'جاري التثبيت...' : 'Installing...',
    waiting: isAr ? 'في الانتظار' : 'Waiting',
    active: isAr ? 'نشط' : 'Active',
    error: isAr ? 'خطأ' : 'Error',
  }[swStatus];

  // Export handler
  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mushaf-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(isAr ? 'تم التصدير بنجاح' : 'Exported successfully');
      setTimeout(() => setExportMsg(''), 3000);
    } catch {
      setExportMsg(isAr ? 'فشل التصدير' : 'Export failed');
    }
  };

  // Import handler
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const success = await importData(text);
        setExportMsg(success
          ? (isAr ? 'تم الاستيراد والدمج بنجاح' : 'Imported & merged successfully')
          : (isAr ? 'فشل الاستيراد' : 'Import failed'));
      } catch {
        setExportMsg(isAr ? 'ملف غير صالح' : 'Invalid file');
      }
      setImporting(false);
      setTimeout(() => setExportMsg(''), 3000);
    };
    input.click();
  };

  return (
    <div className="relative">
      {/* Compact status indicator */}
      <button
        onClick={() => { setExpanded(!expanded); refreshStorageStats(); }}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-colors ${
          !isOnline
            ? 'border-red-500/50 bg-red-500/10 text-red-400'
            : cacheReady
              ? 'border-green-500/30 hover:border-green-500/60'
              : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]'
        }`}
        title={`${statusLabel} | SW: ${swLabel}`}
      >
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
        {!isOnline && <span>{isAr ? 'غير متصل' : 'Offline'}</span>}
        {cacheReady && isOnline && <span>⚡</span>}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="absolute top-full left-0 right-auto mt-2 w-72 bg-[var(--color-mushaf-paper)] border border-[var(--color-mushaf-border)] rounded-xl shadow-xl p-4 z-50"
          style={{ [isAr ? 'right' : 'left']: 0, [isAr ? 'left' : 'right']: 'auto' }}
        >
          <h3 className="text-sm font-bold mb-3 text-[var(--color-mushaf-gold)]">
            {isAr ? 'حالة الاتصال والتخزين' : 'Offline & Storage Status'}
          </h3>

          {/* Network status */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <span>{isAr ? 'الشبكة' : 'Network'}</span>
            <span className={`flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
          </div>

          {/* SW status */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <span>Service Worker</span>
            <span className={swStatus === 'active' ? 'text-green-500' : swStatus === 'error' ? 'text-red-500' : 'text-yellow-500'}>
              {swLabel}
            </span>
          </div>

          {/* Cache status */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <span>{isAr ? 'التخزين المحلي' : 'Cache'}</span>
            <span className={cacheReady ? 'text-green-500' : 'text-yellow-500'}>
              {cacheReady ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'غير جاهز' : 'Not ready')}
            </span>
          </div>

          {/* Storage usage */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{isAr ? 'التخزين المستخدم' : 'Storage Used'}</span>
              <span>{formatBytes(storageUsage)} ({storagePercent}%)</span>
            </div>
            <div className="w-full bg-[var(--color-mushaf-border)] rounded-full h-1.5">
              <div
                className="bg-[var(--color-mushaf-gold)] rounded-full h-1.5 transition-all"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Sync queue */}
          {syncStatus.queueSize > 0 && (
            <div className="flex items-center justify-between mb-2 text-xs">
              <span>{isAr ? 'في انتظار المزامنة' : 'Pending sync'}</span>
              <span className="text-yellow-500">{syncStatus.queueSize}</span>
            </div>
          )}

          {syncStatus.isSyncing && (
            <div className="text-xs text-[var(--color-mushaf-gold)] mb-2 animate-pulse">
              {isAr ? 'جاري المزامنة...' : 'Syncing...'}
            </div>
          )}

          {/* Last sync */}
          {syncStatus.lastSyncAt && (
            <div className="text-xs opacity-60 mb-3">
              {isAr ? 'آخر مزامنة: ' : 'Last sync: '}
              {new Date(syncStatus.lastSyncAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-3 border-t border-[var(--color-mushaf-border)] pt-3">
            {/* Sync button */}
            {syncStatus.queueSize > 0 && isOnline && (
              <button
                onClick={triggerSync}
                disabled={syncStatus.isSyncing}
                className="w-full text-xs px-3 py-2 rounded-lg bg-[var(--color-mushaf-gold)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {isAr ? 'مزامنة الآن' : 'Sync Now'}
              </button>
            )}

            {/* Export / Import */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] transition-colors"
              >
                {isAr ? '📤 تصدير' : '📤 Export'}
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)] transition-colors disabled:opacity-50"
              >
                {importing ? '...' : (isAr ? '📥 استيراد' : '📥 Import')}
              </button>
            </div>

            {exportMsg && (
              <div className="text-xs text-center text-[var(--color-mushaf-gold)]">{exportMsg}</div>
            )}
          </div>

          {/* Offline-ready explanation */}
          <div className="mt-3 pt-3 border-t border-[var(--color-mushaf-border)] text-xs opacity-60 leading-relaxed">
            {isAr
              ? '💡 القرآن الكريم والمواضيع متاحة بدون إنترنت. التفاسير تُخزَّن بعد أول تحميل. المفضلات والتقدم يُحفظون محلياً.'
              : '💡 Quran text & topics work offline. Tafsir is cached after first view. Bookmarks & progress are saved locally.'}
          </div>
        </div>
      )}

      {/* Offline toast — appears when going offline */}
      {!isOnline && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-[999] animate-bounce">
          {isAr ? '⚡ تعمل بدون إنترنت — بياناتك محفوظة' : '⚡ Working offline — your data is saved'}
        </div>
      )}
    </div>
  );
}
