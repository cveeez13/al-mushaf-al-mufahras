const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'raw');

async function fetchQuranText() {
  console.log('Fetching complete Quran text from quran.com API...\n');
  
  const headers = {
    'User-Agent': 'Al-Mushaf-Al-Mufahras-Dataset/1.0',
    'Accept': 'application/json'
  };
  
  const allVerses = [];
  
  // Surah ayah counts
  const surahAyahCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  
  // Fetch page by page (Quran.com API returns verses by page)
  for (let surah = 1; surah <= 114; surah++) {
    const totalAyahs = surahAyahCounts[surah - 1];
    const perPage = 50;
    let fetched = 0;
    let page = 1;
    
    while (fetched < totalAyahs) {
      try {
        const url = `https://api.quran.com/api/v4/verses/by_chapter/${surah}?language=ar&words=false&per_page=${perPage}&page=${page}&fields=text_uthmani`;
        const res = await axios.get(url, { headers, timeout: 15000 });
        
        for (const verse of res.data.verses) {
          allVerses.push({
            surah: surah,
            ayah: verse.verse_number,
            verse_key: verse.verse_key,
            text: verse.text_uthmani,
          });
          fetched++;
        }
        
        page++;
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        console.error(`Error fetching surah ${surah} page ${page}: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000));
        // Retry
        continue;
      }
    }
    
    if (surah % 10 === 0) {
      console.log(`  Fetched ${surah}/114 surahs (${allVerses.length} verses)`);
    }
  }
  
  console.log(`\nTotal verses fetched: ${allVerses.length}`);
  
  // Save
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'quran_text.json'),
    JSON.stringify(allVerses, null, 2),
    'utf-8'
  );
  
  console.log('Saved to raw/quran_text.json');
  return allVerses;
}

fetchQuranText().catch(console.error);
