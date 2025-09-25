/**
 * Watermark Background Component — DriveDock
 *
 * Description:
 * Displays a fixed, semi-transparent, blurred watermark image in the center
 * of the screen as a background element. Designed to add subtle branding without
 * interfering with interactive elements.
 *
 * Functionality:
 * - Uses Next.js `Image` for optimized loading and sizing.
 * - Fixed position and centered using `translate-x`/`translate-y` transforms.
 * - Fully non-interactive (`pointer-events-none`) and non-selectable (`select-none`).
 * - Scales responsively: smaller size on mobile, larger on desktop.
 *
 * Styling:
 * - Low opacity (`opacity-5`) and blur effect (`blur-sm`) to avoid visual distraction.
 * - `z-0` to ensure it remains behind all other UI layers.
 *
 * Routing:
 * - Typically placed at the top of the `<main>` content wrapper for landing/start/onboarding pages.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

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
