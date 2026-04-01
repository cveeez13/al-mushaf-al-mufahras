const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Sample specific known areas from confirmed pages to get reference RGB values
async function sampleRegion(imagePath, yPercStart, yPercEnd) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  
  const xStart = Math.floor(width * 0.25);
  const xEnd = Math.floor(width * 0.75);
  const yStart = Math.floor(height * yPercStart);
  const yEnd = Math.floor(height * yPercEnd);
  
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  const allPixels = [];
  
  for (let y = yStart; y < yEnd; y += 4) {
    for (let x = xStart; x < xEnd; x += 10) {
      const idx = (y * width + x) * ch;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const brightness = (r + g + b) / 3;
      // Only count colored background pixels (not text, not white borders)
      if (brightness > 160 && brightness < 250) {
        sumR += r; sumG += g; sumB += b;
        count++;
        allPixels.push({ r, g, b });
      }
    }
  }
  
  if (count === 0) return null;
  
  const avgR = Math.round(sumR / count);
  const avgG = Math.round(sumG / count);
  const avgB = Math.round(sumB / count);
  
  // Calculate standard deviation
  const variance = allPixels.reduce((acc, p) => {
    return acc + (p.r - avgR)**2 + (p.g - avgG)**2 + (p.b - avgB)**2;
  }, 0) / (count * 3);
  
  return { r: avgR, g: avgG, b: avgB, stdDev: Math.round(Math.sqrt(variance)), samples: count };
}

async function main() {
  const scanDir = path.join(__dirname, 'raw', 'scans');
  
  // Known color locations from visual inspection
  const calibrationPoints = [
    // Blue - page 5, top section (2:30-33, creation of Adam)
    { page: 5, color: 'blue', yStart: 0.06, yEnd: 0.50, desc: 'Al-Baqarah 2:30-33 (creation)' },
    // Blue - page 1 (Al-Fatiha)
    { page: 1, color: 'blue', yStart: 0.30, yEnd: 0.65, desc: 'Al-Fatiha' },
    
    // Green - page 2, bottom section (2:3-5, believers attributes) 
    { page: 2, color: 'green', yStart: 0.25, yEnd: 0.80, desc: 'Al-Baqarah 2:3-5 (believers)' },
    // Green - page 50, bottom section (3:14-15)
    { page: 50, color: 'green', yStart: 0.50, yEnd: 0.85, desc: 'Al-Imran 3:14-15 (believers)' },
    // Green - page 130, bottom section (6:33-35, consoling Prophet)
    { page: 130, color: 'green', yStart: 0.55, yEnd: 0.85, desc: 'Al-Anam 6:33-35 (Prophet)' },
    
    // Brown - page 37 (2:234-237, marriage laws)
    { page: 37, color: 'brown', yStart: 0.06, yEnd: 0.85, desc: 'Al-Baqarah 2:234-237 (fiqh)' },
    // Brown - page 77 (4:7-11, inheritance)
    { page: 77, color: 'brown', yStart: 0.06, yEnd: 0.85, desc: 'An-Nisa 4:7-11 (inheritance)' },
    
    // Yellow - page 5, bottom section (2:34-37, Adam story)
    { page: 5, color: 'yellow', yStart: 0.50, yEnd: 0.85, desc: 'Al-Baqarah 2:34-37 (Adam)' },
    // Yellow - page 300 (18:54-61, Kahf stories)
    { page: 300, color: 'yellow', yStart: 0.06, yEnd: 0.85, desc: 'Al-Kahf 18:54-61 (stories)' },
    
    // Purple - page 2, top section (2:1-2, Alif Lam Mim)
    { page: 2, color: 'purple', yStart: 0.06, yEnd: 0.22, desc: 'Al-Baqarah 2:1-2 (Quran status)' },
    // Purple - page 50, top section (3:10-11)
    { page: 50, color: 'purple', yStart: 0.06, yEnd: 0.15, desc: 'Al-Imran 3:10 (refutation)' },
    
    // Orange - page 130, top section (6:27-32, Day of Judgment)  
    { page: 130, color: 'orange', yStart: 0.06, yEnd: 0.50, desc: 'Al-Anam 6:27-32 (afterlife)' },
    
    // Red - page 100, middle (4:144-145, munafiqin in hellfire)
    { page: 100, color: 'red', yStart: 0.45, yEnd: 0.65, desc: 'An-Nisa 4:144-145 (hellfire)' },
  ];
  
  const colorRefs = {};
  
  for (const point of calibrationPoints) {
    const imgPath = path.join(scanDir, `${point.page}.jpg`);
    if (!fs.existsSync(imgPath)) {
      console.log(`Page ${point.page}: not found`);
      continue;
    }
    
    const result = await sampleRegion(imgPath, point.yStart, point.yEnd);
    if (!result) {
      console.log(`Page ${point.page} [${point.color}]: no valid samples`);
      continue;
    }
    
    console.log(`Page ${String(point.page).padStart(3)} [${point.color.padEnd(7)}]: RGB(${result.r}, ${result.g}, ${result.b}) ±${result.stdDev} (${result.samples} samples) — ${point.desc}`);
    
    if (!colorRefs[point.color]) colorRefs[point.color] = [];
    colorRefs[point.color].push(result);
  }
  
  // Average each color's references
  console.log('\n\n=== CALIBRATED COLOR REFERENCES ===');
  const finalRefs = {};
  for (const [color, refs] of Object.entries(colorRefs)) {
    const avgR = Math.round(refs.reduce((s, r) => s + r.r, 0) / refs.length);
    const avgG = Math.round(refs.reduce((s, r) => s + r.g, 0) / refs.length);
    const avgB = Math.round(refs.reduce((s, r) => s + r.b, 0) / refs.length);
    finalRefs[color] = { r: avgR, g: avgG, b: avgB };
    console.log(`${color.padEnd(7)}: RGB(${avgR}, ${avgG}, ${avgB})`);
  }
  
  // Save calibration data
  fs.writeFileSync(
    path.join(__dirname, 'checkpoints', 'color_calibration.json'),
    JSON.stringify(finalRefs, null, 2),
    'utf-8'
  );
  console.log('\nCalibration saved to checkpoints/color_calibration.json');
}

main().catch(console.error);
