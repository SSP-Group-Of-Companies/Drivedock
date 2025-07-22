import Image from "next/image";

export default function WatermarkBackground() {
  return (
    <Image
      src="/assets/logos/favicon.png"
      alt="SSP Watermark"
      width={500}
      height={500}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 blur-sm z-0 pointer-events-none select-none w-[300px] h-[300px] md:w-[500px] md:h-[500px]"
      priority
    />
  );
} 