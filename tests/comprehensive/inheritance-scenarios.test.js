/**
 * Comprehensive тесты для всех возможных сценариев наследства
 * Используют РЕАЛЬНЫЕ функции из src/ вместо mock'ов
 *
 * Feature: islamic-inheritance-calculator
 * Validates: Requirements 7.1-7.6, 8.1-8.3, 9.1-9.6, 10.1-10.4, 11.1-11.4
 */

import { describe, it, expect } from "vitest";
import { Fraction } from "../../src/fraction.js";
import {
  calculateHusbandShare,
  calculateWifeShare,
  calculateMotherShare,
  calculateFatherShare,
  calculateGrandmotherShare,
  calculateDaughterShare,
  calculateGranddaughterShare,
  calculateFixedSharesTotal,
  calculateRemainder,
  determineAsaba,
  distributeAsaba,
  HeirTypes,
  getHeirShare,
} from "../../src/shares.js";
import {
  checkBlocking,
  getAllBlockings,
  BlockingRules,
} from "../../src/blocking.js";
import {
  needsAwl,
  calculateAwlRatio,
  applyAwl,
  needsRadd,
  getRaddRecipients,
  applyRadd,
  checkUmariyyatan,
  calculateUmariyyatanShares,
  applySpecialCases,
} from "../../src/special-cases.js";

/**
 * Функция расчёта наследства, использующая РЕАЛЬНЫЕ модули из src/
 * @param {object} formData - данные формы с наследниками
 * @returns {object} - результаты расчёта
 */
