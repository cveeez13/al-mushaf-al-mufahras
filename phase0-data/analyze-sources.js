const axios = require('axios');
const fs = require('fs');

async function main() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://tafsir.app/m-mawdou/1/1'
  };

  // 1. Full QPC JSON analysis
  console.log('=== Analyzing qpc.json ===');
  const qpc = JSON.parse(fs.readFileSync('phase0-data/raw/qpc.json', 'utf-8'));
  console.log('Keys:', Object.keys(qpc));
  console.log('mushaf_pgs length:', qpc.mushaf_pgs?.length); // Should be 604+ for pages
  console.log('First 10 mushaf_pgs:', qpc.mushaf_pgs?.slice(0, 10));
  console.log('Last 5 mushaf_pgs:', qpc.mushaf_pgs?.slice(-5));
  if (qpc.stops) {
    console.log('stops type:', typeof qpc.stops);
    const stopsStr = typeof qpc.stops === 'string' ? qpc.stops : JSON.stringify(qpc.stops);
    console.log('stops length:', stopsStr.length);
    console.log('stops sample:', stopsStr.substring(0, 500));
  }
  // Check other keys
  for (const key of Object.keys(qpc)) {
    if (key !== 'mushaf_pgs' && key !== 'stops') {
      const val = qpc[key];
      console.log(`${key}:`, typeof val === 'string' ? val.substring(0, 200) : JSON.stringify(val).substring(0, 200));
    }
  }

  // 2. Download sample mushaf images for color analysis
  console.log('\n=== Downloading sample pages for color analysis ===');
  for (const pg of [1, 2, 50, 300, 604]) {
    try {
      const res = await axios.get(`https://tafsir.app/scans/m-mawdou/${pg}.jpg`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 15000
      });
      const path = `phase0-data/raw/page_${pg}.jpg`;
      fs.writeFileSync(path, res.data);
      console.log(`Page ${pg}: ${res.data.length} bytes saved`);
    } catch (e) {
      console.log(`Page ${pg}: ${e.message}`);
    }
  }

  // 3. Build surah metadata (ayah counts) from known source
  const surahAyahCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  
  let totalAyahs = surahAyahCounts.reduce((a, b) => a + b, 0);
  console.log(`\nTotal ayahs: ${totalAyahs}`);

  // Build global ayah index to surah:ayah mapping
  const ayahMap = [];
  let globalIdx = 1;
  for (let s = 0; s < 114; s++) {
    for (let a = 1; a <= surahAyahCounts[s]; a++) {
      ayahMap.push({ surah: s + 1, ayah: a, globalIndex: globalIdx });
      globalIdx++;
    }
  }
  console.log(`Built ayah map: ${ayahMap.length} entries`);
  
  // Map pages to ayahs
  const pageMap = [];
  const pgs = qpc.mushaf_pgs;
  for (let p = 0; p < pgs.length; p++) {
    const startAyah = pgs[p];
    const endAyah = p < pgs.length - 1 ? pgs[p + 1] - 1 : 6236;
    const versesOnPage = ayahMap.filter(a => a.globalIndex >= startAyah && a.globalIndex <= endAyah);
    pageMap.push({
      page: p + 1,
      startGlobalAyah: startAyah,
      endGlobalAyah: endAyah,
      verseCount: versesOnPage.length,
      firstVerse: versesOnPage[0] ? `${versesOnPage[0].surah}:${versesOnPage[0].ayah}` : null,
      lastVerse: versesOnPage[versesOnPage.length-1] ? `${versesOnPage[versesOnPage.length-1].surah}:${versesOnPage[versesOnPage.length-1].ayah}` : null
    });
  }
  
  console.log('\nPage mapping samples:');
  [0, 1, 2, 49, 299, 603].forEach(i => {
    if (pageMap[i]) console.log(JSON.stringify(pageMap[i]));
  });
  
  fs.writeFileSync('phase0-data/raw/page_map.json', JSON.stringify(pageMap, null, 2), 'utf-8');
  console.log('\nSaved page_map.json');
}

main();
