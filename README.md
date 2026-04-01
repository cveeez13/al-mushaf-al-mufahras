# المصحف المفهرس — Al-Mushaf Al-Mufahras

A **topic-indexed Quran viewer** that color-codes every verse by its primary topic, allowing readers to visually grasp the thematic flow of each page, surah, and juz.

## Features

- **7 Color-Coded Topics** — Every verse is assigned one of seven thematic categories, each with a distinct color
- **Page-Accurate Layout** — 604 pages matching the standard Mushaf (Madina print)
- **Topic Summary Bar** — Visual breakdown of topic distribution per page
- **Topics Directory** — Browse all 7 topics with verse counts and statistics
- **Bookmark System** — Save verses and navigate back to them (localStorage)
- **Reading Statistics** — Track pages read, streaks, and overall progress
- **Dark Mode** — Toggle between light, dark, and system themes
- **Bilingual UI** — Full Arabic and English interface (i18n)
- **Search** — Full-text verse search with topic filter
- **Surah Index** — Quick navigation to any of 114 surahs
- **Keyboard Navigation** — Arrow keys for page navigation
- **Swipe Navigation** — Touch swipe for mobile devices
- **Static Export** — Runs as a fully static site (no server required)

## Topics

| # | Color | Topic (AR) | Topic (EN) |
|---|-------|-----------|-----------|
| 1 | 🔵 Blue | دلائل قدرة الله وعظمته | Signs of Allah's Power & Greatness |
| 2 | 🟢 Green | السيرة النبوية، صفات المؤمنين، الجنة | Seerah, Believers, Paradise |
| 3 | 🟤 Brown | آيات الأحكام والفقه | Rulings & Jurisprudence (Fiqh) |
| 4 | 🟡 Yellow | قصص الأنبياء والأمم السابقة | Stories of Prophets & Past Nations |
| 5 | 🟣 Purple | مكانة القرآن ورد الشبهات | Status of Quran & Refuting Doubts |
| 6 | 🟠 Orange | اليوم الآخر، الموت، البعث، الحساب | Afterlife, Death, Resurrection, Judgment |
| 7 | 🔴 Red | أوصاف النار وعذاب الكافرين | Hellfire & Punishment of Disbelievers |

## Tech Stack

- **Next.js 16** with App Router and static export (`output: 'export'`)
- **React 19** with TypeScript
- **Tailwind CSS v4**
- **Vitest** + Testing Library for unit tests
- **ESLint** with Next.js recommended config

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production (static export)
npm run build
```

The built site will be in the `out/` directory, ready for deployment to any static hosting (GitHub Pages, Netlify, Vercel, etc.).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts & i18n provider
│   ├── page.tsx            # Main page with tab routing
│   └── globals.css         # Global styles, dark mode, transitions
├── components/
│   ├── MushafViewer.tsx    # Core page viewer with topic coloring
│   ├── TopBar.tsx          # Navigation bar with tabs & controls
│   ├── Sidebar.tsx         # Sidebar with surah index & search
│   ├── TopicLegend.tsx     # Color legend for topics
│   ├── TopicSummaryBar.tsx # Page topic distribution bar
│   ├── TopicsIndex.tsx     # Topics directory page
│   ├── BookmarkPanel.tsx   # Bookmark management
│   └── StatsPanel.tsx      # Reading statistics dashboard
├── lib/
│   ├── types.ts            # Type definitions & constants
│   ├── data.ts             # Data loading & search functions
│   ├── i18n.tsx            # Internationalization (AR/EN)
│   ├── TopicClassifier.ts  # Topic classification service
│   ├── useTheme.ts         # Dark/light/system theme hook
│   ├── useBookmarks.ts     # Bookmark hook with localStorage
│   └── useReadingStats.ts  # Reading stats hook
└── __tests__/              # Unit tests (49 test cases)
```

## Data Pipeline (Phase 0)

The `phase0-data/` directory contains the classification pipeline that generated the topic assignments:

1. **classify.ts** — Classifies 6,236 verses into 7 topics using GPT-4
2. **derive.ts** — Derives page/surah/juz statistics from classifications
3. **sqlite.ts** — Exports data to SQLite database
4. **verify.ts** — Runs verification checks on data integrity

## License

MIT
