'use client';

import { useEffect, useState } from 'react';

interface QiraatVariant {
  verse_key: string;
  surah: number;
  ayah: number;
  readings: Record<string, string>;
  diff_type: string;
  notes_ar: string;
  notes_en: string;
}

interface QiraatData {
  readers: Record<string, { name_ar: string; region: string }>;
  variants: QiraatVariant[];
}

interface QiraatCornerProps {
  verseKey: string;
}

let cachedQiraat: QiraatData | null = null;

export default function QiraatCorner({ verseKey }: QiraatCornerProps) {
  const [data, setData] = useState<QiraatData | null>(cachedQiraat);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (cachedQiraat) { setData(cachedQiraat); return; }
    fetch('/data/qiraat_data.json')
      .then(r => r.json())
      .then((d: QiraatData) => { cachedQiraat = d; setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const variant = data.variants.find(v => v.verse_key === verseKey);
  if (!variant) return null;

  const readers = Object.entries(variant.readings).slice(0, expanded ? undefined : 3);

  return (
    <div className="qiraat-corner" role="complementary" aria-label="القراءات">
      <div className="qiraat-corner-header">
        <span className="qiraat-corner-icon" aria-hidden="true">🔊</span>
        <span className="qiraat-corner-title">القراءات</span>
      </div>
      <div className="qiraat-corner-list">
        {readers.map(([readerId, text]) => {
          const reader = data.readers[readerId];
          return (
            <div key={readerId} className="qiraat-reading">
              <span className="qiraat-reader-name">{reader?.name_ar || readerId}</span>
              <span className="qiraat-reader-text">{text}</span>
            </div>
          );
        })}
      </div>
      {variant.notes_ar && (
        <p className="qiraat-corner-note">{variant.notes_ar}</p>
      )}
      {Object.keys(variant.readings).length > 3 && (
        <button
          className="qiraat-toggle"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? 'عرض أقل' : `عرض الكل (${Object.keys(variant.readings).length})`}
        </button>
      )}
    </div>
  );
}
