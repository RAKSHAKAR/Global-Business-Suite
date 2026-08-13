"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaptchaValue = { id: string; token: string; verified: boolean };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

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

export function Captcha({ onChange }: { onChange: (value: CaptchaValue) => void }) {
  const [id, setId] = useState("");
  const [captchaText, setCaptchaText] = useState("");
  const [image, setImage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "checking" | "verified" | "error">("loading");
  const [message, setMessage] = useState("");

  const activeAudioCtxRef = useRef<AudioContext | null>(null);

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

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const playAudioCaptcha = async () => {
    if (!id || isPlayingAudio) return;
    setIsPlayingAudio(true);

    try {
      // 1. Speak characters using Web Speech API for crystal-clear spoken articulation
      let spokenWebSpeech = false;
      const targetText = captchaText || token.trim();
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
          const fetchUrl = audioUrl || `${API_BASE}/api/v1/auth/captcha/audio/${id}`;
          const res = await fetch(fetchUrl, { cache: "no-store" });
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

                await new Promise<void>((resolve, reject) => {
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

  const refresh = useCallback(async () => {
    stopAudio();
    setStatus("loading");
    setMessage("");
    setToken("");
    setIsPlayingAudio(false);
    onChange({ id: "", token: "", verified: false });
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/captcha`, { cache: "no-store" });
      const body = await response.json();
      const captcha = body.data || body;
      if (!response.ok || !captcha.id || !captcha.image) throw new Error(captcha.error || "CAPTCHA is unavailable.");
      setId(captcha.id);
      setCaptchaText(captcha.audioText || "");
      setImage(captcha.image);
      setAudioUrl(captcha.audioUrl ? `${API_BASE}${captcha.audioUrl}` : "");
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "CAPTCHA is unavailable.");
    }
  }, [onChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      stopAudio();
    };
  }, [refresh]);

  const verify = async () => {
    if (!id || !token.trim()) return;
    setStatus("checking");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/captcha/verify-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaId: id, captchaToken: token.trim() }),
      });
      const body = await response.json();
      if (!response.ok || !body.valid) throw new Error(body.error || "Incorrect CAPTCHA code.");
      setStatus("verified");
      setMessage("CAPTCHA verified successfully.");
      onChange({ id, token: token.trim(), verified: true });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "CAPTCHA verification failed.");
      onChange({ id, token: token.trim(), verified: false });
    }
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-slate-50 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-gray-700">Security check</legend>
      <div className="flex min-w-0 items-stretch gap-2">
        <div
          className="flex h-12 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-1 [&_svg]:h-full [&_svg]:max-w-full"
          aria-label="CAPTCHA image"
          dangerouslySetInnerHTML={{ __html: status === "loading" ? "Loading…" : image }}
        />
        {audioUrl && (
          <button
            type="button"
            title="Listen to Audio CAPTCHA"
            aria-label="Play audio CAPTCHA"
            disabled={isPlayingAudio || status === "loading"}
            className="min-w-11 rounded-lg border border-gray-300 bg-white px-3 text-slate-600 hover:text-blue-600 disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors"
            onClick={playAudioCaptcha}
          >
            🔊 {isPlayingAudio ? "..." : ""}
          </button>
        )}
        <button
          type="button"
          title="Refresh CAPTCHA"
          aria-label="Refresh CAPTCHA"
          className="min-w-11 rounded-lg border border-gray-300 bg-white px-3 text-slate-600 hover:text-blue-600 flex items-center justify-center cursor-pointer transition-colors"
          onClick={() => void refresh()}
        >
          🔄
        </button>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input
          value={token}
          onChange={(event) => {
            setToken(event.target.value);
            if (status === "verified") setStatus("ready");
            onChange({ id, token: event.target.value, verified: false });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void verify();
            }
          }}
          disabled={status === "verified"}
          placeholder="Enter Code"
          aria-label="CAPTCHA code"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-center font-bold tracking-widest"
        />
        <button
          type="button"
          onClick={() => void verify()}
          disabled={!token.trim() || status === "checking" || status === "verified"}
          className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {status === "checking" ? "Checking…" : status === "verified" ? "Verified" : "Verify"}
        </button>
      </div>
      {message && (
        <p role={status === "error" ? "alert" : "status"} className={`text-xs font-semibold ${status === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </fieldset>
  );
}
