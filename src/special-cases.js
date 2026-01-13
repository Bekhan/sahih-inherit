/**
 * Особые случаи исламского наследственного права
 * - аль-Авль (пропорциональное уменьшение при превышении 100%)
 * - ар-Радд (пропорциональное распределение остатка)
 * - аль-Умарийятайн (особые случаи с супругом и родителями)
 *
 * Feature: islamic-inheritance-calculator
 * Validates: Requirements 10.1-10.4, 11.1-11.4, 12.1-12.3
 */

import { Fraction } from "./fraction.js";
import {
  calculateFixedSharesTotal,
  calculateRemainder,
  determineAsaba,
  hasChildren,
  calculateMotherShare,
} from "./shares.js";

// ========================================
// Правило аль-Авль (Requirements 10.1-10.4)
// ========================================

/**
 * Проверяет, нужно ли применять правило аль-Авль
 * Авль применяется когда сумма фиксированных долей превышает 100%
 *
 * Requirements: 10.1
 * @param {object} heirs - состояние наследников
 * @returns {boolean} - true если нужно применить Авль
 */
export function needsAwl(heirs) {
  const fixedTotal = calculateFixedSharesTotal(heirs);
  const one = new Fraction(1, 1);
  return fixedTotal.greaterThan(one);
}

/**
 * Рассчитывает коэффициент Авль для пропорционального уменьшения долей
 * Коэффициент = 1 / сумма_долей (когда сумма > 1)
 *
 * Requirements: 10.2
 * @param {object} heirs - состояние наследников
 * @returns {Fraction} - коэффициент уменьшения
 */
export function calculateAwlRatio(heirs) {
  const fixedTotal = calculateFixedSharesTotal(heirs);
  const one = new Fraction(1, 1);

  if (!fixedTotal.greaterThan(one)) {
    return one; // Нет необходимости в уменьшении
  }

  // Коэффициент = 1 / сумма_долей
  return one.divide(fixedTotal);
}

/**
 * Применяет правило аль-Авль к доле наследника
 * Новая доля = исходная доля × коэффициент Авль
 *
 * Requirements: 10.2
 * @param {Fraction} share - исходная доля
 * @param {Fraction} awlRatio - коэффициент Авль
 * @returns {Fraction} - скорректированная доля
 */
export function applyAwlToShare(share, awlRatio) {
  if (!share || share.isZero()) {
    return new Fraction(0, 1);
  }
  return share.multiply(awlRatio);
}

/**
 * Полный расчет с применением правила аль-Авль
 * Возвращает информацию о применении Авль и скорректированные доли
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * @param {object} heirs - состояние наследников
 * @returns {object} - результат применения Авль
 */
export function applyAwl(heirs) {
  const fixedTotal = calculateFixedSharesTotal(heirs);
  const one = new Fraction(1, 1);
  const awlApplied = fixedTotal.greaterThan(one);

  if (!awlApplied) {
    return {
      applied: false,
      originalTotal: fixedTotal,
      adjustedTotal: fixedTotal,
      awlRatio: one,
      notification: null,
    };
  }

  const awlRatio = calculateAwlRatio(heirs);

  return {
    applied: true,
    originalTotal: fixedTotal,
    adjustedTotal: one, // После Авль сумма всегда = 1
    awlRatio,
    notification: {
      type: "warning",
      icon: "⚠️",
      title: "Применено правило аль-Авль",
      message: `Сумма долей наследников превысила 100% (${fixedTotal.toString()} = ${Math.round(
        fixedTotal.toDecimal() * 100
      )}%). Все доли были пропорционально уменьшены.`,
    },
  };
}

// ========================================
// Правило ар-Радд (Requirements 8.3, 11.1-11.4)
// ========================================

/**
 * Проверяет, нужно ли применять правило ар-Радд
 * Радд применяется когда:
 * 1. Сумма фиксированных долей меньше 100%
 * 2. Нет наследников-асаба
 *
 * Requirements: 11.1
 * @param {object} heirs - состояние наследников
 * @returns {boolean} - true если нужно применить Радд
 */
export function needsRadd(heirs) {
  const remainder = calculateRemainder(heirs);
  const asabaInfo = determineAsaba(heirs);

  // Радд применяется если есть остаток и нет асаба
  return remainder.greaterThan(new Fraction(0, 1)) && !asabaInfo;
}

