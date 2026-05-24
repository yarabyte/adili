"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

interface ToolbarItem {
  icon: IconType;
  label: string;
  isActive: (e: Editor) => boolean;
  onClick: (e: Editor) => void;
  canRun: (e: Editor) => boolean;
}

const FORMATTING: ToolbarItem[] = [
  {
    icon: Bold,
    label: "Gras (⌘B)",
    isActive: (e) => e.isActive("bold"),
    onClick: (e) => e.chain().focus().toggleBold().run(),
    canRun: (e) => e.can().chain().focus().toggleBold().run(),
  },
  {
    icon: Italic,
    label: "Italique (⌘I)",
    isActive: (e) => e.isActive("italic"),
    onClick: (e) => e.chain().focus().toggleItalic().run(),
    canRun: (e) => e.can().chain().focus().toggleItalic().run(),
  },
  {
    icon: Strikethrough,
    label: "Barré",
    isActive: (e) => e.isActive("strike"),
    onClick: (e) => e.chain().focus().toggleStrike().run(),
    canRun: (e) => e.can().chain().focus().toggleStrike().run(),
  },
];

const BLOCKS: ToolbarItem[] = [
  {
    icon: Heading1,
    label: "Titre 1",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    onClick: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    canRun: (e) => e.can().chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    icon: Heading2,
    label: "Titre 2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    onClick: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    canRun: (e) => e.can().chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    icon: Heading3,
    label: "Titre 3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    onClick: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    canRun: (e) => e.can().chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    icon: List,
    label: "Liste à puces",
    isActive: (e) => e.isActive("bulletList"),
    onClick: (e) => e.chain().focus().toggleBulletList().run(),
    canRun: (e) => e.can().chain().focus().toggleBulletList().run(),
  },
  {
    icon: ListOrdered,
    label: "Liste numérotée",
    isActive: (e) => e.isActive("orderedList"),
    onClick: (e) => e.chain().focus().toggleOrderedList().run(),
    canRun: (e) => e.can().chain().focus().toggleOrderedList().run(),
  },
  {
    icon: Quote,
    label: "Bloc citation",
    isActive: (e) => e.isActive("blockquote"),
    onClick: (e) => e.chain().focus().toggleBlockquote().run(),
    canRun: (e) => e.can().chain().focus().toggleBlockquote().run(),
  },
];

export function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  if (!editor) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-lg border border-brand-justice/10 bg-card px-2 py-1.5",
        disabled && "pointer-events-none opacity-50"
      )}
      role="toolbar"
      aria-label="Mise en forme"
    >
      {FORMATTING.map((item) => (
        <ToolbarButton key={item.label} item={item} editor={editor} />
      ))}
      <Separator />
      {BLOCKS.map((item) => (
        <ToolbarButton key={item.label} item={item} editor={editor} />
      ))}
      <Separator />
      <button
        type="button"
        title="Annuler (⌘Z)"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-brand-parchment-dark/50 hover:text-foreground disabled:opacity-30"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        title="Rétablir (⇧⌘Z)"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-brand-parchment-dark/50 hover:text-foreground disabled:opacity-30"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ToolbarButton({
  item,
  editor,
}: {
  item: ToolbarItem;
  editor: Editor;
}) {
  const Icon = item.icon;
  const active = item.isActive(editor);
  return (
    <button
      type="button"
      title={item.label}
      aria-pressed={active}
      onClick={() => item.onClick(editor)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition",
        active
          ? "bg-brand-justice/10 text-brand-justice"
          : "text-muted-foreground hover:bg-brand-parchment-dark/50 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Separator() {
  return (
    <span
      aria-hidden
      className="mx-0.5 h-5 w-px self-center bg-brand-justice/10"
    />
  );
}
