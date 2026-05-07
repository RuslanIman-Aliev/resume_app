"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { getEditorInitialContent } from "@/lib/editor-utils";

export const AnalyzeOriginalResume = ({ resumeId }: { resumeId: string }) => {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery({
    ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const parsedResumeText = data?.resume.parsedContent ?? "";

  const editorInitialContent = useMemo(
    () => getEditorInitialContent(parsedResumeText),
    [parsedResumeText],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[420px] max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background px-8 py-6 shadow-sm",
      },
    },
  });

  useEffect(() => {
    if (!editor || isLoading) return;
    editor.commands.setContent(editorInitialContent);
  }, [editor, isLoading, editorInitialContent]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {isLoading ? (
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-5">
          <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} className="h-full" />
      )}
    </div>
  );
};
