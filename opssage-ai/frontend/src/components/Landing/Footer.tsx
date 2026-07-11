import { Link } from "react-router-dom";

const links = {
  Product: [
    { label: "Platform Overview", to: "/" },
    { label: "Runbook Executor", to: "/" },
    { label: "Root Cause Analysis", to: "/" },
    { label: "Integrations", to: "/" },
    { label: "Changelog", to: "/" },
  ],
  Resources: [
    { label: "Documentation", to: "/" },
    { label: "API Reference", to: "/" },
    { label: "Engineering Blog", to: "/" },
    { label: "System Status", to: "/" },
    { label: "Community", to: "/" },
  ],
  Company: [
    { label: "About", to: "/" },
    { label: "Careers", to: "/" },
    { label: "Security", to: "/" },
    { label: "Contact Sales", to: "/dashboard" },
  ],
};

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", paddingTop: "60px", paddingBottom: "32px", background: "var(--bg-surface)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", marginBottom: "16px" }}>
              <div className="relative w-6 h-6 flex-shrink-0">
                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #7c3aed, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
                    <path d="M7 5L9.598 6.5V9.5L7 11L4.402 9.5V6.5L7 5Z" fill="white" fillOpacity="0.4"/>
                  </svg>
                </div>
              </div>
              <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px" }}>OpsSage</span>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.6", maxWidth: "220px", marginBottom: "20px" }}>
              Reliability engineering platform for teams that take production seriously.
            </p>
            <div style={{ display: "flex", gap: "4px" }}>
              {["SOC 2", "GDPR", "ISO 27001"].map((badge) => (
                <span
                  key={badge}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "16px" }}>
                {section}
              </h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      style={{ color: "var(--text-muted)", fontSize: "13.5px", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            © {new Date().getFullYear()} OpsSage Inc. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "20px" }}>
            {["Privacy Policy", "Terms of Service"].map((item) => (
              <Link
                key={item}
                to="/"
                style={{ color: "var(--text-muted)", fontSize: "12px", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
