export function AuthInteractiveGlow() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[16%] top-[22%] h-64 w-64 rounded-full bg-white/8 blur-3xl motion-safe:animate-[float_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[14%] top-[36%] h-72 w-72 rounded-full bg-zinc-300/12 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[28%] bottom-[12%] h-80 w-80 rounded-full bg-white/8 blur-3xl motion-safe:animate-[float_20s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[24%] bottom-[8%] h-64 w-64 rounded-full bg-zinc-400/10 blur-3xl motion-safe:animate-[float_15s_ease-in-out_infinite]"
      />
    </>
  );
}
