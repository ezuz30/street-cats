import { getBadgeTier } from '@/lib/database.types'

const tierConfig = {
  'Newcomer':     { emoji: '🐾', color: 'bg-gray-100 text-gray-700' },
  'Scout':        { emoji: '🔍', color: 'bg-orange-100 text-orange-700' },
  'Silver Scout': { emoji: '⭐', color: 'bg-slate-100 text-slate-700' },
  'Gold Scout':   { emoji: '🏆', color: 'bg-yellow-100 text-yellow-700' },
}

export default function ScoutBadge({ score }: { score: number }) {
  const tier = getBadgeTier(score)
  const { emoji, color } = tierConfig[tier]
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {emoji} {tier}
    </span>
  )
}
