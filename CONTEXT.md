# TimeSync

Group scheduling without accounts: a creator sets up an event, shares a link, responders paint availability, and the heatmap shows the best time.

## Language

### Roles

**Creator**:
The person who sets up an event and receives the share and admin links.
_Avoid_: Owner, organizer, host

**Responder**:
A person who submits availability for an event via the share link.
_Avoid_: Participant, attendee, invitee, user

**Admin**:
The creator acting on an event through the admin link: reading the heatmap and picking a time.
_Avoid_: Super admin (that is a different role: the operator of the TimeSync service itself)

### Assistant

**Assistant**:
The conversational surface inside TimeSync that turns a creator's natural-language request into an event.
_Avoid_: AI, bot, copilot, agent, chat

**Draft**:
An event the Assistant has assembled in the conversation that is not yet saved. It becomes an event only when the creator confirms.
_Avoid_: Preview, pending event, proposal

**Request**:
The creator's free-text input to the Assistant.
_Avoid_: Prompt, query, message

**Turn**:
One Request and the Assistant's reply to it. A conversation is a sequence of Turns against one Draft.
_Avoid_: Message, step, exchange

**Overflow**:
Anything in a Request the Draft cannot express, such as invitees, recurrence, or location. Recorded for product learning, never acted on.
_Avoid_: Unmet intent, leftover, extra

**Pinned field**:
A Draft field the creator has edited by hand. A later Turn changes it only when the Request names it explicitly, and the Assistant says so.
_Avoid_: Locked, manual, override
