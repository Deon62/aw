# Admin Dashboard — Booking Trends API

Endpoint that powers the two booking-analytics graphs on the admin dashboard.

## Endpoint

```
GET /api/v1/admin/dashboard/booking-trends
```

**Auth:** requires admin session (same as every other `/admin/dashboard/*` route).

## Query parameters

| Param  | Type | Default | Range  | Notes |
|--------|------|---------|--------|-------|
| `days` | int  | `30`    | 1–365  | History window, ending today (inclusive). UI should send `14`. |

> **Recommended UI default:** `?days=14` — fits cleanly on the chart, covers two
> full weekly cycles. Optionally expose a range picker (7 / 14 / 30 / 90).

## Response shape (200 OK)

The shape is **option 2** — an items array per graph, plus a totals block.
Both arrays are zero-padded so every day in the window is present, sorted
oldest → newest. `outcomes[i].date === trend[i].date` for every `i`, so you can
share one x-axis between the two charts if you want.

```json
{
  "days": 14,

  "outcomes": [
    {
      "date": "2026-05-08",
      "successful": 5,
      "cancelled_by_host": 1,
      "cancelled_by_client": 2
    },
    {
      "date": "2026-05-09",
      "successful": 7,
      "cancelled_by_host": 0,
      "cancelled_by_client": 1
    }
    // ... one entry per day, length === days
  ],

  "trend": [
    { "date": "2026-05-08", "bookings": 12 },
    { "date": "2026-05-09", "bookings": 8 }
    // ... one entry per day, length === days
  ],

  "totals": {
    "successful": 312,
    "cancelled_by_host": 18,
    "cancelled_by_client": 27,
    "bookings_created": 420
  },

  "generated_at": "2026-05-21T07:45:00+00:00"
}
```

### Field reference

**Top-level**

| Field          | Type              | Notes |
|----------------|-------------------|-------|
| `days`         | int               | Echoes the `days` query param actually used. |
| `outcomes`     | `OutcomePoint[]`  | Data for the 3-line graph (graph 1). |
| `trend`        | `TrendPoint[]`    | Data for the single-line booking trend (graph 2). |
| `totals`       | `Totals`          | Window-wide totals for header cards. |
| `generated_at` | ISO-8601 string   | UTC timestamp the response was built. |

**`OutcomePoint`** (one per day, graph 1)

| Field                 | Type   | Notes |
|-----------------------|--------|-------|
| `date`                | string | `YYYY-MM-DD`, UTC. |
| `successful`          | int    | Bookings that reached `COMPLETED` on this day. |
| `cancelled_by_host`   | int    | `CANCELLED` with `host_cancelled_at` set, bucketed by that timestamp. |
| `cancelled_by_client` | int    | `CANCELLED` with no host-cancellation marker, bucketed by `status_updated_at`. |

**`TrendPoint`** (one per day, graph 2)

| Field      | Type   | Notes |
|------------|--------|-------|
| `date`     | string | `YYYY-MM-DD`, UTC. |
| `bookings` | int    | Count of bookings *created* on this day (by `created_at`). |

**`Totals`**

| Field                 | Type | Notes |
|-----------------------|------|-------|
| `successful`          | int  | Sum of `outcomes[].successful` over the window. |
| `cancelled_by_host`   | int  | Sum of `outcomes[].cancelled_by_host`. |
| `cancelled_by_client` | int  | Sum of `outcomes[].cancelled_by_client`. |
| `bookings_created`    | int  | Sum of `trend[].bookings`. |

## How each series is computed (server-side)

| Series                | Filter                                                              | Bucketing column |
|-----------------------|---------------------------------------------------------------------|------------------|
| `successful`          | `status == COMPLETED`                                               | `status_updated_at` (falls back to `created_at`) |
| `cancelled_by_host`   | `status == CANCELLED` AND `host_cancelled_at IS NOT NULL`           | `host_cancelled_at` |
| `cancelled_by_client` | `status == CANCELLED` AND `host_cancelled_at IS NULL`               | `status_updated_at` (falls back to `created_at`) |
| `bookings` (trend)    | all bookings                                                        | `created_at` |

`status == REJECTED` is **not** in any series. If you want host-rejected bookings
counted in `cancelled_by_host` (or as a 4th line), ask backend to update.

## Frontend wiring example

```ts
// Fetch
const res = await fetch('/api/v1/admin/dashboard/booking-trends?days=14', {
  credentials: 'include',
});
const data: BookingTrendsResponse = await res.json();

// Graph 1 — 3 lines
const labels = data.outcomes.map(d => d.date);
const successful          = data.outcomes.map(d => d.successful);
const cancelledByHost     = data.outcomes.map(d => d.cancelled_by_host);
const cancelledByClient   = data.outcomes.map(d => d.cancelled_by_client);

// Graph 2 — 1 line (same labels are fine since arrays are aligned)
const bookings            = data.trend.map(d => d.bookings);

// Header cards
const { successful: tSucc, cancelled_by_host: tHc,
        cancelled_by_client: tCc, bookings_created: tCreated } = data.totals;
```

```ts
// TypeScript types
type OutcomePoint = {
  date: string;                 // YYYY-MM-DD
  successful: number;
  cancelled_by_host: number;
  cancelled_by_client: number;
};

type TrendPoint = {
  date: string;
  bookings: number;
};

type BookingTrendsResponse = {
  days: number;
  outcomes: OutcomePoint[];
  trend: TrendPoint[];
  totals: {
    successful: number;
    cancelled_by_host: number;
    cancelled_by_client: number;
    bookings_created: number;
  };
  generated_at: string;          // ISO-8601 UTC
};
```

## Error cases

| Status | When |
|--------|------|
| `401`  | No admin session. |
| `422`  | `days` out of range (≤0 or >365). |

## Notes

- Times are UTC. If you need the chart in local time, convert on the frontend.
- Days with no activity still appear as zero entries (no client-side padding needed).
- The two arrays are guaranteed to be the same length (`= days`) and the same
  dates in the same order.
