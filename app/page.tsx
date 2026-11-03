import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { CreateFlow } from "@/components/site/CreateFlow";
import { IntroGate } from "@/components/site/IntroGate";
import { LoadingScreen } from "@/components/site/LoadingScreen";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioBridgeLoader } from "@/components/studio/StudioBridgeLoader";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
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
