# architecture.md

## Product: **UIUC MTD Assistant — Mobile App** (React Native + Supabase + CUMTD REST)
A native-first iOS/Android app for UIUC students that:
- Sends **push notifications** when the bus you care about is late/early or when it’s time to leave for class.
- Lets students **connect Google Calendar** or upload an **.ics**, pick a **Home** and frequent POIs, and auto-suggests the best bus for the next class.
- Shows **live bus direction** with arrow markers on the map.

### Platform & Stack
- **Mobile**: React Native (Expo) with TypeScript
  - Navigation: `@react-navigation/native`
  - Maps: `react-native-maplibre-gl` (or `react-native-maps` as fallback)
  - Background tasks: `expo-background-fetch`, `expo-task-manager`
  - Push notifications: `expo-notifications` (Expo Push service), or FCM/APNs if you prefer bare workflow
  - Location: `expo-location`
  - App storage: `expo-secure-store` (tokens), `@react-native-async-storage/async-storage` (prefs)
- **Backend**: Supabase
  - Auth (email link + Google OAuth), Postgres + PostGIS, Storage
  - Edge Functions: cron scheduler, trip planning wrapper, push fanout
- **Transit Data**: **CUMTD REST API** (we never ship the key in the app)
  - We call a **server proxy** which enforces **≤ 1 request/min** per endpoint/stop/route and caches 60–75s
- **Maps Tiles**: MapTiler/Mapbox-compatible vector tiles (or Apple/Google tiles if using `react-native-maps`)

---

## High-level Architecture
- The **app** talks only to **our backend** (Supabase Edge Functions + Next.js server routes if desired).
- The backend queries **CUMTD REST** with server-side caching (60–75s TTL) and returns normalized payloads.
- **Scheduler** (cron, every minute) plans upcoming trips for each user’s next class and enqueues pushes via Expo Push tokens.
- The **app** maintains lightweight local state (selected route, tracked bus, map viewport) and receives pushes that deep-link into the relevant screen.

---

## Mobile App File/Folder Structure
```
uiuc-mtd-assistant-mobile/
├─ app/                                  # Expo Router (or use classic src/navigation)
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  ├─ index.tsx                       # Dashboard
│  │  ├─ map.tsx                         # Live map
│  │  ├─ routes.tsx                      # Subscribed routes/stops
│  │  └─ settings.tsx
│  ├─ auth/
│  │  ├─ sign-in.tsx
│  │  └─ callback.tsx                    # OAuth redirect handler (deep link)
│  └─ calendar/
│     └─ index.tsx
├─ src/
│  ├─ components/
│  │  ├─ BusMarker.tsx                   # Arrow marker rotated by heading/bearing
│  │  ├─ NextBusCard.tsx                 # "Leave in N minutes"
│  │  └─ TripOptionCard.tsx              # Ranked route options
│  ├─ screens/                           # If not using Expo Router
│  ├─ services/
│  │  ├─ api.ts                          # fetch wrapper to our backend
│  │  ├─ planner.ts                      # client normalizers for trip plans
│  │  ├─ notifications.ts                # register push, handle tokens
│  │  ├─ location.ts                     # location helpers/permissions
│  │  └─ storage.ts                      # SecureStore/AsyncStorage helpers
│  ├─ state/
│  │  ├─ useUserStore.ts                 # auth info, profile
│  │  ├─ useSettingsStore.ts             # Home, POIs, quiet hours, lead time
│  │  ├─ useMapStore.ts                  # viewport, selected route/stop
│  │  └─ useSubscriptionsStore.ts        # followed stop/route pairs
│  ├─ lib/
│  │  ├─ deepLinks.ts                    # scheme handling for pushes
│  │  └─ geometry.ts                     # bearing math, smoothing
│  ├─ constants/
│  │  ├─ colors.ts
│  │  └─ env.ts
│  └─ hooks/
│     ├─ useLiveVehicles.ts              # polls our backend every 60s (foreground only)
│     └─ useDepartures.ts
├─ server/                               # Optional: Next.js/Mini-node server for local dev; real prod in Supabase
│  ├─ api/
│  │  ├─ transit/departures.ts           # proxy CUMTD GetDeparturesByStop + cache
│  │  ├─ transit/vehiclesByRoute.ts      # proxy CUMTD GetVehiclesByRoute + cache
│  │  ├─ transit/tripPlanner.ts          # proxy CUMTD GetPlannedTripsByLatLon
│  │  └─ transit/lastFeedUpdate.ts
│  └─ lib/
│     ├─ cumtd.ts                        # server-only CUMTD client
│     └─ cache.ts                        # in-memory/KV cache (60–75s)
├─ supabase/
│  ├─ migrations/                        # profiles, user_settings, calendars, events, routes_plans
│  └─ functions/
│     ├─ schedule-notify/                # cron: plan trips for next classes, enqueue pushes
│     └─ fanout-push/                    # sends via Expo Push / FCM / APNs
├─ assets/
│  ├─ icon.png
│  └─ splash.png
├─ docs/
│  ├─ architecture.md
│  └─ tasks.md
├─ app.json                              # Expo config (scheme, deeplinks, splash, icons)
├─ package.json
└─ README.md
```

---

## Data Model (Supabase/Postgres)
**No live vehicle tables.** Only user state and cached plan payloads.

- **profiles**: id (uuid), full_name, email, created_at  
- **user_settings**: user_id, home_point geometry(Point,4326), home_label, notify_lead_minutes int, quiet_hours tsrange, timezone  
- **calendars**: user_id, provider (google|ics), google_refresh_token (enc), ics_storage_path  
- **events**: id, user_id, title, start_ts, end_ts, location_text, destination_point geometry, source_point geometry, last_routed_at  
- **routes_plans**: id, user_id, event_id, payload jsonb, created_at  
- **push_tokens**: user_id, device_id, expo_push_token|fcm_token, platform, last_seen_at

**Storage**: `calendar_ics/` for uploaded ICS

**Policies**: RLS by user_id on all personal tables. Backend never exposes CUMTD key.

---

## Key Services & Flows
- **CUMTD proxy** (server): wraps `GetDeparturesByStop`, `GetVehiclesByRoute`, `GetPlannedTripsByLatLon`, `GetLastFeedUpdate`, caches per resource 60–75s, enforces ≤ 1/min rate.
- **Trip planner** (server): normalize itineraries → legs (walk/service), `depart_at`, `arrive_by`, `travel_time`, headsign, stop IDs.
- **Notification scheduler** (cron): every minute checks next 30–60 min events per user, asks planner, compares with last plan; if leave-time crosses threshold or route late, enqueues push to **Expo Push** with a deep link like `uiucmtd://map?routeId=…&stopId=…`.
- **App**:
  - Registers push token on first launch; updates `push_tokens` on change.
  - Foreground: polls our proxy endpoints (60s). Background: **no polling** (server handles it); receives push which opens correct screen.
  - Map shows vehicles with arrow markers. Rotation = API `heading` or computed from last two positions (smoothed).

---

## Security & Privacy
- Minimal calendar data stored (title, start/end, location). No event body.
- Encrypt refresh tokens at rest.
- RLS on all personal tables.
- CUMTD API key is server-only.
- Expo Push tokens are per-device; allow users to revoke in Settings.

---

## Observability
- Log proxy calls, cache hits, scheduler decisions, and push outcomes.
- Simple `metrics` table for function_name, duration_ms, success, created_at.

---

## Directional Markers
- Use `heading` from vehicles if present.
- Else compute bearing from consecutive positions; smooth with EMA for stability.
- If route shape available, snap to nearest segment and use tangent for arrow rotation.
