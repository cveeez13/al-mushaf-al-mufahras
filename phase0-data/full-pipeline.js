const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SCAN_DIR = path.join(__dirname, 'raw', 'scans');
const OUTPUT_DIR = path.join(__dirname, 'output');

// ============================================================
// TOPIC DEFINITIONS
// ============================================================
const TOPICS = {
  1: { color: 'blue',   hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" },
  2: { color: 'green',  hex: '#27AE60', name_ar: 'السيرة النبوية، صفات المؤمنين، الجنة', name_en: 'Seerah, Believers, Paradise' },
  3: { color: 'brown',  hex: '#8E6B3D', name_ar: 'آيات الأحكام والفقه', name_en: 'Rulings & Jurisprudence (Fiqh)' },
  4: { color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء والأمم السابقة', name_en: 'Stories of Prophets & Past Nations' },
  5: { color: 'purple', hex: '#8E44AD', name_ar: 'مكانة القرآن ورد الشبهات', name_en: 'Status of Quran & Refuting Doubts' },
  6: { color: 'orange', hex: '#E67E22', name_ar: 'اليوم الآخر، الموت، البعث، الحساب', name_en: 'Afterlife, Death, Resurrection, Judgment' },
  7: { color: 'red',    hex: '#E74C3C', name_ar: 'أوصاف النار وعذاب الكافرين', name_en: 'Hellfire & Punishment of Disbelievers' },
};

// Reference colors (HSL) from manual calibration across multiple confirmed pages
// These are the pastel BACKGROUND colors in the scanned mushaf
const COLOR_REFS_HSL = [
  // Blue backgrounds range from cool grey-blue to clear blue
  { topic_id: 1, h: 200, s: 18, l: 82, label: 'blue' },
  // Green backgrounds
  { topic_id: 2, h: 85, s: 32, l: 84, label: 'green' },
  // Brown/salmon - the fiqh pages have warm peach/salmon tint
  { topic_id: 3, h: 12, s: 50, l: 82, label: 'brown' },
  // Yellow - cream/butter color
  { topic_id: 4, h: 55, s: 40, l: 90, label: 'yellow' },
  // Purple - lavender with clear blue-purple tint
  { topic_id: 5, h: 240, s: 18, l: 81, label: 'purple' },
  // Orange - light peach (between brown and red)
  { topic_id: 6, h: 25, s: 45, l: 88, label: 'orange' },
  // Red/Pink - clear pink tint, distinguishable from brown
  { topic_id: 7, h: 340, s: 35, l: 90, label: 'red' },
];

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Circular hue distance
function hueDist(h1, h2) {
  const d = Math.abs(h1 - h2);
  return Math.min(d, 360 - d);
}

function hslDistance(h1, s1, l1, h2, s2, l2) {
  // Weighted distance giving more importance to hue
  const hDist = hueDist(h1, h2);
  return Math.sqrt((hDist * 2) ** 2 + (s1 - s2) ** 2 + (l1 - l2) ** 2);
}

function classifyColorHSL(h, s, l) {
  if (l > 96 || l < 40) return null; // Too white or too dark
  if (s < 4 && l > 88) return null;  // Unsaturated = white/grey
  
  let bestRef = null;
  let bestDist = Infinity;
  
  for (const ref of COLOR_REFS_HSL) {
    const dist = hslDistance(h, s, l, ref.h, ref.s, ref.l);
    if (dist < bestDist) {
      bestDist = dist;
      bestRef = ref;
    }
  }
  
  // Confidence based on distance (lower = more confident)
  const confidence = bestDist < 30 ? 'high' : bestDist < 50 ? 'medium' : bestDist < 70 ? 'low' : null;
  
  if (!confidence) return null;
  
  return { topic_id: bestRef.topic_id, color: bestRef.label, distance: bestDist, confidence };
}

// ============================================================
// PAGE ANALYZER
// ============================================================
async function analyzePage(pageNum) {
  const imgPath = path.join(SCAN_DIR, `${pageNum}.jpg`);
  if (!fs.existsSync(imgPath)) return null;
  
  try {
    const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels: ch } = info;
    
    // Text area (avoiding borders and decorations)
    const xStart = Math.floor(width * 0.18);
    const xEnd = Math.floor(width * 0.82);
    const yStart = Math.floor(height * 0.06);
    const yEnd = Math.floor(height * 0.84); // Stop before bottom text
    const textHeight = yEnd - yStart;
    
    // Collect colors at each Y row
    const rowClassifications = [];
    
    for (let y = yStart; y < yEnd; y += 2) {
      const bgPixels = [];
      
      for (let x = xStart; x < xEnd; x += Math.floor((xEnd - xStart) / 20)) {
        const idx = (y * width + x) * ch;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        // Only include background pixels (not text, not pure white)
        if (brightness > 155 && brightness < 252) {
          bgPixels.push({ r, g, b });
        }
      }
      
      if (bgPixels.length < 5) {
        rowClassifications.push({ y, result: null });
        continue;
      }
      
      // Use median pixel for robustness
      bgPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const med = bgPixels[Math.floor(bgPixels.length / 2)];
      const hsl = rgbToHsl(med.r, med.g, med.b);
      const result = classifyColorHSL(hsl.h, hsl.s, hsl.l);
      
      rowClassifications.push({ y, result, hsl });
    }
    
    // Build color bands using a sliding window approach
    const windowSize = 15; // ~30px window
    const bands = [];
    let i = 0;
    
    while (i < rowClassifications.length) {
      // Get votes in this window
      const window = rowClassifications.slice(i, i + windowSize);
      const votes = {};
      
      for (const row of window) {
        if (row.result) {
          const key = row.result.color;
          votes[key] = (votes[key] || 0) + 1;
        }
      }
      
      // Find winner
      let winner = null;
      let maxVotes = 0;
      for (const [color, count] of Object.entries(votes)) {
        if (count > maxVotes) {
          maxVotes = count;
          winner = color;
        }
      }
      
      if (winner && maxVotes >= windowSize * 0.3) {
        const yPos = rowClassifications[i].y;
        if (bands.length > 0 && bands[bands.length - 1].color === winner) {
          bands[bands.length - 1].yEnd = yPos + windowSize * 2;
        } else {
          bands.push({ color: winner, yStart: yPos, yEnd: yPos + windowSize * 2 });
        }
      }
      
      i += Math.floor(windowSize / 2); // Overlap windows
    }
    
    // Calculate proportions
    const result = bands.map(b => ({
      color: b.color,
      topic_id: COLOR_REFS_HSL.find(r => r.label === b.color)?.topic_id,
      startPct: ((b.yStart - yStart) / textHeight * 100).toFixed(1),
      endPct: ((b.yEnd - yStart) / textHeight * 100).toFixed(1),
      heightPct: (((b.yEnd - b.yStart) / textHeight) * 100).toFixed(1),
    }));
    
    // Merge same-color adjacent bands
    const merged = [];
    for (const band of result) {
      if (merged.length > 0 && merged[merged.length - 1].color === band.color) {
        merged[merged.length - 1].endPct = band.endPct;
        merged[merged.length - 1].heightPct = (parseFloat(band.endPct) - parseFloat(merged[merged.length - 1].startPct)).toFixed(1);
      } else if (parseFloat(band.heightPct) > 2) { // Min 2% of page
        merged.push({ ...band });
      }
    }
    
    return { page: pageNum, bands: merged };
  } catch (err) {
    return { page: pageNum, error: err.message, bands: [] };
  }
}

// ============================================================
// VERSE MAPPER
// ============================================================
function buildVerseDatabase() {
  const surahAyahCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  
  const surahNames = {
    1: {ar:'الفاتحة',en:'Al-Fatiha'},2:{ar:'البقرة',en:'Al-Baqarah'},3:{ar:'آل عمران',en:'Aal-Imran'},
    4:{ar:'النساء',en:'An-Nisa'},5:{ar:'المائدة',en:'Al-Maidah'},6:{ar:'الأنعام',en:'Al-Anam'},
    7:{ar:'الأعراف',en:'Al-Araf'},8:{ar:'الأنفال',en:'Al-Anfal'},9:{ar:'التوبة',en:'At-Tawbah'},
    10:{ar:'يونس',en:'Yunus'},11:{ar:'هود',en:'Hud'},12:{ar:'يوسف',en:'Yusuf'},
    13:{ar:'الرعد',en:'Ar-Rad'},14:{ar:'إبراهيم',en:'Ibrahim'},15:{ar:'الحجر',en:'Al-Hijr'},
    16:{ar:'النحل',en:'An-Nahl'},17:{ar:'الإسراء',en:'Al-Isra'},18:{ar:'الكهف',en:'Al-Kahf'},
    19:{ar:'مريم',en:'Maryam'},20:{ar:'طه',en:'Taha'},21:{ar:'الأنبياء',en:'Al-Anbiya'},
    22:{ar:'الحج',en:'Al-Hajj'},23:{ar:'المؤمنون',en:'Al-Muminun'},24:{ar:'النور',en:'An-Nur'},
    25:{ar:'الفرقان',en:'Al-Furqan'},26:{ar:'الشعراء',en:'Ash-Shuara'},27:{ar:'النمل',en:'An-Naml'},
    28:{ar:'القصص',en:'Al-Qasas'},29:{ar:'العنكبوت',en:'Al-Ankabut'},30:{ar:'الروم',en:'Ar-Rum'},
    31:{ar:'لقمان',en:'Luqman'},32:{ar:'السجدة',en:'As-Sajdah'},33:{ar:'الأحزاب',en:'Al-Ahzab'},
    34:{ar:'سبأ',en:'Saba'},35:{ar:'فاطر',en:'Fatir'},36:{ar:'يس',en:'Ya-Sin'},
    37:{ar:'الصافات',en:'As-Saffat'},38:{ar:'ص',en:'Sad'},39:{ar:'الزمر',en:'Az-Zumar'},
    40:{ar:'غافر',en:'Ghafir'},41:{ar:'فصلت',en:'Fussilat'},42:{ar:'الشورى',en:'Ash-Shura'},
    43:{ar:'الزخرف',en:'Az-Zukhruf'},44:{ar:'الدخان',en:'Ad-Dukhan'},45:{ar:'الجاثية',en:'Al-Jathiyah'},
    46:{ar:'الأحقاف',en:'Al-Ahqaf'},47:{ar:'محمد',en:'Muhammad'},48:{ar:'الفتح',en:'Al-Fath'},
    49:{ar:'الحجرات',en:'Al-Hujurat'},50:{ar:'ق',en:'Qaf'},51:{ar:'الذاريات',en:'Adh-Dhariyat'},
    52:{ar:'الطور',en:'At-Tur'},53:{ar:'النجم',en:'An-Najm'},54:{ar:'القمر',en:'Al-Qamar'},
    55:{ar:'الرحمن',en:'Ar-Rahman'},56:{ar:'الواقعة',en:'Al-Waqiah'},57:{ar:'الحديد',en:'Al-Hadid'},
    58:{ar:'المجادلة',en:'Al-Mujadilah'},59:{ar:'الحشر',en:'Al-Hashr'},60:{ar:'الممتحنة',en:'Al-Mumtahanah'},
    61:{ar:'الصف',en:'As-Saff'},62:{ar:'الجمعة',en:'Al-Jumuah'},63:{ar:'المنافقون',en:'Al-Munafiqun'},
    64:{ar:'التغابن',en:'At-Taghabun'},65:{ar:'الطلاق',en:'At-Talaq'},66:{ar:'التحريم',en:'At-Tahrim'},
    67:{ar:'الملك',en:'Al-Mulk'},68:{ar:'القلم',en:'Al-Qalam'},69:{ar:'الحاقة',en:'Al-Haqqah'},
    70:{ar:'المعارج',en:'Al-Maarij'},71:{ar:'نوح',en:'Nuh'},72:{ar:'الجن',en:'Al-Jinn'},
    73:{ar:'المزمل',en:'Al-Muzzammil'},74:{ar:'المدثر',en:'Al-Muddathir'},75:{ar:'القيامة',en:'Al-Qiyamah'},
    76:{ar:'الإنسان',en:'Al-Insan'},77:{ar:'المرسلات',en:'Al-Mursalat'},78:{ar:'النبأ',en:'An-Naba'},
    79:{ar:'النازعات',en:'An-Naziat'},80:{ar:'عبس',en:'Abasa'},81:{ar:'التكوير',en:'At-Takwir'},
    82:{ar:'الانفطار',en:'Al-Infitar'},83:{ar:'المطففين',en:'Al-Mutaffifin'},84:{ar:'الانشقاق',en:'Al-Inshiqaq'},
    85:{ar:'البروج',en:'Al-Buruj'},86:{ar:'الطارق',en:'At-Tariq'},87:{ar:'الأعلى',en:'Al-Ala'},
    88:{ar:'الغاشية',en:'Al-Ghashiyah'},89:{ar:'الفجر',en:'Al-Fajr'},90:{ar:'البلد',en:'Al-Balad'},
    91:{ar:'الشمس',en:'Ash-Shams'},92:{ar:'الليل',en:'Al-Layl'},93:{ar:'الضحى',en:'Ad-Duha'},
    94:{ar:'الشرح',en:'Ash-Sharh'},95:{ar:'التين',en:'At-Tin'},96:{ar:'العلق',en:'Al-Alaq'},
    97:{ar:'القدر',en:'Al-Qadr'},98:{ar:'البينة',en:'Al-Bayyinah'},99:{ar:'الزلزلة',en:'Az-Zalzalah'},
    100:{ar:'العاديات',en:'Al-Adiyat'},101:{ar:'القارعة',en:'Al-Qariah'},102:{ar:'التكاثر',en:'At-Takathur'},
    103:{ar:'العصر',en:'Al-Asr'},104:{ar:'الهمزة',en:'Al-Humazah'},105:{ar:'الفيل',en:'Al-Fil'},
    106:{ar:'قريش',en:'Quraysh'},107:{ar:'الماعون',en:'Al-Maun'},108:{ar:'الكوثر',en:'Al-Kawthar'},
    109:{ar:'الكافرون',en:'Al-Kafirun'},110:{ar:'النصر',en:'An-Nasr'},111:{ar:'المسد',en:'Al-Masad'},
    112:{ar:'الإخلاص',en:'Al-Ikhlas'},113:{ar:'الفلق',en:'Al-Falaq'},114:{ar:'الناس',en:'An-Nas'},
  };
  
  // Build global ayah index
  const verses = [];
  let globalIdx = 1;
  for (let s = 0; s < 114; s++) {
    for (let a = 1; a <= surahAyahCounts[s]; a++) {
      verses.push({
        globalIndex: globalIdx,
        surah: s + 1,
        ayah: a,
        surah_name_ar: surahNames[s + 1]?.ar || '',
        surah_name_en: surahNames[s + 1]?.en || '',
      });
      globalIdx++;
    }
  }
  
  return { verses, surahAyahCounts, surahNames };
}

function buildPageMap() {
  const qpc = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'qpc.json'), 'utf-8'));
  const pages = [];
  
  for (let p = 0; p < qpc.mushaf_pgs.length; p++) {
    const startAyah = qpc.mushaf_pgs[p];
    const endAyah = p < qpc.mushaf_pgs.length - 1 ? qpc.mushaf_pgs[p + 1] - 1 : 6236;
    pages.push({
      page: p + 1,
      startGlobalAyah: startAyah,
      endGlobalAyah: endAyah,
      verseCount: endAyah - startAyah + 1
    });
  }
  
  return pages;
}

