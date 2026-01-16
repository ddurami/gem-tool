/**
 * OptimizerSupport.js
 * 로스트아크 아크그리드 젬 배치 최적화 로직 (서포터 전용)
 * OptimizerDeal.js와 동일한 Input/Output 스펙
 */

// ==========================================
// 1. 상수 및 설정
// ==========================================

const GRADE_CAPACITY = {
  영웅: 9,
  전설: 12,
  유물: 15,
  고대: 17,
};

// 서포터 유효 옵션
const SUPPORT_OPTS = ["낙인력", "아군 피해 강화", "아군 공격 강화"];

// 서포터 옵션별 레벨당 수치
const OPT_FACTOR = {
  낙인력: 8 / 120,
  "아군 피해 강화": 5 / 120,
  "아군 공격 강화": 10 / 120,
};

// 서포터 포인트별 코어 전투력 증가량 (%)
const CORE_TABLES = {
  ORDER_SUN_MOON: {
    points: [10, 14, 17, 18, 19, 20],
    values: [1.2, 1.2, 7.8, 7.98, 8.1, 8.22],
  },
  ORDER_STAR: {
    points: [10, 14, 17, 18, 19, 20],
    values: [0, 0.6, 2.1, 2.2, 2.3, 2.4],
  },
  CHAOS_TIER1: {
    // 신념의 강화, 낙인의 흔적
    points: [10, 14, 17, 18, 19, 20],
    values: [0.5, 1.0, 2.5, 2.67, 2.83, 3.0],
  },
  CHAOS_NORMAL: {
    // 그 외
    points: [10, 14, 17, 18, 19, 20],
    values: [0, 0.5, 1.5, 1.67, 1.83, 2.0],
  },
  CHAOS_STAR: {
    points: [10, 14, 17, 18, 19, 20],
    values: [0.5, 1.0, 2.5, 2.67, 2.83, 3.0],
  },
};

// ==========================================
// 2. 내부 계산 함수
// ==========================================

function getCoreBonusPercent(core, point) {
  let table;

  if (core.type.includes("질서")) {
    if (core.type.includes("별")) table = CORE_TABLES.ORDER_STAR;
    else table = CORE_TABLES.ORDER_SUN_MOON;
  } else {
    if (core.type.includes("별")) table = CORE_TABLES.CHAOS_STAR;
    else
      table = core.isTier1 ? CORE_TABLES.CHAOS_TIER1 : CORE_TABLES.CHAOS_NORMAL;
  }

  let val = 0;
  for (let i = table.points.length - 1; i >= 0; i--) {
    if (point >= table.points[i]) {
      val = table.values[i];
      // 고대 등급 17P 이상 시 +1.00% 추가
      if (core.grade === "고대" && point >= 17) {
        val += 1.0;
      }
      break;
    }
  }
  return val;
}

// 우선순위 점수: 17P(1순위) >>> 14P > 10P
function getPriorityScore(grade, point) {
  const BIG_SCORE = 1000000;

  if (grade === "유물" || grade === "고대") {
    if (point >= 17) return BIG_SCORE * 4;
    if (point >= 14) return BIG_SCORE * 3;
    if (point >= 10) return BIG_SCORE * 2;
  } else if (grade === "전설") {
    if (point >= 14) return BIG_SCORE * 3;
    if (point >= 10) return BIG_SCORE * 2;
  } else if (grade === "영웅") {
    if (point >= 10) return BIG_SCORE * 2;
  }
  return 0;
}

function getGemOptRate(optName, level) {
  const factor = OPT_FACTOR[optName] || 0;
  return factor * level;
}

// ==========================================
// 3. 메인 로직
// ==========================================

