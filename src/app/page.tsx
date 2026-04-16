import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { PhilosophySection } from "@/components/home/PhilosophySection";
import { ExperienceSection } from "@/components/home/ExperienceSection";
import { CTASection } from "@/components/home/CTASection";
import { HomeGuard } from "@/components/guards/HomeGuard";

export default function HomePage() {
  return (
    <Suspense>
      <HomeGuard>
        <main>
          <Navbar />
          <HeroSection />
          <PhilosophySection />
          <ExperienceSection />
          <CTASection />
          <Footer />
        </main>
      </HomeGuard>
    </Suspense>
  );
}
