/**
 * BuySell Notification Sound Engine
 * Uses Web Audio API to generate distinct chimes — no audio files needed.
 * Each notification type has a unique sonic signature.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  delay: number,
  type: OscillatorType,
  gain: number,
  ctx: AudioContext
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

  gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + 0.05);
}

export type SoundType = "ORDER" | "MESSAGE" | "RFQ" | "VERIFICATION" | "SYSTEM" | "SUCCESS" | "ERROR";

/**
 * Play a contextual notification sound based on type.
 * All sounds are safe (low volume, short duration < 1s).
 */
export async function playNotificationSound(type: SoundType = "SYSTEM"): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (required by browser autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    switch (type) {
      case "ORDER": {
        // Ascending triumphant double chime — "Ka-ching" feel
        playTone(523.25, 0.18, 0, "sine", 0.18, ctx); // C5
        playTone(659.25, 0.18, 0.14, "sine", 0.18, ctx); // E5
        playTone(783.99, 0.32, 0.28, "sine", 0.22, ctx); // G5
        break;
      }
      case "RFQ": {
        // Attention-grabbing double beep — "New proposal"
        playTone(880, 0.12, 0, "triangle", 0.15, ctx); // A5
        playTone(880, 0.12, 0.2, "triangle", 0.15, ctx); // A5
        break;
      }
      case "MESSAGE": {
        // Soft descending bubble — "Message received"
        playTone(1046.5, 0.14, 0, "sine", 0.13, ctx); // C6
        playTone(783.99, 0.18, 0.12, "sine", 0.13, ctx); // G5
        break;
      }
      case "VERIFICATION": {
        // Celebratory ascending chord — "Achievement"
        playTone(523.25, 0.2, 0, "sine", 0.15, ctx); // C5
        playTone(659.25, 0.2, 0.1, "sine", 0.15, ctx); // E5
        playTone(783.99, 0.2, 0.2, "sine", 0.15, ctx); // G5
        playTone(1046.5, 0.35, 0.3, "sine", 0.2, ctx); // C6
        break;
      }
      case "SUCCESS": {
        // Clean upward two-note confirm
        playTone(659.25, 0.15, 0, "sine", 0.16, ctx); // E5
        playTone(880, 0.25, 0.15, "sine", 0.2, ctx); // A5
        break;
      }
      case "ERROR": {
        // Low descending thud — "Something needs attention"
        playTone(220, 0.18, 0, "sawtooth", 0.1, ctx); // A3
        playTone(174.61, 0.22, 0.15, "sawtooth", 0.1, ctx); // F3
        break;
      }
      case "SYSTEM":
      default: {
        // Subtle single soft ping
        playTone(783.99, 0.25, 0, "sine", 0.12, ctx); // G5
        break;
      }
    }
  } catch (err) {
    // Silently fail — audio is non-critical
    console.debug("[BuySell Sound] Audio context error:", err);
  }
}

/**
 * Request browser Push Notification permission.
 * Returns true if granted.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Show a native browser push notification.
 */
export function showBrowserPushNotification(
  title: string,
  body: string,
  tag?: string,
  onClick?: () => void
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // Don't spam if user is active on the tab

  const notif = new Notification(`🛒 BuySell — ${title}`, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: tag || "buysell-notif",
    requireInteraction: false,
    silent: true, // We handle our own sound
  });

  if (onClick) {
    notif.onclick = () => {
      window.focus();
      onClick();
      notif.close();
    };
  }

  // Auto-close after 6 seconds
  setTimeout(() => notif.close(), 6000);
}
