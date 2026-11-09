"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export function FilterDisclosure({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const sync = () => {
      if (details.current) details.current.open = desktop.matches;
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={details} className="filter-disclosure">
      <summary>
        <span>
          <SlidersHorizontal size={18} /> Filtres{" "}
          <span className="filter-counter">{count}</span>
        </span>
        <ChevronDown className="filter-chevron" size={18} />
      </summary>
      {children}
    </details>
  );
}
