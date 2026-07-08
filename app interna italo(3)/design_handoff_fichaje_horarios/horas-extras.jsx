const { useState, useMemo } = React;

/* ===================== data (sample) ===================== */
const HE_ROLES = ["Vendedor", "Encargado", "Depósito", "Administrativo"];
const HE_EMPLOYEES = [
  { name: "Victor Bernardi", role: "Vendedor" },
  { name: "Lucía Gómez", role: "Vendedor" },
  { name: "Mateo Bernardi", role: "Encargado" },
  { name: "Ana Torres", role: "Vendedor" },
  { name: "Diego Ramírez", role: "Depósito" },
  { name: "Sofía Díaz", role: "Administrativo" },
  { name: "Martín Pérez", role: "Encargado" },
  { name: "Carla Núñez", role: "Depósito" },
];

// fixed sample "today" reference — last closed week = Mon 30/03 to Sun 05/04/2026
const HE_LAST_WEEK = { from: "2026-03-30", to: "2026-04-05", label: "Semana pasada", sub: "30 mar – 5 abr" };
const HE_THIS_WEEK = { from: "2026-04-06", to: "2026-04-12", label: "Semana actual", sub: "6 – 12 abr" };

const HE_DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function heHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function heHours(name, iso) {
  const vals = [0, 0, 0.5, 1, 1, 1.5, 2, 2.5];
  return vals[heHash(name + iso) % vals.length];
}
function heInitials(n) { return n.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }
function heParseISO(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
function heFmtDDMM(iso) { const d = heParseISO(iso); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
function heDayName(iso) { return HE_DAY_NAMES[heParseISO(iso).getDay()]; }
function heDaysBetween(fromISO, toISO) {
  const out = [];
  let cur = heParseISO(fromISO);
  const end = heParseISO(toISO);
  let guard = 0;
  while (cur <= end && guard < 62) {
    const y = cur.getFullYear(), m = String(cur.getMonth() + 1).padStart(2, "0"), d = String(cur.getDate()).padStart(2, "0");
    out.push(y + "-" + m + "-" + d);
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    guard++;
  }
  return out;
}
function heTotal(name, days) { return days.reduce((s, iso) => s + heHours(name, iso), 0); }
function heFmtH(n) { return (Math.round(n * 10) / 10) + "h"; }

/* ===================== icons ===================== */
const HeChevL = (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const HeChevR = (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const HeSearch = (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const HeCaret = (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const HeCash = (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...p}><rect x="2.5" y="6.5" width="19" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.8" /></svg>;

/* ===================== detail sheet ===================== */
function HeDetailSheet({ emp, range, show, onClose, onLiquidar }) {
  if (!emp) return <div className="ov"></div>;
  const days = useMemo(() => heDaysBetween(range.from, range.to), [range.from, range.to]);
  const total = useMemo(() => heTotal(emp.name, days), [emp.name, days]);

  return (
    <div className={"ov" + (show ? " show" : "")}>
      <div className="ov-back" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <h3 style={{ marginBottom: 2 }}>{emp.name}</h3>
        <div className="he-detail-role">{emp.role}</div>

        <div className="he-total-box">
          <div className="he-total-n">{heFmtH(total)}</div>
          <div className="he-total-l">horas extra · {range.from === HE_LAST_WEEK.from && range.to === HE_LAST_WEEK.to ? HE_LAST_WEEK.label : range.from === HE_THIS_WEEK.from && range.to === HE_THIS_WEEK.to ? HE_THIS_WEEK.label : heFmtDDMM(range.from) + " – " + heFmtDDMM(range.to)}</div>
        </div>

        <div className="he-daylist-head">Distribución por día</div>
        <div className="he-daylist">
          {days.map(iso => {
            const h = heHours(emp.name, iso);
            return (
              <div className="he-dayrow" key={iso}>
                <span className="he-dn">{heDayName(iso)} <span className="he-dd">{heFmtDDMM(iso)}</span></span>
                <span className={"he-dh" + (h === 0 ? " zero" : "")}>{h === 0 ? "—" : heFmtH(h)}</span>
              </div>
            );
          })}
        </div>

        <div className="acts" style={{ marginTop: 18 }}>
          <button className="ok" onClick={() => onLiquidar(emp, total)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><HeCash /> Liquidar horas extra</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== main screen ===================== */
function HorasExtrasScreen({ onBack }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("Todos");
  const [range, setRange] = useState({ from: HE_LAST_WEEK.from, to: HE_LAST_WEEK.to });
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState("");
  const toastT = React.useRef(null);

  const flash = (m) => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 2400); };

  const days = useMemo(() => heDaysBetween(range.from, range.to), [range.from, range.to]);

  const preset = range.from === HE_LAST_WEEK.from && range.to === HE_LAST_WEEK.to ? "last"
    : range.from === HE_THIS_WEEK.from && range.to === HE_THIS_WEEK.to ? "this" : null;

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return HE_EMPLOYEES
      .filter(e => (role === "Todos" || e.role === role) && (!t || e.name.toLowerCase().includes(t)))
      .map(e => ({ ...e, total: heTotal(e.name, days) }))
      .sort((a, b) => b.total - a.total);
  }, [q, role, days]);

  const totalAll = rows.reduce((s, r) => s + r.total, 0);

  const openDetail = (emp) => setDetail(emp);
  const closeDetail = () => setDetail(null);
  const liquidar = (emp) => { flash("Horas extra de " + emp.name + " liquidadas"); closeDetail(); };

  return (
    <>
      <div className="scr-head">
        <button className="back" onClick={onBack}><HeChevL /> Horarios</button>
        <div className="scr-title">Horas extra</div>
        <div className="scr-sub">Tocá un empleado para ver la distribución día por día</div>

        <div className="he-rangebox">
          <div className="he-presets">
            <button className={preset === "last" ? "on" : ""} onClick={() => setRange({ from: HE_LAST_WEEK.from, to: HE_LAST_WEEK.to })}>{HE_LAST_WEEK.label}</button>
            <button className={preset === "this" ? "on" : ""} onClick={() => setRange({ from: HE_THIS_WEEK.from, to: HE_THIS_WEEK.to })}>{HE_THIS_WEEK.label}</button>
          </div>
          <div className="he-rangedates">
            <label>
              <span>Desde</span>
              <input type="date" required value={range.from} onChange={e => e.target.value && setRange(r => ({ ...r, from: e.target.value }))} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="date" required value={range.to} onChange={e => e.target.value && setRange(r => ({ ...r, to: e.target.value }))} />
            </label>
          </div>
        </div>
      </div>

      <div className="tools">
        <div className="search"><HeSearch /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar empleado" /></div>
        <span className="selfilter">
          <span className="k">Rol</span>
          <span className="txt">{role}</span>
          <span className="cv"><HeCaret /></span>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option>Todos</option>
            {HE_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </span>
      </div>

      <div className="list">
        {rows.length === 0 && <div className="empty">No hay empleados con los filtros aplicados.</div>}
        {rows.map(r => (
          <div className="ecard" key={r.name} onClick={() => openDetail(r)}>
            <span className="eav">{heInitials(r.name)}</span>
            <div className="emid">
              <div className="enm">{r.name}</div>
              <div className="erole">{r.role}</div>
            </div>
            <div className="ert">
              <div className="ehr">{heFmtH(r.total)}</div>
              <div className="etl">extra</div>
            </div>
            <button className="eliq" onClick={(e) => { e.stopPropagation(); liquidar(r); }}><HeCash /> Liquidar</button>
          </div>
        ))}
      </div>

      <div className="savebar">
        <div className="info"><b>{rows.length}</b> empleados · <b>{heFmtH(totalAll)}</b> horas extra en el rango</div>
      </div>

      <HeDetailSheet emp={detail} range={range} show={!!detail} onClose={closeDetail} onLiquidar={liquidar} />

      <div className={"toast" + (toast ? " show" : "")}><span className="dot"></span>{toast}</div>
    </>
  );
}

window.HorasExtrasScreen = HorasExtrasScreen;
