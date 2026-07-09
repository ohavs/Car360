/** Default hero illustration for cars without a photo — clean side-view
 *  silhouette in the current ink color. */
export default function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 200" className={className} aria-hidden="true">
      <g fill="currentColor">
        <path d="M78 138c-14 0-22-6-24-16l-4-18c-1-6 2-12 8-14l38-13c10-4 19-9 27-16l22-19c10-9 24-14 38-14h96c13 0 26 4 36 12l40 30 74 14c12 2 21 12 21 24v14c0 9-7 16-16 16h-14a38 38 0 0 0-74-2H186a38 38 0 0 0-74-2H78Z" />
        <circle cx="150" cy="146" r="28" />
        <circle cx="150" cy="146" r="12" fill="var(--c-canvas)" />
        <circle cx="396" cy="146" r="28" />
        <circle cx="396" cy="146" r="12" fill="var(--c-canvas)" />
        <path
          d="M188 60c6-6 15-16 26-16h84c10 0 20 3 28 9l30 23H176l12-16Z"
          fill="var(--c-canvas)"
          opacity="0.9"
        />
      </g>
    </svg>
  )
}
