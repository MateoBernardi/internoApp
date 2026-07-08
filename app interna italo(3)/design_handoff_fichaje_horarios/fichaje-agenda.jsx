const { useState: useStateAg } = React;

/* ---- data: assigned work schedule + personal events ---- */
// Today = Miércoles 15 Abril 2026
// Each day may have a turno (shift, celeste) OR a licencia (morado); plus actividades (verde)
const WEEK = [
  { dow:"LUN", num:13, label:"Lunes 13", shift:{ turno:"Mañana", code:"M", in:"08:00", out:"16:00", sede:"Centro" }, events:[] },
  { dow:"MAR", num:14, label:"Martes 14", shift:{ turno:"Mañana", code:"M", in:"08:00", out:"16:00", sede:"Centro" }, events:[] },
  { dow:"MIÉ", num:15, label:"Miércoles 15", today:true, shift:{ turno:"Mañana", code:"M", in:"08:00", out:"16:00", sede:"Centro" }, events:[{ time:"12:00", title:"Ir al gym", sub:"Actividad personal" }] },
  { dow:"JUE", num:16, label:"Jueves 16", licencia:{ tipo:"Licencia médica", detalle:"Día completo" }, events:[] },
  { dow:"VIE", num:17, label:"Viernes 17", shift:{ turno:"Tarde", code:"T", in:"14:00", out:"22:00", sede:"Sucursal Norte" }, events:[{ time:"10:00", title:"Turno médico", sub:"Actividad personal" }] },
  { dow:"SÁB", num:18, label:"Sábado 18", shift:null, events:[] },
  { dow:"DOM", num:19, label:"Domingo 19", shift:null, events:[] },
];
const TODAY = WEEK.find(d=>d.today);

function ShiftCard({ day, onFichar }){
  if(day.licencia){
    return (
      <div className="shift licencia">
        <span className="tag"><ClockIc s={14}/> Licencia</span>
        <div className="restmsg">{day.licencia.tipo} · {day.licencia.detalle}</div>
      </div>
    );
  }
  if(!day.shift){
    return (
      <div className="shift rest">
        <span className="tag">{day.dow==="SÁB"||day.dow==="DOM" ? "Día libre" : "Sin turno"}</span>
        <div className="restmsg">No tenés turno asignado este día.</div>
      </div>
    );
  }
  const s = day.shift;
  return (
    <div className="shift">
      <span className="tag"><ClockIc s={14}/> Turno {s.turno} · {s.code}</span>
      <div className="when">
        <div className="blk"><span className="lab">Ingreso</span><span className="val">{s.in}</span></div>
        <span className="arrow"><Arrow s={22}/></span>
        <div className="blk"><span className="lab">Egreso</span><span className="val">{s.out}</span></div>
      </div>
      <div className="sede"><Pin s={16}/> Sede de ingreso · <b style={{color:"#3a4047",fontWeight:700,marginLeft:4}}>{s.sede}</b></div>
      {day.today && (
        <button className="fichar" onClick={onFichar}><NavQR s={20}/> Fichar mi entrada</button>
      )}
    </div>
  );
}

