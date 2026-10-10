'use dom';

import { markInputRule, markPasteRule, mergeAttributes, Node } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Mention } from '@tiptap/extension-mention';
import { Strike } from '@tiptap/extension-strike';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { colorExtension, extensionDe, iniciales, tamanoLegible } from '../../utils/format';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export interface PersonaSugerida {
  id: number;
  nombre: string;
  rol: string;
}

export type AltoEditor = 'compacto' | 'libre' | 'alto';

/** Opciones del menú de adjuntar, las mismas que en el resto de los módulos. */
export type OrigenAdjunto = 'galeria' | 'camara' | 'documento';

/** Lo que el editor necesita para dibujar un adjunto en línea (se busca por `orden`). */
export interface AdjuntoInfoEditor {
  nombre: string;
  tipo: 'imagen' | 'video' | 'documento';
  tamano: number;
  /** Solo para previsualizar imágenes recién elegidas en web (blob/http). */
  uri?: string;
}

interface Props {
  initialHtml: string;
  placeholder: string;
  alto: AltoEditor;
  miId: number | null;
  /** Adjuntos conocidos por orden (clave en texto: el objeto viaja serializado al WebView). */
  adjuntosInfo: Record<string, AdjuntoInfoEditor>;
  /** Pedido de insertar adjuntos en el cursor; se aplica cuando cambia `nonce`. */
  insercion: { nonce: number; ordenes: number[] } | null;
  resetNonce: number;
  autoFocus?: boolean;
  deshabilitado?: boolean;
  onChange: (html: string, vacio: boolean) => Promise<void>;
  onBuscar: (consulta: string) => Promise<PersonaSugerida[]>;
  onAdjuntar: (origen: OrigenAdjunto) => Promise<void>;
  onEnviar: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

interface Anclaje {
  /** Posición del cursor relativa al contenedor del editor. */
  x: number;
  arriba: boolean;
  top: number;
  bottom: number;
  ancho: number;
}

interface SuggestionState {
  consulta: string;
  command: (attrs: { id: string; label: string }) => void;
  anclaje: Anclaje | null;
}

const ALTO_POPOVER = 300;
const ANCHO_POPOVER = 280;

const EditorCtx = createContext<{ info: Record<string, AdjuntoInfoEditor>; miId: number | null }>({ info: {}, miId: null });

// Atajos estilo WhatsApp: *negrita*, _cursiva_, ~tachado~ (en vez de **x**, *x* y ~~x~~).
const negritaInput = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;
const negritaPaste = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))/g;
const cursivaInput = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;
const cursivaPaste = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))/g;
const tachadoInput = /(?:^|\s)(~(?!\s+~)((?:[^~]+))~(?!\s+~))$/;
const tachadoPaste = /(?:^|\s)(~(?!\s+~)((?:[^~]+))~(?!\s+~))/g;

const NegritaWa = Bold.extend({
  addInputRules() {
    return [markInputRule({ find: negritaInput, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: negritaPaste, type: this.type })];
  },
});
const CursivaWa = Italic.extend({
  addInputRules() {
    return [markInputRule({ find: cursivaInput, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: cursivaPaste, type: this.type })];
  },
});
const TachadoWa = Strike.extend({
  addInputRules() {
    return [markInputRule({ find: tachadoInput, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: tachadoPaste, type: this.type })];
  },
});

const hrefSeguro = (valor: string): string | null => {
  const v = valor.trim();
  if (!v) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(conEsquema) ? conEsquema : null;
};

