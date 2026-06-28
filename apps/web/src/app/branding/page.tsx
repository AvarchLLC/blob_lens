"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Download, ExternalLink, Palette, Type, ShieldAlert, LayoutGrid } from "lucide-react";

// Inline SVGs for copying and previewing
const LOGO_SVG = `<svg viewBox="0 0 300 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-1"><rect x="0" y="0" transform="scale(0.14648,0.14648)" width="2048" height="2048" fill="none"/></clipPath>
    <style>
      @keyframes rotate-frame { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes pulse-nodes { 0%, 100% { opacity: 0.6; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.04); } }
      @keyframes pulse-lens { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.98); } }
      #logo-frame { transform-origin: 150px 150px; animation: rotate-frame 35s infinite linear; }
      #logo-nodes { transform-origin: 150px 150px; animation: pulse-nodes 4s infinite ease-in-out; }
      #logo-lens { transform-origin: 150px 150px; animation: pulse-lens 6s infinite ease-in-out; }
    </style>
  </defs>
  <g clip-path="url(#clip-1)">
    <path id="logo-lens" d="M141.35391,60.99902c2.04038,-0.23745 4.88789,-0.10298 6.98643,-0.09463c21.10254,0.11221 41.47266,7.74932 57.44824,21.53789c21.38379,18.2833 33.26807,45.77388 31.57764,73.89902c-1.19971,19.38281 -8.62354,37.86328 -21.16699,52.68896c1.72705,2.05225 4.87939,4.95703 6.90967,6.96973c3.30762,3.31348 6.59473,6.64893 9.85986,10.00488l41.84912,41.83008l10.97754,10.9585c1.4502,1.41943 2.89014,2.85205 4.31543,4.29639c0.63428,0.63135 2.06982,1.89404 2.49902,2.53271c1.81934,2.70557 -0.17725,6.49951 -3.54053,6.28125c-0.79687,-0.05127 -1.30371,-0.12744 -1.875,-0.60937c-1.88818,-1.59229 -3.60937,-3.40137 -5.3584,-5.14307l-9.48486,-9.48047l-17.81543,-17.79346c-2.9209,-2.91504 -6.16113,-6.00879 -8.98828,-8.95459c-3.04541,-3.35889 -7.74023,-7.79004 -11.05225,-11.10352l-23.77881,-23.83447c-16.02832,15.54199 -35.82715,24.9917 -58.28467,26.20605c-24.54082,1.46484 -48.6271,-7.07812 -66.76011,-23.67773c-17.39019,-15.94629 -27.88579,-38.0376 -29.26143,-61.59229c-1.13364,-23.81821 7.12529,-47.12974 23.00068,-64.92173c15.89736,-17.75918 38.15288,-28.53794 61.94312,-30.00015zM150.36768,236.61328c47.28223,-1.89111 84.06885,-41.77002 82.14551,-89.04932c-1.92334,-47.28091 -41.82568,-84.04102 -89.10498,-82.08691c-47.23477,1.95234 -83.95283,41.81001 -82.03184,89.04639c1.921,47.23535 41.75435,83.97949 88.99131,82.08984z" fill="#914af8"/>
    <path id="logo-nodes" d="M125.53916,96.28359c2.82642,-0.01831 4.86357,0.32227 7.11548,2.21206c1.9897,1.67827 3.23936,4.07212 3.47871,6.66431c0.26997,3.15967 -0.79219,5.25806 -2.78291,7.5876c6.21987,8.14424 12.48442,16.2542 18.79263,24.32974c2.5459,3.29209 6.08057,7.54028 8.37451,10.86167c5.32178,-2.31899 10.13965,-0.57568 13.14551,4.2876c4.11475,-1.69482 8.48291,-3.21387 12.64746,-4.7959c3.90088,-1.4814 7.86328,-3.04937 11.79199,-4.4272c-2.48291,-10.22813 11.34375,-16.49971 17.48584,-7.62612c1.52051,2.18086 2.09473,4.88364 1.59229,7.49399c-1.41357,7.29272 -10.81348,10.30591 -16.20557,5.19507c-0.80859,-0.76611 -1.24512,-1.40918 -1.8457,-2.32954c-8.05664,2.67524 -16.44434,6.39302 -24.5874,9.07075c0.38672,5.77588 -2.34082,10.51611 -8.39209,11.34375c0.32666,9.20215 -0.12158,19.29346 0.05273,28.61865c5.72168,0.97266 9.58154,6.38525 8.06982,12.07471c-0.6665,2.48291 -2.30713,4.59229 -4.5498,5.84912c-2.33496,1.3125 -5.09326,1.64648 -7.67285,0.92725c-2.41699,-0.67383 -4.46191,-2.28955 -5.67773,-4.48389c-1.6377,-2.96777 -1.37695,-5.5415 -0.45703,-8.63379c0.271,-0.60205 0.5874,-1.18213 0.94922,-1.73437c1.46484,-2.22656 3.87451,-3.49365 6.43506,-4.01074c-0.09668,-3.05127 0,-6.51416 0,-9.59766l0.01611,-18.91992c-2.09766,-0.48193 -3.68848,-1.16309 -5.24707,-2.70117c-1.82373,-1.81787 -2.84912,-4.28613 -2.85352,-6.86133c0.00293,-2.74219 1.08984,-5.16357 3.01465,-7.08838l-19.33594,-24.88462c-1.72017,-2.2437 -3.45322,-4.47744 -5.19917,-6.70122c-0.85752,-1.09717 -1.696,-2.30669 -2.64287,-3.31128c-3.79644,1.49722 -6.39419,1.53208 -10.03286,-0.39888c-8.76709,10.60679 -18.48179,21.36343 -27.5272,31.79546c4.4707,5.1939 2.53037,13.29741 -4.03242,15.58257c-2.46943,0.88623 -5.19331,0.73096 -7.54556,-0.43213c-5.01079,-2.46387 -6.84404,-8.36279 -4.30313,-13.27441c1.18521,-2.28457 3.24346,-3.99272 5.70703,-4.73687c2.85205,-0.86499 5.41333,-0.41646 8.00332,0.94658c6.04014,-7.26021 12.19497,-14.42446 18.46187,-21.48984c3.0646,-3.47871 5.98359,-6.89941 9.14722,-10.30928c-1.15181,-1.62905 -1.92056,-2.74482 -2.26538,-4.76104c-0.44385,-2.56318 0.15981,-5.19727 1.67563,-7.31118c1.7584,-2.46416 4.32114,-3.5436 7.19912,-4.02012z" fill="#914af8"/>
    <path id="logo-frame" d="M147.40576,8.4195c6.18311,0.0225 12.37939,4.7249 17.63965,7.79793l26.58545,15.61157l49.51025,28.97168l15.19336,8.94653c5.34082,3.14326 10.72412,5.45962 13.69189,11.2002c2.45508,4.7499 1.9292,9.66387 1.92041,14.81514l-0.00439,12.4875l0.00293,39.85298l-0.00586,43.5249l0.01172,14.56934c0.00293,4.28906 0.40137,8.12402 -0.8833,12.27393c-2.15039,6.94189 -7.24072,9.37061 -13.1001,12.6665c-3.80273,2.13867 -7.47656,4.46631 -11.32764,6.47754c-1.28174,-1.10596 -2.10352,-1.94238 -3.23584,-3.16846l12.65186,-7.40625c2.14014,-1.25244 5.75098,-3.21533 7.46631,-4.76953c2.58691,-2.34229 4.05029,-6.53906 4.04883,-10.00635c-0.00439,-7.89111 -0.0542,-15.81738 -0.05566,-23.72314l0.00879,-56.11187v-30.45015c-0.03809,-21.45366 2.11377,-19.05425 -16.25537,-29.85234l-23.26611,-13.65454l-51.02051,-29.84751l-17.78174,-10.45679c-3.81885,-2.2207 -7.36963,-5.09637 -11.91357,-5.22841c-4.63711,-0.13478 -7.85347,2.6141 -11.60962,4.87084l-10.98999,6.52017l-37.45122,22.35498c-15.06592,8.75933 -30.08687,17.596 -45.06196,26.50986c-7.15957,4.32246 -15.77783,7.03682 -15.55254,16.56694c0.05215,2.20181 -0.01685,4.50791 -0.01553,6.71924l0.00776,17.47837l0.00146,60.173v26.71729c-0.00044,4.46045 -0.10957,9.05273 0.07661,13.47949c0.13579,3.22705 2.47515,7.05176 5.15083,8.80518c2.07466,1.35791 4.22007,2.5459 6.36182,3.78662l10.50352,6.1377l36.44063,21.16406l39.75527,23.05664l10.84028,6.20654c4.89829,2.81982 9.24785,5.96484 15.29414,3.85107c2.77148,-0.96826 5.67773,-2.98535 8.24414,-4.50586l9.76318,-5.72607l43.56885,-25.31836l12.67822,-7.30957c2.11377,-1.22754 5.99121,-3.60791 8.12402,-4.49414l0.18604,-0.07617c1.07813,0.95508 2.06689,2.06396 3.05127,3.12158c-1.60107,1.28613 -6.79541,4.12061 -8.81104,5.26465c-5.25146,2.98535 -10.48535,6 -15.70312,9.04395l-38.23975,22.24072l-11.62939,6.75732c-2.45654,1.45166 -5.1709,3.18164 -7.67725,4.4458c-4.29785,2.16797 -10.71313,2.2002 -15.05405,0.08936c-2.39209,-1.16309 -4.82329,-2.66455 -7.15811,-4.01221l-12.82896,-7.41064c-14.79316,-8.48145 -29.54297,-17.03906 -44.24897,-25.67139l-33.20186,-19.31689l-7.85039,-4.56885c-2.14878,-1.25098 -5.04185,-2.79199 -6.76919,-4.4707c-3.43271,-3.33691 -5.34946,-7.77539 -5.36426,-12.57129c-0.02915,-9.50537 -0.01245,-19.0415 -0.01025,-28.54541l0.0019,-5.33462l-0.00234,-27.6041l-0.00718,-8.23257c-0.00308,-8.5147 1.12734,-14.10864 9.06694,-18.69331c3.81182,-2.20107 7.80308,-4.58965 11.59424,-6.85195l45.56543,-26.86743l35.37642,-21.11309l9.76479,-5.87742c5.19448,-3.15614 7.57163,-5.21477 13.93784,-5.30972z" fill="#914af8"/>
  </g>
</svg>`;

