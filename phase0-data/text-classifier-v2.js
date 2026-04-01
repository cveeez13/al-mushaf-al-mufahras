const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');

// Strip Arabic diacritics (tashkeel) for matching
function stripTashkeel(text) {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08E1\u08E3-\u08FF\uFE70-\uFE7F]/g, '')
    .replace(/[\u0640]/g, '') // Remove tatweel
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// REFINED KEYWORD SYSTEM - More specific, less overlap
// Each keyword gets a weight. Higher weight = more specific to topic.
// ============================================================

const TOPIC_RULES = {
  // Topic 1: BLUE - Signs of Allah's Power & Greatness
  1: {
    keywords: [
      { w: 'خلق السموت والارض', weight: 5 },
      { w: 'خلق السموات', weight: 4 },
      { w: 'خلق الارض', weight: 3 },
      { w: 'خلق الانسن', weight: 3 },
      { w: 'بديع السموت', weight: 5 },
      { w: 'فاطر السموت', weight: 5 },
      { w: 'سخر لكم', weight: 4 },
      { w: 'سخر الشمس', weight: 4 },
      { w: 'سخر البحر', weight: 4 },
      { w: 'وجعل لكم', weight: 2 },
      { w: 'والشمس والقمر', weight: 4 },
      { w: 'الشمس والقمر', weight: 3 },
      { w: 'الليل والنهار', weight: 3 },
      { w: 'وانزل من السماء ماء', weight: 5 },
      { w: 'انزل من السماء', weight: 3 },
      { w: 'لايت لقوم يتفكرون', weight: 4 },
      { w: 'لايت لقوم يعقلون', weight: 4 },
      { w: 'يتفكرون', weight: 2 },
      { w: 'النجوم', weight: 2 },
      { w: 'الجبال', weight: 2 },
      { w: 'الانهر', weight: 2 },
      { w: 'الرياح', weight: 2 },
      { w: 'السحاب', weight: 2 },
      { w: 'على كل شى قدير', weight: 3 },
      { w: 'سبحنه', weight: 2 },
      { w: 'سبحن الذى', weight: 3 },
      { w: 'يسبح لله', weight: 3 },
      { w: 'تسبح له', weight: 3 },
      { w: 'لله ما فى السموت', weight: 4 },
      { w: 'الملك', weight: 1 },
      { w: 'الملكوت', weight: 3 },
      { w: 'العرش', weight: 2 },
      { w: 'الكرسى', weight: 3 },
      { w: 'انبتنا', weight: 2 },
      { w: 'الزرع', weight: 2 },
      { w: 'الثمرت', weight: 2 },
      { w: 'خلقكم', weight: 2 },
      { w: 'الا هو', weight: 1 },
      { w: 'لا اله الا هو', weight: 2 },
    ],
  },
  
  // Topic 2: GREEN - Seerah, Believers, Paradise
  2: {
    keywords: [
      { w: 'يايها الذين امنوا', weight: 3 },
      { w: 'الذين امنوا وعملوا الصلحت', weight: 5 },
      { w: 'جنت تجرى من تحتها', weight: 5 },
      { w: 'جنت تجرى', weight: 4 },
      { w: 'جنت النعيم', weight: 5 },
      { w: 'جنت عدن', weight: 5 },
      { w: 'فى الجنه', weight: 4 },
      { w: 'الفردوس', weight: 5 },
      { w: 'خلدين فيها', weight: 2 },
      { w: 'رضى الله عنهم', weight: 4 },
      { w: 'للمتقين', weight: 2 },
      { w: 'المتقين', weight: 2 },
      { w: 'المحسنين', weight: 2 },
      { w: 'الصبرين', weight: 2 },
      { w: 'صبروا', weight: 2 },
      { w: 'رسوله', weight: 1 },
      { w: 'النبى', weight: 2 },
      { w: 'محمد', weight: 4 },
      { w: 'يايها النبى', weight: 4 },
      { w: 'يايها الرسول', weight: 4 },
      { w: 'توبوا', weight: 2 },
      { w: 'مغفره', weight: 2 },
      { w: 'فلحوا', weight: 3 },
      { w: 'المفلحون', weight: 3 },
      { w: 'اجرا عظيما', weight: 2 },
      { w: 'البشرى', weight: 2 },
      { w: 'المومنين', weight: 2 },
      { w: 'المومنت', weight: 2 },
      { w: 'المسلمين', weight: 1 },
      { w: 'عباد الرحمن', weight: 3 },
      { w: 'فضل الله', weight: 2 },
    ],
  },
  
  // Topic 3: BROWN - Rulings & Fiqh
  3: {
    keywords: [
      { w: 'كتب عليكم', weight: 4 },
      { w: 'فرض', weight: 2 },
      { w: 'فريضه', weight: 3 },
      { w: 'حدود الله', weight: 5 },
      { w: 'الصيام', weight: 5 },
      { w: 'شهر رمضان', weight: 5 },
      { w: 'الحج', weight: 4 },
      { w: 'العمره', weight: 4 },
      { w: 'حرم عليكم', weight: 5 },
      { w: 'احل لكم', weight: 4 },
      { w: 'لا تقربوا', weight: 2 },
      { w: 'الزكوه', weight: 4 },
      { w: 'الصدقت', weight: 3 },
      { w: 'القصاص', weight: 5 },
      { w: 'الوصيه', weight: 3 },
      { w: 'الميراث', weight: 5 },
      { w: 'يوصيكم', weight: 3 },
      { w: 'الطلق', weight: 5 },
      { w: 'طلقتم', weight: 5 },
      { w: 'النكاح', weight: 4 },
      { w: 'ازوجكم', weight: 2 },
      { w: 'النساء', weight: 1 },
      { w: 'محصنت', weight: 3 },
      { w: 'المحصنت', weight: 3 },
      { w: 'الربوا', weight: 5 },
      { w: 'البيع', weight: 2 },
      { w: 'بالعدل', weight: 2 },
      { w: 'شهدوا', weight: 1 },
      { w: 'شهيدين', weight: 2 },
      { w: 'الصلوه', weight: 2 },
      { w: 'اقيموا الصلوه', weight: 3 },
      { w: 'واتوا الزكوه', weight: 3 },
      { w: 'الخمر', weight: 5 },
      { w: 'الميسر', weight: 5 },
      { w: 'الخنزير', weight: 5 },
      { w: 'اليتمى', weight: 2 },
      { w: 'القتال', weight: 2 },
      { w: 'قتلوا فى سبيل الله', weight: 3 },
      { w: 'جهدوا فى سبيل', weight: 3 },
      { w: 'العده', weight: 3 },
      { w: 'اربعه اشهر', weight: 4 },
      { w: 'الحدود', weight: 2 },
    ],
  },
  
  // Topic 4: YELLOW - Stories of Prophets & Past Nations
  4: {
    keywords: [
      { w: 'موسى', weight: 4 },
      { w: 'فرعون', weight: 5 },
      { w: 'بنى اسرءيل', weight: 5 },
      { w: 'ابرهيم', weight: 4 },
      { w: 'اسمعيل', weight: 4 },
      { w: 'اسحق', weight: 4 },
      { w: 'يعقوب', weight: 4 },
      { w: 'نوح', weight: 4 },
      { w: 'هود', weight: 3 },
      { w: 'صلح', weight: 2 },
      { w: 'لوط', weight: 4 },
      { w: 'شعيب', weight: 4 },
      { w: 'يوسف', weight: 5 },
      { w: 'داوود', weight: 4 },
      { w: 'سليمن', weight: 4 },
      { w: 'ايوب', weight: 4 },
      { w: 'عيسى', weight: 4 },
      { w: 'مريم', weight: 4 },
      { w: 'يحيى', weight: 4 },
      { w: 'زكريا', weight: 4 },
      { w: 'يونس', weight: 4 },
      { w: 'الياس', weight: 4 },
      { w: 'ذا الكفل', weight: 4 },
      { w: 'ادم', weight: 3 },
      { w: 'ابليس', weight: 3 },
      { w: 'عاد', weight: 3 },
      { w: 'ثمود', weight: 4 },
      { w: 'مدين', weight: 4 },
      { w: 'الايكه', weight: 4 },
      { w: 'اهلكنا', weight: 2 },
      { w: 'من قبلكم', weight: 1 },
      { w: 'القرون', weight: 2 },
      { w: 'قوم نوح', weight: 5 },
      { w: 'قوم لوط', weight: 5 },
      { w: 'قوم هود', weight: 5 },
      { w: 'قوم صلح', weight: 5 },
      { w: 'قوم ابرهيم', weight: 5 },
      { w: 'اصحب الكهف', weight: 5 },
      { w: 'ذو القرنين', weight: 5 },
      { w: 'ارسلنا', weight: 1 },
      { w: 'الصيحه', weight: 3 },
      { w: 'اغرقنا', weight: 3 },
      { w: 'كذبوا رسلنا', weight: 3 },
      { w: 'قال لقومه', weight: 3 },
    ],
  },
  
  // Topic 5: PURPLE - Status of Quran & Refuting Doubts
  5: {
    keywords: [
      { w: 'تنزيل الكتب', weight: 4 },
      { w: 'تنزيل من', weight: 3 },
      { w: 'نزلنه', weight: 2 },
      { w: 'انزلنه', weight: 2 },
      { w: 'هذا القران', weight: 4 },
      { w: 'قرانا عربيا', weight: 5 },
      { w: 'لا ريب فيه', weight: 5 },
      { w: 'من رب العلمين', weight: 2 },
      { w: 'الم', weight: 1 }, // Opening letters at start of surah
      { w: 'الر', weight: 1 },
      { w: 'افتراه', weight: 4 },
      { w: 'هل فيها سحر', weight: 5 },
      { w: 'كاهن', weight: 4 },
      { w: 'شاعر', weight: 4 },
      { w: 'مجنون', weight: 3 },
      { w: 'بمثله', weight: 3 },
      { w: 'فاتوا بسوره', weight: 5 },
      { w: 'اتوا بحديث مثله', weight: 5 },
      { w: 'تلك ايت', weight: 2 },
      { w: 'ايت الكتب', weight: 3 },
      { w: 'المبين', weight: 1 },
    ],
  },
  
  // Topic 6: ORANGE - Afterlife, Death, Resurrection, Judgment
  6: {
    keywords: [
      { w: 'يوم القيمه', weight: 5 },
      { w: 'القيمه', weight: 3 },
      { w: 'يوم الدين', weight: 4 },
      { w: 'الساعه', weight: 3 },
      { w: 'يوم يقوم', weight: 3 },
      { w: 'يوم الحساب', weight: 5 },
      { w: 'يوم الحشر', weight: 5 },
      { w: 'يبعثون', weight: 3 },
      { w: 'يبعث', weight: 2 },
      { w: 'البعث', weight: 4 },
      { w: 'الموت', weight: 2 },
      { w: 'ذائقه الموت', weight: 4 },
      { w: 'القبور', weight: 3 },
      { w: 'ينفخ فى الصور', weight: 5 },
      { w: 'نفخ فى الصور', weight: 5 },
      { w: 'الصور', weight: 1 },
      { w: 'الحساب', weight: 2 },
      { w: 'الميزان', weight: 3 },
      { w: 'الصرط', weight: 2 },
      { w: 'اذا السماء انشقت', weight: 5 },
      { w: 'اذا الشمس كورت', weight: 5 },
      { w: 'اذا زلزلت', weight: 5 },
      { w: 'الحاقه', weight: 5 },
      { w: 'القارعه', weight: 5 },
      { w: 'الواقعه', weight: 4 },
      { w: 'يومئذ', weight: 2 },
      { w: 'يوم تجد', weight: 3 },
      { w: 'يوم لا ينفع', weight: 4 },
      { w: 'يوم لا تملك', weight: 4 },
      { w: 'يوم ياتى', weight: 2 },
      { w: 'يوم تبدل الارض', weight: 4 },
      { w: 'يوم تقوم الساعه', weight: 5 },
    ],
  },
  
  // Topic 7: RED - Hellfire & Punishment of Disbelievers
  7: {
    keywords: [
      { w: 'نار جهنم', weight: 5 },
      { w: 'جهنم', weight: 4 },
      { w: 'في النار', weight: 3 },
      { w: 'عذاب النار', weight: 5 },
      { w: 'عذابا اليما', weight: 3 },
      { w: 'عذابا شديدا', weight: 3 },
      { w: 'عذاب', weight: 1 },
      { w: 'سعير', weight: 4 },
      { w: 'سقر', weight: 5 },
      { w: 'الجحيم', weight: 5 },
      { w: 'الحطمه', weight: 5 },
      { w: 'لظى', weight: 5 },
      { w: 'حميم', weight: 3 },
      { w: 'غسلين', weight: 5 },
      { w: 'زقوم', weight: 5 },
      { w: 'سلسل', weight: 3 },
      { w: 'اغلل', weight: 3 },
      { w: 'ان الكفرين', weight: 2 },
      { w: 'الكفرين', weight: 1 },
      { w: 'المنفقين', weight: 3 },
      { w: 'لعنه الله', weight: 4 },
      { w: 'لعنهم', weight: 3 },
      { w: 'غضب الله', weight: 3 },
      { w: 'ويل', weight: 2 },
      { w: 'لهم عذاب', weight: 3 },
      { w: 'اعتدنا لهم', weight: 2 },
      { w: 'اعد لهم', weight: 2 },
      { w: 'وقود النار', weight: 5 },
      { w: 'اصحب النار', weight: 5 },
      { w: 'هم فيها خلدون', weight: 3 },
    ],
  },
};

