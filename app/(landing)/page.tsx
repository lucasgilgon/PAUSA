import Navbar from "@/components/landing/Navbar";
import ScrollProgress from "@/components/landing/ScrollProgress";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import TechSection from "@/components/landing/TechSection";
import ImpactSection from "@/components/landing/ImpactSection";
import BusinessModelSection from "@/components/landing/BusinessModelSection";
import InvestmentSection from "@/components/landing/InvestmentSection";
import TeamSection from "@/components/landing/TeamSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import ContactSection from "@/components/landing/ContactSection";
import StickyCTA from "@/components/landing/StickyCTA";
import Footer from "@/components/landing/Footer";
import SchemaOrg from "@/components/landing/SchemaOrg";

export default function LandingPage() {
  return (
    <>
      <SchemaOrg />
      <ScrollProgress />
      <Navbar />
      <main id="main">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <TechSection />
        <ImpactSection />
        <TestimonialsSection />
        <BusinessModelSection />
        <FAQSection />
        <InvestmentSection />
        <TeamSection />
        <ContactSection />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
