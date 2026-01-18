export function getErrorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}
	return "Validation error";
}
