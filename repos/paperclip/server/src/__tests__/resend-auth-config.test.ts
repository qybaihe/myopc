import { describe, expect, it } from "vitest";
import {
  isResendTestingFromEmail,
  shouldDisableResendTestingDomainEmailAuth,
} from "../auth/better-auth.js";

describe("Resend email auth configuration", () => {
  it("detects the Resend testing sender domain", () => {
    expect(isResendTestingFromEmail("onboarding@resend.dev")).toBe(true);
    expect(isResendTestingFromEmail("AUTH@RESEND.DEV")).toBe(true);
    expect(isResendTestingFromEmail("auth@myopc.me")).toBe(false);
  });

  it("disables resend.dev email auth in authenticated deployments", () => {
    expect(
      shouldDisableResendTestingDomainEmailAuth({
        enabled: true,
        fromEmail: "onboarding@resend.dev",
        deploymentMode: "authenticated",
        publicUrl: "https://myopc.me",
      }),
    ).toBe(true);
  });

  it("keeps verified-domain senders enabled", () => {
    expect(
      shouldDisableResendTestingDomainEmailAuth({
        enabled: true,
        fromEmail: "auth@myopc.me",
        deploymentMode: "authenticated",
        publicUrl: "https://myopc.me",
      }),
    ).toBe(false);
  });

  it("allows explicit local testing with resend.dev", () => {
    expect(
      shouldDisableResendTestingDomainEmailAuth({
        enabled: true,
        fromEmail: "onboarding@resend.dev",
        deploymentMode: "authenticated",
        publicUrl: "https://myopc.me",
        allowTestingDomain: true,
      }),
    ).toBe(false);
  });
});