// ============================================================
// MAIN PIPELINE
// ============================================================
async function runFullPipeline() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  Al-Mushaf Al-Mufahras - Color Analyzer  ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  // 1. Build verse database
  const { verses } = buildVerseDatabase();
  console.log(`Total verses: ${verses.length}`);
  
  // 2. Build page map
  const pageMap = buildPageMap();
  console.log(`Total pages: ${pageMap.length}`);
  
  // 3. Analyze all available pages
  const scanFiles = fs.readdirSync(SCAN_DIR).filter(f => f.endsWith('.jpg')).length;
  console.log(`Available scans: ${scanFiles}/604`);
  
  if (scanFiles < 600) {
    console.log('WARNING: Not all pages downloaded yet. Processing available pages...');
  }
  
  const pageResults = [];
  let processedCount = 0;
  
  for (const pg of pageMap) {
    const result = await analyzePage(pg.page);
    if (result && !result.error) {
      pageResults.push(result);
    } else {
      pageResults.push({ page: pg.page, bands: [], error: result?.error || 'missing' });
    }
    
    processedCount++;
    if (processedCount % 50 === 0) {
      process.stdout.write(`  Analyzed ${processedCount}/${pageMap.length} pages\r`);
    }
  }
  console.log(`\nAnalyzed ${processedCount} pages`);
  
  // 4. Assign topics to verses based on page color bands
  let assignedCount = 0;
  let uncertainCount = 0;
  
  for (const pg of pageMap) {
    const pageResult = pageResults.find(r => r.page === pg.page);
    const bands = pageResult?.bands || [];
    
    // Get verses on this page
    const pageVerses = verses.filter(v => 
      v.globalIndex >= pg.startGlobalAyah && v.globalIndex <= pg.endGlobalAyah
    );
    
    if (bands.length === 0) {
      // No color detected — mark as unassigned
      for (const v of pageVerses) {
        v.topic_id = null;
        v.confidence = 'none';
        v.page = pg.page;
      }
      uncertainCount += pageVerses.length;
      continue;
    }
    
    if (bands.length === 1) {
      // Single color page — all verses get the same topic
      for (const v of pageVerses) {
        v.topic_id = bands[0].topic_id;
        v.topic_color = bands[0].color;
        v.confidence = 'high';
        v.page = pg.page;
      }
      assignedCount += pageVerses.length;
      continue;
    }
    
    // Multi-color page — distribute verses proportionally
    const totalVerses = pageVerses.length;
    let verseIdx = 0;
    
    // Calculate total band height percentage
    const totalBandPct = bands.reduce((s, b) => s + parseFloat(b.heightPct), 0);
    
    for (const band of bands) {
      const bandShare = parseFloat(band.heightPct) / totalBandPct;
      const versesInBand = Math.max(1, Math.round(totalVerses * bandShare));
      
      for (let i = 0; i < versesInBand && verseIdx < totalVerses; i++) {
        pageVerses[verseIdx].topic_id = band.topic_id;
        pageVerses[verseIdx].topic_color = band.color;
        pageVerses[verseIdx].confidence = 'medium'; // Multi-color pages are less certain
        pageVerses[verseIdx].page = pg.page;
        verseIdx++;
      }
    }
    
    // Assign remaining verses to last band
    while (verseIdx < totalVerses) {
      pageVerses[verseIdx].topic_id = bands[bands.length - 1].topic_id;
      pageVerses[verseIdx].topic_color = bands[bands.length - 1].color;
      pageVerses[verseIdx].confidence = 'low';
      pageVerses[verseIdx].page = pg.page;
      verseIdx++;
    }
    
    assignedCount += totalVerses;
  }
  
  // 5. Statistics
  const stats = {
    total: verses.length,
    assigned: verses.filter(v => v.topic_id).length,
    unassigned: verses.filter(v => !v.topic_id).length,
    high_confidence: verses.filter(v => v.confidence === 'high').length,
    medium_confidence: verses.filter(v => v.confidence === 'medium').length,
    low_confidence: verses.filter(v => v.confidence === 'low').length,
    by_topic: {},
  };
  
  for (const [id, topic] of Object.entries(TOPICS)) {
    stats.by_topic[topic.color] = verses.filter(v => v.topic_id === parseInt(id)).length;
  }
  
  console.log('\n=== RESULTS ===');
  console.log(`Assigned: ${stats.assigned} / ${stats.total} (${(stats.assigned/stats.total*100).toFixed(1)}%)`);
  console.log(`Unassigned: ${stats.unassigned}`);
  console.log(`High confidence: ${stats.high_confidence}`);
  console.log(`Medium confidence: ${stats.medium_confidence}`);
  console.log(`Low confidence: ${stats.low_confidence}`);
  console.log('\nBy topic:');
  for (const [color, count] of Object.entries(stats.by_topic)) {
    console.log(`  ${color.padEnd(8)}: ${count} verses (${(count/stats.total*100).toFixed(1)}%)`);
  }
  
  // 6. Save results
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Save raw page analysis
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page_colors.json'),
    JSON.stringify(pageResults, null, 2),
    'utf-8'
  );
  
  // Save complete verse-topic mapping
  const output = {
    metadata: {
      version: '0.1.0',
      total_verses: verses.length,
      total_topics: 7,
      source: 'tafsir.app/m-mawdou (color analysis)',
      generated: new Date().toISOString(),
      note: 'Auto-generated via image color analysis. Requires manual verification.',
    },
    topics: Object.entries(TOPICS).map(([id, t]) => ({
      id: parseInt(id),
      name_ar: t.name_ar,
      name_en: t.name_en,
      color_hex: t.hex,
      color_name: t.color,
      verse_count: stats.by_topic[t.color] || 0,
    })),
    verses: verses.map(v => ({
      surah: v.surah,
      ayah: v.ayah,
      page: v.page,
      topic_id: v.topic_id,
      topic_color: v.topic_color || null,
      confidence: v.confidence || 'none',
    })),
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'topics_master_v0.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
  
  console.log(`\nSaved to ${OUTPUT_DIR}/topics_master_v0.json`);
  console.log(`Saved page analysis to ${OUTPUT_DIR}/page_colors.json`);
  
  return stats;
}

runFullPipeline().catch(console.error);
