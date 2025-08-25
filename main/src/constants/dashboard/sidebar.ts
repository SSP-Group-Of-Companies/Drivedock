/**
 * Sidebar configuration (no JSX, just data).
 * AdminSidebar consumes this and renders appropriate links.
 */

import {
  Home,
  FileX,
  ClipboardList,
  IdCard,
  Briefcase,
  ShieldAlert,
  FileBadge,
  FileText,
  Slash,
  BadgeCheck,
  Printer,
  Car,
  Settings,
} from "lucide-react";
import type { ElementType } from "react";

export type SidebarItem = {
  href: string;
  label: string;
  icon: ElementType;
};

export type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

/** Home/Terminated items (no trackerId needed) */
export const HOME_SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/dashboard/home", label: "Home", icon: Home },
  { href: "/dashboard/terminated", label: "Terminated", icon: FileX },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/** Returns Contract sections for a given trackerId */
export function contractSidebarSections(trackerId: string): SidebarSection[] {
  const base = `/dashboard/contract/${trackerId}`;
  return [
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
      title: "Drive Test",
      items: [
        { href: `${base}/drive-test/appraisal`, label: "Appraisal", icon: Car },
        {
          href: `${base}/drive-test/yard-training`,
          label: "Yard Training",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "PDFs",
      items: [{ href: `${base}/print`, label: "Print", icon: Printer }],
    },
  ];
}
