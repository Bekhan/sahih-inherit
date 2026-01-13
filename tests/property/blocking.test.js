/**
 * Property-Based Tests for Blocking System (Хиджб)
 * Feature: islamic-inheritance-calculator, Property 2: Корректность системы блокировки
 * Validates: Requirements 4.2, 5.2, 6.3, 6.4, 9.1-9.6
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  BlockingRules,
  checkBlocking,
  getBlockingReason,
  getAllBlockings,
} from "../../src/blocking.js";

// Генератор для состояния наследников
const arbitraryHeirsState = fc.record({
  // Супруги
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
});

describe("Blocking System Property-Based Tests", () => {
  /**
   * Property 2: Корректность системы блокировки (хиджб)
   * Для любой комбинации наследников: если присутствует блокирующий наследник,
   * заблокированный наследник должен быть помечен как заблокированный с указанием причины
   * Validates: Requirements 4.2, 5.2, 6.3, 6.4, 9.1-9.6
   */
  describe("Property 2: Корректность системы блокировки", () => {
    /**
     * 9.1: Дед блокируется отцом
     * Для любого состояния: если отец присутствует, дед должен быть заблокирован
     */
    it("Property 2.1: Отец блокирует деда (Requirements 9.1)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const blocking = checkBlocking("paternalGrandfather", heirs);

          if (heirs.father === true) {
            // Если отец есть, дед должен быть заблокирован
            return (
              blocking.blocked === true &&
              blocking.reason === "Блокируется отцом"
            );
          } else {
            // Если отца нет, дед не должен быть заблокирован (по этому правилу)
            return blocking.blocked === false;
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 9.5: Бабушка по отцу блокируется матерью
     * Для любого состояния: если мать присутствует, бабушка по отцу должна быть заблокирована
     */
    it("Property 2.2: Мать блокирует бабушку по отцу (Requirements 9.5)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const blocking = checkBlocking("paternalGrandmother", heirs);

          if (heirs.mother === true) {
            // Если мать есть, бабушка по отцу должна быть заблокирована
            return (
              blocking.blocked === true &&
              blocking.reason === "Блокируется матерью"
            );
          } else {
            // Если матери нет, бабушка не должна быть заблокирована
            return blocking.blocked === false;
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 9.2, 4.2: Внуки от сына блокируются сыновьями
     * Для любого состояния: если есть сыновья, внуки от сына должны быть заблокированы
     */
    it("Property 2.3: Сын блокирует внуков от сына (Requirements 9.2, 4.2)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const grandsonsBlocking = checkBlocking("grandsonsFromSon", heirs);
          const granddaughtersBlocking = checkBlocking(
            "granddaughtersFromSon",
            heirs
          );

          if (heirs.sons > 0) {
            // Если есть сыновья, внуки должны быть заблокированы
            return (
              grandsonsBlocking.blocked === true &&
              grandsonsBlocking.reason === "Блокируется сыном" &&
              granddaughtersBlocking.blocked === true &&
              granddaughtersBlocking.reason === "Блокируется сыном"
            );
          } else {
            // Если сыновей нет, внуки не должны быть заблокированы
            return (
              grandsonsBlocking.blocked === false &&
              granddaughtersBlocking.blocked === false
            );
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 9.3, 6.3: Родные братья/сестры блокируются отцом, сыном или внуком от сына
     */
    it("Property 2.4: Отец/сын/внук блокирует родных братьев и сестер (Requirements 9.3, 6.3)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const brothersBlocking = checkBlocking("fullBrothers", heirs);
          const sistersBlocking = checkBlocking("fullSisters", heirs);

          const shouldBeBlocked =
            heirs.father === true ||
            heirs.sons > 0 ||
            heirs.grandsonsFromSon > 0;

          if (shouldBeBlocked) {
            // Должны быть заблокированы
            if (!brothersBlocking.blocked || !sistersBlocking.blocked) {
              return false;
            }
            // Проверяем, что причина указана корректно
            const validReasons = [
              "Блокируется отцом",
              "Блокируется сыном",
              "Блокируется внуком от сына",
            ];
            return (
              validReasons.includes(brothersBlocking.reason) &&
              validReasons.includes(sistersBlocking.reason)
            );
          } else {
            // Не должны быть заблокированы
            return (
              brothersBlocking.blocked === false &&
              sistersBlocking.blocked === false
            );
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 9.4, 6.4: Единокровные братья/сестры блокируются родными братьями
     * (в дополнение к блокировке отцом/сыном/внуком)
     */
    it("Property 2.5: Родные братья блокируют единокровных братьев/сестер (Requirements 9.4, 6.4)", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const paternalBrothersBlocking = checkBlocking(
            "paternalBrothers",
            heirs
          );
          const paternalSistersBlocking = checkBlocking(
            "paternalSisters",
            heirs
          );

          const shouldBeBlocked =
            heirs.father === true ||
            heirs.sons > 0 ||
            heirs.grandsonsFromSon > 0 ||
            heirs.fullBrothers > 0;

          if (shouldBeBlocked) {
            // Должны быть заблокированы
            if (
              !paternalBrothersBlocking.blocked ||
              !paternalSistersBlocking.blocked
            ) {
              return false;
            }
            // Проверяем, что причина указана корректно
            const validReasons = [
              "Блокируется отцом",
              "Блокируется сыном",
              "Блокируется внуком от сына",
              "Блокируется родным братом",
            ];
            return (
              validReasons.includes(paternalBrothersBlocking.reason) &&
              validReasons.includes(paternalSistersBlocking.reason)
            );
          } else {
            // Не должны быть заблокированы
            return (
              paternalBrothersBlocking.blocked === false &&
              paternalSistersBlocking.blocked === false
            );
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Общее свойство: checkBlocking всегда возвращает корректную структуру
     */
    it("Property 2.6: checkBlocking возвращает корректную структуру", () => {
      fc.assert(
        fc.property(
          arbitraryHeirsState,
          fc.constantFrom(
            "paternalGrandfather",
            "paternalGrandmother",
            "grandsonsFromSon",
            "granddaughtersFromSon",
            "fullBrothers",
            "fullSisters",
            "paternalBrothers",
            "paternalSisters"
          ),
          (heirs, heirType) => {
            const result = checkBlocking(heirType, heirs);

            // Результат должен иметь свойства blocked и reason
            if (typeof result.blocked !== "boolean") return false;

            // Если заблокирован, причина должна быть строкой
            if (result.blocked && typeof result.reason !== "string")
              return false;

            // Если не заблокирован, причина должна быть null
            if (!result.blocked && result.reason !== null) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Свойство: getAllBlockings возвращает блокировки для всех типов наследников
     */
    it("Property 2.7: getAllBlockings возвращает полный набор блокировок", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          const blockings = getAllBlockings(heirs);

          // Должны быть все типы наследников, которые могут быть заблокированы
          const expectedTypes = [
            "paternalGrandfather",
            "paternalGrandmother",
            "grandsonsFromSon",
            "granddaughtersFromSon",
            "fullBrothers",
            "fullSisters",
            "paternalBrothers",
            "paternalSisters",
          ];

          for (const type of expectedTypes) {
            if (!(type in blockings)) return false;
            if (typeof blockings[type].blocked !== "boolean") return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Свойство: Приоритет причин блокировки корректен
     * Если есть несколько причин блокировки, должна отображаться наиболее приоритетная
     */
    it("Property 2.8: Приоритет причин блокировки корректен", () => {
      fc.assert(
        fc.property(arbitraryHeirsState, (heirs) => {
          // Для единокровных братьев проверяем приоритет причин
          const blocking = checkBlocking("paternalBrothers", heirs);

          if (!blocking.blocked) return true;

          // Приоритет: отец > сын > внук от сына > родной брат
          if (heirs.father === true) {
            return blocking.reason === "Блокируется отцом";
          }
          if (heirs.sons > 0) {
            return blocking.reason === "Блокируется сыном";
          }
          if (heirs.grandsonsFromSon > 0) {
            return blocking.reason === "Блокируется внуком от сына";
          }
          if (heirs.fullBrothers > 0) {
            return blocking.reason === "Блокируется родным братом";
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
