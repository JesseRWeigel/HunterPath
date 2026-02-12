// ─── Haptic Feedback ─────────────────────────────────────────────
// Wraps the Vibration API for mobile tactile feedback.
// Silently no-ops on devices that don't support it.

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/** Light tap — button presses, menu interactions */
export function hapticLight() {
  if (canVibrate()) navigator.vibrate(10);
}

/** Medium tap — combat hits, item usage */
export function hapticMedium() {
  if (canVibrate()) navigator.vibrate(25);
}

/** Heavy impact — critical hits, boss defeats, level-up */
export function hapticHeavy() {
  if (canVibrate()) navigator.vibrate(50);
}

/** Double pulse — spirit binding success, rank promotion */
export function hapticSuccess() {
  if (canVibrate()) navigator.vibrate([30, 50, 30]);
}

/** Warning buzz — damage taken, failure */
export function hapticWarning() {
  if (canVibrate()) navigator.vibrate([15, 30, 15, 30, 15]);
}

/** Long rumble — boss entrance */
export function hapticRumble() {
  if (canVibrate()) navigator.vibrate([10, 20, 10, 20, 40, 20, 10]);
}
