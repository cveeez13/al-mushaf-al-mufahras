const sharp = require('sharp');
const path = require('path');

async function sampleColors(imagePath, pageName) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  
  console.log(`\n=== ${pageName} (${width}x${height}) ===`);
  
  // Sample at center-x, every 20px in y, within text area
  const xCenter = Math.floor(width * 0.5);
  const xLeft = Math.floor(width * 0.35);
  const xRight = Math.floor(width * 0.65);
  
  console.log('Y-pos | Center RGB | Left RGB | Right RGB | Avg');
  
  for (let y = Math.floor(height * 0.08); y < Math.floor(height * 0.90); y += 15) {
    const samples = [];
    for (const x of [xLeft, xCenter, xRight]) {
      const idx = (y * width + x) * channels;
      samples.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
    }
    
    const avgR = Math.round(samples.reduce((s, c) => s + c.r, 0) / 3);
    const avgG = Math.round(samples.reduce((s, c) => s + c.g, 0) / 3);
    const avgB = Math.round(samples.reduce((s, c) => s + c.b, 0) / 3);
    
    // Only show colored rows (not white/border)
    const brightness = (avgR + avgG + avgB) / 3;
    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    const sat = max === 0 ? 0 : (max - min) / max;
    
    if (brightness < 245 && brightness > 100 && sat > 0.03) {
      const hex = '#' + [avgR, avgG, avgB].map(c => c.toString(16).padStart(2, '0')).join('');
      console.log(`y=${String(y).padStart(3)} | (${avgR},${avgG},${avgB}) ${hex} | L(${samples[0].r},${samples[0].g},${samples[0].b}) R(${samples[2].r},${samples[2].g},${samples[2].b})`);
    }
  }
}

async function main() {
  // Analyze page 2 (known: purple for 2:1-2, green for 2:3-5)
  await sampleColors(path.join('phase0-data', 'raw', 'page_2.jpg'), 'Page 2 (Al-Baqarah 2:1-5)');
  
  // Analyze page 50 (known: red for 3:10-11, yellow for 3:12-13, green for 3:14-15)
  await sampleColors(path.join('phase0-data', 'raw', 'page_50.jpg'), 'Page 50 (Aal-Imran 3:10-15)');
  
  // Analyze page 300
  await sampleColors(path.join('phase0-data', 'raw', 'page_300.jpg'), 'Page 300');
}

main().catch(console.error);
