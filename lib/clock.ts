/**
 * "Today" in Guatemala, as `YYYY-MM-DD`.
 *
 * Every date the app records — a payment, a daily close, a credit's start — is
 * a calendar date in the operators' own day, with no time attached. Taking it
 * from the server's zone would roll the books over at the wrong hour for a
 * container running in UTC, which is six hours ahead of the office.
 *
 * `lib/mock-data.ts` pinned a fixed `AS_OF` so its figures stayed stable; real
 * data measures against the real day.
 */
export const TIME_ZONE = 'America/Guatemala'

export function today(now = new Date()): string {
  // `en-CA` is the short way to a `YYYY-MM-DD` from `Intl`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** The `YYYY-MM` this date falls in. */
export function monthOf(iso: string) {
  return iso.slice(0, 7)
}

/** The last `count` months ending with the one containing `iso`, oldest first. */
export function recentMonths(count: number, iso = today()): string[] {
  const [year, month] = iso.split('-').map(Number)
  const months: string[] = []

  for (let back = count - 1; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - back, 1))
    months.push(date.toISOString().slice(0, 7))
  }

  return months
}
