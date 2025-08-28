"use client";

type Props = { driverName: string; driverLicense: string };

export default function OnRoadHeader({ driverName, driverLicense }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-gray-500">Driver Name</div>
        <div className="mt-1 text-sm font-semibold text-gray-900">{driverName || "—"}</div>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-gray-500">Driver License #</div>
        <div className="mt-1 text-sm font-semibold text-gray-900">{driverLicense || "—"}</div>
      </div>
    </div>
  );
}
