import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { HomeEntry } from "@/components/home/HomeEntry";
import { HomeAbout, HomeContact, HomeEcosystem, HomeIntroduction, HomePlatform } from "@/components/home/HomeSections";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CreateFlow } from "@/components/site/CreateFlow";
import { IntroGate } from "@/components/site/IntroGate";
import { LoadingScreen } from "@/components/site/LoadingScreen";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WhatWeDo } from "@/components/site/WhatWeDo";
import { StudioBridgeLoader } from "@/components/studio/StudioBridgeLoader";

export default function HomePage() {
  return (
    <main>
      {/* 1. The Journey: the cinematic film (unchanged). */}
      <JourneyFilm />
      {/* 2–6. Sandy Labs: the introduction (opening on the valley), the ecosystem, the platform, about, contact. */}
      <div id="introduction">
        <WhatWeDo />
        <HomeIntroduction />
      </div>
      <HomeEcosystem />
      <HomePlatform />
      <HomeAbout />
      <HomeContact />
      <SiteFooter />
      <HomeEntry />
      <IntroGate />
      <CreateFlow />
      <SiteHeader />
      <ScrollProgress />
      <LoadingScreen />
      <StudioBridgeLoader />
      <JourneyDebug />
    </main>
  );
}
