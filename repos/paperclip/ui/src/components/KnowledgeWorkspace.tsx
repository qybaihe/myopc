import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeDocument, KnowledgeDocumentSummary } from "@paperclipai/shared";
import {
  BookOpenText,
  Building2,
  ExternalLink,
  FileText,
  FolderKanban,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { knowledgeApi } from "@/api/knowledge";
import { OpenCodeLogoIcon } from "@/components/OpenCodeLogoIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToastActions } from "@/context/ToastContext";
import {
  buildEmbeddedOpenCodeProjectUrl,
  buildOpenCodeProjectUrl,
  normalizeOpenCodeWebUrlForBrowser,
} from "@/lib/opencode-project";
import { queryKeys } from "@/lib/queryKeys";
import { cn, relativeTime } from "@/lib/utils";
import { MilkdownEditor } from "./MilkdownEditor";

type CompanyKnowledgeScope = {
  kind: "company";
  companyId: string;
  companyName?: string | null;
};

type ProjectKnowledgeScope = {
  kind: "project";
  companyId: string;
  projectId: string;
  projectName: string;
  projectColor?: string | null;
};

type KnowledgeWorkspaceProps = {
  scope: CompanyKnowledgeScope | ProjectKnowledgeScope;
  openCodeBaseUrl?: string | null;
};

type SaveDraftInput = {
  docId: string;
  title: string;
  body: string;
};

type AutoSaveState = "saved" | "idle" | "saving" | "error";

function newDocumentTitle(scope: KnowledgeWorkspaceProps["scope"], t: (key: string) => string) {
  return scope.kind === "company" ? t("Company overview") : t("Project overview");
}

function scopeLabel(scope: KnowledgeWorkspaceProps["scope"], t: (key: string) => string) {
  return scope.kind === "company" ? t("Company knowledge") : t("Project knowledge");
}

function scopeIcon(scope: KnowledgeWorkspaceProps["scope"]) {
  return scope.kind === "company" ? Building2 : FolderKanban;
}

function toSummary(doc: KnowledgeDocument): KnowledgeDocumentSummary {
  const { body, bodyPath: _bodyPath, scopeDirectory: _scopeDirectory, ...summary } = doc;
  return summary;
}

function upsertSummaryList(
  existing: KnowledgeDocumentSummary[] | undefined,
  doc: KnowledgeDocument,
): KnowledgeDocumentSummary[] {
  const next = [toSummary(doc), ...(existing ?? []).filter((item) => item.id !== doc.id)];
  return next.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

function markdownToolLabels(t: (key: string) => string) {
  return [
    t("Slash commands"),
    t("Headings"),
    t("Lists"),
    t("Quotes"),
    t("Code blocks"),
    t("Tables"),
  ];
}

export function KnowledgeWorkspace({ scope, openCodeBaseUrl }: KnowledgeWorkspaceProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { pushToast } = useToastActions();
  const queryClient = useQueryClient();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDraftDocId, setActiveDraftDocId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("saved");
  const [openCodeDialogOpen, setOpenCodeDialogOpen] = useState(false);
  const [openCodeReloadSeed, setOpenCodeReloadSeed] = useState(0);
  const loadedDocIdRef = useRef<string | null>(null);
  const latestDraftRef = useRef<{
    docId: string | null;
    title: string;
    body: string;
    dirty: boolean;
  }>({
    docId: null,
    title: "",
    body: "",
    dirty: false,
  });

  const listQueryKey = useMemo(
    () => (
      scope.kind === "company"
        ? queryKeys.knowledge.companyList(scope.companyId)
        : queryKeys.knowledge.projectList(scope.projectId)
    ),
    [scope.kind, scope.companyId, scope.kind === "project" ? scope.projectId : null],
  );

  const detailQueryKeyForDoc = useCallback(
    (docId: string) => (
      scope.kind === "company"
        ? queryKeys.knowledge.companyDoc(scope.companyId, docId)
        : queryKeys.knowledge.projectDoc(scope.projectId, docId)
    ),
    [scope.kind, scope.companyId, scope.kind === "project" ? scope.projectId : null],
  );

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => (
      scope.kind === "company"
        ? knowledgeApi.listCompany(scope.companyId)
        : knowledgeApi.listProject(scope.projectId)
    ),
  });

  const docs = listQuery.data ?? [];

  useEffect(() => {
    loadedDocIdRef.current = null;
    setSelectedDocId(null);
    setActiveDraftDocId(null);
    setDraftTitle("");
    setDraftBody("");
    setAutoSaveState("saved");
    setOpenCodeDialogOpen(false);
  }, [scope.kind, scope.kind === "company" ? scope.companyId : scope.projectId]);

  useEffect(() => {
    if (docs.length === 0) {
      setSelectedDocId(null);
      return;
    }
    if (!selectedDocId || !docs.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(docs[0]?.id ?? null);
    }
  }, [docs, selectedDocId]);

  const detailQueryKey = selectedDocId
    ? detailQueryKeyForDoc(selectedDocId)
    : ["knowledge", "detail", "__empty__"] as const;

  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => {
      if (!selectedDocId) throw new Error("No knowledge document selected.");
      return scope.kind === "company"
        ? knowledgeApi.getCompany(scope.companyId, selectedDocId)
        : knowledgeApi.getProject(scope.projectId, selectedDocId);
    },
    enabled: Boolean(selectedDocId),
  });

  const currentDoc = detailQuery.data ?? null;
  const effectiveTitle = (draftTitle.trim() || currentDoc?.title || "").trim();
  const isDirty = currentDoc
    ? effectiveTitle !== currentDoc.title || draftBody !== currentDoc.body
    : false;

  useEffect(() => {
    latestDraftRef.current = {
      docId: currentDoc?.id ?? null,
      title: effectiveTitle,
      body: draftBody,
      dirty: isDirty,
    };
  }, [currentDoc?.id, draftBody, effectiveTitle, isDirty]);

  useEffect(() => {
    if (!currentDoc) return;
    if (loadedDocIdRef.current === currentDoc.id) return;
    loadedDocIdRef.current = currentDoc.id;
    setActiveDraftDocId(currentDoc.id);
    setDraftTitle(currentDoc.title);
    setDraftBody(currentDoc.body);
    setAutoSaveState("saved");
  }, [currentDoc?.id]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = newDocumentTitle(scope, t);
      return scope.kind === "company"
        ? knowledgeApi.createCompany(scope.companyId, { title, body: `# ${title}\n\n` })
        : knowledgeApi.createProject(scope.projectId, { title, body: `# ${title}\n\n` });
    },
    onSuccess: (created) => {
      loadedDocIdRef.current = null;
      setActiveDraftDocId(null);
      queryClient.setQueryData(listQueryKey, (existing: KnowledgeDocumentSummary[] | undefined) =>
        upsertSummaryList(existing, created),
      );
      queryClient.setQueryData(detailQueryKeyForDoc(created.id), created);
      setSelectedDocId(created.id);
      pushToast({ title: t("Created knowledge document"), body: created.title, tone: "success" });
    },
    onError: (error) => {
      pushToast({
        title: t("Could not create knowledge document"),
        body: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: SaveDraftInput) => (
      scope.kind === "company"
        ? knowledgeApi.updateCompany(scope.companyId, input.docId, { title: input.title, body: input.body })
        : knowledgeApi.updateProject(scope.projectId, input.docId, { title: input.title, body: input.body })
    ),
    onSuccess: (saved) => {
      queryClient.setQueryData(detailQueryKeyForDoc(saved.id), saved);
      queryClient.setQueryData(listQueryKey, (existing: KnowledgeDocumentSummary[] | undefined) =>
        upsertSummaryList(existing, saved),
      );
      setAutoSaveState("saved");
    },
    onError: (error) => {
      setAutoSaveState("error");
      pushToast({
        title: t("Could not save knowledge document"),
        body: error instanceof Error ? error.message : undefined,
        tone: "error",
      });
    },
  });

  const persistCurrentDraft = useCallback(async () => {
    if (!currentDoc || !isDirty) return;
    try {
      setAutoSaveState("saving");
      await saveMutation.mutateAsync({
        docId: currentDoc.id,
        title: effectiveTitle || currentDoc.title,
        body: draftBody,
      });
    } catch {
      // Error state/toast handled in mutation.
    }
  }, [currentDoc, draftBody, effectiveTitle, isDirty, saveMutation]);

  useEffect(() => {
    if (!currentDoc) return;
    if (activeDraftDocId !== currentDoc.id) return;
    if (!isDirty) {
      if (!saveMutation.isPending) {
        setAutoSaveState("saved");
      }
      return;
    }
    if (saveMutation.isPending) return;

    setAutoSaveState("idle");
    const timeoutId = window.setTimeout(() => {
      setAutoSaveState("saving");
      saveMutation.mutate({
        docId: currentDoc.id,
        title: effectiveTitle || currentDoc.title,
        body: draftBody,
      });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentDoc?.id,
    currentDoc?.title,
    currentDoc?.body,
    draftBody,
    effectiveTitle,
    isDirty,
    activeDraftDocId,
    saveMutation.isPending,
  ]);

  useEffect(() => {
    return () => {
      const latest = latestDraftRef.current;
      if (!latest.docId || !latest.dirty) return;
      void (
        scope.kind === "company"
          ? knowledgeApi.updateCompany(scope.companyId, latest.docId, {
              title: latest.title,
              body: latest.body,
            })
          : knowledgeApi.updateProject(scope.projectId, latest.docId, {
              title: latest.title,
              body: latest.body,
            })
      );
    };
  }, [scope.kind, scope.companyId, scope.kind === "project" ? scope.projectId : null]);

  async function handleSelectDocument(docId: string) {
    if (docId === selectedDocId) return;
    await persistCurrentDraft();
    loadedDocIdRef.current = null;
    setActiveDraftDocId(null);
    setSelectedDocId(docId);
  }

  async function handleCreateDocument() {
    await persistCurrentDraft();
    createMutation.mutate();
  }

  const ScopeIcon = scopeIcon(scope);
  const scopeName = scope.kind === "company"
    ? (scope.companyName ?? t("Company"))
    : scope.projectName;
  const markdownTools = markdownToolLabels(t);
  const resolvedOpenCodeBaseUrl = normalizeOpenCodeWebUrlForBrowser(openCodeBaseUrl);
  const embeddedOpenCodeUrl = currentDoc?.scopeDirectory
    ? buildEmbeddedOpenCodeProjectUrl(resolvedOpenCodeBaseUrl, currentDoc.scopeDirectory, {
        theme,
        hideSidebar: true,
      })
    : null;
  const openCodeExternalUrl = currentDoc?.scopeDirectory
    ? buildOpenCodeProjectUrl(resolvedOpenCodeBaseUrl, currentDoc.scopeDirectory)
    : null;

  return (
    <>
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">{t("Knowledge library")}</h2>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("{{count}} documents", { count: docs.length })}
              </div>
            </div>

            <Button size="sm" onClick={() => void handleCreateDocument()} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? t("Creating...") : t("New document")}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {listQuery.isLoading ? (
                <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  {t("Loading knowledge documents...")}
                </div>
              ) : docs.length === 0 ? (
                <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{t("No documents yet")}</div>
                  <div className="mt-1">{t("Create the first note, SOP, or architecture page for this scope.")}</div>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void handleCreateDocument()}>
                    <Plus className="h-4 w-4" />
                    {t("Create first document")}
                  </Button>
                </div>
              ) : (
                docs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => void handleSelectDocument(doc.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      selectedDocId === doc.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{doc.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {relativeTime(doc.updatedAt)}
                        </div>
                        {doc.summary ? (
                          <div className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{doc.summary}</div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-col">
          {detailQuery.isLoading && currentDoc === null ? (
            <div className="rounded-2xl border bg-card px-4 py-8 text-sm text-muted-foreground shadow-xs">
              {t("Loading knowledge document...")}
            </div>
          ) : currentDoc ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs">
              <div className="border-b px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        <ScopeIcon className="mr-1 h-3.5 w-3.5" />
                        {scopeName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {autoSaveState === "saving"
                          ? t("Autosaving...")
                          : autoSaveState === "error"
                            ? t("Auto-save failed")
                            : t("Saved automatically")}
                      </span>
                    </div>
                    <Input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      className="h-11 text-base font-semibold"
                      placeholder={t("Document title")}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("Updated")} · {relativeTime(currentDoc.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 px-4 py-4">
                <MilkdownEditor
                  key={currentDoc.id}
                  editorKey={currentDoc.id}
                  initialMarkdown={currentDoc.body}
                  theme={theme}
                  className="h-full"
                  onMarkdownChange={setDraftBody}
                />
              </div>

              <div className="border-t px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    {t("Markdown tools")}
                  </span>
                  {markdownTools.map((label) => (
                    <Badge key={label} variant="outline" className="rounded-full">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {currentDoc.bodyPath
                      ? t("OpenCode can open this knowledge directory directly and help you edit the current markdown files.")
                      : t("Summon OpenCode to work with this knowledge base in a floating workspace.")}
                  </div>
                  <Button
                    onClick={() => setOpenCodeDialogOpen(true)}
                    className="shrink-0"
                    disabled={!currentDoc.scopeDirectory}
                  >
                    <OpenCodeLogoIcon className="size-4" />
                    {t("Summon OpenCode")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-card px-4 py-10 text-sm text-muted-foreground shadow-xs">
              {t("Choose a document")}
            </div>
          )}
        </div>
      </div>

      <Dialog open={openCodeDialogOpen} onOpenChange={setOpenCodeDialogOpen}>
        <DialogContent className="!max-w-[92vw] h-[86vh] max-h-[86vh] overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b px-5 py-4 text-left">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <DialogTitle className="flex items-center gap-2">
                    <OpenCodeLogoIcon className="size-5" />
                    {t("OpenCode knowledge assistant")}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {currentDoc
                      ? t("Talk to OpenCode here and let it work directly inside the current knowledge directory.")
                      : t("OpenCode will appear here once a knowledge document is selected.")}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  {openCodeExternalUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={openCodeExternalUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t("Open in new tab")}
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => setOpenCodeReloadSeed((value) => value + 1)}
                    disabled={!embeddedOpenCodeUrl}
                    aria-label={t("Reload")}
                    title={t("Reload")}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {currentDoc ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{scopeName}</Badge>
                  <Badge variant="outline">{currentDoc.title}</Badge>
                </div>
              ) : null}
            </DialogHeader>

            <div className="min-h-0 flex-1 bg-background">
              {embeddedOpenCodeUrl ? (
                <iframe
                  key={`${embeddedOpenCodeUrl}:${openCodeReloadSeed}`}
                  src={embeddedOpenCodeUrl}
                  title={t("OpenCode knowledge assistant")}
                  className="h-full w-full border-0 bg-background"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
                  {t("OpenCode will appear here once a knowledge document is selected.")}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
