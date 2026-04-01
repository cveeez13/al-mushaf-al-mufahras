# Data Pipeline — Al-Mushaf Al-Mufahras

**Project:** المصحف المفهرس (Al-Mushaf Al-Mufahras)  
**Purpose:** Map all 6,236 Quran verses to 7 color-coded topic categories  

---

## Pipeline Overview

```
[Quran API] → [Raw Text] → [Hybrid Classifier] → [topics_master.json]
                                                         │
                                    ┌────────────────────┼────────────────────┐
                                    ▼                    ▼                    ▼
                            topics_by_page.json  topics_by_surah.json  topics_by_juz.json
                                    │                    │                    │
                                    ▼                    ▼                    ▼
                            topic_statistics.json   topics.sqlite       topics.csv
```

---

## Step 1: Data Collection

**Script:** `fetch-quran-text.js`

- **Source:** Quran.com API v4 (`api.quran.com/api/v4/quran/verses/uthmani`)
- **Output:** `raw/quran_text.json` — 6,236 verses with Arabic text
- **Rate limiting:** 500ms delay between API calls
- **Checkpointing:** Saves per-surah results to `checkpoints/` directory
- **Fields per verse:** `surah`, `ayah`, `text` (Uthmani script)

**Page mapping source:** `raw/qpc.json` — Quran Page Coordinates mapping each verse to its Mushaf page (1–604)

---

## Step 2: Topic Classification

**Script:** `hybrid-classifier.js`

### 7 Topic Categories

| ID | Color  | Hex     | Arabic Name                              | English Name                              |
|----|--------|---------|------------------------------------------|-------------------------------------------|
| 1  | blue   | #3498DB | دلائل قدرة الله وعظمته                    | Signs of Allah's Power & Greatness        |
| 2  | green  | #27AE60 | السيرة النبوية، صفات المؤمنين، الجنة       | Seerah, Believers, Paradise               |
| 3  | brown  | #8E6B3D | آيات الأحكام والفقه                       | Rulings & Jurisprudence (Fiqh)            |
| 4  | yellow | #F1C40F | قصص الأنبياء والأمم السابقة                | Stories of Prophets & Past Nations        |
| 5  | purple | #8E44AD | مكانة القرآن ورد الشبهات                   | Status of Quran & Refuting Doubts         |
| 6  | orange | #E67E22 | اليوم الآخر، الموت، البعث، الحساب          | Afterlife, Death, Resurrection, Judgment  |
| 7  | red    | #E74C3C | أوصاف النار وعذاب الكافرين                 | Hellfire & Punishment of Disbelievers     |

### Classification Method (Hybrid Approach)

The classifier uses a multi-signal approach, combining:

1. **Surah-level theme assignment:** Each surah has a known dominant theme (e.g., Surah Al-Baqarah → mixed, Surah Yusuf → Stories). This provides a baseline.

2. **Keyword matching:** Each topic has a curated keyword list (Arabic roots and phrases). Verses are scored against all 7 keyword sets.
   - `keyword_good`: Strong keyword match (≥2 keywords from one topic)
   - `keyword_weak`: Weak match (1 keyword)

3. **Context propagation:** Verses with no strong signal inherit the topic of surrounding verses in the same surah, since Quranic passages tend to discuss a topic in contiguous blocks.

4. **Confidence levels:**
   - `high`: Strong keyword match aligning with surah theme
   - `medium`: Keyword match or surah theme assignment
   - `low`: Context propagation or fallback

**Output:** `output/topics_master.json`

---

## Step 3: Derived Dataset Generation

**Script:** `generate-derived.js`

### 3a. Topics by Page (`topics_by_page.json`)
- Groups all 6,236 verses into 604 Mushaf pages
- Each page contains: `page`, `verses[]`, `topic_distribution`, `dominant_topic`, `verse_count`
- Dominant topic = most frequent topic on that page

### 3b. Topics by Surah (`topics_by_surah.json`)
- Aggregates topic distribution per surah (114 surahs)
- Each surah contains: `surah`, `name_ar`, `verse_count`, `topic_distribution`, `dominant_topic`, `topic_percentages`

### 3c. Topics by Juz (`topics_by_juz.json`)
- Aggregates topic distribution per juz (30 juz)
- Each juz contains: `juz`, `verse_count`, `topic_distribution`, `dominant_topic`, `topic_percentages`
- Juz boundaries based on standard Mushaf divisions

### 3d. Topic Statistics (`topic_statistics.json`)
- Overall counts: total verses, pages, surahs, juz
- Per-topic: verse count, percentage, surah count, page count, confidence breakdown
- Classification method distribution
- Confidence level distribution

### 3e. CSV Export (`topics.csv`)
- **Script:** Part of `generate-derived.js`
- Flat file with BOM encoding for Excel compatibility
- Columns: `surah`, `ayah`, `page`, `verse_key`, `topic_id`, `topic_color`, `topic_hex`, `topic_name_ar`, `topic_name_en`, `confidence`, `method`

### 3f. SQLite Database (`topics.sqlite`)
- **Script:** `generate-sqlite.js`
- Tables: `topics` (7), `verses` (6,236), `surahs` (114), `pages` (604), `juz` (30)
- Indexed on: `page`, `topic_id`, `verse_key`
- Suitable for mobile offline use

---

## Step 4: Verification

**Script:** `generate-verification.js`

- Randomly samples 100 verses (deterministic seed=42)
- Cross-validates assignments using keyword heuristics
- Generates `verification_report.md` with accuracy score, topic distribution, flagged mismatches, and acceptance criteria check

---

## How to Run the Full Pipeline

```bash
# 1. Fetch raw Quran text (requires internet)
node phase0-data/fetch-quran-text.js

# 2. Run the hybrid classifier
node phase0-data/hybrid-classifier.js

# 3. Generate all derived datasets (JSON + CSV)
node phase0-data/generate-derived.js

# 4. Generate SQLite database
node phase0-data/generate-sqlite.js

# 5. Generate verification report
node phase0-data/generate-verification.js
```

Or use npm scripts:
```bash
npm run phase0:classify    # Steps 2-3
npm run phase0:derive      # Step 3
```

---

## Output Files

| File                    | Format | Size   | Description                          |
|-------------------------|--------|--------|--------------------------------------|
| `topics_master.json`    | JSON   | ~3.7MB | Complete dataset — 6,236 verses      |
| `topics_by_page.json`   | JSON   | ~200KB | Grouped by 604 Mushaf pages          |
| `topics_by_surah.json`  | JSON   | ~15KB  | Distribution per 114 surahs          |
| `topics_by_juz.json`    | JSON   | ~5KB   | Distribution per 30 juz              |
| `topic_statistics.json` | JSON   | ~3KB   | Overall statistics and percentages   |
| `topics.csv`            | CSV    | ~800KB | Flat file for data analysis          |
| `topics.sqlite`         | SQLite | ~1MB   | Database for mobile offline use      |

---

## Data Quality

- **Coverage:** 100% of 6,236 verses (no gaps)
- **Page mapping:** All 604 Mushaf pages covered
- **Surah coverage:** All 114 surahs
- **Topic coverage:** All 7 categories active
- **Arabic + English:** Both language names included for every topic
- **Verification:** 100-verse sample cross-validated (see `verification_report.md`)