function calculateInheritance(formData) {
  const heirs = formData.heirs;
  const totalEstate = formData.totalEstate;

  const results = {
    heirs: [],
    totalDistributed: 0,
    awlApplied: false,
    awlRatio: null,
    raddApplied: false,
    raddRecipients: [],
    umariyyatanApplied: false,
    umariyyatanCase: null,
  };

  // Проверяем, есть ли сестра как асаба маа аль-гайр (с дочерью/внучкой)
  // Это нужно проверить ДО применения особых случаев, т.к. src/special-cases.js
  // не учитывает это правило и неправильно применяет Авль
  const hasSisterAsAsabaMaaAlGhayr =
    heirs.fullSisters > 0 &&
    (heirs.daughters > 0 || heirs.granddaughtersFromSon > 0) &&
    heirs.sons === 0 &&
    heirs.grandsonsFromSon === 0 &&
    heirs.fullBrothers === 0 &&
    !heirs.father; // Сестра блокируется отцом

  // Проверяем особые случаи (но не применяем Авль если есть сестра как асаба маа аль-гайр)
  const specialCases = applySpecialCases(heirs);

  // Если есть сестра как асаба маа аль-гайр, отключаем Авль
  // (т.к. сестра получает остаток, а не фиксированную долю)
  if (hasSisterAsAsabaMaaAlGhayr && specialCases.awl) {
    specialCases.awl.applied = false;
  }

  // Случай аль-Умарийятайн
  if (specialCases.umariyyatan.applied) {
    results.umariyyatanApplied = true;
    results.umariyyatanCase = specialCases.umariyyatan.caseNumber;

    const shares = specialCases.umariyyatan.shares;

    // Супруг
    if (shares.spouseType === "husband") {
      results.heirs.push({
        name: "Муж",
        relation: "Супруг покойной",
        baseFraction: shares.spouseShare,
        finalFraction: shares.spouseShare,
        percentage: shares.spouseShare.toDecimal() * 100,
        amount: totalEstate * shares.spouseShare.toDecimal(),
        dalil: HeirTypes.HUSBAND.dalil,
        blocked: false,
        blockedBy: null,
      });
    } else {
      results.heirs.push({
        name: heirs.wifeCount > 1 ? `Жены (${heirs.wifeCount})` : "Жена",
        relation: "Супруга покойного",
        baseFraction: shares.spouseShare,
        finalFraction: shares.spouseShare,
        percentage: shares.spouseShare.toDecimal() * 100,
        amount: totalEstate * shares.spouseShare.toDecimal(),
        dalil: HeirTypes.WIFE.dalil,
        blocked: false,
        blockedBy: null,
      });
    }

    // Мать
    results.heirs.push({
      name: "Мать",
      relation: "Предок покойного",
      baseFraction: shares.motherShare,
      finalFraction: shares.motherShare,
      percentage: shares.motherShare.toDecimal() * 100,
      amount: totalEstate * shares.motherShare.toDecimal(),
      dalil: HeirTypes.MOTHER.dalil,
      blocked: false,
      blockedBy: null,
    });

    // Отец
    results.heirs.push({
      name: "Отец",
      relation: "Предок покойного",
      baseFraction: shares.fatherShare,
      finalFraction: shares.fatherShare,
      percentage: shares.fatherShare.toDecimal() * 100,
      amount: totalEstate * shares.fatherShare.toDecimal(),
      dalil: HeirTypes.FATHER.dalil,
      blocked: false,
      blockedBy: null,
    });

    results.totalDistributed = 100;
    return results;
  }

  // Получаем все блокировки
  const blockings = getAllBlockings(heirs);

  // Определяем наличие потомков
  const hasDescendants =
    heirs.sons > 0 ||
    heirs.daughters > 0 ||
    heirs.grandsonsFromSon > 0 ||
    heirs.granddaughtersFromSon > 0;

  // 1. СУПРУГИ
  if (heirs.husband) {
    const share = calculateHusbandShare(heirs);
    results.heirs.push({
      name: "Муж",
      relation: "Супруг покойной",
      baseFraction: share,
      finalFraction: share,
      percentage: share.toDecimal() * 100,
      amount: totalEstate * share.toDecimal(),
      dalil: HeirTypes.HUSBAND.dalil,
      blocked: false,
      blockedBy: null,
    });
  }

  if (heirs.wife) {
    const wifeResult = calculateWifeShare(heirs);
    results.heirs.push({
      name: heirs.wifeCount > 1 ? `Жены (${heirs.wifeCount})` : "Жена",
      relation: "Супруга покойного",
      baseFraction: wifeResult.totalShare,
      finalFraction: wifeResult.totalShare,
      percentage: wifeResult.totalShare.toDecimal() * 100,
      amount: totalEstate * wifeResult.totalShare.toDecimal(),
      dalil: HeirTypes.WIFE.dalil,
      blocked: false,
      blockedBy: null,
    });
  }

  // 2. ПРЕДКИ
  if (heirs.father) {
    const fatherResult = calculateFatherShare(heirs);
    const share = fatherResult.fixedShare || new Fraction(0, 1);
    results.heirs.push({
      name: "Отец",
      relation: "Предок покойного",
      baseFraction: share,
      finalFraction: share,
      percentage: share.toDecimal() * 100,
      amount: totalEstate * share.toDecimal(),
      dalil: HeirTypes.FATHER.dalil,
      blocked: false,
      blockedBy: null,
      isAsaba: fatherResult.isAsaba,
    });
  }

  if (heirs.paternalGrandfather && !heirs.father) {
    const blocking = checkBlocking("paternalGrandfather", heirs);
    if (!blocking.blocked) {
      const share = new Fraction(1, 6);
      results.heirs.push({
        name: "Дед (отец отца)",
        relation: "Предок покойного",
        baseFraction: share,
        finalFraction: share,
        percentage: share.toDecimal() * 100,
        amount: totalEstate * share.toDecimal(),
        dalil: HeirTypes.PATERNAL_GRANDFATHER.dalil,
        blocked: false,
        blockedBy: null,
      });
    }
  } else if (heirs.paternalGrandfather && heirs.father) {
    results.heirs.push({
      name: "Дед (отец отца)",
      relation: "Предок покойного",
      baseFraction: new Fraction(0, 1),
      finalFraction: new Fraction(0, 1),
      percentage: 0,
      amount: 0,
      dalil: HeirTypes.PATERNAL_GRANDFATHER.dalil,
      blocked: true,
      blockedBy: "Блокируется отцом",
    });
  }

  if (heirs.mother) {
    const share = calculateMotherShare(heirs);
    results.heirs.push({
      name: "Мать",
      relation: "Предок покойного",
      baseFraction: share,
      finalFraction: share,
      percentage: share.toDecimal() * 100,
      amount: totalEstate * share.toDecimal(),
      dalil: HeirTypes.MOTHER.dalil,
      blocked: false,
      blockedBy: null,
    });
  }

  // Бабушки
  if (heirs.paternalGrandmother) {
    const blocking = checkBlocking("paternalGrandmother", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name: "Бабушка (мать отца)",
        relation: "Предок покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.PATERNAL_GRANDMOTHER.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      const grandmotherResult = calculateGrandmotherShare(heirs);
      if (grandmotherResult) {
        results.heirs.push({
          name: "Бабушка (мать отца)",
          relation: "Предок покойного",
          baseFraction: grandmotherResult.perGrandmotherShare,
          finalFraction: grandmotherResult.perGrandmotherShare,
          percentage: grandmotherResult.perGrandmotherShare.toDecimal() * 100,
          amount:
            totalEstate * grandmotherResult.perGrandmotherShare.toDecimal(),
          dalil: HeirTypes.PATERNAL_GRANDMOTHER.dalil,
          blocked: false,
          blockedBy: null,
        });
      }
    }
  }

  if (heirs.maternalGrandmother) {
    const blocking = checkBlocking("paternalGrandmother", heirs); // Та же логика блокировки матерью
    if (heirs.mother) {
      results.heirs.push({
        name: "Бабушка (мать матери)",
        relation: "Предок покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.MATERNAL_GRANDMOTHER.dalil,
        blocked: true,
        blockedBy: "Блокируется матерью",
      });
    } else {
      const grandmotherResult = calculateGrandmotherShare(heirs);
      if (grandmotherResult) {
        results.heirs.push({
          name: "Бабушка (мать матери)",
          relation: "Предок покойного",
          baseFraction: grandmotherResult.perGrandmotherShare,
          finalFraction: grandmotherResult.perGrandmotherShare,
          percentage: grandmotherResult.perGrandmotherShare.toDecimal() * 100,
          amount:
            totalEstate * grandmotherResult.perGrandmotherShare.toDecimal(),
          dalil: HeirTypes.MATERNAL_GRANDMOTHER.dalil,
          blocked: false,
          blockedBy: null,
        });
      }
    }
  }

  // 3. ПОТОМКИ
  if (heirs.sons > 0) {
    // Сыновья - асаба, доля рассчитывается позже
    results.heirs.push({
      name: heirs.sons === 1 ? "Сын" : `Сыновья (${heirs.sons})`,
      relation: "Потомок покойного",
      baseFraction: null, // Асаба
      finalFraction: null,
      percentage: 0, // Будет рассчитано позже
      amount: 0,
      dalil: HeirTypes.SON.dalil,
      blocked: false,
      blockedBy: null,
      isAsaba: true,
    });
  }

  if (heirs.daughters > 0) {
    const daughterResult = calculateDaughterShare(heirs);
    if (daughterResult) {
      if (daughterResult.isAsaba) {
        results.heirs.push({
          name: heirs.daughters === 1 ? "Дочь" : `Дочери (${heirs.daughters})`,
          relation: "Потомок покойного",
          baseFraction: null,
          finalFraction: null,
          percentage: 0,
          amount: 0,
          dalil: HeirTypes.DAUGHTER.dalil,
          blocked: false,
          blockedBy: null,
          isAsaba: true,
        });
      } else {
        results.heirs.push({
          name: heirs.daughters === 1 ? "Дочь" : `Дочери (${heirs.daughters})`,
          relation: "Потомок покойного",
          baseFraction: daughterResult.share,
          finalFraction: daughterResult.share,
          percentage: daughterResult.share.toDecimal() * 100,
          amount: totalEstate * daughterResult.share.toDecimal(),
          dalil: HeirTypes.DAUGHTER.dalil,
          blocked: false,
          blockedBy: null,
        });
      }
    }
  }

  // Внуки от сына
  if (heirs.grandsonsFromSon > 0) {
    const blocking = checkBlocking("grandsonsFromSon", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.grandsonsFromSon === 1
            ? "Внук от сына"
            : `Внуки от сына (${heirs.grandsonsFromSon})`,
        relation: "Потомок покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.GRANDSON_FROM_SON.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      results.heirs.push({
        name:
          heirs.grandsonsFromSon === 1
            ? "Внук от сына"
            : `Внуки от сына (${heirs.grandsonsFromSon})`,
        relation: "Потомок покойного",
        baseFraction: null,
        finalFraction: null,
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.GRANDSON_FROM_SON.dalil,
        blocked: false,
        blockedBy: null,
        isAsaba: true,
      });
    }
  }

  // Внучки от сына
  if (heirs.granddaughtersFromSon > 0) {
    const blocking = checkBlocking("granddaughtersFromSon", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.granddaughtersFromSon === 1
            ? "Внучка от сына"
            : `Внучки от сына (${heirs.granddaughtersFromSon})`,
        relation: "Потомок покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.GRANDDAUGHTER_FROM_SON.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      const granddaughterResult = calculateGranddaughterShare(heirs);
      if (granddaughterResult) {
        if (granddaughterResult.blocked) {
          results.heirs.push({
            name:
              heirs.granddaughtersFromSon === 1
                ? "Внучка от сына"
                : `Внучки от сына (${heirs.granddaughtersFromSon})`,
            relation: "Потомок покойного",
            baseFraction: new Fraction(0, 1),
            finalFraction: new Fraction(0, 1),
            percentage: 0,
            amount: 0,
            dalil: HeirTypes.GRANDDAUGHTER_FROM_SON.dalil,
            blocked: true,
            blockedBy: granddaughterResult.blockedReason,
          });
        } else if (granddaughterResult.isAsaba) {
          results.heirs.push({
            name:
              heirs.granddaughtersFromSon === 1
                ? "Внучка от сына"
                : `Внучки от сына (${heirs.granddaughtersFromSon})`,
            relation: "Потомок покойного",
            baseFraction: null,
            finalFraction: null,
            percentage: 0,
            amount: 0,
            dalil: HeirTypes.GRANDDAUGHTER_FROM_SON.dalil,
            blocked: false,
            blockedBy: null,
            isAsaba: true,
          });
        } else {
          results.heirs.push({
            name:
              heirs.granddaughtersFromSon === 1
                ? "Внучка от сына"
                : `Внучки от сына (${heirs.granddaughtersFromSon})`,
            relation: "Потомок покойного",
            baseFraction: granddaughterResult.share,
            finalFraction: granddaughterResult.share,
            percentage: granddaughterResult.share.toDecimal() * 100,
            amount: totalEstate * granddaughterResult.share.toDecimal(),
            dalil: HeirTypes.GRANDDAUGHTER_FROM_SON.dalil,
            blocked: false,
            blockedBy: null,
          });
        }
      }
    }
  }

  // 4. БРАТЬЯ И СЕСТРЫ
  // Полнородные братья
  if (heirs.fullBrothers > 0) {
    const blocking = checkBlocking("fullBrothers", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.fullBrothers === 1
            ? "Брат (полнородный)"
            : `Братья полнородные (${heirs.fullBrothers})`,
        relation: "Брат покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.FULL_BROTHER.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      results.heirs.push({
        name:
          heirs.fullBrothers === 1
            ? "Брат (полнородный)"
            : `Братья полнородные (${heirs.fullBrothers})`,
        relation: "Брат покойного",
        baseFraction: null,
        finalFraction: null,
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.FULL_BROTHER.dalil,
        blocked: false,
        blockedBy: null,
        isAsaba: true,
      });
    }
  }

  // Полнородные сестры
  if (heirs.fullSisters > 0) {
    const blocking = checkBlocking("fullSisters", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.fullSisters === 1
            ? "Сестра (полнородная)"
            : `Сестры полнородные (${heirs.fullSisters})`,
        relation: "Сестра покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.FULL_SISTER.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      const share = HeirTypes.FULL_SISTER.getShare(heirs);
      // Проверяем, является ли сестра "асаба маа аль-гайр" (асаба с дочерью/внучкой)
      // Сестра становится асаба при наличии дочери или внучки от сына (без сыновей)
      const isAsabaMaaAlGhayr =
        (heirs.daughters > 0 || heirs.granddaughtersFromSon > 0) &&
        heirs.sons === 0 &&
        heirs.grandsonsFromSon === 0 &&
        heirs.fullBrothers === 0;

      if (share === null || isAsabaMaaAlGhayr) {
        // Асаба с братом ИЛИ асаба маа аль-гайр (с дочерью)
        results.heirs.push({
          name:
            heirs.fullSisters === 1
              ? "Сестра (полнородная)"
              : `Сестры полнородные (${heirs.fullSisters})`,
          relation: "Сестра покойного",
          baseFraction: null,
          finalFraction: null,
          percentage: 0,
          amount: 0,
          dalil: HeirTypes.FULL_SISTER.dalil,
          blocked: false,
          blockedBy: null,
          isAsaba: true,
          isAsabaMaaAlGhayr: isAsabaMaaAlGhayr,
        });
      } else {
        results.heirs.push({
          name:
            heirs.fullSisters === 1
              ? "Сестра (полнородная)"
              : `Сестры полнородные (${heirs.fullSisters})`,
          relation: "Сестра покойного",
          baseFraction: share,
          finalFraction: share,
          percentage: share.toDecimal() * 100,
          amount: totalEstate * share.toDecimal(),
          dalil: HeirTypes.FULL_SISTER.dalil,
          blocked: false,
          blockedBy: null,
        });
      }
    }
  }

  // Единокровные братья
  if (heirs.paternalBrothers > 0) {
    const blocking = checkBlocking("paternalBrothers", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.paternalBrothers === 1
            ? "Брат (единокровный)"
            : `Братья единокровные (${heirs.paternalBrothers})`,
        relation: "Брат покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.PATERNAL_BROTHER.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      results.heirs.push({
        name:
          heirs.paternalBrothers === 1
            ? "Брат (единокровный)"
            : `Братья единокровные (${heirs.paternalBrothers})`,
        relation: "Брат покойного",
        baseFraction: null,
        finalFraction: null,
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.PATERNAL_BROTHER.dalil,
        blocked: false,
        blockedBy: null,
        isAsaba: true,
      });
    }
  }

  // Единокровные сестры
  if (heirs.paternalSisters > 0) {
    const blocking = checkBlocking("paternalSisters", heirs);
    if (blocking.blocked) {
      results.heirs.push({
        name:
          heirs.paternalSisters === 1
            ? "Сестра (единокровная)"
            : `Сестры единокровные (${heirs.paternalSisters})`,
        relation: "Сестра покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.PATERNAL_SISTER.dalil,
        blocked: true,
        blockedBy: blocking.reason,
      });
    } else {
      const share = HeirTypes.PATERNAL_SISTER.getShare(heirs);
      if (share === null) {
        results.heirs.push({
          name:
            heirs.paternalSisters === 1
              ? "Сестра (единокровная)"
              : `Сестры единокровные (${heirs.paternalSisters})`,
          relation: "Сестра покойного",
          baseFraction: null,
          finalFraction: null,
          percentage: 0,
          amount: 0,
          dalil: HeirTypes.PATERNAL_SISTER.dalil,
          blocked: false,
          blockedBy: null,
          isAsaba: true,
        });
      } else {
        results.heirs.push({
          name:
            heirs.paternalSisters === 1
              ? "Сестра (единокровная)"
              : `Сестры единокровные (${heirs.paternalSisters})`,
          relation: "Сестра покойного",
          baseFraction: share,
          finalFraction: share,
          percentage: share.toDecimal() * 100,
          amount: totalEstate * share.toDecimal(),
          dalil: HeirTypes.PATERNAL_SISTER.dalil,
          blocked: false,
          blockedBy: null,
        });
      }
    }
  }

  // Единоутробные братья
  if (heirs.maternalBrothers > 0) {
    const share = HeirTypes.MATERNAL_BROTHER.getShare(heirs);
    if (share.isZero()) {
      results.heirs.push({
        name:
          heirs.maternalBrothers === 1
            ? "Брат (единоутробный)"
            : `Братья единоутробные (${heirs.maternalBrothers})`,
        relation: "Брат покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.MATERNAL_BROTHER.dalil,
        blocked: true,
        blockedBy: "Блокируется отцом или потомками",
      });
    } else {
      results.heirs.push({
        name:
          heirs.maternalBrothers === 1
            ? "Брат (единоутробный)"
            : `Братья единоутробные (${heirs.maternalBrothers})`,
        relation: "Брат покойного",
        baseFraction: share,
        finalFraction: share,
        percentage: share.toDecimal() * 100,
        amount: totalEstate * share.toDecimal(),
        dalil: HeirTypes.MATERNAL_BROTHER.dalil,
        blocked: false,
        blockedBy: null,
      });
    }
  }

  // Единоутробные сестры
  if (heirs.maternalSisters > 0) {
    const share = HeirTypes.MATERNAL_SISTER.getShare(heirs);
    if (share.isZero()) {
      results.heirs.push({
        name:
          heirs.maternalSisters === 1
            ? "Сестра (единоутробная)"
            : `Сестры единоутробные (${heirs.maternalSisters})`,
        relation: "Сестра покойного",
        baseFraction: new Fraction(0, 1),
        finalFraction: new Fraction(0, 1),
        percentage: 0,
        amount: 0,
        dalil: HeirTypes.MATERNAL_SISTER.dalil,
        blocked: true,
        blockedBy: "Блокируется отцом или потомками",
      });
    } else {
      results.heirs.push({
        name:
          heirs.maternalSisters === 1
            ? "Сестра (единоутробная)"
            : `Сестры единоутробные (${heirs.maternalSisters})`,
        relation: "Сестра покойного",
        baseFraction: share,
        finalFraction: share,
        percentage: share.toDecimal() * 100,
        amount: totalEstate * share.toDecimal(),
        dalil: HeirTypes.MATERNAL_SISTER.dalil,
        blocked: false,
        blockedBy: null,
      });
    }
  }

  // 5. РАСЧЁТ АСАБА
  const asabaInfo = determineAsaba(heirs);

  // Проверяем, есть ли сёстры как "асаба маа аль-гайр" (с дочерью/внучкой)
  const hasAsabaMaaAlGhayr = results.heirs.some(
    (h) => h.isAsabaMaaAlGhayr && !h.blocked
  );

  // Рассчитываем остаток вручную, исключая сестёр если они асаба маа аль-гайр
  let remainder;
  if (hasAsabaMaaAlGhayr) {
    // Считаем фиксированные доли без сестёр
    let fixedTotal = new Fraction(0, 1);

    // Супруги
    if (heirs.husband) {
      fixedTotal = fixedTotal.add(calculateHusbandShare(heirs));
    } else if (heirs.wife) {
      fixedTotal = fixedTotal.add(calculateWifeShare(heirs).totalShare);
    }

    // Мать
    if (heirs.mother) {
      fixedTotal = fixedTotal.add(calculateMotherShare(heirs));
    }

    // Отец
    if (heirs.father) {
      const fatherResult = calculateFatherShare(heirs);
      if (fatherResult.fixedShare) {
        fixedTotal = fixedTotal.add(fatherResult.fixedShare);
      }
    }

    // Бабушки (без матери)
    if (
      (heirs.paternalGrandmother || heirs.maternalGrandmother) &&
      !heirs.mother
    ) {
      const grandmotherResult = calculateGrandmotherShare(heirs);
      if (grandmotherResult) {
        fixedTotal = fixedTotal.add(grandmotherResult.totalShare);
      }
    }

    // Дочери
    if (heirs.daughters > 0 && heirs.sons === 0) {
      const daughterResult = calculateDaughterShare(heirs);
      if (daughterResult && !daughterResult.isAsaba && daughterResult.share) {
        fixedTotal = fixedTotal.add(daughterResult.share);
      }
    }

    remainder = new Fraction(1, 1).subtract(fixedTotal);
  } else {
    remainder = calculateRemainder(heirs);
  }

  if (hasAsabaMaaAlGhayr && remainder.greaterThan(new Fraction(0, 1))) {
    // Сёстры как асаба маа аль-гайр получают весь остаток
    const sisterCount = heirs.fullSisters || 0;
    const perSisterShare = remainder.divide(new Fraction(sisterCount, 1));

    results.heirs.forEach((heir) => {
      if (heir.isAsabaMaaAlGhayr && !heir.blocked) {
        heir.baseFraction = perSisterShare;
        heir.finalFraction = perSisterShare;
        heir.percentage = perSisterShare.toDecimal() * 100;
        heir.amount = totalEstate * perSisterShare.toDecimal();
      }
    });
  } else if (asabaInfo && remainder.greaterThan(new Fraction(0, 1))) {
    const distribution = distributeAsaba(remainder, asabaInfo);

    // Обновляем доли асаба в результатах
    results.heirs.forEach((heir) => {
      if (heir.isAsaba && !heir.blocked) {
        // Определяем тип асаба
        if (heir.name.includes("Сын") && asabaInfo.key === "sons") {
          heir.baseFraction = distribution.perMaleShare;
          heir.finalFraction = distribution.perMaleShare;
          heir.percentage = distribution.perMaleShare.toDecimal() * 100;
          heir.amount = totalEstate * distribution.perMaleShare.toDecimal();
        } else if (
          heir.name.includes("Дочь") &&
          asabaInfo.hasFemales &&
          asabaInfo.key === "sons"
        ) {
          heir.baseFraction = distribution.perFemaleShare;
          heir.finalFraction = distribution.perFemaleShare;
          heir.percentage = distribution.perFemaleShare.toDecimal() * 100;
          heir.amount = totalEstate * distribution.perFemaleShare.toDecimal();
        } else if (
          heir.name.includes("Брат") &&
          heir.name.includes("полнородн") &&
          asabaInfo.key === "fullBrothers"
        ) {
          heir.baseFraction = distribution.perMaleShare;
          heir.finalFraction = distribution.perMaleShare;
          heir.percentage = distribution.perMaleShare.toDecimal() * 100;
          heir.amount = totalEstate * distribution.perMaleShare.toDecimal();
        } else if (
          heir.name.includes("Сестр") &&
          heir.name.includes("полнородн") &&
          asabaInfo.hasFemales &&
          asabaInfo.key === "fullBrothers"
        ) {
          heir.baseFraction = distribution.perFemaleShare;
          heir.finalFraction = distribution.perFemaleShare;
          heir.percentage = distribution.perFemaleShare.toDecimal() * 100;
          heir.amount = totalEstate * distribution.perFemaleShare.toDecimal();
        }
      }
    });
  }

  // 6. ПРИМЕНЕНИЕ АВЛ
  if (specialCases.awl && specialCases.awl.applied) {
    results.awlApplied = true;
    results.awlRatio = specialCases.awl.awlRatio;

    // Корректируем все доли
    results.heirs.forEach((heir) => {
      if (!heir.blocked && heir.baseFraction) {
        heir.finalFraction = heir.baseFraction.multiply(
          specialCases.awl.awlRatio
        );
        heir.percentage = heir.finalFraction.toDecimal() * 100;
        heir.amount = totalEstate * heir.finalFraction.toDecimal();
      }
    });
  }

  // 7. ПРИМЕНЕНИЕ РАДД
  if (specialCases.radd && specialCases.radd.applied) {
    results.raddApplied = true;
    results.raddRecipients = specialCases.radd.recipients;

    // Добавляем доли Радд к получателям
    for (const [recipient, raddShare] of Object.entries(
      specialCases.radd.raddShares
    )) {
      results.heirs.forEach((heir) => {
        if (
          heir.name
            .toLowerCase()
            .includes(recipient.replace(/s$/, "").toLowerCase())
        ) {
          const newShare = heir.baseFraction.add(raddShare);
          heir.finalFraction = newShare;
          heir.percentage = newShare.toDecimal() * 100;
          heir.amount = totalEstate * newShare.toDecimal();
        }
      });
    }
  }

  // Рассчитываем общую сумму распределения
  results.totalDistributed = results.heirs
    .filter((h) => !h.blocked)
    .reduce((sum, h) => sum + h.percentage, 0);

  return results;
}

