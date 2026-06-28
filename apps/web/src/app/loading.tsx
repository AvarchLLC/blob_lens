import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Tech ticks / grid lines - uses theme border variable */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border-subtle) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem'
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-bar {
          0% { left: -40%; width: 40%; }
          50% { left: 100%; width: 40%; }
          100% { left: -40%; width: 40%; }
        }
        @keyframes text-flicker {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}} />

      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="relative flex items-center justify-center p-8 bg-surface/30 border border-border/20 backdrop-blur-xl shadow-2xl">
          {/* Glowing rotating backdrop */}
          <div className="absolute -inset-8 bg-gradient-to-tr from-primary/10 via-transparent to-accent/5 rounded-full blur-xl animate-[spin_10s_linear_infinite] opacity-60 pointer-events-none" />
          
          {/* Inner pulse ring */}
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-primary/10 opacity-25" />
          
          <Image
            src="/brand/bloblens-logo.svg"
            alt="BlobLens"
            width={64}
            height={64}
            priority
            className="relative z-10"
          />
        </div>

        <div className="flex flex-col items-center gap-2.5 text-center">
          <p className="font-mono text-sm font-bold tracking-[0.25em] text-text-primary uppercase">
            Blob<span className="text-primary">Lens</span>
          </p>
          
          {/* Infinite scanner progress bar */}
          <div className="w-36 h-[1.5px] bg-border/20 overflow-hidden relative rounded-full">
            <div 
              className="absolute top-0 bottom-0 bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ animation: "scan-bar 2s infinite ease-in-out" }}
            />
          </div>
          
          <p 
            className="font-mono text-[8px] text-text-tertiary uppercase tracking-[0.3em]"
            style={{ animation: "text-flicker 2s infinite ease-in-out" }}
          >
            Initializing DA Telemetry…
          </p>
        </div>
      </div>
    </div>
  );
}
