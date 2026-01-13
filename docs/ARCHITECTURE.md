# 🏗 Архитектура проекта

## Обзор

Исламский Калькулятор Наследства построен на принципах **модульности**, **тестируемости** и **простоты деплоя**. Архитектура разделена на три слоя: модель данных, бизнес-логика и представление.

---

## Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           index.html                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                         <style>                                      ││
│  │  • CSS Variables (цветовая схема, типографика)                      ││
│  │  • Base styles (reset, typography)                                   ││
│  │  • Component styles (cards, buttons, inputs)                         ││
│  │  • Responsive breakpoints (320px, 768px, 1024px)                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                         <body>                                       ││
│  │  • Header (логотип, навигация)                                      ││
│  │  • Modal: Предварительные обязательства (Шаг 0)                     ││
│  │  • Main: Wizard калькулятора (Шаги 1-2)                             ││
│  │  • Section: Результаты                                               ││
│  │  • Section: Глоссарий + FAQ                                         ││
│  │  • Footer (дисклеймер)                                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        <script>                                      ││
│  │  • State Management (AppState)                                       ││
│  │  • UI Controller (WizardController)                                  ││
│  │  • Event Handlers                                                    ││
│  │  • Integration with src/ modules                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            src/                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   fraction.js   │  │    shares.js    │  │   blocking.js   │         │
│  │                 │  │                 │  │                 │         │
│  │  • Fraction     │  │  • HeirTypes    │  │  • BlockingRules│         │
│  │  • gcd/lcm      │  │  • getShare()   │  │  • checkBlocking│         │
│  │  • add/sub/mul  │  │  • AsabaPriority│  │  • getBlockingReason      │
│  │  • simplify()   │  │  • distributeAsaba                   │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                    │                   │
│           └────────────────────┼────────────────────┘                   │
│                                ▼                                        │
│                    ┌─────────────────────┐                              │
│                    │  special-cases.js   │                              │
│                    │                     │                              │
│                    │  • applyAwl()       │                              │
│                    │  • applyRadd()      │                              │
│                    │  • applyUmariyyatan()                              │
│                    │  • applySpecialCases()                             │
│                    └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Модули

### 1. `fraction.js` — Математический фундамент

**Назначение:** Точные вычисления с дробями без потери точности.

```javascript
class Fraction {
  constructor(numerator, denominator = 1)

  // Арифметика
  add(other)      // Сложение
  subtract(other) // Вычитание
  multiply(other) // Умножение
  divide(other)   // Деление

  // Утилиты
  simplify()      // Упрощение (НОД)
  toDecimal()     // Преобразование в число
  toString()      // "1/4"
  equals(other)   // Сравнение

  // Статические методы
  static gcd(a, b)           // Наибольший общий делитель
  static lcm(a, b)           // Наименьшее общее кратное
  static fromDecimal(d, p)   // Из десятичного числа
}
```

**Почему собственный класс?**

- JavaScript `Number` использует IEEE 754 (float64)
- `1/3 + 1/3 + 1/3 !== 1` в float
- Исламское право требует точных дробей

### 2. `shares.js` — Расчет долей

**Назначение:** Определение фиксированных долей наследников согласно Корану.

```javascript
// Типы наследников с правилами расчета
const HeirTypes = {
  HUSBAND: {
    id: "husband",
    nameRu: "Муж",
    nameAr: "الزوج",
    category: "spouse",
    gender: "male",
    isAsaba: false,
    getShare: (heirs) =>
      hasChildren(heirs) ? new Fraction(1, 4) : new Fraction(1, 2),
    dalil: 'Коран, сура "ан-Ниса", 4:12',
  },
  // ... другие типы
};

// Функции расчета
calculateHusbandShare(heirs); // Доля мужа
calculateWifeShare(heirs); // Доля жены/жен
calculateMotherShare(heirs); // Доля матери
calculateFatherShare(heirs); // Доля отца
calculateDaughterShare(heirs); // Доля дочерей
calculateGranddaughterShare(heirs); // Доля внучек

// Асаба
determineAsaba(heirs); // Кто является асаба
distributeAsaba(remainder, info); // Распределение остатка
calculateFixedSharesTotal(heirs); // Сумма фиксированных долей
calculateRemainder(heirs); // Остаток для асаба
```

