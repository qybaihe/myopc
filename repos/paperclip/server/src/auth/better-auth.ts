import type { Request, RequestHandler } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { toNodeHandler } from "better-auth/node";
import { Resend } from "resend";
import type { Db } from "@paperclipai/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@paperclipai/db";
import type { Config } from "../config.js";
import { resolvePaperclipInstanceId } from "../home-paths.js";

export type BetterAuthSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type BetterAuthSessionResult = {
  session: { id: string; userId: string } | null;
  user: BetterAuthSessionUser | null;
};

type BetterAuthInstance = ReturnType<typeof betterAuth>;

const AUTH_COOKIE_PREFIX_FALLBACK = "default";
const AUTH_COOKIE_PREFIX_INVALID_SEGMENTS_RE = /[^a-zA-Z0-9_-]+/g;
const RESEND_TESTING_DOMAIN = "resend.dev";

type VerificationOtpType = "sign-in" | "email-verification" | "forget-password";

type ResendEmailAuthConfig = {
  enabled: boolean;
  apiKey?: string;
  fromEmail: string;
  fromEmailSource: "env" | "default";
  fromDisplay: string;
  replyTo?: string;
};

function isTruthyEnvFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isResendTestingFromEmail(fromEmail: string): boolean {
  const normalized = fromEmail.trim().toLowerCase();
  return normalized === RESEND_TESTING_DOMAIN || normalized.endsWith(`@${RESEND_TESTING_DOMAIN}`);
}

function isLoopbackPublicUrl(publicUrl: string | undefined): boolean {
  if (!publicUrl) return true;
  try {
    const hostname = new URL(publicUrl).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export function shouldDisableResendTestingDomainEmailAuth(input: {
  enabled: boolean;
  fromEmail: string;
  deploymentMode: Config["deploymentMode"];
  publicUrl?: string;
  allowTestingDomain?: boolean;
}): boolean {
  if (!input.enabled || input.allowTestingDomain) return false;
  if (!isResendTestingFromEmail(input.fromEmail)) return false;
  return input.deploymentMode === "authenticated" || !isLoopbackPublicUrl(input.publicUrl);
}

export function deriveAuthCookiePrefix(instanceId = resolvePaperclipInstanceId()): string {
  const scopedInstanceId = instanceId
    .trim()
    .replace(AUTH_COOKIE_PREFIX_INVALID_SEGMENTS_RE, "-")
    .replace(/^-+|-+$/g, "") || AUTH_COOKIE_PREFIX_FALLBACK;
  return `paperclip-${scopedInstanceId}`;
}

export function buildBetterAuthAdvancedOptions(input: { disableSecureCookies: boolean }) {
  return {
    cookiePrefix: deriveAuthCookiePrefix(),
    ...(input.disableSecureCookies ? { useSecureCookies: false } : {}),
  };
}

function readResendEmailAuthConfig(): ResendEmailAuthConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  return {
    enabled: Boolean(apiKey),
    apiKey: apiKey || undefined,
    fromEmail: fromEmail || "onboarding@resend.dev",
    fromEmailSource: fromEmail ? "env" : "default",
    fromDisplay: process.env.RESEND_FROM_NAME?.trim() || "Paperclip",
    replyTo: process.env.RESEND_REPLY_TO?.trim() || undefined,
  };
}

function getResendFromDomain(fromEmail: string) {
  return fromEmail.split("@")[1]?.trim().toLowerCase() || fromEmail.trim().toLowerCase();
}

function logResendEmailAuthConfig(input: {
  config: ResendEmailAuthConfig;
  publicUrl?: string;
  status: "enabled" | "disabled";
  reason?: string;
  requireEmailVerification: boolean;
}) {
  const payload = {
    event: "resend_email_otp_config",
    status: input.status,
    ...(input.reason ? { reason: input.reason } : {}),
    fromDomain: getResendFromDomain(input.config.fromEmail),
    fromEmailSource: input.config.fromEmailSource,
    publicUrl: input.publicUrl ?? null,
    replyToConfigured: Boolean(input.config.replyTo),
    requireEmailVerification: input.requireEmailVerification,
  };
  const line = JSON.stringify(payload);
  if (input.status === "enabled") {
    console.info(line);
  } else if (input.reason === "missing_api_key") {
    console.warn(line);
  } else {
    console.error(line);
  }
}

function formatResendFromAddress(input: Pick<ResendEmailAuthConfig, "fromDisplay" | "fromEmail">) {
  const display = input.fromDisplay.trim();
  const email = input.fromEmail.trim();
  return display.length > 0 ? `${display} <${email}>` : email;
}

function buildOtpEmailSubject(type: VerificationOtpType) {
  switch (type) {
    case "sign-in":
      return "Your MyOPC sign-in code";
    case "forget-password":
      return "Your MyOPC password reset code";
    case "email-verification":
    default:
      return "Verify your MyOPC email";
  }
}

function maskEmailForLogs(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "<invalid-email>";
  const localPrefix = local.slice(0, 2);
  return `${localPrefix}${local.length > 2 ? "***" : "*"}@${domain}`;
}

function getErrorLogPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  if (error && typeof error === "object") {
    const value = error as { name?: unknown; message?: unknown };
    return {
      name: typeof value.name === "string" ? value.name : "UnknownError",
      message: typeof value.message === "string" ? value.message : JSON.stringify(error).slice(0, 500),
    };
  }
  return {
    name: "UnknownError",
    message: String(error),
  };
}

