import { afterEach, describe, expect, it, vi } from "vitest";
import {
	clearStoredResponse,
	getStoredResponse,
	setStoredResponse,
} from "./stored-response";

const EVENT_ID = "event-1";
const OTHER_EVENT_ID = "event-2";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("stored-response", () => {
	it("returns the response this browser submitted so a repeat visit edits it instead of creating a duplicate", () => {
		setStoredResponse(EVENT_ID, {
			responseId: "resp-1",
			editToken: "token-1",
		});

		expect(getStoredResponse(EVENT_ID)).toEqual({
			responseId: "resp-1",
			editToken: "token-1",
		});
	});

	it("returns null when this browser has not responded, so the submit form is shown", () => {
		expect(getStoredResponse(EVENT_ID)).toBeNull();
	});

	it("scopes the memory per event so responding to one event does not hijack another", () => {
		setStoredResponse(EVENT_ID, {
			responseId: "resp-1",
			editToken: "token-1",
		});

		expect(getStoredResponse(OTHER_EVENT_ID)).toBeNull();
	});

	it("overwrites the stored response when the same browser responds again", () => {
		setStoredResponse(EVENT_ID, {
			responseId: "resp-1",
			editToken: "token-1",
		});
		setStoredResponse(EVENT_ID, {
			responseId: "resp-2",
			editToken: "token-2",
		});

		expect(getStoredResponse(EVENT_ID)).toEqual({
			responseId: "resp-2",
			editToken: "token-2",
		});
	});

	it("forgets the response on clear, so a shared browser can start a fresh submission", () => {
		setStoredResponse(EVENT_ID, {
			responseId: "resp-1",
			editToken: "token-1",
		});

		clearStoredResponse(EVENT_ID);

		expect(getStoredResponse(EVENT_ID)).toBeNull();
	});

	it("ignores corrupted storage rather than breaking the event page", () => {
		localStorage.setItem(`response-${EVENT_ID}`, "not json");

		expect(getStoredResponse(EVENT_ID)).toBeNull();
	});

	it.each([
		["missing editToken", { responseId: "resp-1" }],
		["missing responseId", { editToken: "token-1" }],
		["empty editToken", { responseId: "resp-1", editToken: "" }],
		["wrong types", { responseId: 1, editToken: 2 }],
		["not an object", "resp-1"],
		["null", null],
	])(
		"ignores stored data with %s, since an unusable token cannot load a response",
		(_label, value) => {
			localStorage.setItem(`response-${EVENT_ID}`, JSON.stringify(value));

			expect(getStoredResponse(EVENT_ID)).toBeNull();
		},
	);

	it("treats unavailable storage as no prior response instead of throwing", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError: storage is disabled");
		});

		expect(() => getStoredResponse(EVENT_ID)).not.toThrow();
		expect(getStoredResponse(EVENT_ID)).toBeNull();
	});

	it("does not throw when storage rejects a write, since the response is already saved server-side", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});

		expect(() =>
			setStoredResponse(EVENT_ID, {
				responseId: "resp-1",
				editToken: "token-1",
			}),
		).not.toThrow();
	});
});
