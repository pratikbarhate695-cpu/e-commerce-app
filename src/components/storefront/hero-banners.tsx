"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { slideButton } from "@/lib/banners/rules";

const ROTATE_MS = 6000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);

  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export type HeroSlideData = {
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  altText: string | null;
};

/** Height of the hero. Shared so the admin preview is the same size visitors see. */
export const HERO_FRAME_CLASS =
  "relative isolate h-[420px] w-full overflow-hidden bg-[#050b16] text-white sm:h-[480px] lg:h-[560px]";

/**
 * One hero slide. It fills its parent (the parent sets the size), puts the picture behind
 * the text, and only adds the dark overlay when there is text to keep readable.
 */
export function HeroSlide({
  slide,
  priority = false,
  unoptimized = false,
  headingLevel = "h2",
  fallbackHeading,
  interactive = true,
}: {
  slide: HeroSlideData;
  priority?: boolean;
  /** True for local browser previews (blob: URLs), which cannot go through the image optimiser. */
  unoptimized?: boolean;
  headingLevel?: "h1" | "h2";
  /** Hidden heading for screen readers when the banner has no visible heading. */
  fallbackHeading?: string;
  interactive?: boolean;
}) {
  const Heading = headingLevel;
  const button = slideButton(slide);
  const hasText = !!(slide.title || slide.subtitle || button);
  const external = button ? /^https?:/i.test(button.href) : false;

  const buttonClass =
    "mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.45)] transition hover:bg-blue-700";

  return (
    <div className="absolute inset-0">
      <Image
        src={slide.imageUrl}
        alt={slide.altText || slide.title || ""}
        fill
        priority={priority}
        unoptimized={unoptimized}
        sizes="100vw"
        className="object-cover"
      />

      {hasText && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 sm:bg-gradient-to-r sm:from-black/75 sm:via-black/40 sm:to-transparent"
        />
      )}

      <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-12 sm:items-center sm:px-6 sm:pb-0 lg:px-8">
        <div className="max-w-xl">
          {slide.title ? (
            <Heading className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {slide.title}
            </Heading>
          ) : fallbackHeading ? (
            <Heading className="sr-only">{fallbackHeading}</Heading>
          ) : null}

          {slide.subtitle && (
            <p className="mt-3 text-base leading-7 text-slate-200 sm:text-lg">
              {slide.subtitle}
            </p>
          )}

          {button &&
            (external ? (
              <a
                href={button.href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={interactive ? 0 : -1}
                className={buttonClass}
              >
                {button.label}
              </a>
            ) : (
              <Link
                href={button.href}
                tabIndex={interactive ? 0 : -1}
                className={buttonClass}
              >
                {button.label}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

/** Published hero banners. One banner: a still hero. Several: an auto-advancing carousel with controls. */
export function HeroCarousel({
  slides,
  fallbackHeading,
}: {
  slides: HeroSlideData[];
  fallbackHeading: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const reduceMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Keep the active slide valid if banners are added or removed.
  const activeIndex = count > 0 ? index % count : 0;

  const go = useCallback(
    (i: number) => {
      if (count === 0) return;

      setIndex(((i % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;

    const timer = window.setTimeout(
      () => go(activeIndex + 1),
      ROTATE_MS
    );

    return () => window.clearTimeout(timer);
  }, [count, paused, reduceMotion, activeIndex, go]);

  return (
    <section
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label="Featured"
      className={HERO_FRAME_CLASS}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          role={count > 1 ? "group" : undefined}
          aria-roledescription={count > 1 ? "slide" : undefined}
          aria-label={count > 1 ? `${i + 1} of ${count}` : undefined}
          aria-hidden={i === activeIndex ? undefined : true}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === activeIndex
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <HeroSlide
            slide={slide}
            priority={i === 0}
            headingLevel={i === 0 ? "h1" : "h2"}
            fallbackHeading={fallbackHeading}
            interactive={i === activeIndex}
          />
        </div>
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => go(activeIndex - 1)}
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white transition hover:bg-black/65 sm:flex"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <button
            type="button"
            aria-label="Next banner"
            onClick={() => go(activeIndex + 1)}
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white transition hover:bg-black/65 sm:flex"
          >
            <span aria-hidden="true">›</span>
          </button>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === activeIndex ? "true" : undefined}
                onClick={() => go(i)}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === activeIndex
                      ? "w-6 bg-white"
                      : "w-2.5 bg-white/50"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
