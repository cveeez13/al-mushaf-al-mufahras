const axios = require('axios');
const cheerio = require('cheerio');

async function inspectPage(surah, ayah) {
  const url = `https://tafsir.app/m-mawdou/${surah}/${ayah}`;
  console.log(`Fetching: ${url}\n`);
  
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ar,en;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(html);
    
    // Log page title
    console.log('Title:', $('title').text());
    console.log('---');
    
    // Look for color-related elements
    console.log('\n=== Elements with color/style containing topic info ===');
    $('[style*="background"], [style*="color"], [class*="topic"], [class*="color"], [class*="mawdou"], [data-topic], [data-color]').each((i, el) => {
      if (i < 30) {
        const tag = $(el).prop('tagName');
        const cls = $(el).attr('class') || '';
        const style = $(el).attr('style') || '';
        const dataAttrs = Object.keys(el.attribs || {}).filter(k => k.startsWith('data-')).map(k => `${k}="${el.attribs[k]}"`).join(' ');
        const text = $(el).text().trim().substring(0, 80);
        console.log(`<${tag} class="${cls}" style="${style}" ${dataAttrs}> ${text}`);
      }
    });
    
    // Look for SVG or canvas elements (might be rendered images)
    console.log('\n=== SVG/Canvas/Image elements ===');
    $('svg, canvas, img[src*="mawdou"], img[src*="mushaf"], img[src*="page"]').each((i, el) => {
      const tag = $(el).prop('tagName');
      const src = $(el).attr('src') || '';
      console.log(`<${tag} src="${src}">`);
    });
    
    // Look for any JSON-LD or script with data
    console.log('\n=== Script tags with data ===');
    $('script:not([src])').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('topic') || content.includes('color') || content.includes('mawdou') || content.includes('ayah') || content.includes('surah') || content.includes('verse')) {
        console.log(`Script ${i}: ${content.substring(0, 500)}`);
      }
    });
    
    // Check for Next.js __NEXT_DATA__
    console.log('\n=== __NEXT_DATA__ or similar ===');
    $('script#__NEXT_DATA__').each((i, el) => {
      const content = $(el).html() || '';
      console.log(`NEXT_DATA found: ${content.substring(0, 1000)}`);
    });
    
    // Check all links and divs structure around the mushaf content
    console.log('\n=== Main content area structure ===');
    const body = $('body').html() || '';
    // Find unique class names
    const classRegex = /class="([^"]+)"/g;
    const classes = new Set();
    let match;
    while ((match = classRegex.exec(body)) !== null) {
      const cls = match[1];
      if (cls.match(/topic|color|mawdou|mushaf|verse|ayah|surah|page|quran/i)) {
        classes.add(cls);
      }
    }
    console.log('Relevant classes found:', [...classes].join('\n'));
    
    // Show full HTML size
    console.log(`\nTotal HTML size: ${html.length} chars`);
    
    // Save raw HTML for inspection
    const fs = require('fs');
    fs.writeFileSync('phase0-data/raw/sample_page_1_1.html', html, 'utf-8');
    console.log('\nRaw HTML saved to phase0-data/raw/sample_page_1_1.html');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectPage(1, 1);
