const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

// Strip Arabic diacritics and normalize alef forms
function strip(text) {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\uFE70-\uFE7F\u0640]/g, '')
    .replace(/[ٱإأآ]/g, 'ا')  // normalize all alef forms
    .replace(/ؤ/g, 'و')        // waw with hamza → waw
    .replace(/ئ/g, 'ى')        // ya with hamza → ya
    .replace(/ة/g, 'ه')        // ta marbuta → ha
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// SURAH-LEVEL DOMINANT THEMES (from scholarly consensus)
// Each surah has a primary theme and optional secondary themes
// Format: { primary: topic_id, sections: [{from, to, topic}] }
// ============================================================
const SURAH_THEMES = {
  1: { primary: 1, note: 'Al-Fatiha - praise and guidance' },
  2: { primary: null, note: 'Al-Baqarah - mixed (fiqh, stories, believers, Quran)' },
  3: { primary: null, note: 'Aal-Imran - mixed' },
  4: { primary: 3, note: 'An-Nisa - mostly fiqh (women, inheritance)' },
  5: { primary: 3, note: 'Al-Maidah - mostly fiqh (food, contracts)' },
  6: { primary: 1, note: 'Al-Anam - signs of Allah, tawhid' },
  7: { primary: null, note: 'Al-Araf - mixed (stories, creation, hellfire)' },
  8: { primary: 3, note: 'Al-Anfal - jihad rulings, Badr' },
  9: { primary: null, note: 'At-Tawbah - mixed (jihad, munafiqun, rulings, stories)' },
  10: { primary: null, note: 'Yunus - mixed (stories, signs, Quran)' },
  11: { primary: 4, note: 'Hud - prophet stories' },
  12: { primary: 4, note: 'Yusuf - Yusuf story entirely' },
  13: { primary: 1, note: 'Ar-Rad - signs of Allah' },
  14: { primary: null, note: 'Ibrahim - mixed (Ibrahim, Musa stories, signs, prayer)' },
  15: { primary: null, note: 'Al-Hijr - mixed (stories, Quran, creation)' },
  16: { primary: 1, note: 'An-Nahl - signs, creation, blessings' },
  17: { primary: null, note: 'Al-Isra - mixed (Isra, rulings, Quran)' },
  18: { primary: 4, note: 'Al-Kahf - stories (cave, Musa, Dhul-Qarnayn)' },
  19: { primary: 4, note: 'Maryam - prophet stories' },
  20: { primary: 4, note: 'Taha - Musa story primarily' },
  21: { primary: 4, note: 'Al-Anbiya - many prophet stories' },
  22: { primary: null, note: 'Al-Hajj - mixed (hajj, jihad, creation)' },
  23: { primary: 2, note: 'Al-Muminun - believers qualities' },
  24: { primary: 3, note: 'An-Nur - fiqh (hijab, zina, light verse)' },
  25: { primary: 5, note: 'Al-Furqan - Quran, refutations' },
  26: { primary: null, note: 'Ash-Shuara - mixed (stories + refrain about punishment)' },
  27: { primary: null, note: 'An-Naml - mixed (stories, signs, Quran)' },
  28: { primary: null, note: 'Al-Qasas - mixed (Musa story, signs, Quran)' },
  29: { primary: null, note: 'Al-Ankabut - mixed (trials, stories, signs)' },
  30: { primary: 1, note: 'Ar-Rum - signs of Allah, prophecy' },
  31: { primary: 4, note: 'Luqman - Luqman story, wisdom' },
  32: { primary: 6, note: 'As-Sajdah - creation, resurrection' },
  33: { primary: 3, note: 'Al-Ahzab - fiqh (hijab, battle of trench)' },
  34: { primary: null, note: 'Saba - mixed (stories, signs, judgment)' },
  35: { primary: 1, note: 'Fatir - signs of creation' },
  36: { primary: null, note: 'Ya-Sin - mixed (Quran, signs, resurrection)' },
  37: { primary: null, note: 'As-Saffat - mixed (stories, afterlife, angels)' },
  38: { primary: null, note: 'Sad - mixed (Dawud/Sulayman stories, Iblees, afterlife)' },
  39: { primary: null, note: 'Az-Zumar - mixed (tawhid, afterlife, groups)' },
  40: { primary: null, note: 'Ghafir - mixed (Musa story, signs, afterlife)' },
  41: { primary: 5, note: 'Fussilat - Quran defense, signs' },
  42: { primary: 5, note: 'Ash-Shura - revelation, Quran' },
  43: { primary: null, note: 'Az-Zukhruf - mixed (stories, Quran defense, afterlife)' },
  44: { primary: 6, note: 'Ad-Dukhan - Day of Judgment, punishment' },
  45: { primary: 6, note: 'Al-Jathiyah - signs, judgment day' },
  46: { primary: null, note: 'Al-Ahqaf - mixed (stories, Quran, jinn)' },
  47: { primary: 3, note: 'Muhammad - jihad rulings' },
  48: { primary: 2, note: 'Al-Fath - victory, believers' },
  49: { primary: 3, note: 'Al-Hujurat - social ethics/rulings' },
  50: { primary: 6, note: 'Qaf - death, resurrection' },
  51: { primary: 1, note: 'Adh-Dhariyat - signs, creation' },
  52: { primary: 6, note: 'At-Tur - Day of Judgment, paradise' },
  53: { primary: 5, note: 'An-Najm - revelation, Quran' },
  54: { primary: null, note: 'Al-Qamar - mixed (stories, Quran, judgment)' },
  55: { primary: null, note: 'Ar-Rahman - mixed (blessings, creation, paradise, hellfire)' },
  56: { primary: null, note: 'Al-Waqiah - mixed (groups: righteous/paradise, wicked/hellfire)' },
  57: { primary: 1, note: 'Al-Hadid - signs, creation, charity' },
  58: { primary: 3, note: 'Al-Mujadilah - rulings (zihar, gatherings)' },
  59: { primary: 2, note: 'Al-Hashr - Banu Nadir, Allah\'s names' },
  60: { primary: 3, note: 'Al-Mumtahanah - rulings (alliances)' },
  61: { primary: 2, note: 'As-Saff - jihad, helping Allah\'s cause' },
  62: { primary: 3, note: 'Al-Jumuah - Friday prayer ruling' },
  63: { primary: 7, note: 'Al-Munafiqun - hypocrites' },
  64: { primary: 2, note: 'At-Taghabun - believers, mutual loss' },
  65: { primary: 3, note: 'At-Talaq - divorce rulings' },
  66: { primary: 3, note: 'At-Tahrim - fiqh, Prophet\'s household' },
  67: { primary: 1, note: 'Al-Mulk - creation, signs, protection' },
  68: { primary: 7, note: 'Al-Qalam - disbelievers, punishment' },
  69: { primary: 6, note: 'Al-Haqqah - Day of Judgment' },
  70: { primary: 6, note: 'Al-Maarij - Day of Judgment, patience' },
  71: { primary: 4, note: 'Nuh - Nuh\'s story' },
  72: { primary: 5, note: 'Al-Jinn - Jinn hearing Quran' },
  73: { primary: 2, note: 'Al-Muzzammil - Prophet worship' },
  74: { primary: 7, note: 'Al-Muddathir - warning, hellfire' },
  75: { primary: 6, note: 'Al-Qiyamah - resurrection' },
  76: { primary: 2, note: 'Al-Insan - paradise, believers' },
  77: { primary: 6, note: 'Al-Mursalat - Day of Judgment' },
  78: { primary: 6, note: 'An-Naba - resurrection, judgment' },
  79: { primary: 6, note: 'An-Naziat - Day of Judgment' },
  80: { primary: 2, note: 'Abasa - Prophet, Quran' },
  81: { primary: 6, note: 'At-Takwir - Day of Judgment' },
  82: { primary: 6, note: 'Al-Infitar - Day of Judgment' },
  83: { primary: 7, note: 'Al-Mutaffifin - cheaters, punishment' },
  84: { primary: 6, note: 'Al-Inshiqaq - Day of Judgment' },
  85: { primary: 7, note: 'Al-Buruj - disbelievers punishment' },
  86: { primary: 1, note: 'At-Tariq - creation, signs' },
  87: { primary: 1, note: 'Al-Ala - creation, reminder' },
  88: { primary: 6, note: 'Al-Ghashiyah - Day of Judgment, signs' },
  89: { primary: 6, note: 'Al-Fajr - past nations, Judgment' },
  90: { primary: 2, note: 'Al-Balad - good deeds, believers' },
  91: { primary: 1, note: 'Ash-Shams - signs, purification' },
  92: { primary: 2, note: 'Al-Layl - spending, good/evil' },
  93: { primary: 2, note: 'Ad-Duha - Prophet comfort' },
  94: { primary: 2, note: 'Ash-Sharh - Prophet comfort' },
  95: { primary: 1, note: 'At-Tin - creation' },
  96: { primary: 5, note: 'Al-Alaq - first revelation' },
  97: { primary: 5, note: 'Al-Qadr - Quran revelation night' },
  98: { primary: 5, note: 'Al-Bayyinah - clear evidence, Quran' },
  99: { primary: 6, note: 'Az-Zalzalah - earthquake, judgment' },
  100: { primary: 7, note: 'Al-Adiyat - ingratitude, reckoning' },
  101: { primary: 6, note: 'Al-Qariah - Day of Judgment' },
  102: { primary: 7, note: 'At-Takathur - heedlessness, warning' },
  103: { primary: 2, note: 'Al-Asr - believers, patience' },
  104: { primary: 7, note: 'Al-Humazah - punishment of slanderers' },
  105: { primary: 4, note: 'Al-Fil - story of the elephant' },
  106: { primary: 2, note: 'Quraysh - blessings, worship' },
  107: { primary: 7, note: 'Al-Maun - neglecters of prayer' },
  108: { primary: 2, note: 'Al-Kawthar - blessings to Prophet' },
  109: { primary: 5, note: 'Al-Kafirun - rejection of shirk' },
  110: { primary: 2, note: 'An-Nasr - victory, praise' },
  111: { primary: 7, note: 'Al-Masad - Abu Lahab punishment' },
  112: { primary: 1, note: 'Al-Ikhlas - tawhid/oneness' },
  113: { primary: 1, note: 'Al-Falaq - seeking refuge' },
  114: { primary: 1, note: 'An-Nas - seeking refuge' },
};

