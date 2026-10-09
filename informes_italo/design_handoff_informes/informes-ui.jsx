const { useState, useRef, useEffect, useMemo } = React;

const PEOPLE = [
  { id:"u1", name:"Ana Pérez", role:"Encargada · Sucursal 3" },
  { id:"u2", name:"Mateo Bernardi", role:"Supervisor de operaciones" },
  { id:"u3", name:"Luis Gómez", role:"Depósito central" },
  { id:"u4", name:"Carla Ríos", role:"Encargada · Sucursal 1" },
  { id:"u5", name:"Julián Sosa", role:"Mantenimiento" },
  { id:"u6", name:"Sofía Méndez", role:"Administración" },
];
const pById = (id) => PEOPLE.find(p => p.id === id);
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const initials = (n) => n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
const mention = (id) => `<span class="mention" contenteditable="false" data-user="${id}">${pById(id).name}</span>`;

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const NOW0 = new Date(2026, 9, 6, 11, 15).getTime();
const LOAD0 = Date.now();
const now = () => new Date(NOW0 + (Date.now() - LOAD0));
const pad = (n) => String(n).padStart(2, "0");
const fmtAt = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtRel = (d) => {
  const n = now(), mins = Math.round((n - d) / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const sameDay = n.toDateString() === d.toDateString();
  if (sameDay) return `hace ${Math.round(mins / 60)} h`;
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (y.toDateString() === d.toDateString()) return "ayer";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const typeColor = (ext) => ({ pdf:"#d64545", doc:"#2f6fd6", docx:"#2f6fd6", xls:"#1f9d57", xlsx:"#1f9d57", csv:"#1f9d57", txt:"#5b6b7a" }[ext] || "#7a8087");

/* icons */
const Ic = {
  back: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  clip: (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M21.5 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.6 1.6 0 01-2.3-2.3l7.8-7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ul: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="7" r="1.6" fill="currentColor"/><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="5" cy="17" r="1.6" fill="currentColor"/><path d="M10 7h10M10 12h10M10 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  ol: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><text x="2.5" y="9.5" fontSize="7" fontWeight="700" fill="currentColor">1</text><text x="2.5" y="19.5" fontSize="7" fontWeight="700" fill="currentColor">2</text><path d="M10 7h10M10 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-7-7 16-2.5-6.5L4 12z" fill="currentColor"/></svg>,
  pencil: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
  play: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>,
  lock: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="10" rx="2.2" stroke="currentColor" strokeWidth="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" stroke="currentColor" strokeWidth="2"/></svg>,
  x: (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  img: (s=26) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="8.5" cy="9.5" r="1.6" fill="currentColor"/><path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  doc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  dl: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v11M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 19h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
};

function Avatar({ id, sm }) {
  const p = pById(id);
  return <span className={"av" + (sm ? " sm" : "")}>{initials(p.name)}</span>;
}

function Placeholder({ hue, label, video }) {
  const bg = `repeating-linear-gradient(135deg, hsl(${hue} 40% 88%) 0 10px, hsl(${hue} 40% 83%) 10px 20px)`;
  return (
    <div className="ph" style={{ background: bg }}>
      {video ? <span className="ph-play">{Ic.play(18)}</span> : <span style={{ color: `hsl(${hue} 35% 52%)` }}>{Ic.img(24)}</span>}
      {label && <span className="ph-lbl" style={{ color: `hsl(${hue} 30% 32%)` }}>{label}</span>}
    </div>
  );
}

/* ---------- attachments under an entry ---------- */
function Attachments({ items, onOpen, onRemove }) {
  if (!items || !items.length) return null;
  const media = items.filter(a => a.kind !== "doc"), docs = items.filter(a => a.kind === "doc");
  return (
    <div className="atts">
      {media.length > 0 && <div className="att-media">
        {media.map(a => (
          <div className="att-thumb-w" key={a.id}>
            <button className="att-thumb" onClick={() => onOpen && onOpen(a)} title={a.name}>
              <Placeholder hue={a.hue} video={a.kind === "video"} label={a.kind === "video" ? a.dur : null} />
            </button>
            {onRemove && <button className="att-rm" onClick={() => onRemove(a.id)}>{Ic.x(12)}</button>}
          </div>
        ))}
      </div>}
      {docs.length > 0 && <div className="att-docs">
        {docs.map(a => (
          <div className="att-chip-w" key={a.id}>
            <button className="att-chip" onClick={() => onOpen && onOpen(a)}>
              <span className="ext" style={{ background: typeColor(a.ext) }}>{a.ext.toUpperCase()}</span>
              <span className="nm">{a.name}</span>
              <span className="sz">{a.size}</span>
            </button>
            {onRemove && <button className="att-rm chip" onClick={() => onRemove(a.id)}>{Ic.x(12)}</button>}
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ---------- mock upload pool ---------- */
let attSeq = 100;
const MOCK_MEDIA = [
  { kind:"image", ext:"jpg", hue:28 }, { kind:"image", ext:"jpg", hue:190 }, { kind:"video", ext:"mp4", hue:265, dur:"0:12" }, { kind:"image", ext:"jpg", hue:120 },
];
const MOCK_DOCS = [
  { ext:"pdf", name:"remito-0003-00045201.pdf", size:"212 KB" }, { ext:"xlsx", name:"control-temperaturas.xlsx", size:"38 KB" }, { ext:"docx", name:"acta-inspeccion.docx", size:"64 KB" },
];
const newAtt = (type) => {
  attSeq++;
  if (type === "doc") { const d = MOCK_DOCS[attSeq % MOCK_DOCS.length]; return { id:"a" + attSeq, kind:"doc", ...d }; }
  const m = MOCK_MEDIA[attSeq % MOCK_MEDIA.length];
  return { id:"a" + attSeq, ...m, name:`${m.kind === "video" ? "VID" : "IMG"}_2026100${6}_${attSeq}.${m.ext}`, size: m.kind === "video" ? "8.4 MB" : "1.2 MB" };
};

/* ---------- rich editor with @mentions ---------- */
function Editor({ initialHTML = "", initialAtts = [], placeholder = "Escribí una entrada…", submitLabel = "Enviar", onSubmit, onCancel, autoFocus, inline, tall }) {
  const ref = useRef(null), mq = useRef(null);
  const [q, setQ] = useState(null);
  const [hi, setHi] = useState(0);
  const [empty, setEmpty] = useState(true);
  const [fmt, setFmt] = useState({});
  const [atts, setAtts] = useState(initialAtts);
  const [attMenu, setAttMenu] = useState(false);

  const matches = q == null ? [] : PEOPLE.filter(p => {
    const nq = norm(q.trim()); if (!nq) return true;
    return norm(p.name).startsWith(nq) || norm(p.name).split(" ").some(w => w.startsWith(nq));
  }).slice(0, 5);
  const open = q != null && matches.length > 0;

  const update = () => {
    const el = ref.current; if (!el) return;
    setEmpty(!el.textContent.replace(/\u00a0/g, " ").trim() && !el.querySelector(".mention"));
    try {
      setFmt({ b: document.queryCommandState("bold"), i: document.queryCommandState("italic"), u: document.queryCommandState("underline"),
        ul: document.queryCommandState("insertUnorderedList"), ol: document.queryCommandState("insertOrderedList") });
    } catch (e) {}
  };
  const focusEnd = () => {
    const el = ref.current; el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  };
  useEffect(() => { ref.current.innerHTML = initialHTML; update(); if (autoFocus) focusEnd(); }, []);

  const detect = () => {
    const s = getSelection();
    if (!s.rangeCount || !s.isCollapsed) return setQ(null);
    const n = s.anchorNode;
    if (!n || n.nodeType !== 3 || !ref.current.contains(n)) return setQ(null);
    const before = n.textContent.slice(0, s.anchorOffset);
    const m = before.match(/(^|\s)@([^\s@]{0,20}(?:\s[^\s@]{0,20})?)$/);
    if (!m) return setQ(null);
    mq.current = { node: n, start: s.anchorOffset - m[2].length - 1, end: s.anchorOffset };
    if (q !== m[2]) setHi(0);
    setQ(m[2]);
  };
  const pick = (p) => {
    const { node, start, end } = mq.current;
    const r = document.createRange(); r.setStart(node, start); r.setEnd(node, end); r.deleteContents();
    const span = document.createElement("span");
    span.className = "mention"; span.contentEditable = "false"; span.dataset.user = p.id; span.textContent = p.name;
    r.insertNode(span);
    const sp = document.createTextNode("\u00a0"); span.after(sp);
    const r2 = document.createRange(); r2.setStart(sp, 1); r2.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r2);
    setQ(null); update();
  };
  const cmd = (c) => { ref.current.focus(); document.execCommand(c); update(); };
  const insertAt = () => {
    const el = ref.current;
    if (!el.contains(getSelection().anchorNode)) focusEnd(); else el.focus();
    const s = getSelection(); const n = s.anchorNode;
    const prev = n && n.nodeType === 3 ? n.textContent.slice(0, s.anchorOffset).slice(-1) : "";
    document.execCommand("insertText", false, prev && !/\s/.test(prev) ? " @" : "@");
    detect(); update();
  };
  const onKeyDown = (e) => {
    if (open) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[hi]); return; }
      if (e.key === "Escape") { e.preventDefault(); setQ(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };
  const canSend = !empty || atts.length > 0;
  const submit = () => {
    if (!canSend) return;
    const el = ref.current;
    const mentions = [...new Set([...el.querySelectorAll(".mention")].map(d => d.dataset.user))];
    onSubmit({ html: el.innerHTML, mentions, attachments: atts });
    if (!inline) { el.innerHTML = ""; setAtts([]); setQ(null); update(); }
  };
  const addAtt = (type) => { setAtts([...atts, newAtt(type)]); setAttMenu(false); };
  const keep = (e) => e.preventDefault();

  return (
    <div className={"editor" + (inline ? " inline" : "") + (tall ? " tall" : "")}>
      {open && (
        <div className={"mpick" + (inline ? " below" : "")} onMouseDown={keep}>
          <div className="mpick-h">Mencionar a</div>
          {matches.map((p, i) => (
            <button key={p.id} className={"mpick-row" + (i === hi ? " on" : "")} onMouseEnter={() => setHi(i)} onClick={() => pick(p)}>
              <Avatar id={p.id} sm />
              <span className="mp-t"><b>{p.name}</b><small>{p.role}</small></span>
            </button>
          ))}
        </div>
      )}
      <div className="tb" onMouseDown={keep}>
        <button className={"tb-b" + (fmt.b ? " on" : "")} onClick={() => cmd("bold")} title="Negrita"><b>B</b></button>
        <button className={"tb-b" + (fmt.i ? " on" : "")} onClick={() => cmd("italic")} title="Cursiva"><i style={{ fontFamily: "Georgia,serif" }}>I</i></button>
        <button className={"tb-b" + (fmt.u ? " on" : "")} onClick={() => cmd("underline")} title="Subrayado"><u>U</u></button>
        <span className="tb-sep"></span>
        <button className={"tb-b" + (fmt.ul ? " on" : "")} onClick={() => cmd("insertUnorderedList")} title="Viñetas">{Ic.ul}</button>
        <button className={"tb-b" + (fmt.ol ? " on" : "")} onClick={() => cmd("insertOrderedList")} title="Numerada">{Ic.ol}</button>
        <span className="tb-sep"></span>
        <button className={"tb-b" + (q != null ? " on" : "")} onClick={insertAt} title="Mencionar"><span style={{ fontWeight: 700, fontSize: 16 }}>@</span></button>
        <div className="tb-attw">
          <button className={"tb-b" + (attMenu ? " on" : "")} onClick={() => setAttMenu(!attMenu)} title="Adjuntar">{Ic.clip()}</button>
          {attMenu && <div className={"att-menu" + (inline ? " below" : "")}>
            <button onClick={() => addAtt("media")}>{Ic.img(18)} Foto o video</button>
            <button onClick={() => addAtt("doc")}>{Ic.doc} Documento</button>
          </div>}
        </div>
      </div>
      {atts.length > 0 && <div className="ed-atts"><Attachments items={atts} onRemove={(id) => setAtts(atts.filter(a => a.id !== id))} /></div>}
      <div className="ed-row">
        <div className="ed-wrap">
          {empty && <div className="ed-ph">{placeholder}</div>}
          <div ref={ref} className="ed rich" contentEditable onInput={() => { detect(); update(); }} onKeyUp={() => { detect(); update(); }}
            onMouseUp={() => { detect(); update(); }} onKeyDown={onKeyDown} onBlur={() => setTimeout(() => setQ(null), 120)}></div>
        </div>
        {!inline && <button className="send" disabled={!canSend} onClick={submit}>{submitLabel === "Enviar" ? Ic.send : null}{submitLabel}</button>}
      </div>
      {inline && <div className="ed-actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" disabled={!canSend} onClick={submit}>{submitLabel}</button>
      </div>}
    </div>
  );
}

/* ---------- viewer (signed URL) ---------- */
function Viewer({ v, onClose }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (v) { setLoading(true); const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); } }, [v && v.att.id]);
  if (!v) return null;
  const a = v.att;
  return (
    <div className="viewer">
      <div className="v-top">
        <button className="vx" onClick={onClose}>{Ic.x()}</button>
        <div className="vname"><div className="t">{a.name}</div><div className="s">{pById(v.author).name} · {fmtAt(v.at)}</div></div>
      </div>
      <div className="v-body">
        {loading ? <div className="v-load"><span className="spin"></span>Generando enlace seguro…</div>
          : a.kind === "doc" ? <div className="v-hero"><div className="big" style={{ background: typeColor(a.ext) }}>{a.ext.toUpperCase()}</div><div className="hn">{a.name}</div><div className="hs">{a.ext.toUpperCase()} · {a.size}</div></div>
          : <div className="v-img"><Placeholder hue={a.hue} video={a.kind === "video"} label={a.kind === "video" ? a.dur : a.ext.toUpperCase()} /></div>}
      </div>
      <div className="v-foot">
        <span className="v-sig">{Ic.lock(14)} Enlace firmado · vence en 15 min</span>
        <button className="v-dl">{Ic.dl} Descargar</button>
      </div>
    </div>
  );
}

Object.assign(window, { PEOPLE, pById, mention, now, fmtAt, fmtRel, Ic, Avatar, Placeholder, Attachments, Editor, Viewer });
