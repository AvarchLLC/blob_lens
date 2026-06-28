"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, Tablet, Smartphone, RefreshCw, ZoomIn, Grid, Maximize2, ExternalLink, Camera, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

const ROUTES = [
  { name: "Overview Dashboard", path: "/" },
  { name: "Rollup Leaderboard", path: "/leaderboard" },
  { name: "Market Analytics", path: "/market" },
  { name: "Deep Research", path: "/research" },
  { name: "BPO Ledger", path: "/research?tab=bpo" },
  { name: "Live Telemetry Feed", path: "/live" },
  { name: "OFAC Compliance", path: "/compliance/ofac" },
  { name: "Wallet 360 Portal", path: "/wallet-360" },
  { name: "Brand Assets & UI Kit", path: "/branding" },
];

export default function PreviewsPage() {
  const [activeTab, setActiveTab] = useState<"deck" | "simulator">("deck");
  const [selectedRoute, setSelectedRoute] = useState<string>("/");
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [capturing, setCapturing] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const captureViewport = async (iframeId: string, filename: string) => {
    let originalIframeGetComputedStyle: any = null;
    let originalWindowGetComputedStyle: any = null;
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    
    try {
      setCapturing(iframeId);
      if (!iframe) return;

      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframe.contentDocument || iframeWindow?.document;
      if (!iframeDoc || !iframeDoc.body || !iframeWindow) {
        alert("Cannot access iframe content. Please make sure the page is loaded.");
        return;
      }

      // Hide scrollbars temporarily in the iframe during capture for a cleaner screenshot
      const originalOverflow = iframeDoc.body.style.overflow;
      iframeDoc.body.style.overflow = "hidden";

      // Allow animations and charts to fully render
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Setup color converters
      const colorCache = new Map<string, string>();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const convertModernColor = (colorStr: string): string => {
        if (!colorStr) return colorStr;
        if (!colorStr.includes("oklab") && !colorStr.includes("oklch")) return colorStr;
        if (colorCache.has(colorStr)) return colorCache.get(colorStr)!;
        if (ctx) {
          try {
            ctx.fillStyle = colorStr;
            const resolved = ctx.fillStyle;
            colorCache.set(colorStr, resolved);
            return resolved;
          } catch (e) {
            return "#914af8"; // Fallback
          }
        }
        return "#914af8";
      };

      const wrapStyle = (style: CSSStyleDeclaration) => {
        return new Proxy(style, {
          get(target, prop) {
            const value = Reflect.get(target, prop);
            if (typeof value === "string" && (value.includes("oklab") || value.includes("oklch"))) {
              return convertModernColor(value);
            }
            if (typeof value === "function") {
              return function (...args: any[]) {
                const res = value.apply(target, args);
                if (typeof res === "string" && (res.includes("oklab") || res.includes("oklch"))) {
                  return convertModernColor(res);
                }
                return res;
              };
            }
            return value;
          }
        });
      };

      // Override getComputedStyle on iframe window
      originalIframeGetComputedStyle = iframeWindow.getComputedStyle;
      iframeWindow.getComputedStyle = function (elt, pseudoElt) {
        const style = originalIframeGetComputedStyle.call(iframeWindow, elt, pseudoElt);
        return wrapStyle(style);
      };

      // Override getComputedStyle on main window
      originalWindowGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalWindowGetComputedStyle.call(window, elt, pseudoElt);
        return wrapStyle(style);
      };

      // Render the iframe body using html2canvas
      const capturedCanvas = await html2canvas(iframeDoc.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#07090E",
        scale: 2, // Use 2x scale for high-res Retina screenshots
        logging: false,
        width: iframe.offsetWidth || undefined,
        height: iframe.offsetHeight || undefined,
      });

      // Restore overflow
      iframeDoc.body.style.overflow = originalOverflow;

      // Trigger download
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = capturedCanvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      alert("Failed to capture screenshot. Please make sure the frame is fully loaded and try again.");
    } finally {
      // Restore getComputedStyle
      if (iframe && iframe.contentWindow && originalIframeGetComputedStyle) {
        iframe.contentWindow.getComputedStyle = originalIframeGetComputedStyle;
      }
      if (originalWindowGetComputedStyle) {
        window.getComputedStyle = originalWindowGetComputedStyle;
      }
      setCapturing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-text-secondary relative pb-20">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Control Header */}
      <div className="sticky top-0 z-50 bg-[#0B0F1A]/95 backdrop-blur-md border-b border-border/20 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center p-2 rounded-sm border border-border/40 hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </Link>
          <div>
            <h1 className="text-sm font-mono font-bold text-text-primary leading-none">Capture Deck & Preview Simulator</h1>
            <p className="text-[10px] font-mono text-text-tertiary mt-1">Export, preview, and capture screenshots of all active routes</p>
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Selector */}
          <div className="flex bg-white/5 border border-white/10 p-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider">
            <button 
              onClick={() => setActiveTab("deck")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${activeTab === "deck" ? "bg-primary text-black font-bold" : "hover:text-text-primary"}`}
            >
              <Grid className="h-3.5 w-3.5" />
              All-Routes Deck
            </button>
            <button 
              onClick={() => setActiveTab("simulator")}
              className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${activeTab === "simulator" ? "bg-primary text-black font-bold" : "hover:text-text-primary"}`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Viewport Sim
            </button>
          </div>

          {/* Simulator-specific Controls */}
          {activeTab === "simulator" && (
            <>
              {/* Route Dropdown */}
              <select 
                value={selectedRoute} 
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="bg-[#0C0E14] border border-white/15 px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-primary"
              >
                {ROUTES.map((r) => (
                  <option key={r.path} value={r.path}>{r.name}</option>
                ))}
              </select>

              {/* Zoom Level */}
              <div className="flex items-center gap-1 bg-[#0C0E14] border border-white/15 px-2 py-1 rounded-sm">
                <ZoomIn className="h-3.5 w-3.5 text-text-tertiary" />
                <select 
                  value={zoomLevel} 
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="bg-transparent text-xs font-mono text-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="0.5">50%</option>
                  <option value="0.75">75%</option>
                  <option value="1">100%</option>
                </select>
              </div>
            </>
          )}

          {/* Global Refresh */}
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-sm border border-border/40 hover:bg-white/5 text-text-primary transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Refresh All Frames"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto px-6 pt-8">
        
        {/* ── TAB 1: ALL-ROUTES DECK ── */}
        {activeTab === "deck" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {ROUTES.map((route, index) => {
              const iframeId = `deck-${index}`;
              return (
                <div key={route.path} className="flex flex-col bg-surface/20 border border-border/35 backdrop-blur-md overflow-hidden shadow-xl">
                  {/* Frame header */}
                  <div className="px-4 py-3 border-b border-border/20 bg-surface/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary/25 border border-primary/40 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-text-primary">{route.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <button 
                        onClick={() => captureViewport(iframeId, `bloblens-${route.name.toLowerCase().replace(/\s+/g, "-")}`)}
                        className="text-primary hover:text-accent disabled:text-text-tertiary transition-colors flex items-center gap-1 text-[10px] uppercase font-mono"
                        disabled={!!capturing}
                      >
                        {capturing === iframeId ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Snapping...
                          </>
                        ) : (
                          <>
                            <Camera className="h-3 w-3" />
                            Screenshot
                          </>
                        )}
                      </button>
                      <a href={route.path} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  
                  {/* Scaled iframe container */}
                  <div className="relative w-full aspect-video bg-[#07090E] overflow-hidden group">
                    <iframe 
                      id={iframeId}
                      key={`${route.path}-${refreshKey}`}
                      src={route.path} 
                      title={route.name}
                      className="absolute inset-0 border-none"
                      style={{
                        width: "200%",
                        height: "200%",
                        transform: "scale(0.5)",
                        transformOrigin: "top left",
                      }}
                    />
                    
                    {/* Overlay for easy click-to-full */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none group-hover:pointer-events-auto cursor-pointer">
                      <button 
                        onClick={() => {
                          setSelectedRoute(route.path);
                          setActiveTab("simulator");
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-primary text-black font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 shadow-lg transition-opacity duration-300"
                      >
                        Inspect Viewports
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB 2: VIEWPORT SIMULATOR ── */}
        {activeTab === "simulator" && (
          <div className="flex flex-col gap-12">
            {/* Desktop + Tablet + Mobile side-by-side */}
            <div className="flex flex-col xl:flex-row items-start gap-8 overflow-x-auto pb-6">
              
              {/* Desktop frame (1280 x 800) */}
              <div className="flex flex-col shrink-0 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    <span>Desktop Viewport (1280 × 800)</span>
                  </div>
                  <button 
                    onClick={() => captureViewport("sim-desktop", `bloblens-desktop-${selectedRoute.replace(/[^a-zA-Z0-9]/g, "-")}`)}
                    className="text-primary hover:text-accent disabled:text-text-tertiary transition-colors flex items-center gap-1 text-[10px] uppercase font-mono ml-4"
                    disabled={!!capturing}
                  >
                    {capturing === "sim-desktop" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Snapping...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3" />
                        Screenshot
                      </>
                    )}
                  </button>
                </div>
                <div 
                  className="border border-border/40 bg-[#07090E] overflow-hidden shadow-2xl relative"
                  style={{ 
                    width: `${1280 * zoomLevel}px`, 
                    height: `${800 * zoomLevel}px` 
                  }}
                >
                  <iframe 
                    id="sim-desktop"
                    key={`desktop-${selectedRoute}-${refreshKey}`}
                    src={selectedRoute} 
                    className="absolute inset-0 border-none"
                    style={{
                      width: "1280px",
                      height: "800px",
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                    }}
                  />
                </div>
              </div>

              {/* Tablet frame (768 x 1024) */}
              <div className="flex flex-col shrink-0 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <Tablet className="h-4 w-4 text-primary" />
                    <span>Tablet Viewport (768 × 1024)</span>
                  </div>
                  <button 
                    onClick={() => captureViewport("sim-tablet", `bloblens-tablet-${selectedRoute.replace(/[^a-zA-Z0-9]/g, "-")}`)}
                    className="text-primary hover:text-accent disabled:text-text-tertiary transition-colors flex items-center gap-1 text-[10px] uppercase font-mono ml-4"
                    disabled={!!capturing}
                  >
                    {capturing === "sim-tablet" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Snapping...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3" />
                        Screenshot
                      </>
                    )}
                  </button>
                </div>
                <div 
                  className="border border-border/40 bg-[#07090E] overflow-hidden shadow-2xl relative"
                  style={{ 
                    width: `${768 * zoomLevel}px`, 
                    height: `${1024 * zoomLevel}px` 
                  }}
                >
                  <iframe 
                    id="sim-tablet"
                    key={`tablet-${selectedRoute}-${refreshKey}`}
                    src={selectedRoute} 
                    className="absolute inset-0 border-none"
                    style={{
                      width: "768px",
                      height: "1024px",
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                    }}
                  />
                </div>
              </div>

              {/* Mobile frame (375 x 812) */}
              <div className="flex flex-col shrink-0 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Mobile Viewport (375 × 812)</span>
                  </div>
                  <button 
                    onClick={() => captureViewport("sim-mobile", `bloblens-mobile-${selectedRoute.replace(/[^a-zA-Z0-9]/g, "-")}`)}
                    className="text-primary hover:text-accent disabled:text-text-tertiary transition-colors flex items-center gap-1 text-[10px] uppercase font-mono ml-4"
                    disabled={!!capturing}
                  >
                    {capturing === "sim-mobile" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Snapping...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3" />
                        Screenshot
                      </>
                    )}
                  </button>
                </div>
                <div 
                  className="border border-border/40 bg-[#07090E] overflow-hidden shadow-2xl relative"
                  style={{ 
                    width: `${375 * zoomLevel}px`, 
                    height: `${812 * zoomLevel}px` 
                  }}
                >
                  <iframe 
                    id="sim-mobile"
                    key={`mobile-${selectedRoute}-${refreshKey}`}
                    src={selectedRoute} 
                    className="absolute inset-0 border-none"
                    style={{
                      width: "375px",
                      height: "812px",
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                    }}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
