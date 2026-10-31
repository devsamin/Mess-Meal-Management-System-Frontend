/** Display formatting only — never used for financial maths (that lives in the backend). */

export type Lang = "en" | "bn";
export const TIME_ZONE = "Asia/Dhaka";

const locale = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-IN");

export function toNumber(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(v: string | number | null | undefined, lang: Lang = "en", maxDecimals = 2) {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: maxDecimals }).format(toNumber(v));
}

/** ৳1,23,456.50 — BDT with South-Asian digit grouping. */
export function formatMoney(
  v: string | number | null | undefined,
  lang: Lang = "en",
  { decimals = 2, signed = false }: { decimals?: 0 | 2; signed?: boolean } = {},
) {
  const n = toNumber(v);
  const abs = new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: decimals === 0 ? 0 : Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: decimals,
  }).format(Math.abs(n));
  const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
  return `${sign}৳${abs}`;
}

/** Today's date in Dhaka as YYYY-MM-DD. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function parseISODate(iso: string) {
  return new Date(`${iso}T00:00:00+06:00`);
}

export function shiftISODate(iso: string, days: number) {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
}

export function formatDate(
  iso: string | null | undefined,
  lang: Lang = "en",
  style: "short" | "medium" | "long" | "weekday" = "medium",
) {
  if (!iso) return "—";
  const date = iso.length > 10 ? new Date(iso) : parseISODate(iso);
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "long"
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        : style === "weekday"
          ? { weekday: "short", day: "numeric", month: "short" }
          : { day: "numeric", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: TIME_ZONE }).format(date);
}

export function formatDateTime(iso: string, lang: Lang = "en") {
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function relativeTime(iso: string, lang: Lang = "en") {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso, lang, "short");
}

export function monthName(year: number, month: number, lang: Lang = "en") {
  return new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** Clamp a date into [start, end]. */
export function clampISO(iso: string, start: string, end: string) {
  return iso < start ? start : iso > end ? end : iso;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
