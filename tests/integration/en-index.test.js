/**
 * Тесты для английской версии страницы (en/index.html)
 * Проверяют корректность SEO-тегов, структуры и локализации
 */

import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";

// Загружаем английский HTML файл
const htmlContent = fs.readFileSync(path.resolve("en/index.html"), "utf8");

// Загружаем английские переводы
const enTranslations = JSON.parse(
  fs.readFileSync(path.resolve("src/i18n/en.json"), "utf8")
);

describe("English Version (en/index.html)", () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM(htmlContent);
    document = dom.window.document;
  });

  describe("HTML Structure", () => {
    it("should have lang='en' attribute", () => {
      expect(document.documentElement.lang).toBe("en");
    });

    it("should have dir='ltr' attribute", () => {
      expect(document.documentElement.dir).toBe("ltr");
    });

    it("should have valid DOCTYPE", () => {
      expect(dom.window.document.doctype).not.toBeNull();
      expect(dom.window.document.doctype.name).toBe("html");
    });
  });

  describe("SEO Meta Tags", () => {
    it("should have English title", () => {
      const title = document.querySelector("title").textContent;
      expect(title).toContain("Islamic Inheritance Calculator");
      expect(title).not.toContain("Калькулятор");
    });

    it("should have English meta description", () => {
      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc).not.toBeNull();
      expect(metaDesc.content).toContain("Islamic inheritance calculator");
      expect(metaDesc.content).not.toContain("исламу");
    });

    it("should have English keywords", () => {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      expect(metaKeywords).not.toBeNull();
      expect(metaKeywords.content).toContain("islamic inheritance");
      expect(metaKeywords.content).not.toContain("наследство");
    });

    it("should have canonical URL pointing to /en/", () => {
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical).not.toBeNull();
      expect(canonical.href).toContain("/en/");
    });
  });

  describe("Hreflang Tags", () => {
    it("should have hreflang for Russian version", () => {
      const ruLink = document.querySelector('link[hreflang="ru"]');
      expect(ruLink).not.toBeNull();
      expect(ruLink.href).not.toContain("/en/");
    });

    it("should have hreflang for English version", () => {
      const enLink = document.querySelector('link[hreflang="en"]');
      expect(enLink).not.toBeNull();
      expect(enLink.href).toContain("/en/");
    });

    it("should have x-default hreflang", () => {
      const defaultLink = document.querySelector('link[hreflang="x-default"]');
      expect(defaultLink).not.toBeNull();
    });
  });

  describe("Open Graph Tags", () => {
    it("should have og:locale set to en_US", () => {
      const ogLocale = document.querySelector('meta[property="og:locale"]');
      expect(ogLocale).not.toBeNull();
      expect(ogLocale.content).toBe("en_US");
    });

    it("should have English og:title", () => {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle).not.toBeNull();
      expect(ogTitle.content).toContain("Islamic Inheritance Calculator");
    });

    it("should have og:url pointing to /en/", () => {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      expect(ogUrl).not.toBeNull();
      expect(ogUrl.content).toContain("/en/");
    });
  });

  describe("Schema.org Structured Data", () => {
    it("should have WebApplication schema in English", () => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      let webAppSchema = null;

      scripts.forEach((script) => {
        try {
          const data = JSON.parse(script.textContent);
          if (data["@type"] === "WebApplication") {
            webAppSchema = data;
          }
        } catch (e) {}
      });

      expect(webAppSchema).not.toBeNull();
      expect(webAppSchema.name).toBe("Islamic Inheritance Calculator");
      expect(webAppSchema.inLanguage).toBe("en");
    });

    it("should have FAQPage schema with English questions", () => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      let faqSchema = null;

      scripts.forEach((script) => {
        try {
          const data = JSON.parse(script.textContent);
          if (data["@type"] === "FAQPage") {
            faqSchema = data;
          }
        } catch (e) {}
      });

      expect(faqSchema).not.toBeNull();
      expect(faqSchema.mainEntity.length).toBeGreaterThan(0);
      expect(faqSchema.mainEntity[0].name).toContain("inheritance");
    });
  });

  describe("Fallback Content", () => {
    it("should have English header title", () => {
      const headerTitle = document.querySelector('[data-i18n="header.title"]');
      expect(headerTitle).not.toBeNull();
      expect(headerTitle.textContent).toBe("Islamic Inheritance Calculator");
    });

    it("should have English header subtitle", () => {
      const subtitle = document.querySelector('[data-i18n="header.subtitle"]');
      expect(subtitle).not.toBeNull();
      expect(subtitle.textContent).toContain("Quran and Sunnah");
    });

    it("should have English obligations modal title", () => {
      const modalTitle = document.querySelector(
        '[data-i18n="obligations.title"]'
      );
      expect(modalTitle).not.toBeNull();
      expect(modalTitle.textContent.trim()).toBe("Preliminary Obligations");
    });

    it("should have English calculate button", () => {
      const calcBtn = document.querySelector(
        '[data-i18n="calculator.calculate"]'
      );
      expect(calcBtn).not.toBeNull();
      expect(calcBtn.textContent).toContain("Calculate");
    });

    it("should have English footer disclaimer", () => {
      const disclaimer = document.querySelector(
        '[data-i18n="footer.disclaimer1"]'
      );
      expect(disclaimer).not.toBeNull();
      expect(disclaimer.textContent).toContain("educational purposes");
    });
  });

  describe("Resource Paths", () => {
    it("should have correct CSS path (../css/)", () => {
      const cssLink = document.querySelector('link[rel="stylesheet"]');
      expect(cssLink).not.toBeNull();
      expect(cssLink.href).toContain("../css/");
    });

    it("should have correct favicon path (../assets/)", () => {
      const favicon = document.querySelector('link[rel="icon"]');
      expect(favicon).not.toBeNull();
      expect(favicon.href).toContain("../assets/");
    });

    it("should have correct i18n.js path (../src/)", () => {
      const i18nScript = document.querySelector('script[src*="i18n.js"]');
      expect(i18nScript).not.toBeNull();
      expect(i18nScript.src).toContain("../src/");
    });
  });

  describe("Form Elements", () => {
    it("should have all required form inputs", () => {
      expect(document.getElementById("estate-amount")).not.toBeNull();
      expect(document.getElementById("sons")).not.toBeNull();
      expect(document.getElementById("daughters")).not.toBeNull();
      expect(document.getElementById("father")).not.toBeNull();
      expect(document.getElementById("mother")).not.toBeNull();
    });

    it("should have spouse radio buttons", () => {
      const spouseRadios = document.querySelectorAll('input[name="spouse"]');
      expect(spouseRadios.length).toBe(3);
    });

    it("should have calculate button", () => {
      expect(document.getElementById("calculate-btn")).not.toBeNull();
    });
  });

  describe("Consistency with Translations", () => {
    it("header.title fallback should match en.json", () => {
      const el = document.querySelector('[data-i18n="header.title"]');
      expect(el.textContent).toBe(enTranslations.header.title);
    });

    it("obligations.title fallback should match en.json", () => {
      const el = document.querySelector('[data-i18n="obligations.title"]');
      expect(el.textContent.trim()).toBe(enTranslations.obligations.title);
    });

    it("calculator.calculate fallback should match en.json", () => {
      const el = document.querySelector('[data-i18n="calculator.calculate"]');
      expect(el.textContent.trim()).toBe(enTranslations.calculator.calculate);
    });

    it("footer.copyright fallback should match en.json", () => {
      const el = document.querySelector('[data-i18n="footer.copyright"]');
      expect(el.textContent.trim()).toBe(enTranslations.footer.copyright);
    });
  });
});
