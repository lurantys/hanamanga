import Image from "next/image";

type NezukoLoadingProps = {
  label?: string;
  className?: string;
};

/**
 * Full-screen loading state with the Nezuko running gif and an
 * indeterminate loading bar. Rendered as a fixed overlay so it masks the
 * header/footer/tab bar and stays centered in the viewport on mobile +
 * desktop. Shared by all route `loading.tsx` files.
 */
export function NezukoLoading({
  label = "Loading…",
  className = "",
}: NezukoLoadingProps) {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-zinc-950 px-6 text-center ${className}`}
    >
      <Image
        src="/nezukoloading.gif"
        alt="Nezuko running"
        width={250}
        height={270}
        priority
        unoptimized
        className="h-44 w-auto rounded-2xl object-cover md:h-60"
      />
      <div
        aria-hidden
        className="h-1 w-40 overflow-hidden rounded-full bg-white/10 md:w-52"
      >
        <div className="h-full w-1/3 rounded-full bg-red-500 animate-loading-bar" />
      </div>
    </main>
  );
}
