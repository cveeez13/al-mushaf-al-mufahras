const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

// ============================================================
// KEYWORD-BASED TOPIC CLASSIFICATION
// ============================================================

// Topic 1: BLUE - Signs of Allah's Power & Greatness (دلائل قدرة الله وعظمته)
// Creation, natural phenomena, miracles, Allah's attributes
const BLUE_KEYWORDS = [
  'خلق', 'السمٰو', 'سمٰوٰت', 'الأرض', 'ٱلسَّمَـٰوَ', 'ٱلْأَرْض',
  'ربكم', 'ربك', 'شمس', 'قمر', 'أنزل من السماء', 'ماء', 'أنبت',
  'جعل', 'فاطر', 'بديع', 'سخر', 'ليل', 'نهار', 'نجوم',
  'رحمٰن', 'رحيم', 'علىٰ كل شىء قدير',
  'سبحٰن', 'يسبح', 'تسبح', 'لله ما فى',
  'عرش', 'كرسى', 'ملك', 'ملكوت',
  'خٰلق', 'مصور', 'بارئ',
  'رزق', 'أنعٰم', 'نعمة', 'نعمت',
  'ءايٰت', 'ءاية', 'يتفكرون', 'يعقلون',
  'بحر', 'فلك', 'جبال', 'جبل', 'أنهٰر',
  'مطر', 'سحاب', 'رياح', 'رعد', 'برق',
  'ظلمٰت', 'نور', 'يخرج الحى',
];

// Topic 2: GREEN - Seerah, Believers' Attributes, Paradise
const GREEN_KEYWORDS = [
  'ءامنوا', 'مؤمن', 'مؤمنين', 'مؤمنٰت', 'ٱلَّذِينَ ءَامَنُو',
  'جنٰت', 'جنة', 'الجنة', 'جنتين', 'فردوس',
  'تقو', 'متقين', 'اتقو',
  'صٰلح', 'صالحٰت', 'صٰلحًا',
  'محسنين', 'إحسان', 'أحسنوا',
  'رسول', 'ٱلرَّسُول', 'النبى', 'نبيه', 'محمد',
  'تابوا', 'توبة', 'استغفر', 'يغفر', 'مغفرة', 'رحمة',
  'صبر', 'صابرين', 'صبروا',
  'أجر', 'ثواب', 'حسنة', 'حسنات',
  'ذكر الله', 'يذكرون', 'صلوٰت', 'صلاة', 'يصلون',
  'بشر', 'بشرى', 'فلاح', 'مفلحون', 'فوز',
  'خير', 'فضل', 'بركة',
  'عهد', 'وعد', 'وعده',
  'كتب عليكم', 'أنزلنا', 'هدى',
];

// Topic 3: BROWN - Rulings & Jurisprudence (Fiqh)
const BROWN_KEYWORDS = [
  'حرم', 'حلٰل', 'حلل', 'فرض', 'أحل', 'أحلت',
  'كتب عليكم', 'فريضة', 'حدود الله',
  'صيام', 'صوم', 'رمضان',
  'حج', 'عمرة', 'بيت', 'الكعبة', 'مناسك',
  'زكوٰة', 'زكاة', 'صدقٰت', 'إنفاق',
  'نكاح', 'زوج', 'أزوٰج', 'طلاق', 'طلقتم', 'عدة',
  'ميراث', 'وارث', 'وصية', 'ترك',
  'قصاص', 'قتل', 'حد', 'رجم',
  'بيع', 'تجٰرة', 'ربوا', 'ربٰ', 'دين',
  'شهادة', 'شهيد', 'شهداء',
  'يمين', 'نذر', 'كفارة', 'عقد',
  'محصنٰت', 'نساء', 'أمهٰت',
  'يتٰمى', 'يتيم',
  'واجب', 'لا يحل', 'لا تقربوا',
  'طعام', 'أكل', 'ذبح', 'خنزير', 'خمر', 'ميسر',
  'جهاد', 'قتال', 'قاتلوا', 'سبيل الله',
];

// Topic 4: YELLOW - Stories of Prophets & Past Nations
const YELLOW_KEYWORDS = [
  'موسى', 'فرعون', 'بنى إسرٰءيل',
  'إبرٰهيم', 'إبرٰهم', 'إسمٰعيل', 'إسحٰق', 'يعقوب',
  'نوح', 'هود', 'صٰلح', 'لوط', 'شعيب',
  'يوسف', 'داوود', 'سليمٰن', 'أيوب',
  'عيسى', 'مريم', 'يحيى', 'زكريا',
  'يونس', 'إلياس', 'اليسع', 'ذا الكفل',
  'ءادم', 'إبليس', 'سجدوا',
  'قرية', 'قرون', 'قوم', 'أهلكنا',
  'قصص', 'قص', 'نبأ', 'خبر',
  'عاد', 'ثمود', 'مدين', 'الأيكة',
  'أرسلنا', 'رسلنا', 'رسلهم',
  'فأخذ', 'أغرقنا', 'دمرنا', 'صيحة',
  'قال لقومه', 'ألا تتقون',
  'كذبوا', 'كذب', 'فكذبوه',
  'أصحٰب', 'الكهف', 'ذو القرنين',
  'طوفان', 'سفينة',
];

