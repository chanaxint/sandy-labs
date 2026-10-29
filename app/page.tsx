import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { IntroGate } from "@/components/site/IntroGate";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioBridgeLoader } from "@/components/studio/StudioBridgeLoader";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
      <IntroGate />
      <SiteHeader />
      <ScrollProgress />
      <StudioBridgeLoader />
      <JourneyDebug />
    </main>
  );
}
