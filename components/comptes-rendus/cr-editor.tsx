"use client";

import { useCallback, useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Cloud, CloudOff, Loader2 } from "lucide-react";

import { saveCompteRenduCorps } from "@/app/actions/comptes-rendus";
import { useCrSaveQueue } from "@/components/comptes-rendus/cr-save-queue";
import { useDocumentAutosave } from "@/hooks/use-document-autosave";
import { cn } from "@/lib/utils";

function toPlainJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function CrEditor({
  compteRenduId,
  initialContent,
  readOnly,
}: {
  compteRenduId: string;
  initialContent: unknown;
  readOnly: boolean;
}) {
  const { enqueue, formSaving } = useCrSaveQueue();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder:
          "Rédigez le compte rendu ici — faits, déroulé, points clés…",
      }),
    ],
    content: initialContent as object,
    editable: !readOnly,
    immediatelyRender: false,
  });

  const saveFn = useCallback(
    async (payload: { corpsTiptap: unknown; corpsText: string }) => {
      return enqueue(() =>
        saveCompteRenduCorps(compteRenduId, {
          corpsTiptap: payload.corpsTiptap,
          corpsText: payload.corpsText,
          createSnapshot: false,
        })
      );
    },
    [compteRenduId, enqueue]
  );

  const { status, trigger, saveNow } = useDocumentAutosave({
    enabled: !readOnly && Boolean(editor) && !formSaving,
    delayMs: 2500,
    save: saveFn,
  });

  useEffect(() => {
    if (!editor || readOnly) return;
    const onUpdate = () => {
      trigger({
        corpsTiptap: toPlainJson(editor.getJSON()),
        corpsText: editor.getText(),
      });
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor, readOnly, trigger]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "saving":
        return "Enregistrement…";
      case "saved":
        return "Enregistré";
      case "dirty":
        return "Modifications en attente";
      case "error":
        return "Erreur de sauvegarde";
      default:
        return readOnly ? "Lecture seule" : "Prêt";
    }
  }, [status, readOnly]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-justice/10 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wider">Corps du compte rendu</span>
        <span className="inline-flex items-center gap-1.5">
          {status === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "error" ? (
            <CloudOff className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Cloud className="h-3.5 w-3.5" />
          )}
          {statusLabel}
        </span>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-brand-justice/10 bg-card p-1">
          <ToolbarBtn
            label="Gras"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarBtn
            label="Italique"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarBtn
            label="H2"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <ToolbarBtn
            label="Liste"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
        </div>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          "tiptap-compte-rendu max-w-none rounded-xl border border-brand-justice/12 bg-card px-4 py-3 focus-within:ring-1 focus-within:ring-ring",
          readOnly && "opacity-90"
        )}
        onBlur={() => {
          if (!readOnly && editor) {
            void saveNow({
              corpsTiptap: toPlainJson(editor.getJSON()),
              corpsText: editor.getText(),
            });
          }
        }}
      />
    </div>
  );
}

function ToolbarBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-xs font-medium transition",
        active
          ? "bg-brand-justice/15 text-brand-justice"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
