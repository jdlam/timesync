import { cn } from '@/lib/utils'
import type { HeatmapSlotData } from '@/lib/heatmap-utils'

interface GridCellProps {
  timestamp: string
  displayTime: string
  isSelected: boolean
  mode: 'select' | 'view'
  onInteraction: (timestamp: string, action: 'toggle' | 'select' | 'deselect') => void
  heatmapData?: HeatmapSlotData
  heatmapColor?: string
  isDragging?: boolean
}

export function GridCell({
  timestamp,
  displayTime,
  isSelected,
  mode,
  onInteraction,
  heatmapData,
  heatmapColor,
  isDragging,
}: GridCellProps) {
  const handleClick = () => {
    if (mode === 'select') {
      onInteraction(timestamp, 'toggle')
    }
  }

  const handleMouseDown = () => {
    if (mode === 'select') {
      // Select the first cell when mouse is pressed
      onInteraction(timestamp, 'toggle')
    }
  }

  const handleMouseEnter = () => {
    if (mode === 'select' && isDragging) {
      onInteraction(timestamp, 'select')
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mode === 'select') {
      e.preventDefault()
      onInteraction(timestamp, 'toggle')
    }
  }

  // View mode (heatmap display)
  if (mode === 'view' && heatmapData) {
    return (
      <div
        className={cn(
          'relative h-12 border border-border rounded flex items-center justify-center',
          'text-sm font-medium transition-all cursor-pointer',
          'hover:ring-2 hover:ring-cyan-500'
        )}
        style={{ backgroundColor: heatmapColor }}
        title={`${heatmapData.count} available (${Math.round(heatmapData.percentage)}%)`}
      >
        {heatmapData.count > 0 && (
          <span className="text-white font-bold text-lg">{heatmapData.count}</span>
        )}
      </div>
    )
  }

  // Select mode (user interaction)
  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      className={cn(
        'h-12 w-full border rounded transition-all',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500',
        'hover:border-cyan-500',
        isSelected
          ? 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-700'
          : 'bg-muted border-border text-muted-foreground hover:bg-accent',
        'active:scale-95'
      )}
      aria-label={`${displayTime} - ${isSelected ? 'Selected' : 'Not selected'}`}
      aria-pressed={isSelected}
    >
      <span className="text-sm font-medium">{displayTime}</span>
    </button>
  )
}
