/**
 * Расчет фиксированных долей наследников (асхаб аль-фуруд)
 * Feature: islamic-inheritance-calculator
 * Validates: Requirements 7.1-7.6, 13.2
 */

import { Fraction } from "./fraction.js";

/**
 * Проверяет наличие детей или внуков от сына
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function hasChildren(heirs) {
  return (
    heirs.sons > 0 ||
    heirs.daughters > 0 ||
    heirs.grandsonsFromSon > 0 ||
    heirs.granddaughtersFromSon > 0
  );
}

/**
 * Проверяет наличие сыновей или внуков от сына (мужских потомков)
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function hasMaleDescendants(heirs) {
  return heirs.sons > 0 || heirs.grandsonsFromSon > 0;
}

/**
 * Проверяет наличие множества братьев/сестер (2 и более)
 * @param {object} heirs - состояние наследников
 * @returns {boolean}
 */
function hasMultipleSiblings(heirs) {
  const totalSiblings =
    (heirs.fullBrothers || 0) +
    (heirs.fullSisters || 0) +
    (heirs.paternalBrothers || 0) +
    (heirs.paternalSisters || 0) +
    (heirs.maternalBrothers || 0) +
    (heirs.maternalSisters || 0);
  return totalSiblings >= 2;
}

/**
 * Типы наследников с правилами расчета долей
 * Каждый тип содержит:
 * - id: уникальный идентификатор
 * - nameRu: название на русском
 * - nameAr: название на арабском
 * - category: категория (spouse, descendant, ascendant, sibling)
 * - gender: пол (male, female)
 * - getShare: функция расчета доли (возвращает Fraction или null для асаба)
 * - isAsaba: является ли наследником-асаба
 * - dalil: ссылка на источник (Коран/Сунна)
 */
