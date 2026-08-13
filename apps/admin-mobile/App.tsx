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
  ADMIN_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  BIOMETRIC_UNAVAILABLE_MESSAGE,
  authenticateWithPassword,
  resolveServiceUrl,
} from "./mobileModel";
import { ThemeModeControl, ThemeProvider, useThemePreferences } from "./ThemeProvider";
import { usePortalSession } from "./usePortalSession";
import { loadAdminDashboard, type AdminDashboardData } from "./dashboardData";

const ADMIN_LOGIN_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/login",
});
const ADMIN_PROFILE_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/me",
});
const ADMIN_LOGOUT_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/auth/logout",
});
const ADMIN_DASHBOARD_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  port: 4000,
  path: "/api/v1/admin/dashboard/widgets",
});
const ADMIN_EXPECTED_ROLES = ["SUPER_ADMIN", "ADMIN", "SYSTEM_ADMIN"] as const;
const ADMIN_PORTAL_URL = resolveServiceUrl({
  configuredUrl: process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL,
  platform: Platform.OS,
  port: 3000,
});

type AdminTab =
  | "DASHBOARD"
  | "ANALYTICS"
  | "TENANTS"
  | "CRM"
  | "RBAC"
  | "AI_ENGINE"
  | "GBP_OVERSEER"
  | "SECURITY"
  | "NOTIFICATIONS"
  | "SEARCH"
  | "SETTINGS"
  | "ECOSYSTEM"
  | "COPILOT"
  | "ENGAGEMENT_COMPLIANCE";

