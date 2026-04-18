'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SURAH_NAMES, TOPICS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import {
  renderShareImage,
  downloadShareImage,
  shareImage,
  TEMPLATES,
  type ShareVerseData,
  type TemplateName,
} from '@/lib/shareImage';

interface ShareImagePanelProps {
  surah: number;
  ayah: number;
  text: string;
  topicColor: string;
  topicId: number;
  onClose: () => void;
}

export default function ShareImagePanel({
  surah, ayah, text, topicColor, topicId, onClose,
}: ShareImagePanelProps) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<TemplateName>('classic');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const verseData: ShareVerseData = useMemo(() => ({
    surah, ayah, text,
    topic_color: topicColor,
    topic_id: topicId,
  }), [surah, ayah, text, topicColor, topicId]);

  const topicHex = Object.values(TOPICS).find(t => t.color === topicColor)?.hex || '#B8860B';

  // Check Web Share support
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // Render preview whenever template changes
  const renderPreview = useCallback(() => {
    const canvas = renderShareImage(verseData, template);
    canvasRef.current = canvas;
    // Create scaled preview
    const url = canvas.toDataURL('image/png');
    setPreviewUrl(url);
  }, [template, verseData]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const filename = `quran-${surah}-${ayah}-${template}.png`;
    await downloadShareImage(canvasRef.current, filename);
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    setSharing(true);
    await shareImage(canvasRef.current, verseData);
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--color-mushaf-paper)] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-mushaf-border)] flex items-center justify-between">
          <h2 className="font-bold text-[var(--color-mushaf-gold)] font-[var(--font-arabic)]">
            {ar ? 'مشاركة الآية كصورة' : 'Share Verse as Image'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-mushaf-border)]/30 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Verse info */}
        <div className="px-5 py-3 border-b border-[var(--color-mushaf-border)]/30">
          <div className="flex items-center gap-2 text-sm text-[var(--color-mushaf-text)]/60">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: topicHex }}
            />
            <span>{SURAH_NAMES[surah]} : {ayah}</span>
          </div>
          <p className="font-[var(--font-arabic)] text-sm mt-1 line-clamp-2 leading-relaxed">
            {text}
          </p>
        </div>

        {/* Template selector */}
        <div className="px-5 py-3">
          <div className="text-xs text-[var(--color-mushaf-text)]/50 mb-2">
            {ar ? 'اختر التصميم' : 'Choose template'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  template === t.id
                    ? 'border-[var(--color-mushaf-gold)] bg-[var(--color-mushaf-gold)]/10 text-[var(--color-mushaf-gold)] shadow-sm'
                    : 'border-[var(--color-mushaf-border)] hover:border-[var(--color-mushaf-gold)]/50'
                }`}
              >
                <div className="mb-0.5">
                  {t.id === 'classic' ? '📜' : t.id === 'modern' ? '🎨' : t.id === 'gradient' ? '🌈' : t.id === 'minimal' ? '◻️' : t.id === 'bordered' ? '🖼️' : '🌙'}
                </div>
                {ar ? t.name_ar : t.name_en}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div ref={previewRef} className="px-5 py-3">
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-[var(--color-mushaf-border)] shadow-inner">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[var(--color-mushaf-border)]/30 flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 rounded-xl bg-[var(--color-mushaf-gold)] text-white font-medium hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {ar ? 'تحميل PNG' : 'Download PNG'}
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-mushaf-gold)] text-[var(--color-mushaf-gold)] font-medium hover:bg-[var(--color-mushaf-gold)]/10 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {sharing ? (ar ? 'جارٍ...' : 'Sharing...') : (ar ? 'مشاركة' : 'Share')}
            </button>
          )}
        </div>

        {/* Tip */}
        <div className="px-5 pb-4 text-[10px] text-[var(--color-mushaf-text)]/30 text-center">
          {ar ? 'الصورة بدقة 1080×1080 بكسل — مثالية لإنستجرام وتويتر' : 'Image is 1080×1080px — ideal for Instagram & Twitter'}
        </div>
      </div>
    </div>
  );
}
