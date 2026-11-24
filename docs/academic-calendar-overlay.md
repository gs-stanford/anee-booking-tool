# Academic calendar labels

The homepage shows university holidays and academic breaks as all-day reference labels. These are static display data, not database reservations or instrument outages. They do not block booking, remove safety slots, cancel Tea Time, or enter personal Outlook sync.

Sources verified November 23, 2026:

- [Stanford university holidays](https://cardinalatwork.stanford.edu/benefits-rewards/time-leaves/university-holiday-schedule): published 2026 and 2027 dates, including observed dates. The 2027–28 winter closure is unannounced and is not invented here. No 2028 staff holiday schedule is published on that page yet.
- [2026–27 academic calendar](https://studentservices.stanford.edu/calendar-events/academic-calendars/stanford-academic-calendar-2026-2027): Thanksgiving recess, Democracy Day, winter academic break boundaries. Academic breaks are distinct from staff closures.
- [Registrar projection, September 2024](https://drive.google.com/file/d/1WEJDxXgxD8NjmKoqg9olvdsTFLCcFwk_/view), linked from [future calendars](https://studentservices.stanford.edu/calendar-events/academic-calendars/future-academic-calendars): spring-break weeks for 2027 and 2028, Thanksgiving recesses for 2027 and 2028, and later winter breaks inferred between exam end and the next quarter's class start. Dates from Autumn 2027 onward are visibly marked projected.

Coverage follows the existing homepage launch in Winter 2027. The data also includes published 2026 holidays, without opening past booking dates. 2028 university holidays and the 2027–28 staff winter closure must be added when Stanford publishes them. Update `src/lib/academic-calendar.ts` after checking the owning source; do not extrapolate staff closures from academic breaks. No background feed or automatic refresh is configured.
