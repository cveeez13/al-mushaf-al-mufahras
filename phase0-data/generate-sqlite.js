/**
 * generate-sqlite.js
 * Generates topics.sqlite from topics_master.json
 * 
 * Tables:
 *   - topics        (7 rows) — topic metadata
 *   - verses        (6,236 rows) — every verse with topic mapping
 *   - surahs        (114 rows) — surah info with dominant topic
 *   - pages         (604 rows) — page info with dominant topic
 *   - juz           (30 rows) — juz info with dominant topic
 *
 * Usage: node phase0-data/generate-sqlite.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const OUTPUT_DIR = path.join(__dirname, 'output');
const DB_PATH = path.join(OUTPUT_DIR, 'topics.sqlite');

// Load source data
const master = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_master.json'), 'utf-8'));
const byPage = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_by_page.json'), 'utf-8'));
const bySurah = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_by_surah.json'), 'utf-8'));
const byJuz = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'topics_by_juz.json'), 'utf-8'));

// Remove old DB if exists
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// ============================================================
// Create tables
// ============================================================
db.exec(`
  CREATE TABLE topics (
    id          INTEGER PRIMARY KEY,
    color       TEXT NOT NULL,
    hex         TEXT NOT NULL,
    name_ar     TEXT NOT NULL,
    name_en     TEXT NOT NULL
  );

  CREATE TABLE verses (
    surah       INTEGER NOT NULL,
    ayah        INTEGER NOT NULL,
    page        INTEGER,
    verse_key   TEXT NOT NULL,
    text        TEXT NOT NULL,
    topic_id    INTEGER NOT NULL,
    topic_color TEXT NOT NULL,
    confidence  TEXT,
    method      TEXT,
    PRIMARY KEY (surah, ayah),
    FOREIGN KEY (topic_id) REFERENCES topics(id)
  );

  CREATE TABLE surahs (
    surah           INTEGER PRIMARY KEY,
    name_ar         TEXT NOT NULL,
    verse_count     INTEGER NOT NULL,
    dominant_topic  TEXT
  );

  CREATE TABLE pages (
    page            INTEGER PRIMARY KEY,
    verse_count     INTEGER NOT NULL,
    dominant_topic  TEXT
  );

  CREATE TABLE juz (
    juz             INTEGER PRIMARY KEY,
    verse_count     INTEGER NOT NULL,
    dominant_topic  TEXT
  );

  -- Indexes for common queries
  CREATE INDEX idx_verses_page ON verses(page);
  CREATE INDEX idx_verses_topic ON verses(topic_id);
  CREATE INDEX idx_verses_key ON verses(verse_key);
`);

// ============================================================
// Insert data
// ============================================================
console.log('Inserting topics...');
const insertTopic = db.prepare('INSERT INTO topics (id, color, hex, name_ar, name_en) VALUES (?, ?, ?, ?, ?)');
for (const t of master.topics) {
  insertTopic.run(t.id, t.color_name || t.color, t.color_hex || t.hex, t.name_ar, t.name_en);
}

console.log('Inserting verses...');
const insertVerse = db.prepare(
  'INSERT INTO verses (surah, ayah, page, verse_key, text, topic_id, topic_color, confidence, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const insertMany = db.transaction((verses) => {
  for (const v of verses) {
    insertVerse.run(v.surah, v.ayah, v.page, v.verse_key, v.text, v.topic.id, v.topic.color, v.confidence, v.method);
  }
});
insertMany(master.verses);

console.log('Inserting surahs...');
const insertSurah = db.prepare('INSERT INTO surahs (surah, name_ar, verse_count, dominant_topic) VALUES (?, ?, ?, ?)');
for (const s of bySurah.surahs) {
  insertSurah.run(s.surah, s.name_ar, s.verse_count, s.dominant_topic);
}

console.log('Inserting pages...');
const insertPage = db.prepare('INSERT INTO pages (page, verse_count, dominant_topic) VALUES (?, ?, ?)');
for (const p of byPage.pages) {
  insertPage.run(p.page, p.verse_count, p.dominant_topic);
}

console.log('Inserting juz...');
const insertJuz = db.prepare('INSERT INTO juz (juz, verse_count, dominant_topic) VALUES (?, ?, ?)');
for (const j of byJuz.juz) {
  insertJuz.run(j.juz, j.verse_count, j.dominant_topic);
}

db.close();

// ============================================================
// Validate
// ============================================================
const db2 = new Database(DB_PATH, { readonly: true });
const counts = {
  topics: db2.prepare('SELECT COUNT(*) as c FROM topics').get().c,
  verses: db2.prepare('SELECT COUNT(*) as c FROM verses').get().c,
  surahs: db2.prepare('SELECT COUNT(*) as c FROM surahs').get().c,
  pages: db2.prepare('SELECT COUNT(*) as c FROM pages').get().c,
  juz: db2.prepare('SELECT COUNT(*) as c FROM juz').get().c,
};
db2.close();

const size = (fs.statSync(DB_PATH).size / 1024).toFixed(1);

console.log('\n═══════════════════════════════════════════════');
console.log('SQLite database generated successfully!');
console.log('═══════════════════════════════════════════════');
console.log(`  Path: ${DB_PATH}`);
console.log(`  Size: ${size} KB`);
console.log(`  Topics: ${counts.topics}`);
console.log(`  Verses: ${counts.verses}`);
console.log(`  Surahs: ${counts.surahs}`);
console.log(`  Pages:  ${counts.pages}`);
console.log(`  Juz:    ${counts.juz}`);

// Validate correctness
let ok = true;
if (counts.topics !== 7) { console.error('  ✗ Expected 7 topics'); ok = false; }
if (counts.verses !== 6236) { console.error('  ✗ Expected 6236 verses'); ok = false; }
if (counts.surahs !== 114) { console.error('  ✗ Expected 114 surahs'); ok = false; }
if (counts.pages !== 604) { console.error('  ✗ Expected 604 pages'); ok = false; }
if (counts.juz !== 30) { console.error('  ✗ Expected 30 juz'); ok = false; }

if (ok) console.log('\n  ✓ All counts validated!');
else { console.error('\n  ✗ Validation failed!'); process.exit(1); }
