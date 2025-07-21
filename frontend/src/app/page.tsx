// Public Home Page — DriveDock
// Entry point for driver onboarding

import Navbar from "@/components/Navbar";
import WelcomeSection from "@/components/WelcomeSection";
import FeatureCards from "@/components/FeatureCards";
import ProcessSteps from "@/components/ProcessSteps";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen sm:min-h-[100vh] flex flex-col items-center justify-between overflow-hidden">
        <WelcomeSection />
        <FeatureCards />
        {/* Show cards only on md and up */}
        <div className="hidden md:block w-full">
           <ProcessSteps />
        </div>
      </main>
      <Footer />
    </>
  );
}
