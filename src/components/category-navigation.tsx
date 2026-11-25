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
  landing = false,
}: {
  links: CategoryLink[];
  compact: boolean;
  landing?: boolean;
}) {
  const nav = useRef<HTMLElement>(null);
  const requested = useRef<CatalogCategory | null>(null);
  const pending = useRef(new Map<CatalogCategory, Promise<void>>());
  const mounted = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState<CatalogCategory[]>(
    landing ? ["jobs"] : [],
  );
  const [active, setActive] = useState<CatalogCategory | null>(
    landing ? "jobs" : null,
  );
  const stop = () => {
    requested.current = null;
    setActive(null);
  };
  useEffect(() => {
    mounted.current = true;
    if (compact)
      return () => {
        mounted.current = false;
      };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      const allow = !compact && desktop.matches;
      setEnabled(allow);
      if (!allow && !landing) stop();
    };
    sync();
    desktop.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    const stage = !landing && nav.current?.closest(".intro-stage");
    if (stage) observer.observe(stage);
    return () => {
      mounted.current = false;
      requested.current = null;
      observer.disconnect();
      desktop.removeEventListener("change", sync);
    };
  }, [compact, landing]);
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
        if (!mounted.current || requested.current !== id) return;
        setLoaded((previous) =>
          previous.includes(id) ? previous : [...previous.slice(-1), id],
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
          (landing || enabled) && !compact ? (active ?? undefined) : undefined
        }
      >
        {(landing || enabled) &&
          !compact &&
          loaded.map((id) => (
            <img
              key={id}
              className={
                "category-backdrop" + (active === id ? " is-active" : "")
              }
              data-image-category={id}
              src={categoryImages[id]}
              alt=""
              width={1672}
              height={941}
              decoding="async"
              fetchPriority={landing && id === "jobs" ? "high" : "auto"}
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
          else if (!landing) stop();
        }}
        onBlur={(event) => {
          if (
            !landing &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          )
            stop();
        }}
      >
        {catalogCategories.map((category) => {
          const link = links.find((item) => item.id === category.id);
          if (!link) return null;
          return (
            <Link
              key={category.id}
              href={link.href}
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
