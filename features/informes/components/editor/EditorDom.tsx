'use dom';

import { mergeAttributes } from '@tiptap/core';
import { Mention } from '@tiptap/extension-mention';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { iniciales } from '../../utils/format';
import React, { useEffect, useRef, useState } from 'react';

export interface PersonaSugerida {
  id: number;
  nombre: string;
  rol: string;
}

export type AltoEditor = 'compacto' | 'libre' | 'alto';

interface Props {
  initialHtml: string;
  placeholder: string;
  alto: AltoEditor;
  popoverArriba: boolean;
  miId: number | null;
  resetNonce: number;
  autoFocus?: boolean;
  deshabilitado?: boolean;
  onChange: (html: string, vacio: boolean) => Promise<void>;
  onBuscar: (consulta: string) => Promise<PersonaSugerida[]>;
  onAdjuntar: () => Promise<void>;
  onEnviar: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

interface SuggestionState {
  consulta: string;
  command: (attrs: { id: string; label: string }) => void;
}

const MIN_CONSULTA = 2;
const MAX_SUGERENCIAS = 5;

const MentionPill = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-mention'),
        renderHTML: (attrs: Record<string, any>) => (attrs.id ? { 'data-mention': attrs.id } : {}),
      },
      label: {
        default: null,
        parseHTML: (el: HTMLElement) => el.textContent,
        renderHTML: () => ({}),
      },
      mentionSuggestionChar: {
        default: '@',
        parseHTML: () => '@',
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-mention]' }];
  },
});

const ESTILOS = `
html, body { margin: 0; padding: 0; background: transparent; }
body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #11181c; -webkit-text-size-adjust: 100%; }
* { box-sizing: border-box; }
.ed { border: 1px solid rgba(17,24,28,0.12); border-radius: 14px; background: rgba(255,255,255,0.6); overflow: hidden; }
.ed.focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
.ed.off { opacity: .6; pointer-events: none; }
.bar { display: flex; align-items: center; gap: 2px; padding: 5px 6px; border-bottom: 1px solid rgba(17,24,28,0.08); }
.btn { width: 32px; height: 30px; border: 0; border-radius: 7px; background: transparent; color: #4a5058; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; font-family: inherit; }
.btn:hover { background: rgba(17,24,28,0.06); }
.btn.on { background: rgba(26,115,232,0.14); color: #1558b0; }
.sep { width: 1px; height: 18px; background: rgba(17,24,28,0.1); margin: 0 4px; }
.area { padding: 10px 14px; font-size: 16px; line-height: 1.45; overflow-y: auto; }
.area.compacto { min-height: 24px; max-height: 110px; }
.area.libre { min-height: 24px; }
.area.alto { min-height: 220px; }
.ProseMirror { outline: none; min-height: inherit; word-break: break-word; }
.ProseMirror p { margin: 0; }
.ProseMirror p + p { margin-top: 4px; }
.ProseMirror ul, .ProseMirror ol { padding-left: 22px; margin: 4px 0; }
.ProseMirror a { color: #1a73e8; text-decoration: underline; }
.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #8a8f98; float: left; height: 0; pointer-events: none; }
.mention { display: inline-block; background: rgba(26,115,232,0.14); color: #1558b0; font-weight: 600; font-size: .94em; border-radius: 999px; padding: 1px 8px; white-space: nowrap; }
.mention.mine { background: #1a73e8; color: #fff; }
.pop { background: #fff; border: 1px solid rgba(17,24,28,0.08); border-radius: 14px; box-shadow: 0 12px 32px rgba(20,24,30,.18); overflow: hidden; }
.pop.arriba { margin-bottom: 8px; }
.pop.abajo { margin-top: 8px; }
.pop-h { padding: 8px 14px 4px; font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #687076; }
.pop-row { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; padding: 8px 14px; text-align: left; cursor: pointer; font-family: inherit; }
.pop-row.sel { background: rgba(26,115,232,0.08); }
.av { width: 32px; height: 32px; border-radius: 16px; background: rgba(26,115,232,0.16); color: #1558b0; font-size: 12.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pn { font-size: 14px; font-weight: 700; color: #11181c; }
.pr { font-size: 12px; color: #687076; }
.pop-n { padding: 10px 14px; font-size: 13px; color: #687076; }
`;