/**
 * Проверяет, могут ли дочери участвовать в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function canDaughtersParticipateInRadd(heirs) {
  return heirs.daughters > 0 && heirs.sons === 0;
}

/**
 * Проверяет, могут ли внучки от сына участвовать в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function canGranddaughtersParticipateInRadd(heirs) {
  return heirs.granddaughtersFromSon > 0 && heirs.sons === 0;
}

/**
 * Проверяет, могут ли бабушки участвовать в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function canGrandmothersParticipateInRadd(heirs) {
  return (
    (heirs.paternalGrandmother || heirs.maternalGrandmother) && !heirs.mother
  );
}

/**
 * Проверяет, заблокированы ли сестры от участия в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function areSistersBlockedFromRadd(heirs) {
  return heirs.father || heirs.sons > 0 || heirs.grandsonsFromSon > 0;
}

/**
 * Проверяет, могут ли родные сестры участвовать в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function canFullSistersParticipateInRadd(heirs) {
  return (
    heirs.fullSisters > 0 &&
    heirs.fullBrothers === 0 &&
    !areSistersBlockedFromRadd(heirs)
  );
}

/**
 * Проверяет, могут ли единокровные сестры участвовать в Радд
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function canPaternalSistersParticipateInRadd(heirs) {
  return (
    heirs.paternalSisters > 0 &&
    heirs.paternalBrothers === 0 &&
    heirs.fullBrothers === 0 &&
    !areSistersBlockedFromRadd(heirs)
  );
}

/**
 * Проверяет условия каляля для единоутробных братьев/сестер
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function isKalalahCondition(heirs) {
  return !heirs.father && !hasChildren(heirs);
}

/**
 * Получает список наследников, участвующих в Радд
 * Супруги НЕ участвуют в Радд (по мнению большинства ученых)
 *
 * Requirements: 11.2
 * @param {object} heirs - состояние наследников
 * @returns {string[]} - список типов наследников для Радд
 */
export function getRaddRecipients(heirs) {
  const recipients = [];

  // Мать участвует в Радд
  if (heirs.mother) {
    recipients.push("mother");
  }

  // Дочери участвуют в Радд (если нет сыновей)
  if (canDaughtersParticipateInRadd(heirs)) {
    recipients.push("daughters");
  }

  // Внучки от сына участвуют в Радд (если нет сыновей)
  if (canGranddaughtersParticipateInRadd(heirs)) {
    recipients.push("granddaughtersFromSon");
  }

  // Бабушки участвуют в Радд (если нет матери)
  if (canGrandmothersParticipateInRadd(heirs)) {
    recipients.push("grandmothers");
  }

  // Родные сестры участвуют в Радд (если не заблокированы)
  if (canFullSistersParticipateInRadd(heirs)) {
    recipients.push("fullSisters");
  }

  // Единокровные сестры участвуют в Радд (если не заблокированы)
  if (canPaternalSistersParticipateInRadd(heirs)) {
    recipients.push("paternalSisters");
  }

  // Единоутробные братья/сестры участвуют в Радд (при каляля)
  if (isKalalahCondition(heirs)) {
    if (heirs.maternalBrothers > 0) {
      recipients.push("maternalBrothers");
    }
    if (heirs.maternalSisters > 0) {
      recipients.push("maternalSisters");
    }
  }

  return recipients;
}

/**
 * Рассчитывает долю дочерей для Радд
 * @param {object} heirs - состояние наследников
 * @returns {Fraction}
 */
function calculateDaughtersRaddShare(heirs) {
  return heirs.daughters === 1 ? new Fraction(1, 2) : new Fraction(2, 3);
}

/**
 * Рассчитывает долю внучек от сына для Радд
 * @param {object} heirs - состояние наследников
 * @returns {Fraction}
 */
function calculateGranddaughtersRaddShare(heirs) {
  if (heirs.daughters === 1) {
    return new Fraction(1, 6);
  }
  if (heirs.daughters === 0) {
    return heirs.granddaughtersFromSon === 1
      ? new Fraction(1, 2)
      : new Fraction(2, 3);
  }
  return new Fraction(0, 1);
}

