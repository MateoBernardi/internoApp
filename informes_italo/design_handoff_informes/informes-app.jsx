const { useState: uS, useRef: uR, useEffect: uE } = React;

const D = (d, h, m) => new Date(2026, 9, d, h, m);
const A = (id, kind, name, extra) => ({ id, kind, name, ext: name.split(".").pop(), ...extra });

const SEED = [
  { id:"r1", creator:"u1", status:"open", entries:[
    { id:"e1", author:"u1", at:D(6,9,14), mentions:["u2","u3"], html:`<div><b>Falla en cámara de frío – sucursal 3</b></div><div>Esta mañana la cámara 2 marcó temperatura fuera de rango (9 °C). Avisé a ${mention("u2")} y a ${mention("u3")}. Adjunto fotos y el parte técnico.</div>`,
      attachments:[A("a1","image","foto1.jpg",{hue:205,size:"1.8 MB"}),A("a2","image","foto2.jpg",{hue:180,size:"2.1 MB"}),A("a3","video","video.mp4",{hue:250,dur:"0:24",size:"12 MB"}),A("a4","doc","parte-tecnico.pdf",{size:"340 KB"})] },
    { id:"e2", author:"u2", at:D(6,9,40), mentions:["u1"], html:`<div>Llamé al técnico, viene a las 14. ${mention("u1")} confirmá que nadie abra la cámara.</div>` },
    { id:"e3", author:"u1", at:D(6,9,52), edited:true, html:`<div>Confirmado.</div>` },
    { id:"e4", author:"u3", at:D(6,10,20), html:`<div>Pasé la mercadería sensible a la cámara 1. Queda todo registrado en la planilla:</div><ul><li>Lácteos: 14 cajas</li><li>Fiambres: 6 cajas</li></ul>`,
      attachments:[A("a5","doc","planilla-temperaturas.xlsx",{size:"42 KB"})] },
    { id:"e5", author:"u2", at:D(6,10,58), html:`<div>El técnico adelanta la visita: llega <b>12:30</b>.</div>` },
  ]},
  { id:"r5", creator:"u4", status:"open", entries:[
    { id:"e1", author:"u4", at:D(6,8,10), html:`<div><b>Rotura de vidriera – sucursal 1</b></div><div>Al abrir encontramos la vidriera lateral rajada de punta a punta. Cerramos el sector con cinta.</div>`,
      attachments:[A("b1","image","vidriera.jpg",{hue:30,size:"2.4 MB"})] },
    { id:"e2", author:"u5", at:D(6,8,34), html:`<div>Paso a medir a media mañana y pido presupuesto al vidriero.</div>` },
    { id:"e3", author:"u4", at:D(6,10,5), mentions:["u1"], html:`<div>${mention("u1")} necesitamos tu OK para el presupuesto. Es la única cotización que entra esta semana.</div>`,
      attachments:[A("b2","doc","presupuesto-vidrieria.pdf",{size:"128 KB"})] },
  ]},
  { id:"r2", creator:"u2", status:"closed", entries:[
    { id:"e1", author:"u2", at:D(5,10,5), html:`<div><b>Reclamo cliente Almacén López</b></div><div>El cliente informó que el pedido llegó incompleto: faltan 4 cajas de aceite y 2 de harina. Remito 0003-00045123.</div>`,
      attachments:[A("c1","doc","remito-0003-00045123.pdf",{size:"96 KB"})] },
    { id:"e2", author:"u4", at:D(5,10,30), html:`<div>Revisé el armado: las cajas quedaron en el muelle 2.</div>` },
    { id:"e3", author:"u2", at:D(5,10,41), mentions:["u1"], html:`<div>${mention("u1")} ¿podés coordinar la reposición desde sucursal 3?</div>` },
    { id:"e4", author:"u1", at:D(5,11,15), html:`<div>Sale hoy en el reparto de las 16.</div>` },
    { id:"e5", author:"u2", at:D(5,17,48), html:`<div>Entregado y firmado.</div>`, attachments:[A("c2","image","remito-firmado.jpg",{hue:95,size:"1.1 MB"})] },
    { id:"e6", kind:"close", author:"u2", at:D(5,17,50), text:"Cliente conforme. Cierro." },
  ]},
  { id:"r3", creator:"u3", status:"open", entries:[
    { id:"e1", author:"u3", at:D(4,16,0), mentions:["u2"], html:`<div><b>Inventario mensual depósito central</b></div><div>Arrancamos el conteo el lunes a las 7. ${mention("u2")} necesito dos personas del turno tarde.</div>` },
    { id:"e2", author:"u2", at:D(4,17,12), mentions:["u5","u6"], html:`<div>Te asigno a ${mention("u5")} y ${mention("u6")}.</div>` },
  ]},
  { id:"r4", creator:"u1", status:"open", entries:[
    { id:"e1", author:"u1", at:D(3,12,30), html:`<div><b>Cambio de proveedor de embalaje</b></div><div>Pedí cotización a dos proveedores nuevos. Dejo la comparación para revisar antes del viernes.</div>`,
      attachments:[A("d1","doc","comparativa-embalaje.xlsx",{size:"28 KB"})] },
  ]},
];