/* ---- Día view ---- */
function DayView({ onFichar }){
  const day = TODAY;
  const hours = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
  // build a map of what sits on each hour
  const onHour = {};
  if(day.shift){
    onHour[day.shift.in] = { type:"work", t:`Turno ${day.shift.turno}`, s:`Ingreso · ${day.shift.sede}`, time:day.shift.in };
    onHour[day.shift.out] = { type:"work", t:`Fin de turno`, s:`Egreso · ${day.shift.sede}`, time:day.shift.out };
  }
  day.events.forEach(e=>{ onHour[e.time] = { type:"actividad", t:e.title, s:e.sub, time:e.time }; });

  return (
    <div>
      <ShiftCard day={day} onFichar={onFichar} />
      <div className="tl-head">Cronograma del día</div>
      <div className="tl">
        {hours.map(h=>{
          const ev = onHour[h];
          return (
            <div className="tl-row" key={h}>
              <div className="tl-time">{h}</div>
              <div className="tl-track">
                {ev && (
                  <div className={"ev "+ev.type}>
                    <span className="dot"></span>
                    <div>
                      <div className="t">{ev.t}</div>
                      <div className="s">{ev.s}</div>
                    </div>
                    <span className="time">{ev.time}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Semana view ---- */
function WeekView(){
  return (
    <div style={{paddingTop:12}}>
      {WEEK.map(d=>(
        <div className={"wk-day"+(d.today?" today":"")} key={d.num}>
          <div className="wk-top">
            <span className="d">{d.dow}</span>
            <span className="num">{d.num} ABR{d.today?" · Hoy":""}</span>
          </div>
          {d.licencia
            ? <div className="wk-chip lic"><ClockIc s={15}/> <span className="h">Licencia</span> · {d.licencia.tipo}</div>
            : d.shift
            ? <div className="wk-chip"><ClockIc s={15}/> <span className="h">{d.shift.in}–{d.shift.out}</span> · Turno {d.shift.code} · {d.shift.sede}</div>
            : <div className="wk-chip off">Día libre · sin turno</div>}
          {d.events.map((e,i)=>(
            <div className="wk-ev" key={i}><span className="dot"></span> {e.time} · {e.title}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---- Mes view ---- */
function MonthView(){
  // April 2026 starts on Wednesday (col index 3, week starts Sunday)
  const dows = ["d","l","m","m","j","v","s"];
  const start = 3; // 1 Apr = miércoles
  const daysInMonth = 30;
  const workDays = new Set(); // weekdays have a shift
  const licencias = { 16:true }; // licencia days (morado)
  const personal = { 15:true, 17:true, 20:true }; // actividades (verde)
  for(let n=1;n<=daysInMonth;n++){
    const col = (start + (n-1)) % 7;
    if(col!==0 && col!==6 && !licencias[n]) workDays.add(n); // mon-fri w/o licencia
  }
  const cells = [];
  for(let i=0;i<start;i++) cells.push({ out:true, n:31-start+1+i }); // trailing march
  for(let n=1;n<=daysInMonth;n++) cells.push({ n });
  while(cells.length % 7 !== 0) cells.push({ out:true, n:cells.length-daysInMonth-start+1 });

  return (
    <div style={{paddingTop:8}}>
      <div className="cal-week">
        {dows.map((d,i)=><div className="cal-dow" key={i}>{d}</div>)}
      </div>
      <div className="cal-week" style={{borderLeft:"1px solid var(--line)", borderBottom:"1px solid var(--line)", borderRadius:"0 0 12px 12px", overflow:"hidden"}}>
        {cells.map((c,i)=>(
          <div className={"cal-cell"+(c.out?" out":"")+(!c.out&&c.n===15?" today":"")} key={i}>
            <div className="n">{c.n}</div>
            {!c.out && (
              <div className="cal-marks">
                {workDays.has(c.n) && <span className="wk"></span>}
                {licencias[c.n] && <span className="lic"></span>}
                {personal[c.n] && <span className="pe"></span>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="cal-legend">
        <span><span className="wk"></span> Turno</span>
        <span><span className="lic"></span> Licencia</span>
        <span><span className="pe"></span> Actividad</span>
      </div>
    </div>
  );
}

function Agenda({ view, setView, onFichar }){
  return (
    <div className="scr">
      <div className="scr-head">
        <div className="scr-title">Agenda</div>
        <div className="scr-sub">Tu turno laboral y tus eventos, en un solo lugar</div>
        <div className="monthnav">
          <button className="navbtn"><Chev d="left" s={20}/></button>
          <span className="m">Abril 2026</span>
          <button className="navbtn"><Chev d="right" s={20}/></button>
        </div>
        <div className="seg">
          {["Día","Semana","Mes"].map(v=>(
            <button key={v} className={view===v?"on":""} onClick={()=>setView(v)}>{v}</button>
          ))}
        </div>
      </div>
      <div className="scr-body">
        {view==="Día" && <DayView onFichar={onFichar} />}
        {view==="Semana" && <WeekView />}
        {view==="Mes" && <MonthView />}
      </div>
    </div>
  );
}

Object.assign(window, { Agenda, TODAY });
