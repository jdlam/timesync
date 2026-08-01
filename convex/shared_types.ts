import type { Doc } from "./_generated/dataModel";

/**
 * Event document with sensitive fields (adminToken, notificationToken,
 * password) stripped. Used for public-facing queries and component props.
 */
export type PublicEvent = Omit<
	Doc<"events">,
	"adminToken" | "notificationToken" | "password"
>;

/**
 * Response document with sensitive fields (editToken) stripped.
 * Used for public-facing queries and component props.
 */
export type PublicResponse = Omit<Doc<"responses">, "editToken">;