function buildOtpEmailHtml(input: {
  otp: string;
  type: VerificationOtpType;
  productLabel: string;
  publicUrl?: string;
}) {
  const intro =
    input.type === "sign-in"
      ? `Use this code to sign in to ${input.productLabel}.`
      : input.type === "forget-password"
        ? `Use this code to reset your ${input.productLabel} password.`
        : `Use this code to verify your email for ${input.productLabel}.`;
  const footer = input.publicUrl
    ? `If you did not request this, you can ignore this email. ${input.productLabel}: ${input.publicUrl}`
    : `If you did not request this, you can ignore this email.`;

  return `
    <div style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;line-height:1.6;">
      <p style="margin:0 0 16px 0;">${intro}</p>
      <div style="margin:20px 0;padding:16px 20px;border:1px solid #e4e4e7;display:inline-block;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;margin-bottom:6px;">Verification code</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:0.24em;color:#09090b;">${input.otp}</div>
      </div>
      <p style="margin:16px 0 0 0;color:#52525b;">This code expires in 10 minutes.</p>
      <p style="margin:16px 0 0 0;color:#71717a;font-size:13px;">${footer}</p>
    </div>
  `.trim();
}

async function sendVerificationOtpWithResend(
  resend: Resend,
  config: ResendEmailAuthConfig,
  payload: {
    email: string;
    otp: string;
    type: VerificationOtpType;
    productLabel: string;
    publicUrl?: string;
  },
) {
  const logBase = {
    event: "resend_email_otp",
    to: maskEmailForLogs(payload.email),
    type: payload.type,
    fromDomain: config.fromEmail.split("@")[1] ?? config.fromEmail,
  };
  try {
    const result = await resend.emails.send({
      from: formatResendFromAddress(config),
      to: payload.email,
      subject: buildOtpEmailSubject(payload.type),
      html: buildOtpEmailHtml({
        otp: payload.otp,
        type: payload.type,
        productLabel: payload.productLabel,
        publicUrl: payload.publicUrl,
      }),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });
    const resendResult = result as {
      data?: { id?: string | null } | null;
      error?: { name?: string; message?: string } | null;
    };
    if (resendResult.error) {
      console.error(JSON.stringify({
        ...logBase,
        status: "error",
        errorName: resendResult.error.name,
        errorMessage: resendResult.error.message,
      }));
      throw new Error(resendResult.error.message || "Resend email send failed");
    }
    console.info(JSON.stringify({
      ...logBase,
      status: "accepted",
      resendId: resendResult.data?.id ?? null,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      ...logBase,
      status: "exception",
      error: getErrorLogPayload(error),
    }));
    throw error;
  }
}

function headersFromNodeHeaders(rawHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, raw] of Object.entries(rawHeaders)) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) headers.append(key, value);
      continue;
    }
    headers.set(key, raw);
  }
  return headers;
}

function headersFromExpressRequest(req: Request): Headers {
  return headersFromNodeHeaders(req.headers);
}

export function deriveAuthTrustedOrigins(config: Config, opts?: { listenPort?: number }): string[] {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const trustedOrigins = new Set<string>();

  if (baseUrl) {
    try {
      trustedOrigins.add(new URL(baseUrl).origin);
    } catch {
      // Better Auth will surface invalid base URL separately.
    }
  }
  if (config.deploymentMode === "authenticated") {
    const port = opts?.listenPort ?? config.port;
    const needsPortVariants = port !== 80 && port !== 443;
    for (const hostname of config.allowedHostnames) {
      const trimmed = hostname.trim().toLowerCase();
      if (!trimmed) continue;
      trustedOrigins.add(`https://${trimmed}`);
      trustedOrigins.add(`http://${trimmed}`);
      if (needsPortVariants) {
        trustedOrigins.add(`https://${trimmed}:${port}`);
        trustedOrigins.add(`http://${trimmed}:${port}`);
      }
    }
  }

  return Array.from(trustedOrigins);
}