// ============================================================
// KEYWORD SCORES (weighted, specific)
// ============================================================
const KW = {
  1: [ // Blue - Allah's Power & Signs
    ['خلق السمو', 5], ['خلقكم', 2], ['سخر لكم', 4], ['والشمس والقمر', 4],
    ['الليل والنهار', 3], ['يتفكرون', 2], ['يعقلون', 1], ['يسبح', 2],
    ['سبحن', 2], ['لله ما فى', 3], ['العرش', 3], ['على كل شى قدير', 3],
    ['خلق الانسن', 3], ['فاطر', 3], ['بديع', 3], ['انبتنا', 2],
    ['لا اله الا هو', 3], ['الحى القيوم', 5], ['هو الله', 3],
    ['علم الله', 2], ['رب العلمين', 2], ['سميع عليم', 2],
    ['خبير بصير', 2], ['عزيز حكيم', 2], ['غفور رحيم', 1],
    ['من ايته', 4], ['ايات لقوم', 3], ['ومن ايته', 4],
    ['السموت والارض', 3], ['خلق كل شى', 4], ['خلقنا', 2],
    ['الم تر ان', 2], ['رب السموت', 3], ['انزل من السماء ماء', 4],
    ['تبارك', 3], ['يحيى ويميت', 4], ['اله واحد', 3],
    ['الرحمن', 3], ['علم القران', 5], ['خلق الانسن علمه', 5],
  ],
  2: [ // Green - Believers, Paradise, Seerah
    ['الذين امنوا وعملوا الصلحت', 5], ['جنت تجرى', 5], ['جنه الفردوس', 5],
    ['المتقين', 2], ['المحسنين', 2], ['صبروا', 2], ['محمد', 4],
    ['النبى', 2], ['رسوله', 1], ['المفلحون', 3], ['المومنين', 2],
    ['اجرا عظيما', 2], ['الجنه', 3], ['مغفره', 2], ['رحمتى', 2],
    ['عباد الرحمن', 3], ['التوبين', 2], ['جنت النعيم', 5],
    ['جنت عدن', 5], ['فيها انهر', 3], ['فيها خلدون', 3],
    ['فوز عظيم', 3], ['فضل عظيم', 2],
    ['اجر كبير', 2], ['عملوا الصلحت', 3],
    ['يومنون بالغيب', 5], ['يومنون بما انزل', 4],
    ['هدى للمتقين', 5], ['اولئك على هدى', 4],
  ],
  3: [ // Brown
    ['كتب عليكم', 4], ['حدود الله', 5], ['الصيام', 5], ['رمضان', 5],
    ['الحج', 4], ['العمره', 4], ['حرم عليكم', 5], ['احل لكم', 4],
    ['الزكوه', 4], ['القصاص', 5], ['الميراث', 5], ['يوصيكم', 3],
    ['الطلق', 5], ['طلقتم', 5], ['النكاح', 4], ['الربوا', 5],
    ['محصنت', 3], ['الخمر', 5], ['الميسر', 5], ['الخنزير', 5],
    ['اقيموا الصلوه', 3], ['واتوا الزكوه', 3], ['فريضه', 3],
    ['اربعه اشهر', 4], ['بالعدل', 2], ['شهدوا', 1],
  ],
  4: [ // Yellow
    ['موسى', 4], ['فرعون', 5], ['بنى اسرءيل', 5], ['ابرهيم', 4],
    ['اسمعيل', 4], ['اسحق', 4], ['يعقوب', 3], ['نوح', 4],
    ['لوط', 4], ['شعيب', 5], ['يوسف', 5], ['داوود', 4],
    ['سليمن', 4], ['ايوب', 4], ['عيسى', 4], ['مريم', 3],
    ['يحيى', 3], ['زكريا', 3], ['يونس', 3], ['ادم', 2],
    ['ابليس', 3], ['عاد', 3], ['ثمود', 4], ['مدين', 4],
    ['الايكه', 4], ['اهلكنا', 2], ['قوم نوح', 5], ['قوم لوط', 5],
    ['اصحب الكهف', 5], ['ذو القرنين', 5], ['اغرقنا', 3],
    ['قال لقومه', 3], ['الصيحه', 3], ['ارسلنا', 1],
  ],
  5: [ // Purple
    ['هذا القران', 4], ['قرانا عربيا', 5], ['لا ريب فيه', 5],
    ['تنزيل الكتب', 4], ['تنزيل من', 3], ['نزلنه', 2],
    ['افتراه', 4], ['فاتوا بسوره', 5], ['فاتوا بعشر', 5],
    ['تلك ايت الكتب', 3], ['ايت القران', 4],
    ['والقران', 4], ['القران الحكيم', 5], ['القران العظيم', 5],
    ['القران المجيد', 5], ['كتب مبين', 3], ['ذلك الكتب', 3],
    ['الم ذلك', 3],
  ],
  6: [ // Orange
    ['يوم القيمه', 5], ['يوم الدين', 4], ['الساعه', 3],
    ['يبعثون', 3], ['البعث', 4], ['ذائقه الموت', 4],
    ['ينفخ فى الصور', 5], ['نفخ فى الصور', 5], ['الحساب', 2],
    ['الميزان', 3], ['يومئذ', 2], ['يوم لا ينفع', 4],
    ['يوم تقوم الساعه', 5], ['يوم يقوم', 3],
    ['الحاقه', 5], ['القارعه', 5], ['الواقعه', 4],
    ['القيمه', 3], ['المعاد', 3], ['القبور', 3],
  ],
  7: [ // Red
    ['نار جهنم', 5], ['جهنم', 4], ['عذاب النار', 5],
    ['سعير', 4], ['سقر', 5], ['الجحيم', 5], ['الحطمه', 5],
    ['لظى', 5], ['حميم', 3], ['زقوم', 5],
    ['اصحب النار', 5], ['وقود النار', 5], ['المنفقين', 3],
    ['لعنه الله', 4], ['غضب الله', 3], ['عذابا اليما', 3],
    ['عذابا شديدا', 3], ['لهم عذاب', 2], ['ويل', 2],
    ['اصحب الشمال', 5], ['فى سموم', 5], ['وحميم', 3],
    ['ياكلون فى بطونهم نارا', 5], ['كفروا وكذبوا', 2],
  ],
};