/**
 * Рассчитывает долю родных сестер для Радд
 * @param {object} heirs - состояние наследников
 * @returns {Fraction}
 */
function calculateFullSistersRaddShare(heirs) {
  return heirs.fullSisters === 1 ? new Fraction(1, 2) : new Fraction(2, 3);
}

/**
 * Рассчитывает долю единокровных сестер для Радд
 * @param {object} heirs - состояние наследников
 * @returns {Fraction}
 */
function calculatePaternalSistersRaddShare(heirs) {
  if (heirs.fullSisters === 1) {
    return new Fraction(1, 6);
  }
  if (heirs.fullSisters === 0) {
    return heirs.paternalSisters === 1
      ? new Fraction(1, 2)
      : new Fraction(2, 3);
  }
  return new Fraction(0, 1);
}

/**
 * Рассчитывает долю единоутробных братьев/сестер для Радд
 * @param {object} heirs - состояние наследников
 * @returns {Fraction}
 */
function calculateMaternalSiblingsRaddShare(heirs) {
  const totalMaternal =
    (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
  return totalMaternal === 1 ? new Fraction(1, 6) : new Fraction(1, 3);
}

/**
 * Проверяет, нужно ли добавить долю единоутробных к общей сумме
 * @param {string} recipient - текущий получатель
 * @param {string[]} recipients - все получатели
 * @returns {boolean}
 */
function shouldAddMaternalSiblingsShare(recipient, recipients) {
  const hasBrothers = recipients.includes("maternalBrothers");
  const hasSisters = recipients.includes("maternalSisters");

  // Добавляем только один раз для всех единоутробных
  if (recipient === "maternalBrothers" && !hasSisters) {
    return true;
  }
  if (recipient === "maternalSisters" && !hasBrothers) {
    return true;
  }
  if (recipient === "maternalBrothers" && hasSisters) {
    return true; // Добавляем при первом (братья)
  }
  return false;
}

/**
 * Получает долю для конкретного типа получателя Радд
 * @param {string} recipient - тип получателя
 * @param {object} heirs - состояние наследников
 * @param {string[]} recipients - все получатели
 * @returns {Fraction}
 */
function getRecipientRaddShare(recipient, heirs, recipients) {
  switch (recipient) {
    case "mother":
      return calculateMotherShare(heirs);
    case "daughters":
      return calculateDaughtersRaddShare(heirs);
    case "granddaughtersFromSon":
      return calculateGranddaughtersRaddShare(heirs);
    case "grandmothers":
      return new Fraction(1, 6);
    case "fullSisters":
      return calculateFullSistersRaddShare(heirs);
    case "paternalSisters":
      return calculatePaternalSistersRaddShare(heirs);
    case "maternalBrothers":
    case "maternalSisters":
      return shouldAddMaternalSiblingsShare(recipient, recipients)
        ? calculateMaternalSiblingsRaddShare(heirs)
        : new Fraction(0, 1);
    default:
      return new Fraction(0, 1);
  }
}

/**
 * Рассчитывает сумму базовых долей участников Радд
 * Используется для пропорционального распределения остатка
 *
 * @param {object} heirs - состояние наследников
 * @param {string[]} recipients - список участников Радд
 * @returns {Fraction} - сумма базовых долей
 */
export function calculateRaddRecipientsTotal(heirs, recipients) {
  let total = new Fraction(0, 1);

  for (const recipient of recipients) {
    const share = getRecipientRaddShare(recipient, heirs, recipients);
    total = total.add(share);
  }

  return total;
}

/**
 * Рассчитывает долю Радд для конкретного получателя
 * @param {string} recipient - тип получателя
 * @param {object} heirs - состояние наследников
 * @param {Fraction} remainder - остаток для распределения
 * @param {Fraction} recipientsTotal - общая сумма базовых долей
 * @returns {Fraction} - доля Радд для получателя
 */
function calculateRaddShareForRecipient(
  recipient,
  heirs,
  remainder,
  recipientsTotal
) {
  // Используем уже существующую функцию для получения базовой доли
  const baseShare = getRecipientRaddShare(recipient, heirs, [recipient]);

  // Пропорциональная доля от остатка
  // raddShare = remainder × (baseShare / recipientsTotal)
  const proportion = baseShare.divide(recipientsTotal);
  return remainder.multiply(proportion);
}

/**
 * Рассчитывает доли Радд для всех получателей
 * @param {string[]} recipients - список получателей
 * @param {object} heirs - состояние наследников
 * @param {Fraction} remainder - остаток для распределения
 * @param {Fraction} recipientsTotal - общая сумма базовых долей
 * @returns {object} - объект с долями для каждого получателя
 */
function calculateAllRaddShares(recipients, heirs, remainder, recipientsTotal) {
  const raddShares = {};

  for (const recipient of recipients) {
    raddShares[recipient] = calculateRaddShareForRecipient(
      recipient,
      heirs,
      remainder,
      recipientsTotal
    );
  }

  return raddShares;
}

/**
 * Создает результат для случая, когда Радд не применяется
 * @param {Fraction} remainder - остаток
 * @returns {object} - результат неприменения Радд
 */
function createRaddNotAppliedResult(remainder) {
  return {
    applied: false,
    remainder: remainder,
    recipients: [],
    raddShares: {},
    notification: null,
  };
}

/**
 * Создает уведомление о применении Радд
 * @param {Fraction} remainder - остаток
 * @returns {object} - объект уведомления
 */
function createRaddNotification(remainder) {
  return {
    type: "info",
    icon: "ℹ️",
    title: "Применено правило ар-Радд",
    message: `После распределения фиксированных долей остался остаток (${remainder.toString()} = ${Math.round(
      remainder.toDecimal() * 100
    )}%). Он был пропорционально распределен между наследниками с фиксированной долей.`,
  };
}

/**
 * Применяет правило ар-Радд
 * Остаток пропорционально распределяется между наследниками с фиксированной долей
 * (кроме супругов)
 *
 * Requirements: 8.3, 11.1, 11.2, 11.3, 11.4
 * @param {object} heirs - состояние наследников
 * @returns {object} - результат применения Радд
 */
export function applyRadd(heirs) {
  const remainder = calculateRemainder(heirs);
  const asabaInfo = determineAsaba(heirs);

  // Проверяем условия для Радд
  if (!remainder.greaterThan(new Fraction(0, 1)) || asabaInfo) {
    return createRaddNotAppliedResult(remainder);
  }

  const recipients = getRaddRecipients(heirs);

  // Если нет получателей Радд (только супруг), остаток не распределяется
  if (recipients.length === 0) {
    return createRaddNotAppliedResult(remainder);
  }

  // Рассчитываем сумму базовых долей участников Радд
  const recipientsTotal = calculateRaddRecipientsTotal(heirs, recipients);

  // Рассчитываем дополнительную долю для каждого участника
  const raddShares = calculateAllRaddShares(
    recipients,
    heirs,
    remainder,
    recipientsTotal
  );

  return {
    applied: true,
    remainder: remainder,
    recipients: recipients,
    raddShares: raddShares,
    notification: createRaddNotification(remainder),
  };
}

// ========================================
// Случаи аль-Умарийятайн (Requirements 12.1-12.3)
// ========================================

/**
 * Проверяет, применяется ли случай аль-Умарийятайн
 * Условия:
 * 1. Наследуют только супруг (муж или жена) и оба родителя
 * 2. Нет детей, внуков, братьев и сестер
 *
 * Requirements: 12.1
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - информация о случае или null
 */
export function checkUmariyyatan(heirs) {
  // Проверяем наличие супруга
  const hasSpouse = heirs.husband || heirs.wife;
  if (!hasSpouse) {
    return null;
  }

  // Проверяем наличие обоих родителей
  if (!heirs.father || !heirs.mother) {
    return null;
  }

  // Проверяем отсутствие детей и внуков
  if (
    heirs.sons > 0 ||
    heirs.daughters > 0 ||
    heirs.grandsonsFromSon > 0 ||
    heirs.granddaughtersFromSon > 0
  ) {
    return null;
  }

  // Проверяем отсутствие братьев и сестер
  if (
    heirs.fullBrothers > 0 ||
    heirs.fullSisters > 0 ||
    heirs.paternalBrothers > 0 ||
    heirs.paternalSisters > 0 ||
    heirs.maternalBrothers > 0 ||
    heirs.maternalSisters > 0
  ) {
    return null;
  }

  // Проверяем отсутствие дедов и бабушек
  if (
    heirs.paternalGrandfather ||
    heirs.paternalGrandmother ||
    heirs.maternalGrandmother
  ) {
    return null;
  }

  // Определяем случай (1 - с мужем, 2 - с женой)
  const caseNumber = heirs.husband ? 1 : 2;

  return {
    applies: true,
    caseNumber: caseNumber,
    description:
      caseNumber === 1
        ? "Случай аль-Умарийятайн с мужем: муж получает 1/2, мать — 1/3 от остатка, отец — остаток"
        : "Случай аль-Умарийятайн с женой: жена получает 1/4, мать — 1/3 от остатка, отец — остаток",
  };
}

/**
 * Рассчитывает доли при случае аль-Умарийятайн
 * Мать получает 1/3 от остатка после доли супруга, а не 1/3 от всего имущества
 *
 * Requirements: 12.2
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - доли наследников или null если не применяется
 */
export function calculateUmariyyatanShares(heirs) {
  const umariyyatan = checkUmariyyatan(heirs);

  if (!umariyyatan) {
    return null;
  }

  const one = new Fraction(1, 1);
  let spouseShare;
  let spouseType;

  if (heirs.husband) {
    // Муж получает 1/2 (нет детей)
    spouseShare = new Fraction(1, 2);
    spouseType = "husband";
  } else {
    // Жена получает 1/4 (нет детей)
    spouseShare = new Fraction(1, 4);
    spouseType = "wife";
  }

  // Остаток после доли супруга
  const remainderAfterSpouse = one.subtract(spouseShare);

  // Мать получает 1/3 от остатка (не от всего имущества!)
  const motherShare = remainderAfterSpouse.divide(new Fraction(3, 1));

  // Отец получает остаток
  const fatherShare = remainderAfterSpouse.subtract(motherShare);

  return {
    spouseType: spouseType,
    spouseShare: spouseShare,
    motherShare: motherShare,
    fatherShare: fatherShare,
    // Для сравнения: обычная доля матери была бы 1/3
    normalMotherShare: new Fraction(1, 3),
  };
}

/**
 * Применяет правило аль-Умарийятайн
 *
 * Requirements: 12.1, 12.2, 12.3
 * @param {object} heirs - состояние наследников
 * @returns {object} - результат применения
 */
export function applyUmariyyatan(heirs) {
  const umariyyatan = checkUmariyyatan(heirs);

  if (!umariyyatan) {
    return {
      applied: false,
      caseNumber: null,
      shares: null,
      notification: null,
    };
  }

  const shares = calculateUmariyyatanShares(heirs);

  return {
    applied: true,
    caseNumber: umariyyatan.caseNumber,
    shares: shares,
    notification: {
      type: "info",
      icon: "📜",
      title: "Применен случай аль-Умарийятайн",
      message:
        umariyyatan.description +
        `. Мать получает ${shares.motherShare.toString()} (${Math.round(
          shares.motherShare.toDecimal() * 100
        )}%) вместо обычной 1/3 (${Math.round(
          shares.normalMotherShare.toDecimal() * 100
        )}%).`,
    },
  };
}

// ========================================
// Общая функция применения всех особых случаев
// ========================================

/**
 * Определяет и применяет все необходимые особые случаи
 * Порядок проверки:
 * 1. аль-Умарийятайн (имеет приоритет)
 * 2. аль-Авль (если сумма > 100%)
 * 3. ар-Радд (если остаток > 0 и нет асаба)
 *
 * @param {object} heirs - состояние наследников
 * @returns {object} - результат применения особых случаев
 */
export function applySpecialCases(heirs) {
  const result = {
    umariyyatan: applyUmariyyatan(heirs),
    awl: null,
    radd: null,
    notifications: [],
  };

  // Если применяется Умарийятайн, Авль и Радд не применяются
  if (result.umariyyatan.applied) {
    result.notifications.push(result.umariyyatan.notification);
    return result;
  }

  // Проверяем Авль
  result.awl = applyAwl(heirs);
  if (result.awl.applied) {
    result.notifications.push(result.awl.notification);
    return result; // При Авль Радд не применяется
  }

  // Проверяем Радд
  result.radd = applyRadd(heirs);
  if (result.radd.applied) {
    result.notifications.push(result.radd.notification);
  }

  return result;
}
