import { Link } from "react-router-dom";
import Navbar from "../components/Landing/Navbar";
import Footer from "../components/Landing/Footer";

export const caseStudies = [
  {
    slug: "finstack-db-pool-crisis",
    company: "FinStack",
    industry: "Fintech · Payments Infrastructure",
    logo: "FS",
    accent: "#8b5cf6",
    tagline: "From 45-minute firefights to 14-second auto-resolution.",
    challenge: "Database connection pool exhaustion caused cascading payment failures during peak trading hours.",
    result: "MTTR reduced from 45 min to 14 sec",
    metrics: [
      { label: "MTTR Before", value: "45 min", arrow: false },
      { label: "MTTR After", value: "14 sec", arrow: true, good: true },
      { label: "Incidents Averted / mo", value: "230+", arrow: true, good: true },
      { label: "On-call pages saved", value: "91%", arrow: true, good: true },
    ],
    quote: "We cut our MTTR from 45 minutes to under 90 seconds on database incidents. The runbook executor is genuinely magic.",
    author: "Priya Nair",
    role: "VP of Engineering, FinStack",
  },
  {
    slug: "orbital-systems-stack-consolidation",
    company: "Orbital Systems",
    industry: "Aerospace SaaS · Mission Critical",
    logo: "OS",
    accent: "#06b6d4",
    tagline: "Three tools replaced. One weekend migration. Zero downtime.",
    challenge: "Their team operated three separate observability tools — Grafana, Splunk, and PagerDuty — causing fragmented context during incidents.",
    result: "Unified 3 tools into one platform in 48 hrs",
    metrics: [
      { label: "Tools consolidated", value: "3 → 1", arrow: true, good: true },
      { label: "Alert context gaps", value: "0", arrow: true, good: true },
      { label: "Migration time", value: "48 hrs", arrow: false },
      { label: "Infra cost saved", value: "$14k/mo", arrow: true, good: true },
    ],
    quote: "We migrated off three separate tools to OpsSage in a weekend. Logs, traces, and alerts are finally in one place.",
    author: "James Kowalski",
    role: "Platform SRE Lead, Orbital Systems",
  },
  {
    slug: "lumify-health-alert-fatigue",
    company: "Lumify Health",
    industry: "Digital Health · HIPAA Regulated",
    logo: "LH",
    accent: "#10b981",
    tagline: "61% fewer pages. Actual sleep for on-call engineers.",
    challenge: "A noisy alerting pipeline generated over 800 low-signal pages per week, burning out the on-call rotation.",
    result: "Alert volume cut by 61%, zero missed critical incidents",
    metrics: [
      { label: "Alert noise reduction", value: "61%", arrow: true, good: true },
      { label: "Critical incidents missed", value: "0", arrow: false },
      { label: "On-call burnout score", value: "↓ 4.2→1.1", arrow: true, good: true },
      { label: "Mean detection time", value: "8 sec", arrow: true, good: true },
    ],
    quote: "The signal-to-noise ratio on alerts is night and day. Our on-call engineers actually sleep now.",
    author: "Aisha Mensah",
    role: "Head of Infrastructure, Lumify Health",
  },
];

export function CaseStudiesPage(): JSX.Element {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: "64px" }}>
        <section style={{ padding: "80px 0 64px", borderBottom: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-80px", left: "50%", transform: "translateX(-50%)",
            width: "700px", height: "400px",
            background: "radial-gradient(ellipse, rgba(109,40,217,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div className="max-w-7xl mx-auto px-6 text-center" style={{ position: "relative", zIndex: 1 }}>
            <p style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              Case Studies
            </p>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "16px", lineHeight: 1.1 }}>
              Real teams. Real incidents.<br />Real results.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "17px", maxWidth: "520px", margin: "0 auto", lineHeight: 1.7 }}>
              See how engineering teams at high-growth companies used OpsSage to transform their reliability practice.
            </p>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="max-w-7xl mx-auto px-6">
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {caseStudies.map((cs) => (
                <Link
                  key={cs.slug}
                  to={`/case-studies/${cs.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="l-card"
                    style={{
                      padding: "36px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "48px",
                      alignItems: "center",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${cs.accent}40`;
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                        <div style={{
                          width: "48px", height: "48px", borderRadius: "12px",
                          background: `linear-gradient(135deg, ${cs.accent}, ${cs.accent}80)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: "14px", color: "white",
                        }}>
                          {cs.logo}
                        </div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px" }}>{cs.company}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{cs.industry}</div>
                        </div>
                      </div>
                      <h2 style={{ color: "var(--text-primary)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "12px", lineHeight: 1.3 }}>
                        {cs.tagline}
                      </h2>
                      <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.65, marginBottom: "20px" }}>
                        {cs.challenge}
                      </p>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: cs.accent, fontSize: "13px", fontWeight: 600 }}>
                        Read Full Case Study
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {cs.metrics.map((m) => (
                        <div
                          key={m.label}
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            padding: "20px",
                          }}
                        >
                          <div style={{
                            fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                            fontWeight: 800,
                            letterSpacing: "-0.04em",
                            color: m.good ? cs.accent : "var(--text-primary)",
                            marginBottom: "4px",
                          }}>
                            {m.value}
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: "11.5px", lineHeight: 1.4 }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
