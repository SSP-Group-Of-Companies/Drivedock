/**
 * SSP App Launcher — external apps only
 * -------------------------------------
 * Each item is an app we maintain elsewhere. Clicking opens the app.
 * Open in the same tab by default (like Google); set `newTab: true` if desired.
 */

export type SSPApp = Readonly<{
  id: string;
  label: string;
  url: string; // absolute URL or path to another app root
  logoSrc?: string; // /assets/logos/*.png (optional)
  newTab?: boolean; // default false (open same tab)
}>;

export const APP_LAUNCHER_ITEMS: readonly SSPApp[] = [
  {
    id: "drivedock",
    label: "Driver Application",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/drivedockIcon.png",
  },
  {
    id: "dispatch",
    label: "Dispatch Safe",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/dispatchSafeIcon.png",
  },
  {
    id: "global",
    label: "GlobalOps",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/globalOpsIcon.png",
  },
  {
    id: "Fleet",
    label: "Fleet Track",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/fleetTrackIcon.png",
  },
  {
    id: "hrms",
    label: "HR Management",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/hrDockIcon.png",
  },
  {
    id: "inventory",
    label: "Trailer Managemnt",
    url: "/dashboard/home",
    logoSrc: "/assets/logos/trailerInventoryIcon.png",
  },
  // add more as needed…
];
