// Common timezones - will be sorted by UTC offset
const TIMEZONE_LIST = [
	"Pacific/Midway",
	"Pacific/Honolulu",
	"America/Anchorage",
	"America/Los_Angeles",
	"America/Tijuana",
	"America/Phoenix",
	"America/Denver",
	"America/Mazatlan",
	"America/Chicago",
	"America/Mexico_City",
	"America/Regina",
	"America/Guatemala",
	"America/New_York",
	"America/Indiana/Indianapolis",
	"America/Bogota",
	"America/Lima",
	"America/Halifax",
	"America/Caracas",
	"America/La_Paz",
	"America/Santiago",
	"America/St_Johns",
	"America/Sao_Paulo",
	"America/Argentina/Buenos_Aires",
	"America/Godthab",
	"Atlantic/South_Georgia",
	"Atlantic/Azores",
	"Atlantic/Cape_Verde",
	"Europe/London",
	"Europe/Dublin",
	"Europe/Lisbon",
	"Africa/Casablanca",
	"Africa/Monrovia",
	"Europe/Paris",
	"Europe/Berlin",
	"Europe/Rome",
	"Europe/Madrid",
	"Europe/Amsterdam",
	"Europe/Brussels",
	"Europe/Vienna",
	"Europe/Prague",
	"Europe/Warsaw",
	"Europe/Stockholm",
	"Europe/Oslo",
	"Europe/Copenhagen",
	"Europe/Helsinki",
	"Europe/Zurich",
	"Africa/Lagos",
	"Africa/Algiers",
	"Europe/Athens",
	"Europe/Bucharest",
	"Europe/Istanbul",
	"Europe/Kyiv",
	"Africa/Cairo",
	"Africa/Johannesburg",
	"Asia/Jerusalem",
	"Asia/Beirut",
	"Europe/Moscow",
	"Asia/Kuwait",
	"Asia/Riyadh",
	"Asia/Baghdad",
	"Africa/Nairobi",
	"Asia/Tehran",
	"Asia/Dubai",
	"Asia/Muscat",
	"Asia/Baku",
	"Asia/Tbilisi",
	"Asia/Yerevan",
	"Asia/Kabul",
	"Asia/Karachi",
	"Asia/Tashkent",
	"Asia/Kolkata",
	"Asia/Mumbai",
	"Asia/Delhi",
	"Asia/Colombo",
	"Asia/Kathmandu",
	"Asia/Dhaka",
	"Asia/Almaty",
	"Asia/Yangon",
	"Asia/Bangkok",
	"Asia/Jakarta",
	"Asia/Ho_Chi_Minh",
	"Asia/Shanghai",
	"Asia/Hong_Kong",
	"Asia/Taipei",
	"Asia/Singapore",
	"Asia/Kuala_Lumpur",
	"Asia/Manila",
	"Australia/Perth",
	"Asia/Tokyo",
	"Asia/Seoul",
	"Australia/Adelaide",
	"Australia/Darwin",
	"Australia/Brisbane",
	"Australia/Sydney",
	"Australia/Melbourne",
	"Australia/Hobart",
	"Pacific/Guam",
	"Pacific/Port_Moresby",
	"Pacific/Noumea",
	"Pacific/Fiji",
	"Pacific/Auckland",
	"Pacific/Tongatapu",
	"Pacific/Apia",
] as const;

export type Timezone = (typeof TIMEZONE_LIST)[number];

// Get UTC offset in minutes for a timezone
function getTimezoneOffset(timezone: string): number {
	try {
		const now = new Date();
		const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
		const tzDate = new Date(
			now.toLocaleString("en-US", { timeZone: timezone }),
		);
		return (tzDate.getTime() - utcDate.getTime()) / 60000;
	} catch {
		return 0;
	}
}

// Format offset as GMT+X or GMT-X
function formatOffset(offsetMinutes: number): string {
	if (offsetMinutes === 0) return "GMT+0";

	const hours = Math.floor(Math.abs(offsetMinutes) / 60);
	const minutes = Math.abs(offsetMinutes) % 60;
	const sign = offsetMinutes >= 0 ? "+" : "-";

	if (minutes === 0) {
		return `GMT${sign}${hours}`;
	}
	return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

// Sort timezones by UTC offset
const sortedTimezones = [...TIMEZONE_LIST].sort((a, b) => {
	const offsetA = getTimezoneOffset(a);
	const offsetB = getTimezoneOffset(b);
	return offsetA - offsetB;
});

export const TIMEZONES = sortedTimezones;

// Get display name for timezone (e.g., "America/New_York" -> "(GMT-5) New York")
export function getTimezoneDisplay(timezone: string): string {
	// Remove region prefix and convert underscores to spaces
	const cityName = timezone.split("/").pop()?.replace(/_/g, " ") || timezone;

	try {
		const offset = getTimezoneOffset(timezone);
		const offsetStr = formatOffset(offset);
		return `(${offsetStr}) ${cityName}`;
	} catch {
		return cityName;
	}
}

// Search timezones by query
export function searchTimezones(query: string): string[] {
	const lowerQuery = query.toLowerCase();
	return TIMEZONES.filter((tz) => {
		const display = getTimezoneDisplay(tz).toLowerCase();
		const tzLower = tz.toLowerCase();
		return display.includes(lowerQuery) || tzLower.includes(lowerQuery);
	});
}
