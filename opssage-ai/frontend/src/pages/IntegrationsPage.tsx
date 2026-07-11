import { Link } from "react-router-dom";
import Navbar from "../components/Landing/Navbar";
import Footer from "../components/Landing/Footer";

const integrations = [
  { name: "AWS CloudWatch", category: "Cloud", color: "#f59e0b", desc: "Ingest metrics, logs, and alarms from all AWS services." },
  { name: "Kubernetes", category: "Infrastructure", color: "#3b82f6", desc: "Monitor cluster health, pod states, and resource usage." },
  { name: "Prometheus", category: "Metrics", color: "#e5673a", desc: "Scrape and visualize time-series metrics from any exporter." },
  { name: "Datadog", category: "Observability", color: "#7c3aed", desc: "Bridge your existing Datadog dashboards into OpsSage." },
  { name: "PagerDuty", category: "On-Call", color: "#16a34a", desc: "Sync incidents and escalation policies bi-directionally." },
  { name: "Slack", category: "Collaboration", color: "#0ea5e9", desc: "Receive alerts, trigger runbooks, and post RCA threads." },
  { name: "GitHub", category: "CI/CD", color: "#8b5cf6", desc: "Correlate deploys with incident timelines automatically." },
  { name: "Terraform", category: "IaC", color: "#5b21b6", desc: "Track infra changes and surface drift in incident context." },
  { name: "Google Cloud", category: "Cloud", color: "#06b6d4", desc: "Full observability across GKE, Cloud Run, and Pub/Sub." },
  { name: "OpenTelemetry", category: "Tracing", color: "#10b981", desc: "Zero-code auto-instrumentation for traces and spans." },
  { name: "Jira", category: "Ticketing", color: "#2563eb", desc: "Auto-create tickets from incidents with full context." },
  { name: "Opsgenie", category: "On-Call", color: "#f97316", desc: "Sync alert routing, schedules and acknowledgements." },
];

export function IntegrationsPage(): JSX.Element {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: "64px" }}>
        <section style={{ padding: "80px 0 64px", borderBottom: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-100px", left: "50%", transform: "translateX(-50%)",
            width: "600px", height: "400px",
            background: "radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div className="max-w-7xl mx-auto px-6 text-center" style={{ position: "relative", zIndex: 1 }}>
            <p style={{ color: "#06b6d4", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              Integrations
            </p>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "16px", lineHeight: 1.1 }}>
              Connect your entire stack in minutes.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "17px", maxWidth: "520px", margin: "0 auto 40px", lineHeight: 1.7 }}>
              100+ native integrations. No custom code. Plug OpsSage into your existing tools and get observability from day one.
            </p>
            <Link to="/dashboard" className="l-btn-primary" style={{ fontSize: "15px", padding: "12px 32px" }}>
              Connect Integrations
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="l-card"
                  style={{ padding: "24px", cursor: "pointer", transition: "all 0.2s ease" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${item.color}40`;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px",
                    background: `${item.color}15`, border: `1px solid ${item.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "14px",
                  }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "4px", background: item.color, opacity: 0.9 }} />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{item.name}</div>
                  <div style={{ fontSize: "11px", color: item.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{item.category}</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.55 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
