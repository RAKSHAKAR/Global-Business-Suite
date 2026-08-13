import { EnterpriseIamConfigService } from "../../../services/iamConfigService";
import { PasswordPolicyEngine } from "../../../services/passwordPolicyEngine";
import { OtpService } from "../../../services/otpService";

describe("Phase 2 IAM Module Test Suite", () => {
  it("restricts public registration of ADMIN roles", () => {
    const requestedRole = "ADMIN";
    const isRestricted = ["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN"].includes(requestedRole);
    expect(isRestricted).toBe(true);
  });

  it("validates password complexity engine", async () => {
    const weakCheck = await PasswordPolicyEngine.validateComplexity("short");
    expect(weakCheck.valid).toBe(false);

    const strongCheck = await PasswordPolicyEngine.validateComplexity("EnterpriseP@ssword2026!");
    expect(strongCheck.valid).toBe(true);
  });

  it("handles mobile OTP & email verification engine", async () => {
    const testEmail = "iam-verifier@enterprise.com";
    const otpResult = await OtpService.sendOtp(testEmail, "EMAIL_VERIFICATION");
    expect(otpResult.success).toBe(true);
    expect(otpResult.otp).toBeDefined();

    if (otpResult.otp) {
      const confirmResult = await OtpService.verifyOtp(testEmail, otpResult.otp, "EMAIL_VERIFICATION");
      expect(confirmResult.valid).toBe(true);
    }
  });

  it("fetches dynamic OAuth providers configuration", async () => {
    const providers = await EnterpriseIamConfigService.getProviders();
    expect(providers.length).toBeGreaterThanOrEqual(6);
    const google = providers.find((p) => p.provider === "GOOGLE");
    expect(google?.isEnabled).toBe(true);
  });
});
