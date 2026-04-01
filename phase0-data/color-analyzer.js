const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// The 7 topic colors (approximate pastel background versions from the mushaf images)
const TOPIC_COLORS = {
  blue:   { r: 180, g: 210, b: 240, hex: '#3498DB', ar: 'دلائل قدرة الله وعظمته' },
  green:  { r: 190, g: 230, b: 180, hex: '#27AE60', ar: 'السيرة النبوية، صفات المؤمنين، الجنة' },
  brown:  { r: 220, g: 200, b: 170, hex: '#8E6B3D', ar: 'آيات الأحكام والفقه' },
  yellow: { r: 245, g: 235, b: 180, hex: '#F1C40F', ar: 'قصص الأنبياء والأمم السابقة' },
  purple: { r: 210, g: 190, b: 230, hex: '#8E44AD', ar: 'مكانة القرآن ورد الشبهات' },
  orange: { r: 240, g: 210, b: 170, hex: '#E67E22', ar: 'اليوم الآخر، الموت، البعث، الحساب' },
  red:    { r: 240, g: 190, b: 180, hex: '#E74C3C', ar: 'أوصاف النار وعذاب الكافرين' },
};

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

function classifyColor(r, g, b) {
  // If it's too white (background/border) or too dark, skip
  const brightness = (r + g + b) / 3;
  if (brightness > 245 || brightness < 50) return 'none';
  
  // If it's close to white/grey (low saturation), skip
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (saturation < 0.05 && brightness > 200) return 'none';
  
  let bestColor = 'none';
  let bestDist = Infinity;
  
  for (const [name, c] of Object.entries(TOPIC_COLORS)) {
    const dist = colorDistance(r, g, b, c.r, c.g, c.b);
    if (dist < bestDist) {
      bestDist = dist;
      bestColor = name;
    }
  }
  
  // Only classify if reasonably close
  return bestDist < 80 ? bestColor : 'none';
}

async function analyzePageColors(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  
  // Get raw pixel data
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const channels = info.channels;
  
  // Sample colors along vertical lines in the center text area
  // Typical mushaf page: text area is roughly 15%-85% width, 10%-90% height
  const xStart = Math.floor(width * 0.3);
  const xEnd = Math.floor(width * 0.7);
  const xSamples = [Math.floor(width * 0.35), Math.floor(width * 0.5), Math.floor(width * 0.65)];
  
  const yStart = Math.floor(height * 0.08);
  const yEnd = Math.floor(height * 0.85);
  
  // Collect color per Y position (average across X samples)
  const yColors = [];
  for (let y = yStart; y < yEnd; y += 2) {
    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    for (const x of xSamples) {
      const idx = (y * width + x) * channels;
      totalR += data[idx];
      totalG += data[idx + 1];
      totalB += data[idx + 2];
      count++;
    }
    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);
    const color = classifyColor(avgR, avgG, avgB);
    yColors.push({ y, r: avgR, g: avgG, b: avgB, color });
  }
  
  // Detect color bands (consecutive Y positions with the same color)
  const bands = [];
  let currentColor = null;
  let bandStart = 0;
  let colorCounts = {};
  
  for (let i = 0; i < yColors.length; i++) {
    const c = yColors[i].color;
    if (c === 'none') continue;
    
    if (c !== currentColor) {
      if (currentColor && currentColor !== 'none') {
        bands.push({ color: currentColor, yStart: bandStart, yEnd: yColors[i].y, height: yColors[i].y - bandStart });
      }
      currentColor = c;
      bandStart = yColors[i].y;
    }
    
    colorCounts[c] = (colorCounts[c] || 0) + 1;
  }
  // Push last band
  if (currentColor && currentColor !== 'none') {
    bands.push({ color: currentColor, yStart: bandStart, yEnd: yColors[yColors.length-1].y, height: yColors[yColors.length-1].y - bandStart });
  }
  
  // Merge small adjacent bands of the same color (noise filtering)
  const mergedBands = [];
  for (const band of bands) {
    if (mergedBands.length > 0 && mergedBands[mergedBands.length - 1].color === band.color) {
      mergedBands[mergedBands.length - 1].yEnd = band.yEnd;
      mergedBands[mergedBands.length - 1].height = band.yEnd - mergedBands[mergedBands.length - 1].yStart;
    } else if (band.height > 20) { // Filter out tiny bands (noise)
      mergedBands.push({ ...band });
    }
  }
  
  return {
    width, height,
    bands: mergedBands,
    colorDistribution: colorCounts,
    totalSamples: yColors.length
  };
}

async function main() {
  const pages = [1, 2, 50, 300, 604];
  
  for (const pg of pages) {
    const imgPath = path.join('phase0-data', 'raw', `page_${pg}.jpg`);
    if (!fs.existsSync(imgPath)) {
      console.log(`Page ${pg}: not found`);
      continue;
    }
    
    console.log(`\n=== Page ${pg} ===`);
    const result = await analyzePageColors(imgPath);
    console.log(`Dimensions: ${result.width}x${result.height}`);
    console.log('Color bands:');
    for (const band of result.bands) {
      const pct = ((band.height / result.height) * 100).toFixed(1);
      console.log(`  ${band.color}: y=${band.yStart}-${band.yEnd} (${pct}% of page)`);
    }
    console.log('Color distribution:', result.colorDistribution);
  }
}

main().catch(console.error);
