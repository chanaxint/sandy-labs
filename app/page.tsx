import { ExamplesSection } from "@/components/examples/ExamplesSection";
import { Hero } from "@/components/hero/Hero";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BriefProvider } from "@/components/questionnaire/BriefProvider";
import { Questionnaire } from "@/components/questionnaire/Questionnaire";
import { Contact } from "@/components/sections/Contact";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhatWeDo } from "@/components/sections/WhatWeDo";

export default function HomePage() {
  return (
    <BriefProvider>
      <Header />
      <main id="main">
        <Hero />
        <Questionnaire />
        <ExamplesSection />
        <WhatWeDo />
        <HowItWorks />
        <Contact />
      </main>
      <Footer />
    </BriefProvider>
  );
}
