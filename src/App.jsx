import { useState, useCallback, useEffect } from "react";
import ThemeToggle from "./components/ThemeToggle";
import RoleSelector from "./components/RoleSelector";
import CoreSettings from "./components/CoreSettings";
import GemSettings from "./components/GemSettings";
import Presets from "./components/Presets";
import Results from "./components/Results";
import { optimizeArkGrid } from "./optimizer/OptimizerDeal.js";
import "./App.css";

// 로컬 스토리지 키
const STORAGE_KEYS = {
  ROLE: "role",
  CORE: "core",
  GEM: "gem",
};
const LEGACY_STORAGE_KEY = "arkgrid-current-state";

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
    "order-sun": { grade: "유물", subName: "", isTier1: false },
    "order-moon": { grade: "유물", subName: "", isTier1: false },
    "order-star": { grade: "유물", subName: "", isTier1: false },
    "chaos-sun": { grade: "유물", subName: tier1Sun, isTier1: true },
    "chaos-moon": { grade: "유물", subName: tier1Moon, isTier1: true },
    "chaos-star": { grade: "유물", subName: "", isTier1: false },
  };
};

// 로컬 스토리지에서 개별 값 로드
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(`Failed to load ${key}:`, e);
  }
  return defaultValue;
};

// 코어/젬 데이터 마이그레이션 (기존 저장값 유지)
const normalizeCores = (cores, role) => {
  if (!cores) return getDefaultCores(role);
  const base = getDefaultCores(role);
  const next = { ...base, ...cores };
  Object.keys(next).forEach((key) => {
    const core = next[key];
    if (!core) return;
    if (core.subName === undefined && core.tier1Option !== undefined) {
      core.subName = core.tier1Option || "";
    }
    if (core.isTier1 === undefined) {
      core.isTier1 = false;
    }
    if (!core.grade) {
      core.grade = base[key]?.grade || "유물";
    }
  });
  return next;
};

const normalizeGems = (gems = []) => {
  return gems.map((g, idx) => {
    const opt1Type = g.opt1Type ?? g.optionNameA ?? "";
    const opt1Lvl = g.opt1Lvl ?? g.optionLevelA ?? 0;
    const opt2Type = g.opt2Type ?? g.optionNameB ?? "";
    const opt2Lvl = g.opt2Lvl ?? g.optionLevelB ?? 0;
    return {
      ...g,
      opt1Type,
      opt1Lvl,
      opt2Type,
      opt2Lvl,
      name: g.name || `${g.type}의 젬 #${g.gemNum || idx + 1}`,
    };
  });
};

const migrateLegacyStorage = () => {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy);
    const role = parsed?.role || "dealer";
    if (!localStorage.getItem(STORAGE_KEYS.ROLE)) {
      localStorage.setItem(STORAGE_KEYS.ROLE, JSON.stringify(role));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CORE) && parsed?.cores) {
      const normalized = normalizeCores(parsed.cores, role);
      localStorage.setItem(STORAGE_KEYS.CORE, JSON.stringify(normalized));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GEM) && parsed?.gems) {
      const normalized = normalizeGems(parsed.gems);
      localStorage.setItem(STORAGE_KEYS.GEM, JSON.stringify(normalized));
    }
  } catch (e) {
    console.error("Failed to migrate legacy state:", e);
  }
};

export default function App() {
  migrateLegacyStorage();
  // 로컬 스토리지에서 개별 상태 로드
  const savedRole = loadFromStorage(STORAGE_KEYS.ROLE, "dealer");
  const savedCores = loadFromStorage(STORAGE_KEYS.CORE, null);
  const savedGems = loadFromStorage(STORAGE_KEYS.GEM, []);

  const [role, setRole] = useState(savedRole);
  const [cores, setCores] = useState(
    normalizeCores(savedCores, savedRole)
  );
  const [gems, setGems] = useState(normalizeGems(savedGems));
  const [result, setResult] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 역할 변경시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, JSON.stringify(role));
  }, [role]);

  // 코어 변경시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CORE, JSON.stringify(cores));
  }, [cores]);

  // 젬 변경시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GEM, JSON.stringify(gems));
  }, [gems]);

  // 역할 변경시 혼돈의 해/달 1티어 옵션 업데이트
  useEffect(() => {
    const tier1Sun = role === "dealer" ? "현란한 공격" : "신념의 강화";
    const tier1Moon = role === "dealer" ? "불타는 일격" : "낙인의 흔적";

    setCores((prev) => ({
      ...prev,
      "chaos-sun": {
        ...prev["chaos-sun"],
        subName: tier1Sun,
        isTier1: true,
      },
      "chaos-moon": {
        ...prev["chaos-moon"],
        subName: tier1Moon,
        isTier1: true,
      },
    }));
  }, [role]);

  const handleOptimize = useCallback(() => {
    setIsOptimizing(true);

    const inputCores = Object.keys(CORE_ID_TO_TYPE).map((id) => {
      const data = cores[id] || getDefaultCores(role)[id];
      return {
        type: CORE_ID_TO_TYPE[id],
        grade: data.grade,
        subName: data.subName || "",
      };
    });

    const inputGems = gems.map((gem) => ({ ...gem }));

    setTimeout(() => {
      try {
        const optimizeResult = optimizeArkGrid(inputCores, inputGems);
        setResult(optimizeResult);
      } catch (error) {
        console.error("최적화 실패:", error);
        setResult(null);
      }
      setIsOptimizing(false);
    }, 100);
  }, [cores, gems, role]);

  const handleLoadPreset = useCallback((preset) => {
    setCores(normalizeCores(preset.cores, preset.role || "dealer"));
    setGems(normalizeGems(preset.gems || []));
    setRole(preset.role || "dealer");
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
