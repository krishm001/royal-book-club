import { useLanguage } from '../../i18n/LanguageContext';
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Undo, Redo, Code } from 'lucide-react';
import './RichTextEditor.css';
const RichTextEditor = ({
  value = '',
  onChange = () => {
    const {
      t
    } = useLanguage();
  },
  placeholder = 'Begin your literary draft here...',
  minHeight = '200px'
}) => {
  const editor = useEditor({
    extensions: [StarterKit.configure({
      // Configure extensions if needed
      heading: {
        levels: [1, 2]
      }
    })],
    content: value,
    onUpdate: ({
      editor
    }) => {
      onChange(editor.getHTML());
    }
  });
  if (!editor) {
    return <div className="editor-loading-placeholder">
        <div className="loader-mini"></div>
        <span>{t('auto_3124', 'Preparing parchment and ink...')}</span>
      </div>;
  }
  return <div className="royal-editor-wrapper">
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`} title={t("str_5070", "Bold")} id="editor-btn-bold">
            <Bold size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`} title={t("str_5071", "Italic")} id="editor-btn-italic">
            <Italic size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`} title={t("str_5072", "Strikethrough")} id="editor-btn-strike">
            <Strikethrough size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({
          level: 1
        }).run()} className={`toolbar-btn ${editor.isActive('heading', {
          level: 1
        }) ? 'active' : ''}`} title={t("str_5073", "Heading 1")} id="editor-btn-h1">
            <Heading1 size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({
          level: 2
        }).run()} className={`toolbar-btn ${editor.isActive('heading', {
          level: 2
        }) ? 'active' : ''}`} title={t("str_5074", "Heading 2")} id="editor-btn-h2">
            <Heading2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`} title={t("str_5075", "Bullet List")} id="editor-btn-bullet">
            <List size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`} title={t("str_5076", "Numbered List")} id="editor-btn-ordered">
            <ListOrdered size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group">
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`} title={t("str_5077", "Blockquote")} id="editor-btn-quote">
            <Quote size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`} title={t("str_5078", "Code Block")} id="editor-btn-code">
            <Code size={16} />
          </button>
        </div>

        <div className="toolbar-divider"></div>

        <div className="toolbar-group undo-redo-group">
          <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className="toolbar-btn" title={t("str_5079", "Undo")} id="editor-btn-undo">
            <Undo size={16} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className="toolbar-btn" title={t("str_5080", "Redo")} id="editor-btn-redo">
            <Redo size={16} />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="editor-content-area" style={{
      '--editor-min-height': minHeight
    }}>
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>;
};
export default RichTextEditor;