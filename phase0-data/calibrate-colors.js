const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Known verse-color mappings from the physical mushaf for calibration:
// Page 2: 2:1-2 = Purple, 2:3-5 = Green
// Page 50: 3:10-11 = Red, 3:12-13 = Yellow/Red, 3:14-15 = Green
// Page 300: 18:54-61 = Yellow (stories)
// We need samples for: Blue, Brown, Orange

// Strategy: Sample a horizontal stripe at multiple Y positions
// The text area is roughly between 8%-85% height and 15%-80% width
// Colors are pastel backgrounds behind the Arabic text

async function getColorProfile(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    
    // Sample many points in the text area
    const xStart = Math.floor(width * 0.2);
    const xEnd = Math.floor(width * 0.8);
    const xStep = Math.floor((xEnd - xStart) / 10);
    
    const yStart = Math.floor(height * 0.06);
    const yEnd = Math.floor(height * 0.84);
    
    // Collect color data per Y band
    const bands = [];
    let currentBand = null;
    
    for (let y = yStart; y < yEnd; y += 3) {
      // Sample across X
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let x = xStart; x < xEnd; x += xStep) {
        const idx = (y * width + x) * ch;
        const r = data[idx], g = data[idx+1], b = data[idx+2];
        // Skip very dark pixels (text) and very white pixels (borders)
        const brightness = (r + g + b) / 3;
        if (brightness > 140 && brightness < 255) {
          sumR += r; sumG += g; sumB += b; count++;
        }
      }
      
      if (count < 3) continue;
      
      const avgR = Math.round(sumR / count);
      const avgG = Math.round(sumG / count);
      const avgB = Math.round(sumB / count);
      
      // Classify this Y position
      const color = classifyPixel(avgR, avgG, avgB);
      
      if (color === 'white' || color === 'unknown') continue;
      
      if (!currentBand || currentBand.color !== color) {
        if (currentBand && (y - currentBand.yStart > 30)) {
          bands.push({ ...currentBand, yEnd: y });
        }
        currentBand = { color, yStart: y, r: avgR, g: avgG, b: avgB, samples: [{ r: avgR, g: avgG, b: avgB }] };
      } else {
        currentBand.samples.push({ r: avgR, g: avgG, b: avgB });
      }
    }
    
    if (currentBand) {
      bands.push({ ...currentBand, yEnd: yEnd });
    }
    
    // Filter out tiny bands (< 3% of text area height)
    const textHeight = yEnd - yStart;
    const significantBands = bands.filter(b => (b.yEnd - b.yStart) > textHeight * 0.03);
    
    return { width, height, bands: significantBands };
  } catch (err) {
    return { error: err.message };
  }
}

function classifyPixel(r, g, b) {
  const brightness = (r + g + b) / 3;
  
  // Too bright = white/cream background
  if (brightness > 248) return 'white';
  if (brightness < 100) return 'unknown';
  
  // Use HSL-like approach for better color discrimination
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Very low saturation = grey/white
  if (delta < 10 && brightness > 220) return 'white';
  
  // Calculate hue
  let hue;
  if (delta === 0) hue = 0;
  else if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  
  const saturation = max === 0 ? 0 : delta / max;
  const lightness = brightness / 255;
  
  // Classification based on hue ranges
  // Blue: hue 200-260, with B significantly higher than R
  if (hue >= 200 && hue <= 270 && b > r && b > g) {
    if (r > 200 && Math.abs(r - g) < 15) return 'purple'; // Purple has R≈G < B
    return 'blue';
  }
  
  // Purple: hue 260-320 or R≈G with B higher
  if ((hue >= 260 && hue <= 330) || (b > g && b > r - 10 && Math.abs(r - g) < 30 && b - g > 15)) {
    return 'purple';
  }
  
  // Red/Pink: hue 340-360 or 0-15, with R dominant
  if ((hue >= 330 || hue <= 20) && r > g && r > b) {
    if (g > b + 20) return 'orange'; // Orange has more green
    return 'red';
  }
  
  // Orange: hue 15-45
  if (hue >= 15 && hue <= 45 && r > g && g > b) {
    return 'orange';
  }
  
  // Yellow: hue 45-70, with R≈G >> B
  if (hue >= 40 && hue <= 75 && r > b + 30 && g > b + 30) {
    return 'yellow';
  }
  
  // Brown: hue 25-45, darker, R > G > B
  if (hue >= 20 && hue <= 50 && r > g && g > b && brightness < 210) {
    return 'brown';
  }
  
  // Green: hue 70-170, with G dominant
  if (hue >= 70 && hue <= 170 && g > r && g > b) {
    return 'green';
  }
  
  // Yellow-green transition
  if (hue >= 50 && hue < 90 && g >= r && g > b) {
    return 'green';
  }
  
  // Fallback: check which channel dominates
  if (b > r + 15 && b > g + 15) return 'blue';
  if (g > r + 10 && g > b + 10) return 'green';
  if (r > g + 20 && r > b + 20) return 'red';
  if (r > b + 30 && g > b + 30 && Math.abs(r - g) < 30) return 'yellow';
  
  return 'unknown';
}

async function main() {
  const scanDir = path.join(__dirname, 'raw', 'scans');
  
  // Test with known pages + more diverse pages
  const testPages = [
    { pg: 1, expected: 'Al-Fatiha (Blue?)' },
    { pg: 2, expected: '2:1-2=Purple, 2:3-5=Green' },
    { pg: 50, expected: '3:10=Red, 3:12=Yellow?, 3:14-15=Green' },
    { pg: 77, expected: 'Al-Imran area' },
    { pg: 100, expected: 'Al-Nisa area' },
    { pg: 150, expected: 'Al-Anam/Araf area' },
    { pg: 200, expected: 'Yunus area' },
    { pg: 250, expected: 'An-Nahl area' },
    { pg: 300, expected: '18:54-61=Yellow (stories)' },
    { pg: 350, expected: 'Al-Furqan area' },
    { pg: 400, expected: 'Ar-Rum area' },
    { pg: 450, expected: 'As-Saffat area' },
    { pg: 500, expected: 'Ad-Dukhan area' },
    { pg: 550, expected: 'Al-Mujadilah area' },
    { pg: 590, expected: 'Near end' },
  ];
  
  for (const { pg, expected } of testPages) {
    // Check if file exists in scans or raw
    let imgPath = path.join(scanDir, `${pg}.jpg`);
    if (!fs.existsSync(imgPath)) {
      imgPath = path.join(__dirname, 'raw', `page_${pg}.jpg`);
    }
    if (!fs.existsSync(imgPath)) {
      console.log(`Page ${pg}: not downloaded yet`);
      continue;
    }
    
    const result = await getColorProfile(imgPath);
    if (result.error) {
      console.log(`Page ${pg}: ERROR - ${result.error}`);
      continue;
    }
    
    console.log(`\nPage ${pg} (${expected}):`);
    for (const band of result.bands) {
      const pct = (((band.yEnd - band.yStart) / result.height) * 100).toFixed(1);
      console.log(`  ${band.color.padEnd(8)} y=${band.yStart}-${band.yEnd} (${pct}%) RGB=(${band.r},${band.g},${band.b})`);
    }
  }
}

main().catch(console.error);
