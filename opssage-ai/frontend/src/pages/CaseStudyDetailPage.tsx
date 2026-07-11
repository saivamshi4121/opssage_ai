import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "../components/Landing/Navbar";
import Footer from "../components/Landing/Footer";
import { caseStudies } from "./CaseStudiesPage";

const fullContent: Record<string, {
  overview: string;
  sections: { heading: string; body: string; code?: string }[];
  stack: string[];
  timeline: { time: string; event: string; type: "error" | "info" | "success" | "warn" }[];
}> = {
  "finstack-db-pool-crisis": {
    overview: `FinStack processes over $2.4B in daily payment volume across 40 countries. During Q3 peak trading hours, their PostgreSQL connection pool — capped at 100 connections — began exhausting under load. This triggered a cascade: API latency shot past 8 seconds, payment failures climbed, and the on-call SRE had to manually SSH into a bastion host, diagnose the issue, and alter the RDS parameter group by hand. Every minute of delay cost FinStack an estimated $18,000 in lost transactions.`,
    sections: [
      {
        heading: "The Problem",
        body: `FinStack's architecture used a single RDS PostgreSQL instance (db.r6g.4xlarge) shared across 14 microservices. During market open on high-volume days, connection demand from the order processing and settlement services would spike simultaneously. The team had set max_connections=100 as a conservative default, never revisiting it as traffic grew 4x over 18 months.\n\nWhen the pool exhausted, services started queuing connection requests, then timing out. Within 3 minutes, the payments API returned HTTP 503 for 23% of requests. The monitoring system fired a PagerDuty alert, but the on-call engineer — working from a time zone 9 hours ahead — took 7 minutes to acknowledge it. Manual remediation (SSH → diagnose → patch RDS → verify) took another 38 minutes.`,
      },
      {
        heading: "The Runbook Solution",
        body: `With OpsSage, the FinStack SRE team codified the fix as a versioned runbook. The runbook is triggered automatically when the following condition is met for more than 90 seconds:\n\nDB connection utilization > 95% AND API error rate > 2%\n\nThe runbook performs these steps with full audit logging:`,
        code: `# scale-db-connections.yaml
name: scale-db-connections
trigger:
  condition: "db.pool.utilization > 0.95 AND api.error_rate > 0.02"
  for: 90s

steps:
  - name: fetch-cluster-state
    action: aws.rds.describe_instance
    params:
      instance: "{{ env.RDS_INSTANCE_ID }}"
    
  - name: calculate-target
    action: compute
    expr: "min(current_max_connections * 2, 500)"

  - name: authenticate
    action: aws.iam.assume_role
    params:
      role: "arn:aws:iam::919273::role/opssage-runner"
      session: "runbook-{{ incident.id }}"

  - name: scale-connections
    action: aws.rds.modify_parameter_group
    params:
      group: "prod-pg15-params"
      parameters:
        max_connections: "{{ steps.calculate-target.output }}"
    rollback_on_failure: true

  - name: notify
    action: slack.post_thread
    params:
      channel: "#incidents-prod"
      message: |
        ✅ Runbook executed: scale-db-connections
        max_connections: {{ steps.fetch-cluster-state.output.max_connections }} → {{ steps.calculate-target.output }}
        MTTR: {{ incident.duration_seconds }}s`,
      },
      {
        heading: "Results",
        body: `After deploying the runbook, the next pool exhaustion event — which occurred 11 days later — was resolved in 14 seconds from detection to full recovery. The on-call engineer received a Slack message with the full execution log rather than a page. Over the following quarter, OpsSage averted 230 potential DB exhaustion incidents, saving an estimated $4.1M in prevented outage revenue impact.`,
      },
      {
        heading: "What FinStack Says",
        body: `"We used to joke that database pool exhaustion was a rite of passage for every new SRE hire. Now it's just a Slack notification. The runbook executor handled a scenario we used to dread — perfectly, at 3am, with no human involved."`,
      },
    ],
    stack: ["PostgreSQL 15 (RDS)", "AWS ECS Fargate", "Prometheus + Grafana", "PagerDuty", "OpsSage Runbooks"],
    timeline: [
      { time: "08:32:09", event: "DB pool hits 100/100 connections", type: "error" },
      { time: "08:32:12", event: "API error rate crosses 2% threshold", type: "error" },
      { time: "08:32:17", event: "OpsSage detects combined condition — triggering runbook", type: "warn" },
      { time: "08:32:18", event: "Fetching RDS cluster state via AWS API", type: "info" },
      { time: "08:32:19", event: "IAM role assumed, parameter group patched", type: "info" },
      { time: "08:32:23", event: "max_connections updated 100 → 200, connections stabilizing", type: "success" },
      { time: "08:32:23", event: "Incident closed — Slack thread posted to #incidents-prod", type: "success" },
    ],
  },

  "orbital-systems-stack-consolidation": {
    overview: `Orbital Systems builds real-time flight operations software used by commercial satellite operators. Their reliability bar is extreme — a dropped telemetry stream can mean a missed orbital window worth millions of dollars. Their observability stack had grown organically: Grafana for infra metrics, Splunk for log aggregation, and PagerDuty for alerting. Every incident required engineers to context-switch between three tabs, correlating timestamps manually.`,
    sections: [
      {
        heading: "The Problem",
        body: `Three separate tools meant three separate data models. When a satellite handoff service degraded, the on-call engineer would see a Grafana spike, pivot to Splunk to search logs in a separate query language, then check PagerDuty to see if the alert had fired. This "tab shuffle" added 12–20 minutes to every incident investigation.\n\nWorse, Splunk's ingestion lag meant log data was 60–90 seconds behind real-time, causing RCAs to miss the actual root cause window. The team was paying $14,000/month across the three platforms.`,
      },
      {
        heading: "The Migration",
        body: `The Orbital SRE team completed their migration over a single weekend. OpsSage's collector accepted their existing Prometheus remote-write endpoint and OpenTelemetry traces with no configuration changes. Splunk's forwarder was replaced with OpsSage's Rust-based log collector, which reduced ingestion lag from 90 seconds to under 1 second.\n\nAll three PagerDuty policies were imported via the OpsSage CLI in under 20 minutes:`,
        code: `# Import existing PagerDuty escalation policies
$ opssage import pagerduty \\
  --api-key $PD_API_KEY \\
  --map-to-services services.yaml

✓ Imported 12 escalation policies
✓ Synced 8 on-call schedules  
✓ Mapped 340 alert rules
✓ Test alert fired and routed correctly

Migration complete in 18 minutes.`,
      },
      {
        heading: "Results",
        body: `Incident investigation time dropped from a 12–20 minute tab-shuffle to under 3 minutes using OpsSage's unified correlation view. The team eliminated $14,000/month in tooling costs and donated the freed engineering time to building new reliability automation.`,
      },
    ],
    stack: ["Kubernetes (EKS)", "OpenTelemetry", "Prometheus", "Rust log collector", "OpsSage"],
    timeline: [
      { time: "Friday 18:00", event: "Migration kickoff — Prometheus remote-write configured", type: "info" },
      { time: "Friday 19:30", event: "Log collector deployed, ingestion lag: 0.8s", type: "success" },
      { time: "Saturday 10:00", event: "PagerDuty policies imported via CLI", type: "success" },
      { time: "Saturday 14:00", event: "Full parallel run — both stacks live", type: "info" },
      { time: "Saturday 22:00", event: "Splunk and Grafana decommissioned", type: "warn" },
      { time: "Sunday 09:00", event: "First real incident handled 100% in OpsSage", type: "success" },
    ],
  },

  "lumify-health-alert-fatigue": {
    overview: `Lumify Health operates a digital mental health platform serving 2.8 million patients. Under HIPAA, any data breach or service outage triggers mandatory regulatory reporting within 60 hours. Their engineering team of 11 was receiving over 800 pages per week — the vast majority were low-signal infrastructure noise. On-call burnout was severe, with two senior SREs leaving the company within six months citing pager fatigue.`,
    sections: [
      {
        heading: "The Problem",
        body: `Lumify's alerting configuration had accumulated four years of thresholds set too aggressively. CPU alerts fired at 70% utilization. Memory alerts at 60%. Every deploy triggered a cascade of transient anomaly alerts. Engineers began ignoring alerts — a dangerous behavior in a HIPAA-regulated environment where a real breach could be buried in noise.\n\nThe CISO flagged this as a compliance risk: if engineers tuned out alerts, a true security incident could go unnoticed for hours.`,
      },
      {
        heading: "The Solution",
        body: `OpsSage's signal correlation engine analyzed 90 days of historical alert data and identified that 73% of pages had zero correlation with actual user-facing impact — defined as p95 API latency > 500ms or error rate > 0.1%. These thresholds were surfaced automatically:\n\nOpsSage's suggested groupings reduced 800 weekly alerts to under 310, while maintaining 100% detection of true incidents. The team also implemented OpsSage's "quiet hours" policy, suppressing non-critical infrastructure alerts between 00:00–06:00 local time unless they correlated with user-facing degradation.`,
        code: `# Alert correlation analysis output
$ opssage analyze alert-noise --window=90d

Analyzed 71,200 alert events

HIGH NOISE — No user impact correlation:
  ✗ cpu.utilization > 70%      → 18,400 alerts  (0 impacted users)
  ✗ memory.rss > 60%           → 12,100 alerts  (0 impacted users)  
  ✗ deploy.in-progress         → 8,800 alerts   (0 impacted users)

RECOMMENDED THRESHOLDS:
  ✓ cpu.utilization > 92% for 5m  (captures all true incidents)
  ✓ memory.rss > 85% for 10m
  ✓ suppress deploy alerts unless error_rate > 1%

Projected reduction: 61% fewer pages
Projected missed incidents: 0`,
      },
      {
        heading: "Results",
        body: `After implementing OpsSage's recommended configuration, weekly alert volume dropped from 823 to 318 pages — a 61% reduction. Critically, zero true incidents were missed. On-call burnout scores (measured via quarterly eng survey) dropped from 4.2/5 to 1.1/5. Both engineers who had resigned cited "actually manageable on-call" as a factor in peers choosing to stay.`,
      },
      {
        heading: "Compliance Outcome",
        body: `Lumify's CISO signed off on the new alert architecture as a compliance improvement. Every alert suppression decision is logged with a justification in OpsSage's audit trail, satisfying HIPAA's requirement for documented security monitoring procedures.`,
      },
    ],
    stack: ["AWS ECS", "RDS Aurora", "CloudWatch", "Python (FastAPI)", "OpsSage Signal Correlation"],
    timeline: [
      { time: "Week 1", event: "OpsSage ingests 90 days of historical alert data", type: "info" },
      { time: "Week 1", event: "Noise analysis complete — 73% low-signal alerts identified", type: "warn" },
      { time: "Week 2", event: "New thresholds applied in shadow mode (no suppression yet)", type: "info" },
      { time: "Week 3", event: "Shadow mode validated — 0 missed incidents in 7 days", type: "success" },
      { time: "Week 4", event: "Quiet hours policy enabled, suppression live", type: "success" },
      { time: "Week 5", event: "Alert volume: 823/wk → 318/wk. Zero critical missed.", type: "success" },
    ],
  },
};

