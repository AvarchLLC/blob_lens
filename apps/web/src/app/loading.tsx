import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-[#10B981] opacity-10" />
        <Image
          src="/brand/bloblens-logo.svg"
          alt="BlobLens"
          width={52}
          height={52}
          priority
          className="relative z-10 animate-pulse"
        />
      </div>
      <p className="caption tracking-widest uppercase animate-pulse">Loading…</p>
    </div>
  );
}
