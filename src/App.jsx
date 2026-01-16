import { useState, useCallback, useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import RoleSelector from "./components/RoleSelector";
import CoreSettings from "./components/CoreSettings";
import GemSettings from "./components/GemSettings";
import Presets from "./components/Presets";
import Results from "./components/Results";
import { optimizeArkGrid } from "./optimizer/OptimizerDeal.js";
import { optimizeArkGridSupport } from "./optimizer/OptimizerSupport.js";
import "./App.css";

const STORAGE_KEY = "arkgrid-current-state";

const CORE_ID_TO_TYPE = {
  "order-sun": "질서의 해",
  "order-moon": "질서의 달",
  "order-star": "질서의 별",
  "chaos-sun": "혼돈의 해",
  "chaos-moon": "혼돈의 달",
  "chaos-star": "혼돈의 별",
};

const getDefaultCores = (role = "dealer") => {
  const tier1Sun = role === "dealer" ? "현란한 공격" : "신념의 강화";
  const tier1Moon = role === "dealer" ? "불타는 일격" : "낙인의 흔적";

  return {
    "order-sun": { grade: "유물", tier1Option: "", isTier1: false },
    "order-moon": { grade: "유물", tier1Option: "", isTier1: false },
    "order-star": { grade: "유물", tier1Option: "", isTier1: false },
    "chaos-sun": { grade: "유물", tier1Option: tier1Sun, isTier1: true },
    "chaos-moon": { grade: "유물", tier1Option: tier1Moon, isTier1: true },
    "chaos-star": { grade: "유물", tier1Option: "", isTier1: false },
  };
};

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load saved state:", e);
  }
  return null;
};

export default function App() {
  const savedState = loadSavedState();

  const [role, setRole] = useState(savedState?.role || "dealer");
  const [cores, setCores] = useState(
    savedState?.cores || getDefaultCores(savedState?.role || "dealer")
  );
  const [gems, setGems] = useState(savedState?.gems || []);
  const [result, setResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 상태 변경시 로컬 스토리지에 자동 저장
  useEffect(() => {
    const state = { cores, gems, role };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [cores, gems, role]);

  // 역할 변경시 혼돈의 해/달 1티어 옵션 업데이트
  useEffect(() => {
    const tier1Sun = role === "dealer" ? "현란한 공격" : "신념의 강화";
    const tier1Moon = role === "dealer" ? "불타는 일격" : "낙인의 흔적";

    setCores((prev) => ({
      ...prev,
      "chaos-sun": {
        ...prev["chaos-sun"],
        tier1Option: tier1Sun,
        isTier1: true,
      },
      "chaos-moon": {
        ...prev["chaos-moon"],
        tier1Option: tier1Moon,
        isTier1: true,
      },
    }));
  }, [role]);

  const handleOptimize = useCallback(() => {
    setIsOptimizing(true);

    const inputCores = Object.entries(cores).map(([id, data]) => ({
      type: CORE_ID_TO_TYPE[id],
      grade: data.grade,
      isTier1: data.isTier1 || false,
    }));

    const inputGems = gems.map((gem) => ({ ...gem }));

    setTimeout(() => {
      try {
        let optimizeResult;
        if (role === "dealer") {
          optimizeResult = optimizeArkGrid(inputCores, inputGems);
        } else {
          optimizeResult = optimizeArkGridSupport(inputCores, inputGems);
        }
        setResult(optimizeResult);
      } catch (error) {
        console.error("Optimization failed:", error);
        setResult(null);
      }
      setIsOptimizing(false);
    }, 100);
  }, [cores, gems, role]);

  const handleLoadPreset = useCallback((preset) => {
    setCores(preset.cores);
    setGems(preset.gems);
    setRole(preset.role);
    setResult(null);
  }, []);

  const handleResetCores = useCallback(() => {
    setCores(getDefaultCores(role));
  }, [role]);

  const handleResetGems = useCallback(() => {
    setGems([]);
  }, []);

  return (
    <div className="app-container">
      <h1 className="page-title">아크그리드 젬 배치 도구</h1>

      <div className="main-layout">
        <div className="left-column">
          <RoleSelector role={role} setRole={setRole} />
          <CoreSettings
            cores={cores}
            setCores={setCores}
            role={role}
            onReset={handleResetCores}
          />
          <GemSettings
            gems={gems}
            setGems={setGems}
            onReset={handleResetGems}
          />
        </div>

        <div className="right-column">
          <Presets
            cores={cores}
            gems={gems}
            role={role}
            onLoad={handleLoadPreset}
          />
          <div className="card optimize-section">
            <button
              className="btn btn-primary optimize-btn"
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              {isOptimizing ? "검색 중..." : "최적화 검색"}
            </button>
          </div>
        </div>
      </div>

      <div className="results-wrapper">
        <Results result={result} cores={cores} />
      </div>

      <ThemeToggle />
    </div>
  );
}
