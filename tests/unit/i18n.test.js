/**
 * Unit тесты для модуля интернационализации (i18n)
 * Проверяют корректность работы системы локализации
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// Загружаем переводы напрямую
const ruTranslations = JSON.parse(
  fs.readFileSync(path.resolve("src/i18n/ru.json"), "utf8")
);
const enTranslations = JSON.parse(
  fs.readFileSync(path.resolve("src/i18n/en.json"), "utf8")
);

// Создаем мок I18n модуля для тестирования
function createI18nMock(initialLang = "ru") {
  return {
    currentLanguage: initialLang,
    translations: {
      ru: ruTranslations,
      en: enTranslations,
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

    setLanguage(lang) {
      if (this.translations[lang]) {
        this.currentLanguage = lang;
        return true;
      }
      return false;
    },

    getAvailableLanguages() {
      return [
        { code: "ru", name: "Русский", shortName: "RU" },
        { code: "en", name: "English", shortName: "EN" },
      ];
    },
  };
}

describe("I18n Module Unit Tests", () => {
  let I18n;

  beforeEach(() => {
    I18n = createI18nMock("ru");
  });

  describe("Базовая функциональность перевода", () => {
    it("должен возвращать перевод по ключу первого уровня", () => {
      const title = I18n.t("header.title");
      expect(title).toBe("Калькулятор наследства по исламу");
    });

    it("должен возвращать перевод по вложенному ключу", () => {
      const burial = I18n.t("obligations.burial");
      expect(burial).toBe("Расходы на погребение");
    });

    it("должен возвращать ключ если перевод не найден", () => {
      const missing = I18n.t("nonexistent.key");
      expect(missing).toBe("nonexistent.key");
    });

    it("должен возвращать ключ для частично существующего пути", () => {
      const partial = I18n.t("header.nonexistent");
      expect(partial).toBe("header.nonexistent");
    });
  });

  describe("Параметризованные переводы", () => {
    it("должен подставлять параметры в перевод", () => {
      const text = I18n.t("spouse.wifeShareHint", {
        share: "1/4",
        condition: "при отсутствии детей",
      });
      expect(text).toBe("Доля жены/жен: 1/4 (при отсутствии детей)");
    });

    it("должен подставлять несколько параметров", () => {
      const text = I18n.t("spouse.husbandShareHint", {
        share: "1/2",
        condition: "при отсутствии детей",
      });
      expect(text).toBe("Доля мужа: 1/2 (при отсутствии детей)");
    });

    it("должен оставлять плейсхолдер если параметр не передан", () => {
      const text = I18n.t("spouse.wifeShareHint", { share: "1/4" });
      expect(text).toContain("{condition}");
    });
  });

  describe("Переключение языка", () => {
    it("должен переключаться на английский язык", () => {
      I18n.setLanguage("en");
      expect(I18n.currentLanguage).toBe("en");

      const title = I18n.t("header.title");
      expect(title).toBe("Islamic Inheritance Calculator");
    });

    it("должен переключаться обратно на русский", () => {
      I18n.setLanguage("en");
      I18n.setLanguage("ru");
      expect(I18n.currentLanguage).toBe("ru");

      const title = I18n.t("header.title");
      expect(title).toBe("Калькулятор наследства по исламу");
    });

    it("должен возвращать false для несуществующего языка", () => {
      const result = I18n.setLanguage("fr");
      expect(result).toBe(false);
      expect(I18n.currentLanguage).toBe("ru");
    });
  });

  describe("Список доступных языков", () => {
    it("должен возвращать список языков", () => {
      const languages = I18n.getAvailableLanguages();
      expect(languages).toHaveLength(2);
    });

    it("должен содержать русский язык", () => {
      const languages = I18n.getAvailableLanguages();
      const ru = languages.find((l) => l.code === "ru");
      expect(ru).toBeDefined();
      expect(ru.name).toBe("Русский");
      expect(ru.shortName).toBe("RU");
    });

    it("должен содержать английский язык", () => {
      const languages = I18n.getAvailableLanguages();
      const en = languages.find((l) => l.code === "en");
      expect(en).toBeDefined();
      expect(en.name).toBe("English");
      expect(en.shortName).toBe("EN");
    });
  });
});

describe("Полнота переводов", () => {
  describe("Структурная эквивалентность переводов", () => {
    function getAllKeys(obj, prefix = "") {
      let keys = [];
      for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          keys = keys.concat(getAllKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    it("русский и английский переводы должны иметь одинаковые ключи", () => {
      const ruKeys = getAllKeys(ruTranslations).sort();
      const enKeys = getAllKeys(enTranslations).sort();

      // Находим отсутствующие ключи
      const missingInEn = ruKeys.filter((k) => !enKeys.includes(k));
      const missingInRu = enKeys.filter((k) => !ruKeys.includes(k));

      if (missingInEn.length > 0) {
        console.log("Ключи отсутствующие в en.json:", missingInEn);
      }
      if (missingInRu.length > 0) {
        console.log("Ключи отсутствующие в ru.json:", missingInRu);
      }

      expect(missingInEn).toHaveLength(0);
      expect(missingInRu).toHaveLength(0);
    });

    it("все строковые значения должны быть непустыми", () => {
      function checkNonEmpty(obj, path = "") {
        const errors = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;
          if (typeof value === "string") {
            if (value.trim() === "") {
              errors.push(fullPath);
            }
          } else if (typeof value === "object" && value !== null) {
            errors.push(...checkNonEmpty(value, fullPath));
          }
        }
        return errors;
      }

      const emptyInRu = checkNonEmpty(ruTranslations);
      const emptyInEn = checkNonEmpty(enTranslations);

      if (emptyInRu.length > 0) {
        console.log("Пустые значения в ru.json:", emptyInRu);
      }
      if (emptyInEn.length > 0) {
        console.log("Пустые значения в en.json:", emptyInEn);
      }

      expect(emptyInRu).toHaveLength(0);
      expect(emptyInEn).toHaveLength(0);
    });
  });

  describe("Обязательные секции переводов", () => {
    const requiredSections = [
      "meta",
      "header",
      "obligations",
      "calculator",
      "spouse",
      "descendants",
      "ancestors",
      "siblings",
      "results",
      "blocking",
      "conditions",
      "glossary",
      "faq",
      "footer",
      "heirs",
      "relations",
      "dalil",
      "messages",
    ];

    it.each(requiredSections)(
      "секция '%s' должна присутствовать в ru.json",
      (section) => {
        expect(ruTranslations[section]).toBeDefined();
      }
    );

    it.each(requiredSections)(
      "секция '%s' должна присутствовать в en.json",
      (section) => {
        expect(enTranslations[section]).toBeDefined();
      }
    );
  });

  describe("Переводы наследников (heirs)", () => {
    const requiredHeirs = [
      "husband",
      "wife",
      "wives",
      "son",
      "sons",
      "daughter",
      "daughters",
      "father",
      "mother",
      "grandfather",
      "grandmother",
      "grandmothers",
      "fullBrother",
      "fullBrothers",
      "fullSister",
      "fullSisters",
      "paternalBrother",
      "paternalBrothers",
      "paternalSister",
      "paternalSisters",
      "maternalBrother",
      "maternalBrothers",
      "maternalSister",
      "maternalSisters",
      "grandsonFromSon",
      "grandsonsFromSon",
      "granddaughterFromSon",
      "granddaughtersFromSon",
    ];

    it.each(requiredHeirs)(
      "наследник '%s' должен быть переведен на русский",
      (heir) => {
        expect(ruTranslations.heirs[heir]).toBeDefined();
        expect(typeof ruTranslations.heirs[heir]).toBe("string");
        expect(ruTranslations.heirs[heir].length).toBeGreaterThan(0);
      }
    );

    it.each(requiredHeirs)(
      "наследник '%s' должен быть переведен на английский",
      (heir) => {
        expect(enTranslations.heirs[heir]).toBeDefined();
        expect(typeof enTranslations.heirs[heir]).toBe("string");
        expect(enTranslations.heirs[heir].length).toBeGreaterThan(0);
      }
    );
  });

  describe("Переводы блокировок (blocking)", () => {
    const requiredBlockings = [
      "byFather",
      "byMother",
      "bySon",
      "byGrandson",
      "byGrandfather",
      "byFullBrother",
      "byDescendants",
      "byCloserAsaba",
    ];

    it.each(requiredBlockings)(
      "блокировка '%s' должна быть переведена на русский",
      (blocking) => {
        expect(ruTranslations.blocking[blocking]).toBeDefined();
      }
    );

    it.each(requiredBlockings)(
      "блокировка '%s' должна быть переведена на английский",
      (blocking) => {
        expect(enTranslations.blocking[blocking]).toBeDefined();
      }
    );
  });

  describe("Переводы далилей (dalil)", () => {
    const requiredDalils = [
      "quran411",
      "quran412",
      "quran4176",
      "sunnah",
      "ijma",
      "hadithGrandmother",
      "hadithGranddaughter",
    ];

    it.each(requiredDalils)(
      "далиль '%s' должен быть переведен на русский",
      (dalil) => {
        expect(ruTranslations.dalil[dalil]).toBeDefined();
      }
    );

    it.each(requiredDalils)(
      "далиль '%s' должен быть переведен на английский",
      (dalil) => {
        expect(enTranslations.dalil[dalil]).toBeDefined();
      }
    );
  });
});

describe("Глоссарий и FAQ", () => {
  describe("Глоссарий", () => {
    const glossaryTerms = [
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

    it.each(glossaryTerms)(
      "термин '%s' должен иметь арабское написание, термин и определение (ru)",
      (term) => {
        const glossaryItem = ruTranslations.glossary[term];
        expect(glossaryItem).toBeDefined();
        expect(glossaryItem.ar).toBeDefined();
        expect(glossaryItem.term).toBeDefined();
        expect(glossaryItem.definition).toBeDefined();
      }
    );

    it.each(glossaryTerms)(
      "термин '%s' должен иметь арабское написание, термин и определение (en)",
      (term) => {
        const glossaryItem = enTranslations.glossary[term];
        expect(glossaryItem).toBeDefined();
        expect(glossaryItem.ar).toBeDefined();
        expect(glossaryItem.term).toBeDefined();
        expect(glossaryItem.definition).toBeDefined();
      }
    );

    it("арабские термины должны совпадать в обоих языках", () => {
      for (const term of glossaryTerms) {
        expect(ruTranslations.glossary[term].ar).toBe(
          enTranslations.glossary[term].ar
        );
      }
    });
  });

  describe("FAQ", () => {
    it("FAQ должен содержать минимум 10 вопросов (ru)", () => {
      const questionKeys = Object.keys(ruTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      expect(questionKeys.length).toBeGreaterThanOrEqual(10);
    });

    it("FAQ должен содержать минимум 10 вопросов (en)", () => {
      const questionKeys = Object.keys(enTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      expect(questionKeys.length).toBeGreaterThanOrEqual(10);
    });

    it("каждый вопрос FAQ должен иметь question и answer (ru)", () => {
      const questionKeys = Object.keys(ruTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      for (const key of questionKeys) {
        expect(ruTranslations.faq[key].question).toBeDefined();
        expect(ruTranslations.faq[key].answer).toBeDefined();
        expect(ruTranslations.faq[key].question.length).toBeGreaterThan(0);
        expect(ruTranslations.faq[key].answer.length).toBeGreaterThan(0);
      }
    });

    it("каждый вопрос FAQ должен иметь question и answer (en)", () => {
      const questionKeys = Object.keys(enTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      for (const key of questionKeys) {
        expect(enTranslations.faq[key].question).toBeDefined();
        expect(enTranslations.faq[key].answer).toBeDefined();
        expect(enTranslations.faq[key].question.length).toBeGreaterThan(0);
        expect(enTranslations.faq[key].answer.length).toBeGreaterThan(0);
      }
    });

    it("количество вопросов FAQ должно совпадать в обоих языках", () => {
      const ruQuestions = Object.keys(ruTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      const enQuestions = Object.keys(enTranslations.faq).filter((k) =>
        k.startsWith("q")
      );
      expect(ruQuestions.length).toBe(enQuestions.length);
    });
  });
});

describe("Консистентность переводов", () => {
  it("переводы наследников должны использовать правильный род", () => {
    // Проверяем что мужские наследники имеют мужской род
    expect(ruTranslations.heirs.husband).toMatch(/муж/i);
    expect(ruTranslations.heirs.son).toMatch(/сын/i);
    expect(ruTranslations.heirs.father).toMatch(/отец/i);

    // Проверяем что женские наследники имеют женский род
    expect(ruTranslations.heirs.wife).toMatch(/жена/i);
    expect(ruTranslations.heirs.daughter).toMatch(/дочь/i);
    expect(ruTranslations.heirs.mother).toMatch(/мать/i);
  });

  it("множественные формы должны отличаться от единственных", () => {
    expect(ruTranslations.heirs.son).not.toBe(ruTranslations.heirs.sons);
    expect(ruTranslations.heirs.daughter).not.toBe(
      ruTranslations.heirs.daughters
    );
    expect(ruTranslations.heirs.wife).not.toBe(ruTranslations.heirs.wives);
    expect(ruTranslations.heirs.fullBrother).not.toBe(
      ruTranslations.heirs.fullBrothers
    );
    expect(ruTranslations.heirs.fullSister).not.toBe(
      ruTranslations.heirs.fullSisters
    );
  });

  it("английские переводы должны быть на английском языке", () => {
    // Проверяем что английские переводы не содержат кириллицу
    const cyrillicRegex = /[а-яА-ЯёЁ]/;

    expect(enTranslations.header.title).not.toMatch(cyrillicRegex);
    expect(enTranslations.heirs.husband).not.toMatch(cyrillicRegex);
    expect(enTranslations.heirs.wife).not.toMatch(cyrillicRegex);
    expect(enTranslations.footer.disclaimer1).not.toMatch(cyrillicRegex);
  });

  it("русские переводы должны быть на русском языке", () => {
    // Проверяем что русские переводы содержат кириллицу
    const cyrillicRegex = /[а-яА-ЯёЁ]/;

    expect(ruTranslations.header.title).toMatch(cyrillicRegex);
    expect(ruTranslations.heirs.husband).toMatch(cyrillicRegex);
    expect(ruTranslations.heirs.wife).toMatch(cyrillicRegex);
    expect(ruTranslations.footer.disclaimer1).toMatch(cyrillicRegex);
  });
});
