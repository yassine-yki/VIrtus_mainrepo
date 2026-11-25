"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
export function FilterDisclosure({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="filter-disclosure" data-open={open}>
      <button
        type="button"
        className="filter-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>
          <SlidersHorizontal size={18} aria-hidden="true" /> Filtres{" "}
          <span className="filter-counter">{count}</span>
        </span>
        <ChevronDown className="filter-chevron" size={18} aria-hidden="true" />
      </button>
      <div className="filter-panel" id={id}>
        {children}
      </div>
    </div>
  );
}
