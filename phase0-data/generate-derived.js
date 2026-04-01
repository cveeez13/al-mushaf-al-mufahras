const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

// ============================================================
// Load base data
// ============================================================
const masterRaw = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_master.json'), 'utf-8'));
const quranText = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'quran_text.json'), 'utf-8'));
const qpc = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'qpc.json'), 'utf-8'));

const TOPICS = {
  1: { color: 'blue', hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" },
  2: { color: 'green', hex: '#27AE60', name_ar: 'السيرة النبوية، صفات المؤمنين، الجنة', name_en: 'Seerah, Believers, Paradise' },
  3: { color: 'brown', hex: '#8E6B3D', name_ar: 'آيات الأحكام والفقه', name_en: 'Rulings & Jurisprudence (Fiqh)' },
  4: { color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء والأمم السابقة', name_en: 'Stories of Prophets & Past Nations' },
  5: { color: 'purple', hex: '#8E44AD', name_ar: 'مكانة القرآن ورد الشبهات', name_en: 'Status of Quran & Refuting Doubts' },
  6: { color: 'orange', hex: '#E67E22', name_ar: 'اليوم الآخر، الموت، البعث، الحساب', name_en: 'Afterlife, Death, Resurrection, Judgment' },
  7: { color: 'red', hex: '#E74C3C', name_ar: 'أوصاف النار وعذاب الكافرين', name_en: 'Hellfire & Punishment of Disbelievers' },
};

// Surah names in Arabic
const SURAH_NAMES = {
  1:'الفاتحة',2:'البقرة',3:'آل عمران',4:'النساء',5:'المائدة',6:'الأنعام',7:'الأعراف',
  8:'الأنفال',9:'التوبة',10:'يونس',11:'هود',12:'يوسف',13:'الرعد',14:'إبراهيم',
  15:'الحجر',16:'النحل',17:'الإسراء',18:'الكهف',19:'مريم',20:'طه',21:'الأنبياء',
  22:'الحج',23:'المؤمنون',24:'النور',25:'الفرقان',26:'الشعراء',27:'النمل',28:'القصص',
  29:'العنكبوت',30:'الروم',31:'لقمان',32:'السجدة',33:'الأحزاب',34:'سبأ',35:'فاطر',
  36:'يس',37:'الصافات',38:'ص',39:'الزمر',40:'غافر',41:'فصلت',42:'الشورى',
  43:'الزخرف',44:'الدخان',45:'الجاثية',46:'الأحقاف',47:'محمد',48:'الفتح',49:'الحجرات',
  50:'ق',51:'الذاريات',52:'الطور',53:'النجم',54:'القمر',55:'الرحمن',56:'الواقعة',
  57:'الحديد',58:'المجادلة',59:'الحشر',60:'الممتحنة',61:'الصف',62:'الجمعة',63:'المنافقون',
  64:'التغابن',65:'الطلاق',66:'التحريم',67:'الملك',68:'القلم',69:'الحاقة',70:'المعارج',
  71:'نوح',72:'الجن',73:'المزمل',74:'المدثر',75:'القيامة',76:'الإنسان',77:'المرسلات',
  78:'النبأ',79:'النازعات',80:'عبس',81:'التكوير',82:'الانفطار',83:'المطففين',84:'الانشقاق',
  85:'البروج',86:'الطارق',87:'الأعلى',88:'الغاشية',89:'الفجر',90:'البلد',91:'الشمس',
  92:'الليل',93:'الضحى',94:'الشرح',95:'التين',96:'العلق',97:'القدر',98:'البينة',
  99:'الزلزلة',100:'العاديات',101:'القارعة',102:'التكاثر',103:'العصر',104:'الهمزة',105:'الفيل',
  106:'قريش',107:'الماعون',108:'الكوثر',109:'الكافرون',110:'النصر',111:'المسد',112:'الإخلاص',
  113:'الفلق',114:'الناس'
};

// Juz mapping: juz number → starting verse (surah:ayah)
const JUZ_STARTS = [
  [1,1],[2,142],[2,253],[3,93],[4,24],[4,148],[5,83],[6,111],[7,88],[8,41],
  [9,93],[11,6],[12,53],[15,2],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],
  [29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]
];

// Build page→verse mapping from qpc.json
const mushafPgs = qpc.mushaf_pgs;
function getPageForVerse(surah, ayah) {
  // Use the verse data from master which already has page info
  const v = masterRaw.verses.find(v => v.surah === surah && v.ayah === ayah);
  return v?.page || null;
}

// Build global ayah index
function globalAyahIndex(surah, ayah) {
  let idx = 0;
  for (let s = 1; s < surah; s++) {
    idx += SURAH_VERSE_COUNT[s];
  }
  return idx + ayah;
}

const SURAH_VERSE_COUNT = {};
for (const v of quranText) {
  SURAH_VERSE_COUNT[v.surah] = Math.max(SURAH_VERSE_COUNT[v.surah] || 0, v.ayah);
}

// ============================================================
// 1. TOPICS MASTER - Formatted per user's sample
// ============================================================
console.log('Generating formatted topics_master.json...');

const formattedVerses = masterRaw.verses.map(v => {
  const t = TOPICS[v.topic_id] || TOPICS[1];
  const qv = quranText.find(q => q.surah === v.surah && q.ayah === v.ayah);
  return {
    surah: v.surah,
    ayah: v.ayah,
    page: v.page,
    verse_key: `${v.surah}:${v.ayah}`,
    text: qv?.text || '',
    topic: {
      id: v.topic_id,
      color: t.color,
      hex: t.hex,
      name_ar: t.name_ar,
      name_en: t.name_en,
    },
    confidence: v.confidence,
    method: v.method,
  };
});

const formattedMaster = {
  metadata: masterRaw.metadata,
  topics: masterRaw.topics,
  verses: formattedVerses,
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'topics_master.json'), JSON.stringify(formattedMaster, null, 2), 'utf-8');
console.log('  ✓ topics_master.json');

