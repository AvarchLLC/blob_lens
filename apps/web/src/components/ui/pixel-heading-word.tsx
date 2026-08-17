"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type PixelFontName = "square" | "grid" | "circle" | "triangle" | "line";

export const PIXEL_FONTS: Record<
  PixelFontName,
  { className: string; label: string }
> = {
  square: { className: "font-pixel-square", label: "Square" },
  grid: { className: "font-pixel-grid", label: "Grid" },
  circle: { className: "font-pixel-circle", label: "Circle" },
  triangle: { className: "font-pixel-triangle", label: "Triangle" },
  line: { className: "font-pixel-line", label: "Line" },
};

export const PIXEL_FONT_KEYS: PixelFontName[] = [
  "square",
  "grid",
  "circle",
  "triangle",
  "line",
];

export interface PixelHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  initialFont?: PixelFontName;
  hoverFont?: PixelFontName;
  cycleInterval?: number;
  defaultFontIndex?: number;
  showLabel?: boolean;
  onFontIndexChange?: (index: number) => void;
  className?: string;
  children: React.ReactNode;
}

export function PixelHeading({
  as: Component = "h1",
  initialFont = "square",
  hoverFont,
  cycleInterval = 300,
  defaultFontIndex = 0,
  showLabel = false,
  onFontIndexChange,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: PixelHeadingProps) {
  const getInitialIndex = useCallback(() => {
    if (initialFont && PIXEL_FONT_KEYS.includes(initialFont)) {
      return PIXEL_FONT_KEYS.indexOf(initialFont);
    }
    return Math.max(0, Math.min(4, defaultFontIndex));
  }, [initialFont, defaultFontIndex]);

  const [fontIndex, setFontIndex] = useState<number>(getInitialIndex);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSwapMode = hoverFont !== undefined;

  const updateFontIndex = useCallback(
    (newIndex: number) => {
      setFontIndex(newIndex);
      onFontIndexChange?.(newIndex);
    },
    [onFontIndexChange]
  );

  // Sync initial font when prop changes during render
  const prevInitialRef = useRef({ initialFont, defaultFontIndex });
  if (
    !isHovered &&
    (prevInitialRef.current.initialFont !== initialFont ||
      prevInitialRef.current.defaultFontIndex !== defaultFontIndex)
  ) {
    prevInitialRef.current = { initialFont, defaultFontIndex };
    const nextIdx = getInitialIndex();
    if (fontIndex !== nextIdx) {
      setFontIndex(nextIdx);
    }
  }

  // Handle Cycling
  const stopCycling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCycling = useCallback(() => {
    stopCycling();
    intervalRef.current = setInterval(() => {
      setFontIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % PIXEL_FONT_KEYS.length;
        onFontIndexChange?.(nextIndex);
        return nextIndex;
      });
    }, cycleInterval);
  }, [cycleInterval, onFontIndexChange, stopCycling]);

  useEffect(() => {
    return () => {
      stopCycling();
    };
  }, [stopCycling]);

  // Interaction handlers
  const handleMouseEnter = (e: React.MouseEvent<HTMLHeadingElement>) => {
    setIsHovered(true);
    if (isSwapMode) {
      const hoverIndex = PIXEL_FONT_KEYS.indexOf(hoverFont);
      if (hoverIndex !== -1) {
        updateFontIndex(hoverIndex);
      }
    } else {
      startCycling();
    }
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLHeadingElement>) => {
    setIsHovered(false);
    if (isSwapMode) {
      const initialIndex = getInitialIndex();
      updateFontIndex(initialIndex);
    } else {
      stopCycling();
    }
    onMouseLeave?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLHeadingElement>) => {
    setIsHovered(true);
    if (isSwapMode) {
      const hoverIndex = PIXEL_FONT_KEYS.indexOf(hoverFont);
      if (hoverIndex !== -1) {
        updateFontIndex(hoverIndex);
      }
    } else {
      startCycling();
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    setIsHovered(false);
    if (isSwapMode) {
      const initialIndex = getInitialIndex();
      updateFontIndex(initialIndex);
    } else {
      stopCycling();
    }
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isSwapMode) {
        const hoverIndex = PIXEL_FONT_KEYS.indexOf(hoverFont);
        const initialIndex = getInitialIndex();
        const nextIndex = fontIndex === hoverIndex ? initialIndex : hoverIndex;
        updateFontIndex(nextIndex);
      } else {
        const nextIndex = (fontIndex + 1) % PIXEL_FONT_KEYS.length;
        updateFontIndex(nextIndex);
      }
    }
    onKeyDown?.(e);
  };

  const currentFontKey = PIXEL_FONT_KEYS[fontIndex] || "square";
  const currentFontMeta = PIXEL_FONTS[currentFontKey];

  return (
    <div className="inline-flex flex-col items-start group">
      <Component
        tabIndex={0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm",
          currentFontMeta.className,
          className
        )}
        {...props}
      >
        {children}
      </Component>
      {showLabel && (
        <output
          aria-live="polite"
          className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground/80 mt-1 select-none transition-opacity duration-150"
        >
          {currentFontMeta.label}
        </output>
      )}
    </div>
  );
}
