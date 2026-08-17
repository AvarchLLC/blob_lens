"use client";

import React, { createContext, useContext } from "react";
import { Dithering } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface HeroDitheringContextType {
  isDark: boolean;
}

const HeroDitheringContext = createContext<HeroDitheringContextType>({ isDark: true });

export interface HeroDitheringRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroDitheringRoot({ children, className, ...props }: HeroDitheringRootProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <HeroDitheringContext.Provider value={{ isDark }}>
      <div
        className={cn(
          "relative w-full overflow-hidden bg-[var(--surface-0)] text-[var(--text-primary)] transition-colors duration-300 py-12 md:py-24 border-b border-dashed border-[var(--border)]",
          className
        )}
        {...props}
      >
        {/* Fine Data-Grid Geometry Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#18212C_1px,transparent_1px)] [background-size:32px_32px] opacity-60 pointer-events-none" />
        
        {/* Glow ambient background highlight */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#63F3FF]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-[#9B7CFF]/5 blur-[100px] rounded-full pointer-events-none" />

        {children}
      </div>
    </HeroDitheringContext.Provider>
  );
}

export interface HeroDitheringContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroDitheringContainer({ children, className, ...props }: HeroDitheringContainerProps) {
  return (
    <div
      className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface HeroDitheringContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroDitheringContent({ children, className, ...props }: HeroDitheringContentProps) {
  return (
    <div className={cn("lg:col-span-7 flex flex-col items-start text-left z-10", className)} {...props}>
      {children}
    </div>
  );
}

import { PixelHeading, PixelFontName } from "./pixel-heading-word";

export interface HeroDitheringHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
  initialFont?: PixelFontName;
  hoverFont?: PixelFontName;
  cycleInterval?: number;
  showLabel?: boolean;
}

export function HeroDitheringHeading({
  children,
  className,
  initialFont = "square",
  hoverFont,
  cycleInterval = 300,
  showLabel = false,
  ...props
}: HeroDitheringHeadingProps) {
  return (
    <PixelHeading
      as="h1"
      initialFont={initialFont}
      hoverFont={hoverFont}
      cycleInterval={cycleInterval}
      showLabel={showLabel}
      className={cn(
        "text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.04] mb-6 text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </PixelHeading>
  );
}

export interface HeroDitheringDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroDitheringDescription({ children, className, ...props }: HeroDitheringDescriptionProps) {
  return (
    <p
      className={cn(
        "text-base sm:text-lg md:text-xl font-sans text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-8",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface HeroDitheringActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function HeroDitheringActions({ children, className, ...props }: HeroDitheringActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4 mb-8 w-full sm:w-auto", className)} {...props}>
      {children}
    </div>
  );
}

export interface HeroDitheringVisualProps extends React.HTMLAttributes<HTMLDivElement> {
  colorFront?: string;
  colorBack?: string;
  className?: string;
}

export function HeroDitheringVisual({ colorFront, colorBack, className, ...props }: HeroDitheringVisualProps) {
  const { isDark } = useContext(HeroDitheringContext);
  const [ditherShape, setDitherShape] = React.useState<"simplex" | "wave" | "ripple" | "dots">("simplex");
  const [ditherType, setDitherType] = React.useState<"4x4" | "8x8" | "2x2">("4x4");

  const defaultFront = colorFront || (isDark ? "#63F3FF" : "#0284C7");
  const defaultBack = colorBack || (isDark ? "#07090D" : "#F8FAFC");

  return (
    <div
      className={cn(
        "hidden lg:block lg:col-span-5 relative aspect-square w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-dashed border-[var(--border-strong)] shadow-2xl bg-[var(--surface-1)] group",
        className
      )}
      {...props}
    >
      {/* Retro Corner Markers */}
      <span className="absolute top-2 left-2 font-mono text-[10px] text-[var(--primary)] opacity-70 z-20 pointer-events-none">+</span>
      <span className="absolute top-2 right-2 font-mono text-[10px] text-[var(--primary)] opacity-70 z-20 pointer-events-none">+</span>
      <span className="absolute bottom-2 left-2 font-mono text-[10px] text-[var(--primary)] opacity-70 z-20 pointer-events-none">+</span>
      <span className="absolute bottom-2 right-2 font-mono text-[10px] text-[var(--primary)] opacity-70 z-20 pointer-events-none">+</span>

      {/* Dither Controls Header Bar */}
      <div className="absolute top-0 inset-x-0 h-9 bg-[var(--surface-0)]/90 backdrop-blur-xs border-b border-[var(--border)] px-4 flex items-center justify-between z-20 font-mono text-[10px]">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
          <span className="font-bold text-[var(--text-primary)] tracking-widest uppercase">BLOB MATRIX // WEBGL TELEMETRY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDitherShape(ditherShape === "simplex" ? "wave" : ditherShape === "wave" ? "ripple" : ditherShape === "ripple" ? "dots" : "simplex")}
            className="px-2 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--primary-text)] hover:border-[var(--primary)] transition-colors cursor-pointer"
            title="Toggle Dither Shape"
          >
            SHAPE: {ditherShape.toUpperCase()}
          </button>
          <button
            onClick={() => setDitherType(ditherType === "4x4" ? "8x8" : ditherType === "8x8" ? "2x2" : "4x4")}
            className="px-2 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Toggle Matrix Resolution"
          >
            {ditherType}
          </button>
        </div>
      </div>

      {/* Paper Design WebGL Dither Shader Canvas */}
      <div className="w-full h-full pt-9 pb-8">
        <Dithering
          colorFront={defaultFront}
          colorBack={defaultBack}
          speed={0.15}
          shape={ditherShape}
          type={ditherType}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Floating HUD Card 1 - Top Right */}
      <div className="absolute top-12 right-4 z-20 bg-[var(--surface-0)]/95 border border-dashed border-[var(--primary-border)] p-3 rounded-md shadow-lg backdrop-blur-sm pointer-events-none transform transition-transform group-hover:-translate-y-1">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">EIP-7691 TARGET</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
        </div>
        <div className="font-mono text-sm font-bold text-[var(--primary-text)] tracking-tight">
          6 BLOBS / BLOCK
        </div>
        <div className="font-mono text-[9px] text-[var(--text-secondary)] mt-0.5">
          TARGET CAPACITY: 768 KB
        </div>
      </div>

      {/* Floating HUD Card 2 - Bottom Left */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-[var(--surface-0)]/95 border border-[var(--border-strong)] p-3 rounded-md shadow-lg backdrop-blur-sm pointer-events-none flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">REAL-TIME BLOB FEED</div>
          <div className="font-mono text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
            <span className="text-[var(--primary)]">[KZG PROOFS]</span> DECODED & VERIFIED
          </div>
        </div>
        <div className="font-mono text-right">
          <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded border border-[var(--success)]/30">
            0.0012 GWEI
          </span>
        </div>
      </div>

      {/* Bottom CRT Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-0)]/70 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export interface HeroDitheringMobileVisualProps extends React.HTMLAttributes<HTMLDivElement> {
  colorFront?: string;
  colorBack?: string;
  className?: string;
}

export function HeroDitheringMobileVisual({ colorFront, colorBack, className, ...props }: HeroDitheringMobileVisualProps) {
  const { isDark } = useContext(HeroDitheringContext);

  const defaultFront = colorFront || (isDark ? "#63F3FF" : "#0284C7");
  const defaultBack = colorBack || (isDark ? "#07090D" : "#F8FAFC");

  return (
    <div
      className={cn(
        "block lg:hidden w-full aspect-[16/9] mt-8 rounded-xl overflow-hidden border border-dashed border-[var(--border-strong)] shadow-lg bg-[var(--surface-1)] relative",
        className
      )}
      {...props}
    >
      <div className="absolute top-2 left-3 z-20 font-mono text-[10px] text-[var(--primary-text)] font-bold bg-[var(--surface-0)]/80 px-2 py-0.5 rounded border border-[var(--border)]">
        BLOB MATRIX // EIP-4844
      </div>
      <Dithering
        colorFront={defaultFront}
        colorBack={defaultBack}
        speed={0.15}
        shape="simplex"
        type="4x4"
        style={{ width: "100%", height: "100%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-0)]/80 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

