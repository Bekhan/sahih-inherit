/**
 * Модуль интернационализации (i18n)
 *
 * Использование:
 *   await I18n.init();
 *   I18n.setLanguage('en');
 *   I18n.t('header.title'); // "Islamic Inheritance Calculator"
 */

const I18n = {
  currentLanguage: "ru",
  translations: {},
  basePath: "",

  async init() {
    // Определяем базовый путь в зависимости от расположения страницы
    this.basePath = this.detectBasePath();

    const savedLang = localStorage.getItem("language");
    const browserLang = navigator.language.slice(0, 2);
    const htmlLang = document.documentElement.lang;

    // Приоритет: сохранённый язык > язык HTML > язык браузера > русский
    this.currentLanguage =
      savedLang || htmlLang || (browserLang === "en" ? "en" : "ru");

    await this.loadTranslations(this.currentLanguage);
    this.applyTranslations();

    return this;
  },

  /**
   * Определяет базовый путь к ресурсам
   * Для /en/index.html возвращает "../", для /index.html возвращает ""
   */
  detectBasePath() {
    const path = window.location.pathname;
    // Если мы в подпапке (например /en/), нужен путь на уровень выше
    if (path.includes("/en/") || path.endsWith("/en")) {
      return "../";
    }
    return "";
  },

  async loadTranslations(lang) {
    try {
      const response = await fetch(`${this.basePath}src/i18n/${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      this.translations[lang] = await response.json();
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);
      if (lang !== "ru") {
        await this.loadTranslations("ru");
        this.currentLanguage = "ru";
      }
    }
  },

  t(key, params = {}) {
    const keys = key.split(".");
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation not found: ${key}`);
        return key;
      }
    }

    if (typeof value === "string" && Object.keys(params).length > 0) {
      for (const [param, val] of Object.entries(params)) {
        value = value.replaceAll(`{${param}}`, val);
      }
    }

    return value;
  },

  async setLanguage(lang) {
    if (!this.translations[lang]) {
      await this.loadTranslations(lang);
    }
    this.currentLanguage = lang;
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
    this.applyTranslations();

    globalThis.dispatchEvent(
      new CustomEvent("languageChanged", { detail: { language: lang } })
    );
  },

  applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      el.placeholder = this.t(key);
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.dataset.i18nTitle;
      el.title = this.t(key);
    });

    document.title = this.t("meta.title");

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = this.t("meta.description");
    }

    // Рендерим динамические секции
    this.renderGlossary();
    this.renderFaq();
  },

  getAvailableLanguages() {
    return [
      { code: "ru", name: "Русский", shortName: "RU" },
      { code: "en", name: "English", shortName: "EN" },
    ];
  },

  /**
   * Генерирует глоссарий из локализации
   */
  renderGlossary() {
    const container = document.getElementById("glossary-grid");
    if (!container) return;

    const glossary = this.translations[this.currentLanguage]?.glossary;
    if (!glossary) return;

    // Ключи терминов (исключаем title)
    const termKeys = [
      "asaba",
      "awl",
      "radd",
      "hijb",
      "kalala",
      "dhawilArham",
      "furud",
      "wasiyyah",
      "faraid",
      "tirkah",
    ];

    container.innerHTML = termKeys
      .filter((key) => glossary[key])
      .map((key) => {
        const term = glossary[key];
        return `
          <dl class="glossary-item">
            <dt class="glossary-term">
              <span class="glossary-term__ar">${term.ar}</span>
              <span class="glossary-term__ru">${term.term}</span>
            </dt>
            <dd class="glossary-definition">${term.definition}</dd>
          </dl>
        `;
      })
      .join("");
  },

  /**
   * Генерирует FAQ из локализации
   */
  renderFaq() {
    const container = document.getElementById("faq-accordion");
    if (!container) return;

    const faq = this.translations[this.currentLanguage]?.faq;
    if (!faq) return;

    // Ключи вопросов (q1, q2, ...)
    const questionKeys = Object.keys(faq).filter((key) => key.startsWith("q"));
    const sortedKeys = [...questionKeys].sort(
      (a, b) => Number.parseInt(a.slice(1)) - Number.parseInt(b.slice(1))
    );

    container.innerHTML = sortedKeys
      .filter((key) => faq[key]?.question && faq[key]?.answer)
      .map((key) => {
        const item = faq[key];
        return `
          <details class="faq-item">
            <summary class="faq-question">${item.question}</summary>
            <div class="faq-answer">
              <p>${item.answer}</p>
            </div>
          </details>
        `;
      })
      .join("");
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = I18n;
}
