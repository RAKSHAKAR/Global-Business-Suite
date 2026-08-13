"use client";

import React, { useState, useEffect, useRef } from "react";

interface CaptchaProps {
  onValidate: (id: string, token: string, isVerified: boolean) => void;
}

const NUMBER_WORDS: Record<string, string> = {
  "0": "Zero",
  "1": "One",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
};

function formatCharacterForSpeech(ch: string): string {
  if (NUMBER_WORDS[ch]) {
    return NUMBER_WORDS[ch];
  }
  if (ch >= "A" && ch <= "Z") {
    return `Capital ${ch}`;
  }
  if (ch >= "a" && ch <= "z") {
    return ch;
  }
  return ch;
}

export function Captcha({ onValidate }: CaptchaProps) {
  const [captchaId, setCaptchaId] = useState("");
  const [captchaText, setCaptchaText] = useState("");
  const [svgImage, setSvgImage] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const activeAudioCtxRef = useRef<AudioContext | null>(null);

  const getApiUrl = (path: string) => {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      return `${envUrl.replace(/\/$/, "")}${path}`;
    }
    if (typeof window !== "undefined" && window.location.hostname) {
      return `http://${window.location.hostname}:4000${path}`;
    }
    return `http://127.0.0.1:4000${path}`;
  };

  const stopAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (activeAudioCtxRef.current && activeAudioCtxRef.current.state !== "closed") {
      try {
        activeAudioCtxRef.current.close();
      } catch {}
      activeAudioCtxRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  const fetchCaptcha = async () => {
    stopAudio();
    setLoading(true);
    setIsVerified(false);
    setVerifyError("");
    try {
      const res = await fetch(getApiUrl("/api/v1/auth/captcha"), { cache: "no-store" });
      const data = await res.json();
      const payload = data.data || data;
      if (payload.id && payload.image) {
        setCaptchaId(payload.id);
        setCaptchaText(payload.audioText || "");
        const cleanSvg = payload.image.replace(/rect fill="[^"]*"/gi, 'rect fill="transparent"');
        setSvgImage(cleanSvg);
        setAudioEnabled(payload.audioEnabled !== false);
        setAnswer("");
        onValidate(payload.id, "", false);
      }
    } catch (e) {
      console.error("Failed to load CAPTCHA:", e);
      setVerifyError("Unable to load CAPTCHA. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
    return () => {
      stopAudio();
    };
  }, []);

  const verifyCaptchaCode = async (codeToTest?: string) => {
    const code = (codeToTest !== undefined ? codeToTest : answer).trim();
    if (!code || !captchaId) {
      setVerifyError("Please enter the CAPTCHA code.");
      setIsVerified(false);
      onValidate(captchaId, code, false);
      return;
    }

    setIsVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch(getApiUrl("/api/v1/auth/captcha/verify-check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaId, captchaToken: code }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setIsVerified(true);
        setVerifyError("");
        onValidate(captchaId, code, true);
      } else {
        setIsVerified(false);
        setVerifyError(data.error || "Incorrect CAPTCHA code.");
        onValidate(captchaId, code, false);
      }
    } catch (err) {
      setIsVerified(false);
      setVerifyError("Verification failed. Please try again.");
      onValidate(captchaId, code, false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAnswer(val);
    if (isVerified) {
      setIsVerified(false);
    }
    setVerifyError("");
    onValidate(captchaId, val, false);
  };

  const playAudioCaptcha = async () => {
    if (!captchaId || isPlayingAudio) return;
    setIsPlayingAudio(true);

    try {
      // 1. Speak characters using Web Speech API for crystal-clear spoken articulation
      let spokenWebSpeech = false;
      const targetText = captchaText || answer.trim();
      if (targetText && typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const articulated = targetText
            .split("")
            .map(formatCharacterForSpeech)
            .join(", ");
          const utterance = new SpeechSynthesisUtterance(articulated);
          utterance.rate = 0.65;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = "en-US";

          await new Promise<void>((resolve) => {
            let finished = false;
            const complete = () => {
              if (!finished) {
                finished = true;
                spokenWebSpeech = true;
                resolve();
              }
            };

            utterance.onend = complete;
            utterance.onerror = complete;

            const safetyMs = Math.max(3000, articulated.length * 500);
            setTimeout(complete, safetyMs);

            window.speechSynthesis.speak(utterance);
          });
        } catch (e) {
          console.warn("[Captcha] Web Speech API spoken articulation note:", e);
        }
      }

      // 2. Play Server PCM WAV stream if Web Speech was unavailable
      if (!spokenWebSpeech) {
        let audioCtx: AudioContext | null = null;
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
            activeAudioCtxRef.current = audioCtx;
            if (audioCtx.state === "suspended") {
              await audioCtx.resume();
            }
          }
        } catch (e) {
          console.warn("[Captcha] AudioContext init note:", e);
        }

        try {
          const audioUrl = getApiUrl(`/api/v1/auth/captcha/audio/${captchaId}`);
          const res = await fetch(audioUrl, { cache: "no-store" });
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            if (arrayBuffer && arrayBuffer.byteLength > 44) {
              if (audioCtx && audioCtx.state !== "closed") {
                const decodedData = await new Promise<AudioBuffer>((resolve, reject) => {
                  audioCtx!.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
                });

                const source = audioCtx.createBufferSource();
                source.buffer = decodedData;
                source.connect(audioCtx.destination);

                await new Promise<void>((resolve) => {
                  source.onended = () => resolve();
                  source.start(0);
                });
              } else {
                const blob = new Blob([arrayBuffer], { type: "audio/wav" });
                const objectUrl = URL.createObjectURL(blob);
                const audio = new Audio(objectUrl);

                await new Promise<void>((resolve) => {
                  let cleaned = false;
                  const cleanup = () => {
                    if (!cleaned) {
                      cleaned = true;
                      URL.revokeObjectURL(objectUrl);
                      resolve();
                    }
                  };
                  audio.onended = cleanup;
                  audio.onerror = cleanup;
                  audio.play().then(() => setTimeout(cleanup, 3000)).catch(cleanup);
                });
              }
            }
          }
        } catch (err) {
          console.warn("[Captcha] Server PCM WAV playback error:", err);
        } finally {
          if (audioCtx && audioCtx.state !== "closed") {
            try {
              await audioCtx.close();
            } catch {}
          }
          activeAudioCtxRef.current = null;
        }
      }
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-4 border border-slate-200 rounded-2xl bg-transparent w-full shadow-none">
      {/* Row 1: SVG Captcha Image + Action Buttons */}
      <div className="flex items-stretch gap-2 w-full h-12">
        {loading ? (
          <div className="flex-1 h-full flex items-center justify-center text-xs text-slate-400 font-medium bg-white border border-slate-200 rounded-xl">
            Loading CAPTCHA...
          </div>
        ) : (
          <div
            className="flex-1 h-full flex justify-center items-center bg-white border border-slate-200 rounded-xl p-1 overflow-hidden [&_svg]:w-full [&_svg]:h-full [&_rect]:fill-transparent"
            dangerouslySetInnerHTML={{ __html: svgImage }}
          />
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0 h-full">
          {audioEnabled && (
            <button
              type="button"
              onClick={playAudioCaptcha}
              disabled={isPlayingAudio || loading}
              title="Listen to Audio CAPTCHA"
              aria-label="Play audio CAPTCHA"
              className="h-full w-10 text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer font-bold text-sm"
            >
              {isPlayingAudio ? "🔊..." : "🔊"}
            </button>
          )}

          <button
            type="button"
            onClick={fetchCaptcha}
            disabled={loading}
            title="Refresh CAPTCHA"
            aria-label="Refresh CAPTCHA"
            className="h-full w-10 text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer font-bold text-sm"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Row 2: Code Input + Verify Button */}
      <div className="flex items-stretch gap-2 w-full h-11">
        <input
          type="text"
          value={answer}
          onChange={handleAnswerChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              verifyCaptchaCode();
            }
          }}
          disabled={isVerified}
          aria-label="CAPTCHA code"
          className={`flex-1 h-full px-4 border rounded-xl focus:outline-none text-center tracking-widest text-sm font-bold transition-all box-border leading-none ${
            isVerified
              ? "bg-emerald-50 border-emerald-500 text-emerald-900"
              : "bg-white border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800"
          }`}
          placeholder="Enter Code"
          maxLength={10}
        />

        <button
          type="button"
          onClick={() => verifyCaptchaCode()}
          disabled={isVerifying || isVerified || !answer.trim()}
          aria-label="Verify CAPTCHA code"
          className={`h-full px-5 text-xs font-extrabold rounded-xl border transition-all flex items-center justify-center cursor-pointer whitespace-nowrap box-border leading-none ${
            isVerified
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {isVerifying ? "Checking..." : isVerified ? "✓ Verified" : "Verify"}
        </button>
      </div>

      {/* Verification Status Feedback */}
      {isVerified && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-full text-center">
          ✅ CAPTCHA Verified Successfully!
        </div>
      )}

      {verifyError && (
        <div className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 w-full text-center">
          ⚠️ {verifyError}
        </div>
      )}
    </div>
  );
}

