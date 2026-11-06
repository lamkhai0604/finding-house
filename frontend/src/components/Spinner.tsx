/** A small spinning ring. Decorative: the surrounding element announces the busy state. */
export function Spinner({ size = "1em" }: { size?: string }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
