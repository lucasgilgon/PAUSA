import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import TechSection from "@/components/landing/TechSection";
import ImpactSection from "@/components/landing/ImpactSection";
import BusinessModelSection from "@/components/landing/BusinessModelSection";
import InvestmentSection from "@/components/landing/InvestmentSection";
import TeamSection from "@/components/landing/TeamSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="landing-body">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <TechSection />
      <ImpactSection />
      <BusinessModelSection />
      <InvestmentSection />
      <TeamSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
