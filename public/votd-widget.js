/**
 * Al-Mushaf Al-Mufahras — Verse of the Day Web Component
 *
 * Usage on any website:
 *   <script src="https://your-domain.com/votd-widget.js"></script>
 *   <mushaf-votd lang="ar"></mushaf-votd>
 *
 * Attributes:
 *   lang="ar" | lang="en" — Display language (default: ar)
 *   theme="light" | theme="dark" — Color theme (default: light)
 *   base-url="https://..." — Base URL of deployed app (default: current origin)
 */
(function () {
  'use strict';

  const TOPICS_MAP = {
    blue:   { hex: '#3498DB', ar: 'دلائل قدرة الله وعظمته', en: "Signs of Allah's Power" },
    green:  { hex: '#27AE60', ar: 'السيرة النبوية والمؤمنين', en: 'Seerah & Believers' },
    brown:  { hex: '#8E6B3D', ar: 'آيات الأحكام والفقه', en: 'Rulings & Fiqh' },
    yellow: { hex: '#F1C40F', ar: 'قصص الأنبياء', en: 'Stories of Prophets' },
    purple: { hex: '#8E44AD', ar: 'مكانة القرآن', en: 'Status of Quran' },
    orange: { hex: '#E67E22', ar: 'اليوم الآخر', en: 'Afterlife & Judgment' },
    red:    { hex: '#E74C3C', ar: 'أوصاف النار', en: 'Hellfire & Punishment' },
  };

  function djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
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
      return ['lang', 'theme', 'base-url'];
    }

    attributeChangedCallback() {
      this._render();
    }

    async _render() {
      const lang = this.getAttribute('lang') || 'ar';
      const theme = this.getAttribute('theme') || 'light';
      const baseUrl = this.getAttribute('base-url') || window.location.origin;
      const ar = lang === 'ar';

      const shadow = this.shadowRoot;
      shadow.innerHTML = this._loadingHTML(theme, ar);

      try {
        const res = await fetch(baseUrl + '/data/topics_master.json');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const verses = data.verses;
        const date = new Date().toISOString().split('T')[0];
        const idx = djb2Hash(date) % verses.length;
        const verse = verses[idx];
        const topicInfo = TOPICS_MAP[verse.topic.color] || TOPICS_MAP.blue;

        shadow.innerHTML = this._verseHTML(verse, topicInfo, theme, ar, baseUrl);
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
          :host { display: block; max-width: 500px; }
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

    _verseHTML(verse, topicInfo, theme, ar, baseUrl) {
      const bg = theme === 'dark' ? '#1a1510' : '#fefcf8';
      const text = theme === 'dark' ? '#e8dcc8' : '#2c1810';
      const border = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      const sub = theme === 'dark' ? '#888' : '#999';
      const linkColor = theme === 'dark' ? '#d4a843' : '#b8860b';
      const hex = topicInfo.hex;
      const topicLabel = ar ? topicInfo.ar : topicInfo.en;

      return `
        <style>
          :host { display: block; max-width: 500px; }
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
          a:hover { opacity: 0.8; }
        </style>
        <div style="font-family: 'Amiri', serif; direction: ${ar ? 'rtl' : 'ltr'};
          padding: 20px 24px; border-radius: 16px;
          border: 1px solid ${hex}40; background: linear-gradient(135deg, ${hex}12, ${hex}06);
          background-color: ${bg};">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 18px;">🌟</span>
            <span style="font-weight: 700; font-size: 14px; color: ${hex}; flex: 1;">
              ${ar ? 'آية اليوم' : 'Verse of the Day'}
            </span>
            <a href="${baseUrl}" target="_blank" rel="noopener noreferrer"
               style="font-size: 11px; color: ${linkColor}; text-decoration: none; opacity: 0.7;">
              ${ar ? 'المصحف المفهرس ↗' : 'Al-Mushaf ↗'}
            </a>
          </div>
          <p style="font-size: 20px; line-height: 2.4; color: ${text}; margin: 0 0 12px 0;">
            ${this._escapeHtml(verse.text)}
          </p>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #fff; font-size: 11px; font-weight: 500;
              padding: 3px 10px; border-radius: 8px; background: ${hex};">
              ${this._escapeHtml(topicLabel)}
            </span>
            <span style="font-size: 12px; color: ${sub};">
              ${verse.surah}:${verse.ayah}
            </span>
          </div>
        </div>
      `;
    }

    _errorHTML(theme, ar) {
      const bg = theme === 'dark' ? '#1a1510' : '#fefcf8';
      const border = theme === 'dark' ? '#3a3020' : '#e0d5c3';
      return `
        <style>:host { display: block; max-width: 500px; }</style>
        <div style="font-family: 'Amiri', serif; direction: ${ar ? 'rtl' : 'ltr'};
          padding: 20px 24px; border-radius: 16px; border: 1px solid ${border};
          background: ${bg}; text-align: center; color: #999;">
          ${ar ? 'تعذر تحميل آية اليوم' : 'Unable to load verse'}
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
