const { useState, useEffect, useRef } = React;

const ACCENTS = {
  Azul:  { accent:"#2f78e8", soft:"#e9f1fd", line:"#cfe0f9" },
  Navy:  { accent:"#2b1f5c", soft:"#ebe9f3", line:"#d3cee4" },
  Verde: { accent:"#1f9d57", soft:"#e7f6ee", line:"#c4e7d2" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "Azul"
}/*EDITMODE-END*/;

function applyAccent(name){
  const a = ACCENTS[name] || ACCENTS.Azul;
  const r = document.documentElement.style;
  r.setProperty("--accent", a.accent);
  r.setProperty("--accentSoft", a.soft);
  r.setProperty("--accentLine", a.line);
}

/* ---------------- fichaje flow ---------------- */
function MenuSheet({ show, onClose, onPick }){
  const s = TODAY.shift;
  return (
    <div className={"ov"+(show?" show":"")}>
      <div className="ov-back" onClick={onClose}></div>
      <div className="sheet">
        <div className="grab"></div>
        <h3>Registrar fichaje</h3>
        <div className="ctx"><ClockIc s={16}/> Turno de hoy: <b>{s.turno} · {s.in}–{s.out}</b> · {s.sede}</div>
        <button className="opt in" onClick={()=>onPick("in")}>
          <span className="oico"><SignIn s={24}/></span>
          <span className="ot"><span className="t">Marcar entrada</span><span className="s">Ingreso previsto {s.in} · {s.sede}</span></span>
          <span className="chev"><Chev d="right" s={20}/></span>
        </button>
        <button className="opt out" onClick={()=>onPick("out")}>
          <span className="oico"><SignOut s={24}/></span>
          <span className="ot"><span className="t">Marcar salida</span><span className="s">Egreso previsto {s.out} · {s.sede}</span></span>
          <span className="chev"><Chev d="right" s={20}/></span>
        </button>
      </div>
    </div>
  );
}

function Scanner({ show, action, onCancel, onDetect }){
  const timer = useRef(null);
  useEffect(()=>{
    if(show){
      timer.current = setTimeout(()=>onDetect(), 2600);
      return ()=>clearTimeout(timer.current);
    }
  }, [show, action]);
  const isIn = action==="in";
  return (
    <div className={"scan"+(show?" show":"")}>
      <div className="scan-cam"></div>
      <div className="scan-top">
        <button className="x" onClick={onCancel}><X s={20}/></button>
        <span className="mode"><span className="d" style={{background:isIn?"#7cc6ff":"#ff8f7a"}}></span>{isIn?"Marcando entrada":"Marcando salida"}</span>
      </div>
      <div className="scan-mid">
        <div className="finder">
          <span className="corner c1"></span><span className="corner c2"></span>
          <span className="corner c3"></span><span className="corner c4"></span>
          <span className="line"></span>
        </div>
        <div className="scan-hint">Apuntá la cámara al código QR del local para registrar tu {isIn?"entrada":"salida"}.</div>
      </div>
      <div className="scan-bottom">
        <button className="scan-sim" onClick={onDetect}>Simular escaneo</button>
      </div>
    </div>
  );
}

function Confirmation({ show, action, time, onDone }){
  const isIn = action==="in";
  const s = TODAY.shift;
  return (
    <div className={"confirm"+(show?" show":"")+(isIn?" in":" out")}>
      <div className="spacer"></div>
      <div className="badge"><Check s={48}/></div>
      <div className="ch1">{isIn?"Entrada registrada":"Salida registrada"}</div>
      <div className="ch2">Fichaje confirmado correctamente{isIn?"":" · ¡Buen descanso!"}</div>
      <div className="bigtime">{time}</div>
      <div className="recap">
        <div className="rr"><span className="k">Tipo</span><span className="v">{isIn?"Entrada":"Salida"}</span></div>
        <div className="rr"><span className="k">Turno asignado</span><span className="v">{s.turno} · {s.in}–{s.out}</span></div>
        <div className="rr"><span className="k">Sede</span><span className="v">{s.sede}</span></div>
        <div className="rr"><span className="k">Fecha</span><span className="v">Mié 15 Abr 2026</span></div>
      </div>
      <button className={"done"+(isIn?"":" green")} onClick={onDone}>Listo</button>
    </div>
  );
}

/* ---------------- navbar ---------------- */
function NavBar({ tab, setTab, onQR }){
  const Tab = ({id, icon, label}) => (
    <button className={"navbtn-tab"+(tab===id?" on":"")} onClick={()=>setTab(id)} aria-label={label}>{icon}</button>
  );
  return (
    <div className="navwrap">
      <div className="navpill">
        <Tab id="home" icon={<NavHome/>} label="Inicio" />
        <Tab id="agenda" icon={<NavCal/>} label="Agenda" />
        <Tab id="stats" icon={<NavPie/>} label="Estadísticas" />
        <Tab id="trend" icon={<NavTrend/>} label="Actividad" />
        <button className="navbtn-tab qr" onClick={onQR} aria-label="Fichar"><NavQR s={26}/></button>
      </div>
    </div>
  );
}

function Placeholder({ title }){
  return (
    <div className="scr">
      <div className="placeholder">
        <div className="ic"><NavHome s={34}/></div>
        <div className="t">{title}</div>
        <div>Pantalla existente de la app</div>
      </div>
    </div>
  );
}

/* ---------------- app ---------------- */
function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(()=>{ applyAccent(t.accent); }, [t.accent]);

  const [tab, setTab] = useState("agenda");
  const [view, setView] = useState("Día");
  const [flow, setFlow] = useState(null); // 'menu' | 'scan' | 'confirm'
  const [action, setAction] = useState("in");
  const [markTime, setMarkTime] = useState("08:43");
  const [toast, setToast] = useState("");
  const toastT = useRef(null);

  const flash = (m)=>{ setToast(m); clearTimeout(toastT.current); toastT.current=setTimeout(()=>setToast(""),1900); };

  const openMenu = ()=> setFlow("menu");
  const pick = (a)=>{ setAction(a); setMarkTime(a==="in"?"08:43":"16:05"); setFlow("scan"); };
  const detect = ()=> setFlow("confirm");
  const finishFlow = ()=>{ setFlow(null); flash((action==="in"?"Entrada":"Salida")+" marcada · "+markTime); };

  return (
    <>
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
          {tab==="agenda"
            ? <Agenda view={view} setView={setView} onFichar={openMenu} />
            : <Placeholder title={ {home:"Inicio", stats:"Estadísticas", trend:"Actividad"}[tab] } />}
        </div>

        <NavBar tab={tab} setTab={setTab} onQR={openMenu} />
        <div className="sysbar"><span className="pill"></span></div>

        <MenuSheet show={flow==="menu"} onClose={()=>setFlow(null)} onPick={pick} />
        <Scanner show={flow==="scan"} action={action} onCancel={()=>setFlow(null)} onDetect={detect} />
        <Confirmation show={flow==="confirm"} action={action} time={markTime} onDone={finishFlow} />

        <div className={"toast"+(toast?" show":"")}><span className="dot"></span>{toast}</div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Apariencia" />
        <TweakColor label="Color de acento"
          value={ACCENTS[t.accent].accent}
          options={[ACCENTS.Azul.accent, ACCENTS.Navy.accent, ACCENTS.Verde.accent]}
          onChange={(hex)=>{
            const name = Object.keys(ACCENTS).find(k=>ACCENTS[k].accent===hex) || "Azul";
            setTweak("accent", name);
          }} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
