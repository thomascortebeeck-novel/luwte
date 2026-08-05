import type { RawRestingHeartRate, RawSleepSession } from '@luwte/core';

/**
 * The seam between luwte and whatever health store the platform has.
 *
 * **The web has none**, and that is not a gap to apologise for: Health Connect
 * is an on-device Android API and no browser can reach it. The default export
 * below reports itself unavailable, every caller handles that, and the same
 * code runs unchanged in the browser and in the Capacitor shell.
 *
 * Deliberately narrow. Everything that decides anything — which day a night
 * belongs to, how split sessions add up, which resting reading counts, whether
 * a day is worth writing at all — lives in `@luwte/core` where it is pure and
 * tested. An implementation of this interface only fetches. Platform code is
 * the hardest thing to test and the easiest thing to get wrong, so there is as
 * little of it as the job allows.
 */
export type HealthBridge = {
  /** False in every browser, and on an Android device with no Health Connect. */
  isAvailable(): Promise<boolean>;
  /**
   * Ask for read access to sleep and resting heart rate.
   *
   * Separate from `read` on purpose. Android shows a system dialogue, and a
   * permission prompt that appears the first time a screen renders — rather
   * than when somebody asked for something — is how people learn to refuse
   * without reading.
   */
  requestPermissions(): Promise<boolean>;
  read(from: Date, to: Date): Promise<{
    sleep: RawSleepSession[];
    resting: RawRestingHeartRate[];
  }>;
};

/**
 * What the browser gets.
 *
 * `read` throws rather than returning empty. Empty would mean "the watch
 * recorded nothing", which is a claim about somebody's night; unavailable
 * means "nobody asked the watch". Callers must check `isAvailable` first, and
 * this makes forgetting loud instead of quietly writing an untruth.
 */
export const unavailableBridge: HealthBridge = {
  isAvailable: () => Promise.resolve(false),
  requestPermissions: () => Promise.resolve(false),
  read: () => Promise.reject(new Error('No health store on this platform')),
};

let bridge: HealthBridge = unavailableBridge;

/** Called once by the Capacitor entry point. The web build never calls it. */
export function setHealthBridge(next: HealthBridge): void {
  bridge = next;
}

export function healthBridge(): HealthBridge {
  return bridge;
}
