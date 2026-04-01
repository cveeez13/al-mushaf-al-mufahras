const axios = require('axios');
const fs = require('fs');

const BASE = 'https://tafsir.app';
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Referer': 'https://tafsir.app/m-mawdou/1/1'
};

async function main() {
  // 1. Try get_mushaf.php for m-mawdou page 1
  console.log('=== get_mushaf.php for m-mawdou page 1 ===');
  try {
    const res1 = await axios.get(`${BASE}/get_mushaf.php?src=m-mawdou&pg=1`, { headers, timeout: 15000 });
    console.log('Type:', typeof res1.data);
    const data = typeof res1.data === 'string' ? res1.data.substring(0, 1500) : JSON.stringify(res1.data, null, 2).substring(0, 1500);
    console.log(data);
  } catch (e) { console.error('Error:', e.message); }

  // 2. Try QPC JSON (verse stops per page)
  console.log('\n=== /sources/qpc.json ===');
  try {
    const res2 = await axios.get(`${BASE}/sources/qpc.json`, { headers, timeout: 15000 });
    const data = JSON.stringify(res2.data, null, 2).substring(0, 2000);
    console.log(data);
    // Save full file
    fs.writeFileSync('phase0-data/raw/qpc.json', JSON.stringify(res2.data, null, 2), 'utf-8');
    console.log('Saved qpc.json');
  } catch (e) { console.error('Error:', e.message); }

  // 3. Try get_mushaf for text-based mushaf (hafs) page 1
  console.log('\n=== get_mushaf.php for m-madinah-f page 1 ===');
  try {
    const res3 = await axios.get(`${BASE}/get_mushaf.php?src=m-madinah-f&pg=1`, { headers, timeout: 15000 });
    const data = typeof res3.data === 'string' ? res3.data.substring(0, 1500) : JSON.stringify(res3.data, null, 2).substring(0, 1500);
    console.log(data);
  } catch (e) { console.error('Error:', e.message); }

  // 4. Try fetching the mawdou mushaf image directly
  console.log('\n=== Try m-mawdou image URL patterns ===');
  const imgPatterns = [
    `${BASE}/scans/m-mawdou/1.jpg`,
    `${BASE}/assets/scans/m-mawdou/1.jpg`,
    `${BASE}/mushaf/m-mawdou/1.jpg`,
  ];
  for (const url of imgPatterns) {
    try {
      const res = await axios.head(url, { headers, timeout: 10000 });
      console.log(`${url} => ${res.status} (${res.headers['content-type']})`);
    } catch (e) {
      console.log(`${url} => ${e.response?.status || e.message}`);
    }
  }
}

main();
