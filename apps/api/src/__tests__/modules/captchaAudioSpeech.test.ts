import { EnterpriseCaptchaService } from "../../services/captchaService";

describe("Enterprise Audio CAPTCHA Formant Speech Synthesizer", () => {
  it("should generate a valid 16kHz PCM WAV audio buffer for CAPTCHA text", async () => {
    const captcha = await EnterpriseCaptchaService.generateCaptcha();
    expect(captcha.id).toBeDefined();
    expect(captcha.audioEnabled).toBe(true);

    const audioBuffer = EnterpriseCaptchaService.getAudioBuffer(captcha.id);
    expect(audioBuffer).not.toBeNull();
    expect(Buffer.isBuffer(audioBuffer)).toBe(true);

    if (audioBuffer) {
      // 1. Verify RIFF / WAVE header
      expect(audioBuffer.toString("utf8", 0, 4)).toBe("RIFF");
      expect(audioBuffer.toString("utf8", 8, 12)).toBe("WAVE");
      expect(audioBuffer.toString("utf8", 12, 16)).toBe("fmt ");

      // 2. Verify PCM Format (1 = PCM, 1 = Mono)
      expect(audioBuffer.readUInt16LE(20)).toBe(1); // AudioFormat
      expect(audioBuffer.readUInt16LE(22)).toBe(1); // NumChannels

      // 3. Verify High-Clarity 16,000 Hz Sample Rate
      expect(audioBuffer.readUInt32LE(24)).toBe(16000); // SampleRate
      expect(audioBuffer.readUInt16LE(34)).toBe(16); // BitsPerSample

      // 4. Verify Data Chunk
      expect(audioBuffer.toString("utf8", 36, 40)).toBe("data");
      const dataSize = audioBuffer.readUInt32LE(40);
      expect(dataSize).toBeGreaterThan(0);
      expect(audioBuffer.length).toBe(44 + dataSize);
    }
  });

  it("should return null for expired or invalid CAPTCHA session IDs", () => {
    const audioBuffer = EnterpriseCaptchaService.getAudioBuffer("invalid-non-existent-id");
    expect(audioBuffer).toBeNull();
  });
});