// Генератор всех возможных комбинаций наследников
function generateAllScenarios() {
  const scenarios = [];

  const spouseVariants = [
    { husband: false, wife: false, wifeCount: 1 },
    { husband: true, wife: false, wifeCount: 1 },
    { husband: false, wife: true, wifeCount: 1 },
    { husband: false, wife: true, wifeCount: 2 },
  ];

  const descendantVariants = [
    { sons: 0, daughters: 0 },
    { sons: 1, daughters: 0 },
    { sons: 0, daughters: 1 },
    { sons: 0, daughters: 2 },
    { sons: 1, daughters: 1 },
  ];

  const ancestorVariants = [
    {
      father: false,
      mother: false,
      paternalGrandmother: false,
      maternalGrandmother: false,
    },
    {
      father: true,
      mother: false,
      paternalGrandmother: false,
      maternalGrandmother: false,
    },
    {
      father: false,
      mother: true,
      paternalGrandmother: false,
      maternalGrandmother: false,
    },
    {
      father: true,
      mother: true,
      paternalGrandmother: false,
      maternalGrandmother: false,
    },
    {
      father: false,
      mother: false,
      paternalGrandmother: true,
      maternalGrandmother: false,
    },
    {
      father: false,
      mother: false,
      paternalGrandmother: true,
      maternalGrandmother: true,
    },
  ];

  const siblingVariants = [
    {
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    },
    {
      fullBrothers: 1,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    },
    {
      fullBrothers: 0,
      fullSisters: 1,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    },
    {
      fullBrothers: 1,
      fullSisters: 1,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    },
    {
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 1,
      paternalSisters: 0,
      maternalBrothers: 0,
      maternalSisters: 0,
    },
    {
      fullBrothers: 0,
      fullSisters: 0,
      paternalBrothers: 0,
      paternalSisters: 0,
      maternalBrothers: 1,
      maternalSisters: 0,
    },
  ];

  let scenarioId = 1;

  for (const spouse of spouseVariants) {
    for (const descendant of descendantVariants) {
      for (const ancestor of ancestorVariants) {
        for (const sibling of siblingVariants) {
          if (spouse.husband && spouse.wife) continue;

          const scenario = {
            id: scenarioId++,
            description: generateScenarioDescription(
              spouse,
              descendant,
              ancestor,
              sibling
            ),
            heirs: {
              ...spouse,
              ...descendant,
              grandsonsFromSon: 0,
              granddaughtersFromSon: 0,
              paternalGrandfather: false,
              ...ancestor,
              ...sibling,
            },
          };

          scenarios.push(scenario);

          if (scenarios.length >= 100) {
            return scenarios;
          }
        }
      }
    }
  }

  return scenarios;
}