const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d; };
const summary = (r) => {
  const d = plain(r.entries[0].html);
  const blocks = [...d.children].map(c => c.textContent.replace(/\u00a0/g, " ").trim()).filter(Boolean);
  const all = blocks.length ? blocks : [d.textContent.trim()];
  return { title: all[0] || "Sin texto", preview: all.slice(1).join(" ") };
};
const lastAt = (r) => r.entries[r.entries.length - 1].at;
const visibleTo = (r, me) => r.creator === me || r.entries.some(e => (e.mentions || []).includes(me));

/* ---------- list ---------- */
function ListScreen({ reports, me, onOpen, onNew }) {
  const mine = reports.filter(r => visibleTo(r, me)).sort((a, b) => lastAt(b) - lastAt(a));
  return (
    <div className="scr">
      <div className="lh">
        <h1>Informes</h1>
        <button className="btn primary sm" onClick={onNew}>{Ic.plus} Nuevo</button>
      </div>
      <div className="lsub">Los que creaste o donde te mencionaron</div>
      <div className="list">
        {mine.map(r => {
          const s = summary(r), n = r.entries.filter(e => e.kind !== "close").length;
          const files = r.entries.reduce((t, e) => t + (e.attachments || []).length, 0);
          const closed = r.status === "closed";
          return (
            <button key={r.id} className={"li" + (closed ? " closed" : "")} onClick={() => onOpen(r.id)}>
              <span className="li-st">{closed ? <span className="st-ck">{Ic.check(11)}</span> : <span className="st-dot"></span>}</span>
              <span className="li-b">
                <span className="li-t"><span className="tt">{s.title}</span>{closed && <span className="tag">cerrado</span>}</span>
                <span className="li-m">
                  <span>{pById(r.creator).name}</span><i>·</i><span>{fmtRel(lastAt(r))}</span><i>·</i><span>{n} {n === 1 ? "entrada" : "entradas"}</span>
                  {files > 0 && <span className="li-f">{Ic.clip(13)}{files}</span>}
                </span>
                {s.preview && <span className="li-p">{s.preview}</span>}
                {r.creator !== me && <span className="li-men">Te mencionaron</span>}
              </span>
            </button>
          );
        })}
        {mine.length === 0 && <div className="empty">No tenés informes todavía.</div>}
      </div>
    </div>
  );
}

