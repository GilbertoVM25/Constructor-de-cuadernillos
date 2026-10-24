
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

type Props = {
  value?: string;
  legacyText: string;
  onChange: (html: string) => void;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtml(text: string): string {
  return text
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');
}

export function RichTextEditor({
  value,
  legacyText,
  onChange,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Subscript,
      Superscript,
    ],
    content: value ?? textToHtml(legacyText),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const toolbar = [
    {
      label: 'B',
      title: 'Negrita',
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'I',
      title: 'Cursiva',
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'U',
      title: 'Subrayado',
      active: editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'X₂',
      title: 'Subíndice',
      active: editor.isActive('subscript'),
      run: () => editor.chain().focus().toggleSubscript().run(),
    },
    {
      label: 'X²',
      title: 'Superíndice',
      active: editor.isActive('superscript'),
      run: () => editor.chain().focus().toggleSuperscript().run(),
    },
    {
      label: '•',
      title: 'Lista con viñetas',
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '1.',
      title: 'Lista numerada',
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="rich-text-editor">
      <div
        className="rich-text-toolbar"
        role="toolbar"
        aria-label="Formato del texto"
      >
        {toolbar.map((item) => (
          <button
            key={item.title}
            type="button"
            title={item.title}
            aria-label={item.title}
            aria-pressed={item.active}
            className={item.active ? 'active' : ''}
            onMouseDown={(event) => event.preventDefault()}
            onClick={item.run}
          >
            {item.label}
          </button>
        ))}
      </div>

      <EditorContent
        editor={editor}
        className="rich-text-content"
      />
    </div>
  );
}
