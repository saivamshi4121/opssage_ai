import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded bg-brand flex items-center justify-center font-bold text-white text-[10px]">
                O
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                OpsSage
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              The reliability platform engineered for serious teams. Consolidate telemetry, automate runbooks, and reduce MTTR.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Platform Overview</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Integrations</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Changelog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">API Reference</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Engineering Blog</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">System Status</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="/" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} OpsSage Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
