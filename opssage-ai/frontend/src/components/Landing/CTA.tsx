import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section style={{ padding: "96px 0" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div
          style={{
            borderRadius: "20px",
            border: "1px solid rgba(139,92,246,0.25)",
            background: "linear-gradient(135deg, rgba(109,40,217,0.12) 0%, rgba(6,182,212,0.06) 100%)",
            padding: "72px 48px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background decorative blobs */}
          <div style={{
            position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
            width: "500px", height: "300px",
            background: "radial-gradient(ellipse, rgba(109,40,217,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <p style={{ color: "#a78bfa", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", position: "relative" }}>
            Get Started Today
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: "1.1",
              color: "var(--text-primary)",
              marginBottom: "20px",
              position: "relative",
            }}
          >
            Your infrastructure deserves<br />
            <span style={{
              background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>better operations.</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "17px", marginBottom: "40px", position: "relative" }}>
            Join 800+ engineering teams. Set up in 5 minutes. No contracts.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "14px", position: "relative" }}>
            <Link to="/dashboard" className="l-btn-primary" style={{ fontSize: "15px", padding: "14px 36px" }}>
              Open the Command Center
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link to="/dashboard" className="l-btn-secondary" style={{ fontSize: "15px", padding: "14px 36px" }}>
              Schedule a Live Demo
            </Link>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "20px", position: "relative" }}>
            Free plan available · SOC 2 certified · GDPR compliant
          </p>
        </div>
      </div>
    </section>
  );
}
