# 🧪 Руководство по тестированию

## Обзор

Проект использует **двойной подход** к тестированию:

1. **Unit-тесты** — проверка конкретных примеров и граничных случаев
2. **Property-Based тесты** — проверка универсальных свойств на множестве входных данных

Это обеспечивает высокую уверенность в корректности расчетов, что критически важно для религиозного приложения.

---

## Технологический стек

| Инструмент     | Назначение                         |
| -------------- | ---------------------------------- |
| **Vitest**     | Test runner (совместим с Jest API) |
| **fast-check** | Property-based testing             |
| **jsdom**      | DOM-эмуляция для UI-тестов         |

---

## Структура тестов

```
tests/
├── unit/                              # Unit-тесты
│   └── inheritance-calculation.test.js
├── property/                          # Property-based тесты
│   ├── fraction.test.js              # Свойства класса Fraction
│   ├── blocking.test.js              # Свойства системы блокировки
│   ├── shares.test.js                # Свойства расчета долей
│   └── special-cases.test.js         # Свойства особых случаев
├── integration/                       # Интеграционные тесты
│   └── inheritance-calculation.test.js
└── comprehensive/                     # Комплексные сценарии
    └── inheritance-scenarios.test.js
```

---

## Запуск тестов

```bash
# Все тесты (однократно)
npm test

# Тесты в watch-режиме
npm run test:watch

# Только property-тесты
npm test -- tests/property/

# Только unit-тесты
npm test -- tests/unit/

# Конкретный файл
npm test -- tests/property/fraction.test.js

# С покрытием
npm test -- --coverage
```

---

## Property-Based Testing

### Что это?

Property-based testing (PBT) — это подход, при котором вместо конкретных примеров мы описываем **свойства**, которые должны выполняться для **любых** входных данных.

### Почему это важно для калькулятора наследства?

1. **Комбинаторный взрыв** — количество комбинаций наследников огромно
2. **Граничные случаи** — сложно предусмотреть все вручную
3. **Формальная корректность** — свойства соответствуют правилам шариата

### Пример

```javascript
// Unit-тест: проверяет ОДИН конкретный случай
test("Муж получает 1/2 без детей", () => {
  const heirs = { husband: true, sons: 0, daughters: 0 };
  const share = calculateHusbandShare(heirs);
  expect(share.equals(new Fraction(1, 2))).toBe(true);
});

// Property-тест: проверяет ЛЮБУЮ комбинацию
test("Муж получает 1/2 без детей или 1/4 с детьми", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      if (!heirs.husband) return true; // Пропускаем если нет мужа

      const share = calculateHusbandShare(heirs);
      const hasChildren = heirs.sons > 0 || heirs.daughters > 0;

      if (hasChildren) {
        return share.equals(new Fraction(1, 4));
      } else {
        return share.equals(new Fraction(1, 2));
      }
    }),
    { numRuns: 100 }
  );
});
```

---

## Генераторы тестовых данных

### Генератор состояния наследников

```javascript
const arbitraryHeirsState = fc
  .record({
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
  })
  .filter((state) => {
    // Исключаем невалидные комбинации
    return !(state.husband && state.wife); // Муж И жена одновременно
  });
```

### Генератор дробей

```javascript
// Валидные дроби (знаменатель ≠ 0)
const arbitraryFraction = fc
  .tuple(
    fc.integer({ min: -1000, max: 1000 }),
    fc.integer({ min: 1, max: 1000 })
  )
  .map(([num, den]) => new Fraction(num, den));

// Ненулевые дроби (для деления)
const arbitraryNonZeroFraction = fc
  .tuple(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }))
  .chain(([absNum, den]) =>
    fc
      .boolean()
      .map((isNegative) => new Fraction(isNegative ? -absNum : absNum, den))
  );
```

---

## Свойства корректности

### Property 1: Инвариант полного распределения

```javascript
/**
 * Для любой комбинации наследников:
 * Сумма всех распределенных долей = 100%
 * (с учетом Авль или Радд)
 */
test("Property 1: Сумма долей всегда равна 100%", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      const result = calculateInheritance(heirs);
      const total = result.heirs
        .filter((h) => !h.blocked)
        .reduce((sum, h) => sum + h.percentage, 0);
      return Math.abs(total - 100) < 0.01;
    }),
    { numRuns: 100 }
  );
});
```

### Property 2: Корректность блокировки

```javascript
/**
 * Для любой комбинации наследников:
 * Если присутствует блокирующий наследник,
 * заблокированный получает долю 0
 */
test("Property 2: Отец блокирует деда", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      const blocking = checkBlocking("paternalGrandfather", heirs);

      if (heirs.father === true) {
        return (
          blocking.blocked === true && blocking.reason === "Блокируется отцом"
        );
      } else {
        return blocking.blocked === false;
      }
    }),
    { numRuns: 100 }
  );
});
```

