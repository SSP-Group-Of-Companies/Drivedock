/**
 * Admin Dashboard — Homepage (server entry)
 * ----------------------------------------
 * This page is intentionally a thin server component to keep routing simple.
 * All interactive logic (data fetching, URL state, UI) lives in the client composer.
 */
import HomeClient from "./HomeClient";

export const metadata = {
  title: "DriveDock Admin — Dashboard",
};

export default function DashboardHomePage() {
  return <HomeClient />;
}