// Topic 5: PURPLE - Status of Quran & Refuting Doubts
const PURPLE_KEYWORDS = [
  'قرءان', 'كتٰب', 'الكتب', 'تنزيل', 'أنزلنا', 'أنزل إليك',
  'الم', 'الر', 'حم', 'طسم', 'كهيعص', 'طس', 'يس', 'ص', 'ق', 'ن',
  'سورة', 'ءاياتنا', 'ءايٰت',
  'تلاوة', 'يتلوا', 'اتل',
  'مثل', 'أمثال', 'ضرب',
  'يقولون', 'قالوا ٱفتراه', 'سحر', 'كاهن', 'شاعر', 'مجنون',
  'يكفرون بـ', 'كفروا بـ',
  'حق', 'الحق', 'لا ريب',
  'تبين', 'بينات', 'برهان',
  'ذكر', 'ذكرى', 'عبرة', 'موعظة',
  'حكمة', 'حكم الله',
  'نزل', 'ننزل', 'أنزلناه',
  'إعجاز', 'لن يأتوا بمثله',
  'فرقان', 'ميزان', 'صراط',
];

// Topic 6: ORANGE - Afterlife, Death, Resurrection, Judgment
const ORANGE_KEYWORDS = [
  'يوم القيمة', 'القيمة', 'يوم الدين',
  'البعث', 'يبعث', 'بعثر', 'نشر',
  'حساب', 'يحاسب', 'حسيب', 'موقف',
  'ميزان', 'وزن', 'موازين',
  'صراط', 'صرٰط', 'سراط',
  'الساعة', 'يوم يقوم', 'يومئذ',
  'موت', 'يموت', 'ذائقة الموت',
  'قبر', 'قبور', 'برزخ',
  'صور', 'ينفخ', 'نفخ',
  'حشر', 'يحشر', 'محشر',
  'يوم تجد', 'يوم لا ينفع', 'يوم لا تملك',
  'كتٰبه', 'يقرأ كتبه',
  'يوم تبيض', 'يوم تشهد',
  'ينادى', 'أذن المؤذن',
  'الحاقة', 'القارعة', 'الواقعة',
];

// Topic 7: RED - Hellfire & Punishment of Disbelievers
const RED_KEYWORDS = [
  'نار', 'النار', 'جهنم', 'سعير', 'سقر', 'الجحيم', 'الحطمة', 'لظى',
  'عذاب', 'عذابا', 'يعذب', 'معذبين',
  'خٰلدين فيها', 'خلود', 'أبدا',
  'كٰفرين', 'كفروا', 'كفر', 'كفار',
  'منٰفقين', 'نافق', 'نفاق',
  'ظٰلمين', 'ظلم', 'ظلموا',
  'مشركين', 'أشركوا', 'شرك',
  'فٰسقين', 'فسق', 'فاسق',
  'ويل', 'شقى', 'أشقياء',
  'حميم', 'غسلين', 'زقوم',
  'سلٰسل', 'أغلٰل', 'يغل',
  'لعن', 'لعنة', 'ملعون',
  'غضب', 'سخط',
];

// ============================================================
// SCORING SYSTEM
// ============================================================
function scoreVerse(verseText, keywords) {
  let score = 0;
  const normalizedText = verseText;
  
  for (const kw of keywords) {
    if (normalizedText.includes(kw)) {
      score += 1;
    }
  }
  
  return score;
}

function classifyVerseByText(verseText) {
  const scores = {
    1: scoreVerse(verseText, BLUE_KEYWORDS),   // blue
    2: scoreVerse(verseText, GREEN_KEYWORDS),   // green
    3: scoreVerse(verseText, BROWN_KEYWORDS),   // brown
    4: scoreVerse(verseText, YELLOW_KEYWORDS),  // yellow
    5: scoreVerse(verseText, PURPLE_KEYWORDS),  // purple
    6: scoreVerse(verseText, ORANGE_KEYWORDS),  // orange
    7: scoreVerse(verseText, RED_KEYWORDS),     // red
  };
  
  // Find max score
  let maxScore = 0;
  let maxTopic = null;
  
  for (const [topicId, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxTopic = parseInt(topicId);
    }
  }
  
  if (maxScore === 0) return { topic_id: null, score: 0, method: 'text', confidence: 'none' };
  
  // Check if there's a clear winner (not tied)
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const margin = sortedScores[0] - (sortedScores[1] || 0);
  
  const confidence = margin >= 2 ? 'high' : margin >= 1 ? 'medium' : 'low';
  
  return { topic_id: maxTopic, score: maxScore, margin, method: 'text', confidence };
}

