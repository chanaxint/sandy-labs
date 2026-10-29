import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { LangToggle } from "@/components/journey/LangToggle";
import { StudioBridgeLoader } from "@/components/studio/StudioBridgeLoader";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
      <LangToggle />
      <StudioBridgeLoader />
      <JourneyDebug />
    </main>
  );
}
