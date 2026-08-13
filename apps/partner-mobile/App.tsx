import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import {
  PARTNER_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  BIOMETRIC_UNAVAILABLE_MESSAGE,
  authenticateWithPassword,
  resolveServiceUrl,
} from "./mobileModel";
import { ThemeModeControl, ThemeProvider, useThemePreferences } from "./ThemeProvider";
import { usePortalSession } from "./usePortalSession";
import { loadPartnerDashboard, type PartnerDashboardData } from "./dashboardData";

const PARTNER_LOGIN_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/login",
});
const PARTNER_PROFILE_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/me",
});
const PARTNER_LOGOUT_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/logout",
});
const PARTNER_DASHBOARD_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/partner/dashboard-metrics",
});
const PARTNER_EXPECTED_ROLES = ["PARTNER", "PARTNER_ADMIN"] as const;
const PARTNER_PORTAL_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_PARTNER_PORTAL_URL,
  platform: Platform.OS,
  port: 3001,
});

type PartnerTab =
  | "DASHBOARD"
  | "ANALYTICS"
  | "GBP"
  | "SOCIAL"
  | "CRM"
  | "TASKS"
  | "AI_ASSISTANT"
  | "NOTIFICATIONS"
  | "SEARCH"
  | "SETTINGS"
  | "UNIFIED_INBOX"
  | "CALL_CENTER"
  | "APPOINTMENTS";

