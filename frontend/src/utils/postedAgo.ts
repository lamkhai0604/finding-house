const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** T-212: "Today", "Yesterday", "3 days ago", or a date for anything older than four weeks. */
export function formatPostedAgo(createdAt: string, now = Date.now()): string {
  const posted = Date.parse(createdAt);
  if (!Number.isFinite(posted)) return "";
  const days = Math.max(0, Math.floor((now - posted) / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 28) return `${days} days ago`;
  return dateFormat.format(posted);
}