/* ---------- entry ---------- */
function Entry({ e, me, initial, canEdit, editing, onEdit, onSave, onCancel, onOpenAtt }) {
  if (e.kind === "close") return (
    <div className="ent-close">
      <span className="ec-ic">{Ic.lock(15)}</span>
      <div className="ec-b">
        <div><b>{pById(e.author).name}</b> cerró el informe <span className="when">· {fmtAt(e.at)}</span></div>
        {e.text && <div className="ec-t">{e.text}</div>}
      </div>
    </div>
  );
  const mentionedMe = (e.mentions || []).includes(me) && e.author !== me;
  return (
    <div className={"ent" + (initial ? " initial" : "") + (editing ? " editing" : "")}>
      {initial && <div className="ent-lbl">Informe inicial</div>}
      <div className="ent-h">
        <Avatar id={e.author} sm />
        <div className="ent-who">
          <b>{e.author === me ? `${pById(e.author).name}` : pById(e.author).name}</b>
          <span className="when">{fmtAt(e.at)}{e.edited && " (editado)"}</span>
        </div>
        {mentionedMe && !editing && <span className="men-tag">Te mencionó</span>}
        {canEdit && !editing && <button className="edit-b" onClick={onEdit}>{Ic.pencil} Editar</button>}
      </div>
      {editing
        ? <Editor inline autoFocus initialHTML={e.html} submitLabel="Guardar" onCancel={onCancel}
            onSubmit={({ html, mentions, attachments }) => onSave({ html, mentions, attachments })} initialAtts={e.attachments || []} />
        : <>
            <div className="rich ent-body" dangerouslySetInnerHTML={{ __html: e.html }}></div>
            <Attachments items={e.attachments} onOpen={(a) => onOpenAtt(a, e)} />
          </>}
    </div>
  );
}