function PartnerMobileApp() {
  const [activeTab, setActiveTab] = useState<PartnerTab>("DASHBOARD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<PartnerDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const {
    isLoggedIn,
    sessionToken,
    restoringSession,
    error: authError,
    setError: setAuthError,
    establishSession,
    logout,
  } = usePortalSession({
    profileUrl: PARTNER_PROFILE_URL,
    logoutUrl: PARTNER_LOGOUT_URL,
    expectedRoles: PARTNER_EXPECTED_ROLES,
    portalName: "GBS Partner Mobile",
  });

  // Features State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrScannerModal, setQrScannerModal] = useState(false);

  const { isDark } = useThemePreferences();
  const currentStyles = isDark ? darkStyles : lightStyles;

  const refreshDashboard = useCallback(async () => {
    if (!sessionToken) return;
    setDashboardLoading(true);
    setDashboardError("");
    const result = await loadPartnerDashboard({ token: sessionToken, endpoint: PARTNER_DASHBOARD_URL });
    if (result.ok) {
      setDashboardData(result.data);
    } else {
      setDashboardData(null);
      setDashboardError(result.error);
    }
    setDashboardLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    if (isLoggedIn && sessionToken) {
      void refreshDashboard();
    } else {
      setDashboardData(null);
      setDashboardError("");
      setDashboardLoading(false);
    }
  }, [isLoggedIn, refreshDashboard, sessionToken]);

  const handleLogin = async () => {
    if (!email || !password) {
      const message = "Please enter your partner credentials.";
      setAuthError(message);
      Alert.alert("Authentication Error", message);
      return;
    }

    setAuthError("");
    setLoading(true);
    try {
      const result = await authenticateWithPassword({
        email,
        password,
        endpoint: PARTNER_LOGIN_URL,
      });

      if (result.ok) {
        await establishSession(result.token);
      } else {
        setAuthError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = () => {
    setAuthError(BIOMETRIC_UNAVAILABLE_MESSAGE);
    Alert.alert("Biometric Sign-in Unavailable", BIOMETRIC_UNAVAILABLE_MESSAGE);
  };

  const handleLogout = async () => {
    setActiveTab("DASHBOARD");
    setPassword("");
    await logout();
  };

  const handleAiGenerate = () => {
    if (!aiPrompt) return;
    setAiResult("Opening the provider-backed AI Assistant in the Partner Portal…");
    void openPartnerPortal(`/ai-assistant?prompt=${encodeURIComponent(aiPrompt)}`);
  };

  const openPartnerPortal = async (path = "") => {
    const url = `${PARTNER_PORTAL_URL.replace(/\/$/, "")}${path ? `/${path.replace(/^\//, "")}` : ""}`;
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error("Unsupported URL");
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Partner Portal Unavailable",
        `Could not open ${url}. Confirm the web portal is running or configure EXPO_PUBLIC_PARTNER_PORTAL_URL.`,
      );
    }
  };

  return (
    <View style={currentStyles.outerContainer}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={currentStyles.header}>
        <View>
          <Text style={currentStyles.headerTitle}>GBS Partner Mobile</Text>
          <Text style={currentStyles.headerSubtitle}>Omnichannel Partner Suite</Text>
        </View>
        <ThemeModeControl />
      </View>

      {restoringSession ? (
        <View
          accessibilityLabel="Restoring secure partner session"
          accessibilityRole="progressbar"
          style={currentStyles.restoringContainer}
        >
          <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
          <Text style={currentStyles.subText}>Restoring secure session...</Text>
        </View>
      ) : isLoggedIn ? (
        <View style={currentStyles.mainWrapper}>
          {/* Horizontal Navigation Tab Bar */}
          <ScrollView
            accessibilityLabel="Partner app navigation"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={currentStyles.tabBarContent}
            style={currentStyles.tabBar}
          >
            {PARTNER_TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                accessibilityLabel={t.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === t.id }}
                style={[
                  currentStyles.tabButton,
                  activeTab === t.id && currentStyles.activeTabButton,
                ]}
                onPress={() => setActiveTab(t.id as PartnerTab)}
              >
                <Text style={[currentStyles.tabText, activeTab === t.id && currentStyles.activeTabText]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={currentStyles.content}>
            {activeTab === "DASHBOARD" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Partner Business Overview</Text>
                {dashboardLoading ? (
                  <View accessibilityLabel="Loading partner dashboard data" accessibilityRole="progressbar">
                    <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
                    <Text style={currentStyles.subText}>Loading tenant dashboard counts...</Text>
                  </View>
                ) : dashboardError ? (
                  <View>
                    <Text accessibilityRole="alert" style={[currentStyles.subText, { color: "#f87171" }]}> 
                      {dashboardError}
                    </Text>
                    <TouchableOpacity style={currentStyles.primaryButton} onPress={() => void refreshDashboard()}>
                      <Text style={currentStyles.primaryButtonText}>Retry Dashboard</Text>
                    </TouchableOpacity>
                  </View>
                ) : dashboardData ? (
                  <>
                    <View style={currentStyles.metricsGrid}>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Clients</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.clients}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Social Posts</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.socialPosts}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Pending Tasks</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.pendingTasks}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Open Tickets</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.openTickets}</Text>
                      </View>
                    </View>
                    <Text style={currentStyles.subText}>
                      {dashboardData.reviews > 0 && dashboardData.reviewAverage !== null
                        ? `${dashboardData.locations} locations · ${dashboardData.reviews} reviews · ${dashboardData.reviewAverage.toFixed(1)} average`
                        : `${dashboardData.locations} locations · No tenant reviews recorded`}
                    </Text>
                  </>
                ) : (
                  <Text style={currentStyles.subText}>No partner dashboard data is available.</Text>
                )}
              </View>
            )}

            {activeTab === "ANALYTICS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Partner BI Executive Scorecard</Text>
                <Text style={currentStyles.subText}>
                  Analytics records are not loaded into the native app. Open the Partner Portal for persisted metrics and report exports.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/analytics")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Partner Analytics</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "GBP" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Google Business Profile Management</Text>
                <Text style={currentStyles.subText}>
                  Location verification and review records are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/gbp")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open GBP Workspace</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SOCIAL" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Enterprise Social Media Suite</Text>
                <Text style={currentStyles.subText}>
                  Connected-channel and inbox status is checked in the authenticated Partner Portal.
                </Text>
                <View style={{ flexDirection: "column", gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={currentStyles.primaryButton}
                    onPress={() => void openPartnerPortal("/social")}
                  >
                    <Text style={currentStyles.primaryButtonText}>Open Social Composer</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={[currentStyles.primaryButton, { flex: 1, backgroundColor: "#3b82f6" }]}
                      onPress={() => void openPartnerPortal("/files")}
                    >
                      <Text style={currentStyles.primaryButtonText}>Open Media Library</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[currentStyles.primaryButton, { flex: 1, backgroundColor: "#8b5cf6" }]}
                      onPress={() => void openPartnerPortal("/social")}
                    >
                      <Text style={currentStyles.primaryButtonText}>Open Draft Composer</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[currentStyles.primaryButton, { backgroundColor: "#10b981" }]}
                    onPress={() => void openPartnerPortal("/unified-inbox")}
                  >
                    <Text style={currentStyles.primaryButtonText}>Open Unified Social Inbox</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === "CRM" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Customer CRM & Lead Pipeline</Text>
                <Text style={currentStyles.subText}>
                  Lead records and conversion metrics are not loaded into this native view.
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={currentStyles.primaryButton}
                    onPress={() => void openPartnerPortal("/crm")}
                  >
                    <Text style={currentStyles.primaryButtonText}>Open Partner CRM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={currentStyles.primaryButton}
                    onPress={() => setQrScannerModal(true)}
                  >
                    <Text style={currentStyles.primaryButtonText}>Card Scan Options</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === "TASKS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Tasks & Client Workflows</Text>
                <Text style={currentStyles.subText}>
                  Task records are not loaded into the native app.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/calendar-tasks")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Tasks & Calendar</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "AI_ASSISTANT" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Omnichannel AI Assistant</Text>
                <Text style={currentStyles.subText}>
                  Native generation is not configured. Your prompt will be handed to the authenticated Partner Portal without claiming content was generated here.
                </Text>
                <TextInput
                  style={currentStyles.input}
                  placeholder="Enter prompt for AI..."
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                />
                <TouchableOpacity style={currentStyles.primaryButton} onPress={handleAiGenerate}>
                  <Text style={currentStyles.primaryButtonText}>Continue in AI Assistant</Text>
                </TouchableOpacity>
                {aiResult !== "" && <Text style={currentStyles.aiOutput}>{aiResult}</Text>}
              </View>
            )}

            {activeTab === "UNIFIED_INBOX" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Unified Social Inbox</Text>
                <Text style={currentStyles.subText}>
                  Conversation and unread-message records are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={[currentStyles.primaryButton, { backgroundColor: "#10b981" }]}
                  onPress={() => void openPartnerPortal("/unified-inbox")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Unified Inbox</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "CALL_CENTER" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Virtual Call Center</Text>
                <Text style={currentStyles.subText}>
                  Call, voicemail, and transcription records are not loaded into the native app.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/call-center")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Call Center</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "APPOINTMENTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Appointments & Bookings</Text>
                <Text style={currentStyles.subText}>
                  Appointment records are not loaded into the native app.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/appointments")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Booking Tools</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "NOTIFICATIONS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Push Notifications & Alerts</Text>
                <Text style={currentStyles.subText}>
                  Native push delivery is not configured in this build. Notification records and provider settings remain in the Partner Portal.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal("/notifications")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Notifications</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SEARCH" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Partner Search</Text>
                <Text style={currentStyles.subText}>
                  Native voice capture is not configured. Enter a query and continue in the authenticated CRM workspace.
                </Text>
                <TextInput
                  style={currentStyles.input}
                  placeholder="Search CRM records..."
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openPartnerPortal(`/crm?search=${encodeURIComponent(searchQuery.trim())}`)}
                >
                  <Text style={currentStyles.primaryButtonText}>Open CRM Search</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SETTINGS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Security & Preferences</Text>
                <View style={currentStyles.switchRow}>
                  <Text style={currentStyles.switchLabel}>Biometric Sign-in (Not Configured)</Text>
                  <Switch value={BIOMETRIC_AUTH_AVAILABLE} disabled />
                </View>
                <Text style={currentStyles.subText}>
                  Offline caching and background synchronization are not configured in this build. Theme preference remains stored on this device.
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Open Partner Web Portal"
                  accessibilityRole="link"
                  style={currentStyles.primaryButton}
                  onPress={() => openPartnerPortal()}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Partner Web Portal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Sign Out / Logout"
                  accessibilityRole="button"
                  style={currentStyles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={currentStyles.logoutButtonText}>Sign Out / Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={currentStyles.authContainer}>
          <View style={currentStyles.card}>
            <Text style={currentStyles.cardHeader}>Partner Sign In</Text>

            <TextInput
              style={currentStyles.input}
              placeholder="Business Email (partner@tenant.com)"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={currentStyles.input}
              placeholder="Password"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {authError ? (
              <Text style={[currentStyles.subText, { color: "#f87171", textAlign: "center" }]}> 
                {authError}
              </Text>
            ) : null}

            <TouchableOpacity
              accessibilityLabel="Sign In"
              accessibilityRole="button"
              style={currentStyles.primaryButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={currentStyles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Biometric Sign-in Unavailable"
              accessibilityRole="button"
              style={currentStyles.biometricButton}
              onPress={handleBiometricAuth}
            >
              <Text style={currentStyles.biometricButtonText}>Biometric Sign-in (Unavailable)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Create Partner Account"
              accessibilityRole="link"
              onPress={() => openPartnerPortal("/register")}
              style={{ marginTop: 12 }}
            >
              <Text style={currentStyles.linkText}>Create Partner Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open Partner Web Portal"
              accessibilityRole="link"
              onPress={() => openPartnerPortal()}
              style={{ marginTop: 4 }}
            >
              <Text style={currentStyles.linkText}>Open Partner Web Portal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Native card scanning is not configured; provide an honest web handoff. */}
      <Modal visible={qrScannerModal} animationType="slide" transparent>
        <View style={currentStyles.modalOverlay}>
          <View style={currentStyles.modalContent}>
            <Text style={currentStyles.modalTitle}>Card Scanning Unavailable</Text>
            <Text style={currentStyles.subText}>
              Camera scanning and lead extraction are not configured in this mobile build. No lead has been created.
            </Text>
            <TouchableOpacity
              style={currentStyles.primaryButton}
              onPress={() => {
                setQrScannerModal(false);
                void openPartnerPortal("/crm");
              }}
            >
              <Text style={currentStyles.primaryButtonText}>Open Partner CRM</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setQrScannerModal(false)} style={{ marginTop: 12 }}>
              <Text style={currentStyles.linkText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PartnerMobileApp />
    </ThemeProvider>
  );
}

const darkStyles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  headerSubtitle: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  themeToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#334155" },
  themeToggleText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  offlineBanner: { backgroundColor: "#b45309", paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
  offlineBannerText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  mainWrapper: { flex: 1 },
  tabBar: { flexGrow: 0, flexShrink: 0, maxHeight: 64, backgroundColor: "#0f172a" },
  tabBarContent: { flexDirection: "row", alignItems: "center", padding: 10 },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  activeTabButton: { backgroundColor: "#d97706", borderColor: "#fbbf24" },
  tabText: { color: "#94a3b8", fontSize: 12, fontWeight: "bold" },
  activeTabText: { color: "#ffffff" },
  content: { padding: 16, gap: 16 },
  authContainer: { flexGrow: 1, padding: 20, justifyContent: "center" },
  restoringContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  cardHeader: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  subText: { fontSize: 13, color: "#94a3b8" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  metricCard: {
    width: "47%",
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  metricLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "bold", color: "#ffffff", marginTop: 4 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  itemTitle: { fontSize: 13, fontWeight: "bold", color: "#ffffff" },
  badgeButton: { backgroundColor: "#d97706", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    color: "#ffffff",
    fontSize: 14,
  },
  primaryButton: { backgroundColor: "#d97706", padding: 14, borderRadius: 12, alignItems: "center", flex: 1 },
  primaryButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  biometricButton: { backgroundColor: "#047857", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  biometricButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  logoutButton: { backgroundColor: "#dc2626", padding: 14, borderRadius: 12, alignItems: "center" },
  logoutButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 14,
    borderRadius: 12,
  },
  switchLabel: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  aiOutput: {
    color: "#fbbf24",
    fontSize: 12,
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#b45309",
  },
  linkText: { color: "#fbbf24", fontSize: 13, textAlign: "center", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#1e293b", borderRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
});

const lightStyles = StyleSheet.create({
  ...darkStyles,
  outerContainer: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  headerSubtitle: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  themeToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#e2e8f0" },
  themeToggleText: { color: "#0f172a", fontSize: 12, fontWeight: "bold" },
  tabBar: { flexGrow: 0, flexShrink: 0, maxHeight: 64, backgroundColor: "#f8fafc" },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tabText: { color: "#64748b", fontSize: 12, fontWeight: "bold" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  cardHeader: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  subText: { fontSize: 13, color: "#64748b" },
  metricCard: {
    width: "47%",
    backgroundColor: "#f1f5f9",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  metricLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginTop: 4 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  itemTitle: { fontSize: 13, fontWeight: "bold", color: "#0f172a" },
  input: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    color: "#0f172a",
    fontSize: 14,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 14,
    borderRadius: 12,
  },
  switchLabel: { color: "#0f172a", fontSize: 14, fontWeight: "500" },
  linkText: { color: "#b45309", fontSize: 13, textAlign: "center", fontWeight: "600" },
  modalContent: { backgroundColor: "#ffffff", borderRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
});
