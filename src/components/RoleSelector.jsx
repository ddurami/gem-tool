import "./RoleSelector.css";

export default function RoleSelector({ role, setRole }) {
  return (
    <div className="card role-section">
      <div className="role-content">
        <span className="role-label">역할 선택</span>
        <div className="btn-group role-buttons">
          <button
            className={`btn ${role === "dealer" ? "active" : ""}`}
            onClick={() => setRole("dealer")}
          >
            딜러
          </button>
          <button className="btn" disabled title="구현 예정">
            서포터
          </button>
        </div>
      </div>
    </div>
  );
}
