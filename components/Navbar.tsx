import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand flex items-center justify-center font-bold text-white text-xs">
            O
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            OpsSage
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#platform" className="hover:text-foreground transition-colors">Platform</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Integrations</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/" className="hover:text-foreground transition-colors">Documentation</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/contact" className="hidden sm:inline-flex button-secondary px-4 py-2 text-sm">
            Contact Sales
          </Link>
          <Link href="/signup" className="button-primary px-4 py-2 text-sm">
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}
