/** The Atlas logo — topographic contour rings (a map / island). Uses currentColor,
 *  so it takes the color of whatever it sits in (e.g. the paper color inside the
 *  ink-colored header square). */
export function AtlasMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="11.5" cy="10.3" r="4.8" />
      <circle cx="11" cy="8.7" r="1.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