export const HeirTypes = {
  // ========================================
  // Супруги (Requirements 7.1, 7.2)
  // ========================================

  /**
   * Муж
   * Доля: 1/2 (без детей) или 1/4 (с детьми)
   * Requirements: 7.1
   */
  HUSBAND: {
    id: "husband",
    nameRu: "Муж",
    nameAr: "الزوج",
    category: "spouse",
    gender: "male",
    isAsaba: false,
    getShare: (heirs) => {
      return hasChildren(heirs) ? new Fraction(1, 4) : new Fraction(1, 2);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:12',
  },

  /**
   * Жена/Жены
   * Доля: 1/4 (без детей) или 1/8 (с детьми), делится поровну между женами
   * Requirements: 7.2
   */
  WIFE: {
    id: "wife",
    nameRu: "Жена",
    nameAr: "الزوجة",
    category: "spouse",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      return hasChildren(heirs) ? new Fraction(1, 8) : new Fraction(1, 4);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:12',
  },

  // ========================================
  // Потомки (Requirements 7.5, 7.6)
  // ========================================

  /**
   * Сын
   * Асаба - получает остаток после фиксированных долей
   * При наличии дочерей делит остаток в соотношении 2:1
   */
  SON: {
    id: "son",
    nameRu: "Сын",
    nameAr: "الابن",
    category: "descendant",
    gender: "male",
    isAsaba: true,
    getShare: () => null, // Асаба - доля рассчитывается как остаток
    dalil: 'Коран, сура "ан-Ниса", 4:11',
  },

  /**
   * Дочь/Дочери
   * Доля: 1/2 (одна без сына) или 2/3 (несколько без сына)
   * При наличии сына становится асаба (соотношение 2:1)
   * Requirements: 7.5
   */
  DAUGHTER: {
    id: "daughter",
    nameRu: "Дочь",
    nameAr: "البنت",
    category: "descendant",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // При наличии сына дочь становится асаба
      if (heirs.sons > 0) {
        return null; // Асаба с сыном
      }
      // Одна дочь - 1/2
      if (heirs.daughters === 1) {
        return new Fraction(1, 2);
      }
      // Несколько дочерей - 2/3 (делится между ними)
      return new Fraction(2, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:11',
  },

  /**
   * Внук от сына
   * Асаба - получает остаток после фиксированных долей
   * Блокируется сыном
   */
  GRANDSON_FROM_SON: {
    id: "grandsonsFromSon",
    nameRu: "Внук от сына",
    nameAr: "ابن الابن",
    category: "descendant",
    gender: "male",
    isAsaba: true,
    getShare: () => null, // Асаба
    dalil: 'Коран, сура "ан-Ниса", 4:11 (по аналогии с сыном)',
  },

  /**
   * Внучка от сына
   * Доля: 1/6 как дополнение до 2/3 при наличии одной дочери
   * При наличии сына или внука от сына становится асаба
   * Блокируется сыном
   * Requirements: 7.6
   */
  GRANDDAUGHTER_FROM_SON: {
    id: "granddaughtersFromSon",
    nameRu: "Внучка от сына",
    nameAr: "بنت الابن",
    category: "descendant",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // Блокируется сыном (проверяется в системе блокировки)
      // При наличии внука от сына становится асаба
      if (heirs.grandsonsFromSon > 0) {
        return null; // Асаба с внуком от сына
      }
      // При наличии одной дочери - 1/6 как дополнение до 2/3
      if (heirs.daughters === 1) {
        return new Fraction(1, 6);
      }
      // При наличии двух и более дочерей - блокируется (0)
      if (heirs.daughters >= 2) {
        return new Fraction(0, 1);
      }
      // Без дочерей: одна внучка - 1/2, несколько - 2/3
      if (heirs.granddaughtersFromSon === 1) {
        return new Fraction(1, 2);
      }
      return new Fraction(2, 3);
    },
    dalil:
      'Хадис от Ибн Масуда (Бухари): "Внучке от сына — 1/6 как дополнение до 2/3"',
  },

  // ========================================
  // Предки (Requirements 7.3, 7.4)
  // ========================================

  /**
   * Отец
   * Доля: 1/6 (с сыном/внуком) или 1/6+остаток (с дочерью/внучкой) или только остаток (без детей)
   * Requirements: 7.4
   */
  FATHER: {
    id: "father",
    nameRu: "Отец",
    nameAr: "الأب",
    category: "ascendant",
    gender: "male",
    isAsaba: true,
    getShare: (heirs) => {
      // При наличии сына или внука от сына - только 1/6
      if (hasMaleDescendants(heirs)) {
        return new Fraction(1, 6);
      }
      // При наличии дочери или внучки от сына - 1/6 + остаток как асаба
      if (heirs.daughters > 0 || heirs.granddaughtersFromSon > 0) {
        return new Fraction(1, 6); // + остаток как асаба
      }
      // Без детей - только асаба (остаток)
      return null;
    },
    dalil: 'Коран, сура "ан-Ниса", 4:11',
  },

  /**
   * Мать
   * Доля: 1/3 (без детей и <2 братьев) или 1/6 (с детьми или ≥2 братьев)
   * Requirements: 7.3
   */
  MOTHER: {
    id: "mother",
    nameRu: "Мать",
    nameAr: "الأم",
    category: "ascendant",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // При наличии детей или множества братьев/сестер - 1/6
      if (hasChildren(heirs) || hasMultipleSiblings(heirs)) {
        return new Fraction(1, 6);
      }
      // Иначе - 1/3
      return new Fraction(1, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:11',
  },

  /**
   * Дед (отец отца)
   * Наследует как отец при его отсутствии
   * Блокируется отцом
   */
  PATERNAL_GRANDFATHER: {
    id: "paternalGrandfather",
    nameRu: "Дед (отец отца)",
    nameAr: "الجد",
    category: "ascendant",
    gender: "male",
    isAsaba: true,
    getShare: (heirs) => {
      // Наследует как отец при его отсутствии
      // При наличии сына или внука от сына - только 1/6
      if (hasMaleDescendants(heirs)) {
        return new Fraction(1, 6);
      }
      // При наличии дочери или внучки от сына - 1/6 + остаток как асаба
      if (heirs.daughters > 0 || heirs.granddaughtersFromSon > 0) {
        return new Fraction(1, 6);
      }
      // Без детей - только асаба (остаток)
      return null;
    },
    dalil: "Иджма ученых: дед наследует как отец при его отсутствии",
  },

  /**
   * Бабушка (мать отца)
   * Доля: 1/6
   * Блокируется матерью
   */
  PATERNAL_GRANDMOTHER: {
    id: "paternalGrandmother",
    nameRu: "Бабушка (мать отца)",
    nameAr: "الجدة من جهة الأب",
    category: "ascendant",
    gender: "female",
    isAsaba: false,
    getShare: () => new Fraction(1, 6),
    dalil: "Хадис: Пророк ﷺ выделил бабушке 1/6 (Абу Дауд, Тирмизи)",
  },

  /**
   * Бабушка (мать матери)
   * Доля: 1/6
   * Блокируется матерью
   */
  MATERNAL_GRANDMOTHER: {
    id: "maternalGrandmother",
    nameRu: "Бабушка (мать матери)",
    nameAr: "الجدة من جهة الأم",
    category: "ascendant",
    gender: "female",
    isAsaba: false,
    getShare: () => new Fraction(1, 6),
    dalil: "Хадис: Пророк ﷺ выделил бабушке 1/6 (Абу Дауд, Тирмизи)",
  },

  // ========================================
  // Братья и сестры
  // ========================================

  /**
   * Родной брат
   * Асаба - получает остаток
   * Блокируется отцом, сыном, внуком от сына
   */
  FULL_BROTHER: {
    id: "fullBrothers",
    nameRu: "Родной брат",
    nameAr: "الأخ الشقيق",
    category: "sibling",
    gender: "male",
    isAsaba: true,
    getShare: () => null, // Асаба
    dalil: 'Коран, сура "ан-Ниса", 4:176',
  },

  /**
   * Родная сестра
   * Доля: 1/2 (одна) или 2/3 (несколько) при отсутствии братьев
   * При наличии родного брата становится асаба (соотношение 2:1)
   * Блокируется отцом, сыном, внуком от сына
   */
  FULL_SISTER: {
    id: "fullSisters",
    nameRu: "Родная сестра",
    nameAr: "الأخت الشقيقة",
    category: "sibling",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // При наличии родного брата становится асаба
      if (heirs.fullBrothers > 0) {
        return null;
      }
      // Одна сестра - 1/2
      if (heirs.fullSisters === 1) {
        return new Fraction(1, 2);
      }
      // Несколько сестер - 2/3
      return new Fraction(2, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:176',
  },

  /**
   * Единокровный брат (по отцу)
   * Асаба - получает остаток
   * Блокируется отцом, сыном, внуком от сына, родным братом
   */
  PATERNAL_BROTHER: {
    id: "paternalBrothers",
    nameRu: "Единокровный брат",
    nameAr: "الأخ لأب",
    category: "sibling",
    gender: "male",
    isAsaba: true,
    getShare: () => null, // Асаба
    dalil: 'Коран, сура "ан-Ниса", 4:176 (по аналогии)',
  },

  /**
   * Единокровная сестра (по отцу)
   * Доля: 1/2 (одна) или 2/3 (несколько) или 1/6 (дополнение при одной родной сестре)
   * При наличии единокровного брата становится асаба
   * Блокируется отцом, сыном, внуком от сына, родным братом
   */
  PATERNAL_SISTER: {
    id: "paternalSisters",
    nameRu: "Единокровная сестра",
    nameAr: "الأخت لأب",
    category: "sibling",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // При наличии единокровного брата становится асаба
      if (heirs.paternalBrothers > 0) {
        return null;
      }
      // При наличии одной родной сестры - 1/6 как дополнение до 2/3
      if (heirs.fullSisters === 1) {
        return new Fraction(1, 6);
      }
      // При наличии двух и более родных сестер - блокируется
      if (heirs.fullSisters >= 2) {
        return new Fraction(0, 1);
      }
      // Одна единокровная сестра - 1/2
      if (heirs.paternalSisters === 1) {
        return new Fraction(1, 2);
      }
      // Несколько единокровных сестер - 2/3
      return new Fraction(2, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:176 (по аналогии)',
  },

  // ========================================
  // Дальние асаба по мужской линии
  // ========================================

  /**
   * Сын полнородного брата (племянник)
   * Асаба по приоритету ниже братьев, выше сыновей единокровных братьев
   */
  NEPHEW_FULL_BROTHER: {
    id: "nephewsFullBrothers",
    nameRu: "Сын полнородного брата",
    nameAr: "ابن الأخ الشقيق",
    category: "agnate",
    gender: "male",
    isAsaba: true,
    getShare: () => null,
    dalil:
      "Порядок асаба: сын → внук → отец → дед → братья → племянники → дяди",
  },

  /**
   * Сын единокровного брата (племянник)
   * Асаба по приоритету ниже сыновей полнородных братьев
   */
  NEPHEW_PATERNAL_BROTHER: {
    id: "nephewsPaternalBrothers",
    nameRu: "Сын единокровного брата",
    nameAr: "ابن الأخ لأب",
    category: "agnate",
    gender: "male",
    isAsaba: true,
    getShare: () => null,
    dalil:
      "Порядок асаба: сын → внук → отец → дед → братья → племянники → дяди",
  },

  /**
   * Родной дядя (родной брат отца)
   * Асаба по приоритету ниже сыновей братьев, выше единокровного дяди
   */
  UNCLE_FULL: {
    id: "unclesFull",
    nameRu: "Родной дядя (брат отца)",
    nameAr: "العم الشقيق",
    category: "agnate",
    gender: "male",
    isAsaba: true,
    getShare: () => null,
    dalil:
      "Порядок асаба: сын → внук → отец → дед → братья → племянники → дяди",
  },

  /**
   * Единокровный дядя (единокровный брат отца)
   * Асаба по приоритету ниже родного дяди
   */
  UNCLE_PATERNAL: {
    id: "unclesPaternal",
    nameRu: "Дядя (единокровный брат отца)",
    nameAr: "العم لأب",
    category: "agnate",
    gender: "male",
    isAsaba: true,
    getShare: () => null,
    dalil:
      "Порядок асаба: сын → внук → отец → дед → братья → племянники → дяди",
  },

  /**
   * Единоутробный брат (по матери)
   * Доля: 1/6 (один) или 1/3 (несколько, делится поровну)
   * Наследует только при каляля (отсутствие отца и детей)
   */
  MATERNAL_BROTHER: {
    id: "maternalBrothers",
    nameRu: "Единоутробный брат",
    nameAr: "الأخ لأم",
    category: "sibling",
    gender: "male",
    isAsaba: false,
    getShare: (heirs) => {
      // Наследует только при каляля
      if (heirs.father || hasChildren(heirs)) {
        return new Fraction(0, 1);
      }
      const totalMaternal =
        (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
      // Один - 1/6
      if (totalMaternal === 1) {
        return new Fraction(1, 6);
      }
      // Несколько - 1/3 (делится поровну)
      return new Fraction(1, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:12',
  },

  /**
   * Единоутробная сестра (по матери)
   * Доля: 1/6 (одна) или 1/3 (несколько, делится поровну)
   * Наследует только при каляля (отсутствие отца и детей)
   */
  MATERNAL_SISTER: {
    id: "maternalSisters",
    nameRu: "Единоутробная сестра",
    nameAr: "الأخت لأم",
    category: "sibling",
    gender: "female",
    isAsaba: false,
    getShare: (heirs) => {
      // Наследует только при каляля
      if (heirs.father || hasChildren(heirs)) {
        return new Fraction(0, 1);
      }
      const totalMaternal =
        (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
      // Один - 1/6
      if (totalMaternal === 1) {
        return new Fraction(1, 6);
      }
      // Несколько - 1/3 (делится поровну)
      return new Fraction(1, 3);
    },
    dalil: 'Коран, сура "ан-Ниса", 4:12',
  },
};

/**
 * Получает тип наследника по его идентификатору
 * @param {string} id - идентификатор наследника
 * @returns {object|null} - объект типа наследника или null
 */
export function getHeirTypeById(id) {
  for (const type of Object.values(HeirTypes)) {
    if (type.id === id) {
      return type;
    }
  }
  return null;
}

/**
 * Получает долю наследника
 * @param {string} heirTypeKey - ключ типа наследника (например, 'HUSBAND')
 * @param {object} heirs - состояние наследников
 * @returns {Fraction|null} - доля или null для асаба
 */
export function getHeirShare(heirTypeKey, heirs) {
  const heirType = HeirTypes[heirTypeKey];
  if (!heirType?.getShare) {
    return null;
  }
  return heirType.getShare(heirs);
}

/**
 * Проверяет, является ли наследник асаба
 * @param {string} heirTypeKey - ключ типа наследника
 * @returns {boolean}
 */
export function isAsaba(heirTypeKey) {
  return HeirTypes[heirTypeKey]?.isAsaba === true;
}

/**
 * Получает далиль (обоснование) для наследника
 * @param {string} heirTypeKey - ключ типа наследника
 * @returns {string} - текст далиля
 */
export function getDalil(heirTypeKey) {
  const heirType = HeirTypes[heirTypeKey];
  return heirType?.dalil || "";
}

// ========================================
// Функции расчета долей супругов (Requirements 7.1, 7.2)
// ========================================

/**
 * Рассчитывает долю мужа
 * Муж: 1/2 (без детей) или 1/4 (с детьми)
 * Requirements: 7.1
 * @param {object} heirs - состояние наследников
 * @returns {Fraction} - доля мужа
 */
export function calculateHusbandShare(heirs) {
  return HeirTypes.HUSBAND.getShare(heirs);
}

/**
 * Рассчитывает долю жены/жен
 * Жена/жены: 1/4 (без детей) или 1/8 (с детьми), делится поровну между женами
 * Requirements: 7.2
 * @param {object} heirs - состояние наследников
 * @returns {object} - { totalShare: Fraction, perWifeShare: Fraction, wifeCount: number }
 */
export function calculateWifeShare(heirs) {
  const totalShare = HeirTypes.WIFE.getShare(heirs);
  const wifeCount = heirs.wifeCount || 1;

  // Доля каждой жены = общая доля / количество жен
  const perWifeShare = totalShare.divide(new Fraction(wifeCount, 1));

  return {
    totalShare,
    perWifeShare,
    wifeCount,
  };
}

/**
 * Рассчитывает долю супруга (муж или жена)
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - результат расчета или null если нет супруга
 */
export function calculateSpouseShare(heirs) {
  if (heirs.husband) {
    const share = calculateHusbandShare(heirs);
    return {
      type: "husband",
      heirType: HeirTypes.HUSBAND,
      share,
      count: 1,
      perPersonShare: share,
    };
  }

  if (heirs.wife) {
    const result = calculateWifeShare(heirs);
    return {
      type: "wife",
      heirType: HeirTypes.WIFE,
      share: result.totalShare,
      count: result.wifeCount,
      perPersonShare: result.perWifeShare,
    };
  }

  return null;
}

// ========================================
// Функции расчета долей родителей (Requirements 7.3, 7.4)
// ========================================

/**
 * Рассчитывает долю матери
 * Мать: 1/3 (без детей и <2 братьев) или 1/6 (с детьми или ≥2 братьев)
 * Requirements: 7.3
 * @param {object} heirs - состояние наследников
 * @returns {Fraction} - доля матери
 */
export function calculateMotherShare(heirs) {
  return HeirTypes.MOTHER.getShare(heirs);
}

/**
 * Рассчитывает долю отца
 * Отец: 1/6 (с сыном/внуком) или 1/6+остаток (с дочерью/внучкой) или только остаток (без детей)
 * Requirements: 7.4
 * @param {object} heirs - состояние наследников
 * @returns {object} - { fixedShare: Fraction|null, isAsaba: boolean, asabaWithFixed: boolean }
 */
export function calculateFatherShare(heirs) {
  const fixedShare = HeirTypes.FATHER.getShare(heirs);

  // Определяем, получает ли отец остаток как асаба
  const hasMaleDesc = hasMaleDescendants(heirs);
  const hasFemaleDesc = heirs.daughters > 0 || heirs.granddaughtersFromSon > 0;

  return {
    fixedShare,
    // Отец является асаба если нет мужских потомков
    isAsaba: !hasMaleDesc,
    // Отец получает и фиксированную долю и остаток если есть только женские потомки
    asabaWithFixed: !hasMaleDesc && hasFemaleDesc,
  };
}

/**
 * Рассчитывает долю деда (отца отца)
 * Наследует как отец при его отсутствии
 * @param {object} heirs - состояние наследников
 * @returns {object} - { fixedShare: Fraction|null, isAsaba: boolean, asabaWithFixed: boolean }
 */
export function calculateGrandfatherShare(heirs) {
  // Дед наследует как отец при его отсутствии
  const fixedShare = HeirTypes.PATERNAL_GRANDFATHER.getShare(heirs);

  const hasMaleDesc = hasMaleDescendants(heirs);
  const hasFemaleDesc = heirs.daughters > 0 || heirs.granddaughtersFromSon > 0;

  return {
    fixedShare,
    isAsaba: !hasMaleDesc,
    asabaWithFixed: !hasMaleDesc && hasFemaleDesc,
  };
}

/**
 * Рассчитывает долю бабушки (бабушек)
 * Бабушка: 1/6 (делится между бабушками если их несколько)
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - результат расчета или null если нет бабушек
 */
export function calculateGrandmotherShare(heirs) {
  // Считаем количество бабушек (не заблокированных)
  let grandmotherCount = 0;

  // Бабушка по отцу блокируется матерью
  if (heirs.paternalGrandmother && !heirs.mother) {
    grandmotherCount++;
  }

  // Бабушка по матери блокируется матерью
  if (heirs.maternalGrandmother && !heirs.mother) {
    grandmotherCount++;
  }

  if (grandmotherCount === 0) {
    return null;
  }

  const totalShare = new Fraction(1, 6);
  const perGrandmotherShare = totalShare.divide(
    new Fraction(grandmotherCount, 1)
  );

  return {
    totalShare,
    perGrandmotherShare,
    grandmotherCount,
    paternalGrandmother: heirs.paternalGrandmother && !heirs.mother,
    maternalGrandmother: heirs.maternalGrandmother && !heirs.mother,
  };
}

/**
 * Рассчитывает доли всех предков
 * @param {object} heirs - состояние наследников
 * @returns {object} - объект с долями всех предков
 */
export function calculateAscendantShares(heirs) {
  const result = {
    mother: null,
    father: null,
    grandfather: null,
    grandmothers: null,
  };

  if (heirs.mother) {
    result.mother = {
      heirType: HeirTypes.MOTHER,
      share: calculateMotherShare(heirs),
    };
  }

  if (heirs.father) {
    const fatherResult = calculateFatherShare(heirs);
    result.father = {
      heirType: HeirTypes.FATHER,
      ...fatherResult,
    };
  }

  // Дед наследует только при отсутствии отца
  if (heirs.paternalGrandfather && !heirs.father) {
    const grandfatherResult = calculateGrandfatherShare(heirs);
    result.grandfather = {
      heirType: HeirTypes.PATERNAL_GRANDFATHER,
      ...grandfatherResult,
    };
  }

  // Бабушки наследуют при отсутствии матери
  if (
    (heirs.paternalGrandmother || heirs.maternalGrandmother) &&
    !heirs.mother
  ) {
    result.grandmothers = calculateGrandmotherShare(heirs);
  }

  return result;
}

// ========================================
// Функции расчета долей детей и внуков (Requirements 7.5, 7.6)
// ========================================

/**
 * Рассчитывает долю дочери/дочерей
 * Дочери: 1/2 (одна без сына) или 2/3 (несколько без сына)
 * При наличии сына становятся асаба (соотношение 2:1)
 * Requirements: 7.5
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - результат расчета или null если нет дочерей
 */
export function calculateDaughterShare(heirs) {
  if (!heirs.daughters || heirs.daughters === 0) {
    return null;
  }

  const share = HeirTypes.DAUGHTER.getShare(heirs);

  // При наличии сына дочери становятся асаба
  if (share === null) {
    return {
      heirType: HeirTypes.DAUGHTER,
      share: null,
      count: heirs.daughters,
      isAsaba: true,
      perPersonShare: null,
    };
  }

  // Фиксированная доля делится между дочерьми
  const perDaughterShare = share.divide(new Fraction(heirs.daughters, 1));

  return {
    heirType: HeirTypes.DAUGHTER,
    share,
    count: heirs.daughters,
    isAsaba: false,
    perPersonShare: perDaughterShare,
  };
}

/**
 * Рассчитывает долю внучки/внучек от сына
 * Внучка от сына: 1/6 как дополнение до 2/3 при наличии одной дочери
 * При наличии внука от сына становится асаба
 * Блокируется сыном
 * Requirements: 7.6
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - результат расчета или null если нет внучек или заблокированы
 */
export function calculateGranddaughterShare(heirs) {
  // Блокируется сыном
  if (heirs.sons > 0) {
    return null;
  }

  if (!heirs.granddaughtersFromSon || heirs.granddaughtersFromSon === 0) {
    return null;
  }

  const share = HeirTypes.GRANDDAUGHTER_FROM_SON.getShare(heirs);

  // При наличии внука от сына становится асаба
  if (share === null) {
    return {
      heirType: HeirTypes.GRANDDAUGHTER_FROM_SON,
      share: null,
      count: heirs.granddaughtersFromSon,
      isAsaba: true,
      perPersonShare: null,
    };
  }

  // Если доля 0 (заблокирована двумя дочерьми)
  if (share.isZero()) {
    return {
      heirType: HeirTypes.GRANDDAUGHTER_FROM_SON,
      share: new Fraction(0, 1),
      count: heirs.granddaughtersFromSon,
      isAsaba: false,
      perPersonShare: new Fraction(0, 1),
      blocked: true,
      blockedReason: "Блокируется двумя и более дочерьми",
    };
  }

  // Фиксированная доля делится между внучками
  const perGranddaughterShare = share.divide(
    new Fraction(heirs.granddaughtersFromSon, 1)
  );

  return {
    heirType: HeirTypes.GRANDDAUGHTER_FROM_SON,
    share,
    count: heirs.granddaughtersFromSon,
    isAsaba: false,
    perPersonShare: perGranddaughterShare,
  };
}

/**
 * Рассчитывает доли всех потомков
 * @param {object} heirs - состояние наследников
 * @returns {object} - объект с долями всех потомков
 */
export function calculateDescendantShares(heirs) {
  const result = {
    sons: null,
    daughters: null,
    grandsonsFromSon: null,
    granddaughtersFromSon: null,
  };

  // Сыновья - всегда асаба
  if (heirs.sons > 0) {
    result.sons = {
      heirType: HeirTypes.SON,
      share: null,
      count: heirs.sons,
      isAsaba: true,
      perPersonShare: null,
    };
  }

  // Дочери
  result.daughters = calculateDaughterShare(heirs);

  // Внуки от сына - асаба (блокируются сыном)
  if (heirs.grandsonsFromSon > 0 && heirs.sons === 0) {
    result.grandsonsFromSon = {
      heirType: HeirTypes.GRANDSON_FROM_SON,
      share: null,
      count: heirs.grandsonsFromSon,
      isAsaba: true,
      perPersonShare: null,
    };
  }

  // Внучки от сына
  result.granddaughtersFromSon = calculateGranddaughterShare(heirs);

  return result;
}

// ========================================
// Расчет асаба (Requirements 8.1, 8.2)
// ========================================

/**
 * Порядок приоритета асаба (от высшего к низшему):
 * 1. Сын
 * 2. Внук от сына
 * 3. Отец
 * 4. Дед (отец отца)
 * 5. Родной брат
 * 6. Единокровный брат (по отцу)
 *
 * Requirements: 8.1
 */
export const AsabaPriority = [
  { key: "sons", type: HeirTypes.SON, countField: "sons" },
  {
    key: "grandsonsFromSon",
    type: HeirTypes.GRANDSON_FROM_SON,
    countField: "grandsonsFromSon",
  },
  { key: "father", type: HeirTypes.FATHER, countField: "father" },
  {
    key: "paternalGrandfather",
    type: HeirTypes.PATERNAL_GRANDFATHER,
    countField: "paternalGrandfather",
  },
  {
    key: "fullBrothers",
    type: HeirTypes.FULL_BROTHER,
    countField: "fullBrothers",
  },
  {
    key: "paternalBrothers",
    type: HeirTypes.PATERNAL_BROTHER,
    countField: "paternalBrothers",
  },
  {
    key: "nephewsFullBrothers",
    type: HeirTypes.NEPHEW_FULL_BROTHER,
    countField: "nephewsFullBrothers",
  },
  {
    key: "nephewsPaternalBrothers",
    type: HeirTypes.NEPHEW_PATERNAL_BROTHER,
    countField: "nephewsPaternalBrothers",
  },
  {
    key: "unclesFull",
    type: HeirTypes.UNCLE_FULL,
    countField: "unclesFull",
  },
  {
    key: "unclesPaternal",
    type: HeirTypes.UNCLE_PATERNAL,
    countField: "unclesPaternal",
  },
];

/**
 * Определяет, кто является асаба в данной комбинации наследников
 * Возвращает информацию о наследниках-асаба с учетом блокировки
 *
 * Requirements: 8.1
 * @param {object} heirs - состояние наследников
 * @returns {object|null} - информация об асаба или null если нет асаба
 */
export function determineAsaba(heirs) {
  // Проверяем каждый тип асаба в порядке приоритета
  for (const asabaInfo of AsabaPriority) {
    const count = heirs[asabaInfo.countField];

    // Пропускаем если наследник отсутствует
    if (!count || count === 0 || count === false) {
      continue;
    }

    // Проверяем блокировку
    // Внуки блокируются сыновьями
    if (asabaInfo.key === "grandsonsFromSon" && heirs.sons > 0) {
      continue;
    }

    // Дед блокируется отцом
    if (asabaInfo.key === "paternalGrandfather" && heirs.father) {
      continue;
    }

    // Братья блокируются отцом, сыном или внуком от сына
    if (
      (asabaInfo.key === "fullBrothers" ||
        asabaInfo.key === "paternalBrothers") &&
      (heirs.father || heirs.sons > 0 || heirs.grandsonsFromSon > 0)
    ) {
      continue;
    }

    // Единокровные братья также блокируются родными братьями
    if (asabaInfo.key === "paternalBrothers" && heirs.fullBrothers > 0) {
      continue;
    }

    // Племянники и дяди блокируются ближними мужскими асаба
    const blockedByCloserAsaba =
      heirs.sons > 0 ||
      heirs.grandsonsFromSon > 0 ||
      heirs.father ||
      heirs.paternalGrandfather ||
      heirs.fullBrothers > 0 ||
      heirs.paternalBrothers > 0;

    if (asabaInfo.key === "nephewsFullBrothers" && blockedByCloserAsaba) {
      continue;
    }

    if (
      asabaInfo.key === "nephewsPaternalBrothers" &&
      (blockedByCloserAsaba || heirs.nephewsFullBrothers > 0)
    ) {
      continue;
    }

    if (
      asabaInfo.key === "unclesFull" &&
      (blockedByCloserAsaba ||
        heirs.nephewsFullBrothers > 0 ||
        heirs.nephewsPaternalBrothers > 0)
    ) {
      continue;
    }

    if (
      asabaInfo.key === "unclesPaternal" &&
      (blockedByCloserAsaba ||
        heirs.nephewsFullBrothers > 0 ||
        heirs.nephewsPaternalBrothers > 0 ||
        heirs.unclesFull > 0)
    ) {
      continue;
    }

    // Нашли асаба
    const asabaCount = count === true ? 1 : count;

    // Определяем, есть ли женщины того же уровня (для соотношения 2:1)
    let femaleCount = 0;
    let femaleType = null;

    if (asabaInfo.key === "sons") {
      femaleCount = heirs.daughters || 0;
      femaleType = HeirTypes.DAUGHTER;
    } else if (asabaInfo.key === "grandsonsFromSon") {
      femaleCount = heirs.granddaughtersFromSon || 0;
      femaleType = HeirTypes.GRANDDAUGHTER_FROM_SON;
    } else if (asabaInfo.key === "fullBrothers") {
      femaleCount = heirs.fullSisters || 0;
      femaleType = HeirTypes.FULL_SISTER;
    } else if (asabaInfo.key === "paternalBrothers") {
      femaleCount = heirs.paternalSisters || 0;
      femaleType = HeirTypes.PATERNAL_SISTER;
    }

    return {
      maleType: asabaInfo.type,
      maleCount: asabaCount,
      femaleType,
      femaleCount,
      hasFemales: femaleCount > 0,
      key: asabaInfo.key,
    };
  }

  return null;
}

/**
 * Рассчитывает распределение остатка между асаба
 * Соотношение 2:1 для мужчин и женщин одного уровня
 *
 * Requirements: 8.2
 * @param {Fraction} remainder - остаток после фиксированных долей
 * @param {object} asabaInfo - информация об асаба от determineAsaba()
 * @returns {object} - распределение долей между асаба
 */
export function distributeAsaba(remainder, asabaInfo) {
  if (!asabaInfo || remainder.isZero()) {
    return {
      maleShare: new Fraction(0, 1),
      femaleShare: new Fraction(0, 1),
      perMaleShare: new Fraction(0, 1),
      perFemaleShare: new Fraction(0, 1),
      totalShares: 0,
    };
  }

  const { maleCount, femaleCount, hasFemales } = asabaInfo;

  if (!hasFemales) {
    // Только мужчины - делят остаток поровну
    const perMaleShare = remainder.divide(new Fraction(maleCount, 1));
    return {
      maleShare: remainder,
      femaleShare: new Fraction(0, 1),
      perMaleShare,
      perFemaleShare: new Fraction(0, 1),
      totalShares: maleCount,
    };
  }

  // Соотношение 2:1 для мужчин и женщин
  // Каждый мужчина = 2 доли, каждая женщина = 1 доля
  const totalShares = maleCount * 2 + femaleCount;
  const shareUnit = remainder.divide(new Fraction(totalShares, 1));

  const perMaleShare = shareUnit.multiply(new Fraction(2, 1));
  const perFemaleShare = shareUnit;

  const maleShare = perMaleShare.multiply(new Fraction(maleCount, 1));
  const femaleShare = perFemaleShare.multiply(new Fraction(femaleCount, 1));

  return {
    maleShare,
    femaleShare,
    perMaleShare,
    perFemaleShare,
    totalShares,
  };
}

/**
 * Рассчитывает сумму фиксированных долей для определения остатка
 * @param {object} heirs - состояние наследников
 * @returns {Fraction} - сумма фиксированных долей
 */
export function calculateFixedSharesTotal(heirs) {
  let total = new Fraction(0, 1);

  // Супруг
  if (heirs.husband) {
    total = total.add(calculateHusbandShare(heirs));
  } else if (heirs.wife) {
    total = total.add(calculateWifeShare(heirs).totalShare);
  }

  // Мать
  if (heirs.mother) {
    total = total.add(calculateMotherShare(heirs));
  }

  // Отец - только фиксированная часть (1/6) если есть потомки
  if (heirs.father) {
    const fatherResult = calculateFatherShare(heirs);
    if (fatherResult.fixedShare) {
      total = total.add(fatherResult.fixedShare);
    }
  }

  // Дед - только если нет отца
  if (heirs.paternalGrandfather && !heirs.father) {
    const grandfatherResult = calculateGrandfatherShare(heirs);
    if (grandfatherResult.fixedShare) {
      total = total.add(grandfatherResult.fixedShare);
    }
  }

  // Бабушки - только если нет матери
  if (
    (heirs.paternalGrandmother || heirs.maternalGrandmother) &&
    !heirs.mother
  ) {
    const grandmotherResult = calculateGrandmotherShare(heirs);
    if (grandmotherResult) {
      total = total.add(grandmotherResult.totalShare);
    }
  }

  // Дочери - только фиксированная доля (если нет сыновей)
  if (heirs.daughters > 0 && heirs.sons === 0) {
    const daughterResult = calculateDaughterShare(heirs);
    if (daughterResult && !daughterResult.isAsaba && daughterResult.share) {
      total = total.add(daughterResult.share);
    }
  }

  // Внучки от сына - только если нет сыновей
  if (heirs.granddaughtersFromSon > 0 && heirs.sons === 0) {
    const granddaughterResult = calculateGranddaughterShare(heirs);
    if (
      granddaughterResult &&
      !granddaughterResult.isAsaba &&
      granddaughterResult.share
    ) {
      total = total.add(granddaughterResult.share);
    }
  }

  // Родные сестры - только если нет родных братьев и не заблокированы
  if (
    heirs.fullSisters > 0 &&
    heirs.fullBrothers === 0 &&
    !heirs.father &&
    heirs.sons === 0 &&
    heirs.grandsonsFromSon === 0
  ) {
    const share = HeirTypes.FULL_SISTER.getShare(heirs);
    if (share) {
      total = total.add(share);
    }
  }

  // Единокровные сестры - только если нет единокровных братьев и не заблокированы
  if (
    heirs.paternalSisters > 0 &&
    heirs.paternalBrothers === 0 &&
    !heirs.father &&
    heirs.sons === 0 &&
    heirs.grandsonsFromSon === 0 &&
    heirs.fullBrothers === 0
  ) {
    const share = HeirTypes.PATERNAL_SISTER.getShare(heirs);
    if (share) {
      total = total.add(share);
    }
  }

  // Единоутробные братья и сестры (при каляля)
  if (!heirs.father && !hasChildren(heirs)) {
    const totalMaternal =
      (heirs.maternalBrothers || 0) + (heirs.maternalSisters || 0);
    if (totalMaternal > 0) {
      const share =
        totalMaternal === 1 ? new Fraction(1, 6) : new Fraction(1, 3);
      total = total.add(share);
    }
  }

  return total;
}

/**
 * Рассчитывает остаток после фиксированных долей
 * @param {object} heirs - состояние наследников
 * @returns {Fraction} - остаток (может быть отрицательным при Авль)
 */
export function calculateRemainder(heirs) {
  const fixedTotal = calculateFixedSharesTotal(heirs);
  const one = new Fraction(1, 1);
  return one.subtract(fixedTotal);
}

/**
 * Полный расчет асаба с учетом всех правил
 * Requirements: 8.1, 8.2
 * @param {object} heirs - состояние наследников
 * @returns {object} - полный результат расчета асаба
 */
export function calculateAsaba(heirs) {
  const asabaInfo = determineAsaba(heirs);
  const remainder = calculateRemainder(heirs);

  // Если остаток отрицательный или нулевой, асаба ничего не получают
  // (будет применяться Авль)
  if (
    !asabaInfo ||
    remainder.lessThan(new Fraction(0, 1)) ||
    remainder.isZero()
  ) {
    return {
      hasAsaba: false,
      asabaInfo: null,
      remainder: remainder,
      distribution: null,
    };
  }

  const distribution = distributeAsaba(remainder, asabaInfo);

  return {
    hasAsaba: true,
    asabaInfo,
    remainder,
    distribution,
  };
}

// ========================================
// Вспомогательные функции для экспорта
// ========================================

// Экспортируем вспомогательные функции для использования в других модулях
export { hasChildren, hasMaleDescendants, hasMultipleSiblings };
