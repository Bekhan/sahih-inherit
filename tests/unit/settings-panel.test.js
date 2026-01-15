/**
 * Unit тесты для панели настроек языка (SettingsPanel)
 * Проверяют корректность работы переключателя языка
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

// Загружаем переводы
const ruTranslations = JSON.parse(
  fs.readFileSync(path.resolve("src/i18n/ru.json"), "utf8")
);
const enTranslations = JSON.parse(
  fs.readFileSync(path.resolve("src/i18n/en.json"), "utf8")
);

// Создаем мок I18n
function createI18nMock(initialLang = "ru") {
  return {
    currentLanguage: initialLang,
    translations: {
      ru: ruTranslations,
      en: enTranslations,
    },

    async init() {
      return this;
    },

    t(key, params = {}) {
      const keys = key.split(".");
      let value = this.translations[this.currentLanguage];
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
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
      if (this.translations[lang]) {
        this.currentLanguage = lang;
        return true;
      }
      return false;
    },

    applyTranslations() {},

    getAvailableLanguages() {
      return [
        { code: "ru", name: "Русский", shortName: "RU" },
        { code: "en", name: "English", shortName: "EN" },
      ];
    },
  };
}

// Создаем мок SettingsPanel
function createSettingsPanelMock(I18n, document) {
  return {
    init() {
      this.renderLanguageSelector();
      this.bindEvents();
    },

    renderLanguageSelector() {
      const container = document.getElementById("language-selector");
      if (!container) return;

      const languages = I18n.getAvailableLanguages();
      const currentLang = I18n.currentLanguage;

      container.innerHTML = languages
        .map(
          (lang, index) => `
          ${index > 0 ? '<span class="lang-divider">|</span>' : ""}
          <button 
            class="lang-btn ${
              lang.code === currentLang ? "lang-btn--active" : ""
            }"
            data-lang="${lang.code}"
            aria-pressed="${lang.code === currentLang}"
            title="${lang.name}"
          >${lang.shortName}</button>
        `
        )
        .join("");
    },

    bindEvents() {
      document.addEventListener("click", async (e) => {
        const langBtn = e.target.closest("[data-lang]");
        if (langBtn) {
          const lang = langBtn.dataset.lang;
          await I18n.setLanguage(lang);
          this.renderLanguageSelector();
        }
      });
    },
  };
}

describe("SettingsPanel Unit Tests", () => {
  let dom;
  let document;
  let I18n;
  let SettingsPanel;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="language-selector"></div>
        </body>
      </html>
    `);
    document = dom.window.document;
    I18n = createI18nMock("ru");
    SettingsPanel = createSettingsPanelMock(I18n, document);
  });

  describe("Инициализация", () => {
    it("должен отрендерить селектор языка при инициализации", () => {
      SettingsPanel.init();

      const container = document.getElementById("language-selector");
      expect(container.innerHTML).not.toBe("");
    });

    it("должен создать кнопки для всех доступных языков", () => {
      SettingsPanel.init();

      const buttons = document.querySelectorAll("[data-lang]");
      expect(buttons).toHaveLength(2);
    });

    it("должен отметить текущий язык как активный", () => {
      SettingsPanel.init();

      const activeBtn = document.querySelector(".lang-btn--active");
      expect(activeBtn).not.toBeNull();
      expect(activeBtn.dataset.lang).toBe("ru");
    });
  });

  describe("Рендеринг селектора языка", () => {
    it("должен показывать короткие названия языков", () => {
      SettingsPanel.init();

      const ruBtn = document.querySelector('[data-lang="ru"]');
      const enBtn = document.querySelector('[data-lang="en"]');

      expect(ruBtn.textContent.trim()).toBe("RU");
      expect(enBtn.textContent.trim()).toBe("EN");
    });

    it("должен устанавливать title с полным названием языка", () => {
      SettingsPanel.init();

      const ruBtn = document.querySelector('[data-lang="ru"]');
      const enBtn = document.querySelector('[data-lang="en"]');

      expect(ruBtn.title).toBe("Русский");
      expect(enBtn.title).toBe("English");
    });

    it("должен устанавливать aria-pressed для активной кнопки", () => {
      SettingsPanel.init();

      const ruBtn = document.querySelector('[data-lang="ru"]');
      const enBtn = document.querySelector('[data-lang="en"]');

      expect(ruBtn.getAttribute("aria-pressed")).toBe("true");
      expect(enBtn.getAttribute("aria-pressed")).toBe("false");
    });

    it("должен добавлять разделитель между кнопками", () => {
      SettingsPanel.init();

      const divider = document.querySelector(".lang-divider");
      expect(divider).not.toBeNull();
      expect(divider.textContent).toBe("|");
    });
  });

  describe("Переключение языка", () => {
    it("должен обновлять активную кнопку при смене языка", async () => {
      SettingsPanel.init();

      // Меняем язык
      await I18n.setLanguage("en");
      SettingsPanel.renderLanguageSelector();

      const activeBtn = document.querySelector(".lang-btn--active");
      expect(activeBtn.dataset.lang).toBe("en");
    });

    it("должен обновлять aria-pressed при смене языка", async () => {
      SettingsPanel.init();

      await I18n.setLanguage("en");
      SettingsPanel.renderLanguageSelector();

      const ruBtn = document.querySelector('[data-lang="ru"]');
      const enBtn = document.querySelector('[data-lang="en"]');

      expect(ruBtn.getAttribute("aria-pressed")).toBe("false");
      expect(enBtn.getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("Обработка кликов", () => {
    it("должен переключать язык при клике на кнопку", async () => {
      SettingsPanel.init();

      const enBtn = document.querySelector('[data-lang="en"]');
      enBtn.click();

      // Даем время на обработку async события
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(I18n.currentLanguage).toBe("en");
    });

    it("не должен реагировать на клики вне кнопок языка", async () => {
      SettingsPanel.init();

      const container = document.getElementById("language-selector");
      container.click();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(I18n.currentLanguage).toBe("ru");
    });
  });
});

describe("Интеграция I18n и SettingsPanel", () => {
  let dom;
  let document;
  let I18n;
  let SettingsPanel;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <title>Test</title>
          <meta name="description" content="Test description">
        </head>
        <body>
          <div id="language-selector"></div>
          <h1 data-i18n="header.title"></h1>
          <p data-i18n="header.subtitle"></p>
        </body>
      </html>
    `);
    document = dom.window.document;
    I18n = createI18nMock("ru");
    SettingsPanel = createSettingsPanelMock(I18n, document);
  });

  it("должен корректно работать цикл: инициализация -> смена языка -> обновление UI", async () => {
    // Инициализация
    SettingsPanel.init();

    // Проверяем начальное состояние
    expect(I18n.currentLanguage).toBe("ru");
    expect(document.querySelector(".lang-btn--active").dataset.lang).toBe("ru");

    // Меняем язык
    await I18n.setLanguage("en");
    SettingsPanel.renderLanguageSelector();

    // Проверяем обновленное состояние
    expect(I18n.currentLanguage).toBe("en");
    expect(document.querySelector(".lang-btn--active").dataset.lang).toBe("en");

    // Возвращаем обратно
    await I18n.setLanguage("ru");
    SettingsPanel.renderLanguageSelector();

    expect(I18n.currentLanguage).toBe("ru");
    expect(document.querySelector(".lang-btn--active").dataset.lang).toBe("ru");
  });

  it("переводы должны быть доступны после смены языка", async () => {
    SettingsPanel.init();

    // Русский
    expect(I18n.t("header.title")).toBe("Калькулятор наследства по исламу");

    // Английский
    await I18n.setLanguage("en");
    expect(I18n.t("header.title")).toBe("Islamic Inheritance Calculator");

    // Обратно на русский
    await I18n.setLanguage("ru");
    expect(I18n.t("header.title")).toBe("Калькулятор наследства по исламу");
  });
});
