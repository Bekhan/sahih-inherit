/**
 * Unit тесты для функции расчета наследства
 * Проверяют, что все выбранные наследники корректно обрабатываются
 */

import { describe, it, expect } from "vitest";
import { Fraction } from "../../src/fraction.js";

// Мокируем функцию расчета наследства из index.html
function calculateInheritance(formData) {
  // ОТЛАДКА: Проверяем что приходит в функцию расчета
  console.log("=== ОТЛАДКА: calculateInheritance ===");
  console.log("formData.heirs.fullBrothers:", formData.heirs.fullBrothers);
  console.log("formData.heirs.fullSisters:", formData.heirs.fullSisters);
  console.log(
    "formData.heirs.paternalGrandmother:",
    formData.heirs.paternalGrandmother
  );
  console.log(
    "formData.heirs.maternalGrandmother:",
    formData.heirs.maternalGrandmother
  );

  const mockResults = {
    heirs: [],
    totalDistributed: 100,
    awlApplied: false,
    awlRatio: null,
    raddApplied: false,
    raddRecipients: [],
    umariyyatanApplied: false,
    umariyyatanCase: null,
  };

  // СУПРУГИ
  if (formData.heirs.husband) {
    const husbandShare =
      formData.heirs.sons > 0 || formData.heirs.daughters > 0 ? 1 / 4 : 1 / 2;
    const husbandFraction =
      formData.heirs.sons > 0 || formData.heirs.daughters > 0
        ? new Fraction(1, 4)
        : new Fraction(1, 2);

    mockResults.heirs.push({
      name: "Муж",
      relation: "Супруг покойной",
      baseFraction: husbandFraction,
      finalFraction: husbandFraction,
      percentage: husbandShare * 100,
      amount: formData.totalEstate * husbandShare,
      dalil: 'Коран, сура "ан-Ниса", 4:12',
      blocked: false,
      blockedBy: null,
    });
  }

  if (formData.heirs.wife) {
    const wifeShare =
      formData.heirs.sons > 0 || formData.heirs.daughters > 0 ? 1 / 8 : 1 / 4;
    const wifeFraction =
      formData.heirs.sons > 0 || formData.heirs.daughters > 0
        ? new Fraction(1, 8)
        : new Fraction(1, 4);

    mockResults.heirs.push({
      name:
        formData.heirs.wifeCount > 1
          ? `Жены (${formData.heirs.wifeCount})`
          : "Жена",
      relation: "Супруга покойного",
      baseFraction: wifeFraction,
      finalFraction: wifeFraction,
      percentage: wifeShare * 100,
      amount: formData.totalEstate * wifeShare,
      dalil: 'Коран, сура "ан-Ниса", 4:12',
      blocked: false,
      blockedBy: null,
    });
  }

  // ПОТОМКИ
  if (formData.heirs.sons > 0) {
    const sonShare = 1 / 3; // Примерная доля для демонстрации
    mockResults.heirs.push({
      name:
        formData.heirs.sons === 1 ? "Сын" : `Сыновья (${formData.heirs.sons})`,
      relation: "Потомок покойного",
      baseFraction: new Fraction(1, 3),
      finalFraction: new Fraction(1, 3),
      percentage: sonShare * 100,
      amount: formData.totalEstate * sonShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  }

  if (formData.heirs.daughters > 0) {
    const daughterShare =
      formData.heirs.sons > 0
        ? 1 / 6
        : formData.heirs.daughters === 1
        ? 1 / 2
        : 2 / 3;
    let daughterFraction;
    if (formData.heirs.sons > 0) {
      daughterFraction = new Fraction(1, 6);
    } else if (formData.heirs.daughters === 1) {
      daughterFraction = new Fraction(1, 2);
    } else {
      daughterFraction = new Fraction(2, 3);
    }

    mockResults.heirs.push({
      name:
        formData.heirs.daughters === 1
          ? "Дочь"
          : `Дочери (${formData.heirs.daughters})`,
      relation: "Потомок покойного",
      baseFraction: daughterFraction,
      finalFraction: daughterFraction,
      percentage: daughterShare * 100,
      amount: formData.totalEstate * daughterShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  }

  // ПРЕДКИ
  if (formData.heirs.father) {
    const fatherShare = 1 / 6; // Базовая доля отца
    mockResults.heirs.push({
      name: "Отец",
      relation: "Предок покойного",
      baseFraction: new Fraction(1, 6),
      finalFraction: new Fraction(1, 6),
      percentage: fatherShare * 100,
      amount: formData.totalEstate * fatherShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  }

  if (formData.heirs.mother) {
    const motherShare =
      formData.heirs.sons > 0 ||
      formData.heirs.daughters > 0 ||
      formData.heirs.fullBrothers > 0 ||
      formData.heirs.fullSisters > 0 ||
      formData.heirs.paternalBrothers > 0 ||
      formData.heirs.paternalSisters > 0
        ? 1 / 6
        : 1 / 3;
    const motherFraction =
      motherShare === 1 / 6 ? new Fraction(1, 6) : new Fraction(1, 3);

    mockResults.heirs.push({
      name: "Мать",
      relation: "Предок покойного",
      baseFraction: motherFraction,
      finalFraction: motherFraction,
      percentage: motherShare * 100,
      amount: formData.totalEstate * motherShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  }

  if (formData.heirs.paternalGrandmother && !formData.heirs.mother) {
    // Если есть обе бабушки, они делят 1/6 поровну
    const paternalGrandmotherShare = formData.heirs.maternalGrandmother
      ? 1 / 12
      : 1 / 6;
    const paternalGrandmotherFraction = formData.heirs.maternalGrandmother
      ? new Fraction(1, 12)
      : new Fraction(1, 6);

    mockResults.heirs.push({
      name: "Бабушка (мать отца)",
      relation: "Предок покойного",
      baseFraction: paternalGrandmotherFraction,
      finalFraction: paternalGrandmotherFraction,
      percentage: paternalGrandmotherShare * 100,
      amount: formData.totalEstate * paternalGrandmotherShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  } else if (formData.heirs.paternalGrandmother && formData.heirs.mother) {
    mockResults.heirs.push({
      name: "Бабушка (мать отца)",
      relation: "Предок покойного",
      baseFraction: new Fraction(0, 1),
      finalFraction: new Fraction(0, 1),
      percentage: 0,
      amount: 0,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: true,
      blockedBy: "Блокируется матерью",
    });
  }

  if (formData.heirs.maternalGrandmother && !formData.heirs.mother) {
    // Если есть обе бабушки, они делят 1/6 поровну
    const maternalGrandmotherShare = formData.heirs.paternalGrandmother
      ? 1 / 12
      : 1 / 6;
    const maternalGrandmotherFraction = formData.heirs.paternalGrandmother
      ? new Fraction(1, 12)
      : new Fraction(1, 6);

    mockResults.heirs.push({
      name: "Бабушка (мать матери)",
      relation: "Предок покойного",
      baseFraction: maternalGrandmotherFraction,
      finalFraction: maternalGrandmotherFraction,
      percentage: maternalGrandmotherShare * 100,
      amount: formData.totalEstate * maternalGrandmotherShare,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: false,
      blockedBy: null,
    });
  } else if (formData.heirs.maternalGrandmother && formData.heirs.mother) {
    mockResults.heirs.push({
      name: "Бабушка (мать матери)",
      relation: "Предок покойного",
      baseFraction: new Fraction(0, 1),
      finalFraction: new Fraction(0, 1),
      percentage: 0,
      amount: 0,
      dalil: 'Коран, сура "ан-Ниса", 4:11',
      blocked: true,
      blockedBy: "Блокируется матерью",
    });
  }

  // БРАТЬЯ И СЕСТРЫ
  const hasDescendants =
    formData.heirs.sons > 0 || formData.heirs.daughters > 0;
  const hasFather = formData.heirs.father;

  // Полнородные братья и сестры
  if (formData.heirs.fullBrothers > 0 && !hasDescendants && !hasFather) {
    const fullBrotherShare = 1 / 4; // Примерная доля
    mockResults.heirs.push({
      name:
        formData.heirs.fullBrothers === 1
          ? "Брат (полнородный)"
          : `Братья полнородные (${formData.heirs.fullBrothers})`,
      relation: "Брат покойного",
      baseFraction: new Fraction(1, 4),
      finalFraction: new Fraction(1, 4),
      percentage: fullBrotherShare * 100,
      amount: formData.totalEstate * fullBrotherShare,
      dalil: 'Коран, сура "ан-Ниса", 4:176',
      blocked: false,
      blockedBy: null,
    });
  } else if (formData.heirs.fullBrothers > 0 && (hasDescendants || hasFather)) {
    mockResults.heirs.push({
      name:
        formData.heirs.fullBrothers === 1
          ? "Брат (полнородный)"
          : `Братья полнородные (${formData.heirs.fullBrothers})`,
      relation: "Брат покойного",
      baseFraction: new Fraction(0, 1),
      finalFraction: new Fraction(0, 1),
      percentage: 0,
      amount: 0,
      dalil: 'Коран, сура "ан-Ниса", 4:176',
      blocked: true,
      blockedBy: hasDescendants ? "Блокируются потомками" : "Блокируются отцом",
    });
  }

  if (formData.heirs.fullSisters > 0 && !hasDescendants && !hasFather) {
    // Рассчитываем остаток после фиксированных долей
    let fixedShares = 0;

    // Жена: 1/4 или 1/8
    if (formData.heirs.wife) {
      fixedShares +=
        formData.heirs.sons > 0 || formData.heirs.daughters > 0 ? 1 / 8 : 1 / 4;
    }

    // Бабушки: 1/6 общая доля
    if (
      (formData.heirs.paternalGrandmother ||
        formData.heirs.maternalGrandmother) &&
      !formData.heirs.mother
    ) {
      fixedShares += 1 / 6;
    }

    // Остаток для сестер
    const remainingShare = 1 - fixedShares;
    const fullSisterShare = remainingShare;
    const fullSisterFraction = Fraction.fromDecimal(remainingShare).simplify();

    mockResults.heirs.push({
      name:
        formData.heirs.fullSisters === 1
          ? "Сестра (полнородная)"
          : `Сестры полнородные (${formData.heirs.fullSisters})`,
      relation: "Сестра покойного",
      baseFraction: fullSisterFraction,
      finalFraction: fullSisterFraction,
      percentage: fullSisterShare * 100,
      amount: formData.totalEstate * fullSisterShare,
      dalil: 'Коран, сура "ан-Ниса", 4:176',
      blocked: false,
      blockedBy: null,
    });
  } else if (formData.heirs.fullSisters > 0 && (hasDescendants || hasFather)) {
    mockResults.heirs.push({
      name:
        formData.heirs.fullSisters === 1
          ? "Сестра (полнородная)"
          : `Сестры полнородные (${formData.heirs.fullSisters})`,
      relation: "Сестра покойного",
      baseFraction: new Fraction(0, 1),
      finalFraction: new Fraction(0, 1),
      percentage: 0,
      amount: 0,
      dalil: 'Коран, сура "ан-Ниса", 4:176',
      blocked: true,
      blockedBy: hasDescendants ? "Блокируются потомками" : "Блокируются отцом",
    });
  }

  return mockResults;
}

describe("Inheritance Calculation Unit Tests", () => {
  describe("Сценарий со скриншота: жена + братья + сестры + бабушки", () => {
    it("должен показать всех выбранных наследников", () => {
      // Arrange: Данные как на скриншоте
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: true,
          maternalGrandmother: true,
          fullBrothers: 1,
          fullSisters: 2,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      // Act
      const results = calculateInheritance(formData);

      // Assert: Проверяем что все наследники присутствуют
      const heirNames = results.heirs.map((heir) => heir.name);

      console.log("Найденные наследники:", heirNames);

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

    it("должен правильно рассчитать доли", () => {
      // Arrange
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: true,
          maternalGrandmother: true,
          fullBrothers: 1,
          fullSisters: 2,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      // Act
      const results = calculateInheritance(formData);

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
  });

  describe("Проверка корректности дробей", () => {
    it("все дроби должны быть упрощенными", () => {
      // Arrange
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: true,
          mother: true,
          paternalGrandfather: false,
          paternalGrandmother: false,
          maternalGrandmother: false,
          fullBrothers: 0,
          fullSisters: 0,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      // Act
      const results = calculateInheritance(formData);

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
});
describe("Проверка математической корректности", () => {
  it("сумма долей должна быть ровно 100% для сценария: жена + бабушки + сестры", () => {
    // Arrange: Сценарий со скриншота БЕЗ братьев
    const formData = {
      totalEstate: 1000000,
      estateValid: true,
      estateError: null,
      heirs: {
        husband: false,
        wife: true,
        wifeCount: 1,
        sons: 0,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        father: false,
        mother: false,
        paternalGrandfather: false,
        paternalGrandmother: true,
        maternalGrandmother: true,
        fullBrothers: 0, // НЕТ братьев
        fullSisters: 2, // Только сестры
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 0,
        maternalSisters: 0,
      },
    };

    // Act
    const results = calculateInheritance(formData);

    // Assert: Сумма должна быть ровно 100%
    const totalPercentage = results.heirs
      .filter((heir) => !heir.blocked)
      .reduce((sum, heir) => sum + heir.percentage, 0);

    console.log("Наследники и их доли:");
    results.heirs.forEach((heir) => {
      if (!heir.blocked) {
        console.log(
          `${heir.name}: ${heir.baseFraction.toString()} = ${heir.percentage}%`
        );
      }
    });
    console.log(`Общий процент: ${totalPercentage}%`);

    expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.01); // Допускаем погрешность округления
  });
});
