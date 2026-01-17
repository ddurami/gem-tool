/**
 * 아크그리드 딜러용 최적화 로직
 * - 우선순위: 17/14/10 포인트 구간 달성 최우선 보장
 * - 최적화: 동일 구간 내에서 전투력(곱연산) 최대화
 * - 검증: 의지력 초과, 젬 중복 사용 차단
 */

const CORE_CAPACITY = { "영웅": 9, "전설": 12, "유물": 15, "고대": 17 };

// 젬 효율 (퍼센트 단위)
const GEM_COEFF_PCT = {
  "공격력": 4 / 120,
  "추가 피해": 7 / 120,
  "보스 피해": 10 / 120,
    "낙인력": 0, "아군 피해 강화": 0, "아군 공격 강화": 0
};

// 코어 포인트 테이블
const ORDER_SUN_MOON = { 10: 1.50, 14: 4.00, 17: 7.50, 18: 7.67, 19: 7.83, 20: 8.00 };
const ORDER_STAR = { 10: 1.00, 14: 2.50, 17: 4.50, 18: 4.67, 19: 4.83, 20: 5.00 };
const CHAOS_NAMED = { 10: 0.50, 14: 1.00, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 };
const CHAOS_OTHER = { 10: 0, 14: 0.50, 17: 1.50, 18: 1.67, 19: 1.83, 20: 2.00 };
const CHAOS_STAR = { 10: 0.50, 14: 1.00, 17: 2.50, 18: 2.67, 19: 2.83, 20: 3.00 };

function getGemStats(gem) {
    let stats = { atk: 0, add: 0, boss: 0 };
    [gem.opt1Type, gem.opt2Type].forEach((type, idx) => {
        const lvl = idx === 0 ? gem.opt1Lvl : gem.opt2Lvl;
        if (type === "공격력") stats.atk += lvl;
        if (type === "추가 피해") stats.add += lvl;
        if (type === "보스 피해") stats.boss += lvl;
    });
    return stats;
}

function getCoreBonusPct(core, point) {
    let table = {};
    const isAncient = core.grade === "고대";
    if (core.type === "질서") {
        table = (core.name === "별") ? ORDER_STAR : ORDER_SUN_MOON;
    } else {
        if (core.name === "별") table = CHAOS_STAR;
        else if (["현란한 공격", "불타는 일격"].includes(core.subName)) table = CHAOS_NAMED;
        else table = CHAOS_OTHER;
    }

    let thresholds = [];
    if (core.grade === "영웅") thresholds = [10];
    else if (core.grade === "전설") thresholds = [14, 10];
    else thresholds = [20, 19, 18, 17, 14, 10];

    let bonus = 0;
    for (let t of thresholds) {
        if (point >= t) {
            bonus = table[t];
            if (isAncient && t >= 17) bonus += 1.00;
            break;
        }
    }
    return bonus;
}

// 우선순위 등급 (유물/고대: 17>14>10, 전설: 14>10, 영웅: 10)
function getTierRank(grade, point) {
    if (grade === "유물" || grade === "고대") {
        if (point >= 17) return 3;
        if (point >= 14) return 2;
        if (point >= 10) return 1;
    } else if (grade === "전설") {
        if (point >= 14) return 3;
        if (point >= 10) return 2;
    } else {
        if (point >= 10) return 3;
    }
    return 0;
}

function generateCoreLoadouts(core, allGems) {
    const capacity = CORE_CAPACITY[core.grade];
    const loadouts = [];
    const gemStats = allGems.map((g) => getGemStats(g));

    function combine(idx, count, mask, currentWill, currentPoint, atk, add, boss) {
        if (currentWill > capacity) return;

        // 젬 0개 이상인 모든 조합을 저장 (빈 코어도 포함)
        const bonus = getCoreBonusPct(core, currentPoint);
        const gemMult =
            (1 + atk * GEM_COEFF_PCT["공격력"] / 100) *
            (1 + add * GEM_COEFF_PCT["추가 피해"] / 100) *
            (1 + boss * GEM_COEFF_PCT["보스 피해"] / 100);
        const totalMult = (1 + bonus / 100) * gemMult;
        const tierRank = getTierRank(core.grade, currentPoint);
        loadouts.push({
            mask: mask,
            will: currentWill,
            point: currentPoint,
            atk: atk,
            add: add,
            boss: boss,
            coreBonus: bonus,
            gemMult: gemMult,
            totalMult: totalMult,
            tierRank: tierRank
        });

        if (count === 4) return;

        for (let i = idx; i < allGems.length; i++) {
            const g = allGems[i];
            const s = gemStats[i];
            combine(
                i + 1,
                count + 1,
                mask | (1n << BigInt(i)),
                currentWill + g.will,
                currentPoint + g.point,
                atk + s.atk,
                add + s.add,
                boss + s.boss
            );
        }
    }

    combine(0, 0, 0n, 0, 0, 0, 0, 0);

    // 필터링: 티어 등급 -> 전투력 점수
    loadouts.sort((a, b) => {
        if (b.tierRank !== a.tierRank) return b.tierRank - a.tierRank;
        return b.totalMult - a.totalMult;
    });
    return loadouts.slice(0, 500);
}

