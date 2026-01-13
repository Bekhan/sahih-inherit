/**
 * Property-Based Tests for Special Cases (Особые случаи)
 * Feature: islamic-inheritance-calculator
 * - Property 5: Корректность аль-Авль
 * - Property 6: Корректность ар-Радд
 * - Property 7: Корректность аль-Умарийятайн
 * Validates: Requirements 10.1-10.2, 11.1-11.2, 12.1-12.2
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Fraction } from "../../src/fraction.js";
import {
  needsAwl,
  calculateAwlRatio,
  applyAwlToShare,
  applyAwl,
  needsRadd,
  getRaddRecipients,
  applyRadd,
  checkUmariyyatan,
  calculateUmariyyatanShares,
  applyUmariyyatan,
} from "../../src/special-cases.js";
import {
  calculateFixedSharesTotal,
  calculateRemainder,
  determineAsaba,
} from "../../src/shares.js";

// Генератор для состояния наследников (взаимоисключающие супруги)
const arbitraryHeirsState = fc
  .record({
    husband: fc.boolean(),
    wife: fc.boolean(),
    wifeCount: fc.integer({ min: 1, max: 4 }),
    sons: fc.integer({ min: 0, max: 5 }),
    daughters: fc.integer({ min: 0, max: 5 }),
    grandsonsFromSon: fc.integer({ min: 0, max: 5 }),
    granddaughtersFromSon: fc.integer({ min: 0, max: 5 }),
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
    nephewsFullBrothers: fc.integer({ min: 0, max: 5 }),
    nephewsPaternalBrothers: fc.integer({ min: 0, max: 5 }),
    unclesFull: fc.integer({ min: 0, max: 5 }),
    unclesPaternal: fc.integer({ min: 0, max: 5 }),
  })
  .filter((state) => !(state.husband && state.wife));

describe("Special Cases Property-Based Tests", () => {
  /**
   * Property 5: Корректность аль-Авль
   * Для любой комбинации наследников, где сумма базовых фиксированных долей
   * превышает 100%, должно применяться правило аль-Авль: все доли пропорционально
   * уменьшаются так, чтобы итоговая сумма равнялась 100%.
   * Validates: Requirements 10.1, 10.2
   */
  describe("Property 5: Корректность аль-Авль", () => {
    /**
     * Property 5.1: Авль применяется только когда сумма долей > 100%
     * Requirements: 10.1
     */
    it("Property 5.1: Авль применяется только когда сумма долей > 100% (Requirements 10.1)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const fixedTotal = calculateFixedSharesTotal(heirs);
          const one = new Fraction(1, 1);
          const awlNeeded = needsAwl(heirs);

          // Авль нужен тогда и только тогда, когда сумма > 1
          return awlNeeded === fixedTotal.greaterThan(one);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5.2: После применения Авль сумма долей = 100%
     * Requirements: 10.2
     */
    it("Property 5.2: После применения Авль сумма долей = 100% (Requirements 10.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const awlResult = applyAwl(heirs);

          if (!awlResult.applied) {
            return true; // Авль не применяется, пропускаем
          }

          // После Авль сумма должна быть 1
          const one = new Fraction(1, 1);
          return awlResult.adjustedTotal.equals(one);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5.3: Коэффициент Авль корректен
     * awlRatio = 1 / originalTotal
     * Requirements: 10.2
     */
    it("Property 5.3: Коэффициент Авль = 1 / сумма_долей (Requirements 10.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          if (!needsAwl(heirs)) {
            return true;
          }

          const fixedTotal = calculateFixedSharesTotal(heirs);
          const awlRatio = calculateAwlRatio(heirs);
          const one = new Fraction(1, 1);

          // awlRatio × fixedTotal должно равняться 1
          const product = awlRatio.multiply(fixedTotal);
          return product.equals(one);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5.4: Пропорции между долями сохраняются после Авль
     * Requirements: 10.2
     */
    it("Property 5.4: Пропорции между долями сохраняются после Авль (Requirements 10.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          if (!needsAwl(heirs)) {
            return true;
          }

          const awlRatio = calculateAwlRatio(heirs);

          // Создаем две произвольные доли
          const share1 = new Fraction(1, 2);
          const share2 = new Fraction(1, 4);

          const adjusted1 = applyAwlToShare(share1, awlRatio);
          const adjusted2 = applyAwlToShare(share2, awlRatio);

          // Пропорция должна сохраниться: share1/share2 = adjusted1/adjusted2
          // share1 = 2 × share2, значит adjusted1 = 2 × adjusted2
          const expectedRatio = share1.divide(share2);
          const actualRatio = adjusted1.divide(adjusted2);

          return expectedRatio.equals(actualRatio);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5.5: Уведомление формируется при применении Авль
     * Requirements: 10.3
     */
    it("Property 5.5: Уведомление формируется при применении Авль (Requirements 10.3)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const awlResult = applyAwl(heirs);

          if (awlResult.applied) {
            // Должно быть уведомление
            return (
              awlResult.notification !== null &&
              awlResult.notification.type === "warning" &&
              awlResult.notification.icon === "⚠️" &&
              awlResult.notification.message.length > 0
            );
          } else {
            // Уведомления не должно быть
            return awlResult.notification === null;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Корректность ар-Радд
   * Для любой комбинации наследников, где сумма фиксированных долей меньше 100%
   * и отсутствует асаба, должно применяться правило ар-Радд: остаток пропорционально
   * распределяется между наследниками с фиксированной долей (кроме супругов).
   * Validates: Requirements 8.3, 11.1, 11.2
   */
  describe("Property 6: Корректность ар-Радд", () => {
    /**
     * Property 6.1: Радд применяется только когда есть остаток и нет асаба
     * Requirements: 11.1
     */
    it("Property 6.1: Радд применяется только когда есть остаток и нет асаба (Requirements 11.1)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const remainder = calculateRemainder(heirs);
          const asabaInfo = determineAsaba(heirs);
          const raddNeeded = needsRadd(heirs);

          const hasPositiveRemainder = remainder.greaterThan(
            new Fraction(0, 1)
          );
          const noAsaba = asabaInfo === null;

          // Радд нужен тогда и только тогда, когда есть остаток и нет асаба
          return raddNeeded === (hasPositiveRemainder && noAsaba);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6.2: Супруги не участвуют в Радд
     * Requirements: 11.2
     */
    it("Property 6.2: Супруги не участвуют в Радд (Requirements 11.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const recipients = getRaddRecipients(heirs);

          // Супруги не должны быть в списке получателей Радд
          return (
            !recipients.includes("husband") && !recipients.includes("wife")
          );
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6.3: Сумма долей Радд равна остатку
     * Requirements: 11.2
     */
    it("Property 6.3: Сумма долей Радд равна остатку (Requirements 11.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const raddResult = applyRadd(heirs);

          if (!raddResult.applied) {
            return true;
          }

          // Сумма всех raddShares должна равняться remainder
          let totalRaddShares = new Fraction(0, 1);
          for (const share of Object.values(raddResult.raddShares)) {
            totalRaddShares = totalRaddShares.add(share);
          }

          // Допускаем небольшую погрешность из-за округления дробей
          const diff = Math.abs(
            totalRaddShares.toDecimal() - raddResult.remainder.toDecimal()
          );
          return diff < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6.4: Уведомление формируется при применении Радд
     * Requirements: 11.3
     */
    it("Property 6.4: Уведомление формируется при применении Радд (Requirements 11.3)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const raddResult = applyRadd(heirs);

          if (raddResult.applied) {
            return (
              raddResult.notification !== null &&
              raddResult.notification.type === "info" &&
              raddResult.notification.icon === "ℹ️" &&
              raddResult.notification.message.length > 0
            );
          } else {
            return raddResult.notification === null;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Корректность аль-Умарийятайн
   * Для любой комбинации, где наследуют только супруг (муж или жена) и оба родителя
   * (без детей и братьев), мать должна получить 1/3 от остатка после доли супруга,
   * а не 1/3 от всего имущества.
   * Validates: Requirements 12.1, 12.2
   */
  describe("Property 7: Корректность аль-Умарийятайн", () => {
    // Генератор для случая Умарийятайн
    const arbitraryUmariyyatanState = fc
      .record({
        husband: fc.boolean(),
        wife: fc.boolean(),
        wifeCount: fc.constant(1),
        sons: fc.constant(0),
        daughters: fc.constant(0),
        grandsonsFromSon: fc.constant(0),
        granddaughtersFromSon: fc.constant(0),
        father: fc.constant(true),
        mother: fc.constant(true),
        paternalGrandfather: fc.constant(false),
        paternalGrandmother: fc.constant(false),
        maternalGrandmother: fc.constant(false),
        fullBrothers: fc.constant(0),
        fullSisters: fc.constant(0),
        paternalBrothers: fc.constant(0),
        paternalSisters: fc.constant(0),
        maternalBrothers: fc.constant(0),
        maternalSisters: fc.constant(0),
      })
      .filter((state) => state.husband !== state.wife); // Ровно один супруг

    /**
     * Property 7.1: Умарийятайн применяется только при супруге + оба родителя
     * Requirements: 12.1
     */
    it("Property 7.1: Умарийятайн применяется только при супруге + оба родителя (Requirements 12.1)", () => {
      fc.assert(
        fc.property(arbitraryUmariyyatanState, (heirs) => {
          const umariyyatan = checkUmariyyatan(heirs);

          // Должен применяться для всех состояний из генератора
          return umariyyatan !== null && umariyyatan.applies === true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.2: Мать получает 1/3 от остатка, а не от всего имущества
     * Requirements: 12.2
     */
    it("Property 7.2: Мать получает 1/3 от остатка после доли супруга (Requirements 12.2)", () => {
      fc.assert(
        fc.property(arbitraryUmariyyatanState, (heirs) => {
          const shares = calculateUmariyyatanShares(heirs);

          if (!shares) {
            return true;
          }

          const one = new Fraction(1, 1);
          const remainderAfterSpouse = one.subtract(shares.spouseShare);
          const expectedMotherShare = remainderAfterSpouse.divide(
            new Fraction(3, 1)
          );

          // Доля матери должна быть 1/3 от остатка
          return shares.motherShare.equals(expectedMotherShare);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.3: Сумма всех долей при Умарийятайн = 100%
     * Requirements: 12.2
     */
    it("Property 7.3: Сумма всех долей при Умарийятайн = 100% (Requirements 12.2)", () => {
      fc.assert(
        fc.property(arbitraryUmariyyatanState, (heirs) => {
          const shares = calculateUmariyyatanShares(heirs);

          if (!shares) {
            return true;
          }

          const total = shares.spouseShare
            .add(shares.motherShare)
            .add(shares.fatherShare);
          const one = new Fraction(1, 1);

          return total.equals(one);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.4: Доля матери при Умарийятайн меньше обычной 1/3
     * Requirements: 12.2
     */
    it("Property 7.4: Доля матери при Умарийятайн меньше обычной 1/3 (Requirements 12.2)", () => {
      fc.assert(
        fc.property(arbitraryUmariyyatanState, (heirs) => {
          const shares = calculateUmariyyatanShares(heirs);

          if (!shares) {
            return true;
          }

          // Доля матери должна быть меньше 1/3
          return shares.motherShare.lessThan(shares.normalMotherShare);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.5: Уведомление формируется при применении Умарийятайн
     * Requirements: 12.3
     */
    it("Property 7.5: Уведомление формируется при применении Умарийятайн (Requirements 12.3)", () => {
      fc.assert(
        fc.property(arbitraryUmariyyatanState, (heirs) => {
          const result = applyUmariyyatan(heirs);

          if (result.applied) {
            return (
              result.notification !== null &&
              result.notification.icon === "📜" &&
              result.notification.message.length > 0
            );
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.6: Умарийятайн НЕ применяется при наличии детей
     * Requirements: 12.1
     */
    it("Property 7.6: Умарийятайн НЕ применяется при наличии детей (Requirements 12.1)", () => {
      const stateWithChildren = fc
        .record({
          husband: fc.boolean(),
          wife: fc.boolean(),
          wifeCount: fc.constant(1),
          sons: fc.integer({ min: 1, max: 3 }),
          daughters: fc.integer({ min: 0, max: 3 }),
          grandsonsFromSon: fc.constant(0),
          granddaughtersFromSon: fc.constant(0),
          father: fc.constant(true),
          mother: fc.constant(true),
          paternalGrandfather: fc.constant(false),
          paternalGrandmother: fc.constant(false),
          maternalGrandmother: fc.constant(false),
          fullBrothers: fc.constant(0),
          fullSisters: fc.constant(0),
          paternalBrothers: fc.constant(0),
          paternalSisters: fc.constant(0),
          maternalBrothers: fc.constant(0),
          maternalSisters: fc.constant(0),
        })
        .filter((state) => state.husband !== state.wife);

      fc.assert(
        fc.property(stateWithChildren, (heirs) => {
          const umariyyatan = checkUmariyyatan(heirs);
          return umariyyatan === null;
        }),
        { numRuns: 100 }
      );
    });
  });
});
