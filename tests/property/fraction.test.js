/**
 * Property-Based Tests for Fraction class
 * Feature: islamic-inheritance-calculator, Property: Упрощение дроби сохраняет значение
 * Validates: Requirements 7.1-7.6
 */

import { describe, it } from "vitest";
import fc from "fast-check";
import { Fraction } from "../../src/fraction.js";

// Генератор для валидных дробей (знаменатель не равен 0)
const arbitraryFraction = fc
  .tuple(
    fc.integer({ min: -1000, max: 1000 }),
    fc.integer({ min: 1, max: 1000 })
  )
  .map(([num, den]) => new Fraction(num, den));

// Генератор для ненулевых дробей (для деления)
const arbitraryNonZeroFraction = fc
  .tuple(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }))
  .chain(([absNum, den]) =>
    fc
      .boolean()
      .map((isNegative) => new Fraction(isNegative ? -absNum : absNum, den))
  );

describe("Fraction Property-Based Tests", () => {
  /**
   * Property: Упрощение дроби сохраняет значение
   * Для любой дроби: simplify().toDecimal() === original.toDecimal()
   * Validates: Requirements 7.1-7.6
   */
  it("Property: Упрощение дроби сохраняет значение (simplify preserves decimal value)", () => {
    fc.assert(
      fc.property(arbitraryFraction, (fraction) => {
        const originalDecimal = fraction.toDecimal();
        const simplifiedDecimal = fraction.simplify().toDecimal();

        // Сравниваем с небольшой погрешностью для учета ошибок округления
        return Math.abs(originalDecimal - simplifiedDecimal) < 1e-10;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Сложение коммутативно
   * Для любых дробей a и b: a + b = b + a
   */
  it("Property: Сложение коммутативно (addition is commutative)", () => {
    fc.assert(
      fc.property(arbitraryFraction, arbitraryFraction, (a, b) => {
        const result1 = a.add(b);
        const result2 = b.add(a);
        return result1.equals(result2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Умножение коммутативно
   * Для любых дробей a и b: a * b = b * a
   */
  it("Property: Умножение коммутативно (multiplication is commutative)", () => {
    fc.assert(
      fc.property(arbitraryFraction, arbitraryFraction, (a, b) => {
        const result1 = a.multiply(b);
        const result2 = b.multiply(a);
        return result1.equals(result2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Сложение с нулем - тождество
   * Для любой дроби a: a + 0 = a
   */
  it("Property: Сложение с нулем - тождество (zero is additive identity)", () => {
    fc.assert(
      fc.property(arbitraryFraction, (a) => {
        const zero = new Fraction(0, 1);
        const result = a.add(zero);
        return result.equals(a);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Умножение на единицу - тождество
   * Для любой дроби a: a * 1 = a
   */
  it("Property: Умножение на единицу - тождество (one is multiplicative identity)", () => {
    fc.assert(
      fc.property(arbitraryFraction, (a) => {
        const one = new Fraction(1, 1);
        const result = a.multiply(one);
        return result.equals(a);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Деление на себя дает единицу
   * Для любой ненулевой дроби a: a / a = 1
   */
  it("Property: Деление на себя дает единицу (self-division equals one)", () => {
    fc.assert(
      fc.property(arbitraryNonZeroFraction, (a) => {
        const result = a.divide(a);
        const one = new Fraction(1, 1);
        return result.equals(one);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Вычитание себя дает ноль
   * Для любой дроби a: a - a = 0
   */
  it("Property: Вычитание себя дает ноль (self-subtraction equals zero)", () => {
    fc.assert(
      fc.property(arbitraryFraction, (a) => {
        const result = a.subtract(a);
        return result.isZero();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: toDecimal и equals согласованы
   * Для любых дробей a и b: если a.equals(b), то a.toDecimal() === b.toDecimal()
   */
  it("Property: equals и toDecimal согласованы", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (num, den, multiplier) => {
          const a = new Fraction(num, den);
          const b = new Fraction(num * multiplier, den * multiplier);

          // Эквивалентные дроби должны быть равны
          if (a.equals(b)) {
            return Math.abs(a.toDecimal() - b.toDecimal()) < 1e-10;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Упрощенная дробь идемпотентна
   * Для любой дроби a: a.simplify().simplify().equals(a.simplify())
   */
  it("Property: Упрощение идемпотентно (simplify is idempotent)", () => {
    fc.assert(
      fc.property(arbitraryFraction, (a) => {
        const simplified1 = a.simplify();
        const simplified2 = simplified1.simplify();
        return simplified1.equals(simplified2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: toString и конструктор согласованы для упрощенных дробей
   * Для любой упрощенной дроби: можно восстановить значение из строки
   */
  it("Property: toString корректно представляет дробь", () => {
    fc.assert(
      fc.property(arbitraryFraction, (a) => {
        const simplified = a.simplify();
        const str = simplified.toString();

        // Парсим строку обратно
        if (str.includes("/")) {
          const [num, den] = str.split("/").map(Number);
          const reconstructed = new Fraction(num, den);
          return reconstructed.equals(simplified);
        } else {
          // Целое число
          const num = Number(str);
          const reconstructed = new Fraction(num, 1);
          return reconstructed.equals(simplified);
        }
      }),
      { numRuns: 100 }
    );
  });
});