/* ---------- thread ---------- */
function ThreadScreen({ r, me, onBack, onAdd, onEditEntry, onClose, onOpenAtt }) {
  const [editing, setEditing] = uS(null);
  const [closing, setClosing] = uS(false);
  const [closeText, setCloseText] = uS("");
  const body = uR(null);
  const open = r.status === "open", isCreator = r.creator === me;
  const prevLen = uR(r.entries.length);
  uE(() => { if (r.entries.length > prevLen.current && body.current) body.current.scrollTo({ top: body.current.scrollHeight, behavior: "smooth" }); prevLen.current = r.entries.length; }, [r.entries.length]);

  return (
    <div className="scr">
      <div className="th">
        <button className="th-back" onClick={onBack}>{Ic.back}Informes</button>
        <div className="th-r">
          <span className={"pill " + (open ? "open" : "closed")}>{open ? <span className="st-dot"></span> : Ic.lock(12)}{open ? "Abierto" : "Cerrado"}</span>
          {open && isCreator && <button className="btn outline sm" onClick={() => setClosing(true)}>Cerrar</button>}
        </div>
      </div>
      <div className="tbody" ref={body}>
        <style>{`.mention[data-user="${me}"]{background:var(--blue);color:#fff}`}</style>
        {r.entries.map((e, i) => (
          <Entry key={e.id} e={e} me={me} initial={i === 0} canEdit={open && e.author === me && e.kind !== "close"}
            editing={editing === e.id} onEdit={() => setEditing(e.id)} onCancel={() => setEditing(null)}
            onSave={(p) => { onEditEntry(r.id, e.id, p); setEditing(null); }} onOpenAtt={onOpenAtt} />
        ))}
        {!open && <div className="ro-end">Informe cerrado · solo lectura</div>}
      </div>
      {open && <div className="tfoot"><Editor onSubmit={(p) => onAdd(r.id, p)} /></div>}

      {closing && <div className="sheet-ov">
        <div className="sheet-bd" onClick={() => setClosing(false)}></div>
        <div className="sheet">
          <div className="grab"></div>
          <h3>Cerrar informe</h3>
          <p>Se agrega una entrada de cierre. Después nadie podrá escribir ni editar.</p>
          <textarea value={closeText} onChange={(ev) => setCloseText(ev.target.value)} placeholder="Motivo o resolución (opcional)" rows="3"></textarea>
          <div className="sheet-a">
            <button className="btn ghost" onClick={() => setClosing(false)}>Cancelar</button>
            <button className="btn dark" onClick={() => { onClose(r.id, closeText.trim()); setClosing(false); setCloseText(""); setEditing(null); }}>{Ic.lock(15)} Cerrar informe</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ---------- new ---------- */
function NewScreen({ onCancel, onCreate }) {
  return (
    <div className="scr">
      <div className="th">
        <button className="th-back" onClick={onCancel}>{Ic.back}Cancelar</button>
        <div className="th-title">Nuevo informe</div>
        <span style={{ width: 70 }}></span>
      </div>
      <div className="new-b">
        <div className="new-hint">La primera línea se usa como título en la bandeja. Mencioná con <b>@</b> a quienes tienen que verlo.</div>
        <Editor tall autoFocus submitLabel="Publicar" placeholder="¿Qué pasó? Empezá con un título corto…" onSubmit={onCreate} />
      </div>
    </div>
  );
}

/* ---------- app ---------- */
function App() {
  const [me, setMe] = uS(() => localStorage.getItem("inf_me") || "u1");
  const [reports, setReports] = uS(SEED);
  const [view, setView] = uS({ s: "list" });
  const [viewer, setViewer] = uS(null);
  uE(() => { localStorage.setItem("inf_me", me); setView({ s: "list" }); }, [me]);

  const upd = (rid, fn) => setReports(rs => rs.map(r => r.id === rid ? fn(r) : r));
  const nid = () => "e" + Math.random().toString(36).slice(2, 8);
  const add = (rid, p) => upd(rid, r => ({ ...r, entries: [...r.entries, { id: nid(), author: me, at: now(), ...p }] }));
  const edit = (rid, eid, p) => upd(rid, r => ({ ...r, entries: r.entries.map(e => e.id === eid ? { ...e, ...p, edited: true } : e) }));
  const close = (rid, text) => upd(rid, r => ({ ...r, status: "closed", entries: [...r.entries, { id: nid(), kind: "close", author: me, at: now(), text }] }));
  const create = (p) => { const id = "r" + Date.now(); setReports(rs => [{ id, creator: me, status: "open", entries: [{ id: "e1", author: me, at: now(), ...p }] }, ...rs]); setView({ s: "thread", id }); };

  const r = view.s === "thread" && reports.find(x => x.id === view.id);

  return (
    <>
      <div className="demo-toggle">
        <span className="dt-l">Ver como</span>
        <button className={me === "u1" ? "on" : ""} onClick={() => setMe("u1")}>Ana Pérez</button>
        <button className={me === "u2" ? "on" : ""} onClick={() => setMe("u2")}>Mateo Bernardi</button>
      </div>
      <div className="phone" data-screen-label={view.s === "list" ? "Listado de informes" : view.s === "new" ? "Nuevo informe" : "Informe abierto"}>
        <div className="statusbar"><span>11:15</span><span className="sb-right"><span className="bar" style={{ height: 7 }}></span><span className="bar" style={{ height: 10 }}></span><span className="bar" style={{ height: 13 }}></span><span className="sb-batt">67</span></span></div>
        <div className="screen">
          {view.s === "list" && <ListScreen reports={reports} me={me} onOpen={(id) => setView({ s: "thread", id })} onNew={() => setView({ s: "new" })} />}
          {view.s === "new" && <NewScreen onCancel={() => setView({ s: "list" })} onCreate={create} />}
          {r && <ThreadScreen key={r.id + me} r={r} me={me} onBack={() => setView({ s: "list" })} onAdd={add} onEditEntry={edit} onClose={close}
            onOpenAtt={(att, e) => setViewer({ att, author: e.author, at: e.at })} />}
          <Viewer v={viewer} onClose={() => setViewer(null)} />
        </div>
        <div className="navbar"><span>▮▮▮</span><span>◯</span><span>‹</span></div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
