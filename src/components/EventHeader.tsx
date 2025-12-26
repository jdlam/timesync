import type { Event } from '@/db/schema'
import { Clock, Calendar, MapPin } from 'lucide-react'

interface EventHeaderProps {
  event: Event
}

export function EventHeader({ event }: EventHeaderProps) {
  return (
    <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
      <h1 className="text-3xl font-bold text-foreground mb-2">{event.title}</h1>

      {event.description && (
        <p className="text-muted-foreground text-lg mb-4">{event.description}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{event.slotDuration} minute slots</span>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>
            {event.dates.length} {event.dates.length === 1 ? 'day' : 'days'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{event.timeZone}</span>
        </div>
      </div>
    </div>
  )
}
