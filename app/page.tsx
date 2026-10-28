import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";
import { LangToggle } from "@/components/journey/LangToggle";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
      <LangToggle />
      <JourneyDebug />
    </main>
  );
}