function findBestGlobalCombination(cands1, cands2, cands3) {
    let best = {
        countTier3: -1,
        countTier2: -1,
        countTier1: -1,
        finalMult: -1,
        combination: null
    };

    const getPriority = (a, b, c) => {
        const ranks = [a.tierRank, b.tierRank, c.tierRank];
        return {
            countTier3: ranks.filter(r => r === 3).length,
            countTier2: ranks.filter(r => r >= 2).length,
            countTier1: ranks.filter(r => r >= 1).length
        };
    };

    for (const c1 of cands1) {
        for (const c2 of cands2) {
            if ((c1.mask & c2.mask) !== 0n) continue;
            for (const c3 of cands3) {
                if ((c1.mask & c3.mask) !== 0n || (c2.mask & c3.mask) !== 0n) continue;

                const priority = getPriority(c1, c2, c3);
                const totalCoreMult =
                    (1 + c1.coreBonus / 100) *
                    (1 + c2.coreBonus / 100) *
                    (1 + c3.coreBonus / 100);
                const totalAtk = c1.atk + c2.atk + c3.atk;
                const totalAdd = c1.add + c2.add + c3.add;
                const totalBoss = c1.boss + c2.boss + c3.boss;

                const gemMult =
                    (1 + totalAtk * GEM_COEFF_PCT["공격력"] / 100) *
                    (1 + totalAdd * GEM_COEFF_PCT["추가 피해"] / 100) *
                    (1 + totalBoss * GEM_COEFF_PCT["보스 피해"] / 100);
                const currentFinalMult = totalCoreMult * gemMult;

                if (
                    priority.countTier3 > best.countTier3 ||
                    (priority.countTier3 === best.countTier3 &&
                        (priority.countTier2 > best.countTier2 ||
                            (priority.countTier2 === best.countTier2 &&
                                (priority.countTier1 > best.countTier1 ||
                                    (priority.countTier1 === best.countTier1 &&
                                        currentFinalMult > best.finalMult)))))
                ) {
                    best.countTier3 = priority.countTier3;
                    best.countTier2 = priority.countTier2;
                    best.countTier1 = priority.countTier1;
                    best.finalMult = currentFinalMult;
                    best.combination = [c1, c2, c3];
                }
            }
        }
    }
    return best;
}

