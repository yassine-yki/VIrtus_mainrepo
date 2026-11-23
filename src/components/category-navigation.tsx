"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  catalogCategories,
  type CatalogCategory,
} from "@/lib/catalog-categories";
import { categoryImages } from "@/lib/category-imagery";

type CategoryLink = { id: CatalogCategory; href: string; current: boolean };
export function CategoryNavigation({
  links,
  compact,
}: {
  links: CategoryLink[];
  compact: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const requested = useRef<CatalogCategory | null>(null);
  const pending = useRef(new Map<CatalogCategory, Promise<void>>());
  const mounted = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState<CatalogCategory[]>([]);
  const [active, setActive] = useState<CatalogCategory | null>(null);
  const stop = () => {
    requested.current = null;
    setActive(null);
  };
  useEffect(() => {
    mounted.current = true;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const allow = !compact && desktop.matches && !reduced.matches;
      setEnabled(allow);
      if (!allow) stop();
    };
    sync();
    desktop.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    const stage = nav.current?.closest(".intro-stage");
    if (stage) observer.observe(stage);
    return () => {
      mounted.current = false;
      requested.current = null;
      observer.disconnect();
      desktop.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [compact]);
  function activate(id: CatalogCategory) {
    if (!enabled || compact) return;
    requested.current = id;
    let ready = pending.current.get(id);
    if (!ready) {
      ready = new Promise<void>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => {
          image.decode().then(resolve, reject);
        };
        image.onerror = () => reject(new Error("Decorative image unavailable"));
        image.src = categoryImages[id];
      });
      pending.current.set(id, ready);
    }
    void ready
      .then(() => {
        if (!mounted.current) return;
        setLoaded((previous) =>
          previous.includes(id) ? previous : [...previous, id],
        );
        if (requested.current === id) setActive(id);
      })
      .catch(() => {
        pending.current.delete(id);
        // A missing image leaves the stage usable, with no broken-media indicator.
        if (mounted.current && requested.current === id) setActive(null);
      });
  }
  return (
    <>
      <div
        className="category-backdrops"
        aria-hidden="true"
        data-active-category={
          enabled && !compact ? (active ?? undefined) : undefined
        }
      >
        {enabled &&
          !compact &&
          loaded.map((id) => (
            <div
              key={id}
              className={
                "category-backdrop" + (active === id ? " is-active" : "")
              }
              data-image-category={id}
              style={{ backgroundImage: "url(" + categoryImages[id] + ")" }}
            />
          ))}
      </div>
      <nav
        ref={nav}
        className="category-list"
        aria-label="Explorer par catégorie"
        onPointerLeave={() => {
          const focused =
            nav.current?.querySelector<HTMLAnchorElement>("a:focus");
          const id = focused?.dataset.category as CatalogCategory | undefined;
          if (id) activate(id);
          else stop();
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            stop();
        }}
      >
        {catalogCategories.map((category) => {
          const link = links.find((item) => item.id === category.id)!;
          return (
            <Link
              key={category.id}
              href={link.href}
              prefetch={false}
              data-category={category.id}
              aria-current={link.current ? "page" : undefined}
              onPointerEnter={(event) => {
                if (
                  event.pointerType === "mouse" &&
                  window.matchMedia("(hover: hover) and (pointer: fine)")
                    .matches
                )
                  activate(category.id);
              }}
              onFocus={() => activate(category.id)}
            >
              <span className="category-label">{category.label}</span>
              <span className="category-hint">{category.hint}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
