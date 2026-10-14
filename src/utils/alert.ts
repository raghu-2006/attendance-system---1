/**
 * Triggers device vibration pattern if supported by mobile device/browser.
 */
export function triggerDeviceVibration(pattern: number[] = [300, 150, 300, 150, 600]): boolean {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Plays an audio chime using Web Audio API (works without external audio assets).
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second chime chord
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.2); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4); // D6
    gain2.gain.setValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.7);
  } catch {
    // Ignore audio permission restrictions
  }
}

/**
 * Trigger full pre-break alert (both vibration and chime)
 */
export function notifyBreakIncoming(breakName: string, minutesLeft: number): void {
  triggerDeviceVibration([400, 200, 400, 200, 800]);
  playAlertChime();
}
