import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

function TerminalLine({ color, children, delay = 0 }: { color?: string; children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease", color: color || "#c4c4dc" }}>
      {children}
    </div>
  );
}

function LiveCursor() {
  return <span className="animate-blink" style={{ color: "#8b5cf6", fontWeight: 700 }}>█</span>;
}

export default function Hero() {
  return (
    <section
      className="grid-bg"
      style={{
        paddingTop: "120px",
        paddingBottom: "80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow blobs */}
      <div style={{
        position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "500px",
        background: "radial-gradient(ellipse at center, rgba(109,40,217,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", right: "0",
        width: "500px", height: "400px",
        background: "radial-gradient(ellipse at center, rgba(6,182,212,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div className="max-w-7xl mx-auto px-6 relative" style={{ zIndex: 1 }}>
        {/* Top badge */}
        <div className="flex justify-center mb-8 animate-fade-slide-up">
          <div className="l-badge">
            <span className="l-badge-dot" />
            v2.0 is live — Programmable Runbooks, AI Correlation, Slack-native Alerts
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-6 animate-fade-slide-up delay-100">
          <h1 className="l-title">
            Stop firefighting.<br />
            <span className="l-gradient-text">Start engineering reliability.</span>
          </h1>
        </div>

        {/* Subheadline */}
        <p
          className="text-center animate-fade-slide-up delay-200"
          style={{
            color: "var(--text-secondary)",
            fontSize: "17px",
            lineHeight: "1.7",
            maxWidth: "560px",
            margin: "0 auto 40px",
          }}
        >
          OpsSage gives SRE teams a unified plane for telemetry, incident runbooks,
          and root-cause intelligence — all wired into the tools you already use.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fade-slide-up delay-300">
          <Link to="/dashboard" className="l-btn-primary" style={{ fontSize: "15px", padding: "13px 32px" }}>
            Open Command Center
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link to="/dashboard" className="l-btn-secondary" style={{ fontSize: "15px", padding: "13px 32px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch 2-min Demo
          </Link>
        </div>

        <p className="text-center animate-fade-slide-up delay-400" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Free for teams under 5 engineers · No credit card required
        </p>

        {/* Terminal Window */}
        <div className="terminal-window mt-16 animate-fade-in delay-400" style={{ maxWidth: "860px", margin: "64px auto 0" }}>
          <div className="terminal-header">
            <div className="terminal-dot" style={{ background: "#ff5f56" }} />
            <div className="terminal-dot" style={{ background: "#ffbd2e" }} />
            <div className="terminal-dot" style={{ background: "#27c93f" }} />
            <div style={{ marginLeft: "12px", color: "#444466", fontSize: "12px", fontFamily: "monospace" }}>
              opssage — production-cluster — runbook executor
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#27c93f", boxShadow: "0 0 6px #27c93f" }} />
              <span style={{ color: "#27c93f", fontSize: "11px", fontWeight: 600 }}>LIVE</span>
            </div>
          </div>
          <div className="terminal-body" style={{ minHeight: "320px" }}>
            <TerminalLine color="#444466" delay={0}>— incident detected at 08:32:09 UTC —</TerminalLine>
            <TerminalLine delay={300}><span className="t-dim">$ </span><span className="t-cmd">opssage watch --cluster=prod --alert=critical</span></TerminalLine>
            <TerminalLine color="#f87171" delay={700}>✗  [08:32:12] CRITICAL  DB pool exhausted  (connections=100/100)</TerminalLine>
            <TerminalLine color="#f87171" delay={900}>✗  [08:32:15] CRITICAL  API latency p99 &gt; 8s  (threshold: 500ms)</TerminalLine>
            <TerminalLine color="#fbbf24" delay={1100}>⚡  [08:32:17] Triggering runbook: <span style={{ color: "#a78bfa" }}>scale-db-connections</span></TerminalLine>
            <TerminalLine delay={1400}>&nbsp;</TerminalLine>
            <TerminalLine delay={1400}><span className="t-dim">$ </span><span className="t-cmd">opssage runbook run scale-db-connections --auto</span></TerminalLine>
            <TerminalLine color="#60a5fa" delay={1700}>  ◆ Fetching cluster state from AWS RDS...</TerminalLine>
            <TerminalLine delay={2000}>  ✓ Current pool size: 100  →  Target: 250</TerminalLine>
            <TerminalLine delay={2200}>  ✓ Auth: IAM role assumed  (arn:aws:iam::919273::role/opssage-runner)</TerminalLine>
            <TerminalLine delay={2500}>  ✓ Patching parameter group: max_connections=250</TerminalLine>
            <TerminalLine delay={2800}>  ✓ Rolling restart initiated (0 downtime, blue-green)</TerminalLine>
            <TerminalLine color="#34d399" delay={3200}>  ● [08:32:23] Incident resolved  ·  MTTR: <span style={{ fontWeight: 700 }}>14 seconds</span></TerminalLine>
            <TerminalLine delay={3500}>&nbsp;</TerminalLine>
            <TerminalLine color="#444466" delay={3500}>— posting summary to #incidents-prod (Slack) —</TerminalLine>
            <TerminalLine color="#60a5fa" delay={3800}>  ✓ Thread created · RCA report attached · On-call notified</TerminalLine>
            <TerminalLine delay={4200}>&nbsp;</TerminalLine>
            <TerminalLine delay={4200}><span className="t-prompt">opssage ›</span> <LiveCursor /></TerminalLine>
          </div>
        </div>
      </div>
    </section>
  );
}
