/**
 * Класс для работы с дробями
 * Обеспечивает точные вычисления без потери точности при работе с долями наследства
 */
export class Fraction {
  /**
   * Создает новую дробь
   * @param {number} numerator - числитель
   * @param {number} denominator - знаменатель (не может быть 0)
   */
  constructor(numerator, denominator = 1) {
    if (denominator === 0) {
      throw new Error("Знаменатель не может быть равен нулю");
    }

    // Нормализуем знак: знак всегда в числителе
    if (denominator < 0) {
      numerator = -numerator;
      denominator = -denominator;
    }

    this.num = numerator;
    this.den = denominator;
  }

  /**
   * Вычисляет наибольший общий делитель (НОД) двух чисел
   * Используется алгоритм Евклида
   * @param {number} a - первое число
   * @param {number} b - второе число
   * @returns {number} - НОД
   */
  static gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  /**
   * Вычисляет наименьшее общее кратное (НОК) двух чисел
   * @param {number} a - первое число
   * @param {number} b - второе число
   * @returns {number} - НОК
   */
  static lcm(a, b) {
    return Math.abs(a * b) / Fraction.gcd(a, b);
  }

  /**
   * Упрощает дробь, деля числитель и знаменатель на их НОД
   * @returns {Fraction} - новая упрощенная дробь
   */
  simplify() {
    if (this.num === 0) {
      return new Fraction(0, 1);
    }
    const gcd = Fraction.gcd(this.num, this.den);
    return new Fraction(this.num / gcd, this.den / gcd);
  }

  /**
   * Складывает две дроби
   * @param {Fraction} other - другая дробь
   * @returns {Fraction} - результат сложения (упрощенный)
   */
  add(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    // a/b + c/d = (a*d + c*b) / (b*d)
    const newNum = this.num * other.den + other.num * this.den;
    const newDen = this.den * other.den;
    return new Fraction(newNum, newDen).simplify();
  }

  /**
   * Вычитает дробь из текущей
   * @param {Fraction} other - вычитаемая дробь
   * @returns {Fraction} - результат вычитания (упрощенный)
   */
  subtract(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    // a/b - c/d = (a*d - c*b) / (b*d)
    const newNum = this.num * other.den - other.num * this.den;
    const newDen = this.den * other.den;
    return new Fraction(newNum, newDen).simplify();
  }

  /**
   * Умножает две дроби
   * @param {Fraction} other - другая дробь
   * @returns {Fraction} - результат умножения (упрощенный)
   */
  multiply(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    // a/b * c/d = (a*c) / (b*d)
    return new Fraction(this.num * other.num, this.den * other.den).simplify();
  }

  /**
   * Делит текущую дробь на другую
   * @param {Fraction} other - делитель
   * @returns {Fraction} - результат деления (упрощенный)
   */
  divide(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    if (other.num === 0) {
      throw new Error("Деление на ноль");
    }
    // a/b ÷ c/d = (a*d) / (b*c)
    return new Fraction(this.num * other.den, this.den * other.num).simplify();
  }

  /**
   * Преобразует дробь в десятичное число
   * @returns {number} - десятичное представление
   */
  toDecimal() {
    return this.num / this.den;
  }

  /**
   * Преобразует дробь в строку вида "числитель/знаменатель"
   * @returns {string} - строковое представление
   */
  toString() {
    if (this.den === 1) {
      return String(this.num);
    }
    return `${this.num}/${this.den}`;
  }

  /**
   * Проверяет равенство двух дробей
   * @param {Fraction} other - другая дробь
   * @returns {boolean} - true если дроби равны
   */
  equals(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    // Упрощаем обе дроби и сравниваем
    const simplified1 = this.simplify();
    const simplified2 = other.simplify();
    return (
      simplified1.num === simplified2.num && simplified1.den === simplified2.den
    );
  }

  /**
   * Проверяет, больше ли текущая дробь другой
   * @param {Fraction} other - другая дробь
   * @returns {boolean}
   */
  greaterThan(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    return this.num * other.den > other.num * this.den;
  }

  /**
   * Проверяет, меньше ли текущая дробь другой
   * @param {Fraction} other - другая дробь
   * @returns {boolean}
   */
  lessThan(other) {
    if (!(other instanceof Fraction)) {
      other = new Fraction(other);
    }
    return this.num * other.den < other.num * this.den;
  }

  /**
   * Проверяет, является ли дробь нулем
   * @returns {boolean}
   */
  isZero() {
    return this.num === 0;
  }

  /**
   * Создает копию дроби
   * @returns {Fraction}
   */
  clone() {
    return new Fraction(this.num, this.den);
  }

  /**
   * Создает дробь из десятичного числа (приближенно)
   * @param {number} decimal - десятичное число
   * @param {number} precision - точность (максимальный знаменатель)
   * @returns {Fraction}
   */
  static fromDecimal(decimal, precision = 1000000) {
    if (decimal === 0) return new Fraction(0, 1);

    const sign = decimal < 0 ? -1 : 1;
    decimal = Math.abs(decimal);

    // Используем алгоритм цепных дробей для лучшего приближения
    let bestNum = 1;
    let bestDen = 1;
    let bestError = Math.abs(decimal - bestNum / bestDen);

    for (let den = 1; den <= precision; den++) {
      const num = Math.round(decimal * den);
      const error = Math.abs(decimal - num / den);
      if (error < bestError) {
        bestError = error;
        bestNum = num;
        bestDen = den;
        if (error === 0) break;
      }
    }

    return new Fraction(sign * bestNum, bestDen).simplify();
  }
}
