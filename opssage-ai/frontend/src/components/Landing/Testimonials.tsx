const testimonials = [
  {
    quote: "We cut our MTTR from 45 minutes to under 90 seconds on database incidents. The runbook executor is genuinely magic.",
    name: "Priya Nair",
    role: "VP of Engineering",
    company: "FinStack",
    avatar: "PN",
    accent: "#8b5cf6",
  },
  {
    quote: "We migrated off three separate tools to OpsSage in a weekend. Logs, traces, and alerts are finally in one place.",
    name: "James Kowalski",
    role: "Platform SRE Lead",
    company: "Orbital Systems",
    avatar: "JK",
    accent: "#06b6d4",
  },
  {
    quote: "The signal-to-noise ratio on alerts is night and day. Our on-call engineers actually sleep now.",
    name: "Aisha Mensah",
    role: "Head of Infrastructure",
    company: "Lumify Health",
    avatar: "AM",
    accent: "#10b981",
  },
];

export default function Testimonials() {
  return (
    <section style={{ padding: "96px 0", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p style={{ color: "#06b6d4", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            In Their Words
          </p>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Teams that ship faster with OpsSage
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="l-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Stars */}
              <div style={{ display: "flex", gap: "4px" }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={t.accent} stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "14.5px", lineHeight: "1.75", fontStyle: "italic", flex: 1 }}>
                "{t.quote}"
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent}80)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "white",
                  flexShrink: 0,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{t.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{t.role} · {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
