import { useState } from "react";
import "./GemSettings.css";

const COST_OPTIONS = [3, 4, 5, 6, 7];
const POINT_OPTIONS = [1, 2, 3, 4, 5];
const LEVEL_OPTIONS = [1, 2, 3, 4, 5];

const OPTION_DISPLAY = {
  공격력: "공격",
  "추가 피해": "추피",
  "보스 피해": "보피",
  낙인력: "낙인",
  "아군 피해 강화": "아피",
  "아군 공격 강화": "아공",
};

const OPTION_FULL_NAMES = Object.keys(OPTION_DISPLAY);

let gemIdCounter = Date.now();

export default function GemSettings({ gems, setGems, onReset }) {
  const [activeTab, setActiveTab] = useState("질서");
  const [addType, setAddType] = useState("질서");

  const [formState, setFormState] = useState({
    cost: 3,
    point: 5,
    optionNameA: "",
    optionLevelA: 1,
    optionNameB: "",
    optionLevelB: 1,
  });

  const handleFormChange = (field, value) => {
    if (field === "optionNameA") {
      if (formState.optionNameA === value) {
        setFormState((prev) => ({ ...prev, optionNameA: "", optionLevelA: 1 }));
      } else {
        setFormState((prev) => ({
          ...prev,
          optionNameA: value,
          optionLevelA: 1,
        }));
      }
    } else if (field === "optionNameB") {
      if (formState.optionNameB === value) {
        setFormState((prev) => ({ ...prev, optionNameB: "", optionLevelB: 1 }));
      } else {
        setFormState((prev) => ({
          ...prev,
          optionNameB: value,
          optionLevelB: 1,
        }));
      }
    } else {
      setFormState((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddGem = () => {
    const typeGems = gems.filter((g) => g.type === addType);
    const newGem = {
      id: `gem-${gemIdCounter++}`,
      type: addType,
      gemNum: typeGems.length + 1,
      cost: formState.cost,
      point: formState.point,
      optionNameA: formState.optionNameA || "",
      optionLevelA: formState.optionNameA ? formState.optionLevelA : 0,
      optionNameB: formState.optionNameB || "",
      optionLevelB: formState.optionNameB ? formState.optionLevelB : 0,
    };
    setGems((prev) => [...prev, newGem]);

    setFormState((prev) => ({
      ...prev,
      optionNameA: "",
      optionLevelA: 1,
      optionNameB: "",
      optionLevelB: 1,
    }));
  };

  const handleDeleteGem = (id) => {
    setGems((prev) => {
      const filtered = prev.filter((g) => g.id !== id);
      const orderGems = filtered
        .filter((g) => g.type === "질서")
        .map((g, i) => ({ ...g, gemNum: i + 1 }));
      const chaosGems = filtered
        .filter((g) => g.type === "혼돈")
        .map((g, i) => ({ ...g, gemNum: i + 1 }));
      return [...orderGems, ...chaosGems];
    });
  };

  const handleGemChange = (gemId, field, value) => {
    setGems((prev) =>
      prev.map((g) => {
        if (g.id !== gemId) return g;

        const updated = { ...g };

        if (field === "optionNameA") {
          if (!value) {
            updated.optionNameA = "";
            updated.optionLevelA = 0;
          } else {
            updated.optionNameA = value;
            if (updated.optionLevelA === 0) updated.optionLevelA = 1;
          }
        } else if (field === "optionNameB") {
          if (!value) {
            updated.optionNameB = "";
            updated.optionLevelB = 0;
          } else {
            updated.optionNameB = value;
            if (updated.optionLevelB === 0) updated.optionLevelB = 1;
          }
        } else {
          updated[field] = value;
        }

        return updated;
      })
    );
  };

  const filteredGems = gems.filter((g) => g.type === activeTab);
  const orderCount = gems.filter((g) => g.type === "질서").length;
  const chaosCount = gems.filter((g) => g.type === "혼돈").length;

  const getDisabledOptionsA = () =>
    formState.optionNameB ? [formState.optionNameB] : [];
  const getDisabledOptionsB = () =>
    formState.optionNameA ? [formState.optionNameA] : [];

  return (
    <div className="card gem-settings">
      <h3 className="card-title">
        <span>젬 설정</span>
        <button className="btn btn-icon" onClick={onReset} title="초기화">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
        </button>
      </h3>

      <div className="gem-layout">
        <div className="gem-add-section">
          <div className="section-subtitle">젬 추가</div>

          <div className="form-row">
            <span className="form-label">타입</span>
            <div className="btn-group">
              <button
                className={`btn ${addType === "질서" ? "active" : ""}`}
                onClick={() => setAddType("질서")}
              >
                질서
              </button>
              <button
                className={`btn ${addType === "혼돈" ? "active" : ""}`}
                onClick={() => setAddType("혼돈")}
              >
                혼돈
              </button>
            </div>
          </div>

          <div className="form-row">
            <span className="form-label">의지력</span>
            <div className="btn-group">
              {COST_OPTIONS.map((cost) => (
                <button
                  key={cost}
                  className={`btn ${formState.cost === cost ? "active" : ""}`}
                  onClick={() => handleFormChange("cost", cost)}
                >
                  {cost}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <span className="form-label">포인트</span>
            <div className="btn-group">
              {POINT_OPTIONS.map((point) => (
                <button
                  key={point}
                  className={`btn ${formState.point === point ? "active" : ""}`}
                  onClick={() => handleFormChange("point", point)}
                >
                  {point}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            {!formState.optionNameA ? (
              <div className="btn-group">
                {OPTION_FULL_NAMES.map((opt) => (
                  <button
                    key={opt}
                    className="btn"
                    onClick={() => handleFormChange("optionNameA", opt)}
                    disabled={getDisabledOptionsA().includes(opt)}
                  >
                    {OPTION_DISPLAY[opt]}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <span className="option-label-slot">
                  <button
                    className="btn active"
                    onClick={() =>
                      handleFormChange("optionNameA", formState.optionNameA)
                    }
                  >
                    {OPTION_DISPLAY[formState.optionNameA]}
                  </button>
                </span>
                <div className="btn-group">
                  {LEVEL_OPTIONS.map((lv) => (
                    <button
                      key={lv}
                      className={`btn ${
                        formState.optionLevelA === lv ? "active" : ""
                      }`}
                      onClick={() => handleFormChange("optionLevelA", lv)}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="form-row">
            {!formState.optionNameB ? (
              <div className="btn-group">
                {OPTION_FULL_NAMES.map((opt) => (
                  <button
                    key={opt}
                    className="btn"
                    onClick={() => handleFormChange("optionNameB", opt)}
                    disabled={getDisabledOptionsB().includes(opt)}
                  >
                    {OPTION_DISPLAY[opt]}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <span className="option-label-slot">
                  <button
                    className="btn active"
                    onClick={() =>
                      handleFormChange("optionNameB", formState.optionNameB)
                    }
                  >
                    {OPTION_DISPLAY[formState.optionNameB]}
                  </button>
                </span>
                <div className="btn-group">
                  {LEVEL_OPTIONS.map((lv) => (
                    <button
                      key={lv}
                      className={`btn ${
                        formState.optionLevelB === lv ? "active" : ""
                      }`}
                      onClick={() => handleFormChange("optionLevelB", lv)}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="add-gem-btn-wrapper">
            <button
              className="btn btn-primary add-gem-btn"
              onClick={handleAddGem}
            >
              젬 추가
            </button>
          </div>
        </div>

        <div className="gem-list-section">
          <div className="gem-tabs">
            <button
              className={`gem-tab ${activeTab === "질서" ? "active" : ""}`}
              onClick={() => setActiveTab("질서")}
            >
              질서의 젬 ({orderCount})
            </button>
            <button
              className={`gem-tab ${activeTab === "혼돈" ? "active" : ""}`}
              onClick={() => setActiveTab("혼돈")}
            >
              혼돈의 젬 ({chaosCount})
            </button>
          </div>

          <div className="gem-list scroll-area">
            {filteredGems.length === 0 ? (
              <div className="empty-state">{activeTab}의 젬이 없습니다.</div>
            ) : (
              filteredGems.map((gem) => (
                <div key={gem.id} className="gem-item">
                  <div className="gem-item-header">
                    <span className="gem-name">
                      {gem.type}의 젬 #{gem.gemNum}
                    </span>
                    <button
                      className="btn btn-icon"
                      onClick={() => handleDeleteGem(gem.id)}
                      title="삭제"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>

                  <div className="gem-item-row">
                    <span className="gem-row-label">의지력</span>
                    <select
                      className="select-base"
                      value={gem.cost}
                      onChange={(e) =>
                        handleGemChange(gem.id, "cost", Number(e.target.value))
                      }
                    >
                      {COST_OPTIONS.map((c) => (
                        <option key={`${gem.id}-cost-${c}`} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select-base"
                      value={gem.optionNameA}
                      onChange={(e) =>
                        handleGemChange(gem.id, "optionNameA", e.target.value)
                      }
                    >
                      <option value="">-</option>
                      {OPTION_FULL_NAMES.map((opt) => (
                        <option
                          key={`${gem.id}-optA-${opt}`}
                          value={opt}
                          disabled={gem.optionNameB === opt}
                        >
                          {OPTION_DISPLAY[opt]}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select-base"
                      value={gem.optionNameA ? gem.optionLevelA : ""}
                      onChange={(e) =>
                        handleGemChange(
                          gem.id,
                          "optionLevelA",
                          Number(e.target.value)
                        )
                      }
                      disabled={!gem.optionNameA}
                    >
                      {!gem.optionNameA && <option value="">-</option>}
                      {gem.optionNameA &&
                        LEVEL_OPTIONS.map((lv) => (
                          <option key={`${gem.id}-lvA-${lv}`} value={lv}>
                            {lv}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="gem-item-row">
                    <span className="gem-row-label">포인트</span>
                    <select
                      className="select-base"
                      value={gem.point}
                      onChange={(e) =>
                        handleGemChange(gem.id, "point", Number(e.target.value))
                      }
                    >
                      {POINT_OPTIONS.map((p) => (
                        <option key={`${gem.id}-point-${p}`} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select-base"
                      value={gem.optionNameB}
                      onChange={(e) =>
                        handleGemChange(gem.id, "optionNameB", e.target.value)
                      }
                    >
                      <option value="">-</option>
                      {OPTION_FULL_NAMES.map((opt) => (
                        <option
                          key={`${gem.id}-optB-${opt}`}
                          value={opt}
                          disabled={gem.optionNameA === opt}
                        >
                          {OPTION_DISPLAY[opt]}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select-base"
                      value={gem.optionNameB ? gem.optionLevelB : ""}
                      onChange={(e) =>
                        handleGemChange(
                          gem.id,
                          "optionLevelB",
                          Number(e.target.value)
                        )
                      }
                      disabled={!gem.optionNameB}
                    >
                      {!gem.optionNameB && <option value="">-</option>}
                      {gem.optionNameB &&
                        LEVEL_OPTIONS.map((lv) => (
                          <option key={`${gem.id}-lvB-${lv}`} value={lv}>
                            {lv}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
