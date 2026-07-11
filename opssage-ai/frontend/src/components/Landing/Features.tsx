const features = [
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.08)",
    tag: "Observability",
    tagColor: "#a78bfa",
    title: "Unified Telemetry",
    desc: "Route logs, metrics, and traces from any source — Prometheus, Datadog, OTel, CloudWatch — into one indexed, searchable plane. No agents required.",
    metric: "Sub-100ms query latency at petabyte scale",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    ),
    accent: "#06b6d4",
    accentBg: "rgba(6,182,212,0.08)",
    tag: "Automation",
    tagColor: "#67e8f9",
    title: "Programmable Runbooks",
    desc: "Write incident runbooks as code. Auto-trigger on alert conditions, with built-in AWS, GCP, Kubernetes, and Postgres adapters. Reviewed, versioned, auditable.",
    metric: "Avg 14s automated MTTR across 800+ teams",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.08)",
    tag: "Intelligence",
    tagColor: "#6ee7b7",
    title: "Root Cause Correlation",
    desc: "Our signal graph maps every log line and trace span to its causal ancestor. When a service degrades, you see exactly which deploy, query, or dependency caused it.",
    metric: "94% first-touch resolution accuracy",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
    ),
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.08)",
    tag: "On-Call",
    tagColor: "#fcd34d",
    title: "Intelligent Escalation",
    desc: "Dynamic on-call routing based on service ownership, severity, and team schedules. Integrates natively with PagerDuty, Opsgenie, and Slack threads.",
    metric: "61% reduction in alert fatigue",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    ),
    accent: "#ec4899",
    accentBg: "rgba(236,72,153,0.08)",
    tag: "Security",
    tagColor: "#f9a8d4",
    title: "SOC 2 Native Controls",
    desc: "Every action is audited. Role-based access with SAML SSO, end-to-end encryption in transit and at rest, and data residency controls for EU/APAC.",
    metric: "SOC 2 Type II · ISO 27001 Certified",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
      </svg>
    ),
    accent: "#6366f1",
    accentBg: "rgba(99,102,241,0.08)",
    tag: "Integration",
    tagColor: "#a5b4fc",
    title: "100+ Native Integrations",
    desc: "Plug into your existing stack from day one: AWS, GCP, Azure, GitHub, GitLab, Jira, Slack, Terraform, Kubernetes, Helm, and every major APM tool.",
    metric: "5-minute average time to first alert",
  },
];

export default function Features() {
  return (
    <section style={{ padding: "96px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16" style={{ maxWidth: "600px", margin: "0 auto 64px" }}>
          <p style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            Platform Capabilities
          </p>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: "1.15", color: "var(--text-primary)", marginBottom: "16px" }}>
            Everything SRE teams need. Nothing they don't.
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", lineHeight: "1.7" }}>
            Built by engineers who have been paged at 3am. Every feature exists because teams actually needed it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="l-card"
              style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "16px", cursor: "default" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${f.accent}40`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${f.accent}20, 0 8px 32px rgba(0,0,0,0.4)`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div className="l-feature-icon" style={{ background: f.accentBg, color: f.accent, border: `1px solid ${f.accent}30` }}>
                  {f.icon}
                </div>
                <span
                  className="tag-badge"
                  style={{ background: `${f.accent}12`, color: f.tagColor, border: `1px solid ${f.accent}25` }}
                >
                  {f.tag}
                </span>
              </div>
              <div>
                <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 700, marginBottom: "8px", letterSpacing: "-0.01em" }}>
                  {f.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: "1.65" }}>
                  {f.desc}
                </p>
              </div>
              <div style={{
                marginTop: "auto",
                paddingTop: "14px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: f.accent, boxShadow: `0 0 6px ${f.accent}` }} />
                <span style={{ color: "var(--text-muted)", fontSize: "11.5px", fontWeight: 600 }}>{f.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