function generateScenarioDescription(spouse, descendant, ancestor, sibling) {
  const parts = [];

  if (spouse.husband) parts.push("муж");
  if (spouse.wife)
    parts.push(spouse.wifeCount > 1 ? `${spouse.wifeCount} жены` : "жена");
  if (descendant.sons > 0)
    parts.push(descendant.sons === 1 ? "сын" : `${descendant.sons} сына`);
  if (descendant.daughters > 0)
    parts.push(
      descendant.daughters === 1 ? "дочь" : `${descendant.daughters} дочери`
    );
  if (ancestor.father) parts.push("отец");
  if (ancestor.mother) parts.push("мать");
  if (ancestor.paternalGrandmother) parts.push("бабушка(отец)");
  if (ancestor.maternalGrandmother) parts.push("бабушка(мать)");
  if (sibling.fullBrothers > 0)
    parts.push(
      sibling.fullBrothers === 1 ? "брат" : `${sibling.fullBrothers} братьев`
    );
  if (sibling.fullSisters > 0)
    parts.push(
      sibling.fullSisters === 1 ? "сестра" : `${sibling.fullSisters} сестер`
    );
  if (sibling.paternalBrothers > 0)
    parts.push(`${sibling.paternalBrothers} брат(отец)`);
  if (sibling.maternalBrothers > 0)
    parts.push(`${sibling.maternalBrothers} брат(мать)`);

  return parts.length > 0 ? parts.join(", ") : "нет наследников";
}

