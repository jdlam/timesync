import { describe, expect, it, vi } from "vitest";
import { buildDiscordEmbed } from "./discord";
import { scheduleDiscordNotification } from "./http";

describe("buildDiscordEmbed", () => {
	it("should build a subscribe embed with teal color", () => {
		const result = buildDiscordEmbed({
			event: "subscribe",
			email: "alice@example.com",
			userName: "Alice",
		});

		expect(result.embeds).toHaveLength(1);
		const embed = result.embeds[0];
		expect(embed.title).toBe("New Premium Subscription");
		expect(embed.description).toContain("Alice");
		expect(embed.description).toContain("subscribed");
		expect(embed.color).toBe(0x0d9488);
		expect(embed.fields).toEqual([
			{ name: "Email", value: "alice@example.com", inline: true },
			{ name: "Event", value: "Subscribe", inline: true },
		]);
		expect(embed.timestamp).toBeDefined();
	});

	it("should build an unsubscribe embed with red color", () => {
		const result = buildDiscordEmbed({
			event: "unsubscribe",
			email: "bob@example.com",
			userName: "Bob",
		});

		expect(result.embeds).toHaveLength(1);
		const embed = result.embeds[0];
		expect(embed.title).toBe("Premium Subscription Cancelled");
		expect(embed.description).toContain("Bob");
		expect(embed.description).toContain("cancelled");
		expect(embed.color).toBe(0xef4444);
		expect(embed.fields).toEqual([
			{ name: "Email", value: "bob@example.com", inline: true },
			{ name: "Event", value: "Unsubscribe", inline: true },
		]);
	});
});

describe("scheduleDiscordNotification", () => {
	it("should look up user and call runAction with correct args", async () => {
		const ctx = {
			runQuery: vi.fn().mockResolvedValue({ email: "alice@example.com", name: "Alice" }),
			runAction: vi.fn().mockResolvedValue(undefined),
		};

		await scheduleDiscordNotification(ctx, "subscribe", "cus_123");

		expect(ctx.runQuery).toHaveBeenCalledWith(expect.anything(), {
			stripeCustomerId: "cus_123",
		});
		expect(ctx.runAction).toHaveBeenCalledWith(expect.anything(), {
			event: "subscribe",
			email: "alice@example.com",
			userName: "Alice",
		});
	});

	it("should skip notification when user is not found", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const ctx = {
			runQuery: vi.fn().mockResolvedValue(null),
			runAction: vi.fn(),
		};

		await scheduleDiscordNotification(ctx, "unsubscribe", "cus_unknown");

		expect(ctx.runAction).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Could not find user"),
		);
		warnSpy.mockRestore();
	});

	it("should not throw when runAction fails", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ctx = {
			runQuery: vi.fn().mockResolvedValue({ email: "a@b.com", name: "A" }),
			runAction: vi.fn().mockRejectedValue(new Error("network error")),
		};

		await expect(
			scheduleDiscordNotification(ctx, "subscribe", "cus_123"),
		).resolves.toBeUndefined();

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Failed to schedule notification"),
			expect.any(Error),
		);
		errorSpy.mockRestore();
	});

	it("should not throw when runQuery fails", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const ctx = {
			runQuery: vi.fn().mockRejectedValue(new Error("db error")),
			runAction: vi.fn(),
		};

		await expect(
			scheduleDiscordNotification(ctx, "subscribe", "cus_123"),
		).resolves.toBeUndefined();

		expect(ctx.runAction).not.toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});
});