export function optimizeArkGridSupport(inputCores, inputGems) {
  // 1. 코어 정렬 및 분류
  const targetOrder = [
    "질서의 해",
    "질서의 달",
    "질서의 별",
    "혼돈의 해",
    "혼돈의 달",
    "혼돈의 별",
  ];

  const sortedCores = [];
  targetOrder.forEach((type) => {
    const found = inputCores.find(
      (c) => c.type === type || c.type.includes(type)
    );
    if (found) sortedCores.push(found);
  });

  const orderCores = sortedCores.filter((c) => c.type.includes("질서"));
  const chaosCores = sortedCores.filter((c) => c.type.includes("혼돈"));

  // 2. 젬 분류
  const orderGems = inputGems.filter((g) => g.type === "질서");
  const chaosGems = inputGems.filter((g) => g.type === "혼돈");

  // --- Solver ---
  const solveGroup = (cores, gems) => {
    const coreLoadouts = cores.map((core) => {
      const capacity = GRADE_CAPACITY[core.grade];
      const validLoadouts = [];

      const searchCombos = (idx, currentGems, curCost, curPoint, curStats) => {
        const pScore = getPriorityScore(core.grade, curPoint);
        const coreBonus = getCoreBonusPercent(core, curPoint);

        validLoadouts.push({
          gems: [...currentGems],
          gemIds: currentGems.map((g) => g.id),
          cost: curCost,
          point: curPoint,
          stats: { ...curStats },
          pScore: pScore,
          coreBonus: coreBonus,
          coreRef: core,
        });

        if (currentGems.length >= 4) return;

        for (let i = idx; i < gems.length; i++) {
          const gem = gems[i];
          if (curCost + gem.cost <= capacity) {
            const nextStats = { ...curStats };

            if (
              gem.optionNameA &&
              gem.optionLevelA > 0 &&
              SUPPORT_OPTS.includes(gem.optionNameA)
            ) {
              nextStats[gem.optionNameA] =
                (nextStats[gem.optionNameA] || 0) + gem.optionLevelA;
            }
            if (
              gem.optionNameB &&
              gem.optionLevelB > 0 &&
              SUPPORT_OPTS.includes(gem.optionNameB)
            ) {
              nextStats[gem.optionNameB] =
                (nextStats[gem.optionNameB] || 0) + gem.optionLevelB;
            }

            searchCombos(
              i + 1,
              [...currentGems, gem],
              curCost + gem.cost,
              curPoint + gem.point,
              nextStats
            );
          }
        }
      };

      searchCombos(0, [], 0, 0, {});
      validLoadouts.sort((a, b) => b.pScore - a.pScore || b.point - a.point);
      return validLoadouts.slice(0, 500);
    });

    let bestResult = null;
    let maxEval = -1;
    const usedGemIds = new Set();

    const backtrack = (coreIdx, selections) => {
      if (coreIdx === cores.length) {
        let totalPriority = 0;
        let groupTotalStats = {
          낙인력: 0,
          "아군 피해 강화": 0,
          "아군 공격 강화": 0,
        };
        let groupCoreMult = 1.0;

        selections.forEach((sel) => {
          totalPriority += sel.pScore;
          groupCoreMult *= 1 + sel.coreBonus / 100;
          for (const [k, v] of Object.entries(sel.stats)) {
            groupTotalStats[k] = (groupTotalStats[k] || 0) + v;
          }
        });

        let gemMult = 1.0;
        gemMult *=
          1 + getGemOptRate("낙인력", groupTotalStats["낙인력"] || 0) / 100;
        gemMult *=
          1 +
          getGemOptRate(
            "아군 피해 강화",
            groupTotalStats["아군 피해 강화"] || 0
          ) /
            100;
        gemMult *=
          1 +
          getGemOptRate(
            "아군 공격 강화",
            groupTotalStats["아군 공격 강화"] || 0
          ) /
            100;

        const currentCP = groupCoreMult * gemMult;
        const evalScore = totalPriority + currentCP;

        if (evalScore > maxEval) {
          maxEval = evalScore;
          bestResult = {
            selections: [...selections],
            totalStats: groupTotalStats,
          };
        }
        return;
      }

      for (const cand of coreLoadouts[coreIdx]) {
        let conflict = false;
        for (const id of cand.gemIds) {
          if (usedGemIds.has(id)) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          cand.gemIds.forEach((id) => usedGemIds.add(id));
          backtrack(coreIdx + 1, [...selections, cand]);
          cand.gemIds.forEach((id) => usedGemIds.delete(id));
        }
      }
    };

    backtrack(0, []);
    return bestResult;
  };

  const orderRes = solveGroup(orderCores, orderGems);
  const chaosRes = solveGroup(chaosCores, chaosGems);

  if (!orderRes || !chaosRes) return null;

  // 4. 최종 결과 집계
  const finalStats = { 낙인력: 0, "아군 피해 강화": 0, "아군 공격 강화": 0 };
  [orderRes.totalStats, chaosRes.totalStats].forEach((stats) => {
    for (const [k, v] of Object.entries(stats)) {
      finalStats[k] += v;
    }
  });

  const gemStigmaRate = getGemOptRate("낙인력", finalStats["낙인력"]);
  const gemAllyDmgRate = getGemOptRate(
    "아군 피해 강화",
    finalStats["아군 피해 강화"]
  );
  const gemAllyAtkRate = getGemOptRate(
    "아군 공격 강화",
    finalStats["아군 공격 강화"]
  );

  let totalMultiplier = 1.0;
  totalMultiplier *= 1 + gemStigmaRate / 100;
  totalMultiplier *= 1 + gemAllyDmgRate / 100;
  totalMultiplier *= 1 + gemAllyAtkRate / 100;

  const allSelections = [...orderRes.selections, ...chaosRes.selections];
  allSelections.forEach((sel) => {
    totalMultiplier *= 1 + sel.coreBonus / 100;
  });

  const formatCard = (sel) => {
    let localGemMult = 1.0;

    const gemDetails = sel.gems.map((g) => {
      let singleGemMult = 1.0;

      if (g.optionNameA) {
        const rateA = getGemOptRate(g.optionNameA, g.optionLevelA);
        if (rateA > 0) singleGemMult *= 1 + rateA / 100;
      }
      if (g.optionNameB) {
        const rateB = getGemOptRate(g.optionNameB, g.optionLevelB);
        if (rateB > 0) singleGemMult *= 1 + rateB / 100;
      }

      localGemMult *= singleGemMult;

      return {
        name: `${g.type}의 젬 #${g.gemNum}`,
        cpRate: ((singleGemMult - 1) * 100).toFixed(2) + "%",
        cost: g.cost,
        point: g.point,
        optionNameA: g.optionNameA,
        optionLevelA: g.optionLevelA,
        optionNameB: g.optionNameB,
        optionLevelB: g.optionLevelB,
      };
    });

    const combinedMult = (1 + sel.coreBonus / 100) * localGemMult;

    return {
      coreName: sel.coreRef.type,
      grade: sel.coreRef.grade,
      totalCost: sel.cost,
      totalPoint: sel.point,
      coreBonusRate: sel.coreBonus.toFixed(2),
      combinedCpRate: ((combinedMult - 1) * 100).toFixed(3),
      gems: gemDetails,
    };
  };

  return {
    finalCombatPowerIncrease: ((totalMultiplier - 1) * 100).toFixed(3),
    cards: allSelections.map(formatCard),
  };
}
