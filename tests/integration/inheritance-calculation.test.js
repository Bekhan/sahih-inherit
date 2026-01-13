/**
 * Интеграционные тесты для расчета наследства
 * Проверяют, что все выбранные наследники корректно отображаются в результатах
 */

import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

// Загружаем HTML файл
const htmlContent = fs.readFileSync(path.resolve("index.html"), "utf8");

describe("Inheritance Calculation Integration Tests", () => {
  let dom;
  let window;
  let document;
  let AppState;
  let FormController;
  let CalculationController;

  beforeEach(() => {
    // Создаем новый DOM для каждого теста
    dom = new JSDOM(htmlContent, {
      runScripts: "dangerously",
      resources: "usable",
    });
    window = dom.window;
    document = window.document;

    // Ждем загрузки скриптов
    return new Promise((resolve) => {
      window.addEventListener("load", () => {
        AppState = window.AppState;
        FormController = window.FormController;
        CalculationController = window.CalculationController;
        resolve();
      });
    });
  });

  describe("Все выбранные наследники должны отображаться в результатах", () => {
    it("должен показать всех выбранных наследников: жена, братья, сестры, бабушки", () => {
      // Arrange: Настраиваем состояние как на скриншоте
      AppState.heirs.wife = true;
      AppState.heirs.wifeCount = 1;
      AppState.heirs.fullBrothers = 1;
      AppState.heirs.fullSisters = 2;
      AppState.heirs.paternalGrandmother = true;
      AppState.heirs.maternalGrandmother = true;

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act: Выполняем расчет
      const results = CalculationController.calculateInheritance(formData);

      // Assert: Проверяем что все наследники присутствуют
      const heirNames = results.heirs.map((heir) => heir.name);

      expect(heirNames).toContain("Жена");
      expect(heirNames).toContain("Брат (полнородный)");
      expect(heirNames).toContain("Сестры полнородные (2)");
      expect(heirNames).toContain("Бабушка (мать отца)");
      expect(heirNames).toContain("Бабушка (мать матери)");

      // Проверяем что нет дублирующихся или неожиданных наследников
      expect(results.heirs).toHaveLength(5);

      // Проверяем что нет "Два отца" или других странных записей
      expect(heirNames).not.toContain("Два отца");
      expect(heirNames).not.toContain("Отец");
    });

    it("должен правильно рассчитать доли для сценария со скриншота", () => {
      // Arrange
      AppState.heirs.wife = true;
      AppState.heirs.wifeCount = 1;
      AppState.heirs.fullBrothers = 1;
      AppState.heirs.fullSisters = 2;
      AppState.heirs.paternalGrandmother = true;
      AppState.heirs.maternalGrandmother = true;

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert: Проверяем доли
      const wifeHeir = results.heirs.find((h) => h.name === "Жена");
      const brotherHeir = results.heirs.find(
        (h) => h.name === "Брат (полнородный)"
      );
      const sistersHeir = results.heirs.find(
        (h) => h.name === "Сестры полнородные (2)"
      );
      const paternalGrandmotherHeir = results.heirs.find(
        (h) => h.name === "Бабушка (мать отца)"
      );
      const maternalGrandmotherHeir = results.heirs.find(
        (h) => h.name === "Бабушка (мать матери)"
      );

      // Жена должна получить 1/4 (нет детей)
      expect(wifeHeir.baseFraction.toString()).toBe("1/4");
      expect(wifeHeir.percentage).toBe(25);

      // Бабушки должны делить 1/6 поровну (по 1/12 каждая)
      expect(paternalGrandmotherHeir.baseFraction.toString()).toBe("1/12");
      expect(maternalGrandmotherHeir.baseFraction.toString()).toBe("1/12");

      // Братья и сестры должны наследовать остаток
      expect(brotherHeir.blocked).toBe(false);
      expect(sistersHeir.blocked).toBe(false);
    });

    it("должен корректно обрабатывать блокировку братьев и сестер при наличии потомков", () => {
      // Arrange: Добавляем сына - должен заблокировать братьев и сестер
      AppState.heirs.wife = true;
      AppState.heirs.sons = 1;
      AppState.heirs.fullBrothers = 1;
      AppState.heirs.fullSisters = 2;

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert
      const brotherHeir = results.heirs.find(
        (h) => h.name === "Брат (полнородный)"
      );
      const sistersHeir = results.heirs.find(
        (h) => h.name === "Сестры полнородные (2)"
      );

      expect(brotherHeir.blocked).toBe(true);
      expect(brotherHeir.blockedBy).toContain("сыновьями");
      expect(sistersHeir.blocked).toBe(true);
      expect(sistersHeir.blockedBy).toContain("сыновьями");
    });

    it("должен показывать заблокированных наследников в результатах", () => {
      // Arrange: Отец блокирует деда
      AppState.heirs.father = true;
      AppState.heirs.paternalGrandfather = true;

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert
      const grandfatherHeir = results.heirs.find(
        (h) => h.name === "Дед (отец отца)"
      );

      expect(grandfatherHeir).toBeDefined();
      expect(grandfatherHeir.blocked).toBe(true);
      expect(grandfatherHeir.blockedBy).toBe("Блокируется отцом");
      expect(grandfatherHeir.percentage).toBe(0);
      expect(grandfatherHeir.amount).toBe(0);
    });

    it("должен включать всех выбранных наследников (сын, дочь и прочие) без дублей", () => {
      // Arrange: Заполняем разные категории наследников
      AppState.heirs = {
        husband: false,
        wife: true,
        wifeCount: 1,
        sons: 1,
        daughters: 1,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        father: true,
        mother: true,
        paternalGrandfather: false,
        paternalGrandmother: true,
        maternalGrandmother: true,
        fullBrothers: 1,
        fullSisters: 1,
        paternalBrothers: 1,
        paternalSisters: 1,
        maternalBrothers: 1,
        maternalSisters: 1,
      };

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert: все выбранные наследники присутствуют один раз
      const heirNames = results.heirs.map((h) => h.name);
      const uniqueNames = new Set(heirNames);

      const expectedHeirs = [
        "Жена",
        "Сын",
        "Дочь",
        "Отец",
        "Мать",
        "Бабушка (мать отца)",
        "Бабушка (мать матери)",
        "Брат (полнородный)",
        "Сестра (полнородная)",
        "Брат (единокровный)",
        "Сестра (единокровная)",
        "Брат (единоутробный)",
        "Сестра (единоутробная)",
      ];

      expectedHeirs.forEach((expectedName) => {
        expect(heirNames).toContain(expectedName);
      });

      expect(uniqueNames.size).toBe(heirNames.length);
    });
  });

  describe("Проверка корректности дробей", () => {
    it("все дроби должны быть упрощенными и корректными", () => {
      // Arrange
      AppState.heirs.wife = true;
      AppState.heirs.mother = true;
      AppState.heirs.father = true;

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert: Проверяем что все дроби корректные
      results.heirs.forEach((heir) => {
        if (!heir.blocked) {
          // Дробь должна быть упрощенной
          const simplified = heir.baseFraction.simplify();
          expect(heir.baseFraction.equals(simplified)).toBe(true);

          // Дробь не должна быть огромной несокращенной
          expect(heir.baseFraction.den).toBeLessThan(100);

          // Процент должен соответствовать дроби
          const expectedPercentage = heir.baseFraction.toDecimal() * 100;
          expect(Math.abs(heir.percentage - expectedPercentage)).toBeLessThan(
            0.01
          );
        }
      });
    });
  });

  describe("Проверка полноты данных", () => {
    it("должен включать всех наследников из AppState в расчет", () => {
      // Arrange: Заполняем все возможные поля
      AppState.heirs = {
        husband: false,
        wife: true,
        wifeCount: 1,
        sons: 0,
        daughters: 1,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        father: true,
        mother: true,
        paternalGrandfather: false,
        paternalGrandmother: true,
        maternalGrandmother: true,
        fullBrothers: 1,
        fullSisters: 1,
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 1,
        maternalSisters: 1,
      };

      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: { ...AppState.heirs },
      };

      // Act
      const results = CalculationController.calculateInheritance(formData);

      // Assert: Проверяем что все выбранные наследники учтены
      const expectedHeirs = [
        "Жена",
        "Дочь",
        "Отец",
        "Мать",
        "Бабушка (мать отца)",
        "Бабушка (мать матери)",
        "Брат (полнородный)",
        "Сестра (полнородная)",
        "Брат (единоутробный)",
        "Сестра (единоутробная)",
      ];

      const actualHeirNames = results.heirs.map((h) => h.name);

      expectedHeirs.forEach((expectedName) => {
        expect(actualHeirNames).toContain(expectedName);
      });
    });
  });
});
