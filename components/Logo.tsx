// Inline cat wordmark. The cat uses currentColor, so it adapts to its
// surroundings (white on the orange navbar, white on the dark footer).
export default function Logo({
  className = '',
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" aria-hidden="true">
        <path d="M5 3 L9 8 Q12 7 15 8 L19 3 V10 A7 7 0 1 1 5 10 Z" fill="currentColor" />
        <circle cx="10" cy="11.5" r="1.15" fill="#f97316" />
        <circle cx="14" cy="11.5" r="1.15" fill="#f97316" />
      </svg>
      {showText && <span className="font-heading font-extrabold tracking-tight">StreetCats</span>}
    </span>
  )
}
