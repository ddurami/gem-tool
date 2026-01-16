import "./CoreSettings.css";

const GRADES = ["영웅", "전설", "유물", "고대"];
const GRADE_CAPACITY = {
  영웅: 9,
  전설: 12,
  유물: 15,
  고대: 17,
};

const CORE_TYPES = [
  { id: "order-sun", name: "질서의 해", type: "질서" },
  { id: "order-moon", name: "질서의 달", type: "질서" },
  { id: "order-star", name: "질서의 별", type: "질서" },
  { id: "chaos-sun", name: "혼돈의 해", type: "혼돈" },
  { id: "chaos-moon", name: "혼돈의 달", type: "혼돈" },
  { id: "chaos-star", name: "혼돈의 별", type: "혼돈" },
];

const DEALER_TIER1_OPTIONS = {
  "chaos-sun": ["현란한 공격", "기타"],
  "chaos-moon": ["불타는 일격", "기타"],
};

const SUPPORT_TIER1_OPTIONS = {
  "chaos-sun": ["신념의 강화", "기타"],
  "chaos-moon": ["낙인의 흔적", "기타"],
};

export default function CoreSettings({ cores, setCores, role, onReset }) {
  const handleGradeChange = (coreId, grade) => {
    setCores((prev) => ({
      ...prev,
      [coreId]: { ...prev[coreId], grade },
    }));
  };

  const handleTier1Change = (coreId, optionName) => {
    const tier1Options =
      role === "dealer" ? DEALER_TIER1_OPTIONS : SUPPORT_TIER1_OPTIONS;
    const options = tier1Options[coreId];
    const isTier1 = options && optionName === options[0];

    setCores((prev) => ({
      ...prev,
      [coreId]: { ...prev[coreId], tier1Option: optionName, isTier1 },
    }));
  };

  const tier1Options =
    role === "dealer" ? DEALER_TIER1_OPTIONS : SUPPORT_TIER1_OPTIONS;

  return (
    <div className="card core-settings">
      <h3 className="card-title">
        <span>코어 설정</span>
        <button className="btn btn-icon" onClick={onReset} title="초기화">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
        </button>
      </h3>
      <div className="cores-grid">
        {CORE_TYPES.map((core) => {
          const coreState = cores[core.id] || { grade: "유물" };
          const capacity = GRADE_CAPACITY[coreState.grade];
          const hasTier1Options = tier1Options[core.id];

          return (
            <div key={core.id} className="core-card">
              <div className="core-header">
                <span className="core-name">{core.name}</span>
                <span className="core-capacity">
                  공급 의지력 <strong>{capacity}</strong>
                </span>
              </div>

              <div className="grade-selector">
                {GRADES.map((grade) => (
                  <button
                    key={grade}
                    className={`btn ${
                      coreState.grade === grade ? "active" : ""
                    }`}
                    onClick={() => handleGradeChange(core.id, grade)}
                  >
                    {grade}
                  </button>
                ))}
              </div>

              {hasTier1Options && (
                <div className="tier1-selector">
                  <div className="btn-group">
                    {hasTier1Options.map((option) => (
                      <button
                        key={option}
                        className={`btn ${
                          coreState.tier1Option === option ? "active" : ""
                        }`}
                        onClick={() => handleTier1Change(core.id, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
