import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export interface TiptapEditorHandle {
  getHTML: () => string;
  setContent: (html: string) => void;
}

interface TiptapEditorProps {
  initialHTML: string;
  onChange: (html: string) => void;
}

// Convert BlockNote JSON → HTML for Tiptap
function blockNoteToHTML(content: string): string {
  if (!content) return '';
  // Already HTML
  if (content.trim().startsWith('<')) return content;
  try {
    const blocks: any[] = JSON.parse(content);
    if (!Array.isArray(blocks)) return '';
    
    let html = '';
    let currentListType: 'ul' | 'ol' | null = null;
    
    for (const block of blocks) {
      const inlineToHTML = (items: any[]): string =>
        (items || [])
          .map((c: any) => {
            if (c.type === 'link') {
              const inner = inlineToHTML(c.content || []);
              return `<a href="${c.href || '#'}">${inner}</a>`;
            }
            let t = (c.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (c.styles?.bold) t = `<strong>${t}</strong>`;
            if (c.styles?.italic) t = `<em>${t}</em>`;
            if (c.styles?.underline) t = `<u>${t}</u>`;
            if (c.styles?.strike) t = `<s>${t}</s>`;
            if (c.styles?.code) t = `<code>${t}</code>`;
            return t;
          })
          .join('');

      const childrenHtml = block.children?.length
        ? `<ul>${block.children.map((child: any) => `<li>${inlineToHTML(child.content || [])}</li>`).join('')}</ul>`
        : '';

      const text = inlineToHTML(block.content || []);
      
      const isBullet = block.type === 'bulletListItem' || block.type === 'checkListItem';
      const isNumbered = block.type === 'numberedListItem';
      const listType = isBullet ? 'ul' : (isNumbered ? 'ol' : null);
      
      // Close previous list if list type changed
      if (currentListType && currentListType !== listType) {
        html += `</${currentListType}>\n`;
        currentListType = null;
      }
      
      // Open new list if needed
      if (listType && currentListType !== listType) {
        html += `<${listType}>\n`;
        currentListType = listType;
      }
      
      switch (block.type) {
        case 'heading':
          html += `<h${block.props?.level || 1}>${text}</h${block.props?.level || 1}>\n${childrenHtml}`;
          break;
        case 'bulletListItem':
        case 'numberedListItem':
        case 'checkListItem':
          html += `<li>${text}${childrenHtml}</li>\n`;
          break;
        case 'codeBlock':
          html += `<pre><code>${text}</code></pre>\n`;
          break;
        default:
          html += text ? `<p>${text}</p>\n` : `<p></p>\n`;
          break;
      }
    }
    
    if (currentListType) {
      html += `</${currentListType}>\n`;
    }
    
    return html;
  } catch {
    return `<p>${content}</p>`;
  }
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  ({ initialHTML, onChange }, ref) => {
    const html = blockNoteToHTML(initialHTML);

    const editor = useEditor({
      extensions: [StarterKit],
      content: html,
      onUpdate({ editor }) {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class: 'tiptap-content',
          spellcheck: 'true',
        },
      },
    });

    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? '',
      setContent: (newHTML: string) => {
        if (editor) {
        editor.commands.setContent(blockNoteToHTML(newHTML), { emitUpdate: false });
        }
      },
    }));

    // Update content if initialHTML changes (e.g. user switched quick note)
    useEffect(() => {
      if (editor && html !== undefined) {
        const current = editor.getHTML();
        const newHTML = blockNoteToHTML(initialHTML);
        if (current !== newHTML) {
          editor.commands.setContent(newHTML, { emitUpdate: false });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialHTML]);

    return (
      <div className="tiptap-wrapper">
        <div className="tiptap-toolbar">
          <button
            className={`toolbar-btn ${editor?.isActive('bold') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('italic') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('strike') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <div className="toolbar-divider" />
          <button
            className={`toolbar-btn ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }}
            title="Heading 1"
          >
            H1
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}
            title="Heading 2"
          >
            H2
          </button>
          <div className="toolbar-divider" />
          <button
            className={`toolbar-btn ${editor?.isActive('bulletList') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
            title="Bullet list"
          >
            •≡
          </button>
          <button
            className={`toolbar-btn ${editor?.isActive('orderedList') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
            title="Ordered list"
          >
            1≡
          </button>
          <div className="toolbar-divider" />
          <button
            className={`toolbar-btn ${editor?.isActive('codeBlock') ? 'active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCodeBlock().run(); }}
            title="Code block"
          >
            {'</>'}
          </button>
        </div>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
