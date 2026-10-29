import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { IntroGate } from "@/components/site/IntroGate";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioBridgeLoader } from "@/components/studio/StudioBridgeLoader";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
      <IntroGate />
      <SiteHeader />
      <StudioBridgeLoader />
      <JourneyDebug />
    </main>
  );
}