export function solveArkPassive(inputData) {
    const orderCores = inputData.cores.filter(c => c.type === "질서");
    const orderGems = inputData.gems.filter(g => g.type === "질서").map((g, i) => ({ ...g, originalIndex: i }));
    const orderCands = orderCores.map(c => generateCoreLoadouts(c, orderGems));
    const orderRes = findBestGlobalCombination(orderCands[0], orderCands[1], orderCands[2]);

    const chaosCores = inputData.cores.filter(c => c.type === "혼돈");
    const chaosGems = inputData.gems.filter(g => g.type === "혼돈").map((g, i) => ({ ...g, originalIndex: i }));
    const chaosCands = chaosCores.map(c => generateCoreLoadouts(c, chaosGems));
    const chaosRes = findBestGlobalCombination(chaosCands[0], chaosCands[1], chaosCands[2]);

    const finalResults = [];
    [ { res: orderRes, gems: orderGems, cores: orderCores }, { res: chaosRes, gems: chaosGems, cores: chaosCores } ].forEach(g => {
        if (g.res.combination) {
            g.res.combination.forEach((c, i) => {
                const gems = g.gems.filter((_, idx) => (c.mask & (1n << BigInt(idx))) !== 0n);
                finalResults.push({
                    coreName: g.cores[i].name,
                    totalWill: c.will,
                    totalPoint: c.point,
                    coreBonus: c.coreBonus,
                    gemMult: c.gemMult,
                    totalMult: c.totalMult,
                    atk: c.atk,
                    add: c.add,
                    boss: c.boss,
                    gems: gems
                });
            });
        }
    });

    let coreMult = 1.0;
    let totalStats = { atk: 0, add: 0, boss: 0 };
    finalResults.forEach(r => {
        coreMult *= (1 + r.coreBonus / 100);
        totalStats.atk += r.atk;
        totalStats.add += r.add;
        totalStats.boss += r.boss;
    });
    const gemMult =
        (1 + totalStats.atk * GEM_COEFF_PCT["공격력"] / 100) *
        (1 + totalStats.add * GEM_COEFF_PCT["추가 피해"] / 100) *
        (1 + totalStats.boss * GEM_COEFF_PCT["보스 피해"] / 100);
    const finalMult = coreMult * gemMult;

    return { details: finalResults, totalCPIncrease: ((finalMult - 1) * 100).toFixed(4) };
}

// UI 어댑터 함수
export function optimizeArkGrid(inputCores, inputGems) {
    // 코어 데이터 변환
    const logicCores = inputCores.map(c => {
        const [type, name] = c.type.split("의 ");
        return { type, name, subName: c.subName || "", grade: c.grade };
    });

    // 젬 데이터 변환
    const logicGems = inputGems.map(g => ({
        ...g,
        will: parseInt(g.cost, 10) || 0,
        point: parseInt(g.point, 10) || 0,
        opt1Type: g.opt1Type,
        opt1Lvl: parseInt(g.opt1Lvl, 10) || 0,
        opt2Type: g.opt2Type,
        opt2Lvl: parseInt(g.opt2Lvl, 10) || 0
    }));

    // 로직 실행
    const result = solveArkPassive({ cores: logicCores, gems: logicGems });

    // 결과 분류
    let assignedOrder = [];
    let assignedChaos = [];

    if (result.details.length === 6) {
        assignedOrder = result.details.slice(0, 3);
        assignedChaos = result.details.slice(3, 6);
    } else if (result.details.length === 3) {
        const firstGem = result.details[0]?.gems[0];
        if (firstGem && firstGem.type === "혼돈") {
            assignedChaos = result.details;
        } else {
            assignedOrder = result.details;
        }
    }

    // UI용 카드 포맷팅
    const formatCard = (originalType, grade, detail) => {
        if (!detail) {
            return {
                coreName: originalType,
                grade: grade,
                totalCost: 0,
                totalPoint: 0,
                coreBonusRate: "0.00",
                combinedCpRate: "0.00",
                gems: []
            };
        }

        const uiGems = detail.gems.map((g, idx) => {
            const stats = getGemStats(g);
            const gemMult =
                (1 + stats.atk * GEM_COEFF_PCT["공격력"] / 100) *
                (1 + stats.add * GEM_COEFF_PCT["추가 피해"] / 100) *
                (1 + stats.boss * GEM_COEFF_PCT["보스 피해"] / 100);
            const rate = (gemMult - 1) * 100;
            return {
                ...g,
                name: g.name || `${g.type}의 젬 #${idx + 1}`,
                cpRate: rate
            };
        });

        return {
            coreName: originalType,
            grade: grade,
            totalCost: detail.totalWill || detail.gems.reduce((sum, g) => sum + g.will, 0),
            totalPoint: detail.totalPoint,
            coreBonusRate: detail.coreBonus.toFixed(2),
            combinedCpRate: ((detail.totalMult - 1) * 100).toFixed(4),
            gems: uiGems
        };
    };

    // 카드 생성
    const finalCards = [];
    for (let i = 0; i < 3; i++) {
        finalCards.push(formatCard(inputCores[i].type, inputCores[i].grade, assignedOrder[i]));
    }
    for (let i = 0; i < 3; i++) {
        finalCards.push(formatCard(inputCores[i + 3].type, inputCores[i + 3].grade, assignedChaos[i]));
    }

    return {
        finalCombatPowerIncrease: result.totalCPIncrease,
        cards: finalCards
    };
}