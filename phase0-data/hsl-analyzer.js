const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SCAN_DIR = path.join(__dirname, 'raw', 'scans');

// Calibrated reference colors in HSL (more reliable than RGB for pastel colors)
// Based on confirmed page inspections:
// Blue:   Page 1 Fatiha, Page 5 top (creation) - cool blue-grey tint
// Green:  Page 50 bottom (believers) - clear green, very distinct
// Brown:  Page 37, 77 (fiqh/rulings) - warm peach/salmon 
// Yellow: Page 5 bottom, 300 (stories) - warm cream/yellow
// Purple: Page 2 top (Quran status) - lavender, blue-purple
// Orange: Day of Judgment scenes - light peach/orange  
// Red:    Punishment/hellfire - pink/light red

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function classifyHSL(h, s, l) {
  // Skip near-white, near-black, and very unsaturated
  if (l > 96 || l < 30) return null;
  if (s < 3 && l > 85) return null; // Grey/white
  
  // Very low saturation with mid-lightness => probably text/decoration
  if (s < 5) return null;
  
  // --- Classification by hue ranges ---
  
  // PURPLE: hue 220-290, distinct blue-purple with balanced R/G and high B
  if (h >= 220 && h <= 290 && s >= 5) {
    return 'purple';
  }
  
  // BLUE: hue 180-220, cooler blue
  if (h >= 180 && h <= 220 && s >= 5) {
    return 'blue';
  }
  
  // GREEN: hue 60-170, G channel dominant
  if (h >= 60 && h <= 170 && s >= 8) {
    return 'green';
  }
  
  // YELLOW: hue 45-65, warm cream
  if (h >= 40 && h <= 65 && s >= 10) {
    return 'yellow';
  }
  
  // RED/PINK: hue 310-360 or 0-15
  if ((h >= 310 || h <= 15) && s >= 8) {
    // Distinguish red from brown and pink from orange:
    // Red (hellfire) = more pink, lighter, hue closer to 340-360
    // Brown (fiqh) = more orange-ish, hue closer to 0-15, warmer  
    if (h >= 340 || h <= 5) {
      if (l > 80) return 'red';   // Lighter pink = red topic
      return 'brown';              // Darker = brown topic
    }
    if (h >= 310 && h < 340) {
      return 'red'; // Pinkish = red
    }
    return 'red';
  }
  
  // ORANGE: hue 15-40, peach/orange
  if (h >= 15 && h <= 40 && s >= 8) {
    if (l > 82) return 'orange'; // Lighter peach = orange topic
    return 'brown';               // Darker warm = brown topic
  }
  
  // BROWN: hue 0-30, warm and darker
  if (h >= 0 && h <= 30 && s >= 5 && l < 82) {
    return 'brown';
  }
  
  return null;
}

async function analyzePageFull(pageNum) {
  const imgPath = path.join(SCAN_DIR, `${pageNum}.jpg`);
  if (!fs.existsSync(imgPath)) return null;
  
  try {
    const image = sharp(imgPath);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    
    // Text area boundaries (avoiding decorative borders)
    const xStart = Math.floor(width * 0.18);
    const xEnd = Math.floor(width * 0.82);
    const yStart = Math.floor(height * 0.06);
    const yEnd = Math.floor(height * 0.86);
    
    // Sample at each Y row
    const rowColors = [];
    
    for (let y = yStart; y < yEnd; y += 2) {
      const pixels = [];
      for (let x = xStart; x < xEnd; x += Math.floor((xEnd - xStart) / 15)) {
        const idx = (y * width + x) * ch;
        pixels.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
      }
      
      // Filter to background pixels only (exclude text = dark, borders = very bright)
      const bgPixels = pixels.filter(p => {
        const brightness = (p.r + p.g + p.b) / 3;
        return brightness > 150 && brightness < 253;
      });
      
      if (bgPixels.length < 5) {
        rowColors.push({ y, color: null });
        continue;
      }
      
      // Median color (more robust than average)
      bgPixels.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
      const mid = Math.floor(bgPixels.length / 2);
      const median = bgPixels[mid];
      
      const hsl = rgbToHsl(median.r, median.g, median.b);
      const color = classifyHSL(hsl.h, hsl.s, hsl.l);
      
      rowColors.push({ y, color, r: median.r, g: median.g, b: median.b, h: hsl.h, s: hsl.s, l: hsl.l });
    }
    
    // Detect color bands with smoothing
    const bands = [];
    let currentColor = null;
    let bandStartY = yStart;
    let colorRun = 0;
    
    for (const row of rowColors) {
      if (row.color === null) continue;
      
      if (row.color !== currentColor) {
        if (currentColor && colorRun > 8) { // At least ~16px height
          bands.push({ 
            color: currentColor, 
            yStart: bandStartY, 
            yEnd: row.y, 
            heightPct: ((row.y - bandStartY) / (yEnd - yStart) * 100).toFixed(1)
          });
        }
        currentColor = row.color;
        bandStartY = row.y;
        colorRun = 0;
      }
      colorRun++;
    }
    // Final band
    if (currentColor && colorRun > 8) {
      bands.push({ 
        color: currentColor, 
        yStart: bandStartY, 
        yEnd: yEnd,
        heightPct: ((yEnd - bandStartY) / (yEnd - yStart) * 100).toFixed(1)
      });
    }
    
    // Merge adjacent bands of same color
    const merged = [];
    for (const band of bands) {
      if (merged.length > 0 && merged[merged.length - 1].color === band.color) {
        const last = merged[merged.length - 1];
        last.yEnd = band.yEnd;
        last.heightPct = ((band.yEnd - last.yStart) / (yEnd - yStart) * 100).toFixed(1);
      } else {
        merged.push({ ...band });
      }
    }
    
    return { page: pageNum, width, height, bands: merged };
  } catch (err) {
    return { page: pageNum, error: err.message };
  }
}

async function main() {
  // Test on known pages first
  const testPages = [1, 2, 5, 37, 50, 77, 100, 130, 150, 170, 180, 190];
  
  for (const pg of testPages) {
    const result = await analyzePageFull(pg);
    if (!result || result.error) {
      console.log(`Page ${pg}: ${result?.error || 'not found'}`);
      continue;
    }
    
    const bandsStr = result.bands.map(b => `${b.color}(${b.heightPct}%)`).join(' → ');
    console.log(`Page ${String(pg).padStart(3)}: ${bandsStr || 'no colors detected'}`);
  }
}

main().catch(console.error);
