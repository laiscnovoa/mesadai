---
name: MesadAI architecture
description: Durable decisions for MesadAI's multi-device cloud sync, auth, and proof-photo storage
---

# MesadAI multi-device sync

## Auth (drift from Clerk)
- Device-token bearer auth, NOT Clerk. Family creator becomes parent device; child joins via a short pairing code → child device. A devices table maps token → family/role/child.
- **Why:** kids have no email; matches the existing PIN UX; simpler than Clerk for a single family-shared dataset.

## Data model
- Server stores raw entities mirroring the app's TS types (ISO strings as text). Compute (streak/balance/XP/level/missions) stays client-side, fed from one snapshot read.
- Streak-bet resolution is server-side and resolve-on-read (on snapshot read + after mutations) so multiple devices stay consistent.

## Proof-photo storage
- **Serving endpoint must be public (unauthenticated).** RN `<Image source={{uri}}>` cannot attach a bearer token, so cross-device photo loads require an auth-free GET. Mitigation: restrict the public route to exactly the uploads UUID path so nothing else under the private dir leaks. Public-by-obscurity is the accepted MVP tradeoff.
- The server object-storage helpers are identical to the WEB blueprint templates even for an Expo app, because the backend is still Express.
- Normalize new camera captures to JPEG before preview/upload, and serve proof photos with an explicit, verified image MIME (using signature detection when legacy metadata is generic).
  - **Why:** iOS and browsers may render HEIC or sniff `application/octet-stream`, while Android can show a broken-image “X” for the same bytes.
  - **How to apply:** Preserve cover framing, accept legacy extensionless UUID objects, and always render through a shared component with loading and error placeholders.

## API base URL (critical, easy to get wrong)
- The api-server is reached at the **domain root** (its dev port maps to external 80), and its routes live under `/api`. The generated OpenAPI client paths already include `/api`, and the client runtime prepends the configured base to relative paths.
- **Therefore `setBaseUrl` must get the ORIGIN (no `/api`)** or every client call doubles to `/api/api/...` and 404s. Raw (non-generated) fetches like photo upload/serve need the origin-plus-`/api` value instead. Keep these two bases distinct.
- **Why:** a prior build set the client base to origin+`/api` and broke every API call; curl tests missed it because they hit the server directly, bypassing the client's prepend.

## Gotcha
- Metro can crash on restart with a transient `ENOENT` watch error if a pnpm install is running concurrently — just restart the expo workflow after installs finish.
