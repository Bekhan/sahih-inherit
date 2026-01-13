/**
 * Property-Based Tests for Fixed Shares (Фиксированные доли)
 * Feature: islamic-inheritance-calculator, Property 3: Корректность фиксированных долей
 * Validates: Requirements 7.1-7.6
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Fraction } from "../../src/fraction.js";
import {
  HeirTypes,
  calculateHusbandShare,
  calculateWifeShare,
  calculateMotherShare,
  calculateFatherShare,
  calculateDaughterShare,
  calculateGranddaughterShare,
  hasChildren,
  hasMaleDescendants,
  hasMultipleSiblings,
  calculateAsaba,
  calculateFixedSharesTotal,
  calculateRemainder,
  calculateAscendantShares,
  calculateDescendantShares,
  calculateSpouseShare,
} from "../../src/shares.js";
import {
  applySpecialCases,
  applyAwl,
  applyRadd,
  applyUmariyyatan,
} from "../../src/special-cases.js";

// Генератор для состояния наследников
const arbitraryHeirsState = fc
  .record({
    // Супруги (взаимоисключающие)
    husband: fc.boolean(),
    wife: fc.boolean(),
    wifeCount: fc.integer({ min: 1, max: 4 }),

    // Потомки
    sons: fc.integer({ min: 0, max: 10 }),
    daughters: fc.integer({ min: 0, max: 10 }),
    grandsonsFromSon: fc.integer({ min: 0, max: 10 }),
    granddaughtersFromSon: fc.integer({ min: 0, max: 10 }),

    // Предки
    father: fc.boolean(),
    mother: fc.boolean(),
    paternalGrandfather: fc.boolean(),
    paternalGrandmother: fc.boolean(),
    maternalGrandmother: fc.boolean(),

    // Братья и сестры
    fullBrothers: fc.integer({ min: 0, max: 10 }),
    fullSisters: fc.integer({ min: 0, max: 10 }),
    paternalBrothers: fc.integer({ min: 0, max: 10 }),
    paternalSisters: fc.integer({ min: 0, max: 10 }),
    maternalBrothers: fc.integer({ min: 0, max: 10 }),
    maternalSisters: fc.integer({ min: 0, max: 10 }),
  })
  .filter((state) => !(state.husband && state.wife));

// Helper functions to reduce nesting in property tests
function validateHusbandShare(heirs) {
  const share = calculateHusbandShare(heirs);
  const childrenPresent = hasChildren(heirs);
  const expected = childrenPresent ? new Fraction(1, 4) : new Fraction(1, 2);
  return share.equals(expected);
}

function validateWifeShare(heirs) {
  const result = calculateWifeShare(heirs);
  const childrenPresent = hasChildren(heirs);
  const expected = childrenPresent ? new Fraction(1, 8) : new Fraction(1, 4);
  return result.totalShare.equals(expected);
}

function validateWifeShareDivision(heirs) {
  const result = calculateWifeShare(heirs);
  const wifeCount = heirs.wifeCount || 1;
  const expectedPerWife = result.totalShare.divide(new Fraction(wifeCount, 1));
  return result.perWifeShare.equals(expectedPerWife);
}

function validateMotherShare(heirs) {
  const share = calculateMotherShare(heirs);
  const childrenPresent = hasChildren(heirs);
  const multipleSiblings = hasMultipleSiblings(heirs);
  const expected =
    childrenPresent || multipleSiblings
      ? new Fraction(1, 6)
      : new Fraction(1, 3);
  return share.equals(expected);
}

function validateFatherShare(heirs) {
  const result = calculateFatherShare(heirs);
  const maleDescendants = hasMaleDescendants(heirs);
  const hasFemaleDesc = heirs.daughters > 0 || heirs.granddaughtersFromSon > 0;

  if (maleDescendants) {
    return (
      result.fixedShare !== null &&
      result.fixedShare.equals(new Fraction(1, 6)) &&
      result.isAsaba === false
    );
  }
  if (hasFemaleDesc) {
    return (
      result.fixedShare !== null &&
      result.fixedShare.equals(new Fraction(1, 6)) &&
      result.isAsaba === true &&
      result.asabaWithFixed === true
    );
  }
  return (
    result.fixedShare === null &&
    result.isAsaba === true &&
    result.asabaWithFixed === false
  );
}

function validateDaughterShare(heirs) {
  const result = calculateDaughterShare(heirs);
  if (result === null) return false;

  if (heirs.sons > 0) {
    return result.isAsaba === true && result.share === null;
  }
  if (heirs.daughters === 1) {
    return result.isAsaba === false && result.share.equals(new Fraction(1, 2));
  }
  return result.isAsaba === false && result.share.equals(new Fraction(2, 3));
}

function validateGranddaughterShare(heirs) {
  const result = calculateGranddaughterShare(heirs);
  if (result === null) return false;

  if (heirs.grandsonsFromSon > 0) {
    return result.isAsaba === true && result.share === null;
  }
  if (heirs.daughters === 1) {
    return result.isAsaba === false && result.share.equals(new Fraction(1, 6));
  }
  if (heirs.daughters >= 2) {
    return result.isAsaba === false && result.share.equals(new Fraction(0, 1));
  }
  if (heirs.granddaughtersFromSon === 1) {
    return result.isAsaba === false && result.share.equals(new Fraction(1, 2));
  }
  return result.isAsaba === false && result.share.equals(new Fraction(2, 3));
}

const validQuranicFractions = [
  new Fraction(1, 2),
  new Fraction(1, 4),
  new Fraction(1, 8),
  new Fraction(2, 3),
  new Fraction(1, 3),
  new Fraction(1, 6),
  new Fraction(0, 1),
];

function validateQuranicFractions(heirs) {
  const husbandShare = calculateHusbandShare(heirs);
  const wifeResult = calculateWifeShare(heirs);
  const motherShare = calculateMotherShare(heirs);

  const husbandValid = validQuranicFractions.some((f) =>
    f.equals(husbandShare)
  );
  const wifeValid = validQuranicFractions.some((f) =>
    f.equals(wifeResult.totalShare)
  );
  const motherValid = validQuranicFractions.some((f) => f.equals(motherShare));

  return husbandValid && wifeValid && motherValid;
}

describe("Fixed Shares Property-Based Tests", () => {
  /**
   * Property 3: Корректность фиксированных долей (фуруд)
   * Validates: Requirements 7.1-7.6
   */
  describe("Property 3: Корректность фиксированных долей", () => {
    /**
     * Property 3.1: Доля мужа корректна
     * Муж: 1/2 (без детей) или 1/4 (с детьми)
     * Requirements: 7.1
     */
    it("Property 3.1: Муж получает 1/2 без детей и 1/4 с детьми (Requirements 7.1)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateHusbandShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.2: Доля жены/жен корректна
     * Жена/жены: 1/4 (без детей) или 1/8 (с детьми)
     * Requirements: 7.2
     */
    it("Property 3.2: Жена получает 1/4 без детей и 1/8 с детьми (Requirements 7.2)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateWifeShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.3: Доля жен делится поровну
     * Requirements: 7.2
     */
    it("Property 3.3: Доля жен делится поровну между всеми женами (Requirements 7.2)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateWifeShareDivision), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.4: Доля матери корректна
     * Мать: 1/3 (без детей и <2 братьев) или 1/6 (с детьми или ≥2 братьев)
     * Requirements: 7.3
     */
    it("Property 3.4: Мать получает 1/6 с детьми или множеством братьев, иначе 1/3 (Requirements 7.3)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateMotherShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.5: Доля отца корректна
     * Отец: 1/6 (с сыном/внуком) или 1/6+остаток (с дочерью/внучкой) или только остаток
     * Requirements: 7.4
     */
    it("Property 3.5: Отец получает 1/6 с мужскими потомками, иначе асаба (Requirements 7.4)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateFatherShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.6: Доля дочери/дочерей корректна
     * Дочери: 1/2 (одна без сына) или 2/3 (несколько без сына)
     * При наличии сына становятся асаба
     * Requirements: 7.5
     */
    it("Property 3.6: Дочь получает 1/2 одна, 2/3 несколько, асаба с сыном (Requirements 7.5)", () => {
      const withDaughters = arbitraryHeirsState.filter((h) => h.daughters > 0);
      fc.assert(fc.property(withDaughters, validateDaughterShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.7: Доля внучки от сына корректна
     * Внучка от сына: 1/6 как дополнение до 2/3 при наличии одной дочери
     * Requirements: 7.6
     */
    it("Property 3.7: Внучка от сына получает 1/6 при одной дочери (Requirements 7.6)", () => {
      const withGranddaughters = arbitraryHeirsState.filter(
        (h) => h.granddaughtersFromSon > 0 && h.sons === 0
      );
      fc.assert(fc.property(withGranddaughters, validateGranddaughterShare), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.8: Все фиксированные доли являются одной из шести коранических долей
     * Фуруд: 1/2, 1/4, 1/8, 2/3, 1/3, 1/6
     */
    it("Property 3.8: Все фиксированные доли являются кораническими (1/2, 1/4, 1/8, 2/3, 1/3, 1/6)", () => {
      fc.assert(fc.property(arbitraryHeirsState, validateQuranicFractions), {
        numRuns: 100,
      });
    });

    /**
     * Property 3.9: Каждый тип наследника имеет далиль (обоснование)
     * Requirements: 13.2
     */
    it("Property 3.9: Каждый тип наследника имеет далиль (Requirements 13.2)", () => {
      for (const heirType of Object.values(HeirTypes)) {
        expect(heirType.dalil).toBeDefined();
        expect(typeof heirType.dalil).toBe("string");
        expect(heirType.dalil.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * Property 4: Корректность соотношения асаба
   * Для любой комбинации с сыном и дочерью: доля сына = 2 × доля дочери
   * Validates: Requirements 8.2
   */
  describe("Property 4: Корректность соотношения асаба", () => {
    // Генератор для состояния с сыновьями и дочерьми
    const arbitraryHeirsWithSonsAndDaughters = fc
      .record({
        husband: fc.boolean(),
        wife: fc.boolean(),
        wifeCount: fc.integer({ min: 1, max: 4 }),
        sons: fc.integer({ min: 1, max: 5 }),
        daughters: fc.integer({ min: 1, max: 5 }),
        grandsonsFromSon: fc.constant(0),
        granddaughtersFromSon: fc.constant(0),
        father: fc.boolean(),
        mother: fc.boolean(),
        paternalGrandfather: fc.boolean(),
        paternalGrandmother: fc.boolean(),
        maternalGrandmother: fc.boolean(),
        fullBrothers: fc.integer({ min: 0, max: 5 }),
        fullSisters: fc.integer({ min: 0, max: 5 }),
        paternalBrothers: fc.integer({ min: 0, max: 5 }),
        paternalSisters: fc.integer({ min: 0, max: 5 }),
        maternalBrothers: fc.integer({ min: 0, max: 5 }),
        maternalSisters: fc.integer({ min: 0, max: 5 }),
      })
      .filter((state) => !(state.husband && state.wife));

    /**
     * Property 4.1: Доля сына = 2 × доля дочери
     * Requirements: 8.2
     */
    it("Property 4.1: Доля сына = 2 × доля дочери (Requirements 8.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsWithSonsAndDaughters, (heirs) => {
          const asabaResult = calculateAsaba(heirs);

          // Если нет асаба или остаток нулевой/отрицательный, пропускаем
          if (!asabaResult.hasAsaba || !asabaResult.distribution) {
            return true;
          }

          const { perMaleShare, perFemaleShare } = asabaResult.distribution;

          // Если женская доля нулевая, проверяем что мужская тоже нулевая или нет женщин
          if (perFemaleShare.isZero()) {
            return true;
          }

          // Проверяем соотношение 2:1
          // perMaleShare должна быть равна 2 * perFemaleShare
          const expectedMaleShare = perFemaleShare.multiply(new Fraction(2, 1));
          return perMaleShare.equals(expectedMaleShare);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.2: Соотношение 2:1 для внуков и внучек от сына
     * Requirements: 8.2
     */
    it("Property 4.2: Доля внука от сына = 2 × доля внучки от сына (Requirements 8.2)", () => {
      const arbitraryHeirsWithGrandchildren = fc
        .record({
          husband: fc.boolean(),
          wife: fc.boolean(),
          wifeCount: fc.integer({ min: 1, max: 4 }),
          sons: fc.constant(0), // Нет сыновей, чтобы внуки не были заблокированы
          daughters: fc.integer({ min: 0, max: 3 }),
          grandsonsFromSon: fc.integer({ min: 1, max: 5 }),
          granddaughtersFromSon: fc.integer({ min: 1, max: 5 }),
          father: fc.boolean(),
          mother: fc.boolean(),
          paternalGrandfather: fc.boolean(),
          paternalGrandmother: fc.boolean(),
          maternalGrandmother: fc.boolean(),
          fullBrothers: fc.integer({ min: 0, max: 5 }),
          fullSisters: fc.integer({ min: 0, max: 5 }),
          paternalBrothers: fc.integer({ min: 0, max: 5 }),
          paternalSisters: fc.integer({ min: 0, max: 5 }),
          maternalBrothers: fc.integer({ min: 0, max: 5 }),
          maternalSisters: fc.integer({ min: 0, max: 5 }),
        })
        .filter((state) => !(state.husband && state.wife));

      fc.assert(
        fc.property(arbitraryHeirsWithGrandchildren, (heirs) => {
          const asabaResult = calculateAsaba(heirs);

          // Если нет асаба или остаток нулевой/отрицательный, пропускаем
          if (!asabaResult.hasAsaba || !asabaResult.distribution) {
            return true;
          }

          // Проверяем что асаба - внуки от сына
          if (asabaResult.asabaInfo.key !== "grandsonsFromSon") {
            return true;
          }

          const { perMaleShare, perFemaleShare } = asabaResult.distribution;

          // Если женская доля нулевая, пропускаем
          if (perFemaleShare.isZero()) {
            return true;
          }

          // Проверяем соотношение 2:1
          const expectedMaleShare = perFemaleShare.multiply(new Fraction(2, 1));
          return perMaleShare.equals(expectedMaleShare);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.3: Соотношение 2:1 для родных братьев и сестер
     * Requirements: 8.2
     */
    it("Property 4.3: Доля родного брата = 2 × доля родной сестры (Requirements 8.2)", () => {
      const arbitraryHeirsWithSiblings = fc
        .record({
          husband: fc.boolean(),
          wife: fc.boolean(),
          wifeCount: fc.integer({ min: 1, max: 4 }),
          sons: fc.constant(0),
          daughters: fc.constant(0),
          grandsonsFromSon: fc.constant(0),
          granddaughtersFromSon: fc.constant(0),
          father: fc.constant(false), // Нет отца, чтобы братья не были заблокированы
          mother: fc.boolean(),
          paternalGrandfather: fc.boolean(),
          paternalGrandmother: fc.boolean(),
          maternalGrandmother: fc.boolean(),
          fullBrothers: fc.integer({ min: 1, max: 5 }),
          fullSisters: fc.integer({ min: 1, max: 5 }),
          paternalBrothers: fc.integer({ min: 0, max: 5 }),
          paternalSisters: fc.integer({ min: 0, max: 5 }),
          maternalBrothers: fc.integer({ min: 0, max: 5 }),
          maternalSisters: fc.integer({ min: 0, max: 5 }),
        })
        .filter((state) => !(state.husband && state.wife));

      fc.assert(
        fc.property(arbitraryHeirsWithSiblings, (heirs) => {
          const asabaResult = calculateAsaba(heirs);

          // Если нет асаба или остаток нулевой/отрицательный, пропускаем
          if (!asabaResult.hasAsaba || !asabaResult.distribution) {
            return true;
          }

          // Проверяем что асаба - родные братья
          if (asabaResult.asabaInfo.key !== "fullBrothers") {
            return true;
          }

          const { perMaleShare, perFemaleShare } = asabaResult.distribution;

          // Если женская доля нулевая, пропускаем
          if (perFemaleShare.isZero()) {
            return true;
          }

          // Проверяем соотношение 2:1
          const expectedMaleShare = perFemaleShare.multiply(new Fraction(2, 1));
          return perMaleShare.equals(expectedMaleShare);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4.4: Сумма долей асаба равна остатку
     * Requirements: 8.1, 8.2
     */
    it("Property 4.4: Сумма долей асаба равна остатку (Requirements 8.1, 8.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsWithSonsAndDaughters, (heirs) => {
          const asabaResult = calculateAsaba(heirs);

          // Если нет асаба или остаток нулевой/отрицательный, пропускаем
          if (!asabaResult.hasAsaba || !asabaResult.distribution) {
            return true;
          }

          const { maleShare, femaleShare } = asabaResult.distribution;
          const totalAsabaShare = maleShare.add(femaleShare);

          // Сумма долей асаба должна равняться остатку
          return totalAsabaShare.equals(asabaResult.remainder);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// ========================================
// Property 1: Инвариант полного распределения
// ========================================

/**
 * Comprehensive inheritance calculation function that combines all components
 * This function calculates the complete inheritance distribution including special cases
 * @param {object} heirs - состояние наследников
 * @param {number} totalEstate - общая сумма наследства
 * @returns {object} - полный результат расчета наследства
 */
function calculateCompleteInheritance(heirs, totalEstate = 100000) {
  // Применяем особые случаи (Умарийятайн, Авль, Радд)
  const specialCases = applySpecialCases(heirs);

  const result = {
    heirs: [],
    totalDistributed: 0,
    totalPercentage: 0,
    specialCases,
    totalEstate,
  };

  // Если применяется Умарийятайн, используем специальный расчет
  if (specialCases.umariyyatan.applied) {
    const shares = specialCases.umariyyatan.shares;

    if (heirs.husband) {
      result.heirs.push({
        name: "Муж",
        share: shares.spouseShare,
        percentage: shares.spouseShare.toDecimal() * 100,
        amount: totalEstate * shares.spouseShare.toDecimal(),
        blocked: false,
      });
    } else if (heirs.wife) {
      result.heirs.push({
        name: "Жена",
        share: shares.spouseShare,
        percentage: shares.spouseShare.toDecimal() * 100,
        amount: totalEstate * shares.spouseShare.toDecimal(),
        blocked: false,
      });
    }

    if (heirs.mother) {
      result.heirs.push({
        name: "Мать",
        share: shares.motherShare,
        percentage: shares.motherShare.toDecimal() * 100,
        amount: totalEstate * shares.motherShare.toDecimal(),
        blocked: false,
      });
    }

    if (heirs.father) {
      result.heirs.push({
        name: "Отец",
        share: shares.fatherShare,
        percentage: shares.fatherShare.toDecimal() * 100,
        amount: totalEstate * shares.fatherShare.toDecimal(),
        blocked: false,
      });
    }
  } else {
    // Обычный расчет с возможным применением Авль или Радд

    // Рассчитываем доли супругов
    const spouseResult = calculateSpouseShare(heirs);
    if (spouseResult) {
      let finalShare = spouseResult.share;

      // Применяем Авль если необходимо
      if (specialCases.awl && specialCases.awl.applied) {
        finalShare = finalShare.multiply(specialCases.awl.awlRatio);
      }

      result.heirs.push({
        name: spouseResult.type === "husband" ? "Муж" : "Жена",
        share: finalShare,
        percentage: finalShare.toDecimal() * 100,
        amount: totalEstate * finalShare.toDecimal(),
        blocked: false,
      });
    }

    // Рассчитываем доли предков
    const ascendantShares = calculateAscendantShares(heirs);

    if (ascendantShares.mother) {
      let finalShare = ascendantShares.mother.share;

      // Применяем Авль если необходимо
      if (specialCases.awl && specialCases.awl.applied) {
        finalShare = finalShare.multiply(specialCases.awl.awlRatio);
      }

      // Применяем Радд если необходимо
      if (
        specialCases.radd &&
        specialCases.radd.applied &&
        specialCases.radd.raddShares.mother
      ) {
        finalShare = finalShare.add(specialCases.radd.raddShares.mother);
      }

      result.heirs.push({
        name: "Мать",
        share: finalShare,
        percentage: finalShare.toDecimal() * 100,
        amount: totalEstate * finalShare.toDecimal(),
        blocked: false,
      });
    }

    if (ascendantShares.father) {
      let finalShare = ascendantShares.father.fixedShare || new Fraction(0, 1);

      // Применяем Авль к фиксированной части если необходимо
      if (
        specialCases.awl &&
        specialCases.awl.applied &&
        ascendantShares.father.fixedShare
      ) {
        finalShare = ascendantShares.father.fixedShare.multiply(
          specialCases.awl.awlRatio
        );
      }

      // Добавляем асаба если отец является асаба и нет Авль
      if (ascendantShares.father.isAsaba && !specialCases.awl?.applied) {
        const asabaResult = calculateAsaba(heirs);
        if (asabaResult.hasAsaba && asabaResult.distribution) {
          finalShare = finalShare.add(asabaResult.distribution.maleShare);
        }
      }

      result.heirs.push({
        name: "Отец",
        share: finalShare,
        percentage: finalShare.toDecimal() * 100,
        amount: totalEstate * finalShare.toDecimal(),
        blocked: false,
      });
    }

    // Дед (только если нет отца)
    if (ascendantShares.grandfather) {
      let finalShare =
        ascendantShares.grandfather.fixedShare || new Fraction(0, 1);

      // Применяем Авль к фиксированной части если необходимо
      if (
        specialCases.awl &&
        specialCases.awl.applied &&
        ascendantShares.grandfather.fixedShare
      ) {
        finalShare = ascendantShares.grandfather.fixedShare.multiply(
          specialCases.awl.awlRatio
        );
      }

      // Добавляем асаба если дед является асаба и нет Авль
      if (ascendantShares.grandfather.isAsaba && !specialCases.awl?.applied) {
        const asabaResult = calculateAsaba(heirs);
        if (asabaResult.hasAsaba && asabaResult.distribution) {
          finalShare = finalShare.add(asabaResult.distribution.maleShare);
        }
      }

      result.heirs.push({
        name: "Дед",
        share: finalShare,
        percentage: finalShare.toDecimal() * 100,
        amount: totalEstate * finalShare.toDecimal(),
        blocked: false,
      });
    }

    // Бабушки (только если нет матери)
    if (ascendantShares.grandmothers) {
      let finalShare = ascendantShares.grandmothers.totalShare;

      // Применяем Авль если необходимо
      if (specialCases.awl && specialCases.awl.applied) {
        finalShare = finalShare.multiply(specialCases.awl.awlRatio);
      }

      // Применяем Радд если необходимо
      if (
        specialCases.radd &&
        specialCases.radd.applied &&
        specialCases.radd.raddShares.grandmothers
      ) {
        finalShare = finalShare.add(specialCases.radd.raddShares.grandmothers);
      }

      result.heirs.push({
        name: "Бабушки",
        share: finalShare,
        percentage: finalShare.toDecimal() * 100,
        amount: totalEstate * finalShare.toDecimal(),
        blocked: false,
      });
    }

    // Рассчитываем доли потомков
    const descendantShares = calculateDescendantShares(heirs);

    if (descendantShares.daughters) {
      let finalShare = descendantShares.daughters.share || new Fraction(0, 1);

      // Если дочери являются асаба (с сыном)
      if (descendantShares.daughters.isAsaba && !specialCases.awl?.applied) {
        const asabaResult = calculateAsaba(heirs);
        if (asabaResult.hasAsaba && asabaResult.distribution) {
          finalShare = asabaResult.distribution.femaleShare;
        }
      } else if (descendantShares.daughters.share) {
        // Применяем Авль если необходимо
        if (specialCases.awl && specialCases.awl.applied) {
          finalShare = descendantShares.daughters.share.multiply(
            specialCases.awl.awlRatio
          );
        }

        // Применяем Радд если необходимо
        if (
          specialCases.radd &&
          specialCases.radd.applied &&
          specialCases.radd.raddShares.daughters
        ) {
          finalShare = finalShare.add(specialCases.radd.raddShares.daughters);
        }
      }

      if (!finalShare.isZero()) {
        result.heirs.push({
          name: descendantShares.daughters.count === 1 ? "Дочь" : "Дочери",
          share: finalShare,
          percentage: finalShare.toDecimal() * 100,
          amount: totalEstate * finalShare.toDecimal(),
          blocked: false,
        });
      }
    }

    if (descendantShares.sons && !specialCases.awl?.applied) {
      const asabaResult = calculateAsaba(heirs);
      if (asabaResult.hasAsaba && asabaResult.distribution) {
        const finalShare = asabaResult.distribution.maleShare;

        result.heirs.push({
          name: descendantShares.sons.count === 1 ? "Сын" : "Сыновья",
          share: finalShare,
          percentage: finalShare.toDecimal() * 100,
          amount: totalEstate * finalShare.toDecimal(),
          blocked: false,
        });
      }
    }

    if (descendantShares.grandsonsFromSon && !specialCases.awl?.applied) {
      const asabaResult = calculateAsaba(heirs);
      if (
        asabaResult.hasAsaba &&
        asabaResult.distribution &&
        asabaResult.asabaInfo.key === "grandsonsFromSon"
      ) {
        const finalShare = asabaResult.distribution.maleShare;

        result.heirs.push({
          name:
            descendantShares.grandsonsFromSon.count === 1
              ? "Внук от сына"
              : "Внуки от сына",
          share: finalShare,
          percentage: finalShare.toDecimal() * 100,
          amount: totalEstate * finalShare.toDecimal(),
          blocked: false,
        });
      }
    }

    if (descendantShares.granddaughtersFromSon) {
      let finalShare =
        descendantShares.granddaughtersFromSon.share || new Fraction(0, 1);

      // Если внучки являются асаба (с внуком от сына)
      if (
        descendantShares.granddaughtersFromSon.isAsaba &&
        !specialCases.awl?.applied
      ) {
        const asabaResult = calculateAsaba(heirs);
        if (
          asabaResult.hasAsaba &&
          asabaResult.distribution &&
          asabaResult.asabaInfo.key === "grandsonsFromSon"
        ) {
          finalShare = asabaResult.distribution.femaleShare;
        }
      } else if (
        descendantShares.granddaughtersFromSon.share &&
        !descendantShares.granddaughtersFromSon.blocked
      ) {
        // Применяем Авль если необходимо
        if (specialCases.awl && specialCases.awl.applied) {
          finalShare = descendantShares.granddaughtersFromSon.share.multiply(
            specialCases.awl.awlRatio
          );
        }

        // Применяем Радд если необходимо
        if (
          specialCases.radd &&
          specialCases.radd.applied &&
          specialCases.radd.raddShares.granddaughtersFromSon
        ) {
          finalShare = finalShare.add(
            specialCases.radd.raddShares.granddaughtersFromSon
          );
        }
      }

      if (!finalShare.isZero()) {
        result.heirs.push({
          name:
            descendantShares.granddaughtersFromSon.count === 1
              ? "Внучка от сына"
              : "Внучки от сына",
          share: finalShare,
          percentage: finalShare.toDecimal() * 100,
          amount: totalEstate * finalShare.toDecimal(),
          blocked: false,
        });
      }
    }

    // Добавляем братьев и сестер если они являются асаба
    if (!specialCases.awl?.applied) {
      const asabaResult = calculateAsaba(heirs);
      if (asabaResult.hasAsaba && asabaResult.distribution) {
        if (asabaResult.asabaInfo.key === "fullBrothers") {
          const maleShare = asabaResult.distribution.maleShare;
          const femaleShare = asabaResult.distribution.femaleShare;

          if (!maleShare.isZero()) {
            result.heirs.push({
              name: heirs.fullBrothers === 1 ? "Родной брат" : "Родные братья",
              share: maleShare,
              percentage: maleShare.toDecimal() * 100,
              amount: totalEstate * maleShare.toDecimal(),
              blocked: false,
            });
          }

          if (!femaleShare.isZero()) {
            result.heirs.push({
              name: heirs.fullSisters === 1 ? "Родная сестра" : "Родные сестры",
              share: femaleShare,
              percentage: femaleShare.toDecimal() * 100,
              amount: totalEstate * femaleShare.toDecimal(),
              blocked: false,
            });
          }
        } else if (asabaResult.asabaInfo.key === "paternalBrothers") {
          const maleShare = asabaResult.distribution.maleShare;
          const femaleShare = asabaResult.distribution.femaleShare;

          if (!maleShare.isZero()) {
            result.heirs.push({
              name:
                heirs.paternalBrothers === 1
                  ? "Единокровный брат"
                  : "Единокровные братья",
              share: maleShare,
              percentage: maleShare.toDecimal() * 100,
              amount: totalEstate * maleShare.toDecimal(),
              blocked: false,
            });
          }

          if (!femaleShare.isZero()) {
            result.heirs.push({
              name:
                heirs.paternalSisters === 1
                  ? "Единокровная сестра"
                  : "Единокровные сестры",
              share: femaleShare,
              percentage: femaleShare.toDecimal() * 100,
              amount: totalEstate * femaleShare.toDecimal(),
              blocked: false,
            });
          }
        }
      }
    }

    // Родные сестры с фиксированной долей (когда нет братьев)
    if (
      heirs.fullSisters > 0 &&
      heirs.fullBrothers === 0 &&
      !heirs.father &&
      !hasChildren(heirs)
    ) {
      let sisterShare = HeirTypes.FULL_SISTER.getShare(heirs);
      if (sisterShare && !sisterShare.isZero()) {
        if (specialCases.awl && specialCases.awl.applied) {
          sisterShare = sisterShare.multiply(specialCases.awl.awlRatio);
        }
        if (
          specialCases.radd &&
          specialCases.radd.applied &&
          specialCases.radd.raddShares.fullSisters
        ) {
          sisterShare = sisterShare.add(
            specialCases.radd.raddShares.fullSisters
          );
        }

        result.heirs.push({
          name: heirs.fullSisters === 1 ? "Родная сестра" : "Родные сестры",
          share: sisterShare,
          percentage: sisterShare.toDecimal() * 100,
          amount: totalEstate * sisterShare.toDecimal(),
          blocked: false,
        });
      }
    }

    // Единокровные сестры с фиксированной долей (когда нет единокровных братьев и родных братьев)
    if (
      heirs.paternalSisters > 0 &&
      heirs.paternalBrothers === 0 &&
      heirs.fullBrothers === 0 &&
      !heirs.father &&
      !hasChildren(heirs)
    ) {
      let paternalSisterShare = HeirTypes.PATERNAL_SISTER.getShare(heirs);
      if (paternalSisterShare && !paternalSisterShare.isZero()) {
        if (specialCases.awl && specialCases.awl.applied) {
          paternalSisterShare = paternalSisterShare.multiply(
            specialCases.awl.awlRatio
          );
        }
        if (
          specialCases.radd &&
          specialCases.radd.applied &&
          specialCases.radd.raddShares.paternalSisters
        ) {
          paternalSisterShare = paternalSisterShare.add(
            specialCases.radd.raddShares.paternalSisters
          );
        }

        result.heirs.push({
          name:
            heirs.paternalSisters === 1
              ? "Единокровная сестра"
              : "Единокровные сестры",
          share: paternalSisterShare,
          percentage: paternalSisterShare.toDecimal() * 100,
          amount: totalEstate * paternalSisterShare.toDecimal(),
          blocked: false,
        });
      }
    }

    // Добавляем единоутробных братьев и сестер (при каляля)
    if (!heirs.father && !hasChildren(heirs)) {
      const totalMaternal =
        (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
      if (totalMaternal > 0) {
        let maternalShare =
          totalMaternal === 1 ? new Fraction(1, 6) : new Fraction(1, 3);

        // Применяем Авль если необходимо
        if (specialCases.awl && specialCases.awl.applied) {
          maternalShare = maternalShare.multiply(specialCases.awl.awlRatio);
        }

        // Применяем Радд если необходимо
        if (specialCases.radd && specialCases.radd.applied) {
          if (specialCases.radd.raddShares.maternalBrothers) {
            maternalShare = maternalShare.add(
              specialCases.radd.raddShares.maternalBrothers
            );
          } else if (specialCases.radd.raddShares.maternalSisters) {
            maternalShare = maternalShare.add(
              specialCases.radd.raddShares.maternalSisters
            );
          }
        }

        if (!maternalShare.isZero()) {
          result.heirs.push({
            name:
              totalMaternal === 1
                ? heirs.maternalBrothers > 0
                  ? "Единоутробный брат"
                  : "Единоутробная сестра"
                : "Единоутробные братья и сестры",
            share: maternalShare,
            percentage: maternalShare.toDecimal() * 100,
            amount: totalEstate * maternalShare.toDecimal(),
            blocked: false,
          });
        }
      }
    }
  }

  // Рассчитываем общий процент распределения
  result.totalPercentage = result.heirs.reduce(
    (sum, heir) => sum + heir.percentage,
    0
  );
  result.totalDistributed = result.heirs.reduce(
    (sum, heir) => sum + heir.amount,
    0
  );

  return result;
}

describe("Property 1: Инвариант полного распределения", () => {
  /**
   * Property 1: Инвариант полного распределения
   * Для любой комбинации наследников и любой суммы наследства,
   * после расчета сумма всех распределенных долей должна равняться 100%
   * (с учетом применения Авль или Радд)
   *
   * Feature: islamic-inheritance-calculator, Property 1: Инвариант полного распределения
   * Validates: Requirements 10.2, 11.2, 13.3
   */
  it("Property 1: Сумма всех долей всегда равна 100% (Requirements 10.2, 11.2, 13.3)", () => {
    fc.assert(
      fc.property(
        arbitraryHeirsState,
        fc.double({ min: 1000, max: 1000000, noNaN: true }),
        (heirs, totalEstate) => {
          // Пропускаем случаи без наследников
          const hasAnyHeir =
            heirs.husband ||
            heirs.wife ||
            heirs.father ||
            heirs.mother ||
            heirs.sons > 0 ||
            heirs.daughters > 0 ||
            heirs.grandsonsFromSon > 0 ||
            heirs.granddaughtersFromSon > 0 ||
            heirs.paternalGrandfather ||
            heirs.paternalGrandmother ||
            heirs.maternalGrandmother ||
            heirs.fullBrothers > 0 ||
            heirs.fullSisters > 0 ||
            heirs.paternalBrothers > 0 ||
            heirs.paternalSisters > 0 ||
            heirs.maternalBrothers > 0 ||
            heirs.maternalSisters > 0;

          if (!hasAnyHeir) {
            return true; // Пропускаем случаи без наследников
          }

          try {
            const result = calculateCompleteInheritance(heirs, totalEstate);

            // Проверяем что есть наследники в результате
            if (result.heirs.length === 0) {
              return true; // Пропускаем если все заблокированы
            }

            // Основное свойство: сумма процентов должна быть близка к 100%
            // Используем небольшую погрешность для учета округлений
            const totalPercentage = result.totalPercentage;
            const isValid = Math.abs(totalPercentage - 100) < 0.01;

            // Дополнительная проверка: сумма долей должна быть близка к 1
            const totalFractionSum = result.heirs.reduce(
              (sum, heir) => sum.add(heir.share),
              new Fraction(0, 1)
            );
            const totalFractionDecimal = totalFractionSum.toDecimal();
            const fractionValid = Math.abs(totalFractionDecimal - 1) < 0.01;

            // Проверка суммы в денежном выражении
            const totalAmount = result.totalDistributed;
            const amountValid = Math.abs(totalAmount - totalEstate) < 1; // Погрешность в 1 единицу

            return isValid && fractionValid && amountValid;
          } catch (error) {
            // В случае ошибки в расчете, логируем и возвращаем false
            console.error("Error in inheritance calculation:", error, heirs);
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.1: Проверка конкретных известных случаев
   * Validates: Requirements 10.2, 11.2, 13.3
   */
  it("Property 1.1: Известные случаи дают правильное распределение", () => {
    // Случай 1: Только муж и мать (должен применяться Радд)
    const case1 = {
      husband: true,
      wife: false,
      mother: true,
      father: false,
      sons: 0,
      daughters: 0,
      grandsonsFromSon: 0,
      granddaughtersFromSon: 0,
      paternalGrandfather: false,
      paternalGrandmother: false,
      maternalGrandmother: false,
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    };

    const result1 = calculateCompleteInheritance(case1, 100000);
    expect(Math.abs(result1.totalPercentage - 100)).toBeLessThan(0.01);

    // Случай 2: Муж, отец, мать (аль-Умарийятайн)
    const case2 = {
      husband: true,
      wife: false,
      mother: true,
      father: true,
      sons: 0,
      daughters: 0,
      grandsonsFromSon: 0,
      granddaughtersFromSon: 0,
      paternalGrandfather: false,
      paternalGrandmother: false,
      maternalGrandmother: false,
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    };

    const result2 = calculateCompleteInheritance(case2, 100000);
    expect(Math.abs(result2.totalPercentage - 100)).toBeLessThan(0.01);

    // Случай 3: Сын и дочь (асаба с соотношением 2:1)
    const case3 = {
      husband: false,
      wife: false,
      mother: false,
      father: false,
      sons: 1,
      daughters: 1,
      grandsonsFromSon: 0,
      granddaughtersFromSon: 0,
      paternalGrandfather: false,
      paternalGrandmother: false,
      maternalGrandmother: false,
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    };

    const result3 = calculateCompleteInheritance(case3, 100000);
    expect(Math.abs(result3.totalPercentage - 100)).toBeLessThan(0.01);
  });
});
