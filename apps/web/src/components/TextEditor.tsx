import { useMemo, useEffect, useRef } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import './TextEditor.css';

interface TextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function TextEditor({ initialContent, onChange, readOnly = false }: TextEditorProps) {
  const htmlLoadedRef = useRef(false);

  // Parse initial content — supports BlockNote JSON
  const parsedContent = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      const data = JSON.parse(initialContent);
      if (Array.isArray(data) && data.length > 0) {
        return data as PartialBlock[];
      }
    } catch {
      // Not JSON — could be HTML from Tiptap extension
    }
    return undefined;
  }, [initialContent]);

  // Detect raw HTML content (from Tiptap extension)
  const isHTML = useMemo(() => {
    if (!initialContent || parsedContent) return false;
    const trimmed = initialContent.trim();
    return trimmed.startsWith('<') && trimmed.length > 0;
  }, [initialContent, parsedContent]);

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // If HTML content (from Tiptap extension), convert to BlockNote blocks
  // tryParseHTMLToBlocks is synchronous in BlockNote 0.47.x
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
    <div className="notion-editor-container" style={{ padding: '40px' }}>
      <BlockNoteView
        editor={editor}
        onChange={() => {
          if (!readOnly) {
            onChange(JSON.stringify(editor.document));
          }
        }}
        theme="light"
        editable={!readOnly}
      />
    </div>
  );
}
