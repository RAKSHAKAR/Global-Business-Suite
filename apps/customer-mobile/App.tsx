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
  CUSTOMER_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  BIOMETRIC_UNAVAILABLE_MESSAGE,
  authenticateWithPassword,
  resolveServiceUrl,
} from "./mobileModel";
import { ThemeModeControl, ThemeProvider, useThemePreferences } from "./ThemeProvider";
import { usePortalSession } from "./usePortalSession";
import { loadCustomerDashboard, type CustomerDashboardData } from "./dashboardData";

const CUSTOMER_LOGIN_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/login",
});
const CUSTOMER_PROFILE_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/me",
});
const CUSTOMER_LOGOUT_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/logout",
});
const CUSTOMER_DASHBOARD_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/customer/dashboard-summary",
});
const CUSTOMER_EXPECTED_ROLES = ["CUSTOMER"] as const;
const CUSTOMER_PORTAL_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_CUSTOMER_PORTAL_URL,
  platform: Platform.OS,
  port: 3002,
});

type TabType =
  | "DASHBOARD"
  | "REPORTS"
  | "GBP"
  | "SERVICES"
  | "ORDERS"
  | "APPOINTMENTS"
  | "MESSAGES"
  | "AI_TOOLS"
  | "DOCUMENTS"
  | "PAYMENTS"
  | "SETTINGS"
  | "CALL_REQUESTS";