export function createBetterAuthInstance(db: Db, config: Config, trustedOrigins: string[]): BetterAuthInstance {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.PAPERCLIP_AGENT_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET (or PAPERCLIP_AGENT_JWT_SECRET) must be set. " +
      "For local development, set BETTER_AUTH_SECRET=paperclip-dev-secret in your .env file.",
    );
  }
  const publicUrl = process.env.PAPERCLIP_PUBLIC_URL ?? baseUrl;
  const isHttpOnly = publicUrl ? publicUrl.startsWith("http://") : false;
  const resendEmailAuth = readResendEmailAuthConfig();
  const disableResendTestingDomainEmailAuth = shouldDisableResendTestingDomainEmailAuth({
    enabled: resendEmailAuth.enabled,
    fromEmail: resendEmailAuth.fromEmail,
    deploymentMode: config.deploymentMode,
    publicUrl,
    allowTestingDomain: isTruthyEnvFlag(process.env.RESEND_ALLOW_TESTING_DOMAIN),
  });
  if (disableResendTestingDomainEmailAuth) {
    logResendEmailAuthConfig({
      config: resendEmailAuth,
      publicUrl,
      status: "disabled",
      reason: "resend_testing_domain_requires_explicit_opt_in",
      requireEmailVerification: false,
    });
  }
  const effectiveResendEmailAuth = disableResendTestingDomainEmailAuth
    ? { ...resendEmailAuth, enabled: false, apiKey: undefined }
    : resendEmailAuth;
  const resendClient = effectiveResendEmailAuth.enabled && effectiveResendEmailAuth.apiKey
    ? new Resend(effectiveResendEmailAuth.apiKey)
    : null;
  if (!resendEmailAuth.enabled) {
    logResendEmailAuthConfig({
      config: resendEmailAuth,
      publicUrl,
      status: "disabled",
      reason: "missing_api_key",
      requireEmailVerification: false,
    });
  } else if (!disableResendTestingDomainEmailAuth) {
    logResendEmailAuthConfig({
      config: effectiveResendEmailAuth,
      publicUrl,
      status: "enabled",
      requireEmailVerification: true,
    });
  }
  const productLabel = process.env.PAPERCLIP_PRODUCT_LABEL?.trim() || "MyOPC";

  const authConfig = {
    baseURL: baseUrl,
    secret,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: effectiveResendEmailAuth.enabled,
      disableSignUp: config.authDisableSignUp,
    },
    ...(resendClient
      ? {
          emailVerification: {
            sendOnSignIn: true,
            autoSignInAfterVerification: true,
            expiresIn: 60 * 10,
          },
          plugins: [
            emailOTP({
              disableSignUp: true,
              expiresIn: 60 * 10,
              overrideDefaultEmailVerification: true,
              sendVerificationOTP: async ({ email, otp, type }) => {
                await sendVerificationOtpWithResend(resendClient, effectiveResendEmailAuth, {
                  email,
                  otp,
                  type,
                  productLabel,
                  publicUrl,
                });
              },
            }),
          ],
        }
      : {}),
    advanced: buildBetterAuthAdvancedOptions({ disableSecureCookies: isHttpOnly }),
  };

  if (!baseUrl) {
    delete (authConfig as { baseURL?: string }).baseURL;
  }

  return betterAuth(authConfig);
}

export function createBetterAuthHandler(auth: BetterAuthInstance): RequestHandler {
  const handler = toNodeHandler(auth);
  return (req, res, next) => {
    void Promise.resolve(handler(req, res)).catch(next);
  };
}

export async function resolveBetterAuthSessionFromHeaders(
  auth: BetterAuthInstance,
  headers: Headers,
): Promise<BetterAuthSessionResult | null> {
  const api = (auth as unknown as { api?: { getSession?: (input: unknown) => Promise<unknown> } }).api;
  if (!api?.getSession) return null;

  const sessionValue = await api.getSession({
    headers,
  });
  if (!sessionValue || typeof sessionValue !== "object") return null;

  const value = sessionValue as {
    session?: { id?: string; userId?: string } | null;
    user?: { id?: string; email?: string | null; name?: string | null } | null;
  };
  const session = value.session?.id && value.session.userId
    ? { id: value.session.id, userId: value.session.userId }
    : null;
  const user = value.user?.id
    ? {
        id: value.user.id,
        email: value.user.email ?? null,
        name: value.user.name ?? null,
      }
    : null;

  if (!session || !user) return null;
  return { session, user };
}

export async function resolveBetterAuthSession(
  auth: BetterAuthInstance,
  req: Request,
): Promise<BetterAuthSessionResult | null> {
  return resolveBetterAuthSessionFromHeaders(auth, headersFromExpressRequest(req));
}
