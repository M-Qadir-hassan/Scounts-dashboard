// components/ui/background-glow.tsx
export function GridBackground() {
  return (
    <>
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-6 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)]" />

      {/* Slow fade — grid stays under everything */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_220%_185%_at_120%_-20%,transparent_5%,var(--background)_70%)]" />
    </>
  );
}