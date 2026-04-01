const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SCAN_DIR = path.join(__dirname, 'raw', 'scans');
const CHECKPOINT_FILE = path.join(__dirname, 'checkpoints', 'download_checkpoint.json');

// Rate limiting: 1.5 seconds between requests
const DELAY_MS = 1500;
const MAX_RETRIES = 3;
const TOTAL_PAGES = 604;

const headers = {
  'User-Agent': 'Al-Mushaf-Al-Mufahras-Dataset-Builder/1.0 (educational project)',
  'Accept': 'image/jpeg,image/*',
  'Referer': 'https://tafsir.app/m-mawdou/1/1'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  } catch {
    return { lastPage: 0, downloaded: [], failed: [], startTime: new Date().toISOString() };
  }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf-8');
}

async function downloadPage(pageNum, retries = 0) {
  const url = `https://tafsir.app/scans/m-mawdou/${pageNum}.jpg`;
  const outPath = path.join(SCAN_DIR, `${pageNum}.jpg`);
  
  // Skip if already downloaded
  if (fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    if (stat.size > 10000) return { status: 'skipped', size: stat.size };
  }
  
  try {
    const res = await axios.get(url, {
      headers,
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    fs.writeFileSync(outPath, res.data);
    return { status: 'downloaded', size: res.data.length };
  } catch (err) {
    if (retries < MAX_RETRIES) {
      console.log(`  Retry ${retries + 1}/${MAX_RETRIES} for page ${pageNum}...`);
      await sleep(3000);
      return downloadPage(pageNum, retries + 1);
    }
    return { status: 'failed', error: err.message };
  }
}

async function main() {
  // Create output directory
  if (!fs.existsSync(SCAN_DIR)) {
    fs.mkdirSync(SCAN_DIR, { recursive: true });
  }
  
  const checkpoint = loadCheckpoint();
  const startPage = checkpoint.lastPage + 1;
  
  console.log(`\nAl-Mushaf Al-Mufahras Page Downloader`);
  console.log(`====================================`);
  console.log(`Total pages: ${TOTAL_PAGES}`);
  console.log(`Starting from page: ${startPage}`);
  console.log(`Already downloaded: ${checkpoint.downloaded.length}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);
  console.log(`\nStarting download...\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (let pg = startPage; pg <= TOTAL_PAGES; pg++) {
    const result = await downloadPage(pg);
    
    if (result.status === 'downloaded') {
      successCount++;
      checkpoint.downloaded.push(pg);
      console.log(`[${pg}/${TOTAL_PAGES}] Downloaded (${(result.size / 1024).toFixed(0)} KB)`);
    } else if (result.status === 'skipped') {
      skipCount++;
      console.log(`[${pg}/${TOTAL_PAGES}] Skipped (already exists, ${(result.size / 1024).toFixed(0)} KB)`);
    } else {
      failCount++;
      checkpoint.failed.push({ page: pg, error: result.error });
      console.log(`[${pg}/${TOTAL_PAGES}] FAILED: ${result.error}`);
    }
    
    checkpoint.lastPage = pg;
    
    // Save checkpoint every 10 pages
    if (pg % 10 === 0) {
      saveCheckpoint(checkpoint);
      const pct = ((pg / TOTAL_PAGES) * 100).toFixed(1);
      console.log(`--- Checkpoint saved: ${pct}% complete ---`);
    }
    
    // Rate limiting
    if (result.status === 'downloaded') {
      await sleep(DELAY_MS);
    }
  }
  
  // Final checkpoint
  saveCheckpoint(checkpoint);
  
  console.log(`\n====================================`);
  console.log(`Download complete!`);
  console.log(`Downloaded: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (checkpoint.failed.length > 0) {
    console.log(`\nFailed pages: ${checkpoint.failed.map(f => f.page).join(', ')}`);
  }
}

main().catch(console.error);
