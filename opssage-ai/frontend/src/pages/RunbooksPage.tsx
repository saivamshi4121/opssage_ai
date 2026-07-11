import { Link } from "react-router-dom";
import Navbar from "../components/Landing/Navbar";
import Footer from "../components/Landing/Footer";

const runbooks = [
  {
    name: "scale-db-connections",
    trigger: "DB pool exhausted",
    steps: 4,
    lastRun: "14s ago",
    status: "success",
    accent: "#10b981",
  },
  {
    name: "restart-crashlooping-pod",
    trigger: "CrashLoopBackOff detected",
    steps: 3,
    lastRun: "2m ago",
    status: "success",
    accent: "#10b981",
  },
  {
    name: "scale-up-k8s-nodes",
    trigger: "Node CPU > 90% for 5m",
    steps: 6,
    lastRun: "11m ago",
    status: "running",
    accent: "#f59e0b",
  },
  {
    name: "rollback-failed-deploy",
    trigger: "Error rate spike > 5%",
    steps: 5,
    lastRun: "1h ago",
    status: "success",
    accent: "#10b981",
  },
  {
    name: "clear-redis-cache",
    trigger: "Cache hit rate < 10%",
    steps: 2,
    lastRun: "3h ago",
    status: "success",
    accent: "#10b981",
  },
  {
    name: "notify-on-call-critical",
    trigger: "P0 incident detected",
    steps: 3,
    lastRun: "Never",
    status: "idle",
    accent: "#6b7280",
  },
];

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  success: { bg: "rgba(16,185,129,0.1)", color: "#34d399", label: "✓ Success" },
  running: { bg: "rgba(245,158,11,0.1)", color: "#fbbf24", label: "⟳ Running" },
  idle:    { bg: "rgba(107,114,128,0.1)", color: "#9ca3af", label: "— Idle" },
};

export function RunbooksPage(): JSX.Element {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: "64px" }}>
        <section style={{ padding: "80px 0 64px", borderBottom: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-100px", right: "0",
            width: "500px", height: "400px",
            background: "radial-gradient(ellipse, rgba(109,40,217,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div className="max-w-7xl mx-auto px-6" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
              <div>
                <p style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
                  Runbooks
                </p>
                <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "14px" }}>
                  Incident response,<br />
                  <span style={{ background: "linear-gradient(135deg, #a78bfa, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    as code.
                  </span>
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "16px", maxWidth: "480px", lineHeight: 1.7 }}>
                  Write, version, and auto-trigger runbooks from alert conditions. Every execution is logged and auditable.
                </p>
              </div>
              <Link to="/dashboard" className="l-btn-primary" style={{ fontSize: "14px", padding: "11px 24px", flexShrink: 0 }}>
                + New Runbook
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "48px 0" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Header row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 80px 120px 120px 80px",
                padding: "0 20px 10px",
                borderBottom: "1px solid var(--border)",
                gap: "16px",
              }}>
                {["Name", "Trigger", "Steps", "Last Run", "Status", ""].map((h) => (
                  <div key={h} style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>

              {runbooks.map((r) => {
                const s = statusStyle[r.status];
                return (
                  <div
                    key={r.name}
                    className="l-card"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 80px 120px 120px 80px",
                      padding: "16px 20px",
                      alignItems: "center",
                      gap: "16px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.accent, boxShadow: `0 0 6px ${r.accent}`, flexShrink: 0 }} />
                      <span style={{ color: "var(--text-primary)", fontSize: "13.5px", fontWeight: 600, fontFamily: "monospace" }}>{r.name}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>{r.trigger}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{r.steps} steps</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>{r.lastRun}</div>
                    <div>
                      <span style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11.5px", fontWeight: 600, background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--text-muted)", fontSize: "12px", textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                    >
                      Edit →
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
