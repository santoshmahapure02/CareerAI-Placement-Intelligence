export default function PageHero({
  tag = "CAREERAI PLATFORM",
  tagIcon = "✨",
  title = "Page Title",
  highlight = "",
  titleAfter = "",
  subtitle = "Subtitle description",
  rightWidget = null,
  actions = null,
}) {
  return (
    <>
      <style>{`
        .cai-hero {
          background: linear-gradient(135deg, rgba(13, 18, 28, 0.9) 0%, rgba(10, 15, 24, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 18px 24px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .cai-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 90% 50%, rgba(0, 212, 170, 0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .cai-hero-left {
          flex: 1;
          min-width: 0;
          z-index: 1;
        }
        .cai-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          color: #00d4aa;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 5px;
        }
        .cai-hero-title {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.2;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .cai-hero-title span {
          color: #00d4aa;
        }
        .cai-hero-sub {
          font-size: 13px;
          color: #94a3b8;
          max-width: 580px;
          line-height: 1.5;
          margin: 0;
        }
        .cai-hero-right {
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        @media (max-width: 860px) {
          .cai-hero {
            flex-direction: column;
            align-items: flex-start;
          }
          .cai-hero-right {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
      <div className="cai-hero">
        <div className="cai-hero-left">
          <div className="cai-hero-tag">
            <span>{tagIcon}</span> {tag}
          </div>
          <h1 className="cai-hero-title">
            {title} {highlight && <span>{highlight}</span>} {titleAfter}
          </h1>
          <p className="cai-hero-sub">{subtitle}</p>
        </div>
        {(rightWidget || actions) && (
          <div className="cai-hero-right">
            {actions}
            {rightWidget}
          </div>
        )}
      </div>
    </>
  );
}
