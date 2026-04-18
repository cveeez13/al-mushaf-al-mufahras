'use client';

import { SURAH_NAMES } from '@/lib/types';
import { getTafsir } from '@/lib/mockTafsir';

interface TafsirCornerProps {
  surah: number;
  ayah: number;
  verseKey: string;
}

export default function TafsirCorner({ surah, ayah, verseKey }: TafsirCornerProps) {
  const tafsir = getTafsir(verseKey);

  return (
    <div className="tafsir-corner" role="complementary" aria-label="التفسير المختصر">
      <div className="tafsir-corner-header">
        <span className="tafsir-corner-icon" aria-hidden="true">📖</span>
        <span className="tafsir-corner-title">التفسير المختصر</span>
      </div>
      <div className="tafsir-corner-ref">
        {SURAH_NAMES[surah]} – الآية {ayah}
      </div>
      <p className="tafsir-corner-text">{tafsir}</p>
    </div>
  );
}
