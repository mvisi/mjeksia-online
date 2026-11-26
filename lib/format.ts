const pad = (n: number) => n.toString().padStart(2, "0");

/** Countdown format: 04:05, or 1:04:05 past an hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Human duration: "45s", "12 min", "3 orë 5 min". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes > 0 ? `${hours} orë ${minutes} min` : `${hours} orë`;
}

const dateFormatter = new Intl.DateTimeFormat("sq-AL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("sq-AL", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

/** "1 pyetje" / "5 pyetje" — Albanian nouns used here do not inflect, but
 *  keeping this in one place makes future copy changes trivial. */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
