# tasks.md

## MVP Build Plan (mobile-first, tiny and testable)

### 0) Project bootstrap
1. Create Expo project with TypeScript  
   - Start: `npx create-expo-app uiuc-mtd-assistant-mobile -t expo-template-blank-typescript`  
   - End: app runs on iOS/Android simulators.
2. Add base deps  
   - Start: install `react-native-maplibre-gl` (or `react-native-maps`), `@react-navigation/native`, `expo-notifications`, `expo-background-fetch`, `expo-task-manager`, `expo-location`, `@react-native-async-storage/async-storage`, `expo-secure-store`.  
   - End: packages installed and compile succeeds.
3. Configure navigation or Expo Router  
   - Start: set up tabs: Dashboard, Map, Routes, Settings.  
   - End: switching tabs works.

### 1) Supabase wiring
4. Create Supabase project & envs  
   - Start: create project, copy URL and anon key to app config.  
   - End: can sign up via email link.
5. DB schema v1 migration  
   - Start: create tables `profiles`, `user_settings`, `calendars`, `events`, `routes_plans`, `push_tokens`.  
   - End: RLS enabled for all personal tables.

### 2) Push notifications
6. Register device for push  
   - Start: implement `src/services/notifications.register()` using `expo-notifications`, ask permissions, get token.  
   - End: token saved to `push_tokens` with platform and device_id.
7. Handle push taps & deep links  
   - Start: configure scheme `uiucmtd://` in app.json, wire listener to navigate.  
   - End: tapping a test push opens the right screen.

### 3) Calendar ingestion
8. Google OAuth connect  
   - Start: add Google provider in Supabase, handle OAuth redirect in-app.  
   - End: can list next 10 events after consent.
9. ICS upload (optional first)  
   - Start: file picker → upload to `calendar_ics/`, parse server-side into `events`.  
   - End: events rows present with destination geocoded.

### 4) Server proxy for CUMTD
10. Implement proxy endpoints  
   - Start: create Edge Functions (or small Node server) for:
     - `/transit/departures?stop_id=`
     - `/transit/vehiclesByRoute?route_id=`
     - `/transit/tripPlanner` (POST: origin,destination,arrive_by)  
   - End: all return normalized JSON; CUMTD key server-only.
11. Add cache & rate guard  
   - Start: 60–75s TTL cache per resource; enforce ≤1/min/stop/route.  
   - End: logs show cache hits and no rate-limit breaches.

### 5) Map + direction
12. Put a base map on the Map tab  
   - Start: initialize MapLibre (or RN Maps), center on campus.  
   - End: map renders.
13. BusMarker arrow component  
   - Start: implement SVG/path arrow rotated by prop degrees.  
   - End: rotation demo works.
14. Live vehicles overlay  
   - Start: call `/vehiclesByRoute` for followed routes every 60s (foreground).  
   - End: markers render and update.
15. Bearing fallback  
   - Start: compute bearing from last two positions when heading missing; smooth with EMA.  
   - End: arrows point correctly in tests.

### 6) Home & settings
16. Home picker  
   - Start: map press to set Home point; save to `user_settings`.  
   - End: Home persists across app restarts.
17. Notification prefs  
   - Start: UI for lead minutes and quiet hours; save to `user_settings`.  
   - End: values persist and visible in DB.

### 7) Trip planning & dashboard
18. Planner call for next event  
   - Start: get Home + next event, call `/transit/tripPlanner`.  
   - End: response shows 1–3 options.
19. NextBusCard  
   - Start: show “Leave in N min” with live countdown.  
   - End: card updates every 30s.

### 8) Scheduler & fanout (server)
20. Cron `schedule-notify`  
   - Start: every minute, look 30–60 min ahead, ask planner, compare to last plan.  
   - End: when threshold crossed or detected delay, enqueue push.
21. `fanout-push`  
   - Start: send via Expo Push (fallback to FCM/APNs if bare).  
   - End: device receives a real push.

### 9) Subscriptions & alerts
22. Follow a stop/route pair  
   - Start: add to `useSubscriptionsStore`; server stores minimal preference.  
   - End: user can toggle follow/unfollow.
23. Late bus detector (server)  
   - Start: compare expected vs schedule from departures; X min threshold.  
   - End: push alert when late.

### 10) Polish & release
24. Accessibility pass  
   - Start: screen reader labels, larger hit targets.  
   - End: no critical issues.
25. Offline basics  
   - Start: cache last plan and map viewport locally.  
   - End: app opens offline with last state.
26. E2E smoke  
   - Start: run on device: sign in, set Home, connect calendar, see plan, receive push.  
   - End: complete happy path works.
27. Ship TestFlight/Internal testing  
   - Start: EAS builds for iOS/Android.  
   - End: testers can install.
