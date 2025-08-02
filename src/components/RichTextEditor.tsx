import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, 
       { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'direction', 'color', 'background', 'align'
  ];

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-background"
        style={{
          '--ql-border-color': 'hsl(var(--border))',
          '--ql-text-color': 'hsl(var(--foreground))',
        } as React.CSSProperties}
      />
      <style>{`
        .ql-toolbar {
          border-top: 1px solid hsl(var(--border)) !important;
          border-left: 1px solid hsl(var(--border)) !important;
          border-right: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
        }
        
        .ql-container {
          border-bottom: 1px solid hsl(var(--border)) !important;
          border-left: 1px solid hsl(var(--border)) !important;
          border-right: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
        }
        
        .ql-editor {
          color: hsl(var(--foreground)) !important;
          font-family: inherit !important;
          min-height: 200px !important;
        }
        
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground)) !important;
          font-style: normal !important;
        }
        
        .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground)) !important;
        }
        
        .ql-toolbar button:hover {
          background-color: hsl(var(--accent)) !important;
        }
        
        .ql-toolbar button.ql-active {
          background-color: hsl(var(--primary) / 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;