"use client";

import OnRoadSectionCard from "./OnRoadSectionCard";

export default function OnRoadSectionsGrid({ isLocked }: { isLocked: boolean }) {
  return (
    <div className="grid gap-5">
      <OnRoadSectionCard sectionKey="placingVehicleInMotion" title="Placing Vehicle In-Motion" disabled={isLocked} />
      <OnRoadSectionCard sectionKey="highwayDriving" title="Highway Driving" disabled={isLocked} />
      <OnRoadSectionCard sectionKey="rightLeftTurns" title="Right / Left Turns" disabled={isLocked} />
      <OnRoadSectionCard sectionKey="defensiveDriving" title="Defensive Driving" disabled={isLocked} />
      <OnRoadSectionCard sectionKey="gps" title="GPS" disabled={isLocked} />
      <OnRoadSectionCard sectionKey="operatingInTraffic" title="Operating In Traffic" disabled={isLocked} />
    </div>
  );
}
