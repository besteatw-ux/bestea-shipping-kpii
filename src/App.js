import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";

/* ─────────────────────────────────────────────
   BESTEA 出貨暨庫存管理 KPI 試算工具
   最終定案版 — CodeSandbox-ready
   ───────────────────────────────────────────── */

// ── Icons (inline SVG to avoid dependency issues in CodeSandbox) ──
const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const Icons = {
  package: () => (
    <Icon d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
  ),
  users: () => (
    <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 3a4 4 0 110 8 4 4 0 010-8z M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  ),
  check: () => (
    <Icon d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3" />
  ),
  alert: () => (
    <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4M12 17h.01" />
  ),
  trending: () => <Icon d="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" />,
  star: () => (
    <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  ),
  info: () => (
    <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4M12 8h.01" />
  ),
  minus: () => <Icon d="M5 12h14" />,
  plus: () => <Icon d="M12 5v14M5 12h14" />,
  crown: () => (
    <Icon d="M2 20h20 M4 20l2-14 4 6 2-8 2 8 4-6 2 14" strokeWidth={1.8} />
  ),
};

// ── Scoring Rules Reference (from the official document) ──
const RULES = {
  shipping: [
    { range: "0 件", score: 35, color: "#22c55e" },
    { range: "1 件", score: 30, color: "#eab308" },
    { range: "2 件", score: 18, color: "#f97316" },
    { range: "≥3 件", score: 0, color: "#ef4444" },
  ],
  fulfillment: [
    { range: "0 件", score: 25, color: "#22c55e" },
    { range: "≥1 件", score: 0, color: "#ef4444" },
  ],
  inventory: [
    { range: "0 件（無事故）", score: 20, color: "#22c55e" },
    { range: "≥1 件 或 事故", score: 0, color: "#ef4444" },
  ],
  packaging: [
    { range: "0 件", score: 20, color: "#22c55e" },
    { range: "1 件", score: 14, color: "#eab308" },
    { range: "2 件", score: 8, color: "#f97316" },
    { range: "≥3 件", score: 0, color: "#ef4444" },
  ],
};

// ── Mini rule tooltip component ──
const RuleTooltip = ({ rules, isOpen, onToggle }) => (
  <div style={{ position: "relative", display: "inline-block" }}>
    <button
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        opacity: 0.4,
        transition: "opacity 0.2s",
        padding: "2px",
      }}
      onMouseEnter={(e) => (e.target.style.opacity = 1)}
      onMouseLeave={(e) => (e.target.style.opacity = isOpen ? 1 : 0.4)}
      title="查看評分規則"
    >
      <Icons.info />
    </button>
    {isOpen && (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 8,
          background: "#1e293b",
          color: "#e2e8f0",
          borderRadius: 12,
          padding: "12px 16px",
          zIndex: 50,
          minWidth: 180,
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          fontSize: 12,
          lineHeight: 1.6,
          animation: "fadeIn 0.15s ease-out",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            fontSize: 11,
            color: "#94a3b8",
            letterSpacing: "0.05em",
          }}
        >
          評分標準
        </div>
        {rules.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <span>{r.range}</span>
            <span style={{ fontWeight: 700, color: r.color }}>
              {r.score} 分
            </span>
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 12,
            height: 12,
            background: "#1e293b",
            transform: "translateX(-50%) rotate(45deg)",
          }}
        />
      </div>
    )}
  </div>
);