function MentionView({ node, deleteNode }: NodeViewProps) {
  const { miId } = useContext(EditorCtx);
  const mine = String(node.attrs.id) === String(miId);
  return (
    <NodeViewWrapper as="span" className={mine ? 'mention mine' : 'mention'} data-mention={node.attrs.id}>
      {node.attrs.label}
      <button
        type="button"
        className="mx"
        contentEditable={false}
        title="Quitar mención"
        aria-label={`Quitar mención a ${node.attrs.label}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => deleteNode()}
      >
        ×
      </button>
    </NodeViewWrapper>
  );
}

function AdjuntoView({ node, deleteNode, selected }: NodeViewProps) {
  const { info } = useContext(EditorCtx);
  const a = info[String(node.attrs.orden)];
  const ext = a ? extensionDe(a.nombre) : '';
  return (
    <NodeViewWrapper className={`adj${selected ? ' sel' : ''}`} data-adjunto={node.attrs.orden}>
      <div className="adj-card" contentEditable={false}>
        {a?.tipo === 'imagen' && a.uri ? (
          <img className="adj-img" src={a.uri} alt={a.nombre} />
        ) : (
          <>
            <span className="adj-badge" style={{ background: colorExtension(ext) }}>
              {a?.tipo === 'imagen' ? 'IMG' : a?.tipo === 'video' ? 'VID' : (ext || 'doc').toUpperCase().slice(0, 4)}
            </span>
            <span className="adj-name">{a?.nombre ?? 'Adjunto'}</span>
            {!!a && <span className="adj-size">{tamanoLegible(a.tamano)}</span>}
          </>
        )}
        <button
          type="button"
          className="adj-x"
          title="Quitar adjunto"
          aria-label="Quitar adjunto"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => deleteNode()}
        >
          ×
        </button>
      </div>
    </NodeViewWrapper>
  );
}

/** Adjunto dentro del texto: `<div data-adjunto="N">`, donde N es el `orden` del adjunto en la entrada. */
const AdjuntoEnLinea = Node.create({
  name: 'adjuntoEnLinea',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      orden: {
        default: 0,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-adjunto')),
        renderHTML: (attrs: Record<string, any>) => ({ 'data-adjunto': String(attrs.orden) }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-adjunto]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AdjuntoView);
  },
});

const MIN_CONSULTA = 2;
const MAX_SUGERENCIAS = 5;

const MentionPill = Mention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MentionView);
  },
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
.mention { display: inline-block; background: rgba(26,115,232,0.14); color: #1558b0; font-weight: 600; font-size: .94em; border-radius: 999px; padding: 1px 4px 1px 8px; white-space: nowrap; }
.mention.mine { background: #1a73e8; color: #fff; }
.mx { border: 0; background: transparent; color: inherit; opacity: .6; cursor: pointer; font: inherit; font-size: 1.05em; line-height: 1; padding: 0 4px; margin-left: 2px; }
.mx:hover { opacity: 1; }
.ProseMirror s { text-decoration: line-through; }
.adj { margin: 6px 0; }
.adj-card { position: relative; display: inline-flex; align-items: center; gap: 8px; max-width: 100%; border: 1px solid rgba(17,24,28,0.1); border-radius: 12px; background: #fff; padding: 6px 30px 6px 6px; }
.adj.sel .adj-card { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.12); }
.adj-img { display: block; max-width: 100%; max-height: 180px; border-radius: 8px; }
.adj-badge { min-width: 34px; padding: 4px; border-radius: 6px; color: #fff; font-size: 9.5px; font-weight: 800; text-align: center; }
.adj-name { font-size: 13px; font-weight: 600; color: #11181c; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.adj-size { font-size: 11.5px; color: #687076; }
.adj-x { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: 0; border-radius: 10px; background: rgba(17,24,28,0.6); color: #fff; font-size: 14px; line-height: 1; cursor: pointer; padding: 0; }
.linkbar { display: flex; gap: 6px; padding: 6px; border-bottom: 1px solid rgba(17,24,28,0.08); background: rgba(26,115,232,0.04); }
.linkbar input { flex: 1; min-width: 0; border: 1px solid rgba(17,24,28,0.15); border-radius: 8px; padding: 6px 10px; font-size: 14px; font-family: inherit; outline: none; }
.linkbar input:focus { border-color: #1a73e8; }
.linkbar button { border: 0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; background: #1a73e8; color: #fff; }
.linkbar button.sec { background: transparent; color: #4a5058; }
.wrap { position: relative; }
.pop { position: absolute; z-index: 50; background: #fff; border: 1px solid rgba(17,24,28,0.08); border-radius: 14px; box-shadow: 0 12px 32px rgba(20,24,30,.18); overflow: hidden; }
.pop-h { padding: 8px 14px 4px; font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #687076; }
.pop-row { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; padding: 8px 14px; text-align: left; cursor: pointer; font-family: inherit; }
.pop-row.sel, .pop-row:hover { background: rgba(26,115,232,0.08); }
.pop-ic { width: 20px; height: 20px; color: #1a73e8; flex-shrink: 0; }
.pop-fondo { position: fixed; inset: 0; z-index: 40; }
.av { width: 32px; height: 32px; border-radius: 16px; background: rgba(26,115,232,0.16); color: #1558b0; font-size: 12.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pn { font-size: 14px; font-weight: 700; color: #11181c; }
.pr { font-size: 12px; color: #687076; }
.pop-n { padding: 10px 14px; font-size: 13px; color: #687076; }
`;

const MENU_ADJUNTAR: { clave: OrigenAdjunto; titulo: string; detalle: string; icono: React.ReactNode }[] = [
  {
    clave: 'galeria',
    titulo: 'Galería',
    detalle: 'Fotos y videos',
    icono: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </>
    ),
  },
  {
    clave: 'camara',
    titulo: 'Cámara',
    detalle: 'Tomar foto o video',
    icono: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
  },
  {
    clave: 'documento',
    titulo: 'Documento',
    detalle: 'PDF, Word, Excel…',
    icono: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
  },
];
const ANCHO_MENU_ADJUNTAR = 224;
const ALTO_MENU_ADJUNTAR = 3 * 52 + 12;

interface AnclajeMenu {
  x: number;
  arriba: boolean;
  top: number;
  bottom: number;
}

const Icono = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function EditorDom({
  initialHtml,
  placeholder,
  alto,
  miId,
  adjuntosInfo,
  insercion,
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
  const [linkAbierto, setLinkAbierto] = useState(false);
  const [linkValor, setLinkValor] = useState('');
  const [menuAdjuntar, setMenuAdjuntar] = useState<AnclajeMenu | null>(null);
  const botonAdjuntar = useRef<HTMLButtonElement>(null);

  const contenedor = useRef<HTMLDivElement>(null);
  const sugerenciaRef = useRef<SuggestionState | null>(null);
  const resultadosRef = useRef<PersonaSugerida[]>([]);
  const indiceRef = useRef(0);
  const cb = useRef({ onChange, onBuscar, onEnviar });
  cb.current = { onChange, onBuscar, onEnviar };
  const abrirLinkRef = useRef<() => void>(() => {});

  sugerenciaRef.current = sugerencia;
  resultadosRef.current = resultados;
  indiceRef.current = indice;

  const elegir = (p: PersonaSugerida) => sugerenciaRef.current?.command({ id: String(p.id), label: p.nombre });

  // Posición del cursor respecto del contenedor, para abrir el popover justo ahí (arriba si abajo no entra).
  const anclar = (rect: (() => DOMRect | null) | null | undefined): Anclaje | null => {
    const caret = rect?.();
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caret || !caja) return null;
    const espacioAbajo = window.innerHeight - caret.bottom;
    const espacioArriba = caret.top;
    return {
      x: Math.max(0, Math.min(caret.left - caja.left, caja.width - ANCHO_POPOVER)),
      arriba: espacioAbajo < ALTO_POPOVER && espacioArriba > espacioAbajo,
      top: caret.top - caja.top,
      bottom: caret.bottom - caja.top,
      ancho: caja.width,
    };
  };

  const editor = useEditor({
    immediatelyRender: true,
    autofocus: autoFocus ? 'end' : false,
    content: initialHtml,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https'] },
      }),
      NegritaWa,
      CursivaWa,
      TachadoWa,
      AdjuntoEnLinea,
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
            onStart: (props) =>
              setSugerencia({ consulta: props.query, command: props.command, anclaje: anclar(props.clientRect) }),
            onUpdate: (props) =>
              setSugerencia({ consulta: props.query, command: props.command, anclaje: anclar(props.clientRect) }),
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
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          abrirLinkRef.current();
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

  // Inserta los adjuntos elegidos en el cursor, como bloques dentro del texto.
  const ultimaInsercion = useRef(insercion?.nonce ?? 0);
  useEffect(() => {
    if (!editor || !insercion || insercion.nonce === ultimaInsercion.current) return;
    ultimaInsercion.current = insercion.nonce;
    editor
      .chain()
      .focus()
      .insertContent(insercion.ordenes.map((orden) => ({ type: 'adjuntoEnLinea', attrs: { orden } })))
      .run();
  }, [insercion, editor]);

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
      s: !!ed?.isActive('strike'),
      u: !!ed?.isActive('underline'),
      link: !!ed?.isActive('link'),
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

  // El menú de adjuntar sale del propio botón: debajo si entra, arriba si no (compositor al pie).
  const alternarMenuAdjuntar = () => {
    if (menuAdjuntar) {
      setMenuAdjuntar(null);
      return;
    }
    const boton = botonAdjuntar.current?.getBoundingClientRect();
    const caja = contenedor.current?.getBoundingClientRect();
    if (!boton || !caja) return;
    const espacioAbajo = window.innerHeight - boton.bottom;
    setMenuAdjuntar({
      x: Math.max(0, Math.min(boton.left - caja.left, caja.width - ANCHO_MENU_ADJUNTAR)),
      arriba: espacioAbajo < ALTO_MENU_ADJUNTAR && boton.top > espacioAbajo,
      top: boton.top - caja.top,
      bottom: boton.bottom - caja.top,
    });
  };

  useEffect(() => {
    if (!menuAdjuntar) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAdjuntar(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAdjuntar]);

  const abrirLink = () => {
    if (!editor) return;
    setLinkValor((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkAbierto(true);
  };
  abrirLinkRef.current = abrirLink;

  const cerrarLink = () => {
    setLinkAbierto(false);
    editor?.commands.focus();
  };

  const aplicarLink = () => {
    if (!editor) return;
    if (!linkValor.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkAbierto(false);
      return;
    }
    const href = hrefSeguro(linkValor);
    if (!href) return;
    if (editor.state.selection.empty && !editor.isActive('link')) {
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkAbierto(false);
  };

  // En el WebView nativo lo que sobresale del contenido se recorta: se reserva alto mientras el popover está abierto.
  const esNativo = typeof window !== 'undefined' && 'ReactNativeWebView' in window;
  const mostrarPopover = sugerencia !== null && (buscando || resultados.length > 0);
  const ancla = sugerencia?.anclaje ?? null;

  const popover = mostrarPopover ? (
    <div
      className="pop"
      style={{
        width: ANCHO_POPOVER,
        left: ancla?.x ?? 0,
        ...(ancla?.arriba
          ? { bottom: (contenedor.current?.getBoundingClientRect().height ?? 0) - ancla.top + 6 }
          : { top: (ancla?.bottom ?? 0) + 6 }),
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
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
    <EditorCtx.Provider value={{ info: adjuntosInfo, miId }}>
      <div className="wrap" ref={contenedor} style={esNativo && (mostrarPopover || menuAdjuntar) ? { paddingBottom: Math.max(ALTO_POPOVER, ALTO_MENU_ADJUNTAR) } : undefined}>
        <style>{ESTILOS}</style>
        <div className={`ed${enfocado ? ' focus' : ''}${deshabilitado ? ' off' : ''}`}>
          <div className="bar">
            {btn(activo?.b ?? false, 'Negrita (*texto*)', () => editor?.chain().focus().toggleBold().run(), <b>B</b>)}
            {btn(activo?.i ?? false, 'Cursiva (_texto_)', () => editor?.chain().focus().toggleItalic().run(), <i>I</i>)}
            {btn(activo?.s ?? false, 'Tachado (~texto~)', () => editor?.chain().focus().toggleStrike().run(), <s>S</s>)}
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
            {btn(
              activo?.link ?? false,
              'Enlace (Ctrl+K)',
              abrirLink,
              <Icono d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
            )}
            {btn(false, 'Mencionar', insertarArroba, <b>@</b>)}
            <button
              ref={botonAdjuntar}
              type="button"
              className={`btn${menuAdjuntar ? ' on' : ''}`}
              title="Adjuntar"
              aria-label="Adjuntar"
              aria-haspopup="menu"
              aria-expanded={!!menuAdjuntar}
              onMouseDown={(e) => e.preventDefault()}
              onClick={alternarMenuAdjuntar}
            >
              <Icono d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </button>
          </div>
          {linkAbierto && (
            <div className="linkbar">
              <input
                autoFocus
                type="url"
                value={linkValor}
                placeholder="https://… (vacío quita el enlace)"
                onChange={(e) => setLinkValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    aplicarLink();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cerrarLink();
                  }
                }}
              />
              <button type="button" onClick={aplicarLink}>
                Aplicar
              </button>
              <button type="button" className="sec" onClick={cerrarLink}>
                Cancelar
              </button>
            </div>
          )}
          <div className={`area ${alto}`}>
            <EditorContent editor={editor} />
          </div>
        </div>
        {popover}
        {menuAdjuntar && (
          <>
            <div className="pop-fondo" onClick={() => setMenuAdjuntar(null)} />
            <div
              className="pop"
              role="menu"
              style={{
                width: ANCHO_MENU_ADJUNTAR,
                left: menuAdjuntar.x,
                ...(menuAdjuntar.arriba
                  ? { bottom: (contenedor.current?.getBoundingClientRect().height ?? 0) - menuAdjuntar.top + 6 }
                  : { top: menuAdjuntar.bottom + 6 }),
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {MENU_ADJUNTAR.map((o) => (
                <button
                  key={o.clave}
                  type="button"
                  role="menuitem"
                  className="pop-row"
                  onClick={() => {
                    setMenuAdjuntar(null);
                    onAdjuntar(o.clave);
                  }}
                >
                  <svg className="pop-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {o.icono}
                  </svg>
                  <span>
                    <div className="pn">{o.titulo}</div>
                    <div className="pr">{o.detalle}</div>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </EditorCtx.Provider>
  );
}