// ============================================================
// 2. TOPICS BY PAGE
// ============================================================
console.log('Generating topics_by_page.json...');

const pageMap = {};
for (const v of formattedVerses) {
  if (!v.page) continue;
  if (!pageMap[v.page]) pageMap[v.page] = { page: v.page, verses: [], topic_distribution: {} };
  pageMap[v.page].verses.push({ surah: v.surah, ayah: v.ayah, topic_id: v.topic.id });
  const color = v.topic.color;
  pageMap[v.page].topic_distribution[color] = (pageMap[v.page].topic_distribution[color] || 0) + 1;
}

// Calculate dominant topic per page
for (const pg of Object.values(pageMap)) {
  const sorted = Object.entries(pg.topic_distribution).sort((a, b) => b[1] - a[1]);
  pg.dominant_topic = sorted[0]?.[0] || 'unknown';
  pg.verse_count = pg.verses.length;
}

const topicsByPage = {
  metadata: { generated: new Date().toISOString().split('T')[0], total_pages: Object.keys(pageMap).length },
  pages: Object.values(pageMap).sort((a, b) => a.page - b.page),
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'topics_by_page.json'), JSON.stringify(topicsByPage, null, 2), 'utf-8');
console.log('  ✓ topics_by_page.json');

// ============================================================
// 3. TOPICS BY SURAH
// ============================================================
console.log('Generating topics_by_surah.json...');

const surahMap = {};
for (const v of formattedVerses) {
  if (!surahMap[v.surah]) {
    surahMap[v.surah] = {
      surah: v.surah,
      name_ar: SURAH_NAMES[v.surah],
      verse_count: SURAH_VERSE_COUNT[v.surah],
      topic_distribution: {},
      dominant_topic: null,
    };
  }
  const color = v.topic.color;
  surahMap[v.surah].topic_distribution[color] = (surahMap[v.surah].topic_distribution[color] || 0) + 1;
}

for (const s of Object.values(surahMap)) {
  const sorted = Object.entries(s.topic_distribution).sort((a, b) => b[1] - a[1]);
  s.dominant_topic = sorted[0]?.[0] || 'unknown';
  // Calculate percentages
  s.topic_percentages = {};
  for (const [color, count] of Object.entries(s.topic_distribution)) {
    s.topic_percentages[color] = Math.round((count / s.verse_count) * 1000) / 10;
  }
}

const topicsBySurah = {
  metadata: { generated: new Date().toISOString().split('T')[0], total_surahs: 114 },
  surahs: Object.values(surahMap).sort((a, b) => a.surah - b.surah),
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'topics_by_surah.json'), JSON.stringify(topicsBySurah, null, 2), 'utf-8');
console.log('  ✓ topics_by_surah.json');

// ============================================================
// 4. TOPICS BY JUZ
// ============================================================
console.log('Generating topics_by_juz.json...');