function scoreVerseForTopic(strippedText, topicId) {
  const rules = TOPIC_RULES[topicId];
  let totalScore = 0;
  
  for (const { w, weight } of rules.keywords) {
    if (strippedText.includes(w)) {
      totalScore += weight;
    }
  }
  
  return totalScore;
}

function classifyVerse(text) {
  const stripped = stripTashkeel(text);
  
  const scores = {};
  for (let t = 1; t <= 7; t++) {
    scores[t] = scoreVerseForTopic(stripped, t);
  }
  
  // Find top scores
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = sorted[0];
  const [secondId, secondScore] = sorted[1] || [null, 0];
  
  if (bestScore === 0) return { topic_id: null, score: 0, confidence: 'none' };
  
  const margin = bestScore - secondScore;
  const confidence = margin >= 4 ? 'high' : margin >= 2 ? 'medium' : 'low';
  
  return { topic_id: parseInt(bestId), score: bestScore, margin, confidence };
}

function classifyWithContext(verses, idx) {
  const verse = verses[idx];
  const directResult = classifyVerse(verse.text);
  
  if (directResult.confidence === 'high') return directResult;
  
  // Context window: look at surrounding verses
  const contextScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  
  for (let offset = -5; offset <= 5; offset++) {
    const ni = idx + offset;
    if (ni < 0 || ni >= verses.length) continue;
    if (verses[ni].surah !== verse.surah) continue;
    
    const weight = offset === 0 ? 4 : Math.max(1, 4 - Math.abs(offset));
    const stripped = stripTashkeel(verses[ni].text);
    
    for (let t = 1; t <= 7; t++) {
      contextScores[t] += scoreVerseForTopic(stripped, t) * weight;
    }
  }
  
  const sorted = Object.entries(contextScores).sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = sorted[0];
  
  if (bestScore === 0) return { topic_id: null, score: 0, confidence: 'none' };
  
  const margin = bestScore - (sorted[1]?.[1] || 0);
  const confidence = margin >= 8 ? 'high' : margin >= 3 ? 'medium' : 'low';
  
  return { topic_id: parseInt(bestId), score: bestScore, margin, confidence, method: 'context' };
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  Refined Text Classification (v2 - weighted kw)   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  const quranText = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw', 'quran_text.json'), 'utf-8'));
  console.log(`Loaded ${quranText.length} verses`);
  
  // Test diacritics stripping
  console.log(`\nSample text: "${quranText[0].text}"`);
  console.log(`Stripped: "${stripTashkeel(quranText[0].text)}"\n`);
  
  // Classify all verses
  const results = [];
  for (let i = 0; i < quranText.length; i++) {
    const result = classifyWithContext(quranText, i);
    results.push({
      surah: quranText[i].surah,
      ayah: quranText[i].ayah,
      ...result,
    });
  }
  
  // Stats
  const COLORS = {1:'blue',2:'green',3:'brown',4:'yellow',5:'purple',6:'orange',7:'red'};
  
  const assigned = results.filter(r => r.topic_id).length;
  const unassigned = results.filter(r => !r.topic_id).length;
  console.log(`Assigned: ${assigned} (${(assigned/results.length*100).toFixed(1)}%)`);
  console.log(`Unassigned: ${unassigned}`);
  
  const byTopic = {};
  for (const r of results) {
    if (r.topic_id) {
      const c = COLORS[r.topic_id];
      byTopic[c] = (byTopic[c] || 0) + 1;
    }
  }
  
  console.log('\nDistribution:');
  for (const [color, count] of Object.entries(byTopic).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${color.padEnd(8)}: ${count} (${(count/results.length*100).toFixed(1)}%)`);
  }
  
  const confStats = {};
  for (const r of results) {
    confStats[r.confidence] = (confStats[r.confidence] || 0) + 1;
  }
  console.log('\nConfidence:');
  for (const [conf, count] of Object.entries(confStats)) {
    console.log(`  ${conf.padEnd(8)}: ${count}`);
  }
  
  // Save
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'text_classification_v2.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`\nSaved to output/text_classification_v2.json`);
  
  // Show some sample classifications
  console.log('\n=== Sample Classifications ===');
  const samples = [
    { s: 1, a: 1, expected: 'blue (Fatiha - praise)' },
    { s: 2, a: 3, expected: 'green (believers)' },
    { s: 2, a: 183, expected: 'brown (fasting)' },
    { s: 2, a: 255, expected: 'blue (Ayat al-Kursi)' },
    { s: 4, a: 11, expected: 'brown (inheritance)' },
    { s: 12, a: 1, expected: 'yellow (Yusuf story)' },
    { s: 18, a: 60, expected: 'yellow (Kahf - Musa & Khidr)' },
    { s: 36, a: 1, expected: 'purple (Ya Sin - Quran)' },
    { s: 55, a: 1, expected: 'blue (Ar-Rahman - creation)' },
    { s: 56, a: 41, expected: 'red (punishment)' },
    { s: 75, a: 1, expected: 'orange (Resurrection)' },
    { s: 114, a: 1, expected: 'blue (An-Nas - seeking refuge)' },
  ];
  
  for (const { s, a, expected } of samples) {
    const r = results.find(r => r.surah === s && r.ayah === a);
    const color = r?.topic_id ? COLORS[r.topic_id] : 'none';
    const match = expected.startsWith(color) ? '✓' : '✗';
    console.log(`  ${match} ${s}:${a} => ${color} (${r?.confidence}) | expected: ${expected}`);
  }
}

main();
