import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { HeatmapSlotData } from '@/lib/heatmap-utils'

interface HeatmapCellProps {
  timestamp: string
  displayTime: string
  data: HeatmapSlotData
  bgColor: string
  totalRespondents: number
}

export function HeatmapCell({
  timestamp,
  displayTime,
  data,
  bgColor,
  totalRespondents,
}: HeatmapCellProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-12 w-full rounded transition-all hover:ring-2 hover:ring-cyan-500 border border-border cursor-pointer"
          style={{ backgroundColor: bgColor }}
          aria-label={`${displayTime}: ${data.count} of ${totalRespondents} available`}
        >
          {data.count > 0 && (
            <span className="text-white font-bold text-lg drop-shadow-md">{data.count}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-card border-border text-card-foreground w-auto max-w-xs">
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-lg">
              {data.count} of {totalRespondents} available
            </p>
            <p className="text-muted-foreground text-sm">
              {Math.round(data.percentage)}% availability
            </p>
          </div>

          {data.respondents.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Available:</p>
              <ul className="space-y-1">
                {data.respondents.map((name) => (
                  <li key={name} className="text-sm text-cyan-400">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.respondents.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No one available</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
