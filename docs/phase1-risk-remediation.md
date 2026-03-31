# Phase 1 Risk Remediation Playbook

## A) Multi-session testing strategy (same machine)

### Option 1: Single browser, multiple profiles (recommended)
1. Create 3 browser profiles: `admin`, `driver`, `guest`.
2. Open one profile window per role and keep them pinned side-by-side.
3. Keep each role logged in persistently for full ride lifecycle testing.

Why this works:
- Each profile has isolated storage + service worker + push subscription endpoint.
- Avoids repeated login/logout churn and prevents accidental session overwrite.

### Option 2: Normal + Incognito + second browser
- Use normal window for `admin`.
- Use incognito for `driver`.
- Use another browser (Firefox/Edge) for `guest`.

### Option 3: Same window, multi-tab (quick checks only)
- Useful for read-only checks, not push validation.
- Tabs share storage/session, so only one role remains active at a time.

## Minimal workflow improvements included in this phase
- Login page remembers recent role identities (guest name/phone, driver phone, admin username).
- Logout now triggers push unsubscribe before session clear to prevent stale notification delivery.
- Push backend enforces token identity binding, so wrong-role subscriptions are blocked.

## B/C) Admin mobile UI and simulator toggle validation

### Header UX targets
- At 320px, only primary controls stay visible in header row.
- Secondary controls are moved into an overflow menu.
- Touch targets are at least `44px` tall (`h-11`) and use touch-friendly interaction classes.

### Toggle reliability checks
- In mobile emulator and real device:
  - Tap duty toggle 20 times in `driver` dashboard, verify no missed toggles.
  - Ensure disabled state blocks toggles during API in-flight and busy status.
  - Confirm no overlay blocks taps in admin header overflow interactions.

## D/E) Push targeting + admin always-on policy checks

### Required pass checks
1. Driver token cannot subscribe as guest/admin payload identity.
2. Guest token cannot subscribe/unsubscribe another user's endpoint.
3. Reusing the same endpoint across sessions rebinds to latest authenticated identity.
4. Admin UI never presents a user-facing disable toggle.
5. If notification permission is denied, admin UI shows actionable warning.

### Negative checks
- Create guest + driver sessions and assign rides.
- Verify driver-only notifications are not received in guest/admin sessions.
- Verify guest-only ride updates are not received in driver/admin sessions.

## Regression checklist
- [ ] Admin header usable at 320px and 360px.
- [ ] Admin overflow actions (complaints/settings/logout) are tappable in emulator and phone.
- [ ] Driver duty toggle remains stable under repeated taps.
- [ ] Multi-session auth runs without forced relogin loops.
- [ ] Push notifications scoped by role+identity (wrong users do not receive).
- [ ] Admin notification state remains operationally always-on (no disable control).

