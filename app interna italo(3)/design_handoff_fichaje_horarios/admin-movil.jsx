const { useState, useRef, useMemo } = React;

const SEDES = ["Centro", "Sucursal Norte", "Depósito Sur", "Sucursal Oeste"];
const TURNO_LABEL = { M:"Mañana", T:"Tarde" };

const Search = ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const Plus = ({s=26}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;
const Upload = ({s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Pin = ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8"/></svg>;
const Caret = ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChevR = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChevL = ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Sync = ({s=15}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0113.7-5.6L20 8M20 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12a8 8 0 01-13.7 5.6L4 16M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;

let _id = 1;
const mk = (nombre, fecha, turno, ing, egr, si, se, isNew=false) =>
  ({ id:_id++, nombre, fecha, turno, ing, egr, si, se, _new:isNew });

const SEED = [
  mk("Victor Bernardi","15/04/2026","M","08:00","16:00","Centro","Centro"),
  mk("Lucía Gómez","15/04/2026","M","08:00","16:00","Centro","Centro"),
  mk("Mateo Bernardi","15/04/2026","T","14:00","22:00","Sucursal Norte","Sucursal Norte"),
  mk("Ana Torres","15/04/2026","T","14:00","22:00","Sucursal Norte","Sucursal Norte"),
  mk("Diego Ramírez","16/04/2026","M","08:00","16:00","Depósito Sur","Depósito Sur"),
  mk("Sofía Díaz","16/04/2026","M","09:00","17:00","Centro","Centro"),
  mk("Martín Pérez","16/04/2026","T","14:00","22:00","Sucursal Norte","Centro"),
  mk("Carla Núñez","17/04/2026","M","08:00","16:00","Centro","Centro"),
];
const TXT_ROWS = [
  mk("Roberto Vega","18/04/2026","M","08:00","16:00","Centro","Centro",true),
  mk("Elena Cruz","18/04/2026","M","08:00","16:00","Centro","Centro",true),
  mk("Tomás Ruiz","18/04/2026","T","14:00","22:00","Sucursal Norte","Sucursal Norte",true),
];

function Pick({ value, onChange, options, labelMap }){
  return (
    <span className="selwrap">
      <span className="txt">{labelMap?labelMap[value]:value}</span>
      <span className="cv"><Caret/></span>
      <select value={value} onChange={e=>onChange(e.target.value)}>
        {options.map(o=><option key={o} value={o}>{labelMap?labelMap[o]:o}</option>)}
      </select>
    </span>
  );
}

function EditSheet({ show, draft, onClose, onField, onSave, onDelete }){
  if(!draft) return <div className="ov"></div>;
  return (
    <div className={"ov"+(show?" show":"")}>
      <div className="ov-back" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <h3>Editar turno</h3>

        <div className="fld">
          <div className="lab">Nombre y apellido</div>
          <input value={draft.nombre} onChange={e=>onField("nombre",e.target.value)} placeholder="Ej: Victor Bernardi" />
        </div>
        <div className="fld">
          <div className="lab">Fecha</div>
          <input value={draft.fecha} onChange={e=>onField("fecha",e.target.value)} placeholder="dd/mm/aaaa" />
        </div>
        <div className="fld">
          <div className="lab">Turno</div>
          <div className="seg2">
            <button className={draft.turno==="M"?"on":""} onClick={()=>onField("turno","M")}>Mañana · M</button>
            <button className={draft.turno==="T"?"on":""} onClick={()=>onField("turno","T")}>Tarde · T</button>
          </div>
        </div>
        <div className="row2">
          <div className="fld"><div className="lab">Ingreso</div><input value={draft.ing} onChange={e=>onField("ing",e.target.value)} placeholder="--:--" /></div>
          <div className="fld"><div className="lab">Egreso</div><input value={draft.egr} onChange={e=>onField("egr",e.target.value)} placeholder="--:--" /></div>
        </div>
        <div className="fld">
          <div className="lab">Sede de ingreso</div>
          <Pick value={draft.si} onChange={v=>onField("si",v)} options={SEDES} />
        </div>
        <div className="fld">
          <div className="lab">Sede de egreso</div>
          <Pick value={draft.se} onChange={v=>onField("se",v)} options={SEDES} />
        </div>

        <div className="acts">
          <button className="del" onClick={onDelete}>Eliminar</button>
          <button className="ok" onClick={onSave}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

function TurnosScreen({ onBack }){
  const [rows, setRows] = useState(SEED);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [sede, setSede] = useState("Todas");
  const [selDate, setSelDate] = useState("15/04/2026");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(null); // id | null
  const [draft, setDraft] = useState(null);
  const fileRef = useRef(null);
  const toastT = useRef(null);

  const flash = (m)=>{ setToast(m); clearTimeout(toastT.current); toastT.current=setTimeout(()=>setToast(""),2200); };

  // unique dates present, sorted ascending
  const dates = useMemo(()=>{
    const u = [...new Set(rows.map(r=>r.fecha))];
    return u.sort((a,b)=>a.split("/").reverse().join("").localeCompare(b.split("/").reverse().join("")));
  }, [rows]);
  const curIdx = Math.max(0, dates.indexOf(selDate));
  const goDay = (d)=>{ const ni=curIdx+d; if(ni>=0 && ni<dates.length) setSelDate(dates[ni]); };

  // rows for the selected day, after turno + sede + name filters
  const dayRows = useMemo(()=>{
    const t=q.trim().toLowerCase();
    return rows.filter(r=>{
      if(r.fecha!==selDate) return false;
      if(filter!=="Todos" && r.turno!==filter) return false;
      if(sede!=="Todas" && r.si!==sede) return false;
      if(t && !r.nombre.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [rows, selDate, filter, sede, q]);

  const openEdit = (r)=>{ setDraft({...r}); setEditing(r.id); };
  const field = (k,v)=> setDraft(d=>({...d,[k]:v}));
  const close = ()=>{ setEditing(null); setTimeout(()=>setDraft(null),250); };

  const save = ()=>{
    setRows(rs=>rs.map(r=>r.id===editing?{...draft,_new:false}:r));
    flash("Turno actualizado"); close();
  };
  const del = ()=>{ setRows(rs=>rs.filter(r=>r.id!==editing)); flash("Turno eliminado"); close(); };

  const importTXT = ()=>{
    setRows(rs=>{ const have=new Set(rs.map(r=>r.nombre)); const fresh=TXT_ROWS.filter(r=>!have.has(r.nombre)).map(r=>({...r,id:_id++,_new:true})); return [...fresh,...rs]; });
    flash("Importadas "+TXT_ROWS.length+" filas del TXT");
  };
  const onFile = (e)=>{ if(e.target.files && e.target.files.length){ importTXT(); e.target.value=""; } };

  const empleados = new Set(rows.map(r=>r.nombre).filter(Boolean)).size;
  const dayFull = (f)=>{ const names=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]; const [d,m,y]=f.split("/").map(Number); const dt=new Date(y,m-1,d); return names[dt.getDay()]+" "+f; };

  return (
    <>
        <div className="scr-head">
          <button className="back" onClick={onBack}><ChevL/> Horarios</button>
          <div className="scr-title">Manejo de turnos</div>
          <div className="scr-sub">Turnos del día · tocá uno para editarlo</div>

          <div className="daynav">
            <button className="nb" onClick={()=>goDay(-1)} disabled={curIdx<=0}><ChevL/></button>
            <span className="lbl">{dayFull(selDate)}</span>
            <button className="nb" onClick={()=>goDay(1)} disabled={curIdx>=dates.length-1}><ChevR/></button>
          </div>

          <div className="imp">
            <span className="ic"><Upload/></span>
            <div className="t"><div className="a">Importar TXT</div><div className="b">Planilla de turnos</div></div>
            <input ref={fileRef} type="file" accept=".txt" style={{display:"none"}} onChange={onFile} />
            <button className="go" onClick={()=>fileRef.current.click()}>Subir</button>
            <button className="go" style={{background:"var(--navy)"}} onClick={importTXT}>Ejemplo</button>
          </div>
        </div>

        <div className="tools">
          <div className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar empleado" /></div>
          <div className="filter">
            {["Todos","M","T"].map(f=>(
              <button key={f} className={filter===f?"on":""} onClick={()=>setFilter(f)}>{f==="Todos"?"Todos":f==="M"?"Mañana":"Tarde"}</button>
            ))}
          </div>
          <span className="selfilter">
            <span className="k">Sede</span>
            <span className="txt">{sede}</span>
            <span className="cv"><Caret/></span>
            <select value={sede} onChange={e=>setSede(e.target.value)}>
              <option>Todas</option>
              {SEDES.map(s=><option key={s}>{s}</option>)}
            </select>
          </span>
        </div>

        <div className="list">
          {dayRows.length===0 && <div className="empty">No hay turnos para este día con los filtros aplicados.</div>}
          {dayRows.map(r=>(
            <div className={"pcard"+(r._new?" isnew":"")} key={r.id} onClick={()=>openEdit(r)}>
              <span className={"tn "+r.turno}>{r.turno}</span>
              <div className="mid">
                <div className="nm">{r.nombre || "Sin nombre"}</div>
                <div className="sb"><Pin/> {r.si}{r.si!==r.se?" → "+r.se:""}</div>
              </div>
              <div className="rt">
                <div className="hr">{r.ing}–{r.egr}</div>
                <div className="tl">{TURNO_LABEL[r.turno]}</div>
              </div>
              <span className="chev"><ChevR/></span>
            </div>
          ))}
        </div>

        <div className="savebar">
          <div className="info"><b>{dayRows.length}</b> en este día · <b>{rows.length}</b> turnos · <b>{empleados}</b> empleados</div>
        </div>

        <EditSheet show={editing!==null} draft={draft}
          onClose={close} onField={field} onSave={save} onDelete={del} />

        <div className={"toast"+(toast?" show":"")}><span className="dot"></span>{toast}</div>
    </>
  );
}

/* ===================== home landing ===================== */
function HorariosHome({ onOpen }){
  return (
    <>
      <div className="scr-head">
        <div className="scr-title">Horarios</div>
        <div className="scr-sub">Elegí qué querés gestionar</div>
      </div>
      <div className="menu">
        <div className="mcard" onClick={()=>onOpen("turnos")}>
          <span className="mic"><Upload/></span>
          <div className="mmid">
            <div className="mt">Manejo de turnos</div>
            <div className="mb">Cargar, editar e importar turnos del día</div>
          </div>
          <span className="chev"><ChevR/></span>
        </div>
        <div className="mcard" onClick={()=>onOpen("horas")}>
          <span className="mic" style={{background:"#fbf1dd",color:"var(--amber)"}}><Sync/></span>
          <div className="mmid">
            <div className="mt">Manejo de horas extras</div>
            <div className="mb">Ver y liquidar horas extra por empleado</div>
          </div>
          <span className="chev"><ChevR/></span>
        </div>
      </div>
    </>
  );
}

function Shell(){
  const [screen, setScreen] = useState("home"); // home | turnos | horas
  return (
    <div className="phone">
      <div className="statusbar">
        <span>10:39</span>
        <span className="sb-right">
          <span className="bar" style={{height:7}}></span>
          <span className="bar" style={{height:10}}></span>
          <span className="bar" style={{height:13}}></span>
          <span className="sb-batt">86</span>
        </span>
      </div>

      <div className="stage">
        {screen==="home" && <HorariosHome onOpen={setScreen} />}
        {screen==="turnos" && <TurnosScreen onBack={()=>setScreen("home")} />}
        {screen==="horas" && <window.HorasExtrasScreen onBack={()=>setScreen("home")} />}
      </div>

      <div className="sysbar"><span className="pill"></span></div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Shell/>);
