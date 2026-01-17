import "./Results.css";

const OPTION_DISPLAY = {
  공격력: "공격",
  "추가 피해": "추피",
  "보스 피해": "보피",
  낙인력: "낙인",
  "아군 피해 강화": "아피",
  "아군 공격 강화": "아공",
};

const GRADE_CAPACITY = {
  영웅: 9,
  전설: 12,
  유물: 15,
  고대: 17,
};

export default function Results({ result, cores }) {
  if (!result) {
    return (
      <div className="card results-section">
        <h3 className="card-title">결과</h3>
        <div className="empty-result">
          최적화 검색 버튼을 클릭하여 결과를 확인하세요.
        </div>
      </div>
    );
  }

  // 소수점 셋째자리 반올림하여 둘째자리까지 표시
  const formatPercent = (value) => {
    const num = parseFloat(value);
    return (Math.round(num * 100) / 100).toFixed(2);
  };

  const getCoreCapacity = (coreName) => {
    const coreIdMap = {
      "질서의 해": "order-sun",
      "질서의 달": "order-moon",
      "질서의 별": "order-star",
      "혼돈의 해": "chaos-sun",
      "혼돈의 달": "chaos-moon",
      "혼돈의 별": "chaos-star",
    };
    const coreId = coreIdMap[coreName];
    if (coreId && cores[coreId]) {
      return GRADE_CAPACITY[cores[coreId].grade];
    }
    return (
      GRADE_CAPACITY[
        result.cards.find((c) => c.coreName === coreName)?.grade
      ] || 15
    );
  };

  return (
    <div className="card results-section">
      <h3 className="card-title">
        <span>결과</span>
        <span className="total-cp">
          총 전투력 상승률: {formatPercent(result.finalCombatPowerIncrease)}%
        </span>
      </h3>

      <div className="results-grid">
        {result.cards.map((card, index) => {
          const capacity = getCoreCapacity(card.coreName);

          return (
            <div key={index} className="result-card">
              <div className="result-card-header">
                <span className="core-type">{card.coreName}</span>
                <span className="core-grade badge">{card.grade}</span>
              </div>

              <div className="result-stats">
                <div className="stat-row">
                  <span className="stat-label">사용 의지력</span>
                  <span className="stat-value">
                    {card.totalCost}/{capacity}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">달성 포인트</span>
                  <span className="stat-value">{card.totalPoint}P</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">코어 전투력</span>
                  <span className="stat-value stat-accent">
                    {card.coreBonusRate}%
                  </span>
                </div>
              </div>

              <div className="gem-slots">
                <div className="gem-slots-title">장착된 젬</div>
                {card.gems.length === 0 ? (
                  <div className="no-gems">장착된 젬 없음</div>
                ) : (
                  card.gems.map((gem, gIdx) => (
                    <div key={gIdx} className="gem-slot">
                      <div className="gem-slot-row">
                        <span className="gem-slot-name">{gem.name}</span>
                        <span className="gem-slot-cp">
                          {formatPercent(gem.cpRate)}%
                        </span>
                      </div>
                      <div className="gem-slot-row">
                        <span className="gem-slot-detail">
                          의지력 {gem.cost}
                        </span>
                        <span className="gem-slot-detail">
                          {gem.opt1Type
                            ? `${
                                OPTION_DISPLAY[gem.opt1Type] || gem.opt1Type
                              } ${gem.opt1Lvl}`
                            : "-"}
                        </span>
                      </div>
                      <div className="gem-slot-row">
                        <span className="gem-slot-detail">
                          포인트 {gem.point}
                        </span>
                        <span className="gem-slot-detail">
                          {gem.opt2Type
                            ? `${
                                OPTION_DISPLAY[gem.opt2Type] || gem.opt2Type
                              } ${gem.opt2Lvl}`
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="result-total">
                <span className="result-total-label">전투력 상승률</span>
                <span className="result-total-value">
                  {formatPercent(card.combinedCpRate)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
