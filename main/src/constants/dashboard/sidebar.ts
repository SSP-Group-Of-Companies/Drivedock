/**
 * Sidebar configuration (no JSX, just data).
 */
import { Home, FileX, FileClock, ClipboardList, IdCard, Briefcase, ShieldAlert, FileBadge, FileText, Slash, BadgeCheck, Printer, Car, Settings } from "lucide-react";
import type { ElementType } from "react";

export type SidebarItem = { href: string; label: string; icon: ElementType };
export type SidebarSection = { title: string; items: SidebarItem[] };

/** Home-only Settings item */
export const HOME_SETTINGS_ITEM: SidebarItem = {
  href: "/dashboard/settings",
  label: "Settings",
  icon: Settings,
};

/** Home/Terminated (non-contract) */
export const HOME_SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/dashboard/home", label: "Home", icon: Home },
  { href: "/dashboard/invitations", label: "Invitations", icon: FileClock },
  { href: "/dashboard/terminated", label: "Terminated", icon: FileX },
  HOME_SETTINGS_ITEM,
];

/** Contract sections for a given trackerId */
export function contractSidebarSections(trackerId: string): SidebarSection[] {
  const base = `/dashboard/contract/${trackerId}`;
  return [
    //  First item: Home (top-level section so it renders first)
    {
      title: "Navigation",
      items: [{ href: "/dashboard/home", label: "Home", icon: Home }],
    },
    {
      title: "Application",
      items: [
        {
          href: `${base}/safety-processing`,
          label: "Safety Processing",
          icon: ClipboardList,
        },
        {
          href: `${base}/prequalification`,
          label: "Prequalification",
          icon: BadgeCheck,
        },
        {
          href: `${base}/personal-details`,
          label: "Personal Details",
          icon: IdCard,
        },
        {
          href: `${base}/employment-history`,
          label: "Employment History",
          icon: Briefcase,
        },
        {
          href: `${base}/accidents-criminal`,
          label: "Accidents / Criminal",
          icon: ShieldAlert,
        },
        {
          href: `${base}/identifications`,
          label: "Identifications",
          icon: FileBadge,
        },
        { href: `${base}/quiz-result`, label: "Quiz Result", icon: FileText },
        { href: `${base}/policies`, label: "Policies", icon: Slash },
        { href: `${base}/extras`, label: "Extras", icon: FileText },
      ],
    },
    {
      title: "Appraisal",
      items: [
        {
          href: `${base}/appraisal/drive-test`,
          label: "Drive Test",
          icon: Car,
        },
        {
          href: `${base}/appraisal/flatbed-training`,
          label: "Flatbed Training",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "PDFs",
      items: [{ href: `${base}/print`, label: "Print", icon: Printer }],
    },
    {
      title: "System",
      // 🔑 Contract-scoped alias to keep the contract sidebar active
      items: [{ href: `${base}/settings`, label: "Settings", icon: Settings }],
    },
  ];
}
