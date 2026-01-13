# 📖 API Reference

## Модуль `fraction.js`

### Класс `Fraction`

Класс для точных вычислений с дробями.

#### Конструктор

```javascript
new Fraction(numerator, (denominator = 1));
```

| Параметр      | Тип      | Описание                     |
| ------------- | -------- | ---------------------------- |
| `numerator`   | `number` | Числитель                    |
| `denominator` | `number` | Знаменатель (по умолчанию 1) |

**Исключения:**

- `Error` — если знаменатель равен 0

**Пример:**

```javascript
const half = new Fraction(1, 2);
const three = new Fraction(3);
```

#### Свойства

| Свойство | Тип      | Описание    |
| -------- | -------- | ----------- |
| `num`    | `number` | Числитель   |
| `den`    | `number` | Знаменатель |

#### Методы экземпляра

##### `simplify()`

Упрощает дробь, деля числитель и знаменатель на их НОД.

```javascript
simplify(): Fraction
```

**Возвращает:** Новая упрощенная дробь

**Пример:**

```javascript
new Fraction(4, 8).simplify(); // Fraction(1, 2)
```

##### `add(other)`

Складывает две дроби.

```javascript
add(other: Fraction | number): Fraction
```

**Пример:**

```javascript
new Fraction(1, 4).add(new Fraction(1, 4)); // Fraction(1, 2)
```

##### `subtract(other)`

Вычитает дробь из текущей.

```javascript
subtract(other: Fraction | number): Fraction
```

##### `multiply(other)`

Умножает две дроби.

```javascript
multiply(other: Fraction | number): Fraction
```

##### `divide(other)`

Делит текущую дробь на другую.

```javascript
divide(other: Fraction | number): Fraction
```

**Исключения:**

- `Error` — при делении на ноль

##### `toDecimal()`

Преобразует дробь в десятичное число.

```javascript
toDecimal(): number
```

**Пример:**

```javascript
new Fraction(1, 4).toDecimal(); // 0.25
```

##### `toString()`

Преобразует дробь в строку.

```javascript
toString(): string
```

**Пример:**

```javascript
new Fraction(1, 4).toString(); // "1/4"
new Fraction(3, 1).toString(); // "3"
```

##### `equals(other)`

Проверяет равенство двух дробей.

```javascript
equals(other: Fraction | number): boolean
```

##### `greaterThan(other)`

Проверяет, больше ли текущая дробь другой.

```javascript
greaterThan(other: Fraction | number): boolean
```

##### `lessThan(other)`

Проверяет, меньше ли текущая дробь другой.

```javascript
lessThan(other: Fraction | number): boolean
```

##### `isZero()`

Проверяет, является ли дробь нулем.

```javascript
isZero(): boolean
```

##### `clone()`

Создает копию дроби.

```javascript
clone(): Fraction
```

#### Статические методы

##### `Fraction.gcd(a, b)`

Вычисляет наибольший общий делитель (НОД).

```javascript
static gcd(a: number, b: number): number
```

##### `Fraction.lcm(a, b)`

Вычисляет наименьшее общее кратное (НОК).

```javascript
static lcm(a: number, b: number): number
```

##### `Fraction.fromDecimal(decimal, precision)`

Создает дробь из десятичного числа.

```javascript
static fromDecimal(decimal: number, precision: number = 1000000): Fraction
```

---

## Модуль `shares.js`

### Константы

#### `HeirTypes`

Объект с типами наследников и правилами расчета.

```javascript
HeirTypes = {
  HUSBAND: { id, nameRu, nameAr, category, gender, isAsaba, getShare, dalil },
  WIFE: { ... },
  SON: { ... },
  DAUGHTER: { ... },
  // ...
}
```

#### `AsabaPriority`

Массив с порядком приоритета асаба.

```javascript
AsabaPriority = [
  { key: "sons", type: HeirTypes.SON, countField: "sons" },
  { key: "grandsonsFromSon", ... },
  { key: "father", ... },
  // ...
]
```

### Функции

#### `getHeirTypeById(id)`

Получает тип наследника по идентификатору.

```javascript
getHeirTypeById(id: string): HeirType | null
```

#### `getHeirShare(heirTypeKey, heirs)`

Получает долю наследника.

```javascript
getHeirShare(heirTypeKey: string, heirs: object): Fraction | null
```

#### `isAsaba(heirTypeKey)`

Проверяет, является ли наследник асаба.

```javascript
isAsaba(heirTypeKey: string): boolean
```

#### `getDalil(heirTypeKey)`

Получает далиль (обоснование) для наследника.

```javascript
getDalil(heirTypeKey: string): string
```

### Функции расчета долей супругов

#### `calculateHusbandShare(heirs)`

Рассчитывает долю мужа.

```javascript
calculateHusbandShare(heirs: object): Fraction
```

**Возвращает:**

- `Fraction(1, 2)` — без детей
- `Fraction(1, 4)` — с детьми

#### `calculateWifeShare(heirs)`

