"use client";

import PreTripSectionCard from "./PreTripSectionCard";

export default function PreTripSectionsGrid({ isLocked }: { isLocked: boolean }) {
  return (
    <div className="grid gap-5">
      <PreTripSectionCard sectionKey="underHood" title="Under Hood Inspection" disabled={isLocked} />
      <PreTripSectionCard sectionKey="outside" title="Out-Side Inspection" disabled={isLocked} />
      <PreTripSectionCard sectionKey="uncoupling" title="Uncoupling" disabled={isLocked} />
      <PreTripSectionCard sectionKey="coupling" title="Coupling" disabled={isLocked} />
      <PreTripSectionCard sectionKey="airSystem" title="Air – System Inspection" disabled={isLocked} />
      <PreTripSectionCard sectionKey="inCab" title="In-Cab Inspection" disabled={isLocked} />
      <PreTripSectionCard sectionKey="backingUp" title="Backing Up" disabled={isLocked} />
    </div>
  );
}