### Property 3: Корректность фиксированных долей

```javascript
/**
 * Для любой комбинации наследников:
 * Доли соответствуют правилам Корана
 */
test("Property 3: Доля мужа корректна", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      if (!heirs.husband) return true;

      const share = calculateHusbandShare(heirs);
      const hasChildren =
        heirs.sons > 0 ||
        heirs.daughters > 0 ||
        heirs.grandsonsFromSon > 0 ||
        heirs.granddaughtersFromSon > 0;

      const expected = hasChildren ? new Fraction(1, 4) : new Fraction(1, 2);
      return share.equals(expected);
    }),
    { numRuns: 100 }
  );
});
```

### Property 4: Соотношение асаба 2:1

```javascript
/**
 * Для любой комбинации с сыном и дочерью:
 * Доля сына = 2 × доля дочери
 */
test("Property 4: Соотношение 2:1 для сына и дочери", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 10 }),
      fc.integer({ min: 1, max: 10 }),
      (sons, daughters) => {
        const heirs = { sons, daughters };
        const result = calculateAsaba(heirs);

        if (!result.hasAsaba) return true;

        const sonShare = result.distribution.perMaleShare;
        const daughterShare = result.distribution.perFemaleShare;

        // Соотношение 2:1
        return sonShare.divide(daughterShare).equals(new Fraction(2, 1));
      }
    ),
    { numRuns: 100 }
  );
});
```

### Property 5: Корректность аль-Авль

```javascript
/**
 * Для любой комбинации, где сумма долей > 100%:
 * После Авль сумма = 100%
 */
test("Property 5: Авль приводит сумму к 100%", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      const awlResult = applyAwl(heirs);

      if (awlResult.applied) {
        // После Авль сумма должна быть ровно 1
        return awlResult.adjustedTotal.equals(new Fraction(1, 1));
      }
      return true;
    }),
    { numRuns: 100 }
  );
});
```

---

## Написание новых тестов

### Шаблон property-теста

```javascript
/**
 * Property N: [Название свойства]
 * [Описание свойства]
 * Validates: Requirements X.Y
 */
test("Property N: [Название]", () => {
  fc.assert(
    fc.property(
      arbitraryHeirsState, // Генератор входных данных
      (heirs) => {
        // Предусловие (опционально)
        if (!someCondition(heirs)) return true;

        // Действие
        const result = someFunction(heirs);

        // Проверка свойства
        return someProperty(result);
      }
    ),
    { numRuns: 100 } // Минимум 100 итераций
  );
});
```

### Шаблон unit-теста

```javascript
describe("[Компонент]", () => {
  describe("[Сценарий]", () => {
    test("[Конкретный случай]", () => {
      // Arrange
      const input = {
        /* ... */
      };

      // Act
      const result = someFunction(input);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

---

## Отладка тестов

### Shrinking в fast-check

Когда property-тест падает, fast-check автоматически **уменьшает** (shrink) контрпример до минимального:

```
Error: Property failed after 42 tests
Shrunk 5 time(s)
Counterexample: { husband: true, wife: false, sons: 1, daughters: 0, ... }
```

### Воспроизведение контрпримера

```javascript
// Добавьте seed для воспроизведения
fc.assert(
  fc.property(arbitraryHeirsState, (heirs) => {
    // ...
  }),
  {
    numRuns: 100,
    seed: 1234567890, // Фиксированный seed
  }
);
```

### Логирование в тестах

```javascript
test("Debug test", () => {
  fc.assert(
    fc.property(arbitraryHeirsState, (heirs) => {
      console.log("Testing with:", JSON.stringify(heirs, null, 2));

      const result = someFunction(heirs);
      console.log("Result:", result);

      return someProperty(result);
    }),
    { numRuns: 10 } // Меньше итераций для отладки
  );
});
```

---

## Покрытие кода

```bash
# Запуск с покрытием
npm test -- --coverage

# Отчет в HTML
npm test -- --coverage --reporter=html
```

### Целевые метрики

| Метрика    | Цель  |
| ---------- | ----- |
| Statements | > 80% |
| Branches   | > 75% |
| Functions  | > 85% |
| Lines      | > 80% |

---

## CI/CD интеграция

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test
```

---

## Лучшие практики

### ✅ Делайте

1. **Пишите property-тесты для универсальных правил**
2. **Используйте unit-тесты для граничных случаев**
3. **Документируйте свойства ссылками на требования**
4. **Запускайте минимум 100 итераций**
5. **Используйте shrinking для отладки**

### ❌ Избегайте

1. **Не полагайтесь только на unit-тесты**
2. **Не игнорируйте контрпримеры**
3. **Не используйте слишком сложные генераторы**
4. **Не забывайте про предусловия**
5. **Не пропускайте тесты без причины**