function AdminMobileApp() {
  const [screen, setScreen] = useState<"LOGIN" | "FORGOT_PASSWORD">("LOGIN");
  const [activeTab, setActiveTab] = useState<AdminTab>("DASHBOARD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
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
    profileUrl: ADMIN_PROFILE_URL,
    logoutUrl: ADMIN_LOGOUT_URL,
    expectedRoles: ADMIN_EXPECTED_ROLES,
    portalName: "GBS Admin Mobile",
  });

  // Features State
  const [searchQuery, setSearchQuery] = useState("");
  const [scannerModal, setScannerModal] = useState(false);

  const { isDark } = useThemePreferences();

  const refreshDashboard = useCallback(async () => {
    if (!sessionToken) return;
    setDashboardLoading(true);
    setDashboardError("");
    const result = await loadAdminDashboard({ token: sessionToken, endpoint: ADMIN_DASHBOARD_URL });
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
      const message = "Please enter your admin credentials.";
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
        endpoint: ADMIN_LOGIN_URL,
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
    setScreen("LOGIN");
    setPassword("");
    await logout();
  };

  const triggerDocScan = () => {
    setScannerModal(true);
  };

  const openAdminPortal = async (path = "") => {
    const url = `${ADMIN_PORTAL_URL.replace(/\/$/, "")}${path ? `/${path.replace(/^\//, "")}` : ""}`;
    try {
      if (!(await Linking.canOpenURL(url))) throw new Error("Unsupported URL");
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Admin Portal Unavailable",
        `Could not open ${url}. Confirm the web portal is running or configure EXPO_PUBLIC_ADMIN_PORTAL_URL.`,
      );
    }
  };

  const currentStyles = isDark ? darkStyles : lightStyles;

  return (
    <View style={currentStyles.outerContainer}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={currentStyles.header}>
        <View>
          <Text style={currentStyles.headerTitle}>GBS Admin Mobile</Text>
          <Text style={currentStyles.headerSubtitle}>Enterprise System Control</Text>
        </View>
        <ThemeModeControl />
      </View>

      {restoringSession ? (
        <View
          accessibilityLabel="Restoring secure admin session"
          accessibilityRole="progressbar"
          style={currentStyles.restoringContainer}
        >
          <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
          <Text style={currentStyles.subText}>Restoring secure session...</Text>
        </View>
      ) : isLoggedIn ? (
        <View style={currentStyles.mainWrapper}>
          {/* Top Horizontal Tab Navigation */}
          <ScrollView
            accessibilityLabel="Admin app navigation"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={currentStyles.tabBarContent}
            style={currentStyles.tabBar}
          >
            {ADMIN_TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                accessibilityLabel={t.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === t.id }}
                style={[
                  currentStyles.tabButton,
                  activeTab === t.id && currentStyles.activeTabButton,
                ]}
                onPress={() => setActiveTab(t.id as AdminTab)}
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
                <Text style={currentStyles.cardHeader}>Super Admin System Metrics</Text>
                {dashboardLoading ? (
                  <View accessibilityLabel="Loading admin dashboard data" accessibilityRole="progressbar">
                    <ActivityIndicator color={isDark ? "#60a5fa" : "#2563eb"} />
                    <Text style={currentStyles.subText}>Loading persisted dashboard counts...</Text>
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
                        <Text style={currentStyles.metricLabel}>Active Users</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.activeUsers} / {dashboardData.totalUsers}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Active Subscriptions</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.activeSubscriptions}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Social Posts</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.socialPosts}</Text>
                      </View>
                      <View style={currentStyles.metricCard}>
                        <Text style={currentStyles.metricLabel}>Google Locations</Text>
                        <Text style={currentStyles.metricValue}>{dashboardData.googleLocations}</Text>
                      </View>
                    </View>
                    <Text style={currentStyles.subText}>Counts loaded from persisted platform records.</Text>
                  </>
                ) : (
                  <Text style={currentStyles.subText}>No admin dashboard data is available.</Text>
                )}
              </View>
            )}

            {activeTab === "ANALYTICS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Enterprise Analytics & Scorecards</Text>
                <Text style={currentStyles.subText}>
                  Analytics reports are not loaded into the native app. Open the authenticated Admin Portal for persisted metrics and exports.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/analytics")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Analytics in Admin Portal</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "TENANTS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Tenant Onboarding & Governance</Text>
                <Text style={currentStyles.subText}>
                  Tenant records are not loaded into this native view. Use the Admin Portal to inspect tenant-scoped records and onboarding status.
                </Text>
                <TouchableOpacity style={currentStyles.primaryButton} onPress={() => void openAdminPortal("/tenants")}>
                  <Text style={currentStyles.primaryButtonText}>Open Tenant Management</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "RBAC" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Role-Based Access Control Matrix</Text>
                <Text style={currentStyles.subText}>
                  Role assignments and permission audits are not cached on this device.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/roles")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Roles & Permissions</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "AI_ENGINE" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>AI Model Routing & Quota Monitor</Text>
                <Text style={currentStyles.subText}>
                  Provider availability and tenant quotas are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/ai-providers")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open AI Provider Management</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "GBP_OVERSEER" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Google Business Profile Master Overseer</Text>
                <Text style={currentStyles.subText}>
                  Connected-account and review records are available only from the authenticated GBP workspace.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/gbp-studio")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open GBP Workspace</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SECURITY" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Enterprise Mobile Security Guard</Text>
                <View style={currentStyles.switchRow}>
                  <Text style={currentStyles.switchLabel}>Root / Jailbreak Detection</Text>
                  <Text style={currentStyles.subText}>Not configured</Text>
                </View>
                <View style={currentStyles.switchRow}>
                  <Text style={currentStyles.switchLabel}>Certificate Pinning (SSL)</Text>
                  <Text style={currentStyles.subText}>Not configured</Text>
                </View>
                <View style={currentStyles.switchRow}>
                  <Text style={currentStyles.switchLabel}>Biometric Sign-in (Not Configured)</Text>
                  <Switch value={BIOMETRIC_AUTH_AVAILABLE} disabled />
                </View>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/settings/security")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Security Settings</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "CRM" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Enterprise CRM & Sales Pipelines</Text>
                <Text style={currentStyles.subText}>
                  CRM opportunities and lead values are not loaded into the native app.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/leads")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Leads in Admin Portal</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "NOTIFICATIONS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>System Broadcast Notifications</Text>
                <Text style={currentStyles.subText}>
                  Native push delivery is not configured in this build. Broadcast creation and delivery status remain in the Admin Portal.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/notifications")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Notification Center</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SEARCH" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Global Enterprise Search</Text>
                <Text style={currentStyles.subText}>
                  Native voice capture is not configured. Enter a query and continue in the authenticated Admin Portal.
                </Text>
                <TextInput
                  style={currentStyles.input}
                  placeholder="Enter a search query..."
                  placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={currentStyles.primaryButton}
                    onPress={() => void openAdminPortal(`/global-search?q=${encodeURIComponent(searchQuery.trim())}`)}
                  >
                    <Text style={currentStyles.primaryButtonText}>Open Portal Search</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={currentStyles.primaryButton} onPress={triggerDocScan}>
                    <Text style={currentStyles.primaryButtonText}>Document Scan Options</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === "ECOSYSTEM" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Ecosystem, Plugins & Developer Portal</Text>
                <Text style={currentStyles.subText}>
                  Installed-plugin and application records are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/marketplace")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Plugin & App Marketplace</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "COPILOT" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Enterprise Multi-Role AI Copilot</Text>
                <Text style={currentStyles.subText}>
                  Native Copilot execution is not configured. Provider status is verified when the web workspace opens.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/enterprise-copilot")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Enterprise AI Copilot</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "ENGAGEMENT_COMPLIANCE" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Omni-Channel Engagement & Compliance Audit</Text>
                <Text style={currentStyles.subText}>
                  Channel, queue, and compliance records are not loaded into this native view.
                </Text>
                <TouchableOpacity
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal("/inbox-providers")}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Engagement Providers</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "SETTINGS" && (
              <View style={currentStyles.card}>
                <Text style={currentStyles.cardHeader}>Mobile Admin Preferences</Text>
                <Text style={currentStyles.subText}>
                  Offline caching and background synchronization are not configured in this build. Theme preference remains stored on this device.
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Open Admin Web Portal"
                  accessibilityRole="link"
                  style={currentStyles.primaryButton}
                  onPress={() => void openAdminPortal()}
                >
                  <Text style={currentStyles.primaryButtonText}>Open Admin Web Portal</Text>
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
      ) : screen === "LOGIN" ? (
        <ScrollView contentContainerStyle={currentStyles.authContainer}>
          <View style={currentStyles.card}>
            <Text style={currentStyles.cardHeader}>Admin Sign In</Text>

            <TextInput
              style={currentStyles.input}
              placeholder="Admin Email (admin@enterprise.com)"
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
              accessibilityLabel="Sign In to Admin Portal"
              accessibilityRole="button"
              style={currentStyles.primaryButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={currentStyles.primaryButtonText}>Sign In to Admin Portal</Text>
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
              accessibilityRole="link"
              onPress={() => setScreen("FORGOT_PASSWORD")}
              style={{ marginTop: 12 }}
            >
              <Text style={currentStyles.linkText}>Forgot Admin Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Open Admin Web Portal"
              accessibilityRole="link"
              onPress={() => void openAdminPortal()}
              style={{ marginTop: 4 }}
            >
              <Text style={currentStyles.linkText}>Open Admin Web Portal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={currentStyles.authContainer}>
          <View style={currentStyles.card}>
            <Text style={currentStyles.cardHeader}>Reset Admin Password</Text>

            <TextInput
              style={currentStyles.input}
              placeholder="Admin Email Address"
              placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity style={currentStyles.primaryButton} onPress={() => setScreen("LOGIN")}>
              <Text style={currentStyles.primaryButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Native scanning is not configured; provide an honest web handoff. */}
      <Modal visible={scannerModal} animationType="slide" transparent>
        <View style={currentStyles.modalOverlay}>
          <View style={currentStyles.modalContent}>
            <Text style={currentStyles.modalTitle}>Document Scanning Unavailable</Text>
            <Text style={currentStyles.subText}>
              Camera capture and document indexing are not configured in this mobile build. No file has been captured or uploaded.
            </Text>
            <TouchableOpacity
              style={currentStyles.primaryButton}
              onPress={() => {
                setScannerModal(false);
                void openAdminPortal("/file-manager");
              }}
            >
              <Text style={currentStyles.primaryButtonText}>Open File Manager</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScannerModal(false)} style={{ marginTop: 12 }}>
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
      <AdminMobileApp />
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
  activeTabButton: { backgroundColor: "#2563eb", borderColor: "#60a5fa" },
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
  itemTitle: { fontSize: 14, fontWeight: "bold", color: "#ffffff" },
  itemSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  badgeButton: { backgroundColor: "#2563eb", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
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
  primaryButton: { backgroundColor: "#2563eb", padding: 14, borderRadius: 12, alignItems: "center", flex: 1 },
  primaryButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
  biometricButton: { backgroundColor: "#047857", padding: 14, borderRadius: 12, alignItems: "center" },
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
  linkText: { color: "#60a5fa", fontSize: 13, textAlign: "center", fontWeight: "600" },
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
  itemTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  itemSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
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
  linkText: { color: "#2563eb", fontSize: 13, textAlign: "center", fontWeight: "600" },
  modalContent: { backgroundColor: "#ffffff", borderRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
});