function CustomerMobileApp() {
  const [currentTab, setCurrentTab] = useState<TabType>("DASHBOARD");

  // AI handoff state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [docModal, setDocModal] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
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
    profileUrl: CUSTOMER_PROFILE_URL,
    logoutUrl: CUSTOMER_LOGOUT_URL,
    expectedRoles: CUSTOMER_EXPECTED_ROLES,
    portalName: "GBS Customer Mobile",
  });

  const { isDark } = useThemePreferences();
  const currentStyles = isDark ? darkStyles : lightStyles;

  const refreshDashboard = useCallback(async () => {
    if (!sessionToken) return;
    setDashboardLoading(true);
    setDashboardError("");
    const result = await loadCustomerDashboard({ token: sessionToken, endpoint: CUSTOMER_DASHBOARD_URL });
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
      const message = "Please enter your credentials.";
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
        endpoint: CUSTOMER_LOGIN_URL,
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

  const runAiTool = (query: string) => {
    const q = query || "general inquiry";
    setAiResponse(`Opening the provider-backed AI Assistant for “${q}”…`);
    void openCustomerPortal(`/ai-assistant?prompt=${encodeURIComponent(q)}`);
  };

  const handleBiometricAuth = () => {
    setAuthError(BIOMETRIC_UNAVAILABLE_MESSAGE);
    Alert.alert("Biometric Sign-in Unavailable", BIOMETRIC_UNAVAILABLE_MESSAGE);
  };

  const handleLogout = async () => {
    setCurrentTab("DASHBOARD");
    setPassword("");
    await logout();
  };

  const openCustomerPortal = async (path = "") => {
    const url = `${CUSTOMER_PORTAL_URL.replace(/\/$/, "")}${path ? `/${path.replace(/^\//, "")}` : ""}`;
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error("Unsupported URL");
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Customer Portal Unavailable",
        `Could not open ${url}. Confirm the web portal is running or configure EXPO_PUBLIC_CUSTOMER_PORTAL_URL.`,
      );
    }
  };

  return (
    <View style={currentStyles.outerContainer}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header Bar */}
      <View style={currentStyles.header}>
        <View>
          <Text style={currentStyles.headerTitle}>GBS Customer Mobile</Text>
          <Text style={currentStyles.headerSubtitle}>Phase 7 Enterprise Self-Service</Text>
        </View>
        <ThemeModeControl />
      </View>

      {restoringSession ? (
        <View
          accessibilityLabel="Restoring secure customer session"
          accessibilityRole="progressbar"
          style={currentStyles.restoringContainer}
        >
          <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
          <Text style={currentStyles.cardSubtitle}>Restoring secure session...</Text>
        </View>
      ) : isLoggedIn ? (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={currentStyles.content}>
            {currentTab === "DASHBOARD" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Customer Account Overview</Text>
                {dashboardLoading ? (
                  <View accessibilityLabel="Loading customer dashboard data" accessibilityRole="progressbar">
                    <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
                    <Text style={currentStyles.cardSubtitle}>Loading your tenant records...</Text>
                  </View>
                ) : dashboardError ? (
                  <View>
                    <Text accessibilityRole="alert" style={[currentStyles.cardSubtitle, { color: "#f87171" }]}> 
                      {dashboardError}
                    </Text>
                    <TouchableOpacity style={currentStyles.primaryButton} onPress={() => void refreshDashboard()}>
                      <Text style={currentStyles.buttonText}>Retry Dashboard</Text>
                    </TouchableOpacity>
                  </View>
                ) : dashboardData ? (
                  <>
                    <View style={currentStyles.metricsGrid}>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Orders</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.orders}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Upcoming Appointments</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.upcomingAppointments}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Open Support Tickets</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.openTickets}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Documents</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.documents}</Text>
                      </View>
                    </View>
                    <Text style={currentStyles.cardSubtitle}>
                      {dashboardData.planName
                        ? `${dashboardData.planName} plan · ${dashboardData.subscriptionStatus || "Status unavailable"}`
                        : "No subscription is recorded for this tenant."}
                    </Text>
                    <Text style={currentStyles.cardSubtitle}>
                      {dashboardData.reviews > 0 && dashboardData.reviewAverage !== null
                        ? `${dashboardData.googleLocations} Google locations · ${dashboardData.reviews} reviews · ${dashboardData.reviewAverage.toFixed(1)} average`
                        : `${dashboardData.googleLocations} Google locations · No reviews recorded`}
                    </Text>
                  </>
                ) : (
                  <Text style={currentStyles.cardSubtitle}>No customer dashboard data is available.</Text>
                )}
              </View>
            )}

            {currentTab === "REPORTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Customer Executive Scorecard & Reports</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Report records are not loaded into the native app. Open the Customer Portal for persisted metrics and CSV exports.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/reports")}
                >
                  <Text style={currentStyles.buttonText}>Open Reports & CSV Export</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "GBP" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Business Profile & Updates</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Business-profile, post, and review records are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/gbp")}
                >
                  <Text style={currentStyles.buttonText}>Open Business Profile</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "SERVICES" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Subscribed Services Catalog</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Subscription service records are not loaded into the native app.
                </Text>
                <TouchableOpacity style={currentStyles.primaryButton} onPress={() => void openCustomerPortal("/services")}>
                  <Text style={currentStyles.buttonText}>Open My Services</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "ORDERS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>My Orders & Tracking</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Order and tracking records are not loaded into the native app.
                </Text>
                <TouchableOpacity style={currentStyles.primaryButton} onPress={() => void openCustomerPortal("/orders")}>
                  <Text style={currentStyles.buttonText}>Open Orders & Tracking</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "APPOINTMENTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Appointments & Virtual Sessions</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Appointment records and meeting links are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/appointments")}
                >
                  <Text style={currentStyles.buttonText}>Open Appointments</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "MESSAGES" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Omnichannel Support Messaging</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Conversations and agent-presence records are not loaded into the native app.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/messages")}
                >
                  <Text style={currentStyles.buttonText}>Open Messages</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "AI_TOOLS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Customer AI Assistant</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Native AI generation is not configured. Your prompt will be handed to the authenticated Customer Portal without claiming a result here.
                </Text>
                <TextInput
                  style={currentStyles.input}
                  placeholder="Enter a prompt for the AI Assistant..."
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                />
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => runAiTool(aiPrompt)}
                >
                  <Text style={currentStyles.buttonText}>Continue in AI Assistant</Text>
                </TouchableOpacity>
                {aiResponse !== "" && (
                  <View style={currentStyles.aiBox}>
                    <Text style={currentStyles.aiText}>{aiResponse}</Text>
                  </View>
                )}
              </View>
            )}

            {currentTab === "DOCUMENTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Document Vault & Storage</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Document records are not loaded into the native app. Camera upload is also not configured in this build.
                </Text>
                <TouchableOpacity style={currentStyles.primaryButton} onPress={() => setDocModal(true)}>
                  <Text style={currentStyles.buttonText}>Document Upload Options</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "PAYMENTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Payments & Invoices</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Invoice, payment, and auto-pay records are not loaded into the native app. No payment can be completed in this view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/payments")}
                >
                  <Text style={currentStyles.buttonText}>Open Payments & Invoices</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "CALL_REQUESTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Call Requests & Callbacks</Text>
                <Text style={currentStyles.cardSubtitle}>
                  Callback records and response-time estimates are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal("/call-requests")}
                >
                  <Text style={currentStyles.buttonText}>Open Call Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[currentStyles.primaryButton, { backgroundColor: "#047857", marginTop: 4 }]}
                  onPress={() => void openCustomerPortal("/support")}
                >
                  <Text style={currentStyles.buttonText}>Open Support</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentTab === "SETTINGS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardTitle}>Mobile Hardware & Security</Text>
                <View style={currentStyles.switchRow}>
                  <Text style={currentStyles.switchLabel}>Biometric Sign-in (Not Configured)</Text>
                  <Switch value={BIOMETRIC_AUTH_AVAILABLE} disabled />
                </View>
                <Text style={currentStyles.cardSubtitle}>
                  Push delivery, offline synchronization, location access, and camera permissions are not configured in this build. Theme preference remains stored on this device.
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Open Customer Web Portal"
                  accessibilityRole="link"
                  style={currentStyles.primaryButton}
                  onPress={() => void openCustomerPortal()}
                >
                  <Text style={currentStyles.buttonText}>Open Customer Web Portal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Sign Out / Logout"
                  accessibilityRole="button"
                  style={currentStyles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={currentStyles.buttonText}>Sign Out / Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Bottom Navigation Bar */}
          <ScrollView
            accessibilityLabel="Customer app navigation"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={currentStyles.bottomNavContent}
            style={currentStyles.bottomNav}
          >
            {CUSTOMER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                accessibilityLabel={tab.replace(/_/g, " ")}
                accessibilityRole="tab"
                accessibilityState={{ selected: currentTab === tab }}
                style={[currentStyles.navTab, currentTab === tab && currentStyles.activeNavTab]}
                onPress={() => setCurrentTab(tab as TabType)}
              >
                <Text style={[currentStyles.navText, currentTab === tab && currentStyles.activeNavText]}>
                  {tab === "CALL_REQUESTS" ? "📞" : tab.slice(0, 4)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={currentStyles.authContainer}>
          <View style={currentStyles.card}>
            <Text style={currentStyles.cardTitle}>Customer Sign In</Text>
            <TextInput
              style={currentStyles.input}
              placeholder="Email address"
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
              <Text style={[currentStyles.cardSubtitle, { color: "#f87171", textAlign: "center" }]}> 
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
                <Text style={currentStyles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Biometric Sign-in Unavailable"
              accessibilityRole="button"
              style={currentStyles.biometricButton}
              onPress={handleBiometricAuth}
            >
              <Text style={currentStyles.buttonText}>Biometric Sign-in (Unavailable)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Open Customer Web Portal"
              accessibilityRole="link"
              onPress={() => void openCustomerPortal()}
              style={{ marginTop: 12 }}
            >
              <Text style={currentStyles.linkText}>Open Customer Web Portal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Native document scanning is not configured; provide an honest web handoff. */}
      <Modal visible={docModal} animationType="slide" transparent>
        <View style={currentStyles.modalOverlay}>
          <View style={currentStyles.modalContent}>
            <Text style={currentStyles.cardTitle}>Document Scanning Unavailable</Text>
            <Text style={currentStyles.cardSubtitle}>
              Camera capture and upload are not configured in this mobile build. No document has been captured or uploaded.
            </Text>
            <TouchableOpacity
              style={currentStyles.primaryButton}
              onPress={() => {
                setDocModal(false);
                void openCustomerPortal("/documents");
              }}
            >
              <Text style={currentStyles.buttonText}>Open Document Vault</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDocModal(false)} style={{ marginTop: 12 }}>
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
      <CustomerMobileApp />
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  headerSubtitle: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  themeToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#334155" },
  themeToggleText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  offlineBanner: { backgroundColor: "#b45309", paddingVertical: 8, paddingHorizontal: 16, alignItems: "center" },
  offlineText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
  content: { padding: 16, paddingBottom: 90, gap: 16 },
  authContainer: { flexGrow: 1, padding: 20, justifyContent: "center" },
  restoringContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  card: { backgroundColor: "#1e293b", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155", gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  cardSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  metricCard: { width: "47%", backgroundColor: "#0f172a", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#334155" },
  metricLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "bold", color: "#ffffff", marginTop: 4 },
  itemCard: { backgroundColor: "#0f172a", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#334155", gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: "bold", color: "#ffffff" },
  chipButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#0f172a", marginRight: 6, borderWidth: 1, borderColor: "#334155" },
  activeChip: { backgroundColor: "#2563eb", borderColor: "#60a5fa" },
  chipText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  input: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, color: "#ffffff", fontSize: 14 },
  primaryButton: { backgroundColor: "#2563eb", padding: 14, borderRadius: 12, alignItems: "center" },
  biometricButton: { backgroundColor: "#047857", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  logoutButton: { backgroundColor: "#dc2626", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  aiBox: { backgroundColor: "#1e1b4b", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#4338ca", marginTop: 8 },
  aiText: { color: "#c7d2fe", fontSize: 13 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0f172a", padding: 14, borderRadius: 12 },
  switchLabel: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#1e293b", borderTopWidth: 1, borderColor: "#334155" },
  bottomNavContent: { flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 10 },
  navTab: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  activeNavTab: { backgroundColor: "#2563eb" },
  navText: { color: "#94a3b8", fontSize: 10, fontWeight: "bold" },
  activeNavText: { color: "#ffffff" },
  linkText: { color: "#60a5fa", fontSize: 13, textAlign: "center", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#1e293b", borderRadius: 20, padding: 24, gap: 12 },
});

const lightStyles = StyleSheet.create({
  ...darkStyles,
  outerContainer: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 48, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: "#ffffff", borderBottomWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  headerSubtitle: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  themeToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "#e2e8f0" },
  themeToggleText: { color: "#0f172a", fontSize: 12, fontWeight: "bold" },
  card: { backgroundColor: "#ffffff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#e2e8f0", gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  cardSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  metricCard: { width: "47%", backgroundColor: "#f1f5f9", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#cbd5e1" },
  metricLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  metricValue: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginTop: 4 },
  itemCard: { backgroundColor: "#f1f5f9", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#cbd5e1", gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  input: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, color: "#0f172a", fontSize: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f1f5f9", padding: 14, borderRadius: 12 },
  switchLabel: { color: "#0f172a", fontSize: 14, fontWeight: "500" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#ffffff", borderTopWidth: 1, borderColor: "#e2e8f0" },
  modalContent: { backgroundColor: "#ffffff", borderRadius: 20, padding: 24, gap: 12 },
});
