import type { CatStatus } from '@/lib/database.types'

const config: Record<CatStatus, { label: string; color: string }> = {
  spotted: { label: 'Spotted', color: 'bg-yellow-100 text-yellow-800' },
  needs_foster: { label: 'Needs Foster', color: 'bg-blue-100 text-blue-800' },
  adopted: { label: 'Adopted', color: 'bg-green-100 text-green-800' },
}

export default function StatusBadge({ status }: { status: CatStatus }) {
  const { label, color } = config[status]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}
