import Image from "next/image";

export function LoadingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image
      src="/nezukoloading.gif"
      alt=""
      width={384}
      height={384}
      unoptimized
      aria-hidden
      className={className}
    />
  );
}