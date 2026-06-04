import { forwardRef, useEffect, useImperativeHandle, useRef, type ForwardedRef } from "react";
import { Crepe, type CrepeConfig } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export interface MilkdownEditorHandle {
  getMarkdown: () => string;
}

type Translate = (key: string) => string;

function buildLocalizedCrepeConfig(t: Translate): NonNullable<CrepeConfig["featureConfigs"]> {
  return {
    [Crepe.Feature.Placeholder]: {
      text: t("Start writing knowledge here..."),
    },
    [Crepe.Feature.BlockEdit]: {
      textGroup: {
        label: t("Text"),
        text: { label: t("Text") },
        h1: { label: t("Heading 1") },
        h2: { label: t("Heading 2") },
        h3: { label: t("Heading 3") },
        h4: { label: t("Heading 4") },
        h5: { label: t("Heading 5") },
        h6: { label: t("Heading 6") },
        quote: { label: t("Quote") },
        divider: { label: t("Divider") },
      },
      listGroup: {
        label: t("List"),
        bulletList: { label: t("Bullet List") },
        orderedList: { label: t("Ordered List") },
        taskList: { label: t("Task List") },
      },
      advancedGroup: {
        label: t("Advanced"),
        image: { label: t("Image") },
        codeBlock: { label: t("Code block") },
        table: { label: t("Table") },
        math: { label: t("Math") },
      },
    },
    [Crepe.Feature.TopBar]: {
      headingOptions: [
        { label: t("Paragraph"), level: null },
        { label: t("Heading 1"), level: 1 },
        { label: t("Heading 2"), level: 2 },
        { label: t("Heading 3"), level: 3 },
        { label: t("Heading 4"), level: 4 },
        { label: t("Heading 5"), level: 5 },
        { label: t("Heading 6"), level: 6 },
      ],
    },
    [Crepe.Feature.CodeMirror]: {
      searchPlaceholder: t("Search language"),
      noResultText: t("No result"),
      copyText: t("Copy"),
      previewToggleText: (previewOnlyMode) => previewOnlyMode ? t("Edit") : t("Hide"),
      previewLabel: t("Preview"),
      previewLoading: t("Loading..."),
    },
    [Crepe.Feature.LinkTooltip]: {
      inputPlaceholder: t("Paste link..."),
    },
    [Crepe.Feature.ImageBlock]: {
      inlineUploadButton: t("Upload"),
      inlineUploadPlaceholderText: t("or paste link"),
      blockUploadButton: t("Upload file"),
      blockConfirmButton: t("Confirm"),
      blockCaptionPlaceholderText: t("Write Image Caption"),
      blockUploadPlaceholderText: t("or paste link"),
    },
  };
}

function MilkdownEditorSurface({
  editorKey,
  initialMarkdown,
  theme,
  className,
  onMarkdownChange,
}: {
  editorKey: string;
  initialMarkdown: string;
  theme: "light" | "dark";
  className?: string;
  onMarkdownChange?: (markdown: string) => void;
}, ref: ForwardedRef<MilkdownEditorHandle>) {
  const crepeRef = useRef<Crepe | null>(null);
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  const { t } = useLanguage();

  useEffect(() => {
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onMarkdownChange]);

  const { loading } = useEditor(
    (root) => {
      const crepe = new Crepe({
        root,
        defaultValue: initialMarkdown,
        features: {
          [Crepe.Feature.TopBar]: true,
        },
        featureConfigs: buildLocalizedCrepeConfig(t),
      });
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          onMarkdownChangeRef.current?.(markdown);
        });
      });
      crepeRef.current = crepe;
      return crepe;
    },
    [editorKey, initialMarkdown, t],
  );

  useImperativeHandle(ref, () => ({
    getMarkdown: () => crepeRef.current?.getMarkdown() ?? initialMarkdown,
  }), [initialMarkdown]);

  return (
    <div
      className={cn(
        "knowledge-editor-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs",
        theme === "light" ? "knowledge-editor-shell--light" : "knowledge-editor-shell--dark",
        className,
      )}
    >
      <div className="min-h-0 flex-1 bg-background/60 px-2 py-4">
        {loading ? <div className="px-4 py-8 text-sm text-muted-foreground">{t("Mounting knowledge editor...")}</div> : null}
        <Milkdown />
      </div>
    </div>
  );
}

const ForwardSurface = forwardRef(MilkdownEditorSurface);

export const MilkdownEditor = forwardRef<MilkdownEditorHandle, {
  editorKey: string;
  initialMarkdown: string;
  theme: "light" | "dark";
  className?: string;
  onMarkdownChange?: (markdown: string) => void;
}>(function MilkdownEditor({
  editorKey,
  initialMarkdown,
  theme,
  className,
  onMarkdownChange,
}, ref) {
  return (
    <MilkdownProvider>
      <ForwardSurface
        ref={ref}
        editorKey={editorKey}
        initialMarkdown={initialMarkdown}
        theme={theme}
        className={className}
        onMarkdownChange={onMarkdownChange}
      />
    </MilkdownProvider>
  );
});
