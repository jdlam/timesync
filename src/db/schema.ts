import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, varchar, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// USERS TABLE (for registered accounts)
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),

  // Subscription management
  subscriptionTier: varchar('subscription_tier', { length: 50 }).notNull().default('free'), // 'free' or 'premium'
  subscriptionId: varchar('subscription_id', { length: 255 }), // Stripe subscription ID
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}))

// ============================================
// EVENTS TABLE (scheduling events)
// ============================================
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Creator info (nullable for guest users)
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }),

  // Guest access token (unique secret URL for non-authenticated creators)
  adminToken: varchar('admin_token', { length: 255 }).notNull().unique(),

  // Event details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  timeZone: varchar('time_zone', { length: 100 }).notNull().default('America/New_York'),

  // Time slot configuration
  slotDuration: integer('slot_duration').notNull().default(30), // in minutes (15, 30, 60, or custom for premium)
  dates: jsonb('dates').notNull().$type<string[]>(), // Array of date strings ['2023-10-27', '2023-10-28']
  timeRangeStart: varchar('time_range_start', { length: 10 }).notNull(), // e.g., '09:00'
  timeRangeEnd: varchar('time_range_end', { length: 10 }).notNull(), // e.g., '17:00'

  // Premium features
  isPremium: boolean('is_premium').default(false).notNull(),
  password: varchar('password', { length: 255 }), // Password protection (premium only)
  maxRespondents: integer('max_respondents').default(20).notNull(), // 20 for free, unlimited (-1) for premium

  // Customization (premium)
  customLogo: text('custom_logo'), // URL or base64
  customColors: jsonb('custom_colors').$type<{
    primary?: string
    secondary?: string
    background?: string
  }>(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('events_creator_id_idx').on(table.creatorId),
  adminTokenIdx: index('events_admin_token_idx').on(table.adminToken),
  isActiveIdx: index('events_is_active_idx').on(table.isActive),
}))

// ============================================
// RESPONSES TABLE (availability submissions)
// ============================================
export const responses = pgTable('responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),

  // Respondent info (no auth required)
  respondentName: varchar('respondent_name', { length: 255 }).notNull(),
  respondentComment: text('respondent_comment'),

  // Availability data
  // Array of ISO timestamps: ["2023-10-27T10:00:00Z", "2023-10-27T10:30:00Z"]
  selectedSlots: jsonb('selected_slots').notNull().$type<string[]>(),

  // Edit tracking (for allowing edits from same browser/device)
  editToken: varchar('edit_token', { length: 255 }).notNull().unique(), // Allows user to edit their response

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  eventIdIdx: index('responses_event_id_idx').on(table.eventId),
  editTokenIdx: index('responses_edit_token_idx').on(table.editToken),
}))

// ============================================
// RELATIONS (for Drizzle relational queries)
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
}))

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  responses: many(responses),
}))

export const responsesRelations = relations(responses, ({ one }) => ({
  event: one(events, {
    fields: [responses.eventId],
    references: [events.id],
  }),
}))

// ============================================
// TYPE EXPORTS (for TypeScript inference)
// ============================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

export type Response = typeof responses.$inferSelect
export type NewResponse = typeof responses.$inferInsert
