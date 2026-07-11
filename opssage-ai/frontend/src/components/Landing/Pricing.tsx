import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Perfect for small teams getting started with reliability engineering.",
    accent: "#6b7280",
    features: [
      "Up to 5 engineers",
      "3 active runbooks",
      "7-day log retention",
      "Community support",
      "Slack integration",
    ],
    cta: "Get Started Free",
    href: "/dashboard",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/engineer/mo",
    desc: "For growing SRE teams that need automation and advanced correlation.",
    accent: "#8b5cf6",
    features: [
      "Unlimited engineers",
      "Unlimited runbooks",
      "30-day log retention",
      "Priority support",
      "All integrations (100+)",
      "Root cause correlation",
      "On-call scheduling",
      "SSO / SAML",
    ],
    cta: "Start Free Trial",
    href: "/dashboard",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations with advanced compliance and scale requirements.",
    accent: "#06b6d4",
    features: [
      "Everything in Pro",
      "Custom data retention",
      "SOC 2 / ISO 27001 docs",
      "Dedicated SRE onboarding",
      "Custom integrations",
      "Audit logging & RBAC",
      "99.99% SLA",
    ],
    cta: "Talk to Sales",
    href: "/dashboard",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: "96px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p style={{ color: "#8b5cf6", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            Pricing
          </p>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: "16px" }}>
            Transparent pricing. No surprises.
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
            Start free, scale when you're ready. No per-seat upsells, no hidden data fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="l-card"
              style={{
                padding: "32px",
                position: "relative",
                ...(tier.highlighted ? {
                  borderColor: `${tier.accent}50`,
                  boxShadow: `0 0 0 1px ${tier.accent}30, 0 16px 48px rgba(0,0,0,0.5)`,
                } : {}),
              }}
            >
              {tier.highlighted && (
                <div style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: tier.accent,
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "3px 14px",
                  borderRadius: "99px",
                  textTransform: "uppercase",
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: tier.accent }} />
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {tier.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "2.8rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>{tier.price}</span>
                  {tier.period && <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{tier.period}</span>}
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px", lineHeight: "1.5" }}>{tier.desc}</p>
              </div>

              <Link
                to={tier.href}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "10px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  marginBottom: "24px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  ...(tier.highlighted ? {
                    background: tier.accent,
                    color: "white",
                    boxShadow: `0 0 20px ${tier.accent}40`,
                  } : {
                    background: "transparent",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-secondary)",
                  }),
                }}
              >
                {tier.cta}
              </Link>

              <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tier.accent} strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
