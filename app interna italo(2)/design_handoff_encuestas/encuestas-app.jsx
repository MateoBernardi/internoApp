const { useState, useMemo, useRef, useEffect } = React;

/* ===================== data ===================== */
const SEDES = {
  "Sede Centro": ["Victor Bernardi", "Lucía Gómez", "Ana Torres", "Juan Pérez"],
  "Sede Norte":  ["Mateo Bernardi", "Pedro Sosa", "Sofía Díaz"],
  "Sede Sur":    ["Diego Ramírez", "Martín Pérez", "Carla Núñez", "Roberto Vega", "Elena Cruz"],
};
const ALL_PEOPLE = Object.values(SEDES).flat();
const sedeOf = (name) => Object.keys(SEDES).find(s => SEDES[s].includes(name));

const HORARIOS = ["9:00", "11:00", "15:00", "17:00"];
// who voted + the horario each one chose
const VOTES = [
  { name: "Victor Bernardi", slot: "9:00" },
  { name: "Lucía Gómez",     slot: "9:00" },
  { name: "Martín Pérez",    slot: "9:00" },
  { name: "Mateo Bernardi",  slot: "11:00" },
  { name: "Pedro Sosa",      slot: "11:00" },
  { name: "Sofía Díaz",      slot: "11:00" },
  { name: "Diego Ramírez",   slot: "15:00" },
  { name: "Carla Núñez",     slot: "15:00" },
  { name: "Ana Torres",      slot: "17:00" },
];

const SURVEYS = [
  { id: "s1", title: "Disponibilidad reunión de equipo", desc: "Elegí el horario que mejor te queda para la reunión mensual del equipo.", status: "active", responses: 9, total: 12, date: "Cierra 28/06" },
  { id: "s2", title: "Satisfacción con el espacio de trabajo", desc: "", status: "active", responses: 7, total: 12, date: "Cierra 30/06" },
  { id: "s3", title: "Probando", desc: "Esta encuesta es para probar", status: "closed", responses: 0, total: 12, date: "Cerrada" },
];

const initials = (n) => n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