### 3. `blocking.js` — Система блокировки (хиджб)

**Назначение:** Определение, какие наследники блокируют других.

```javascript
// Правила блокировки
const BlockingRules = {
  paternalGrandfather: (heirs) => heirs.father === true,
  paternalGrandmother: (heirs) => heirs.mother === true,
  grandsonsFromSon: (heirs) => heirs.sons > 0,
  granddaughtersFromSon: (heirs) => heirs.sons > 0,
  fullBrothers: (heirs) => heirs.father || heirs.sons > 0 || heirs.grandsonsFromSon > 0,
  fullSisters: (heirs) => heirs.father || heirs.sons > 0 || heirs.grandsonsFromSon > 0,
  paternalBrothers: (heirs) => /* ... */ || heirs.fullBrothers > 0,
  paternalSisters: (heirs) => /* ... */ || heirs.fullBrothers > 0,
}

// API
checkBlocking(heirType, heirs)    // { blocked: boolean, reason: string }
getBlockingReason(heirType, heirs) // Причина блокировки
getAllBlockings(heirs)            // Все блокировки
```

### 4. `special-cases.js` — Особые случаи

**Назначение:** Обработка исключительных ситуаций в исламском наследственном праве.

```javascript
// аль-Авль (пропорциональное уменьшение)
needsAwl(heirs); // Нужен ли Авль?
calculateAwlRatio(heirs); // Коэффициент уменьшения
applyAwlToShare(share, ratio); // Применить к доле
applyAwl(heirs); // Полный расчет

// ар-Радд (распределение остатка)
needsRadd(heirs); // Нужен ли Радд?
getRaddRecipients(heirs); // Кто участвует в Радд
calculateRaddRecipientsTotal(heirs, recipients);
applyRadd(heirs); // Полный расчет

// аль-Умарийятайн (особые случаи)
checkUmariyyatan(heirs); // Применяется ли?
calculateUmariyyatanShares(heirs); // Расчет долей
applyUmariyyatan(heirs); // Полный расчет

// Общая функция
applySpecialCases(heirs); // Применить все правила
```

---

## Поток данных

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   Form      │────▶│   State     │────▶│  Calculate  │
│   Input     │     │   Validation│     │   Update    │     │   Engine    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                    ┌─────────────┐     ┌─────────────┐            │
                    │   Render    │◀────│   Apply     │◀───────────┘
                    │   Results   │     │   Special   │
                    └─────────────┘     │   Cases     │
                                        └─────────────┘
```

### Детальный поток

1. **User Input** → Пользователь выбирает наследников
2. **Form Validation** → Проверка корректности ввода
3. **State Update** → Обновление `AppState.heirs`
4. **Calculate Engine**:
   - `calculateFixedSharesTotal()` — сумма фиксированных долей
   - `determineAsaba()` — определение асаба
   - `distributeAsaba()` — распределение остатка
5. **Apply Special Cases**:
   - `checkUmariyyatan()` — проверка особых случаев
   - `applyAwl()` — если сумма > 100%
   - `applyRadd()` — если остаток и нет асаба
6. **Render Results** → Отображение таблицы с далилями

---

## Состояние приложения

```javascript
const AppState = {
  // Флаг прохождения предварительного этапа
  obligationsAccepted: false,

  // Сумма наследства
  totalEstate: 0,

  // Выбранные наследники
  heirs: {
    // Супруги
    husband: false,
    wife: false,
    wifeCount: 1,

    // Потомки
    sons: 0,
    daughters: 0,
    grandsonsFromSon: 0,
    granddaughtersFromSon: 0,

    // Предки
    father: false,
    mother: false,
    paternalGrandfather: false,
    paternalGrandmother: false,
    maternalGrandmother: false,

    // Братья и сестры
    fullBrothers: 0,
    fullSisters: 0,
    paternalBrothers: 0,
    paternalSisters: 0,
    maternalBrothers: 0,
    maternalSisters: 0,
  },

  // Результаты расчета
  results: null,

  // Примененные особые правила
  appliedRules: {
    awl: false,
    radd: false,
    umariyyatan: false,
  },
};
```

---

## Алгоритм расчета

### Основной алгоритм

```
1. ВХОД: heirs (состояние наследников), totalEstate (сумма)

