import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LinkCopyProps {
  url: string
  label: string
  className?: string
}

export function LinkCopy({ url, label, className }: LinkCopyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          value={url}
          readOnly
          className="flex-1 bg-background border-border text-foreground font-mono text-sm"
          onClick={(e) => e.currentTarget.select()}
        />
        <Button
          onClick={handleCopy}
          variant="outline"
          className={cn(
            'min-w-[100px] transition-colors',
            copied && 'bg-green-600 border-green-600 text-white hover:bg-green-700'
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