Рассчитывает долю жены/жен.

```javascript
calculateWifeShare(heirs: object): {
  totalShare: Fraction,
  perWifeShare: Fraction,
  wifeCount: number
}
```

#### `calculateSpouseShare(heirs)`

Рассчитывает долю супруга (муж или жена).

```javascript
calculateSpouseShare(heirs: object): {
  type: string,
  heirType: HeirType,
  share: Fraction,
  count: number,
  perPersonShare: Fraction
} | null
```

### Функции расчета долей родителей

#### `calculateMotherShare(heirs)`

Рассчитывает долю матери.

```javascript
calculateMotherShare(heirs: object): Fraction
```

**Возвращает:**

- `Fraction(1, 3)` — без детей и <2 братьев
- `Fraction(1, 6)` — с детьми или ≥2 братьев

#### `calculateFatherShare(heirs)`

Рассчитывает долю отца.

```javascript
calculateFatherShare(heirs: object): {
  fixedShare: Fraction | null,
  isAsaba: boolean,
  asabaWithFixed: boolean
}
```

#### `calculateGrandfatherShare(heirs)`

Рассчитывает долю деда.

```javascript
calculateGrandfatherShare(heirs: object): {
  fixedShare: Fraction | null,
  isAsaba: boolean,
  asabaWithFixed: boolean
}
```

#### `calculateGrandmotherShare(heirs)`

Рассчитывает долю бабушки/бабушек.

```javascript
calculateGrandmotherShare(heirs: object): {
  totalShare: Fraction,
  perGrandmotherShare: Fraction,
  grandmotherCount: number,
  paternalGrandmother: boolean,
  maternalGrandmother: boolean
} | null
```

#### `calculateAscendantShares(heirs)`

Рассчитывает доли всех предков.

```javascript
calculateAscendantShares(heirs: object): {
  mother: object | null,
  father: object | null,
  grandfather: object | null,
  grandmothers: object | null
}
```

### Функции расчета долей потомков

#### `calculateDaughterShare(heirs)`

Рассчитывает долю дочери/дочерей.

```javascript
calculateDaughterShare(heirs: object): {
  heirType: HeirType,
  share: Fraction | null,
  count: number,
  isAsaba: boolean,
  perPersonShare: Fraction | null
} | null
```

#### `calculateGranddaughterShare(heirs)`

Рассчитывает долю внучки/внучек от сына.

```javascript
calculateGranddaughterShare(heirs: object): {
  heirType: HeirType,
  share: Fraction | null,
  count: number,
  isAsaba: boolean,
  perPersonShare: Fraction | null,
  blocked?: boolean,
  blockedReason?: string
} | null
```

#### `calculateDescendantShares(heirs)`

Рассчитывает доли всех потомков.

```javascript
calculateDescendantShares(heirs: object): {
  sons: object | null,
  daughters: object | null,
  grandsonsFromSon: object | null,
  granddaughtersFromSon: object | null
}
```

### Функции расчета асаба

#### `determineAsaba(heirs)`

Определяет, кто является асаба.

```javascript
determineAsaba(heirs: object): {
  maleType: HeirType,
  maleCount: number,
  femaleType: HeirType | null,
  femaleCount: number,
  hasFemales: boolean,
  key: string
} | null
```

#### `distributeAsaba(remainder, asabaInfo)`

Распределяет остаток между асаба.

```javascript
distributeAsaba(remainder: Fraction, asabaInfo: object): {
  maleShare: Fraction,
  femaleShare: Fraction,
  perMaleShare: Fraction,
  perFemaleShare: Fraction,
  totalShares: number
}
```

#### `calculateFixedSharesTotal(heirs)`

Рассчитывает сумму фиксированных долей.

```javascript
calculateFixedSharesTotal(heirs: object): Fraction
```

#### `calculateRemainder(heirs)`

Рассчитывает остаток после фиксированных долей.

```javascript
calculateRemainder(heirs: object): Fraction
```

#### `calculateAsaba(heirs)`

Полный расчет асаба.

```javascript
calculateAsaba(heirs: object): {
  hasAsaba: boolean,
  asabaInfo: object | null,
  remainder: Fraction,
  distribution: object | null
}
```

### Вспомогательные функции

#### `hasChildren(heirs)`

Проверяет наличие детей или внуков.

```javascript
hasChildren(heirs: object): boolean
```

#### `hasMaleDescendants(heirs)`

Проверяет наличие мужских потомков.

```javascript
hasMaleDescendants(heirs: object): boolean
```

#### `hasMultipleSiblings(heirs)`

Проверяет наличие множества братьев/сестер (≥2).

```javascript
hasMultipleSiblings(heirs: object): boolean
```

---

## Модуль `blocking.js`

### Константы

#### `BlockingRules`

Объект с правилами блокировки.

