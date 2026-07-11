import Link from "next/link";

export default function Hero() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-6 w-fit border border-border">
            <span className="w-2 h-2 rounded-full bg-brand"></span>
            OpsSage 2.0 is now available
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-foreground leading-[1.1]">
            Reliability infrastructure for serious teams.
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
            Consolidate your telemetry, automate incident response, and reduce MTTR with a platform engineered for scale, security, and speed.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto button-primary px-6 py-3 text-base text-center">
              Start Building for Free
            </Link>
            <Link href="/demo" className="w-full sm:w-auto button-secondary px-6 py-3 text-base text-center">
              Request a Demo
            </Link>
          </div>
          
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Free 14-day trial for Pro features.
          </p>
        </div>

        {/* Realistic UI Representation instead of abstract shapes */}
        <div className="card w-full h-[450px] flex flex-col overflow-hidden bg-muted">
          <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-background">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
            </div>
            <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-xs text-muted-foreground font-mono">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
              production-api / runbook
            </div>
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-hidden flex flex-col gap-2">
            <div className="text-muted-foreground">$&gt; tail -f /var/log/api.log</div>
            <div className="text-red-500">ERROR [08:32:12] DB Connection Timeout (Pool Exhausted)</div>
            <div className="text-red-500">ERROR [08:32:15] DB Connection Timeout (Pool Exhausted)</div>
            <div className="text-muted-foreground mt-2">$&gt; opssage trigger runbook scale-db-pool</div>
            <div className="text-blue-500">INFO  [08:32:18] Initializing Runbook execution...</div>
            <div className="text-foreground">✓ Checking current pool size (Current: 100)</div>
            <div className="text-foreground">✓ Authenticating with AWS RDS API</div>
            <div className="text-foreground">✓ Updating parameter group: max_connections=200</div>
            <div className="text-blue-500">INFO  [08:32:25] Scaling operation applied successfully.</div>
            <div className="text-green-500 mt-2">✓ Incident automatically resolved in 13 seconds.</div>
            <div className="text-muted-foreground mt-4 animate-pulse">$&gt; █</div>
          </div>
        </div>
      </div>
    </section>
  );
}
