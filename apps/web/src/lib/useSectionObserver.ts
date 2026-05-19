'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Observes a list of DOM section IDs and returns the one currently most visible
 * in the viewport. Used by the sidebar to highlight the active section.
 */
export function useSectionObserver(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ratioMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratioMap.current.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        // Pick the section with the highest intersection ratio
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratioMap.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        if (bestId && bestRatio > 0) {
          setActiveId(bestId);
        }
      },
      {
        root: null,
        // Top offset accounts for navbar height; bottom gives a generous window
        rootMargin: '-80px 0px -35% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      ratioMap.current.clear();
    };
  }, [sectionIds]);

  return activeId;
}
