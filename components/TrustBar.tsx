export default function TrustBar() {
  return (
    <section className="py-12 border-b border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          Trusted by engineering teams at forward-thinking companies
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
          {/* Placeholder Logos (Using text for now, but typically would be SVGs) */}
          <div className="text-xl font-bold font-sans tracking-tighter">ACME Corp</div>
          <div className="text-xl font-bold font-serif italic">Globex</div>
          <div className="text-xl font-black tracking-widest uppercase">Soylent</div>
          <div className="text-xl font-medium tracking-tight">Initech</div>
          <div className="text-xl font-semibold lowercase">massive dynamic</div>
        </div>
        
        <div className="mt-12 pt-12 border-t border-border flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center">
               <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
             </div>
             <div className="text-sm">
               <div className="font-semibold text-foreground">SOC 2 Type II</div>
               <div className="text-muted-foreground text-xs">Certified</div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-background border border-border flex items-center justify-center">
               <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
             </div>
             <div className="text-sm">
               <div className="font-semibold text-foreground">End-to-End Encryption</div>
               <div className="text-muted-foreground text-xs">Data in transit & at rest</div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
