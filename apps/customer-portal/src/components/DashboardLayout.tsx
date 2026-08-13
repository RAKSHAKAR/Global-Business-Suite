"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  ChartBarIcon,
  CalendarIcon,
  MegaphoneIcon,
  StarIcon,
  Cog8ToothIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  MicrophoneIcon,
  ArrowLeftOnRectangleIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  FolderIcon,
  ShieldCheckIcon,
  BellIcon,
  CpuChipIcon,
  PhotoIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/app/AuthContext";
import { PortalSwitcher, ThemeSwitcher } from "./PortalControls";

interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const navItems = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "My Services", href: "/services", icon: CpuChipIcon },
  { name: "Orders & Tracking", href: "/orders", icon: ShoppingBagIcon },
  { name: "Appointments", href: "/appointments", icon: CalendarIcon },
  { name: "Google Business", href: "/gbp", icon: StarIcon },
  { name: "Google Media", href: "/google-media", icon: PhotoIcon },
  { name: "Reviews & Ratings", href: "/reviews", icon: StarIcon },
  { name: "Review Requests", href: "/review-requests", icon: PaperAirplaneIcon },
  { name: "Messages & Chat", href: "/messages", icon: ChatBubbleLeftRightIcon },
  { name: "Unified Inbox", href: "/inbox", icon: ChatBubbleLeftRightIcon },
  { name: "Support Center", href: "/support", icon: QuestionMarkCircleIcon },
  { name: "AI Support Assistant", href: "/ai-assistant", icon: SparklesIcon },
  { name: "Instant AI FAQ", href: "/ai-faq", icon: QuestionMarkCircleIcon },
  { name: "Customer AI Copilot", href: "/copilot", icon: SparklesIcon },
  { name: "AI Poster Studio", href: "/ai-poster", icon: SparklesIcon },
  { name: "Social Media Hub", href: "/social", icon: MegaphoneIcon },
  { name: "Social & Event Calendar", href: "/calendar", icon: CalendarIcon },
  { name: "Voice & Callbacks", href: "/call-requests", icon: MicrophoneIcon },
  { name: "Marketing Scorecard", href: "/score", icon: ChartBarIcon },
  { name: "Marketing Tracker", href: "/marketing-tracker", icon: ChartBarIcon },
  { name: "Growth Telemetry", href: "/performance", icon: ChartBarIcon },
  { name: "Document Vault", href: "/documents", icon: FolderIcon },
  { name: "Payments & Invoices", href: "/payments", icon: CreditCardIcon },
  { name: "My Plan", href: "/my-plan", icon: CreditCardIcon },
  { name: "Reports & Analytics", href: "/reports", icon: ChartBarIcon },
  { name: "CSAT & Feedback", href: "/feedback", icon: QuestionMarkCircleIcon },
  { name: "Notifications", href: "/notifications", icon: BellIcon },
  { name: "Workflows", href: "/workflows", icon: DocumentTextIcon },
  { name: "Security & Account", href: "/account", icon: ShieldCheckIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AI Voice Assistant State
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"listening" | "processing" | "routed" | "error">("listening");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [textCommand, setTextCommand] = useState("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  const processCommand = (cmd: string) => {
    const text = cmd.toLowerCase().trim();
    setVoiceTranscript(cmd);
    setVoiceStatus("processing");

    let targetPath = "";
    let responseText = "";

    if (text.includes("review request") || text.includes("request review")) {
      targetPath = "/review-requests";
      responseText = "Opening Review Requests...";
    } else if (text.includes("review")) {
      targetPath = "/reviews";
      responseText = "Opening Reviews & Ratings Dashboard...";
    } else if (text.includes("poster") || text.includes("ai poster") || text.includes("generate") || text.includes("image")) {
      targetPath = "/ai-poster";
      responseText = "Opening AI Poster Studio...";
    } else if (text.includes("google media") || text.includes("business photo")) {
      targetPath = "/google-media";
      responseText = "Opening Google Media...";
    } else if (text.includes("gbp") || text.includes("google business") || text.includes("location")) {
      targetPath = "/gbp";
      responseText = "Opening Google Business Profile...";
    } else if (text.includes("social") || text.includes("post") || text.includes("channel")) {
      targetPath = "/social";
      responseText = "Opening Social Media Channels...";
    } else if (text.includes("calendar") || text.includes("schedule")) {
      targetPath = "/calendar";
      responseText = "Opening Social Media Calendar...";
    } else if (text.includes("score") || text.includes("reputation")) {
      targetPath = "/score";
      responseText = "Opening Marketing Score Dashboard...";
    } else if (text.includes("performance") || text.includes("analytics")) {
      targetPath = "/performance";
      responseText = "Opening Performance Metrics...";
    } else if (text.includes("setting") || text.includes("profile")) {
      targetPath = "/settings";
      responseText = "Opening Account Settings...";
    } else if (text.includes("home") || text.includes("dashboard")) {
      targetPath = "/";
      responseText = "Navigating to Main Dashboard...";
    } else {
      responseText = `Understood: "${cmd}". Routing to AI engine...`;
    }

    setVoiceResponse(responseText);
    setVoiceStatus("routed");

    if (targetPath) {
      setTimeout(() => {
        router.push(targetPath);
        setVoiceModalOpen(false);
      }, 1200);
    } else {
      setTimeout(() => {
        setVoiceModalOpen(false);
      }, 2500);
    }
  };

  const startVoiceAssistant = () => {
    setVoiceModalOpen(true);
    setVoiceStatus("listening");
    setVoiceTranscript("");
    setVoiceResponse("");
    setTextCommand("");

    if (typeof window !== "undefined") {
      const speechWindow = window as SpeechRecognitionWindow;
      const SpeechRecognition =
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setVoiceStatus("error");
        setVoiceResponse("Web Speech API not available. Type your command below.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: SpeechRecognitionResultEvent) => {
          const transcript = event.results[0][0].transcript;
          processCommand(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn("Speech recognition error:", event.error);
          setVoiceStatus("error");
          setVoiceResponse("Listening stopped. Type your command below or click mic.");
        };

        recognition.start();
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
        setVoiceStatus("error");
        setVoiceResponse("Type your command below.");
      }
    }
  };

  const handleLogout = logout;

  return (
    <div className="gbs-customer-shell h-[100dvh] w-full bg-gradient-premium flex flex-col md:flex-row overflow-hidden">
      {/* ── Desktop Side Navigation ── */}
      <aside className="hidden md:flex w-64 glass border-r border-gray-200 flex-col h-full flex-shrink-0" aria-label="Customer portal navigation">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md">
              GBS
            </span>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Customer Portal
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Global Business Suite
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(138,43,226,0.2)]"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-[#D4AF37]" : ""}`}
                />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200/50 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 pb-2">
            <ThemeSwitcher compact />
            <PortalSwitcher compact />
          </div>
          <Link
            href="/settings"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <Cog8ToothIcon className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <UserCircleIcon className="w-5 h-5" />
            <span className="font-medium">Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Sign out of Customer Portal"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium cursor-pointer"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* ── Mobile Header ── */}
        <div className="md:hidden glass z-40 flex items-center justify-between px-4 h-16 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
              GBS
            </span>
            <span className="hidden sm:inline text-base font-bold text-gray-900">
              Customer Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <PortalSwitcher compact />
            <button
              onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
              className="text-gray-600 p-2"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="customer-mobile-navigation"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile Menu Overlay ── */}
        {mobileMenuOpen && (
          <div id="customer-mobile-navigation" className="md:hidden absolute inset-0 z-30 pt-16 glass flex flex-col h-full overflow-hidden">
            <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto" aria-label="Mobile primary navigation">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center space-x-4 px-4 py-4 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30"
                        : "text-gray-600 hover:bg-white/10"
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-lg font-medium">{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                aria-label="Sign out of Customer Portal"
                className="w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-red-600 hover:bg-red-50 transition-all text-left"
              >
                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                <span className="text-lg font-medium">Sign Out</span>
              </button>
            </nav>
          </div>
        )}

        {/* ── Main Content Area (Scrollable) ── */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative w-full h-full pb-safe">
          <div className="max-w-[1600px] mx-auto w-full min-h-full">
            {children}
          </div>
        </main>

        {/* ── Floating AI Voice Button & Modal ── */}
        <button
          onClick={() => startVoiceAssistant()}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-[#8a2be2] to-[#ff007f] flex items-center justify-center animate-float glow-primary hover:scale-105 transition-transform border-2 border-white/20 shadow-xl cursor-pointer"
          aria-label="AI Voice Assistant"
          title="Click to speak to AI Assistant"
        >
          <MicrophoneIcon className="w-8 h-8 text-white" />
        </button>

        {/* Voice Assistant Modal */}
        {voiceModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all" role="dialog" aria-modal="true" aria-labelledby="voice-assistant-title">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-100 flex flex-col items-center relative space-y-5 animate-in fade-in zoom-in duration-200">
              {/* Close Button */}
              <button
                onClick={() => setVoiceModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close voice assistant"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              {/* Status Visualizer Icon */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    voiceStatus === "listening"
                      ? "bg-purple-600/20 animate-ping"
                      : voiceStatus === "processing"
                      ? "bg-amber-500/20 animate-pulse"
                      : "bg-emerald-500/20"
                  }`}
                />
                <div
                  className={`absolute w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg ${
                    voiceStatus === "listening"
                      ? "bg-gradient-to-r from-purple-600 to-pink-500"
                      : voiceStatus === "processing"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600"
                  }`}
                >
                  <MicrophoneIcon className="w-8 h-8" />
                </div>
              </div>

              {/* Text / Status Heading */}
              <div className="text-center space-y-1">
                <h3 id="voice-assistant-title" className="text-xl font-bold text-gray-900">
                  {voiceStatus === "listening" && "Listening..."}
                  {voiceStatus === "processing" && "Processing Intent..."}
                  {voiceStatus === "routed" && "Action Executed!"}
                  {voiceStatus === "error" && "Voice Input Ready"}
                </h3>
                <p className="text-xs text-gray-500">
                  {voiceStatus === "listening"
                    ? "Speak your command clearly (e.g. 'Open reviews', 'Create AI poster')"
                    : voiceStatus === "processing"
                    ? "Routing command to AI engine..."
                    : "Command executed"}
                </p>
              </div>

              {/* Transcript Display */}
              {voiceTranscript && (
                <div className="w-full bg-purple-50/80 border border-purple-100 rounded-2xl p-4 text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">
                    You Said
                  </p>
                  <p className="text-sm font-medium text-purple-950 italic">
                    <q>{voiceTranscript}</q>
                  </p>
                </div>
              )}

              {/* Action Response Display */}
              {voiceResponse && (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-900 text-sm font-semibold flex items-center justify-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{voiceResponse}</span>
                </div>
              )}

              {/* Command Input Fallback for Manual Typing */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textCommand.trim()) {
                    processCommand(textCommand);
                    setTextCommand("");
                  }
                }}
                className="w-full flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={textCommand}
                  onChange={(e) => setTextCommand(e.target.value)}
                  placeholder="Or type a command (e.g., 'go to score')..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  Run
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Mobile Bottom Navigation ── */}
        <div className="md:hidden glass border-t border-gray-200 z-50 flex items-center justify-around px-2 h-16 flex-shrink-0 w-full pb-safe">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/" ? "text-[#D4AF37]" : "text-gray-500"}`}
          >
            <HomeIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/gbp"
            aria-current={pathname?.startsWith("/gbp") ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname?.startsWith("/gbp") ? "text-[#D4AF37]" : "text-gray-500"}`}
          >
            <StarIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">GBP</span>
          </Link>
          <Link
            href="/social"
            aria-current={pathname?.startsWith("/social") ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname?.startsWith("/social") ? "text-[#D4AF37]" : "text-gray-500"}`}
          >
            <MegaphoneIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Social</span>
          </Link>
          <Link
            href="/ai-poster"
            aria-current={pathname === "/ai-poster" ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/ai-poster" ? "text-[#D4AF37]" : "text-gray-500"}`}
          >
            <SparklesIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">AI Tools</span>
          </Link>
          <Link
            href="/profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/profile" ? "text-[#D4AF37]" : "text-gray-500"}`}
          >
            <UserCircleIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