/* ===================== icons ===================== */
const Ic = {
  back:  (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  mag:   (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chev:  (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  cal:   (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  clock: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x:     (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  trash: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  users: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 6.2a3 3 0 010 5.6M21 19c0-2.4-1.4-4.2-3.5-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  calplus:(p)=> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M8 3v4M16 3v4M12 13v4M10 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  info:  (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  star:  (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 3l2.6 5.6 6 .7-4.4 4 1.2 5.9L12 16.9 6.6 19.2l1.2-5.9L3.4 9.3l6-.7L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
};

function Avatar({ name, cls = "" }) {
  return <div className={"avatar " + cls}>{initials(name)}</div>;
}

/* ===================== status bar ===================== */
function StatusBar() {
  return (
    <div className="statusbar">
      <span>8:41</span>
      <span className="sb-right">
        <span className="bar" style={{ height: 7 }}></span>
        <span className="bar" style={{ height: 10 }}></span>
        <span className="bar" style={{ height: 13 }}></span>
        <span className="sb-batt">40</span>
      </span>
    </div>
  );
}

/* ===================== audience picker sheet ===================== */
function AudienceSheet({ show, selected, onClose, onConfirm }) {
  const [q, setQ] = useState("");
  const [local, setLocal] = useState(selected);
  useEffect(() => { if (show) { setLocal(selected); setQ(""); } }, [show]);

  const toggle = (name) =>
    setLocal(l => l.includes(name) ? l.filter(n => n !== name) : [...l, name]);

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = {};
    for (const [sede, people] of Object.entries(SEDES)) {
      const f = people.filter(p => p.toLowerCase().includes(t));
      if (f.length) out[sede] = f;
    }
    return out;
  }, [q]);

  const allShown = Object.values(groups).flat();
  const allOn = allShown.length > 0 && allShown.every(p => local.includes(p));
  const toggleAll = () =>
    setLocal(l => allOn ? l.filter(n => !allShown.includes(n)) : [...new Set([...l, ...allShown])]);
  const toggleGroup = (people) => {
    const on = people.every(p => local.includes(p));
    setLocal(l => on ? l.filter(n => !people.includes(n)) : [...new Set([...l, ...people])]);
  };

  return (
    <div className={"ov" + (show ? " show" : "")}>
      <div className="ov-back" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <div className="sheet-head">
          <div className="t">Seleccionar usuarios</div>
          <div className="s">Elegí quién va a ver y responder esta encuesta.</div>
        </div>
        <div className="sheet-search">
          <Ic.mag />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre" />
        </div>
        <div className="sheet-scroll">
          {allShown.length === 0 && <div className="sheet-empty">Sin resultados para “{q}”.</div>}
          {!q && (
            <div className="grouphead">
              <span className="gt">Todos</span>
              <button className="gsel" onClick={toggleAll}>{allOn ? "Quitar todos" : "Seleccionar todos"}</button>
            </div>
          )}
          {Object.entries(groups).map(([sede, people]) => {
            const gOn = people.every(p => local.includes(p));
            return (
              <div key={sede}>
                <div className="grouphead">
                  <span className="gt">{sede}</span>
                  <button className="gsel" onClick={() => toggleGroup(people)}>{gOn ? "Quitar sede" : "Toda la sede"}</button>
                </div>
                {people.map(p => {
                  const on = local.includes(p);
                  return (
                    <div key={p} className={"arow" + (on ? " sel" : "")} onClick={() => toggle(p)}>
                      <div className={"check" + (on ? " on" : "")} style={on ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}>
                        {on && <Ic.check />}
                      </div>
                      <Avatar name={p} cls="sm" />
                      <span className="nm">{p}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="sheet-foot">
          <span className="meta"><b>{local.length}</b> seleccionados</span>
          <button className="confirm" onClick={() => onConfirm(local)}>Listo</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== create survey screen ===================== */
function CrearScreen({ onBack, flash }) {
  const [titulo, setTitulo] = useState("");
  const [anon, setAnon] = useState(false);
  const [allEmployees, setAllEmployees] = useState(true);
  const [recipients, setRecipients] = useState([]);
  const [sheet, setSheet] = useState(false);

  const chips = recipients.slice(0, 4);
  const extra = recipients.length - chips.length;
  const canCreate = titulo.trim() && (allEmployees || recipients.length > 0);

  return (
    <>
      <div className="apphead">
        <button className="back" onClick={onBack}><Ic.back /></button>
        <span className="ttl">Gestión de Encuestas</span>
      </div>

      <div className="body">
        <div className="scr-title">Crear Encuesta</div>

        <div className="card">
          <div className="field">
            <label className="lab">Título de la encuesta <span className="req">*</span></label>
            <input className="inp" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Disponibilidad reunión de equipo" />
          </div>
          <div className="field">
            <label className="lab">Descripción <span style={{ color: "var(--muted2)", fontWeight: 600 }}>(opcional)</span></label>
            <textarea className="inp" placeholder="Contale a tu equipo de qué se trata esta encuesta…"></textarea>
          </div>
          <div className="field">
            <label className="lab">Fecha de finalización <span style={{ color: "var(--muted2)", fontWeight: 600 }}>(opcional)</span></label>
            <div className="inp calendar"><span>Seleccionar fecha</span><Ic.cal /></div>
          </div>
          <div className="field">
            <div className="switchrow">
              <div>
                <div className="sw-t">Encuesta anónima</div>
                <div className="sw-s">No se registra quién respondió cada pregunta.</div>
              </div>
              <button className={"switch" + (anon ? " on" : "")} onClick={() => setAnon(a => !a)}><span className="knob"></span></button>
            </div>
          </div>
        </div>

        {/* ---- NEW: recipients / audience ---- */}
        <div className="card">
          <div className="card-head">
            <span className="seclab">¿Quién verá la encuesta?</span>
          </div>

          <div className={"aud-quick" + (allEmployees ? " on" : "")} onClick={() => setAllEmployees(true)}>
            <div className="radio"></div>
            <div className="qt">
              <div className="a">Todos los empleados</div>
              <div className="b">Se muestra a las {ALL_PEOPLE.length} personas de la organización.</div>
            </div>
            <span style={{ color: "var(--accent)" }}><Ic.users /></span>
          </div>

          <div className={"aud-quick" + (!allEmployees ? " on" : "")} style={{ marginTop: 11 }} onClick={() => setAllEmployees(false)}>
            <div className="radio"></div>
            <div className="qt">
              <div className="a">Elegir usuarios</div>
              <div className="b">Seleccioná por nombre, o una sede completa.</div>
            </div>
          </div>

          {!allEmployees && (
            <>
              <div className="aud-divider">DESTINATARIOS</div>
              {recipients.length > 0 && (
                <div className="chips">
                  {chips.map(n => (
                    <span className="chip" key={n}>
                      <span className="av">{initials(n)}</span>
                      {n}
                      <button className="x" onClick={() => setRecipients(r => r.filter(x => x !== n))}><Ic.x /></button>
                    </span>
                  ))}
                  {extra > 0 && <span className="chip more">+{extra} más</span>}
                </div>
              )}
              <button className="pick-btn" onClick={() => setSheet(true)}>
                <Ic.mag /> {recipients.length ? "Editar selección" : "Buscar y seleccionar usuarios"}
              </button>
              <div className="aud-summary">
                {recipients.length
                  ? <><b>{recipients.length}</b> {recipients.length === 1 ? "persona seleccionada" : "personas seleccionadas"}</>
                  : "Todavía no seleccionaste a nadie."}
              </div>
            </>
          )}
        </div>

        {/* questions */}
        <div className="card">
          <div className="card-head">
            <span className="seclab">Preguntas (1)</span>
            <button className="addq">+ Agregar</button>
          </div>
          <div className="qrow">
            <span className="qnum">1</span>
            <div className="qmid">
              <div className="qt">¿Qué horario te queda mejor?</div>
              <div className="qty">Opción múltiple · 9:00 / 11:00 / 15:00 / 17:00</div>
            </div>
          </div>
        </div>
      </div>

      <div className="actionbar">
        <button className="ghost" onClick={onBack}>Cancelar</button>
        <button className="primary" disabled={!canCreate} onClick={() => { flash("Encuesta creada y enviada a los destinatarios."); onBack(); }}>
          Crear Encuesta
        </button>
      </div>

      <AudienceSheet
        show={sheet}
        selected={recipients}
        onClose={() => setSheet(false)}
        onConfirm={(list) => { setRecipients(list); setSheet(false); }}
      />
    </>
  );
}

/* ===================== meeting request sheet ===================== */
function MeetingSheet({ show, people, onClose, onSend }) {
  const [motivo, setMotivo] = useState("Reunión de equipo");
  const [nota, setNota] = useState("");
  useEffect(() => { if (show) setNota(""); }, [show]);

  // group selected voters by their chosen slot
  const grouped = useMemo(() => {
    const map = {};
    for (const v of people) (map[v.slot] = map[v.slot] || []).push(v.name);
    return HORARIOS.filter(h => map[h]).map(h => ({ slot: h, names: map[h] }));
  }, [people]);

  return (
    <div className={"ov" + (show ? " show" : "")}>
      <div className="ov-back" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <div className="sheet-head">
          <div className="t">Solicitud de reunión</div>
          <div className="s">{people.length} {people.length === 1 ? "persona" : "personas"} · cada una recibe la invitación en el horario que eligió.</div>
        </div>

        <div className="sheet-scroll">
          <div className="mt-field">
            <label className="lab">Título / motivo</label>
            <input className="inp" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Reunión de equipo" />
          </div>
          <div className="mt-field">
            <label className="lab">Nota para cada persona <span style={{ color: "var(--muted2)", fontWeight: 600 }}>(opcional)</span></label>
            <textarea className="inp" value={nota} onChange={e => setNota(e.target.value)} placeholder="Se incluye en todas las invitaciones…"></textarea>
          </div>

          <div className="mt-sep-note">
            <Ic.info />
            <span>Se crea una invitación <b>separada por persona</b>, agendada en el horario que cada uno votó. Agrupadas abajo por horario.</span>
          </div>

          <div className="mt-field">
            {grouped.map(g => (
              <div className="mt-group" key={g.slot}>
                <div className="gh">
                  <span className="gslot"><Ic.clock /> {g.slot}</span>
                  <span className="gcount">{g.names.length} {g.names.length === 1 ? "invitación" : "invitaciones"}</span>
                </div>
                <div className="mt-people">
                  {g.names.map(n => (
                    <span className="mt-person" key={n}><Avatar name={n} cls="sm" />{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sheet-foot">
          <span className="meta"><b>{people.length}</b> solicitudes</span>
          <button className="confirm" disabled={!motivo.trim()} onClick={() => onSend(people.length)}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== results / analysis screen ===================== */
function ResultadosScreen({ survey, onBack, flash }) {
  const [selected, setSelected] = useState([]); // names
  const [sheet, setSheet] = useState(false);

  const counts = useMemo(() => {
    const m = Object.fromEntries(HORARIOS.map(h => [h, 0]));
    VOTES.forEach(v => m[v.slot]++);
    return m;
  }, []);
  const maxCount = Math.max(...Object.values(counts), 1);
  const totalVotes = VOTES.length;

  const toggle = (name) =>
    setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name]);
  const allOn = selected.length === VOTES.length;
  const toggleAll = () => setSelected(allOn ? [] : VOTES.map(v => v.name));

  const selectedVotes = VOTES.filter(v => selected.includes(v.name));

  return (
    <>
      <div className="apphead">
        <button className="lresult" onClick={onBack}>Resultados</button>
        <span className="ttl" style={{ color: "var(--ink)" }}>{survey.title.length > 18 ? "Encuesta" : survey.title}</span>
        <button className="trash"><Ic.trash /></button>
      </div>

      <div className="body" style={{ paddingBottom: selected.length ? 120 : 40 }}>
        <div className="scr-title" style={{ marginBottom: 6 }}>{survey.title}</div>
        {survey.desc && <div className="res-desc">{survey.desc}</div>}

        <div className="statrow">
          <div className="stat"><div className="n accent">{totalVotes}</div><div className="l">Respuestas</div></div>
          <div className="stat"><div className="n">{survey.total}</div><div className="l">Destinatarios</div></div>
          <div className="stat"><div className="n">{Math.round(totalVotes / survey.total * 100)}%</div><div className="l">Participación</div></div>
        </div>

        {/* question results */}
        <div className="card">
          <div className="qhead">
            <span className="qlabel">Pregunta 1</span>
            <span className="qtype"><Ic.check style={{ color: "var(--accent)" }} /> Opción múltiple</span>
          </div>
          <div className="qtitle">¿Qué horario te queda mejor?</div>
          {HORARIOS.map(h => (
            <div className="bar" key={h}>
              <div className="bt">
                <span className="bl"><span className="clock"><Ic.clock /></span>{h}</span>
                <span className="bv">{counts[h]} · {Math.round(counts[h] / totalVotes * 100)}%</span>
              </div>
              <div className="track"><div className="fill" style={{ width: (counts[h] / maxCount * 100) + "%" }}></div></div>
            </div>
          ))}
        </div>

        {/* voters */}
        <div className="card">
          <div className="voters-head">
            <span className="seclab">Votantes ({VOTES.length})</span>
            <button className="selectall" onClick={toggleAll}>
              <span className="check" style={allOn ? { background: "var(--accent)", borderColor: "var(--accent)" } : {}}>
                {allOn && <Ic.check />}
              </span>
              {allOn ? "Quitar todos" : "Seleccionar todos"}
            </button>
          </div>
          <div className="aud-summary" style={{ textAlign: "left", margin: "0 2px 8px" }}>
            Seleccioná votantes para enviarles una reunión en su horario.
          </div>
          {VOTES.map(v => {
            const on = selected.includes(v.name);
            return (
              <div key={v.name} className={"vrow" + (on ? " sel" : "")} onClick={() => toggle(v.name)}>
                <div className="check">{on && <Ic.check />}</div>
                <Avatar name={v.name} />
                <div className="vmid">
                  <div className="vn">{v.name}</div>
                  <div className="vr">{sedeOf(v.name)}</div>
                </div>
                <span className="slot"><Ic.clock /> {v.slot}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="actionbar">
          <button className="primary" onClick={() => setSheet(true)}>
            <Ic.calplus /> Solicitar reunión <span className="badge">{selected.length}</span>
          </button>
        </div>
      )}

      <MeetingSheet
        show={sheet}
        people={selectedVotes}
        onClose={() => setSheet(false)}
        onSend={(n) => { setSheet(false); setSelected([]); flash(`Se enviaron ${n} solicitudes de reunión, cada una en su horario.`); }}
      />
    </>
  );
}

/* ===================== survey list screen ===================== */
function ListScreen({ onOpen, onCreate }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? SURVEYS.filter(s => s.title.toLowerCase().includes(t)) : SURVEYS;
  }, [q]);

  return (
    <>
      <div className="apphead">
        <span className="ttl">Gestión de Encuestas</span>
      </div>
      <div className="body">
        <div className="search">
          <Ic.mag />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar encuesta" />
        </div>
        {list.map(s => (
          <button className="scard" key={s.id} onClick={() => onOpen(s)}>
            <div className="smid">
              <div className="snm">{s.title}</div>
              <div className="smeta">
                <span className={"pill " + (s.status === "active" ? "active" : "closed")}>{s.status === "active" ? "Activa" : "Cerrada"}</span>
                <span>{s.responses}/{s.total} respuestas</span>
                <span>· {s.date}</span>
              </div>
            </div>
            <span className="chev"><Ic.chev /></span>
          </button>
        ))}
      </div>
      <div className="actionbar">
        <button className="primary" onClick={onCreate}>+ Crear Encuesta</button>
      </div>
    </>
  );
}

/* ===================== app shell ===================== */
function App() {
  const [screen, setScreen] = useState("list"); // list | crear | resultados
  const [active, setActive] = useState(SURVEYS[0]);
  const [toast, setToast] = useState("");
  const tRef = useRef(null);

  const flash = (m) => {
    setToast(m);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="phone">
      <StatusBar />
      <div className="stage">
        {screen === "list" && (
          <ListScreen
            onOpen={(s) => { setActive(s); setScreen("resultados"); }}
            onCreate={() => setScreen("crear")}
          />
        )}
        {screen === "crear" && <CrearScreen onBack={() => setScreen("list")} flash={flash} />}
        {screen === "resultados" && <ResultadosScreen survey={active} onBack={() => setScreen("list")} flash={flash} />}
        <div className={"toast" + (toast ? " show" : "")}>
          <span className="dot"></span><span className="tt">{toast}</span>
        </div>
      </div>
      <div className="sysbar"><span className="pill2"></span></div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