function scoreText(text, topicId) {
  let score = 0;
  for (const [kw, weight] of KW[topicId]) {
    if (text.includes(kw)) score += weight;
  }
  return score;
}

// ============================================================
// MAIN PIPELINE: Surah themes + Keywords + Image analysis
// ============================================================
function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  HYBRID Classification: Surah + Keywords + Image  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  const quranText = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'quran_text.json'), 'utf-8'));
  const imageData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_master_v0.json'), 'utf-8'));
  
  const COLORS = {1:'blue',2:'green',3:'brown',4:'yellow',5:'purple',6:'orange',7:'red'};
  const TOPICS = {
    1: { color: 'blue', hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" },
    2: { color: 'green', hex: '#27AE60', name_ar: 'السيرة النبوية، صفات المؤمنين، الجنة', name_en: 'Seerah, Believers, Paradise' },
    3: { color: 'brown', hex: '#8E6B3D', name_ar: 'آيات الأحكام والفقه', name_en: 'Rulings & Jurisprudence (Fiqh)' },
    4: { color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء والأمم السابقة', name_en: 'Stories of Prophets & Past Nations' },
    5: { color: 'purple', hex: '#8E44AD', name_ar: 'مكانة القرآن ورد الشبهات', name_en: 'Status of Quran & Refuting Doubts' },
    6: { color: 'orange', hex: '#E67E22', name_ar: 'اليوم الآخر، الموت، البعث، الحساب', name_en: 'Afterlife, Death, Resurrection, Judgment' },
    7: { color: 'red', hex: '#E74C3C', name_ar: 'أوصاف النار وعذاب الكافرين', name_en: 'Hellfire & Punishment of Disbelievers' },
  };
  
  const results = [];
  
  for (let i = 0; i < quranText.length; i++) {
    const v = quranText[i];
    const stripped = strip(v.text);
    const surahTheme = SURAH_THEMES[v.surah];
    const imgVerse = imageData.verses.find(iv => iv.surah === v.surah && iv.ayah === v.ayah);
    
    // Score each topic using keywords
    const scores = {};
    for (let t = 1; t <= 7; t++) {
      scores[t] = scoreText(stripped, t);
    }
    
    // Also check context (±3 verses in same surah)
    const contextScores = { ...scores };
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;
      const ni = i + offset;
      if (ni < 0 || ni >= quranText.length) continue;
      if (quranText[ni].surah !== v.surah) continue;
      const nStripped = strip(quranText[ni].text);
      for (let t = 1; t <= 7; t++) {
        contextScores[t] += scoreText(nStripped, t) * 0.3;
      }
    }
    
    // Sort scores
    const sorted = Object.entries(contextScores).sort((a, b) => b[1] - a[1]);
    const kwTopicId = sorted[0][1] > 0 ? parseInt(sorted[0][0]) : null;
    const kwScore = sorted[0][1];
    const kwMargin = kwScore - (sorted[1]?.[1] || 0);
    
    // Decision logic
    let finalTopic;
    let confidence;
    let method;
    
    if (kwScore >= 8 && kwMargin >= 4) {
      // Strong keyword match
      finalTopic = kwTopicId;
      confidence = 'high';
      method = 'keyword_strong';
    } else if (kwScore >= 4 && kwMargin >= 2) {
      // Good keyword match
      finalTopic = kwTopicId;
      confidence = 'medium';
      method = 'keyword_good';
    } else if (kwScore >= 2) {
      // Weak keyword match - prefer surah theme if available
      if (surahTheme?.primary && (surahTheme.primary === kwTopicId || kwMargin < 1)) {
        finalTopic = surahTheme.primary;
        confidence = 'medium';
        method = 'surah+keyword';
      } else {
        finalTopic = kwTopicId;
        confidence = 'low';
        method = 'keyword_weak';
      }
    } else if (surahTheme?.primary) {
      // No keywords matched — use surah theme
      finalTopic = surahTheme.primary;
      confidence = 'medium';
      method = 'surah_theme';
    } else {
      // Mixed surah with no keyword match — defer to neighbor pass
      finalTopic = null;
      confidence = 'none';
      method = 'deferred';
    }
    
    results.push({
      surah: v.surah,
      ayah: v.ayah,
      page: imgVerse?.page || null,
      topic_id: finalTopic,
      topic_color: finalTopic ? COLORS[finalTopic] : null,
      confidence,
      method,
    });
  }
  
  // Fill gaps: use weighted neighbor context within same surah  
  for (let i = 0; i < results.length; i++) {
    if (results[i].topic_id) continue;
    
    // Collect classified neighbors in same surah (up to ±15 verses)
    const neighborTopics = {};
    for (let d = 1; d <= 15; d++) {
      const weight = 1.0 / d; // closer neighbors weighted more
      for (const offset of [-d, d]) {
        const ni = i + offset;
        if (ni < 0 || ni >= results.length) continue;
        if (quranText[ni].surah !== quranText[i].surah) continue;
        if (!results[ni].topic_id) continue;
        const tid = results[ni].topic_id;
        neighborTopics[tid] = (neighborTopics[tid] || 0) + weight;
      }
    }
    
    const sorted = Object.entries(neighborTopics).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      results[i].topic_id = parseInt(sorted[0][0]);
      results[i].topic_color = COLORS[results[i].topic_id];
      results[i].confidence = 'low';
      results[i].method = 'context_propagation';
    } else {
      // Last resort: image fallback
      const imgVerse = imageData.verses.find(iv => iv.surah === quranText[i].surah && iv.ayah === quranText[i].ayah);
      if (imgVerse?.topic_id) {
        results[i].topic_id = imgVerse.topic_id;
        results[i].topic_color = COLORS[imgVerse.topic_id];
        results[i].confidence = 'low';
        results[i].method = 'image_fallback';
      }
    }
  }
  
  // Stats
  const assigned = results.filter(r => r.topic_id).length;
  console.log(`Assigned: ${assigned}/${results.length} (${(assigned/results.length*100).toFixed(1)}%)\n`);
  
  const byTopic = {};
  for (const r of results) {
    if (r.topic_id) {
      const c = COLORS[r.topic_id];
      byTopic[c] = (byTopic[c] || 0) + 1;
    }
  }
  
  console.log('Distribution:');
  for (const [color, count] of Object.entries(byTopic).sort((a, b) => b[1] - a[1])) {
    const pct = (count / results.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${color.padEnd(8)}: ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  }
  
  const methodStats = {};
  for (const r of results) {
    methodStats[r.method] = (methodStats[r.method] || 0) + 1;
  }
  console.log('\nMethods used:');
  for (const [m, c] of Object.entries(methodStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m.padEnd(22)}: ${c}`);
  }
  
  // Sample verification
  console.log('\n=== Sample Verification ===');
  const samples = [
    { s: 1, a: 1, exp: 'blue' }, { s: 2, a: 3, exp: 'green' },
    { s: 2, a: 183, exp: 'brown' }, { s: 2, a: 255, exp: 'blue' },
    { s: 4, a: 11, exp: 'brown' }, { s: 12, a: 4, exp: 'yellow' },
    { s: 18, a: 60, exp: 'yellow' }, { s: 24, a: 31, exp: 'brown' },
    { s: 36, a: 1, exp: 'purple' }, { s: 55, a: 1, exp: 'blue' },
    { s: 56, a: 41, exp: 'red' }, { s: 67, a: 1, exp: 'blue' },
    { s: 75, a: 1, exp: 'orange' }, { s: 111, a: 1, exp: 'red' },
    { s: 112, a: 1, exp: 'blue' }, { s: 114, a: 1, exp: 'blue' },
  ];
  
  let correct = 0;
  for (const { s, a, exp } of samples) {
    const r = results.find(r => r.surah === s && r.ayah === a);
    const got = r?.topic_color || 'none';
    const ok = got === exp;
    if (ok) correct++;
    console.log(`  ${ok ? '✓' : '✗'} ${s}:${a} => ${got.padEnd(7)} | expected: ${exp} (${r?.method})`);
  }
  console.log(`\nSample accuracy: ${correct}/${samples.length} (${(correct/samples.length*100).toFixed(0)}%)`);
  
  // Save final output
  const output = {
    metadata: {
      version: '1.0.0',
      total_verses: 6236,
      total_topics: 7,
      source: 'tafsir.app/m-mawdou + keyword analysis + surah themes',
      last_updated: new Date().toISOString().split('T')[0],
      note: 'Hybrid classification: keyword matching + surah-level themes + image color analysis fallback. Requires cross-reference verification with PDF sources.',
    },
    topics: Object.entries(TOPICS).map(([id, t]) => ({
      id: parseInt(id),
      name_ar: t.name_ar,
      name_en: t.name_en,
      color_hex: t.hex,
      color_name: t.color,
      verse_count: byTopic[t.color] || 0,
    })),
    verses: results,
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'topics_master.json'), JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nSaved: output/topics_master.json`);
}

main();
