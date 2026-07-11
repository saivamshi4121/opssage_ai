import React from "react";
import Navbar from "../components/Landing/Navbar";
import Hero from "../components/Landing/Hero";
import StatsBar from "../components/Landing/StatsBar";
import Features from "../components/Landing/Features";
import Testimonials from "../components/Landing/Testimonials";
import Pricing from "../components/Landing/Pricing";
import CTA from "../components/Landing/CTA";
import Footer from "../components/Landing/Footer";

export function LandingPage(): JSX.Element {
  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Subtle noise overlay */}
      <div className="noise-overlay" />

      <Navbar />

      <main style={{ flex: 1, paddingTop: "64px" }}>
        <Hero />
        <StatsBar />
        <Features />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
