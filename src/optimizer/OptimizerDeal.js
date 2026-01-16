/**
 * Optimizer.js
 * 로스트아크 아크그리드 젬 배치 최적화 로직 (딜러 전용)
 * * [Input Specs]
 * 1. inputCores: Array
 * {
 * type: string,   // "질서의 해", "혼돈의 달" 등
 * grade: string,  // "영웅", "전설", "유물", "고대"
 * isTier1: boolean // 혼돈의 해/달인 경우 1티어(현란한 공격, 불타는 일격) 여부
 * }
 * * 2. inputGems: Array
 * {
 * id: string | number, // 고유 식별자 (UUID 등)
 * type: string,        // "질서" 또는 "혼돈"
 * gemNum: number,      // 인게임/UI상 보여지는 번호 (ex: "질서의 젬 #5"의 5)
 * cost: number,
 * point: number,
 * optionNameA: string, // "공격력", "추가 피해", "보스 피해", "낙인력" 등 풀네임
 * optionLevelA: number,
 * optionNameB: string,
 * optionLevelB: number
 * }
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

// 딜러 유효 옵션 (이 외에는 전투력 계산 시 0 처리)
// 줄임말 없이 풀네임 사용
const DEALER_OPTS = ["공격력", "추가 피해", "보스 피해"];

// 옵션별 레벨당 수치 (딜러 기준)
// 서폿 옵션은 로직 내에서 자동 0 처리됨
const OPT_FACTOR = {
  공격력: 4 / 120,
  "추가 피해": 7 / 120,
  "보스 피해": 10 / 120,
};

// 포인트별 코어 전투력 증가량 (%)
const CORE_TABLES = {
  ORDER_SUN_MOON: {
    points: [10, 14, 17, 18, 19, 20],
    values: [1.5, 4.0, 7.5, 7.67, 7.83, 8.0],
  },
  ORDER_STAR: {
    points: [10, 14, 17, 18, 19, 20],
    values: [1.0, 2.5, 4.5, 4.67, 4.83, 5.0],
  },
  CHAOS_TIER1: {
    // 현란한 공격, 불타는 일격
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
  const factor = OPT_FACTOR[optName] || 0; // 딜러 유효 옵션 아니면 0
  return factor * level;
}

// ==========================================
// 3. 메인 로직
// ==========================================

export function optimizeArkGrid(inputCores, inputGems) {
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

  // 2. 젬 분류 (type 필드 기준)
  // inputGems는 배열이라고 가정
  const orderGems = inputGems.filter((g) => g.type === "질서");
  const chaosGems = inputGems.filter((g) => g.type === "혼돈");

  // --- Solver ---
  const solveGroup = (cores, gems) => {
    // 1) 각 코어별 후보 조합(Loadout) 생성
    const coreLoadouts = cores.map((core) => {
      const capacity = GRADE_CAPACITY[core.grade];
      const validLoadouts = [];

      const searchCombos = (idx, currentGems, curCost, curPoint, curStats) => {
        // 조합 저장
        const pScore = getPriorityScore(core.grade, curPoint);
        const coreBonus = getCoreBonusPercent(core, curPoint);

        validLoadouts.push({
          gems: [...currentGems],
          gemIds: currentGems.map((g) => g.id), // ID로 중복 체크
          cost: curCost,
          point: curPoint,
          stats: { ...curStats }, // { "공격력": 10, "추가 피해": 5 } 형태
          pScore: pScore,
          coreBonus: coreBonus,
          coreRef: core,
        });

        if (currentGems.length >= 4) return;

        for (let i = idx; i < gems.length; i++) {
          const gem = gems[i];
          if (curCost + gem.cost <= capacity) {
            // 스탯 합산 (풀네임 사용)
            const nextStats = { ...curStats };

            // 옵션 A 처리
            if (
              gem.optionNameA &&
              gem.optionLevelA > 0 &&
              DEALER_OPTS.includes(gem.optionNameA)
            ) {
              nextStats[gem.optionNameA] =
                (nextStats[gem.optionNameA] || 0) + gem.optionLevelA;
            }
            // 옵션 B 처리
            if (
              gem.optionNameB &&
              gem.optionLevelB > 0 &&
              DEALER_OPTS.includes(gem.optionNameB)
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

      // 최적화를 위해 우선순위 높은 순 -> 포인트 높은 순 정렬
      validLoadouts.sort((a, b) => b.pScore - a.pScore || b.point - a.point);
      return validLoadouts.slice(0, 500); // 성능상 상위 500개 Cut
    });

    // 2) 백트래킹 (최적 조합 탐색)
    let bestResult = null;
    let maxEval = -1;
    const usedGemIds = new Set();

    const backtrack = (coreIdx, selections) => {
      if (coreIdx === cores.length) {
        // 평가
        let totalPriority = 0;
        let groupTotalStats = { 공격력: 0, "추가 피해": 0, "보스 피해": 0 };
        let groupCoreMult = 1.0;

        selections.forEach((sel) => {
          totalPriority += sel.pScore;
          groupCoreMult *= 1 + sel.coreBonus / 100;
          for (const [k, v] of Object.entries(sel.stats)) {
            groupTotalStats[k] = (groupTotalStats[k] || 0) + v;
          }
        });

        // 젬 효율 계산 (비교용 임시)
        let gemMult = 1.0;
        gemMult *=
          1 + getGemOptRate("공격력", groupTotalStats["공격력"] || 0) / 100;
        gemMult *=
          1 +
          getGemOptRate("추가 피해", groupTotalStats["추가 피해"] || 0) / 100;
        gemMult *=
          1 +
          getGemOptRate("보스 피해", groupTotalStats["보스 피해"] || 0) / 100;

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

  // 실행
  const orderRes = solveGroup(orderCores, orderGems);
  const chaosRes = solveGroup(chaosCores, chaosGems);

  if (!orderRes || !chaosRes) return null; // 배치 실패

  // 4. 최종 결과 집계
  const finalStats = { 공격력: 0, "추가 피해": 0, "보스 피해": 0 };
  [orderRes.totalStats, chaosRes.totalStats].forEach((stats) => {
    for (const [k, v] of Object.entries(stats)) {
      finalStats[k] += v;
    }
  });

  // 젬 승수
  const gemAtkRate = getGemOptRate("공격력", finalStats["공격력"]);
  const gemAddRate = getGemOptRate("추가 피해", finalStats["추가 피해"]);
  const gemBossRate = getGemOptRate("보스 피해", finalStats["보스 피해"]);

  let totalMultiplier = 1.0;
  totalMultiplier *= 1 + gemAtkRate / 100;
  totalMultiplier *= 1 + gemAddRate / 100;
  totalMultiplier *= 1 + gemBossRate / 100;

  // 코어 승수
  const allSelections = [...orderRes.selections, ...chaosRes.selections];
  allSelections.forEach((sel) => {
    totalMultiplier *= 1 + sel.coreBonus / 100;
  });

  // 카드 데이터 포맷팅
  const formatCard = (sel) => {
    let localGemMult = 1.0;

    // 배치된 각 젬 정보 생성
    const gemDetails = sel.gems.map((g) => {
      let singleGemMult = 1.0;

      // 옵션 A 계산
      if (g.optionNameA) {
        const rateA = getGemOptRate(g.optionNameA, g.optionLevelA);
        if (rateA > 0) singleGemMult *= 1 + rateA / 100;
      }
      // 옵션 B 계산
      if (g.optionNameB) {
        const rateB = getGemOptRate(g.optionNameB, g.optionLevelB);
        if (rateB > 0) singleGemMult *= 1 + rateB / 100;
      }

      localGemMult *= singleGemMult;

      return {
        name: `${g.type}의 젬 #${g.gemNum}`, // ex: "혼돈의 젬 #20"
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