// ── Number stepper component ──
const Stepper = ({ value, onChange, danger }) => {
  const btnStyle = {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    color: "#64748b",
    fontSize: 18,
    fontWeight: 600,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        style={btnStyle}
        onClick={() => onChange(Math.max(0, value - 1))}
        onMouseEnter={(e) => {
          e.target.style.background = "#f8fafc";
          e.target.style.borderColor = "#cbd5e1";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "#fff";
          e.target.style.borderColor = "#e2e8f0";
        }}
      >
        −
      </button>
      <span
        style={{
          width: 48,
          textAlign: "center",
          fontSize: 28,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: danger ? "#ef4444" : "#22c55e",
          transition: "color 0.2s",
        }}
      >
        {value}
      </span>
      <button
        style={btnStyle}
        onClick={() => onChange(value + 1)}
        onMouseEnter={(e) => {
          e.target.style.background = "#f8fafc";
          e.target.style.borderColor = "#cbd5e1";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "#fff";
          e.target.style.borderColor = "#e2e8f0";
        }}
      >
        +
      </button>
    </div>
  );
};

// ── Score badge component ──
const ScoreBadge = ({ score, max }) => {
  const pct = score / max;
  const bg = pct === 1 ? "#dcfce7" : pct >= 0.5 ? "#fef9c3" : "#fee2e2";
  const fg = pct === 1 ? "#15803d" : pct >= 0.5 ? "#a16207" : "#dc2626";
  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        padding: "6px 14px",
        textAlign: "center",
        minWidth: 72,
        transition: "all 0.3s",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: fg,
          opacity: 0.7,
          marginBottom: 2,
        }}
      >
        得分
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: fg,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>
          /{max}
        </span>
      </div>
    </div>
  );
};

// ── localStorage helpers ──
const STORAGE_KEY = "bestea-kpi-data";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToDisk(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — silently fail */
  }
}