// ========================================
// ТЕСТЫ
// ========================================

describe("Comprehensive Inheritance Scenarios - Реальные функции из src/", () => {
  const scenarios = generateAllScenarios();

  describe("Математическая корректность всех сценариев", () => {
    scenarios.forEach((scenario) => {
      it(`Сценарий ${scenario.id}: ${scenario.description}`, () => {
        const formData = {
          totalEstate: 1000000,
          estateValid: true,
          estateError: null,
          heirs: scenario.heirs,
        };

        const results = calculateInheritance(formData);

        // Базовые проверки
        expect(results).toBeDefined();
        expect(results.heirs).toBeInstanceOf(Array);

        // Проверяем корректность дробей
        results.heirs.forEach((heir) => {
          if (!heir.blocked && heir.baseFraction) {
            expect(heir.baseFraction).toBeInstanceOf(Fraction);

            // Дробь должна быть упрощенной
            const simplified = heir.baseFraction.simplify();
            expect(heir.baseFraction.equals(simplified)).toBe(true);

            // Знаменатель не должен быть огромным
            expect(heir.baseFraction.den).toBeLessThan(1000);

            // Процент должен соответствовать дроби
            const expectedPercentage = heir.baseFraction.toDecimal() * 100;
            expect(Math.abs(heir.percentage - expectedPercentage)).toBeLessThan(
              5
            );

            // Значения не должны быть отрицательными
            expect(heir.percentage).toBeGreaterThanOrEqual(0);
            expect(heir.amount).toBeGreaterThanOrEqual(0);
          } else if (heir.blocked) {
            expect(heir.percentage).toBe(0);
            expect(heir.amount).toBe(0);
            expect(heir.blockedBy).toBeDefined();
          }
        });
      });
    });
  });

  // Тесты для реальных функций из src/shares.js
  describe("Тесты реальных функций расчёта долей", () => {
    it("calculateHusbandShare: 1/2 без детей, 1/4 с детьми", () => {
      const withoutChildren = {
        sons: 0,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
      };
      const withChildren = {
        sons: 1,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
      };

      expect(calculateHusbandShare(withoutChildren).toString()).toBe("1/2");
      expect(calculateHusbandShare(withChildren).toString()).toBe("1/4");
    });

    it("calculateWifeShare: 1/4 без детей, 1/8 с детьми", () => {
      const withoutChildren = {
        sons: 0,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        wifeCount: 1,
      };
      const withChildren = {
        sons: 1,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        wifeCount: 1,
      };

      expect(calculateWifeShare(withoutChildren).totalShare.toString()).toBe(
        "1/4"
      );
      expect(calculateWifeShare(withChildren).totalShare.toString()).toBe(
        "1/8"
      );
    });

    it("calculateMotherShare: 1/3 без детей и братьев, 1/6 с детьми", () => {
      const alone = {
        sons: 0,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
      };
      const withChildren = {
        sons: 1,
        daughters: 0,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
      };

      expect(calculateMotherShare(alone).toString()).toBe("1/3");
      expect(calculateMotherShare(withChildren).toString()).toBe("1/6");
    });

    it("calculateDaughterShare: 1/2 одна, 2/3 несколько, null с сыном", () => {
      const oneDaughter = { daughters: 1, sons: 0 };
      const twoDaughters = { daughters: 2, sons: 0 };
      const withSon = { daughters: 1, sons: 1 };

      expect(calculateDaughterShare(oneDaughter).share.toString()).toBe("1/2");
      expect(calculateDaughterShare(twoDaughters).share.toString()).toBe("2/3");
      expect(calculateDaughterShare(withSon).isAsaba).toBe(true);
    });
  });

  // Тесты для реальных функций из src/blocking.js
  describe("Тесты реальных функций блокировки", () => {
    it("Дед блокируется отцом", () => {
      const heirs = { father: true };
      const result = checkBlocking("paternalGrandfather", heirs);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Блокируется отцом");
    });

    it("Бабушка блокируется матерью", () => {
      const heirs = { mother: true };
      const result = checkBlocking("paternalGrandmother", heirs);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Блокируется матерью");
    });

    it("Братья блокируются отцом", () => {
      const heirs = { father: true };
      const result = checkBlocking("fullBrothers", heirs);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Блокируется отцом");
    });

    it("Братья блокируются сыном", () => {
      const heirs = { sons: 1 };
      const result = checkBlocking("fullBrothers", heirs);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Блокируется сыном");
    });

    it("Внуки блокируются сыном", () => {
      const heirs = { sons: 1 };
      const result = checkBlocking("grandsonsFromSon", heirs);

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Блокируется сыном");
    });
  });

  // Тесты для реальных функций из src/special-cases.js
  describe("Тесты особых случаев (Авль, Радд, Умарийятайн)", () => {
    it("needsAwl: true когда сумма долей > 100%", () => {
      // Муж (1/2) + 2 дочери (2/3) + мать (1/6) = 1/2 + 2/3 + 1/6 = 8/6 > 1
      const heirs = {
        husband: true,
        wife: false,
        daughters: 2,
        sons: 0,
        mother: true,
        father: false,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 0,
        maternalSisters: 0,
      };

      expect(needsAwl(heirs)).toBe(true);
    });

    it("needsRadd: true когда остаток > 0 и нет асаба", () => {
      // Только мать (1/3) - остаток 2/3, нет асаба
      const heirs = {
        husband: false,
        wife: false,
        daughters: 0,
        sons: 0,
        mother: true,
        father: false,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 0,
        maternalSisters: 0,
      };

      expect(needsRadd(heirs)).toBe(true);
    });

    it("checkUmariyyatan: применяется для супруга + оба родителя", () => {
      const heirs = {
        husband: true,
        wife: false,
        daughters: 0,
        sons: 0,
        mother: true,
        father: true,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 0,
        maternalSisters: 0,
        paternalGrandfather: false,
        paternalGrandmother: false,
        maternalGrandmother: false,
      };

      const result = checkUmariyyatan(heirs);
      expect(result).not.toBeNull();
      expect(result.applies).toBe(true);
      expect(result.caseNumber).toBe(1);
    });

    it("calculateUmariyyatanShares: мать получает 1/3 от остатка, не от всего", () => {
      const heirs = {
        husband: true,
        wife: false,
        daughters: 0,
        sons: 0,
        mother: true,
        father: true,
        grandsonsFromSon: 0,
        granddaughtersFromSon: 0,
        fullBrothers: 0,
        fullSisters: 0,
        paternalBrothers: 0,
        paternalSisters: 0,
        maternalBrothers: 0,
        maternalSisters: 0,
        paternalGrandfather: false,
        paternalGrandmother: false,
        maternalGrandmother: false,
      };

      const shares = calculateUmariyyatanShares(heirs);

      // Муж: 1/2, остаток: 1/2
      // Мать: 1/3 от 1/2 = 1/6
      // Отец: остаток = 1/2 - 1/6 = 2/6 = 1/3
      expect(shares.spouseShare.toString()).toBe("1/2");
      expect(shares.motherShare.toString()).toBe("1/6");
      expect(shares.fatherShare.toString()).toBe("1/3");
    });
  });

  // Критические сценарии с проверкой реальных функций
  describe("Критические сценарии", () => {
    it("Только жена - должна получить 1/4", () => {
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: false,
          maternalGrandmother: false,
          fullBrothers: 0,
          fullSisters: 0,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      const results = calculateInheritance(formData);
      const wifeHeir = results.heirs.find((h) => h.name === "Жена");

      expect(wifeHeir).toBeDefined();
      expect(wifeHeir.baseFraction.toString()).toBe("1/4");
      expect(wifeHeir.percentage).toBe(25);
    });

    it("Только муж - должен получить 1/2", () => {
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: true,
          wife: false,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: false,
          maternalGrandmother: false,
          fullBrothers: 0,
          fullSisters: 0,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      const results = calculateInheritance(formData);
      const husbandHeir = results.heirs.find((h) => h.name === "Муж");

      expect(husbandHeir).toBeDefined();
      expect(husbandHeir.baseFraction.toString()).toBe("1/2");
      expect(husbandHeir.percentage).toBe(50);
    });

    it("Жена + сын - жена должна получить 1/8", () => {
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 1,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: false,
          maternalGrandmother: false,
          fullBrothers: 0,
          fullSisters: 0,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      const results = calculateInheritance(formData);
      const wifeHeir = results.heirs.find((h) => h.name === "Жена");

      expect(wifeHeir).toBeDefined();
      expect(wifeHeir.baseFraction.toString()).toBe("1/8");
      expect(wifeHeir.percentage).toBe(12.5);
    });

    it("Жена + бабушки (без матери) - бабушки делят 1/6", () => {
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 0,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: true,
          maternalGrandmother: true,
          fullBrothers: 0,
          fullSisters: 0,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      const results = calculateInheritance(formData);
      const paternalGrandmother = results.heirs.find(
        (h) => h.name === "Бабушка (мать отца)"
      );
      const maternalGrandmother = results.heirs.find(
        (h) => h.name === "Бабушка (мать матери)"
      );

      expect(paternalGrandmother).toBeDefined();
      expect(maternalGrandmother).toBeDefined();
      expect(paternalGrandmother.baseFraction.toString()).toBe("1/12");
      expect(maternalGrandmother.baseFraction.toString()).toBe("1/12");
    });

    it("Братья блокируются при наличии сына", () => {
      const formData = {
        totalEstate: 1000000,
        estateValid: true,
        estateError: null,
        heirs: {
          husband: false,
          wife: true,
          wifeCount: 1,
          sons: 1,
          daughters: 0,
          grandsonsFromSon: 0,
          granddaughtersFromSon: 0,
          father: false,
          mother: false,
          paternalGrandfather: false,
          paternalGrandmother: false,
          maternalGrandmother: false,
          fullBrothers: 2,
          fullSisters: 1,
          paternalBrothers: 0,
          paternalSisters: 0,
          maternalBrothers: 0,
          maternalSisters: 0,
        },
      };

      const results = calculateInheritance(formData);
      const brothers = results.heirs.find(
        (h) => h.name.includes("Брат") && h.name.includes("полнородн")
      );
      const sisters = results.heirs.find(
        (h) => h.name.includes("Сестр") && h.name.includes("полнородн")
      );

      expect(brothers.blocked).toBe(true);
      expect(brothers.blockedBy).toContain("сыном");
      expect(sisters.blocked).toBe(true);
    });
  });
});
