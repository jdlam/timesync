import { useState } from 'react'
import { Check, ChevronsUpDown, Globe } from 'lucide-react'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { cn } from '@/lib/utils'
import { TIMEZONES, getTimezoneDisplay } from '@/lib/timezones'

interface TimezoneSelectProps {
  value: string
  onChange: (timezone: string) => void
}

export function TimezoneSelect({ value, onChange }: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filter timezones based on search
  const filteredTimezones = search
    ? TIMEZONES.filter((tz) => {
        const display = getTimezoneDisplay(tz).toLowerCase()
        const searchLower = search.toLowerCase()
        return display.includes(searchLower) || tz.toLowerCase().includes(searchLower)
      })
    : TIMEZONES

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background border-border text-foreground"
        >
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{getTimezoneDisplay(value)}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-card border-border" align="start">
        <Command className="bg-card" shouldFilter={false}>
          <CommandInput
            placeholder="Search timezone..."
            className="bg-background text-foreground"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              No timezone found.
            </CommandEmpty>
            <CommandGroup>
              {filteredTimezones.map((timezone) => (
                <CommandItem
                  key={timezone}
                  value={timezone}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === timezone ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {getTimezoneDisplay(timezone)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