function getJuz(surah, ayah) {
  for (let j = JUZ_STARTS.length - 1; j >= 0; j--) {
    const [js, ja] = JUZ_STARTS[j];
    if (surah > js || (surah === js && ayah >= ja)) return j + 1;
  }
  return 1;
}

const juzMap = {};
for (const v of formattedVerses) {
  const juz = getJuz(v.surah, v.ayah);
  if (!juzMap[juz]) juzMap[juz] = { juz, verse_count: 0, topic_distribution: {} };
  juzMap[juz].verse_count++;
  const color = v.topic.color;
  juzMap[juz].topic_distribution[color] = (juzMap[juz].topic_distribution[color] || 0) + 1;
}

for (const j of Object.values(juzMap)) {
  const sorted = Object.entries(j.topic_distribution).sort((a, b) => b[1] - a[1]);
  j.dominant_topic = sorted[0]?.[0] || 'unknown';
  j.topic_percentages = {};
  for (const [color, count] of Object.entries(j.topic_distribution)) {
    j.topic_percentages[color] = Math.round((count / j.verse_count) * 1000) / 10;
  }
}

const topicsByJuz = {
  metadata: { generated: new Date().toISOString().split('T')[0], total_juz: 30 },
  juz: Object.values(juzMap).sort((a, b) => a.juz - b.juz),
};

fs.writeFileSync(path.join(OUTPUT_DIR, 'topics_by_juz.json'), JSON.stringify(topicsByJuz, null, 2), 'utf-8');
console.log('  ✓ topics_by_juz.json');

// ============================================================
// 5. TOPIC STATISTICS
// ============================================================
console.log('Generating topic_statistics.json...');

const stats = {
  metadata: {
    generated: new Date().toISOString().split('T')[0],
    total_verses: 6236,
    total_pages: Object.keys(pageMap).length,
    total_surahs: 114,
    total_juz: 30,
  },
  classification_methods: {},
  confidence_levels: {},
  topics: [],
};

// Method stats
for (const v of masterRaw.verses) {
  stats.classification_methods[v.method] = (stats.classification_methods[v.method] || 0) + 1;
  stats.confidence_levels[v.confidence] = (stats.confidence_levels[v.confidence] || 0) + 1;
}

// Per-topic stats
for (let id = 1; id <= 7; id++) {
  const t = TOPICS[id];
  const topicVerses = masterRaw.verses.filter(v => v.topic_id === id);
  const surahsWithTopic = new Set(topicVerses.map(v => v.surah));
  const pagesWithTopic = new Set(topicVerses.map(v => v.page).filter(Boolean));
  
  stats.topics.push({
    id,
    color: t.color,
    hex: t.hex,
    name_ar: t.name_ar,
    name_en: t.name_en,
    verse_count: topicVerses.length,
    percentage: Math.round((topicVerses.length / 6236) * 1000) / 10,
    surah_count: surahsWithTopic.size,
    page_count: pagesWithTopic.size,
    confidence_breakdown: {
      high: topicVerses.filter(v => v.confidence === 'high').length,
      medium: topicVerses.filter(v => v.confidence === 'medium').length,
      low: topicVerses.filter(v => v.confidence === 'low').length,
    },
  });
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'topic_statistics.json'), JSON.stringify(stats, null, 2), 'utf-8');
console.log('  ✓ topic_statistics.json');

// ============================================================
// 6. TOPICS CSV
// ============================================================
console.log('Generating topics.csv...');

const csvHeader = 'surah,ayah,page,verse_key,topic_id,topic_color,topic_hex,topic_name_ar,topic_name_en,confidence,method\n';
const csvRows = formattedVerses.map(v =>
  [v.surah, v.ayah, v.page || '', v.verse_key, v.topic.id, v.topic.color, v.topic.hex,
   `"${v.topic.name_ar}"`, `"${v.topic.name_en}"`, v.confidence, v.method].join(',')
).join('\n');

fs.writeFileSync(path.join(OUTPUT_DIR, 'topics.csv'), '\uFEFF' + csvHeader + csvRows, 'utf-8');
console.log('  ✓ topics.csv');

// ============================================================
// Summary
// ============================================================
console.log('\n═══════════════════════════════════════════════');
console.log('All derived datasets generated successfully!');
console.log('═══════════════════════════════════════════════');
console.log(`\nOutput files in: ${OUTPUT_DIR}/`);
const files = fs.readdirSync(OUTPUT_DIR).filter(f => !f.startsWith('.'));
for (const f of files) {
  const size = (fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024).toFixed(1);
  console.log(`  ${f.padEnd(30)} ${size} KB`);
}
