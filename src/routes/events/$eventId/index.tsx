import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { db, events, responses } from '@/db'
import { eq, sql } from 'drizzle-orm'
import { generateEditToken } from '@/lib/token-utils'
import { type SubmitResponseInput } from '@/lib/validation-schemas'
import { EventHeader } from '@/components/EventHeader'
import { AvailabilityGrid } from '@/components/availability-grid/AvailabilityGrid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LinkCopy } from '@/components/LinkCopy'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { NotFound } from '@/components/NotFound'

export const Route = createFileRoute('/events/$eventId/')({
  component: EventResponse,
  loader: async ({ params }) => {
    try {
      const result = await getEventById({ data: params.eventId })
      return { event: result.event, responseCount: result.responseCount, error: null }
    } catch (error) {
      return { event: null, responseCount: 0, error: error instanceof Error ? error.message : 'Event not found' }
    }
  },
})

// Server function to get event by ID with response count
const getEventById = createServerFn({ method: 'GET' })
  .inputValidator((data: string) => data)
  .handler(async ({ data: eventId }) => {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) {
      throw new Error('Event not found')
    }

    if (!event.isActive) {
      throw new Error('This event is no longer accepting responses')
    }

    // Get current response count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(responses)
      .where(eq(responses.eventId, eventId))

    return {
      event,
      responseCount: countResult.count,
    }
  })

// Server function to submit response
const submitResponse = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: SubmitResponseInput & { eventId: string }) => data
  )
  .handler(async ({ data }) => {
    // Check max respondents limit
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(responses)
      .where(eq(responses.eventId, data.eventId))

    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1)

    if (!event) {
      throw new Error('Event not found')
    }

    if (countResult.count >= event.maxRespondents) {
      throw new Error('Maximum number of respondents reached')
    }

    // Generate edit token
    const editToken = generateEditToken()

    // Insert response
    const [response] = await db
      .insert(responses)
      .values({
        eventId: data.eventId,
        respondentName: data.respondentName,
        respondentComment: data.respondentComment || null,
        selectedSlots: data.selectedSlots,
        editToken,
      })
      .returning()

    return {
      responseId: response.id,
      editToken: response.editToken,
    }
  })

function EventResponse() {
  const { event, responseCount, error: loaderError } = Route.useLoaderData()

  if (loaderError || !event) {
    return <NotFound title="Event Not Found" message={loaderError || "This event doesn't exist or is no longer accepting responses."} />
  }

  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedResponse, setSubmittedResponse] = useState<{
    responseId: string
    editToken: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (selectedSlots.length === 0) {
      setError('Please select at least one time slot')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitResponse({
        data: {
          eventId: event.id,
          respondentName: name.trim(),
          respondentComment: comment.trim() || undefined,
          selectedSlots,
        },
      })

      setSubmittedResponse(result)
      toast.success('Availability submitted successfully!')
    } catch (err) {
      console.error('Failed to submit response:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit response'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate edit URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const editUrl = submittedResponse
    ? `${baseUrl}/events/${event.id}/edit/${submittedResponse.editToken}`
    : ''

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <EventHeader event={event} responseCount={responseCount} />

        <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Select Your Availability</h2>
          <p className="text-muted-foreground mb-6">
            Click or drag to select the times when you're available.
          </p>

          <AvailabilityGrid
            event={event}
            initialSelections={[]}
            onChange={setSelectedSlots}
            mode="select"
          />

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Your Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-background border-border text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-foreground">
                Comment (Optional)
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="bg-background border-border text-foreground"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || selectedSlots.length === 0}
                className="px-8"
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? 'Submitting...' : 'Submit Availability'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog
        open={submittedResponse !== null}
        onOpenChange={() => setSubmittedResponse(null)}
      >
        <DialogContent className="bg-card border-border text-card-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Thank You!</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your availability has been submitted successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <LinkCopy url={editUrl} label="Edit Link (Save this to update your response)" />

            <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
              <p className="text-sm text-cyan-400">
                <strong>Save this link!</strong> You can use it to edit your availability
                later if your schedule changes.
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={() => setSubmittedResponse(null)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