const Icono = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function EditorDom({
  initialHtml,
  placeholder,
  alto,
  popoverArriba,
  miId,
  resetNonce,
  autoFocus,
  deshabilitado,
  onChange,
  onBuscar,
  onAdjuntar,
  onEnviar,
}: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const [sugerencia, setSugerencia] = useState<SuggestionState | null>(null);
  const [resultados, setResultados] = useState<PersonaSugerida[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [indice, setIndice] = useState(0);

  const sugerenciaRef = useRef<SuggestionState | null>(null);
  const resultadosRef = useRef<PersonaSugerida[]>([]);
  const indiceRef = useRef(0);
  const cb = useRef({ onChange, onBuscar, onEnviar });
  cb.current = { onChange, onBuscar, onEnviar };

  sugerenciaRef.current = sugerencia;
  resultadosRef.current = resultados;
  indiceRef.current = indice;

  const elegir = (p: PersonaSugerida) => sugerenciaRef.current?.command({ id: String(p.id), label: p.nombre });

  const editor = useEditor({
    immediatelyRender: true,
    autofocus: autoFocus ? 'end' : false,
    content: initialHtml,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https'] },
      }),
      Placeholder.configure({ placeholder }),
      MentionPill.configure({
        renderText: ({ node }) => node.attrs.label ?? '',
        renderHTML: ({ node, options }) => [
          'span',
          mergeAttributes(
            { class: String(node.attrs.id) === String(miId) ? 'mention mine' : 'mention' },
            options.HTMLAttributes,
          ),
          node.attrs.label ?? '',
        ],
        suggestion: {
          char: '@',
          allowSpaces: true,
          items: () => [],
          render: () => ({
            onStart: (props) => setSugerencia({ consulta: props.query, command: props.command }),
            onUpdate: (props) => setSugerencia({ consulta: props.query, command: props.command }),
            onExit: () => setSugerencia(null),
            onKeyDown: ({ event }) => {
              if (!sugerenciaRef.current) return false;
              const lista = resultadosRef.current;
              if (event.key === 'Escape') {
                setSugerencia(null);
                return true;
              }
              if (lista.length === 0) return false;
              if (event.key === 'ArrowDown') {
                setIndice((i) => (i + 1) % lista.length);
                return true;
              }
              if (event.key === 'ArrowUp') {
                setIndice((i) => (i - 1 + lista.length) % lista.length);
                return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                const elegida = lista[indiceRef.current];
                if (elegida) elegir(elegida);
                return true;
              }
              return false;
            },
          }),
        },
      }),
    ],
    editorProps: {
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          cb.current.onEnviar();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      cb.current.onChange(ed.isEmpty ? '' : ed.getHTML(), ed.isEmpty);
    },
    onFocus: () => setEnfocado(true),
    onBlur: () => setEnfocado(false),
  });

  useEffect(() => {
    editor?.setEditable(!deshabilitado);
  }, [editor, deshabilitado]);

  const primerReset = useRef(true);
  useEffect(() => {
    if (primerReset.current) {
      primerReset.current = false;
      return;
    }
    editor?.commands.clearContent(true);
  }, [resetNonce, editor]);

  const consulta = sugerencia?.consulta ?? null;
  useEffect(() => {
    setIndice(0);
    if (consulta === null || consulta.trim().length < MIN_CONSULTA) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const r = await cb.current.onBuscar(consulta.trim());
        if (vigente) setResultados(r.slice(0, MAX_SUGERENCIAS));
      } catch {
        if (vigente) setResultados([]);
      } finally {
        if (vigente) setBuscando(false);
      }
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [consulta]);

  const activo = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      b: !!ed?.isActive('bold'),
      i: !!ed?.isActive('italic'),
      u: !!ed?.isActive('underline'),
      ul: !!ed?.isActive('bulletList'),
      ol: !!ed?.isActive('orderedList'),
    }),
  });

  const insertarArroba = () => {
    if (!editor) return;
    const previo = editor.state.doc.textBetween(Math.max(0, editor.state.selection.from - 1), editor.state.selection.from);
    const necesitaEspacio = previo !== '' && previo !== ' ' && previo !== '\n';
    editor.chain().focus().insertContent(necesitaEspacio ? ' @' : '@').run();
  };

  const mostrarPopover = sugerencia !== null && (buscando || resultados.length > 0);

  const popover = mostrarPopover ? (
    <div className={`pop ${popoverArriba ? 'arriba' : 'abajo'}`} onMouseDown={(e) => e.preventDefault()}>
      <div className="pop-h">MENCIONAR A</div>
      {resultados.length === 0 ? (
        <div className="pop-n">Buscando…</div>
      ) : (
        resultados.map((p, i) => (
          <button key={p.id} type="button" className={`pop-row${i === indice ? ' sel' : ''}`} onClick={() => elegir(p)}>
            <span className="av">{iniciales(p.nombre)}</span>
            <span>
              <div className="pn">{p.nombre}</div>
              {!!p.rol && <div className="pr">{p.rol}</div>}
            </span>
          </button>
        ))
      )}
    </div>
  ) : null;

  const btn = (clase: boolean, titulo: string, onClick: () => void, contenido: React.ReactNode) => (
    <button
      type="button"
      className={`btn${clase ? ' on' : ''}`}
      title={titulo}
      aria-label={titulo}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {contenido}
    </button>
  );

  return (
    <div>
      <style>{ESTILOS}</style>
      {popoverArriba && popover}
      <div className={`ed${enfocado ? ' focus' : ''}${deshabilitado ? ' off' : ''}`}>
        <div className="bar">
          {btn(activo?.b ?? false, 'Negrita', () => editor?.chain().focus().toggleBold().run(), <b>B</b>)}
          {btn(activo?.i ?? false, 'Cursiva', () => editor?.chain().focus().toggleItalic().run(), <i>I</i>)}
          {btn(activo?.u ?? false, 'Subrayado', () => editor?.chain().focus().toggleUnderline().run(), <u>U</u>)}
          <span className="sep" />
          {btn(
            activo?.ul ?? false,
            'Lista con viñetas',
            () => editor?.chain().focus().toggleBulletList().run(),
            <Icono d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
          )}
          {btn(
            activo?.ol ?? false,
            'Lista numerada',
            () => editor?.chain().focus().toggleOrderedList().run(),
            <Icono d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />,
          )}
          <span className="sep" />
          {btn(false, 'Mencionar', insertarArroba, <b>@</b>)}
          {btn(
            false,
            'Adjuntar',
            () => {
              onAdjuntar();
            },
            <Icono d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
          )}
        </div>
        <div className={`area ${alto}`}>
          <EditorContent editor={editor} />
        </div>
      </div>
      {!popoverArriba && popover}
    </div>
  );
}
