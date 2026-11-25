"use client";
import { useEffect } from "react";

/** Resolve the results anchor after the streamed catalog is mounted. */
export function ResultsAnchor({ resultKey }: { resultKey: string }) {
  useEffect(() => {
    if (window.location.hash !== "#offres") return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById("offres")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [resultKey]);
  return null;
}
