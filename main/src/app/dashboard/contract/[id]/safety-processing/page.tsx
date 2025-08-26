/**
 * Safety Processing — starter page
 * This is the first view when opening a contract.
 * We'll flesh out actions/sections incrementally next.
 */
export const metadata = {
  title: "DriveDock Admin — Safety Processing",
};

export default function SafetyProcessingPage({
  params,
}: {
  params: { id: string };
}) {
  const trackerId = params.id;

  return (
    <div>
      <h1
        className="text-lg font-semibold"
        style={{ color: "var(--color-on-surface)" }}
      >
        Safety Processing
      </h1>
      <p
        className="text-sm"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        Contract ID: <span className="tabular-nums">{trackerId}</span>
      </p>
    </div>
  );
}
