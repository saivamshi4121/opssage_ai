import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="l-nav">
      <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 opacity-20 blur-sm" />
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" fill="white" fillOpacity="0.9"/>
                <path d="M7 5L9.598 6.5V9.5L7 11L4.402 9.5V6.5L7 5Z" fill="white" fillOpacity="0.4"/>
              </svg>
            </div>
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>
            OpsSage
          </span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "Platform", to: "/" },
            { label: "Integrations", to: "/integrations" },
            { label: "Runbooks", to: "/runbooks" },
            { label: "Case Studies", to: "/case-studies" },
            { label: "Pricing", to: "/#pricing" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              style={{
                color: "var(--text-secondary)",
                fontSize: "13.5px",
                fontWeight: 500,
                padding: "6px 14px",
                borderRadius: "6px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            style={{
              color: "var(--text-secondary)",
              fontSize: "13.5px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            Log in
          </Link>
          <Link to="/dashboard" className="l-btn-primary" style={{ padding: "8px 18px", fontSize: "13px" }}>
            Get Access
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
