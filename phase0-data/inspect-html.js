const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('phase0-data/raw/sample_page_1_1.html', 'utf-8');
const $ = cheerio.load(html);

// Look at the page/mushaf structure
console.log('=== Elements with class "page" ===');
$('.page').each((i, el) => {
  const style = $(el).attr('style') || '';
  const cls = $(el).attr('class') || '';
  console.log(`Page ${i}: class="${cls}" style="${style}"`);
  // Show children structure
  $(el).children().each((j, child) => {
    const childTag = $(child).prop('tagName');
    const childCls = $(child).attr('class') || '';
    const childStyle = $(child).attr('style') || '';
    const text = $(child).text().trim().substring(0, 100);
    console.log(`  Child ${j}: <${childTag} class="${childCls}" style="${childStyle}"> ${text}`);
  });
});

console.log('\n=== ayah-tag elements ===');
$('.ayah-tag').each((i, el) => {
  const parent = $(el).parent();
  const parentStyle = parent.attr('style') || '';
  const parentCls = parent.attr('class') || '';
  const text = $(el).text().trim();
  console.log(`ayah-tag ${i}: "${text}" | parent: class="${parentCls}" style="${parentStyle}"`);
});

console.log('\n=== ayah-chars elements ===');
$('.ayah-chars').each((i, el) => {
  const style = $(el).attr('style') || '';
  const text = $(el).text().trim().substring(0, 120);
  const parentStyle = $(el).parent().attr('style') || '';
  const parentCls = $(el).parent().attr('class') || '';
  console.log(`ayah-chars ${i}: style="${style}" parentCls="${parentCls}" parentStyle="${parentStyle}" text: ${text}`);
});

// Look for any elements with background-color style
console.log('\n=== ALL elements with background-color in style ===');
$('*[style]').each((i, el) => {
  const style = $(el).attr('style') || '';
  if (style.includes('background')) {
    const tag = $(el).prop('tagName');
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim().substring(0, 80);
    console.log(`<${tag} class="${cls}" style="${style}"> ${text}`);
  }
});

// Look for any data attributes
console.log('\n=== Elements with data-* attributes ===');
const dataElements = [];
$('*').each((i, el) => {
  const attrs = el.attribs || {};
  Object.keys(attrs).filter(k => k.startsWith('data-')).forEach(k => {
    dataElements.push(`${$(el).prop('tagName')}.${$(el).attr('class') || ''}: ${k}="${attrs[k]}"`);
  });
});
// Unique data attributes
const unique = [...new Set(dataElements)];
unique.forEach(d => console.log(d));

// Show the structure around the mushaf content
console.log('\n=== Looking for colored divs/spans ===');
$('div, span').each((i, el) => {
  const style = $(el).attr('style') || '';
  if (style.match(/#[0-9a-fA-F]{3,6}|rgb/)) {
    const tag = $(el).prop('tagName');
    const cls = $(el).attr('class') || '';
    const text = $(el).text().trim().substring(0, 60);
    console.log(`<${tag} class="${cls}" style="${style}"> ${text}`);
  }
});