```javascript
BlockingRules = {
  paternalGrandfather: (heirs) => boolean,
  paternalGrandmother: (heirs) => boolean,
  grandsonsFromSon: (heirs) => boolean,
  granddaughtersFromSon: (heirs) => boolean,
  fullBrothers: (heirs) => boolean,
  fullSisters: (heirs) => boolean,
  paternalBrothers: (heirs) => boolean,
  paternalSisters: (heirs) => boolean,
};
```

#### `BlockableHeirTypes`

Список типов наследников, которые могут быть заблокированы.

```javascript
BlockableHeirTypes: string[]
```

### Функции

#### `checkBlocking(heirType, heirs)`

Проверяет, заблокирован ли наследник.

```javascript
checkBlocking(heirType: string, heirs: object): {
  blocked: boolean,
  reason: string | null
}
```

#### `getBlockingReason(heirType, heirs)`

Получает причину блокировки.

```javascript
getBlockingReason(heirType: string, heirs: object): string | null
```

#### `getAllBlockings(heirs)`

Получает все блокировки для текущего состояния.

```javascript
getAllBlockings(heirs: object): {
  [heirType: string]: {
    blocked: boolean,
    reason: string | null
  }
}
```

---

## Модуль `special-cases.js`

### Функции аль-Авль

#### `needsAwl(heirs)`

Проверяет, нужно ли применять Авль.

```javascript
needsAwl(heirs: object): boolean
```

#### `calculateAwlRatio(heirs)`

Рассчитывает коэффициент Авль.

```javascript
calculateAwlRatio(heirs: object): Fraction
```

#### `applyAwlToShare(share, awlRatio)`

Применяет Авль к доле.

```javascript
applyAwlToShare(share: Fraction, awlRatio: Fraction): Fraction
```

#### `applyAwl(heirs)`

Полный расчет с применением Авль.

```javascript
applyAwl(heirs: object): {
  applied: boolean,
  originalTotal: Fraction,
  adjustedTotal: Fraction,
  awlRatio: Fraction,
  notification: object | null
}
```

### Функции ар-Радд

#### `needsRadd(heirs)`

Проверяет, нужно ли применять Радд.

```javascript
needsRadd(heirs: object): boolean
```

#### `getRaddRecipients(heirs)`

Получает список участников Радд.

```javascript
getRaddRecipients(heirs: object): string[]
```

#### `calculateRaddRecipientsTotal(heirs, recipients)`

Рассчитывает сумму базовых долей участников Радд.

```javascript
calculateRaddRecipientsTotal(heirs: object, recipients: string[]): Fraction
```

#### `applyRadd(heirs)`

Полный расчет с применением Радд.

```javascript
applyRadd(heirs: object): {
  applied: boolean,
  remainder: Fraction,
  recipients: string[],
  raddShares: { [recipient: string]: Fraction },
  notification: object | null
}
```

### Функции аль-Умарийятайн

#### `checkUmariyyatan(heirs)`

Проверяет, применяется ли Умарийятайн.

```javascript
checkUmariyyatan(heirs: object): {
  applies: boolean,
  caseNumber: number,
  description: string
} | null
```

#### `calculateUmariyyatanShares(heirs)`

Рассчитывает доли при Умарийятайн.

```javascript
calculateUmariyyatanShares(heirs: object): {
  spouseType: string,
  spouseShare: Fraction,
  motherShare: Fraction,
  fatherShare: Fraction,
  normalMotherShare: Fraction
} | null
```

#### `applyUmariyyatan(heirs)`

Полный расчет с применением Умарийятайн.

```javascript
applyUmariyyatan(heirs: object): {
  applied: boolean,
  caseNumber: number | null,
  shares: object | null,
  notification: object | null
}
```

### Общая функция

#### `applySpecialCases(heirs)`

Применяет все необходимые особые случаи.

```javascript
applySpecialCases(heirs: object): {
  umariyyatan: object,
  awl: object | null,
  radd: object | null,
  notifications: object[]
}
```

---

## Типы данных

### `HeirsState`

Состояние наследников.

```typescript
interface HeirsState {
  // Супруги
  husband: boolean;
  wife: boolean;
  wifeCount: number; // 1-4

  // Потомки
  sons: number;
  daughters: number;
  grandsonsFromSon: number;
  granddaughtersFromSon: number;

  // Предки
  father: boolean;
  mother: boolean;
  paternalGrandfather: boolean;
  paternalGrandmother: boolean;
  maternalGrandmother: boolean;

  // Братья и сестры
  fullBrothers: number;
  fullSisters: number;
  paternalBrothers: number;
  paternalSisters: number;
  maternalBrothers: number;
  maternalSisters: number;
}
```

### `HeirType`

Тип наследника.

```typescript
interface HeirType {
  id: string;
  nameRu: string;
  nameAr: string;
  category: "spouse" | "descendant" | "ascendant" | "sibling";
  gender: "male" | "female";
  isAsaba: boolean;
  getShare: (heirs: HeirsState) => Fraction | null;
  dalil: string;
}
```

### `Notification`

Уведомление об особом случае.

```typescript
interface Notification {
  type: "warning" | "info";
  icon: string;
  title: string;
  message: string;
}
```