const WHITE_LOGO_SVG = LOGO_SVG.replaceAll("#914af8", "#fefefe");

const BLACK_LOGO_SVG = LOGO_SVG.replace(
  '<g clip-path="url(#clip-1)">',
  '<g clip-path="url(#clip-1)"><rect width="300" height="300" fill="#fefefe"/>'
).replaceAll("#914af8", "#000000");

export default function BrandingPage() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const downloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-text-secondary relative pb-20">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative z-10 space-y-12">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider hover:text-primary transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Observes
          </Link>
          <span className="text-[10px] font-mono uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 text-text-tertiary">
            System Identity v2.0
          </span>
        </div>

        {/* Hero Section */}
        <div className="border-b border-border/20 pb-8 space-y-3">
          <h1 className="text-3xl font-mono font-bold text-text-primary tracking-tight">
            Brand Assets & UI Guidelines
          </h1>
          <p className="text-sm text-text-secondary/70 max-w-3xl leading-relaxed">
            Consolidated branding system, visual styles, color palettes, and interface guidelines for **BlobLens**. 
            Use these assets and design specs to maintain design consistency across our ecosystem.
          </p>
        </div>

        {/* Split Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Logos & Favicons (Lg: 7) */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* Logo Assets section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-lg font-mono font-bold text-text-primary">Vector Logo Assets</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Main Colored Logo */}
                <div className="flex flex-col bg-surface/20 border border-border/30 backdrop-blur-md p-5 relative overflow-hidden group">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-text-tertiary mb-3">Main / Colored</span>
                  <div className="h-32 w-full flex items-center justify-center bg-[#0C0E14] border border-white/5 p-4 mb-4 relative rounded-sm">
                    <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary font-bold mb-1">bloblens-logo.svg</p>
                  <p className="text-[9px] font-mono text-text-tertiary mb-4">SVG · Color · Animated</p>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => triggerCopy(LOGO_SVG, "Main Logo")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase border border-border/50 hover:bg-white/5 transition-colors"
                    >
                      {copiedText === "Main Logo" ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                      {copiedText === "Main Logo" ? "Copied" : "Copy SVG"}
                    </button>
                    <button 
                      onClick={() => downloadSvg(LOGO_SVG, "bloblens-logo.svg")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase bg-primary text-black font-bold hover:bg-primary/95 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* White Logo */}
                <div className="flex flex-col bg-surface/20 border border-border/30 backdrop-blur-md p-5 relative overflow-hidden group">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-text-tertiary mb-3">Monochrome White</span>
                  <div className="h-32 w-full flex items-center justify-center bg-[#0C0E14] border border-white/5 p-4 mb-4 relative rounded-sm">
                    <div className="h-20 w-20 opacity-90" dangerouslySetInnerHTML={{ __html: WHITE_LOGO_SVG }} />
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary font-bold mb-1">bloblens-white.svg</p>
                  <p className="text-[9px] font-mono text-text-tertiary mb-4">SVG · White · Animated</p>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => triggerCopy(WHITE_LOGO_SVG, "White Logo")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase border border-border/50 hover:bg-white/5 transition-colors"
                    >
                      {copiedText === "White Logo" ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                      {copiedText === "White Logo" ? "Copied" : "Copy SVG"}
                    </button>
                    <button 
                      onClick={() => downloadSvg(WHITE_LOGO_SVG, "bloblens-white.svg")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase bg-primary text-black font-bold hover:bg-primary/95 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Black Logo */}
                <div className="flex flex-col bg-surface/20 border border-border/30 backdrop-blur-md p-5 relative overflow-hidden group">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-text-tertiary mb-3">Monochrome Black</span>
                  <div className="h-32 w-full flex items-center justify-center bg-white border border-white/5 p-4 mb-4 relative rounded-sm">
                    <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: BLACK_LOGO_SVG }} />
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary font-bold mb-1">bloblens-black.svg</p>
                  <p className="text-[9px] font-mono text-text-tertiary mb-4">SVG · Black · Animated</p>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => triggerCopy(BLACK_LOGO_SVG, "Black Logo")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase border border-border/50 hover:bg-white/5 transition-colors"
                    >
                      {copiedText === "Black Logo" ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                      {copiedText === "Black Logo" ? "Copied" : "Copy SVG"}
                    </button>
                    <button 
                      onClick={() => downloadSvg(BLACK_LOGO_SVG, "bloblens-black.svg")}
                      className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono uppercase bg-primary text-black font-bold hover:bg-primary/95 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Favicon Kit Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-lg font-mono font-bold text-text-primary">Favicon Kit & Webmanifest</h2>
              </div>

              <div className="rounded-xl border border-border/30 bg-surface/10 backdrop-blur-md overflow-hidden">
                <div className="px-5 py-4 border-b border-border/20 bg-surface/30 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-text-primary">Asset Map</span>
                  <span className="text-[10px] font-mono text-text-tertiary">/public/favicon/*</span>
                </div>
                <div className="divide-y divide-border/10 text-xs font-mono">
                  {[
                    { name: "favicon.ico", size: "32x32 / 16x16", path: "/favicon/favicon.ico", type: "Legacy Shortcut Icon" },
                    { name: "favicon-16x16.png", size: "16x16", path: "/favicon/favicon-16x16.png", type: "Standard Browser Tab" },
                    { name: "favicon-32x32.png", size: "32x32", path: "/favicon/favicon-32x32.png", type: "High-DPI Browser Tab" },
                    { name: "apple-touch-icon.png", size: "180x180", path: "/favicon/apple-touch-icon.png", type: "Apple iOS HomeScreen" },
                    { name: "android-chrome-192x192.png", size: "192x192", path: "/favicon/android-chrome-192x192.png", type: "Android App Launch Icon" },
                    { name: "android-chrome-512x512.png", size: "512x512", path: "/favicon/android-chrome-512x512.png", type: "Android Large Splash" },
                    { name: "site.webmanifest", size: "JSON config", path: "/favicon/site.webmanifest", type: "PWA Manifest Config" },
                  ].map((fav) => (
                    <div key={fav.name} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/2 transition-colors">
                      <div className="space-y-1">
                        <p className="text-[11px] text-text-primary font-bold">{fav.name}</p>
                        <p className="text-[10px] text-text-tertiary">{fav.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-2 py-0.5 border border-white/5 bg-white/2 text-text-secondary">{fav.size}</span>
                        <a 
                          href={fav.path} 
                          download={fav.name}
                          className="text-primary hover:text-accent transition-colors flex items-center gap-1 text-[10px]"
                        >
                          <Download className="h-3 w-3" />
                          Save
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Colors, Typography & CSS Guide (Lg: 5) */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* Color Systems */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Palette className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-lg font-mono font-bold text-text-primary">Color System</h2>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-text-secondary/60 font-mono leading-relaxed">
                  Click on any swatch below to copy its hex value directly to your clipboard.
                </p>

                {/* Brand Colors */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Brand Core</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Purple Core (Logo)", hex: "#914af8" },
                      { name: "Emerald (BPO2)", hex: "#10B981" },
                      { name: "Sky Blue (BPO1)", hex: "#0EA5E9" },
                      { name: "Violet (Pectra)", hex: "#8B5CF6" },
                    ].map((c) => (
                      <div 
                        key={c.name} 
                        onClick={() => triggerCopy(c.hex, c.name)}
                        className="flex items-center gap-3 p-3 bg-surface/20 border border-border/20 rounded-sm cursor-pointer hover:bg-surface/40 transition-colors group"
                      >
                        <div className="h-8 w-8 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: c.hex }} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-text-primary font-bold leading-none mb-1">{c.name}</p>
                          <p className="text-[9px] font-mono text-text-tertiary leading-none uppercase">{c.hex} {copiedText === c.name && "✓"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Neutrals */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">System Neutrals</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Core Background", hex: "#07090E" },
                      { name: "Surface Panel", hex: "#0E131F" },
                      { name: "Elevated Border", hex: "#1F2937" },
                      { name: "Text Primary", hex: "#F3F4F6" },
                    ].map((c) => (
                      <div 
                        key={c.name} 
                        onClick={() => triggerCopy(c.hex, c.name)}
                        className="flex items-center gap-3 p-3 bg-surface/20 border border-border/20 rounded-sm cursor-pointer hover:bg-surface/40 transition-colors group"
                      >
                        <div className="h-8 w-8 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: c.hex }} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-text-primary font-bold leading-none mb-1">{c.name}</p>
                          <p className="text-[9px] font-mono text-text-tertiary leading-none uppercase">{c.hex} {copiedText === c.name && "✓"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Guide */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Type className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-lg font-mono font-bold text-text-primary">Typography System</h2>
              </div>

              <div className="p-5 bg-surface/10 border border-border/30 backdrop-blur-md space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary">Sans-Serif Font (Outfit / Inter)</span>
                  <p className="text-xl font-bold text-text-primary">Outfit Sans-Serif</p>
                  <p className="text-xs text-text-secondary/70 leading-relaxed font-normal">
                    Used for headings, main dashboard stats, and high-impact UI elements.
                  </p>
                </div>

                <div className="space-y-1 border-t border-border/10 pt-4">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary">Monospace Font (Geist Mono)</span>
                  <p className="text-sm font-mono font-bold text-text-primary">Geist Monospace</p>
                  <p className="text-[11px] font-mono text-text-secondary/70 leading-relaxed">
                    Used for telemetry metrics, block numbers, transaction hashes, and all tabular data representation.
                  </p>
                </div>
              </div>
            </div>

            {/* UI Code Snippet / Tokens */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4.5 w-4.5 text-primary" />
                <h2 className="text-lg font-mono font-bold text-text-primary">UI Style Tokens</h2>
              </div>

              <div className="p-5 bg-[#0C0E14] border border-border/30 rounded-sm space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary block">Glassmorphism Card styling</span>
                  <pre className="text-[10px] font-mono p-3 bg-black/40 border border-white/5 overflow-x-auto text-primary">
{`.card-glass {
  background: rgba(14, 19, 31, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
}`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-text-tertiary block">Green Glow drop-shadow</span>
                  <pre className="text-[10px] font-mono p-3 bg-black/40 border border-white/5 overflow-x-auto text-primary">
{`.glow-green {
  filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.35));
}`}
                  </pre>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