// ============================================================
// CONTEXT-AWARE CLASSIFICATION
// ============================================================
// Many verses are short and don't contain keywords.
// Use surrounding verse context (same surah) to improve classification.
function classifyWithContext(verses, idx) {
  const verse = verses[idx];
  const result = classifyVerseByText(verse.text);
  
  // If text classification is confident, use it
  if (result.confidence === 'high') return result;
  
  // Look at surrounding verses (±3 window) for context
  const contextScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  
  for (let offset = -3; offset <= 3; offset++) {
    const neighborIdx = idx + offset;
    if (neighborIdx < 0 || neighborIdx >= verses.length) continue;
    if (verses[neighborIdx].surah !== verse.surah) continue; // Same surah only
    
    const weight = offset === 0 ? 3 : (4 - Math.abs(offset)); // Current verse has higher weight
    const neighborResult = classifyVerseByText(verses[neighborIdx].text);
    
    if (neighborResult.topic_id) {
      contextScores[neighborResult.topic_id] += weight * neighborResult.score;
    }
  }
  
  // Find best topic from context
  let bestTopic = null;
  let bestScore = 0;
  
  for (const [topicId, score] of Object.entries(contextScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTopic = parseInt(topicId);
    }
  }
  
  if (bestScore > 0) {
    const sortedScores = Object.values(contextScores).sort((a, b) => b - a);
    const margin = sortedScores[0] - (sortedScores[1] || 0);
    const confidence = margin >= 5 ? 'high' : margin >= 2 ? 'medium' : 'low';
    
    return { topic_id: bestTopic, score: bestScore, margin, method: 'context', confidence };
  }
  
  return { topic_id: null, score: 0, method: 'none', confidence: 'none' };
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Text-Based Topic Classification Pipeline    ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  
  // Load Quran text
  const quranText = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'quran_text.json'), 'utf-8'));
  console.log(`Loaded ${quranText.length} verses`);
  
  // Load image-based classification (v0)
  const imageClassification = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_master_v0.json'), 'utf-8'));
  
  // Classify each verse by text + context
  const textResults = [];
  
  for (let i = 0; i < quranText.length; i++) {
    const result = classifyWithContext(quranText, i);
    textResults.push({
      surah: quranText[i].surah,
      ayah: quranText[i].ayah,
      text: quranText[i].text,
      ...result,
    });
  }
  
  // Stats
  const textAssigned = textResults.filter(r => r.topic_id).length;
  console.log(`\nText classification: ${textAssigned}/${quranText.length} assigned (${(textAssigned/quranText.length*100).toFixed(1)}%)`);
  
  const textByTopic = {};
  for (const r of textResults) {
    if (r.topic_id) {
      textByTopic[r.topic_id] = (textByTopic[r.topic_id] || 0) + 1;
    }
  }
  
  const TOPIC_COLORS = {1:'blue',2:'green',3:'brown',4:'yellow',5:'purple',6:'orange',7:'red'};
  console.log('\nText-based distribution:');
  for (const [id, count] of Object.entries(textByTopic).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${TOPIC_COLORS[id].padEnd(8)}: ${count} (${(count/quranText.length*100).toFixed(1)}%)`);
  }
  
  // ============================================================
  // MERGE: Image + Text classification
  // ============================================================
  console.log('\n--- Merging Image + Text classifications ---');
  
  const merged = [];
  
  for (let i = 0; i < quranText.length; i++) {
    const verse = quranText[i];
    const textResult = textResults[i];
    
    // Find image result
    const imgVerse = imageClassification.verses.find(v => v.surah === verse.surah && v.ayah === verse.ayah);
    const imgTopicId = imgVerse?.topic_id;
    const imgConfidence = imgVerse?.confidence || 'none';
    
    let finalTopicId;
    let finalConfidence;
    let method;
    
    // Decision logic:
    // 1. If both agree → high confidence  
    // 2. If text is high confidence → use text
    // 3. If image is high confidence and text is low/none → use image
    // 4. If only one has classification → use it
    // 5. If disagreement → prefer the one with higher confidence
    
    if (textResult.topic_id && imgTopicId && textResult.topic_id === imgTopicId) {
      finalTopicId = textResult.topic_id;
      finalConfidence = 'high';
      method = 'both_agree';
    } else if (textResult.confidence === 'high' && textResult.topic_id) {
      finalTopicId = textResult.topic_id;
      finalConfidence = 'high';
      method = 'text_high';
    } else if (imgConfidence === 'high' && imgTopicId && (!textResult.topic_id || textResult.confidence === 'none')) {
      finalTopicId = imgTopicId;
      finalConfidence = 'medium';
      method = 'image_high';
    } else if (textResult.topic_id && !imgTopicId) {
      finalTopicId = textResult.topic_id;
      finalConfidence = textResult.confidence;
      method = 'text_only';
    } else if (!textResult.topic_id && imgTopicId) {
      finalTopicId = imgTopicId;
      finalConfidence = imgConfidence;
      method = 'image_only';
    } else if (textResult.topic_id && imgTopicId) {
      // Disagreement — use text with higher score
      if (['high', 'medium'].includes(textResult.confidence)) {
        finalTopicId = textResult.topic_id;
        finalConfidence = 'medium';
        method = 'text_preferred';
      } else {
        finalTopicId = imgTopicId;
        finalConfidence = 'low';
        method = 'image_fallback';
      }
    } else {
      finalTopicId = null;
      finalConfidence = 'none';
      method = 'unclassified';
    }
    
    merged.push({
      surah: verse.surah,
      ayah: verse.ayah,
      page: imgVerse?.page || null,
      topic_id: finalTopicId,
      confidence: finalConfidence,
      method,
    });
  }
  
  // Merged stats
  const mergedAssigned = merged.filter(m => m.topic_id).length;
  console.log(`\nMerged: ${mergedAssigned}/${merged.length} assigned (${(mergedAssigned/merged.length*100).toFixed(1)}%)`);
  
  const mergedByTopic = {};
  for (const m of merged) {
    if (m.topic_id) {
      const color = TOPIC_COLORS[m.topic_id];
      mergedByTopic[color] = (mergedByTopic[color] || 0) + 1;
    }
  }
  
  console.log('\nMerged distribution:');
  for (const [color, count] of Object.entries(mergedByTopic).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${color.padEnd(8)}: ${count} (${(count/merged.length*100).toFixed(1)}%)`);
  }
  
  const methodStats = {};
  for (const m of merged) {
    methodStats[m.method] = (methodStats[m.method] || 0) + 1;
  }
  console.log('\nMethod distribution:');
  for (const [method, count] of Object.entries(methodStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${method.padEnd(16)}: ${count}`);
  }
  
  // Save merged result
  const TOPICS = {
    1: { color: 'blue',   hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" },
    2: { color: 'green',  hex: '#27AE60', name_ar: 'السيرة النبوية، صفات المؤمنين، الجنة', name_en: 'Seerah, Believers, Paradise' },
    3: { color: 'brown',  hex: '#8E6B3D', name_ar: 'آيات الأحكام والفقه', name_en: 'Rulings & Jurisprudence (Fiqh)' },
    4: { color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء والأمم السابقة', name_en: 'Stories of Prophets & Past Nations' },
    5: { color: 'purple', hex: '#8E44AD', name_ar: 'مكانة القرآن ورد الشبهات', name_en: 'Status of Quran & Refuting Doubts' },
    6: { color: 'orange', hex: '#E67E22', name_ar: 'اليوم الآخر، الموت، البعث، الحساب', name_en: 'Afterlife, Death, Resurrection, Judgment' },
    7: { color: 'red',    hex: '#E74C3C', name_ar: 'أوصاف النار وعذاب الكافرين', name_en: 'Hellfire & Punishment of Disbelievers' },
  };
  
  const output = {
    metadata: {
      version: '1.0.0',
      total_verses: 6236,
      total_topics: 7,
      source: 'tafsir.app/m-mawdou (image analysis) + keyword classification',
      last_updated: new Date().toISOString().split('T')[0],
      note: 'Combined image color analysis + Arabic keyword classification + context window. Manual verification recommended for low-confidence entries.',
    },
    topics: Object.entries(TOPICS).map(([id, t]) => ({
      id: parseInt(id),
      name_ar: t.name_ar,
      name_en: t.name_en,
      color_hex: t.hex,
      color_name: t.color,
      verse_count: mergedByTopic[t.color] || 0,
    })),
    verses: merged.map((m, i) => ({
      surah: m.surah,
      ayah: m.ayah,
      page: m.page,
      topic_id: m.topic_id,
      topic_color: m.topic_id ? TOPIC_COLORS[m.topic_id] : null,
      confidence: m.confidence,
      method: m.method,
    })),
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'topics_master.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );
  
  console.log(`\nSaved to ${path.join(OUTPUT_DIR, 'topics_master.json')}`);
  
  // Also save text classification separately
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'text_classification.json'),
    JSON.stringify(textResults, null, 2),
    'utf-8'
  );
}

main();
