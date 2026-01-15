/**
 * Панель настроек языка
 */

const SettingsPanel = {
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

    globalThis.addEventListener("languageChanged", () => {
      this.renderLanguageSelector();
    });
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SettingsPanel;
}
