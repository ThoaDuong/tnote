import { useMemo, useEffect, useRef } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface BlockNoteEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function BlockNoteEditor({ initialContent, onChange }: BlockNoteEditorProps) {
  const htmlLoadedRef = useRef(false);

  // Parse initial content — supports BlockNote JSON
  const parsedContent = useMemo(() => {
    console.log('[DEBUG] BlockNoteEditor initialContent:', {
      length: initialContent?.length ?? 0,
      preview: initialContent?.substring(0, 200),
      isEmpty: !initialContent,
    });
    if (!initialContent) return undefined;
    try {
      const data = JSON.parse(initialContent);
      if (Array.isArray(data) && data.length > 0) {
        console.log('[DEBUG] Parsed as BlockNote JSON, blocks:', data.length);
        return data as PartialBlock[];
      }
    } catch {
      console.log('[DEBUG] Not JSON, checking if HTML...');
    }
    return undefined;
  }, [initialContent]);

  // Detect raw HTML content (from old Tiptap extension)
  const isHTML = useMemo(() => {
    if (!initialContent || parsedContent) return false;
    const trimmed = initialContent.trim();
    return trimmed.startsWith('<') && trimmed.length > 0;
  }, [initialContent, parsedContent]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // If HTML content (from old Tiptap extension), convert to BlockNote blocks
  useEffect(() => {
    if (isHTML && !htmlLoadedRef.current && editor && initialContent) {
      htmlLoadedRef.current = true;
      try {
        const blocks = editor.tryParseHTMLToBlocks(initialContent) as PartialBlock[];
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(editor.document, blocks);
        }
      } catch (e) {
        console.error('Failed to parse HTML content:', e);
      }
    }
  }, [isHTML, editor, initialContent]);

  return (
    <div className="blocknote-editor-container">
      <BlockNoteView
        editor={editor}
        onChange={() => {
          onChange(JSON.stringify(editor.document));
        }}
        theme="light"
      />
    </div>
  );
}
