"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const StudioBridge = dynamic(() => import("./StudioBridge").then((m) => m.StudioBridge), { ssr: false });

/** Loads the Studio bridge only inside the Studio's iframe (`?studio`), never for visitors. */
export function StudioBridgeLoader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // Read once on mount: the URL can't be known on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOn(new URLSearchParams(location.search).has("studio") && window.parent !== window);
  }, []);
  return on ? <StudioBridge /> : null;
}