const timelineColor = {
  error: "#f87171",
  warn: "#fbbf24",
  info: "#60a5fa",
  success: "#34d399",
};

export function CaseStudyDetailPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const cs = caseStudies.find((c) => c.slug === slug);
  const content = slug ? fullContent[slug] : undefined;

  if (!cs || !content) return <Navigate to="/case-studies" replace />;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: "64px" }}>
        {/* Hero */}
        <section style={{ padding: "72px 0 56px", borderBottom: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-80px", left: "-80px",
            width: "500px", height: "400px",
            background: `radial-gradient(ellipse, ${cs.accent}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
          <div className="max-w-4xl mx-auto px-6" style={{ position: "relative", zIndex: 1 }}>
            <Link
              to="/case-studies"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "13px", textDecoration: "none", marginBottom: "32px", transition: "color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              All Case Studies
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "14px",
                background: `linear-gradient(135deg, ${cs.accent}, ${cs.accent}80)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: "16px", color: "white",
              }}>{cs.logo}</div>
              <div>
                <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "18px" }}>{cs.company}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>{cs.industry}</div>
              </div>
            </div>

            <h1 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "20px" }}>
              {cs.tagline}
            </h1>

            {/* Metrics strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "32px" }}>
              {cs.metrics.map((m) => (
                <div key={m.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em", color: m.good ? cs.accent : "var(--text-primary)", marginBottom: "4px" }}>
                    {m.value}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1.4 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Body */}
        <section style={{ padding: "64px 0" }}>
          <div className="max-w-4xl mx-auto px-6" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {/* Overview */}
            <div style={{ marginBottom: "48px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px" }}>Overview</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "16px", lineHeight: 1.8 }}>{content.overview}</p>
            </div>

            {/* Incident Timeline */}
            <div style={{ marginBottom: "56px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "20px" }}>Incident Timeline</h2>
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
                  <span style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "monospace" }}>incident-log — live replay</span>
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {content.timeline.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, paddingTop: "1px" }}>{t.time}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: timelineColor[t.type], boxShadow: `0 0 5px ${timelineColor[t.type]}`, flexShrink: 0 }} />
                        <span style={{ fontSize: "13.5px", color: timelineColor[t.type] }}>{t.event}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Sections */}
            {content.sections.map((s) => (
              <div key={s.heading} style={{ marginBottom: "48px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "14px" }}>{s.heading}</h2>
                {s.body.split("\n\n").map((para, i) => (
                  <p key={i} style={{ color: "var(--text-secondary)", fontSize: "15.5px", lineHeight: 1.8, marginBottom: "14px" }}>{para}</p>
                ))}
                {s.code && (
                  <div style={{ background: "#0a0a12", border: "1px solid var(--border-strong)", borderRadius: "10px", overflow: "hidden", marginTop: "20px" }}>
                    <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 16px", display: "flex", gap: "6px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
                    </div>
                    <pre style={{
                      padding: "24px",
                      fontSize: "12.5px",
                      lineHeight: 1.75,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      color: "#c4c4dc",
                      overflowX: "auto",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}>
                      {s.code}
                    </pre>
                  </div>
                )}
              </div>
            ))}

            {/* Stack */}
            <div style={{ marginBottom: "48px" }}>
              <h2 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "16px" }}>Tech Stack</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {content.stack.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "5px 14px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-strong)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div style={{
              borderLeft: `3px solid ${cs.accent}`,
              paddingLeft: "24px",
              marginBottom: "56px",
            }}>
              <p style={{ color: "var(--text-primary)", fontSize: "17px", lineHeight: 1.75, fontStyle: "italic", marginBottom: "12px" }}>
                "{cs.quote}"
              </p>
              <div style={{ color: "var(--text-muted)", fontSize: "13px", fontWeight: 600 }}>— {cs.author}</div>
            </div>

            {/* CTA */}
            <div style={{
              background: `linear-gradient(135deg, ${cs.accent}12, transparent)`,
              border: `1px solid ${cs.accent}25`,
              borderRadius: "14px",
              padding: "40px",
              textAlign: "center",
            }}>
              <h3 style={{ color: "var(--text-primary)", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "10px" }}>
                Ready to write your own case study?
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginBottom: "24px" }}>
                Set up OpsSage in 5 minutes and handle your first incident automatically.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <Link to="/dashboard" className="l-btn-primary" style={{ fontSize: "14px", padding: "11px 28px" }}>
                  Get Started Free
                </Link>
                <Link to="/case-studies" className="l-btn-secondary" style={{ fontSize: "14px", padding: "11px 28px" }}>
                  Read More Case Studies
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
