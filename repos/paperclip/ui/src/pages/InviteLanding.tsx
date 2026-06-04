import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentAdapterType, JoinRequest } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { CompanyPatternIcon } from "@/components/CompanyPatternIcon";
import { useCompany } from "@/context/CompanyContext";
import { useLanguage } from "@/context/LanguageContext";
import { Link, useNavigate, useParams } from "@/lib/router";
import { accessApi } from "../api/access";
import { authApi, isEmailNotVerifiedError } from "../api/auth";
import { companiesApi } from "../api/companies";
import { healthApi } from "../api/health";
import { clearPendingInviteToken, rememberPendingInviteToken } from "../lib/invite-memory";
import { queryKeys } from "../lib/queryKeys";
import { formatDate } from "../lib/utils";

type AuthMode = "sign_in" | "sign_up";
type AuthFeedback = { tone: "error" | "info"; message: string };
type TranslateFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

const DEFAULT_INVITE_AGENT_ADAPTER_TYPE: AgentAdapterType = "opencode_local";
const DEFAULT_INVITE_AGENT_ADAPTER_LABEL = "MyOPC Code Engine";

function readNestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" && current.trim().length > 0 ? current : null;
}

const fieldClassName =
  "w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500";
const panelClassName = "border border-zinc-800 bg-zinc-950/95 p-6";
const modeButtonBaseClassName =
  "flex-1 border px-3 py-2 text-sm transition-colors";

function formatHumanRole(role: string | null | undefined) {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code.trim().length > 0 ? code : null;
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  const message = error.message.trim();
  return message.length > 0 ? message : null;
}

function mapInviteAuthFeedback(
  error: unknown,
  authMode: AuthMode,
  email: string,
  t: TranslateFn,
): AuthFeedback {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error);
  const emailLabel = email.trim().length > 0 ? email.trim() : t("that email");

  if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
    return {
      tone: "info",
      message: t("An account already exists for {{email}}. Sign in below to continue with this invite.", {
        email: emailLabel,
      }),
    };
  }

  if (code === "INVALID_EMAIL_OR_PASSWORD") {
    return {
      tone: "error",
      message: t(
        "That email and password did not match an existing Paperclip account. Check both fields, or create an account first if you are new here.",
      ),
    };
  }

  if (authMode === "sign_in" && message === "Request failed: 401") {
    return {
      tone: "error",
      message: t(
        "That email and password did not match an existing Paperclip account. Check both fields, or create an account first if you are new here.",
      ),
    };
  }

  if (authMode === "sign_up" && message === "Request failed: 422") {
    return {
      tone: "info",
      message: t("An account may already exist for {{email}}. Try signing in instead.", {
        email: emailLabel,
      }),
    };
  }

  return {
    tone: "error",
    message: message ?? t("Authentication failed"),
  };
}

function isBootstrapAcceptancePayload(payload: unknown) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "bootstrapAccepted" in (payload as Record<string, unknown>),
  );
}

function isApprovedHumanJoinPayload(payload: unknown, showsAgentForm: boolean) {
  if (!payload || typeof payload !== "object" || showsAgentForm) return false;
  const status = (payload as { status?: unknown }).status;
  return status === "approved";
}

type AwaitingJoinApprovalPanelProps = {
  companyDisplayName: string;
  companyLogoUrl: string | null;
  companyBrandColor: string | null;
  invitedByUserName: string | null;
  claimSecret?: string | null;
  claimApiKeyPath?: string | null;
  onboardingTextUrl?: string | null;
};

function InviteCompanyLogo({
  companyDisplayName,
  companyLogoUrl,
  companyBrandColor,
  className,
}: {
  companyDisplayName: string;
  companyLogoUrl: string | null;
  companyBrandColor: string | null;
  className?: string;
}) {
  return (
    <CompanyPatternIcon
      companyName={companyDisplayName}
      logoUrl={companyLogoUrl}
      brandColor={companyBrandColor}
      logoFit="contain"
      className={className}
    />
  );
}

