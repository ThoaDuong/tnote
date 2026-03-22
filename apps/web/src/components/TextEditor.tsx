import { useMemo } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import './TextEditor.css';

interface TextEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
}

export default function TextEditor({ initialContent, onChange }: TextEditorProps) {
  // Parse initial content, protecting against the old incompatible format
  const parsedContent = useMemo(() => {
    if (!initialContent) return undefined;
    try {
      const data = JSON.parse(initialContent);
      if (Array.isArray(data) && data.length > 0) {
        // Drop the old format (where content was a raw string instead of an array) to prevent crashes
        if (typeof data[0].content === 'string') {
          return undefined;
        }
        return data as PartialBlock[];
      }
    } catch {
      return undefined;
    }
    return undefined;
  }, [initialContent]);

  // Automatically creates a BlockNote editor instance
  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  return (
    <div className="notion-editor-container" style={{ padding: '40px' }}>
      <BlockNoteView
        editor={editor}
        onChange={() => {
          // Serialize the newly updated document back to JSON string
          onChange(JSON.stringify(editor.document));
        }}
        theme="light"
      />
    </div>
  );
}
