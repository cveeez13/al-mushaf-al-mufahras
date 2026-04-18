/**
 * Al-Mushaf Al-Mufahras - Embeddable recommendations widget
 *
 * Usage:
 *   <script src="https://your-domain.com/votd-widget.js"></script>
 *   <mushaf-votd mode="hybrid" count="3" lang="ar"></mushaf-votd>
 *
 * Attributes:
 *   mode="daily|recommendations|hybrid"
 *   count="1..6"
 *   lang="ar|en"
 *   theme="light|dark"
 *   base-url="https://..."
 */
(function () {
  'use strict';

  const TOPICS_MAP = {
    olive: { hex: '#7C8E3E', ar: 'دلائل قدرة الله وعظمته', en: "Signs of Allah's Power" },
    sky: { hex: '#5BA3CF', ar: 'السيرة والمؤمنون والجنة', en: 'Seerah & Believers' },
    gold: { hex: '#C9A43E', ar: 'آيات الأحكام والفقه', en: 'Rulings & Fiqh' },
    pink: { hex: '#D4839B', ar: 'قصص الأنبياء', en: 'Stories of Prophets' },
    purple: { hex: '#9B8EC4', ar: 'مكانة القرآن', en: 'Status of Quran' },
    turquoise: { hex: '#4DBDB5', ar: 'اليوم الآخر', en: 'Afterlife & Judgment' },
    orange: { hex: '#D4854A', ar: 'أوصاف النار', en: 'Hellfire & Punishment' },
  };

  function djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function pickRecommendations(verses, mode, count) {
    const date = new Date().toISOString().split('T')[0];
    const dailyIndex = djb2Hash(date) % verses.length;
    const picked = [];
    const used = new Set();

    const daily = verses[dailyIndex];
    picked.push({ verse: daily, reasonAr: 'آية اليوم', reasonEn: 'Verse of the Day' });
    used.add(daily.verse_key);

    if (mode === 'daily') return picked.slice(0, 1);

    for (let i = 0; picked.length < Math.max(2, count); i++) {
      const idx = djb2Hash(date + ':rec:' + i) % verses.length;
      const candidate = verses[idx];
      if (!candidate || used.has(candidate.verse_key)) continue;
      used.add(candidate.verse_key);
      picked.push({
        verse: candidate,
        reasonAr: i % 2 === 0 ? 'اكتشف موضوعًا جديدًا' : 'اقتراح متوازن',
        reasonEn: i % 2 === 0 ? 'Discover a new topic' : 'Balanced suggestion',
      });
    }

    if (mode === 'recommendations') {
      return picked.slice(1, count + 1);
    }

    return picked.slice(0, count);
  }

  class MushafVotd extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._render();
    }

    static get observedAttributes() {
      return ['lang', 'theme', 'base-url', 'mode', 'count'];
    }

    attributeChangedCallback() {
      this._render();
    }

    async _render() {
      const lang = this.getAttribute('lang') || 'ar';
      const theme = this.getAttribute('theme') || 'light';
      const baseUrl = this.getAttribute('base-url') || window.location.origin;
      const mode = this.getAttribute('mode') || 'hybrid';
      const count = Math.max(1, Math.min(6, Number(this.getAttribute('count')) || 3));
      const ar = lang === 'ar';

      const shadow = this.shadowRoot;
      shadow.innerHTML = this._loadingHTML(theme, ar);

      try {
        const res = await fetch(baseUrl + '/data/topics_master.json');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const items = pickRecommendations(data.verses, mode, count);
        shadow.innerHTML = this._widgetHTML(items, theme, ar, baseUrl, mode);
      } catch {
        shadow.innerHTML = this._errorHTML(theme, ar);
      }
    }

    _loadingHTML(theme, ar) {
      const bg = theme === 'dark' ? '#1a1510' : '#fefcf8';
      const border = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      const skelBg = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      return `
        <style>
          :host { display: block; max-width: 620px; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          .skel { background: ${skelBg}; border-radius: 6px; animation: pulse 1.5s infinite; }
        </style>
        <div style="font-family: 'Amiri', serif; direction: ${ar ? 'rtl' : 'ltr'};
          padding: 20px 24px; border-radius: 16px; border: 1px solid ${border}; background: ${bg};">
          <div class="skel" style="width: 35%; height: 16px; margin-bottom: 16px;"></div>
          <div class="skel" style="width: 100%; height: 24px; margin-bottom: 8px;"></div>
          <div class="skel" style="width: 60%; height: 24px;"></div>
        </div>
      `;
    }

    _widgetHTML(items, theme, ar, baseUrl, mode) {
      const bg = theme === 'dark' ? '#1a1510' : '#fefcf8';
      const border = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      const title = mode === 'daily'
        ? (ar ? 'آية اليوم' : 'Verse of the Day')
        : (ar ? 'توصيات قرآنية ذكية' : 'Smart Quran Recommendations');

      const cards = items.map((item) => {
        const topic = TOPICS_MAP[item.verse.topic.color] || TOPICS_MAP.olive;
        return `
          <div style="border:1px solid ${topic.hex}35; border-radius:14px; padding:14px 16px;
            background:linear-gradient(135deg, ${topic.hex}12, ${topic.hex}06);">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:8px;">
              <span style="font-size:11px; font-weight:700; color:${topic.hex};">
                ${this._escapeHtml(ar ? item.reasonAr : item.reasonEn)}
              </span>
              <span style="font-size:12px; color:#999;">
                ${item.verse.surah}:${item.verse.ayah}
              </span>
            </div>
            <p style="font-size:20px; line-height:2.2; color:${theme === 'dark' ? '#e8dcc8' : '#2c1810'};
              margin:0 0 12px 0;">
              ${this._escapeHtml(item.verse.text)}
            </p>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="color:#fff; font-size:11px; font-weight:500; padding:3px 10px;
                border-radius:8px; background:${topic.hex};">
                ${this._escapeHtml(ar ? topic.ar : topic.en)}
              </span>
              ${item.verse.page ? `<span style="font-size:12px; color:#999;">${ar ? 'ص' : 'p.'} ${item.verse.page}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <style>
          :host { display: block; max-width: 620px; }
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
          a:hover { opacity: 0.8; }
        </style>
        <div style="font-family:'Amiri', serif; direction:${ar ? 'rtl' : 'ltr'};
          padding:20px 24px; border-radius:16px; border:1px solid ${border}; background:${bg};">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="font-size:18px;">${mode === 'daily' ? '✦' : '▣'}</span>
            <span style="font-weight:700; font-size:14px; flex:1;">${title}</span>
            <a href="${baseUrl}" target="_blank" rel="noopener noreferrer"
               style="font-size:11px; color:#b8860b; text-decoration:none; opacity:0.7;">
              ${ar ? 'المصحف المفهرس ↗' : 'Al-Mushaf ↗'}
            </a>
          </div>
          <div style="display:grid; gap:10px;">
            ${cards}
          </div>
        </div>
      `;
    }

    _errorHTML(theme, ar) {
      const bg = theme === 'dark' ? '#1a1510' : '#fefcf8';
      const border = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      return `
        <style>:host { display: block; max-width: 620px; }</style>
        <div style="font-family:'Amiri', serif; direction:${ar ? 'rtl' : 'ltr'};
          padding:20px 24px; border-radius:16px; border:1px solid ${border};
          background:${bg}; text-align:center; color:#999;">
          ${ar ? 'تعذر تحميل التوصيات' : 'Unable to load recommendations'}
        </div>
      `;
    }

    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  if (!customElements.get('mushaf-votd')) {
    customElements.define('mushaf-votd', MushafVotd);
  }
})();
