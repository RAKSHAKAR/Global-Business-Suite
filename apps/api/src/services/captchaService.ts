import svgCaptcha from "svg-captcha";
import crypto from "crypto";
import { prisma } from "@saas/database";

const generateUuid = () => (crypto.randomUUID ? crypto.randomUUID() : `cap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);


interface CaptchaSessionData {
  text: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  lockoutUntil?: number;
}

// In-memory Session Store for CAPTCHAs (Session bound & server-side only)
const captchaSessionStore = new Map<string, CaptchaSessionData>();

// Formant & Phonetic Acoustic Specs for Spoken Character Speech Synthesis
interface PhoneticProfile {
  f0: number; // Fundamental voice pitch (Hz)
  f1: number; // 1st Formant frequency (Hz)
  f2: number; // 2nd Formant frequency (Hz)
  f3: number; // 3rd Formant frequency (Hz)
  hasInitialNoise?: boolean; // Plosive / fricative consonant attack
  hasFinalNoise?: boolean; // Sibilant / fricative tail
  transitionF2?: number; // Target F2 for diphthongs/glides
}

const PHONETIC_PROFILES: Record<string, PhoneticProfile> = {
  A: { f0: 155, f1: 480, f2: 2050, f3: 2850, transitionF2: 2400 },
  B: { f0: 145, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  C: { f0: 160, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  D: { f0: 150, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  E: { f0: 165, f1: 270, f2: 2300, f3: 3000 },
  F: { f0: 150, f1: 520, f2: 1750, f3: 2700, hasFinalNoise: true },
  G: { f0: 145, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  H: { f0: 155, f1: 480, f2: 2050, f3: 2850, hasFinalNoise: true },
  I: { f0: 160, f1: 730, f2: 1250, f3: 2600, transitionF2: 2300 },
  J: { f0: 150, f1: 480, f2: 2050, f3: 2850, hasInitialNoise: true },
  K: { f0: 145, f1: 480, f2: 2050, f3: 2850, hasInitialNoise: true },
  L: { f0: 150, f1: 500, f2: 1750, f3: 2700, transitionF2: 1000 },
  M: { f0: 140, f1: 300, f2: 1200, f3: 2500, transitionF2: 1100 },
  N: { f0: 140, f1: 320, f2: 1500, f3: 2500, transitionF2: 1400 },
  O: { f0: 150, f1: 500, f2: 1000, f3: 2500, transitionF2: 800 },
  P: { f0: 150, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  Q: { f0: 145, f1: 320, f2: 2100, f3: 2800, transitionF2: 850 },
  R: { f0: 145, f1: 730, f2: 1200, f3: 1650 },
  S: { f0: 155, f1: 500, f2: 1750, f3: 2700, hasInitialNoise: true, hasFinalNoise: true },
  T: { f0: 150, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  U: { f0: 150, f1: 320, f2: 2100, f3: 2800, transitionF2: 850 },
  V: { f0: 145, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  W: { f0: 145, f1: 450, f2: 1100, f3: 2400, transitionF2: 2200 },
  X: { f0: 155, f1: 500, f2: 1750, f3: 2700, hasInitialNoise: true, hasFinalNoise: true },
  Y: { f0: 150, f1: 320, f2: 2100, f3: 2800, transitionF2: 1200 },
  Z: { f0: 145, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true, hasFinalNoise: true },
  "0": { f0: 140, f1: 350, f2: 2100, f3: 2800, transitionF2: 900, hasInitialNoise: true },
  "1": { f0: 150, f1: 400, f2: 950, f3: 2500, transitionF2: 1300 },
  "2": { f0: 145, f1: 350, f2: 900, f3: 2400, transitionF2: 2100 },
  "3": { f0: 150, f1: 280, f2: 2250, f3: 2900, hasInitialNoise: true },
  "4": { f0: 145, f1: 520, f2: 1100, f3: 2500, hasInitialNoise: true },
  "5": { f0: 150, f1: 730, f2: 1250, f3: 2600, hasInitialNoise: true, transitionF2: 2200 },
  "6": { f0: 155, f1: 400, f2: 1900, f3: 2700, hasInitialNoise: true, hasFinalNoise: true },
  "7": { f0: 150, f1: 500, f2: 1750, f3: 2700, hasInitialNoise: true, transitionF2: 1200 },
  "8": { f0: 155, f1: 480, f2: 2050, f3: 2850, hasFinalNoise: true },
  "9": { f0: 140, f1: 730, f2: 1250, f3: 2600, transitionF2: 1400 },
};

/**
 * Generate a clear RIFF PCM WAV buffer synthesizing human vocal formant speech for characters.
 */
function generateWavAudioForText(text: string): Buffer {
  const sampleRate = 16000; // 16kHz for high clarity vocal speech
  const charDuration = 0.45; // 450ms per character
  const pauseDuration = 0.2; // 200ms pause between characters for clear articulation
  const numSamplesPerChar = Math.floor(sampleRate * charDuration);
  const numSamplesPause = Math.floor(sampleRate * pauseDuration);

  const upperText = text.toUpperCase();
  const totalSamples = upperText.length * (numSamplesPerChar + numSamplesPause);
  const dataSize = totalSamples * 2; // 16-bit mono PCM
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);

  // WAV Header (RIFF / WAVE)
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate (16000 Hz)
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;

  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
    const profile = PHONETIC_PROFILES[char] || { f0: 150, f1: 500, f2: 1500, f3: 2500 };

    const { f0, f1, f3, hasInitialNoise, hasFinalNoise, transitionF2 } = profile;
    const startF2 = profile.f2;
    const targetF2 = transitionF2 ?? startF2;

    for (let s = 0; s < numSamplesPerChar; s++) {
      const normS = s / numSamplesPerChar;
      const t = s / sampleRate;

      // ADSR Envelope
      let env = 1.0;
      if (normS < 0.1) {
        env = normS / 0.1; // Attack
      } else if (normS > 0.85) {
        env = (1.0 - normS) / 0.15; // Release
      }

      // Smooth Formant F2 Glide for diphthongs
      const currentF2 = startF2 + (targetF2 - startF2) * normS;

      // Glottal Impulse Train Generator (Synthesizes Human Vocal Cords harmonic series)
      let glottalVocalWave = 0;
      for (let n = 1; n <= 8; n++) {
        glottalVocalWave += (Math.sin(2 * Math.PI * n * f0 * t) / Math.pow(n, 1.2)) * 0.25;
      }

      const formant1 = Math.sin(2 * Math.PI * f1 * t) * 0.2;
      const formant2 = Math.sin(2 * Math.PI * currentF2 * t) * 0.2;
      const formant3 = Math.sin(2 * Math.PI * f3 * t) * 0.1;

      // Consonant Articulation (Plosive / Sibilant noise bursts)
      let noise = 0;
      if (hasInitialNoise && normS < 0.12) {
        noise = (Math.random() - 0.5) * 0.35 * (1 - normS / 0.12);
      } else if (hasFinalNoise && normS > 0.7) {
        noise = (Math.random() - 0.5) * 0.25 * ((normS - 0.7) / 0.3);
      }

      const sample = (glottalVocalWave + formant1 + formant2 + formant3 + noise) * env * 0.65;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      buffer.writeInt16LE(intSample, offset);
      offset += 2;
    }

    // Pause between characters for clear speech separation
    for (let p = 0; p < numSamplesPause; p++) {
      buffer.writeInt16LE(0, offset);
      offset += 2;
    }
  }

  return buffer;
}

export class EnterpriseCaptchaService {
  /**
   * Generates a dynamic server-bound CAPTCHA image and optional audio token.
   */
  static async generateCaptcha(): Promise<{
    id: string;
    imageSvg: string;
    audioEnabled: boolean;
    text: string;
  }> {
    // 1. Fetch Config from PlatformSetting
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "CAPTCHA_ENABLED",
            "CAPTCHA_MIN_LENGTH",
            "CAPTCHA_MAX_LENGTH",
            "CAPTCHA_ALLOW_UPPERCASE",
            "CAPTCHA_ALLOW_LOWERCASE",
            "CAPTCHA_ALLOW_NUMBERS",
            "CAPTCHA_DISTORTION_LEVEL",
            "CAPTCHA_NOISE_LEVEL",
            "CAPTCHA_EXPIRATION_MINUTES",
            "CAPTCHA_MAX_ATTEMPTS",
            "CAPTCHA_LOCKOUT_MINUTES",
            "CAPTCHA_AUDIO_ENABLED",
          ],
        },
      },
    });

    const configMap = settings.reduce(
      (acc: Record<string, string>, s: any) => {
        acc[s.key] = s.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const minLen = parseInt(configMap["CAPTCHA_MIN_LENGTH"]) || 6;
    const maxLen = parseInt(configMap["CAPTCHA_MAX_LENGTH"]) || 6;
    const size = Math.max(
      minLen,
      Math.min(
        maxLen,
        Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen,
      ),
    );

    let noise = parseInt(configMap["CAPTCHA_NOISE_LEVEL"]) || 2;
    const distortionLevel = (
      configMap["CAPTCHA_DISTORTION_LEVEL"] || "medium"
    ).toLowerCase();
    if (distortionLevel === "high") noise += 2;

    const allowUpper = configMap["CAPTCHA_ALLOW_UPPERCASE"] !== "false";
    const allowLower = configMap["CAPTCHA_ALLOW_LOWERCASE"] !== "false";
    const allowNumbers = configMap["CAPTCHA_ALLOW_NUMBERS"] !== "false";

    let allowedPreset = "";
    if (allowUpper) allowedPreset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (allowLower) allowedPreset += "abcdefghijklmnopqrstuvwxyz";
    if (allowNumbers) allowedPreset += "0123456789";
    if (!allowedPreset) allowedPreset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const expiresMin = parseInt(configMap["CAPTCHA_EXPIRATION_MINUTES"]) || 5;
    const maxAttempts = parseInt(configMap["CAPTCHA_MAX_ATTEMPTS"]) || 5;
    const audioEnabled = configMap["CAPTCHA_AUDIO_ENABLED"] !== "false";

    // 2. Generate SVG CAPTCHA Image
    const captcha = svgCaptcha.create({
      size,
      noise,
      color: true,
      background: "#ffffff",
      charPreset: allowedPreset,
    });

    const id = generateUuid();
    captchaSessionStore.set(id, {
      text: captcha.text,
      expiresAt: Date.now() + expiresMin * 60000,
      attempts: 0,
      maxAttempts,
    });

    return { id, imageSvg: captcha.data, audioEnabled, text: captcha.text };
  }

  /**
   * Generates Audio WAV buffer for a given CAPTCHA session.
   */
  static getAudioBuffer(id: string): Buffer | null {
    const session = captchaSessionStore.get(id);
    if (!session) return null;
    return generateWavAudioForText(session.text);
  }

  /**
   * Non-destructive CAPTCHA text check without deleting session
   */
  static checkCaptchaText(id: string, inputToken: string): boolean {
    const automationEnabled = process.env.NODE_ENV === "test" || process.env.GBS_E2E_TEST_MODE === "true";
    const automationToken = process.env.GBS_E2E_CAPTCHA_TOKEN || "dev-token";
    if (automationEnabled && inputToken === automationToken) return true;
    const session = captchaSessionStore.get(id);
    if (!session || !inputToken || !session.text) return false;
    if (session.expiresAt < Date.now()) return false;
    return session.text.toLowerCase() === inputToken.trim().toLowerCase();
  }

  /**
   * Server-side CAPTCHA verification against stored session memory.
   */
  static verifyCaptcha(
    id: string,
    inputToken: string,
  ): { success: boolean; error?: string } {
    // Explicit test-only bypass. It is unavailable in normal development and production.
    const automationEnabled = process.env.NODE_ENV === "test" || process.env.GBS_E2E_TEST_MODE === "true";
    const automationToken = process.env.GBS_E2E_CAPTCHA_TOKEN || "dev-token";
    if (automationEnabled && inputToken === automationToken) {
      return { success: true };
    }

    const session = captchaSessionStore.get(id);
    if (!session) {
      return {
        success: false,
        error: "CAPTCHA session invalid or expired. Please refresh.",
      };
    }

    if (session.lockoutUntil && session.lockoutUntil > Date.now()) {
      const remainingSec = Math.ceil(
        (session.lockoutUntil - Date.now()) / 1000,
      );
      return {
        success: false,
        error: `Account locked due to too many failed attempts. Try again in ${remainingSec}s.`,
      };
    }

    if (session.expiresAt < Date.now()) {
      captchaSessionStore.delete(id);
      return {
        success: false,
        error: "CAPTCHA expired. Please request a new CAPTCHA.",
      };
    }

    session.attempts += 1;

    if (session.text.toLowerCase() !== inputToken.trim().toLowerCase()) {
      if (session.attempts >= session.maxAttempts) {
        session.lockoutUntil = Date.now() + 15 * 60000; // 15 min lockout
        return {
          success: false,
          error: "Maximum failed CAPTCHA attempts reached. Session locked.",
        };
      }
      return {
        success: false,
        error: `CAPTCHA validation failed (${session.attempts}/${session.maxAttempts} attempts).`,
      };
    }

    // Success: Delete session to prevent replay attacks
    captchaSessionStore.delete(id);
    return { success: true };
  }
}
