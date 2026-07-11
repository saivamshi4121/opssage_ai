export default function StatsBar() {
  const stats = [
    { value: "14s", label: "Avg MTTR with auto-runbooks", accent: "#a78bfa" },
    { value: "99.98%", label: "Platform uptime SLA", accent: "#34d399" },
    { value: "800+", label: "Engineering teams onboarded", accent: "#60a5fa" },
    { value: "3.2B+", label: "Events processed per month", accent: "#f59e0b" },
  ];

  return (
    <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-2">
              <div className="l-stat" style={{ background: `linear-gradient(135deg, ${s.accent}, var(--text-primary))`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.4" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
