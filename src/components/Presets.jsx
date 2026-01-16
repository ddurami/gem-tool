import { useState, useEffect } from "react";
import "./Presets.css";

const MAX_PRESETS = 20;
const STORAGE_KEY = "arkgrid-presets";

export default function Presets({ cores, gems, role, onLoad }) {
  const [presets, setPresets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load presets:", e);
      }
    }
  }, []);

  const saveToStorage = (newPresets) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    setPresets(newPresets);
  };

  const handleSave = (slotIndex) => {
    const newPresets = [...presets];
    const existingIndex = newPresets.findIndex((p) => p.slot === slotIndex);

    const presetData = {
      slot: slotIndex,
      name: `프리셋 ${slotIndex + 1}`,
      cores: JSON.parse(JSON.stringify(cores)),
      gems: JSON.parse(JSON.stringify(gems)),
      role: role,
      savedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      presetData.name = newPresets[existingIndex].name;
      newPresets[existingIndex] = presetData;
    } else {
      newPresets.push(presetData);
    }

    saveToStorage(newPresets);
  };

  const handleLoad = (slotIndex) => {
    const preset = presets.find((p) => p.slot === slotIndex);
    if (preset) {
      onLoad(preset);
    }
  };

  const handleDelete = (slotIndex) => {
    const newPresets = presets.filter((p) => p.slot !== slotIndex);
    saveToStorage(newPresets);
  };

  const handleRename = (slotIndex) => {
    const preset = presets.find((p) => p.slot === slotIndex);
    if (preset) {
      setEditingId(slotIndex);
      setEditName(preset.name);
    }
  };

  const handleRenameSubmit = (slotIndex) => {
    if (editName.trim()) {
      const newPresets = presets.map((p) =>
        p.slot === slotIndex ? { ...p, name: editName.trim() } : p
      );
      saveToStorage(newPresets);
    }
    setEditingId(null);
    setEditName("");
  };

  const getPreset = (slotIndex) => presets.find((p) => p.slot === slotIndex);

  return (
    <div className="card presets-section">
      <h3 className="card-title">프리셋</h3>

      <div className="presets-list scroll-area">
        {Array.from({ length: MAX_PRESETS }, (_, i) => {
          const preset = getPreset(i);
          const isEmpty = !preset;

          return (
            <div key={i} className={`preset-item ${isEmpty ? "empty" : ""}`}>
              <div className="preset-info">
                <span className="preset-slot">{i + 1}</span>
                {editingId === i ? (
                  <input
                    type="text"
                    className="preset-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRenameSubmit(i)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleRenameSubmit(i)
                    }
                    autoFocus
                  />
                ) : (
                  <span
                    className="preset-name"
                    onClick={() => preset && handleRename(i)}
                  >
                    {preset ? preset.name : "비어 있음"}
                  </span>
                )}
              </div>

              <div className="preset-actions">
                <button
                  className="btn btn-accent"
                  onClick={() => handleSave(i)}
                >
                  저장
                </button>
                <button
                  className="btn btn-accent"
                  onClick={() => handleLoad(i)}
                  disabled={isEmpty}
                >
                  불러오기
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(i)}
                  disabled={isEmpty}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