2. ПРОВЕРКА УМАРИЙЯТАЙН:
   IF (супруг + оба родителя + нет детей/братьев):
     ПРИМЕНИТЬ особый расчет
     RETURN результат

3. РАСЧЕТ ФИКСИРОВАННЫХ ДОЛЕЙ:
   FOR EACH наследник IN heirs:
     IF NOT заблокирован:
       доля = getShare(heirs)
       ADD доля TO fixedShares

4. ПРОВЕРКА АВЛЬ:
   IF SUM(fixedShares) > 1:
     ratio = 1 / SUM(fixedShares)
     FOR EACH доля IN fixedShares:
       доля = доля × ratio
     RETURN результат с уведомлением

5. РАСЧЕТ АСАБА:
   remainder = 1 - SUM(fixedShares)
   IF remainder > 0:
     asaba = determineAsaba(heirs)
     IF asaba EXISTS:
       distributeAsaba(remainder, asaba)
     ELSE:
       ПРИМЕНИТЬ Радд

6. ВЫХОД: результат с долями и уведомлениями
```

### Алгоритм определения асаба

```
ПРИОРИТЕТ АСАБА (от высшего к низшему):
1. Сын
2. Внук от сына
3. Отец
4. Дед (отец отца)
5. Родной брат
6. Единокровный брат

FOR EACH тип IN приоритет:
  IF тип EXISTS AND NOT заблокирован:
    RETURN тип как асаба
```

### Алгоритм распределения асаба

```
IF только мужчины:
  доля_каждого = остаток / количество

IF мужчины + женщины одного уровня:
  // Соотношение 2:1
  всего_долей = мужчины × 2 + женщины × 1
  единица = остаток / всего_долей
  доля_мужчины = единица × 2
  доля_женщины = единица × 1
```

---

## Тестовая архитектура

```
tests/
├── unit/                           # Конкретные примеры
│   └── inheritance-calculation.test.js
├── property/                       # Универсальные свойства
│   ├── fraction.test.js           # Свойства дробей
│   ├── blocking.test.js           # Свойства блокировки
│   ├── shares.test.js             # Свойства долей
│   └── special-cases.test.js      # Свойства особых случаев
├── integration/                    # Интеграционные тесты
│   └── inheritance-calculation.test.js
└── comprehensive/                  # Комплексные сценарии
    └── inheritance-scenarios.test.js
```

### Property-Based Testing

Используется библиотека **fast-check** для генерации тестовых данных:

```javascript
// Генератор состояния наследников
const arbitraryHeirsState = fc
  .record({
    husband: fc.boolean(),
    wife: fc.boolean(),
    wifeCount: fc.integer({ min: 1, max: 4 }),
    sons: fc.integer({ min: 0, max: 10 }),
    daughters: fc.integer({ min: 0, max: 10 }),
    // ...
  })
  .filter((state) => !(state.husband && state.wife));
```

---

## Расширяемость

### Добавление нового типа наследника

1. Добавить в `HeirTypes` в `shares.js`:

```javascript
NEW_HEIR: {
  id: "newHeir",
  nameRu: "Новый наследник",
  nameAr: "...",
  category: "...",
  gender: "...",
  isAsaba: false,
  getShare: (heirs) => { /* логика */ },
  dalil: "..."
}
```

2. Добавить правило блокировки в `blocking.js` (если нужно)

3. Добавить поле в `AppState.heirs`

4. Добавить UI-элемент в `index.html`

5. Написать тесты

### Добавление нового особого случая

1. Добавить функцию проверки в `special-cases.js`:

```javascript
export function checkNewCase(heirs) {
  // Условия применения
}
```

2. Добавить функцию расчета:

```javascript
export function applyNewCase(heirs) {
  // Логика расчета
}
```

3. Интегрировать в `applySpecialCases()`

4. Написать property-тесты
