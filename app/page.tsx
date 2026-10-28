import { JourneyDebug } from "@/components/journey/JourneyDebug";
import { JourneyFilm } from "@/components/journey/JourneyFilm";

export default function HomePage() {
  return (
    <main>
      <JourneyFilm />
      <JourneyDebug />
    </main>
  );
}
