import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 w-full">
        <Hero />
        <TrustBar />
        
        <section id="platform" className="py-24 border-b border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground tracking-tight">The complete reliability toolkit</h2>
              <p className="text-lg text-muted-foreground">
                Move beyond disparate tools. OpsSage brings your logs, metrics, traces, and runbooks into a single, cohesive platform.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                }
                title="Unified Telemetry"
                description="Ingest petabytes of data with zero configuration. Query logs, metrics, and traces with a unified query language built for speed."
              />
              <FeatureCard 
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                }
                title="Programmable Runbooks"
                description="Codify your incident response. Trigger automated scripts that resolve common infrastructure issues before they alert your on-call team."
              />
              <FeatureCard 
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Intelligent Escalation"
                description="Route alerts dynamically based on service ownership, severity, and on-call schedules. Ensure the right person is paged, every time."
              />
            </div>
          </div>
        </section>
        
        <section className="py-24 bg-muted/50">
           <div className="max-w-3xl mx-auto px-6 text-center">
             <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Ready to upgrade your infrastructure?</h2>
             <p className="text-lg text-muted-foreground mb-8">
               Deploy OpsSage in minutes. Integrate seamlessly with your existing stack.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link href="/signup" className="button-primary px-8 py-3 w-full sm:w-auto text-center">
                 Start Free Trial
               </Link>
               <Link href="/contact" className="button-secondary px-8 py-3 w-full sm:w-auto text-center">
                 Contact Sales
               </Link>
             </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
