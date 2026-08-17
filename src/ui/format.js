/**
 * Formatting helpers shared by the server and, via inlining, the browser.
 *
 * These are real exports so they can be unit tested directly; the page shell
 * serialises them into the client bundle with Function.prototype.toString().
 */

/**
 * Renders a duration as "Xh Ym".
 *
 * The rounding happens on the total minutes BEFORE splitting into hours and
 * minutes. Doing it the other way round — taking the whole hours, then
 * rounding the leftover fraction — is what produced the old tracker's "2h 60m"
 * for 2.999 hours: the fraction rounds to a full 60 with no carry into the
 * hour. Rounding first makes the carry automatic.
 */
export function formatRuntime(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined) return "—";
  const n = Number(totalMinutes);
  if (!Number.isFinite(n)) return "—";

  const mins = Math.max(0, Math.round(n));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return hours + "h " + rem + "m";
}

/** Same contract, for callers holding hours rather than minutes. */
export function formatHours(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n)) return "—";
  return formatRuntime(n * 60);
}

/**
 * True only for a real calendar date in YYYY-MM-DD form.
 *
 * The catalogue deliberately keeps partial placeholders such as "2027-07-00"
 * (year and month known, day unannounced). Those sort correctly as text but
 * are not real dates, so anything doing date arithmetic — the countdown, the
 * "upcoming confirmed releases" list — must exclude them rather than let
 * Date.parse silently reinterpret them.
 */
export function isRealDate(value) {
  if (typeof value !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo === 0 || d === 0) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
  );
}

/** Whole days from today (UTC) to an ISO date; negative once past. */
export function daysUntil(isoDate, now) {
  if (!isRealDate(isoDate)) return null;
  const target = Date.parse(isoDate + "T00:00:00Z");
  const today = now === undefined ? Date.now() : now;
  const startOfToday = Math.floor(today / 86400000) * 86400000;
  return Math.round((target - startOfToday) / 86400000);
}