function AwaitingJoinApprovalPanel({
  companyDisplayName,
  companyLogoUrl,
  companyBrandColor,
  invitedByUserName,
  claimSecret = null,
  claimApiKeyPath = null,
  onboardingTextUrl = null,
}: AwaitingJoinApprovalPanelProps) {
  const { t } = useLanguage();
  const approvalUrl = `${window.location.origin}/company/settings/access`;
  const approverLabel = invitedByUserName ?? t("A company admin");

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6" data-testid="invite-pending-approval">
        <div className="flex items-center gap-3">
          <InviteCompanyLogo
            companyDisplayName={companyDisplayName}
            companyLogoUrl={companyLogoUrl}
            companyBrandColor={companyBrandColor}
            className="h-12 w-12 border border-zinc-800 rounded-none"
          />
          <h1 className="text-lg font-semibold">
            {t("Request to join {{company}}", { company: companyDisplayName })}
          </h1>
        </div>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-400">
            {t("Your request is still awaiting approval. {{approver}} must approve your request to join.", {
              approver: approverLabel,
            })}
          </p>
          <div className="border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 mb-1">{t("Approval page")}</p>
            <a
              href={approvalUrl}
              className="text-sm text-zinc-200 underline underline-offset-2 hover:text-zinc-100"
            >
              {t("Company Settings → Access")}
            </a>
          </div>
          <p className="text-sm text-zinc-400">
            {t("Ask them to visit")}{" "}
            <a href={approvalUrl} className="text-zinc-200 underline underline-offset-2 hover:text-zinc-100">
              {t("Company Settings → Access")}
            </a>{" "}
            {t("to approve your request.")}
          </p>
          <p className="text-xs text-zinc-500">
            {t("Refresh this page after you've been approved — you'll be redirected automatically.")}
          </p>
        </div>
        {claimSecret && claimApiKeyPath ? (
          <div className="mt-4 space-y-1 border border-zinc-800 p-3 text-xs text-zinc-400">
            <div className="text-zinc-200">{t("Claim secret")}</div>
            <div className="font-mono break-all">{claimSecret}</div>
            <div className="font-mono break-all">POST {claimApiKeyPath}</div>
          </div>
        ) : null}
        {onboardingTextUrl ? (
          <div className="mt-4 text-xs text-zinc-400">
            {t("Onboarding:")} <span className="font-mono break-all">{onboardingTextUrl}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InviteLandingPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedCompanyId } = useCompany();
  const params = useParams();
  const token = (params.token ?? "").trim();
  const [authMode, setAuthMode] = useState<AuthMode>("sign_up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [agentName, setAgentName] = useState("");
  const adapterType = DEFAULT_INVITE_AGENT_ADAPTER_TYPE;
  const [capabilities, setCapabilities] = useState("");
  const [result, setResult] = useState<{ kind: "bootstrap" | "join"; payload: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);
  const [autoAcceptStarted, setAutoAcceptStarted] = useState(false);

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const inviteQuery = useQuery({
    queryKey: queryKeys.access.invite(token),
    queryFn: () => accessApi.getInvite(token),
    enabled: token.length > 0,
    retry: false,
  });
  const inviteCompaniesQueryKey = ["invite", token, "companies"] as const;

  const companiesQuery = useQuery({
    queryKey: inviteCompaniesQueryKey,
    queryFn: () => companiesApi.list(),
    enabled: !!sessionQuery.data && !!inviteQuery.data?.companyId,
    retry: false,
  });

  useEffect(() => {
    if (token) rememberPendingInviteToken(token);
  }, [token]);

  useEffect(() => {
    setAutoAcceptStarted(false);
  }, [token]);

  useEffect(() => {
    if (!companiesQuery.data || !inviteQuery.data?.companyId) return;
    const isMember = companiesQuery.data.some(
      (c) => c.id === inviteQuery.data!.companyId
    );
    if (isMember) {
      clearPendingInviteToken(token);
      navigate("/", { replace: true });
    }
  }, [companiesQuery.data, inviteQuery.data, token, navigate]);

  const invite = inviteQuery.data;
  const isCheckingExistingMembership =
    Boolean(sessionQuery.data) &&
    Boolean(invite?.companyId) &&
    companiesQuery.isLoading;
  const isCurrentMember =
    Boolean(invite?.companyId) &&
    Boolean(
      companiesQuery.data?.some((company) => company.id === invite?.companyId),
    );
  const companyName = invite?.companyName?.trim() || null;
  const companyDisplayName = companyName || t("this Paperclip company");
  const companyLogoUrl = invite?.companyLogoUrl?.trim() || null;
  const companyBrandColor = invite?.companyBrandColor?.trim() || null;
  const invitedByUserName = invite?.invitedByUserName?.trim() || null;
  const inviteMessage = invite?.inviteMessage?.trim() || null;
  const requestedHumanRole = formatHumanRole(invite?.humanRole);
  const inviteJoinRequestStatus = invite?.joinRequestStatus ?? null;
  const inviteJoinRequestType = invite?.joinRequestType ?? null;
  const requiresHumanAccount =
    healthQuery.data?.deploymentMode === "authenticated" &&
    !sessionQuery.data &&
    invite?.allowedJoinTypes !== "agent";
  const showsAgentForm = invite?.inviteType !== "bootstrap_ceo" && invite?.allowedJoinTypes === "agent";
  const shouldAutoAcceptHumanInvite =
    Boolean(sessionQuery.data) &&
    !showsAgentForm &&
    invite?.inviteType !== "bootstrap_ceo" &&
    !inviteJoinRequestStatus &&
    !isCheckingExistingMembership &&
    !isCurrentMember &&
    !result &&
    error === null;
  const sessionLabel =
    sessionQuery.data?.user.name?.trim() ||
    sessionQuery.data?.user.email?.trim() ||
    t("this account");

  const authCanSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    (authMode === "sign_in" || (name.trim().length > 0 && password.trim().length >= 8));
  const verificationCanSubmit = Boolean(verificationEmail && verificationCode.trim().length > 0);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!invite) throw new Error(t("Invite not found"));
      if (isCheckingExistingMembership) {
        throw new Error(t("Checking your company access. Try again in a moment."));
      }
      if (isCurrentMember) {
        throw new Error(t("This account already belongs to the company."));
      }
      if (invite.inviteType === "bootstrap_ceo" || invite.allowedJoinTypes !== "agent") {
        return accessApi.acceptInvite(token, { requestType: "human" });
      }
      return accessApi.acceptInvite(token, {
        requestType: "agent",
        agentName: agentName.trim(),
        adapterType,
        capabilities: capabilities.trim() || null,
      });
    },
    onSuccess: async (payload) => {
      setError(null);
      clearPendingInviteToken(token);
      const asBootstrap = isBootstrapAcceptancePayload(payload);
      setResult({ kind: asBootstrap ? "bootstrap" : "join", payload });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      if (invite?.companyId && isApprovedHumanJoinPayload(payload, showsAgentForm)) {
        setSelectedCompanyId(invite.companyId, { source: "manual" });
        navigate("/", { replace: true });
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t("Failed to accept invite"));
    },
  });

  useEffect(() => {
    if (!shouldAutoAcceptHumanInvite || autoAcceptStarted || acceptMutation.isPending) return;
    setAutoAcceptStarted(true);
    setError(null);
    acceptMutation.mutate();
  }, [acceptMutation, autoAcceptStarted, shouldAutoAcceptHumanInvite]);

  const finalizeAuthenticatedInviteFlow = async () => {
    setAuthFeedback(null);
    rememberPendingInviteToken(token);
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    const companies = await queryClient.fetchQuery({
      queryKey: inviteCompaniesQueryKey,
      queryFn: () => companiesApi.list(),
      retry: false,
    });

    if (invite?.companyId && companies.some((company) => company.id === invite.companyId)) {
      clearPendingInviteToken(token);
      setSelectedCompanyId(invite.companyId, { source: "manual" });
      navigate("/", { replace: true });
      return;
    }

    if (!invite || invite.inviteType !== "bootstrap_ceo") {
      return;
    }

    try {
      const payload = await acceptMutation.mutateAsync();
      if (isBootstrapAcceptancePayload(payload)) {
        navigate("/", { replace: true });
      }
    } catch {
      return;
    }
  };

  const authMutation = useMutation({
    mutationFn: async () => {
      if (authMode === "sign_in") {
        return authApi.signInEmail({ email: email.trim(), password });
      }
      return authApi.signUpEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    },
    onSuccess: async (result) => {
      if (result.token === null) {
        const emailLabel = email.trim();
        setVerificationEmail(emailLabel);
        setVerificationCode("");
        setAuthFeedback({
          tone: "info",
          message: t("We sent a verification code to {{email}}. Enter it below to continue.", {
            email: emailLabel,
          }),
        });
        return;
      }
      await finalizeAuthenticatedInviteFlow();
    },
    onError: (err) => {
      if (isEmailNotVerifiedError(err)) {
        const emailLabel = email.trim();
        setVerificationEmail(emailLabel);
        setVerificationCode("");
        setAuthFeedback({
          tone: "info",
          message: t("This email still needs verification. We sent a code to {{email}}.", {
            email: emailLabel,
          }),
        });
        return;
      }
      const nextFeedback = mapInviteAuthFeedback(err, authMode, email, t);
      if (getAuthErrorCode(err) === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
        setAuthMode("sign_in");
        setPassword("");
      }
      setAuthFeedback(nextFeedback);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!verificationEmail) {
        throw new Error(t("Verification email missing."));
      }
      return authApi.verifyEmailOtp({
        email: verificationEmail,
        otp: verificationCode.trim(),
      });
    },
    onSuccess: async () => {
      await finalizeAuthenticatedInviteFlow();
    },
    onError: (err) => {
      setAuthFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : t("Verification failed"),
      });
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!verificationEmail) {
        throw new Error(t("Verification email missing."));
      }
      return authApi.sendVerificationOtp({
        email: verificationEmail,
        type: "email-verification",
      });
    },
    onSuccess: () => {
      setAuthFeedback({
        tone: "info",
        message: t("We sent a fresh verification code to {{email}}.", {
          email: verificationEmail,
        }),
      });
    },
    onError: (err) => {
      setAuthFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : t("Failed to resend verification code"),
      });
    },
  });

  const joinButtonLabel = useMemo(() => {
    if (!invite) return t("Continue");
    if (invite.inviteType === "bootstrap_ceo") return t("Accept invite");
    if (showsAgentForm) return t("Submit request");
    return sessionQuery.data ? t("Accept invite") : t("Continue");
  }, [invite, sessionQuery.data, showsAgentForm, t]);

  if (!token) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("Invalid invite token.")}</div>;
  }

  if (inviteQuery.isLoading || healthQuery.isLoading || sessionQuery.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("Loading invite...")}</div>;
  }

  if (isCheckingExistingMembership) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("Checking your access...")}</div>;
  }

  if (inviteQuery.error || !invite) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="border border-border bg-card p-6" data-testid="invite-error">
          <h1 className="text-lg font-semibold">{t("Invite not available")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("This invite may be expired, revoked, or already used.")}
          </p>
        </div>
      </div>
    );
  }

  if (
    inviteJoinRequestStatus === "approved" &&
    inviteJoinRequestType === "human" &&
    isCurrentMember
  ) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("Opening company...")}</div>;
  }

  if (inviteJoinRequestStatus === "pending_approval") {
    return (
      <AwaitingJoinApprovalPanel
        companyDisplayName={companyDisplayName}
        companyLogoUrl={companyLogoUrl}
        companyBrandColor={companyBrandColor}
        invitedByUserName={invitedByUserName}
      />
    );
  }

  if (inviteJoinRequestStatus) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="border border-border bg-card p-6" data-testid="invite-error">
          <h1 className="text-lg font-semibold">{t("Invite not available")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteJoinRequestStatus === "rejected"
              ? t("This join request was not approved.")
              : t("This invite has already been used.")}
          </p>
        </div>
      </div>
    );
  }

  if (result?.kind === "bootstrap") {
    return (
      <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
        <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-lg font-semibold">{t("Bootstrap complete")}</h1>
          <div className="mt-4">
            <Button asChild className="rounded-none">
              <Link to="/">{t("Open board")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result?.kind === "join") {
    const payload = result.payload as JoinRequest & {
      claimSecret?: string;
      claimApiKeyPath?: string;
      onboarding?: Record<string, unknown>;
    };
    const claimSecret = typeof payload.claimSecret === "string" ? payload.claimSecret : null;
    const claimApiKeyPath = typeof payload.claimApiKeyPath === "string" ? payload.claimApiKeyPath : null;
    const onboardingTextUrl = readNestedString(payload.onboarding, ["textInstructions", "url"]);
    const joinedNow = !showsAgentForm && payload.status === "approved";

    return (
      joinedNow ? (
        <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
          <div className="mx-auto max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center gap-3">
              <InviteCompanyLogo
                companyDisplayName={companyDisplayName}
                companyLogoUrl={companyLogoUrl}
                companyBrandColor={companyBrandColor}
                className="h-12 w-12 border border-zinc-800 rounded-none"
              />
              <h1 className="text-lg font-semibold">{t("You joined the company")}</h1>
            </div>
            <div className="mt-4">
              <Button asChild className="w-full rounded-none">
                <Link to="/">{t("Open board")}</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <AwaitingJoinApprovalPanel
          companyDisplayName={companyDisplayName}
          companyLogoUrl={companyLogoUrl}
          companyBrandColor={companyBrandColor}
          invitedByUserName={invitedByUserName}
          claimSecret={claimSecret}
          claimApiKeyPath={claimApiKeyPath}
          onboardingTextUrl={onboardingTextUrl}
        />
      )
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className={`${panelClassName} space-y-6`}>
            <div className="flex items-start gap-4">
              <InviteCompanyLogo
                companyDisplayName={companyDisplayName}
                companyLogoUrl={companyLogoUrl}
                companyBrandColor={companyBrandColor}
                className="h-16 w-16 rounded-none border border-zinc-800"
              />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  {t("You've been invited to join Paperclip")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold">
                  {invite.inviteType === "bootstrap_ceo"
                    ? t("Set up Paperclip")
                    : t("Join {{company}}", { company: companyDisplayName })}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                  {showsAgentForm
                    ? t("Review the invite details, then submit the agent information below to start the join request.")
                    : requiresHumanAccount
                      ? t("Create your Paperclip account first. If you already have one, switch to sign in and continue the invite with the same email.")
                      : t("Your account is ready. Review the invite details, then accept it to continue.")}
                </p>
                <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                  <span className="font-semibold">MyOPC Infinite</span>
                  {" · 新用户默认接入 MiniMax M3 编码引擎，开启无限 Token 与持续创造工作流。"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("Company")}</div>
                <div className="mt-1 text-sm text-zinc-100">{companyDisplayName}</div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("Invited by")}</div>
                <div className="mt-1 text-sm text-zinc-100">{invitedByUserName ?? t("Paperclip board")}</div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("Requested access")}</div>
                <div className="mt-1 text-sm text-zinc-100">
                  {showsAgentForm
                    ? t("Agent join request")
                    : requestedHumanRole
                      ? t(requestedHumanRole)
                      : t("Company access")}
                </div>
              </div>
              <div className="border border-zinc-800 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("Invite expires")}</div>
                <div className="mt-1 text-sm text-zinc-100">{formatDate(invite.expiresAt)}</div>
              </div>
            </div>

            {inviteMessage ? (
              <div className="border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">{t("Message from inviter")}</div>
                <p className="mt-2 text-sm leading-6 text-amber-50">{inviteMessage}</p>
              </div>
            ) : null}

            {sessionQuery.data ? (
              <div className="border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                {t("Signed in as")} <span className="font-medium">{sessionLabel}</span>.
              </div>
            ) : null}
          </section>

          <section className={`${panelClassName} h-fit`}>
            {showsAgentForm ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("Submit agent details")}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t("This invite will create an approval request for a new agent in {{company}}.", {
                      company: companyDisplayName,
                    })}
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">{t("Agent name")}</span>
                  <input
                    className={fieldClassName}
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                  />
                </label>
                <div className="border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
                  <div className="mb-1 text-zinc-400">{t("Agent runtime")}</div>
                  <div className="font-medium text-zinc-100">{DEFAULT_INVITE_AGENT_ADAPTER_LABEL}</div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t("MyOPC currently provisions invite agents with MyOPC Code Engine by default. Runtime selection is locked during this beta.")}
                  </p>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-zinc-400">{t("Capabilities")}</span>
                  <textarea
                    className={fieldClassName}
                    rows={4}
                    value={capabilities}
                    onChange={(event) => setCapabilities(event.target.value)}
                  />
                </label>
                {error ? <p className="text-xs text-red-400">{error}</p> : null}
                <Button
                  className="w-full rounded-none"
                  disabled={acceptMutation.isPending || agentName.trim().length === 0}
                  onClick={() => acceptMutation.mutate()}
                >
                  {acceptMutation.isPending ? t("Working...") : joinButtonLabel}
                </Button>
              </div>
            ) : requiresHumanAccount ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    {authMode === "sign_up" ? t("Create your account") : t("Sign in to continue")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {authMode === "sign_up"
                      ? t("Start with a Paperclip account. After that, you'll come right back here to accept the invite for {{company}}.", {
                        company: companyDisplayName,
                      })
                      : t("Use the Paperclip account that already matches this invite. If you do not have one yet, switch back to create account.")}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`${modeButtonBaseClassName} ${
                      authMode === "sign_up"
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                    onClick={() => {
                      setAuthFeedback(null);
                      setVerificationEmail(null);
                      setVerificationCode("");
                      setAuthMode("sign_up");
                    }}
                  >
                    {t("Create account")}
                  </button>
                  <button
                    type="button"
                    className={`${modeButtonBaseClassName} ${
                      authMode === "sign_in"
                        ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                        : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                    }`}
                    onClick={() => {
                      setAuthFeedback(null);
                      setVerificationEmail(null);
                      setVerificationCode("");
                      setAuthMode("sign_in");
                    }}
                  >
                    {t("I already have an account")}
                  </button>
                </div>

                {verificationEmail ? (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (verifyMutation.isPending) return;
                      if (!verificationCanSubmit) {
                        setAuthFeedback({ tone: "error", message: t("Please enter the verification code.") });
                        return;
                      }
                      verifyMutation.mutate();
                    }}
                    data-testid="invite-inline-auth-verification"
                  >
                    <label className="block text-sm">
                      <span className="mb-1 block text-zinc-400">{t("Verification code")}</span>
                      <input
                        name="verification-code"
                        className={fieldClassName}
                        value={verificationCode}
                        onChange={(event) => {
                          setVerificationCode(event.target.value);
                          setAuthFeedback(null);
                        }}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        autoFocus
                      />
                    </label>
                    <p className="text-xs text-zinc-500">
                      {t("Enter the 6-digit code we sent to {{email}}.", {
                        email: verificationEmail,
                      })}
                    </p>
                    {authFeedback ? (
                      <p
                        className={`text-xs ${
                          authFeedback.tone === "info" ? "text-amber-300" : "text-red-400"
                        }`}
                      >
                        {authFeedback.message}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      className="w-full rounded-none"
                      disabled={verifyMutation.isPending}
                      aria-disabled={!verificationCanSubmit || verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? t("Verifying...") : t("Verify and continue")}
                    </Button>
                    <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-zinc-100"
                        disabled={resendVerificationMutation.isPending}
                        onClick={() => resendVerificationMutation.mutate()}
                      >
                        {resendVerificationMutation.isPending ? t("Sending...") : t("Resend code")}
                      </button>
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-zinc-100"
                        onClick={() => {
                          setVerificationEmail(null);
                          setVerificationCode("");
                          setAuthFeedback(null);
                        }}
                      >
                        {t("Use a different email")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    className="space-y-4"
                    method="post"
                    action={authMode === "sign_up" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email"}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (authMutation.isPending) return;
                      if (!authCanSubmit) {
                        setAuthFeedback({ tone: "error", message: t("Please fill in all required fields.") });
                        return;
                      }
                      authMutation.mutate();
                    }}
                    data-testid="invite-inline-auth"
                  >
                    {authMode === "sign_up" ? (
                      <label className="block text-sm">
                        <span className="mb-1 block text-zinc-400">{t("Name")}</span>
                        <input
                          name="name"
                          className={fieldClassName}
                          value={name}
                          onChange={(event) => {
                            setName(event.target.value);
                            setAuthFeedback(null);
                          }}
                          autoComplete="name"
                          autoFocus
                        />
                      </label>
                    ) : null}
                    <label className="block text-sm">
                      <span className="mb-1 block text-zinc-400">{t("Email")}</span>
                      <input
                        name="email"
                        type="email"
                        className={fieldClassName}
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setAuthFeedback(null);
                        }}
                        autoComplete="email"
                        autoFocus={authMode === "sign_in"}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-zinc-400">{t("Password")}</span>
                      <input
                        name="password"
                        type="password"
                        className={fieldClassName}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setAuthFeedback(null);
                        }}
                        autoComplete={authMode === "sign_in" ? "current-password" : "new-password"}
                      />
                    </label>
                    {authFeedback ? (
                      <p
                        className={`text-xs ${
                          authFeedback.tone === "info" ? "text-amber-300" : "text-red-400"
                        }`}
                      >
                        {authFeedback.message}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      className="w-full rounded-none"
                      disabled={authMutation.isPending}
                      aria-disabled={!authCanSubmit || authMutation.isPending}
                    >
                      {authMutation.isPending
                        ? t("Working...")
                        : authMode === "sign_in"
                          ? t("Sign in and continue")
                          : t("Create account and continue")}
                    </Button>
                  </form>
                )}

                {!verificationEmail ? (
                  <p className="text-xs leading-5 text-zinc-500">
                    {authMode === "sign_up"
                      ? t("Already signed up before? Use the existing-account option instead so the invite lands on the right Paperclip user.")
                      : t("No account yet? Switch back to create account so you can accept the invite with a new login.")}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {shouldAutoAcceptHumanInvite
                      ? t("Submitting join request")
                      : invite.inviteType === "bootstrap_ceo"
                        ? t("Accept bootstrap invite")
                        : t("Accept company invite")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {shouldAutoAcceptHumanInvite
                      ? t("Submitting your join request for {{company}}.", {
                        company: companyDisplayName,
                      })
                      : isCurrentMember
                      ? t("This account already belongs to {{company}}.", {
                        company: companyDisplayName,
                      })
                      : t("This will {{action}}.", {
                        action:
                          invite.inviteType === "bootstrap_ceo"
                            ? t("finish setting up Paperclip")
                            : t("submit or complete your join request for {{company}}", {
                              company: companyDisplayName,
                            }),
                      })}
                  </p>
                </div>
                {error ? <p className="text-xs text-red-400">{error}</p> : null}
                {shouldAutoAcceptHumanInvite ? (
                  <div className="text-sm text-zinc-400">
                    {acceptMutation.isPending ? t("Submitting request...") : t("Finishing sign-in...")}
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-none"
                    disabled={acceptMutation.isPending || isCurrentMember}
                    onClick={() => acceptMutation.mutate()}
                  >
                    {acceptMutation.isPending ? t("Working...") : joinButtonLabel}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
