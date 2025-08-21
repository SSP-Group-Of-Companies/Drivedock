"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/app/providers/authProvider";
import { NEXT_PUBLIC_PORTAL_BASE_URL } from "@/config/env";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileDropdown() {
  const user = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Build logout URL -> /api/auth/logout (Portal route)
  const base = NEXT_PUBLIC_PORTAL_BASE_URL || "";
  const logoutHref = base ? new URL("/api/auth/logout", base).toString() : "/api/auth/logout";

  const userName = user?.name || "User";

  if (!user) return null;

  return (
    <div className="ml-auto flex items-center gap-2 relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 focus:outline-none" aria-haspopup="menu" aria-expanded={open}>
        <ProfileAvatar user={user} size={32} />
        <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-700">{userName}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 mt-1 w-40 bg-white rounded-md shadow-md py-2 z-50" role="menu">
          <a href={logoutHref} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition" role="menuitem" onClick={() => setOpen(false)}>
            Logout
          </a>
        </div>
      )}
    </div>
  );
}