// ── Main App ──
export default function App() {
  const saved = useRef(loadSaved());
  const s = saved.current;

  const [revenue, setRevenue] = useState(s?.revenue ?? 3500000);
  const [staffMode, setStaffMode] = useState(s?.staffMode ?? "2_even");
  const [shippingErrors, setShippingErrors] = useState(s?.shippingErrors ?? 0);
  const [fulfillmentErrors, setFulfillmentErrors] = useState(
    s?.fulfillmentErrors ?? 0
  );
  const [inventoryErrors, setInventoryErrors] = useState(
    s?.inventoryErrors ?? 0
  );
  const [packagingErrors, setPackagingErrors] = useState(
    s?.packagingErrors ?? 0
  );
  const [inventoryIncident, setInventoryIncident] = useState(
    s?.inventoryIncident ?? false
  );
  const [openTooltip, setOpenTooltip] = useState(null);
  const [showSaved, setShowSaved] = useState(false);

  // Auto-save on every change (debounced visual feedback)
  useEffect(() => {
    const data = {
      revenue,
      staffMode,
      shippingErrors,
      fulfillmentErrors,
      inventoryErrors,
      packagingErrors,
      inventoryIncident,
      lastSaved: new Date().toISOString(),
    };
    saveToDisk(data);
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1500);
    return () => clearTimeout(t);
  }, [
    revenue,
    staffMode,
    shippingErrors,
    fulfillmentErrors,
    inventoryErrors,
    packagingErrors,
    inventoryIncident,
  ]);

  const handleReset = useCallback(() => {
    if (!confirm("確定要清除所有數據，恢復預設值嗎？")) return;
    setRevenue(3500000);
    setStaffMode("2_even");
    setShippingErrors(0);
    setFulfillmentErrors(0);
    setInventoryErrors(0);
    setPackagingErrors(0);
    setInventoryIncident(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const results = useMemo(() => {
    // ① 出貨正確率 (35分)
    let shipScore = 0;
    if (shippingErrors === 0) shipScore = 35;
    else if (shippingErrors === 1) shipScore = 30;
    else if (shippingErrors === 2) shipScore = 18;
    else shipScore = 0; // 3件（含）以上

    // ② 訂單履行時效 (25分) — 一律歸零制
    let fulfillmentScore = fulfillmentErrors === 0 ? 25 : 0;

    // ③ 庫存管理穩定度 (20分) — 門檻制 + 營運事故條款
    let inventoryScore = 0;
    if (!inventoryIncident && inventoryErrors === 0) {
      inventoryScore = 20;
    }

    // ④ 包裝責任客訴 (20分)
    let packageScore = 0;
    if (packagingErrors === 0) packageScore = 20;
    else if (packagingErrors === 1) packageScore = 14;
    else if (packagingErrors === 2) packageScore = 8;
    else packageScore = 0; // 3件（含）以上

    const rawTotalScore =
      shipScore + fulfillmentScore + inventoryScore + packageScore;

    // 品質穩定月判定（需同時符合全部條件）
    const isQualityMonth =
      shippingErrors === 0 &&
      fulfillmentErrors === 0 &&
      inventoryErrors === 0 &&
      !inventoryIncident &&
      packagingErrors === 0;

    // 加成後分數（上限120）
    const finalScore = isQualityMonth
      ? Math.min(rawTotalScore * 1.2, 120)
      : rawTotalScore;

    // 獎金池 = 營收 × 0.1%
    const bonusPool = Math.round(revenue * 0.001);

    // 實際可分獎金 = 獎金池 × (最終得分 ÷ 100)
    const actualTotalBonus = Math.round(bonusPool * (finalScore / 100));

    // 人員分配
    let staffDistribution = [];
    if (staffMode === "2_even") {
      const per = Math.round(actualTotalBonus / 2);
      staffDistribution = [
        { label: "員工 A", amount: per, ratio: "50%", weight: 1 },
        { label: "員工 B", amount: per, ratio: "50%", weight: 1 },
      ];
    } else if (staffMode === "3_even") {
      const per = Math.round(actualTotalBonus / 3);
      staffDistribution = [
        { label: "員工 A", amount: per, ratio: "33.3%", weight: 1 },
        { label: "員工 B", amount: per, ratio: "33.3%", weight: 1 },
        { label: "員工 C", amount: per, ratio: "33.3%", weight: 1 },
      ];
    } else if (staffMode === "3_weighted") {
      const unit = actualTotalBonus / 5;
      staffDistribution = [
        {
          label: "資深人員 A",
          amount: Math.round(unit * 2),
          ratio: "40%",
          weight: 2,
        },
        {
          label: "資深人員 B",
          amount: Math.round(unit * 2),
          ratio: "40%",
          weight: 2,
        },
        {
          label: "新進人員 C",
          amount: Math.round(unit * 1),
          ratio: "20%",
          weight: 1,
        },
      ];
    }

    return {
      scores: { shipScore, fulfillmentScore, inventoryScore, packageScore },
      rawTotalScore,
      finalScore,
      isQualityMonth,
      bonusPool,
      actualTotalBonus,
      staffDistribution,
    };
  }, [
    revenue,
    staffMode,
    shippingErrors,
    fulfillmentErrors,
    inventoryErrors,
    packagingErrors,
    inventoryIncident,
  ]);

  const scoreColor = results.isQualityMonth
    ? "#059669"
    : results.finalScore >= 80
    ? "#2563eb"
    : results.finalScore >= 60
    ? "#d97706"
    : "#dc2626";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #f0f4f8 0%, #e8edf5 50%, #f5f0eb 100%)",
        fontFamily:
          "'Noto Sans TC', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#1e293b",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700;900&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes scoreIn { 
          0% { transform: scale(0.8); opacity: 0; } 
          60% { transform: scale(1.05); } 
          100% { transform: scale(1); opacity: 1; } 
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* ═══ HEADER ═══ */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 20,
            marginBottom: 32,
            animation: "slideUp 0.5s ease-out",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#1e293b",
                color: "#f8fafc",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              <Icons.package /> BESTEA 內部管理
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.3,
                background: "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              出貨暨庫存管理 KPI 試算
            </h1>
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                marginTop: 4,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              最終定案版 ・ 自動化獎金核算工具
              {showSaved && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#22c55e",
                    background: "#f0fdf4",
                    padding: "2px 8px",
                    borderRadius: 6,
                    animation: "fadeIn 0.2s ease-out",
                  }}
                >
                  ✓ 已自動儲存
                </span>
              )}
            </p>
            <button
              onClick={handleReset}
              style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 600,
                color: "#94a3b8",
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.color = "#ef4444";
                e.target.style.borderColor = "#fca5a5";
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#94a3b8";
                e.target.style.borderColor = "#e2e8f0";
              }}
            >
              清除數據並重置
            </button>
          </div>

          {/* Revenue Input */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "16px 24px",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                當月總營收 (TWD)
              </div>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value) || 0)}
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#1e293b",
                  border: "none",
                  outline: "none",
                  width: 160,
                  background: "transparent",
                  fontFamily: "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
            <div style={{ width: 1, height: 40, background: "#e2e8f0" }} />
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                獎金池 (0.1%)
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#2563eb",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${results.bonusPool.toLocaleString()}
              </div>
            </div>
          </div>
        </header>

        {/* ═══ MAIN GRID ═══ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: KPI Inputs ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "slideUp 0.6s ease-out",
            }}
          >
            {/* KPI Card */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #1e293b, #334155)",
                  padding: "16px 24px",
                  color: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "0.02em",
                  }}
                >
                  KPI 扣分項錄入（件數制）
                </span>
                <span
                  style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}
                >
                  以每 1,000 筆訂單計
                </span>
              </div>

              <div style={{ padding: "8px 0" }}>
                {/* ① Shipping */}
                <KpiRow
                  title="出貨正確率"
                  subtitle="裝錯、少裝、多裝件數"
                  weight={35}
                  score={results.scores.shipScore}
                  maxScore={35}
                  value={shippingErrors}
                  onChange={setShippingErrors}
                  rules={RULES.shipping}
                  openTooltip={openTooltip}
                  tooltipKey="ship"
                  onToggleTooltip={() =>
                    setOpenTooltip(openTooltip === "ship" ? null : "ship")
                  }
                />

                <div
                  style={{ height: 1, background: "#f1f5f9", margin: "0 24px" }}
                />

                {/* ② Fulfillment */}
                <KpiRow
                  title="訂單履行時效"
                  subtitle="漏寄、誤放、遺漏處理件數"
                  weight={25}
                  score={results.scores.fulfillmentScore}
                  maxScore={25}
                  value={fulfillmentErrors}
                  onChange={setFulfillmentErrors}
                  rules={RULES.fulfillment}
                  openTooltip={openTooltip}
                  tooltipKey="fulfill"
                  onToggleTooltip={() =>
                    setOpenTooltip(openTooltip === "fulfill" ? null : "fulfill")
                  }
                  hint="⚠ 1件即歸零"
                />

                <div
                  style={{ height: 1, background: "#f1f5f9", margin: "0 24px" }}
                />

                {/* ③ Inventory */}
                <KpiRow
                  title="庫存管理穩定度"
                  subtitle="盤點帳貨差異件數"
                  weight={20}
                  score={results.scores.inventoryScore}
                  maxScore={20}
                  value={inventoryErrors}
                  onChange={setInventoryErrors}
                  rules={RULES.inventory}
                  openTooltip={openTooltip}
                  tooltipKey="inv"
                  onToggleTooltip={() =>
                    setOpenTooltip(openTooltip === "inv" ? null : "inv")
                  }
                  hint="門檻制"
                  extra={
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: inventoryIncident ? "#dc2626" : "#94a3b8",
                        transition: "color 0.2s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={inventoryIncident}
                        onChange={(e) => setInventoryIncident(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: "#dc2626",
                          cursor: "pointer",
                        }}
                      />
                      觸發營運事故（缺貨延遲 / 取消）
                    </label>
                  }
                />

                <div
                  style={{ height: 1, background: "#f1f5f9", margin: "0 24px" }}
                />

                {/* ④ Packaging */}
                <KpiRow
                  title="包裝責任客訴"
                  subtitle="缺漏、貼錯標籤、備註未看"
                  weight={20}
                  score={results.scores.packageScore}
                  maxScore={20}
                  value={packagingErrors}
                  onChange={setPackagingErrors}
                  rules={RULES.packaging}
                  openTooltip={openTooltip}
                  tooltipKey="pkg"
                  onToggleTooltip={() =>
                    setOpenTooltip(openTooltip === "pkg" ? null : "pkg")
                  }
                />
              </div>
            </div>

            {/* Staff Configuration */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 24,
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  <Icons.users />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    部門人力配置與分配比例
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}
                  >
                    選擇當前人數與分配規則
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {[
                  {
                    key: "2_even",
                    name: "2 人平分",
                    desc: "1 : 1",
                    tag: "目前",
                  },
                  {
                    key: "3_even",
                    name: "3 人平分",
                    desc: "1 : 1 : 1",
                    tag: null,
                  },
                  {
                    key: "3_weighted",
                    name: "3 人加權",
                    desc: "2 : 2 : 1",
                    tag: "未來",
                  },
                ].map((opt) => {
                  const active = staffMode === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setStaffMode(opt.key)}
                      style={{
                        padding: "14px 12px",
                        borderRadius: 14,
                        cursor: "pointer",
                        border: active
                          ? "2px solid #2563eb"
                          : "1.5px solid #e2e8f0",
                        background: active
                          ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                          : "#fff",
                        color: active ? "#fff" : "#475569",
                        transition: "all 0.2s",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {opt.tag && (
                        <span
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -4,
                            fontSize: 9,
                            fontWeight: 800,
                            background: active ? "#fbbf24" : "#e2e8f0",
                            color: active ? "#78350f" : "#64748b",
                            padding: "2px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {opt.tag}
                        </span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        {opt.name}
                      </span>
                      <span
                        style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}
                      >
                        比例 {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Results ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              animation: "slideUp 0.7s ease-out",
            }}
          >
            {/* Score Card */}
            <div
              style={{
                background: results.isQualityMonth
                  ? "linear-gradient(145deg, #059669, #047857, #065f46)"
                  : results.finalScore >= 80
                  ? "linear-gradient(145deg, #1e40af, #2563eb, #1d4ed8)"
                  : results.finalScore >= 60
                  ? "linear-gradient(145deg, #b45309, #d97706, #ca8a04)"
                  : "linear-gradient(145deg, #b91c1c, #dc2626, #ef4444)",
                borderRadius: 24,
                padding: 28,
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                transition: "background 0.5s",
              }}
            >
              {/* Decorative circle */}
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: -20,
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
                  KPI 最終得分
                </div>
                {results.isQualityMonth && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(251, 191, 36, 0.9)",
                      color: "#78350f",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                  >
                    <Icons.crown /> 品質穩定月 ×1.2
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginBottom: 4,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontSize: 72,
                    fontWeight: 900,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    animation: "scoreIn 0.4s ease-out",
                  }}
                >
                  {results.finalScore}
                </span>
                <span style={{ fontSize: 20, fontWeight: 500, opacity: 0.5 }}>
                  / {results.isQualityMonth ? "120" : "100"}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  marginBottom: 24,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.8)",
                    width: `${Math.min(
                      (results.finalScore /
                        (results.isQualityMonth ? 120 : 100)) *
                        100,
                      100
                    )}%`,
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>

              {/* Bonus details */}
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    可領獎金總額
                  </span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ${results.actualTotalBonus.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.15)",
                    marginBottom: 10,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    opacity: 0.7,
                    marginBottom: 4,
                  }}
                >
                  <span>獎金池基數</span>
                  <span>${results.bonusPool.toLocaleString()}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    opacity: 0.7,
                    marginBottom: 4,
                  }}
                >
                  <span>得分係數</span>
                  <span>{(results.finalScore / 100).toFixed(2)}</span>
                </div>
                {results.isQualityMonth && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    <span>加成前原始獎金</span>
                    <span>${results.bonusPool.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Distribution Card */}
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#475569",
                }}
              >
                <Icons.users /> 人員獎金分配明細
              </div>
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {results.staffDistribution.map((staff, idx) => {
                  const maxAmt = Math.max(
                    ...results.staffDistribution.map((s) => s.amount)
                  );
                  const barPct = maxAmt > 0 ? (staff.amount / maxAmt) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        background: "#f8fafc",
                        border: "1px solid #e8edf5",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Background bar */}
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${barPct}%`,
                          background:
                            "linear-gradient(90deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))",
                          transition: "width 0.5s ease-out",
                        }}
                      />
                      <div
                        style={{
                          position: "relative",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#334155",
                            }}
                          >
                            {staff.label}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            權重 {staff.ratio}
                            {staff.weight > 1 && ` (×${staff.weight})`}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 900,
                            color: "#1e40af",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          ${staff.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Alert */}
            <StatusAlert
              isQualityMonth={results.isQualityMonth}
              finalScore={results.finalScore}
              rawScore={results.rawTotalScore}
            />

            {/* Quick reference */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                padding: "14px 18px",
                fontSize: 11,
                color: "#64748b",
                lineHeight: 1.8,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 4,
                  color: "#475569",
                  fontSize: 12,
                }}
              >
                公式速查
              </div>
              <div>獎金池 = 月營收 × 0.1%</div>
              <div>實際獎金 = 獎金池 × (KPI得分 ÷ 100)</div>
              <div>品質穩定月 = 全項目零錯誤 → 得分 ×1.2（上限120）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Row Component ──
function KpiRow({
  title,
  subtitle,
  weight,
  score,
  maxScore,
  value,
  onChange,
  rules,
  openTooltip,
  tooltipKey,
  onToggleTooltip,
  hint,
  extra,
}) {
  return (
    <div style={{ padding: "20px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>
              {title}
            </h3>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 6,
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              {weight}分
            </span>
            {hint && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "#fef2f2",
                  color: "#dc2626",
                }}
              >
                {hint}
              </span>
            )}
            <RuleTooltip
              rules={rules}
              isOpen={openTooltip === tooltipKey}
              onToggle={onToggleTooltip}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
          {extra}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Stepper value={value} onChange={onChange} danger={value > 0} />
          <ScoreBadge score={score} max={maxScore} />
        </div>
      </div>
    </div>
  );
}

// ── Status Alert Component ──
function StatusAlert({ isQualityMonth, finalScore, rawScore }) {
  if (isQualityMonth) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
          border: "1px solid #a7f3d0",
          borderRadius: 16,
          padding: "16px 20px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ color: "#059669", marginTop: 2, flexShrink: 0 }}>
          <Icons.star />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#065f46" }}>
            卓越表現：品質穩定月
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#047857",
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            本月全項目零錯誤，獎金已套用 120% 加成。原始得分 {rawScore} → 最終{" "}
            {finalScore}。
          </div>
        </div>
      </div>
    );
  }
  if (finalScore < 60) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
          border: "1px solid #fca5a5",
          borderRadius: 16,
          padding: "16px 20px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ color: "#dc2626", marginTop: 2, flexShrink: 0 }}>
          <Icons.alert />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#991b1b" }}>
            營運預警
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#b91c1c",
              marginTop: 4,
              lineHeight: 1.6,
            }}
          >
            得分偏低，獎金池縮減明顯，建議立即檢討錯誤環節。
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
        border: "1px solid #93c5fd",
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div style={{ color: "#2563eb", marginTop: 2, flexShrink: 0 }}>
        <Icons.trending />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af" }}>
          穩定運作
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#1d4ed8",
            marginTop: 4,
            lineHeight: 1.6,
          }}
        >
          目前運作良好，持續保持零錯誤即可獲得品質穩定月 120% 加成。
        </div>
      </div>
    </div>
  );
}
