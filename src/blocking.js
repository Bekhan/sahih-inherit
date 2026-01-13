/**
 * Система блокировки наследников (хиджб)
 * Реализует правила исламского наследственного права о блокировке наследников
 *
 * Feature: islamic-inheritance-calculator
 * Validates: Requirements 4.2, 5.2, 6.3, 6.4, 9.1-9.6
 */

/**
 * Правила блокировки для каждого типа наследника
 * Каждое правило - функция, принимающая состояние наследников и возвращающая boolean
 */
export const BlockingRules = {
  /**
   * Дед (отец отца) блокируется отцом
   * Requirements: 9.1
   */
  paternalGrandfather: (heirs) => heirs.father === true,

  /**
   * Бабушка по отцу блокируется матерью
   * Requirements: 9.5
   */
  paternalGrandmother: (heirs) => heirs.mother === true,

  /**
   * Внуки от сына блокируются сыновьями
   * Requirements: 9.2, 4.2
   */
  grandsonsFromSon: (heirs) => heirs.sons > 0,

  /**
   * Внучки от сына блокируются сыновьями
   * Requirements: 9.2, 4.2
   */
  granddaughtersFromSon: (heirs) => heirs.sons > 0,

  /**
   * Родные братья блокируются отцом, сыном или внуком от сына
   * Requirements: 9.3, 6.3
   */
  fullBrothers: (heirs) =>
    heirs.father === true || heirs.sons > 0 || heirs.grandsonsFromSon > 0,

  /**
   * Родные сестры блокируются отцом, сыном или внуком от сына
   * Requirements: 9.3, 6.3
   */
  fullSisters: (heirs) =>
    heirs.father === true || heirs.sons > 0 || heirs.grandsonsFromSon > 0,

  /**
   * Единокровные братья (по отцу) блокируются:
   * - отцом, сыном или внуком от сына (как все братья)
   * - родными братьями
   * Requirements: 9.3, 9.4, 6.3, 6.4
   */
  paternalBrothers: (heirs) =>
    heirs.father === true ||
    heirs.sons > 0 ||
    heirs.grandsonsFromSon > 0 ||
    heirs.fullBrothers > 0,

  /**
   * Единокровные сестры (по отцу) блокируются:
   * - отцом, сыном или внуком от сына (как все братья/сестры)
   * - родными братьями
   * Requirements: 9.3, 9.4, 6.3, 6.4
   */
  paternalSisters: (heirs) =>
    heirs.father === true ||
    heirs.sons > 0 ||
    heirs.grandsonsFromSon > 0 ||
    heirs.fullBrothers > 0,
};

/**
 * Причины блокировки для каждого типа наследника
 * Возвращает человекочитаемое объяснение причины блокировки
 */
const BlockingReasons = {
  paternalGrandfather: {
    father: "Блокируется отцом",
  },
  paternalGrandmother: {
    mother: "Блокируется матерью",
  },
  grandsonsFromSon: {
    sons: "Блокируется сыном",
  },
  granddaughtersFromSon: {
    sons: "Блокируется сыном",
  },
  fullBrothers: {
    father: "Блокируется отцом",
    sons: "Блокируется сыном",
    grandsonsFromSon: "Блокируется внуком от сына",
  },
  fullSisters: {
    father: "Блокируется отцом",
    sons: "Блокируется сыном",
    grandsonsFromSon: "Блокируется внуком от сына",
  },
  paternalBrothers: {
    father: "Блокируется отцом",
    sons: "Блокируется сыном",
    grandsonsFromSon: "Блокируется внуком от сына",
    fullBrothers: "Блокируется родным братом",
  },
  paternalSisters: {
    father: "Блокируется отцом",
    sons: "Блокируется сыном",
    grandsonsFromSon: "Блокируется внуком от сына",
    fullBrothers: "Блокируется родным братом",
  },
};

/**
 * Проверяет, заблокирован ли наследник данного типа
 * @param {string} heirType - тип наследника (ключ из BlockingRules)
 * @param {object} heirs - объект состояния наследников
 * @returns {object} - { blocked: boolean, reason: string | null }
 */
export function checkBlocking(heirType, heirs) {
  const rule = BlockingRules[heirType];

  // Если для данного типа нет правила блокировки, он не блокируется
  if (!rule) {
    return { blocked: false, reason: null };
  }

  const blocked = rule(heirs);

  if (!blocked) {
    return { blocked: false, reason: null };
  }

  const reason = getBlockingReason(heirType, heirs);
  return { blocked: true, reason };
}

/**
 * Получает причину блокировки наследника
 * @param {string} heirType - тип наследника
 * @param {object} heirs - объект состояния наследников
 * @returns {string | null} - причина блокировки или null
 */
export function getBlockingReason(heirType, heirs) {
  const reasons = BlockingReasons[heirType];

  if (!reasons) {
    return null;
  }

  // Проверяем каждую возможную причину блокировки в порядке приоритета
  // Дед блокируется отцом
  if (heirType === "paternalGrandfather") {
    if (heirs.father === true) {
      return reasons.father;
    }
  }

  // Бабушка по отцу блокируется матерью
  if (heirType === "paternalGrandmother") {
    if (heirs.mother === true) {
      return reasons.mother;
    }
  }

  // Внуки/внучки от сына блокируются сыновьями
  if (heirType === "grandsonsFromSon" || heirType === "granddaughtersFromSon") {
    if (heirs.sons > 0) {
      return reasons.sons;
    }
  }

  // Родные братья/сестры
  if (heirType === "fullBrothers" || heirType === "fullSisters") {
    if (heirs.father === true) {
      return reasons.father;
    }
    if (heirs.sons > 0) {
      return reasons.sons;
    }
    if (heirs.grandsonsFromSon > 0) {
      return reasons.grandsonsFromSon;
    }
  }

  // Единокровные братья/сестры
  if (heirType === "paternalBrothers" || heirType === "paternalSisters") {
    if (heirs.father === true) {
      return reasons.father;
    }
    if (heirs.sons > 0) {
      return reasons.sons;
    }
    if (heirs.grandsonsFromSon > 0) {
      return reasons.grandsonsFromSon;
    }
    if (heirs.fullBrothers > 0) {
      return reasons.fullBrothers;
    }
  }

  return null;
}

/**
 * Получает все блокировки для текущего состояния наследников
 * @param {object} heirs - объект состояния наследников
 * @returns {object} - объект с блокировками для каждого типа наследника
 */
export function getAllBlockings(heirs) {
  const blockings = {};

  for (const heirType of Object.keys(BlockingRules)) {
    blockings[heirType] = checkBlocking(heirType, heirs);
  }

  return blockings;
}

/**
 * Список всех типов наследников, которые могут быть заблокированы
 */
export const BlockableHeirTypes = Object.keys(BlockingRules);
