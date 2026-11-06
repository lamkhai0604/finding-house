import { describe, expect, it } from "vitest";
import { formatPostedAgo } from "./postedAgo";

describe("formatPostedAgo (T-212)", () => {
  const now = Date.parse("2026-11-10T12:00:00Z");

  it("counts whole days back from now", () => {
    expect(formatPostedAgo("2026-11-10T08:00:00Z", now)).toBe("Today");
    expect(formatPostedAgo("2026-11-09T08:00:00Z", now)).toBe("Yesterday");
    expect(formatPostedAgo("2026-11-07T08:00:00Z", now)).toBe("3 days ago");
  });

  it("shows a date for older rooms and nothing for a bad timestamp", () => {
    expect(formatPostedAgo("2026-09-01T08:00:00Z", now)).toBe("Sep 1, 2026");
    expect(formatPostedAgo("not a date", now)).toBe("");
  });
});
