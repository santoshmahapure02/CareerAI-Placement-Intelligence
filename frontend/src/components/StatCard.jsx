import { Link } from "react-router-dom";

export default function StatCard({
  icon = "📊",
  label = "Metric",
  value = 0,
  badge = null,
  badgeColor = "#00d4aa",
  badgeBg = "rgba(0,212,170,0.15)",
  gradient = "linear-gradient(135deg, #0d1627, #0d1a2e)",
  borderColor = "rgba(59,130,246,0.2)",
  iconBg = "rgba(59,130,246,0.15)",
  subtext = null,
  to = null,
  onClick = null,
}) {
  const content = (
    <div
      className="cai-stat-card"
      style={{
        background: gradient,
        borderColor: borderColor,
      }}
      onClick={onClick}
    >
      <div className="cai-stat-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cai-stat-num">{value}</div>
        <div className="cai-stat-label">{label}</div>
        {subtext && <div className="cai-stat-subtext">{subtext}</div>}
      </div>
      {badge && (
        <div
          className="cai-stat-badge"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {badge}
        </div>
      )}
      {to && <div className="cai-stat-arr">→</div>}
    </div>
  );

  return (
    <>
      <style>{`
        .cai-stat-card {
          border-radius: 14px;
          padding: 18px 18px 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
          font-family: 'Inter', sans-serif;
        }
        .cai-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .cai-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .cai-stat-num {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          margin-bottom: 3px;
        }
        .cai-stat-label {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 500;
        }
        .cai-stat-subtext {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .cai-stat-badge {
          position: absolute;
          top: 14px;
          right: 14px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
        }
        .cai-stat-arr {
          position: absolute;
          right: 14px;
          bottom: 12px;
          font-size: 13px;
          color: #64748b;
          transition: color 0.2s, transform 0.2s;
        }
        .cai-stat-card:hover .cai-stat-arr {
          color: #00d4aa;
          transform: translateX(3px);
        }
      `}</style>
      {to ? (
        <Link to={to} style={{ textDecoration: "none" }}>
          {content}
        </Link>
      ) : (
        content
      )}
    </>
  );
}
