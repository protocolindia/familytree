import { useState, useRef, useEffect, useCallback } from "react";
import AdminPanel from "./AdminPanel";

const BASE = import.meta.env.VITE_API_URL || "";
const api = async (method, path, body) => {
  const token = localStorage.getItem("ft_token");
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new Error(`Cannot reach server. Check VITE_API_URL in Railway.`); }
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { throw new Error("Server returned invalid response"); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const REL_TYPES = ["Son","Daughter","Father","Mother","Brother","Sister","Wife","Husband","Ex-wife","Ex-husband","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece"];
const SPOUSE_TYPES = ["Wife","Husband","Ex-wife","Ex-husband"];
const GEN_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#14b8a6"];

// ── Theme System ──────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#0d1117", bg2:"#161b22", bg3:"#1c2333", bg4:"#21262d",
    text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
    border:"#30363d", border2:"#21262d",
    input:"#0d1117", accent:"#3b82f6", accentBg:"rgba(59,130,246,0.15)",
    success:"#3fb950", warning:"#e3b341", danger:"#f85149",
    grad:"linear-gradient(135deg,#1d4ed8,#7c3aed)",
    treeCanvas:"radial-gradient(ellipse at center,#0f1f3d 0%,#0d1117 70%)",
    shadow:"0 20px 60px rgba(0,0,0,0.5)",
    cardHover:"rgba(255,255,255,0.03)",
  },
  light: {
    bg:"#f6f8fa", bg2:"#ffffff", bg3:"#f0f2f5", bg4:"#e8ebef",
    text:"#1f2328", text2:"#57606a", text3:"#8c959f",
    border:"#d0d7de", border2:"#e8ebef",
    input:"#ffffff", accent:"#0969da", accentBg:"rgba(9,105,218,0.08)",
    success:"#1a7f37", warning:"#9a6700", danger:"#cf222e",
    grad:"linear-gradient(135deg,#0969da,#8250df)",
    treeCanvas:"radial-gradient(ellipse at center,#dbeafe 0%,#f6f8fa 70%)",
    shadow:"0 8px 32px rgba(0,0,0,0.12)",
    cardHover:"rgba(0,0,0,0.02)",
  }
};

const SAMPLE_PERSONS = {
  root:{id:"root",name:"శ్రీ పద్మరాజు",nameEn:"Sri Padmaraju",education:"",photo:null,birth:"1920",death:"1995",occupation:"Zamindar",notes:"",spouseId:"sw"},
  sw:{id:"sw",name:"సావిత్రమ్మ",nameEn:"Savithramma",education:"",photo:null,birth:"1925",death:"2001",occupation:"",notes:"",spouseId:"root"},
  p1:{id:"p1",name:"నరసరాజు",nameEn:"Narasaraju",education:"",photo:null,birth:"1945",death:null,occupation:"",notes:"",spouseId:null},
  p2:{id:"p2",name:"భాస్కరరాజు",nameEn:"Bhaskarraju",education:"B.com",photo:null,birth:"1972",death:null,occupation:"Business",notes:"",spouseId:null},
  p3:{id:"p3",name:"సీతారామరాజు",nameEn:"Seetharamaraju",education:"B.Tech",photo:null,birth:"1975",death:null,occupation:"Engineer",notes:"",spouseId:null},
};
const SAMPLE_ROOT = {id:"root",children:[{id:"p1",children:[{id:"p2",children:[]},{id:"p3",children:[]}]}]};
const SAMPLE_TREE = {id:"demo",name:"కొత్రపల్లి_రాజు_001",nameEn:"Kotrapalli_Raju_001",visibility:"private",members:5,admins:["You"],viewers:[],persons:SAMPLE_PERSONS,rootNode:SAMPLE_ROOT,createdAt:"2024-01-15"};

// ── Auto-translate debounce ───────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return dv;
}

// ── Person Node ───────────────────────────────────────────
function PersonNode({person, selected, onSel, onAdd, depth, T}) {
  if (!person) return null;
  const color = GEN_COLORS[depth % GEN_COLORS.length];
  const initials = (person.nameEn||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const years = [person.birth, person.death ? person.death : (person.birth ? "Present" : null)].filter(Boolean).join(" – ");
  return (
    <div className="pnode" onClick={()=>onSel(person.id)}>
      <div className="pnode-ring" style={{borderColor:selected?"#fff":color, boxShadow:selected?`0 0 0 3px ${color}`:`0 0 0 2px ${color}44`, background:T.bg3}}>
        {person.photo
          ? <img src={person.photo} alt="" className="pnode-img"/>
          : <div className="pnode-ini" style={{background:`${color}22`,color}}>{initials}</div>
        }
        <button className="pnode-add" onClick={e=>{e.stopPropagation();onAdd(person.id);}} style={{background:color}}>+</button>
      </div>
      <div className="pnode-name" style={{color:T.text}}>{person.name}</div>
      <div className="pnode-en"   style={{color:T.text2}}>{person.nameEn}</div>
      {years && <div className="pnode-yr" style={{color:T.text3}}>{years}</div>}
      {person.education && <div className="pnode-edu" style={{color}}>{person.education}</div>}
    </div>
  );
}

// ── Family Tree Node ──────────────────────────────────────
function FTNode({node, persons, selId, onSel, onAdd, depth=0, T}) {
  const [col, setCol] = useState(depth >= 3);
  const person = persons[node.id]; if (!person) return null;
  const spouse = person.spouseId ? persons[person.spouseId] : null;
  const kids = (node.children||[]).filter(c => c.id !== person.spouseId && c.id !== spouse?.id);
  const hk = kids.length > 0;
  const lineColor = GEN_COLORS[depth % GEN_COLORS.length] + "66";
  return (
    <div className="ftn">
      <div className="ftn-row">
        <PersonNode person={person} selected={selId===node.id} onSel={onSel} onAdd={onAdd} depth={depth} T={T}/>
        {spouse && <>
          <div className="heart-line">
            <div className="heart-dash" style={{background:"#ff6b8a55"}}/>
            <span className="heart-ico">❤</span>
            <div className="heart-dash" style={{background:"#ff6b8a55"}}/>
          </div>
          <PersonNode person={spouse} selected={selId===spouse.id} onSel={onSel} onAdd={onAdd} depth={depth} T={T}/>
        </>}
      </div>
      {hk && !col && (
        <>
          <div className="ftvl" style={{background:lineColor}}/>
          <div className="fthr">
            {kids.map((c,i)=>(
              <div key={c.id} className={`ftcc ${i===0?"ftcf":""} ${i===kids.length-1?"ftcl":""} ${kids.length===1?"ftco":""}`}
                style={{"--lc":GEN_COLORS[(depth+1)%GEN_COLORS.length]+"66"}}>
                <div className="ftvs" style={{background:GEN_COLORS[(depth+1)%GEN_COLORS.length]+"66"}}/>
                <FTNode node={c} persons={persons} selId={selId} onSel={onSel} onAdd={onAdd} depth={depth+1} T={T}/>
              </div>
            ))}
          </div>
        </>
      )}
      {hk && <button className="ftn-toggle" onClick={e=>{e.stopPropagation();setCol(v=>!v);}} style={{borderColor:GEN_COLORS[depth%GEN_COLORS.length],color:GEN_COLORS[depth%GEN_COLORS.length],background:T.bg2}}>{col?`▼ ${kids.length}`:"▲"}</button>}
    </div>
  );
}

// ── Person Panel ──────────────────────────────────────────
function PersonPanel({pid, persons, onClose, onSave, onAddRel, T}) {
  const [form, setForm] = useState({...persons[pid]});
  const [translating, setTrans] = useState(false);
  const [autoTranslated, setAT] = useState(false);
  const fileRef = useRef();
  const debouncedEn = useDebounce(form.nameEn, 900);

  useEffect(()=>setForm({...persons[pid]}),[pid,persons]);

  // Auto-translate English → Telugu
  useEffect(()=>{
    if (!debouncedEn || debouncedEn.length < 2) return;
    setTrans(true);
    api("POST","/api/ai/translate",{text:debouncedEn}).then(d=>{
      if (d.translation) { setForm(f=>({...f,name:d.translation})); setAT(true); setTimeout(()=>setAT(false),2500); }
    }).catch(()=>{}).finally(()=>setTrans(false));
  },[debouncedEn]);

  if (!persons[pid]) return null;
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const onPhoto = e => { const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,photo:ev.target.result})); r.readAsDataURL(f); };
  const color = GEN_COLORS[0];

  return (
    <div className="pp" style={{background:T.bg2,borderLeft:`1px solid ${T.border}`}}>
      <div className="pph" style={{borderBottom:`1px solid ${T.border}`}}>
        <div className="ppaw" onClick={()=>fileRef.current.click()} style={{cursor:"pointer"}}>
          {form.photo ? <img src={form.photo} className="ppai" alt=""/> : <div className="ppap" style={{background:`${color}22`,borderColor:color,color}}>{(form.nameEn||"?")[0]}</div>}
          <div className="ppcam" style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text2}}><i className="ti ti-camera" style={{fontSize:11}}/></div>
          <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onPhoto}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.name}</div>
          <div style={{fontSize:10,color:T.text2}}>{form.nameEn}</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:16}}>✕</button>
      </div>

      <div className="ppb">
        {/* English Name → auto-translates Telugu */}
        <div className="fg">
          <label style={{color:T.text3}}>English Name {translating && <span style={{color:color,fontSize:9}}>✨ translating…</span>}{autoTranslated && <span style={{color:T.success,fontSize:9}}>✓ auto-translated</span>}</label>
          <input value={form.nameEn||""} onChange={upd("nameEn")} placeholder="Type English name" style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
        </div>
        <div className="fg">
          <label style={{color:T.text3}}>Telugu Name / తెలుగు పేరు</label>
          <input value={form.name||""} onChange={upd("name")} placeholder="తెలుగు పేరు (auto-fills)" style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div className="fg">
            <label style={{color:T.text3}}>Birth Year</label>
            <input value={form.birth||""} onChange={upd("birth")} placeholder="e.g. 1950" style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
          </div>
          <div className="fg">
            <label style={{color:T.text3}}>Death Year</label>
            <input value={form.death||""} onChange={upd("death")} placeholder="blank = living" style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
          </div>
        </div>
        <div className="fg">
          <label style={{color:T.text3}}>Gender</label>
          <select value={form.gender||"male"} onChange={upd("gender")} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}>
            <option value="male">Male / పురుషుడు</option>
            <option value="female">Female / స్త్రీ</option>
          </select>
        </div>
        {[["education","Education","e.g. B.Tech, M.A."],["occupation","Occupation","Job or profession"],["notes","Notes","Additional info"]].map(([k,lbl,ph])=>(
          <div className="fg" key={k}>
            <label style={{color:T.text3}}>{lbl}</label>
            {k==="notes"
              ? <textarea value={form[k]||""} onChange={upd(k)} placeholder={ph} rows={2} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,resize:"vertical"}}/>
              : <input value={form[k]||""} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
            }
          </div>
        ))}
      </div>

      <div className="ppf" style={{borderTop:`1px solid ${T.border}`}}>
        <button onClick={()=>onAddRel(pid)} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"6px 13px",borderRadius:8,cursor:"pointer",fontSize:12,display:"inline-flex",alignItems:"center",gap:3}}>
          <i className="ti ti-users-plus" style={{fontSize:12}}/>Relation
        </button>
        <button onClick={()=>onSave(form)} style={{background:T.grad,border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}>
          <i className="ti ti-device-floppy" style={{fontSize:12}}/>Save
        </button>
      </div>
    </div>
  );
}

// ── Claude Upload Window ──────────────────────────────────
function ClaudeUpload({onClose, onBuildTree, T}) {
  const [file, setFile]     = useState(null);
  const [preview, setPrev]  = useState(null);
  const [isPdf, setIsPdf]   = useState(false);
  const [status, setStatus] = useState("");
  const [processing, setProc] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleFile = f => {
    setFile(f); setResult(null); setStatus("");
    setIsPdf(f.type === "application/pdf");
    const r = new FileReader();
    r.onload = ev => setPrev(ev.target.result);
    r.readAsDataURL(f);
  };

  const onDrop = e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) handleFile(f); };

  const extract = async () => {
    if (!file) return;
    setProc(true); setStatus("Reading your document…");
    try {
      const b64 = preview.split(",")[1];
      setStatus("AI is analyzing the family tree…");
      const data = await api("POST","/api/ai/extract",{ imageBase64:b64, mediaType:file.type });
      if (data.persons?.length > 0) {
        setStatus(`✓ Found ${data.persons.length} family members!`);
        setResult(data);
      } else { setStatus("Could not extract. Try a clearer image."); }
    } catch(e) { setStatus("Error: " + e.message); }
    setProc(false);
  };

  const buildTree = () => { if (result) { onBuildTree(result); onClose(); } };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:T.shadow}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#06b6d4)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-photo-ai" style={{fontSize:18,color:"#fff"}}/>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>AI Tree Builder</div>
            <div style={{fontSize:11,color:T.text2}}>Upload image or PDF — AI builds the tree automatically</div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:18}}>✕</button>
        </div>

        {/* Body */}
        <div style={{padding:16,overflow:"auto",flex:1}}>
          {!file ? (
            <div onDragOver={e=>e.preventDefault()} onDrop={onDrop} onClick={()=>fileRef.current.click()}
              style={{border:`2px dashed ${T.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              <i className="ti ti-cloud-upload" style={{fontSize:48,color:T.text3,display:"block",marginBottom:12}}/>
              <div style={{fontWeight:600,fontSize:15,color:T.text,marginBottom:6}}>Drop your genealogy document here</div>
              <div style={{fontSize:12,color:T.text2,marginBottom:4}}>or click to browse</div>
              <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12}}>
                {[["ti-photo","Image","JPG, PNG, WEBP","#3b82f6"],["ti-file-type-pdf","PDF","Family records","#ef4444"]].map(([ic,t,d,c])=>(
                  <div key={t} style={{background:`${c}15`,border:`1px solid ${c}44`,borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
                    <i className={`ti ${ic}`} style={{fontSize:20,color:c,display:"block",marginBottom:4}}/>
                    <div style={{fontSize:12,fontWeight:600,color:T.text}}>{t}</div>
                    <div style={{fontSize:10,color:T.text2}}>{d}</div>
                  </div>
                ))}
              </div>
              <input type="file" accept="image/*,application/pdf" ref={fileRef} style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
            </div>
          ) : (
            <div>
              {/* File preview */}
              <div style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:10,padding:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <i className={`ti ${isPdf?"ti-file-type-pdf":"ti-photo"}`} style={{fontSize:24,color:isPdf?"#ef4444":"#3b82f6"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                  <div style={{fontSize:10,color:T.text2}}>{(file.size/1024).toFixed(0)} KB · {isPdf?"PDF Document":"Image"}</div>
                </div>
                <button onClick={()=>{setFile(null);setPrev(null);setResult(null);setStatus("");}} style={{background:"none",border:"none",cursor:"pointer",color:T.text2}}>✕</button>
              </div>

              {!isPdf && preview && <img src={preview} alt="" style={{width:"100%",maxHeight:180,objectFit:"contain",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:14}}/>}

              {/* Status */}
              {status && (
                <div style={{padding:"10px 12px",borderRadius:8,background:status.startsWith("✓")?`${T.success}22`:status.startsWith("Error")?`${T.danger}22`:T.accentBg,border:`1px solid ${status.startsWith("✓")?T.success:status.startsWith("Error")?T.danger:T.accent}`,color:status.startsWith("✓")?T.success:status.startsWith("Error")?T.danger:T.accent,fontSize:12,fontWeight:processing?500:400,marginBottom:12}}>
                  {processing && <span style={{marginRight:6}}>⏳</span>}{status}
                </div>
              )}

              {/* Result preview */}
              {result && (
                <div style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:10,padding:12,maxHeight:200,overflow:"auto",marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text2,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Extracted Members</div>
                  {result.persons.map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.border2}`}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.accent,flexShrink:0}}>{(p.nameEn||"?")[0]}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500,color:T.text}}>{p.name} <span style={{color:T.text2}}>({p.nameEn})</span></div>
                        {p.education && <div style={{fontSize:10,color:T.accent}}>{p.education}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={()=>{setFile(null);setPrev(null);setResult(null);setStatus("");}} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12}}>{file?"Change File":"Cancel"}</button>
          {file && !result && <button disabled={processing} onClick={extract} style={{background:T.grad,border:"none",color:"#fff",padding:"7px 16px",borderRadius:8,cursor:processing?"wait":"pointer",fontSize:12,fontWeight:600,opacity:processing?0.7:1}}>{processing?"Extracting…":"Extract Family Tree"}</button>}
          {result && <button onClick={buildTree} style={{background:T.grad,border:"none",color:"#fff",padding:"7px 16px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>🌳 Build Tree ({result.persons.length} members)</button>}
        </div>
      </div>
    </div>
  );
}

// ── Add Relation Modal ────────────────────────────────────
function AddRelModal({pid, persons, onClose, onAdd, T}) {
  const [rel,setRel]   = useState("Son");
  const [mode,setMode] = useState("new");
  const [nameEn,setNameEn] = useState("");
  const [name,setName]     = useState("");
  const [edu,setEdu]       = useState("");
  const [exId,setExId]     = useState("");
  const [translating,setTr]= useState(false);
  const debouncedEn = useDebounce(nameEn, 900);

  useEffect(()=>{
    if (!debouncedEn || debouncedEn.length < 2) return;
    setTr(true);
    api("POST","/api/ai/translate",{text:debouncedEn}).then(d=>{ if(d.translation) setName(d.translation); }).catch(()=>{}).finally(()=>setTr(false));
  },[debouncedEn]);

  const inp = (val,set,ph,label,extra) => (
    <div className="fg" key={label}>
      <label style={{color:T.text3}}>{label}{extra}</label>
      <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}/>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:14,backdropFilter:"blur(4px)"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",maxHeight:"90vh",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:600,color:T.text}}>
          Add Relation · {persons[pid]?.nameEn}
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:16}}>✕</button>
        </div>
        <div style={{padding:16,overflow:"auto",flex:1}}>
          <div className="fg">
            <label style={{color:T.text3}}>Relation Type</label>
            <select value={rel} onChange={e=>setRel(e.target.value)} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}>
              {REL_TYPES.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["new","existing"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{padding:"6px 14px",fontSize:12,fontWeight:600,background:mode===m?T.grad:"transparent",border:`1px solid ${mode===m?"transparent":T.border}`,color:mode===m?"#fff":T.text2,borderRadius:8,cursor:"pointer"}}>
                {m==="new"?"New Person":"Existing Member"}
              </button>
            ))}
          </div>
          {mode==="new" ? <>
            {inp(nameEn,setNameEn,"Type English name","English Name",translating?<span style={{color:T.accent,fontSize:9,marginLeft:4}}>✨ translating…</span>:null)}
            {inp(name,setName,"తెలుగు పేరు (auto-fills)","Telugu Name / తెలుగు పేరు")}
            {inp(edu,setEdu,"e.g. B.Tech","Education")}
          </> : (
            <div className="fg">
              <label style={{color:T.text3}}>Select Person</label>
              <select value={exId} onChange={e=>setExId(e.target.value)} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text}}>
                <option value="">-- Select --</option>
                {Object.values(persons).filter(x=>x.id!==pid).map(x=><option key={x.id} value={x.id}>{x.nameEn} ({x.name})</option>)}
              </select>
            </div>
          )}
          {SPOUSE_TYPES.includes(rel) && <div style={{background:T.accentBg,border:`1px solid ${T.accent}55`,borderRadius:8,padding:"8px 10px",fontSize:11,color:T.accent}}>❤ Will be shown as spouse connection in the tree</div>}
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
          <button onClick={()=>onAdd({rel,mode,pid,name,nameEn,edu,exId})} style={{background:T.grad,border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Add Relation</button>
        </div>
      </div>
    </div>
  );
}

// ── New Tree Modal (Village_Surname_TreeNo format) ────────
function NewTreeModal({onClose, onCreate, T}) {
  const [village,setVillage] = useState("");
  const [surname,setSurname] = useState("");
  const [treeNo,setTreeNo]   = useState("1");
  const [vis,setVis]         = useState("private");
  const [loading,setLoad]    = useState(false);

  const treeName   = [village,surname,treeNo].filter(Boolean).join("_");
  const teluguName = treeName; // Will auto-translate after creation

  const submit = async () => {
    if (!village||!surname||!treeNo) return;
    setLoad(true);
    const nameEn = treeName;
    let name = treeName;
    // Try to get Telugu name from AI
    try { const d=await api("POST","/api/ai/translate",{text:`${village} ${surname} family tree`}); if(d.translation) name=d.translation; } catch {}
    try {
      const t = await api("POST","/api/trees",{name,nameEn,visibility:vis});
      onCreate({...t, persons:{}, rootNode:null, members:0, admins:["You"], viewers:[]});
    } catch {
      onCreate({id:"t"+Date.now(),name,nameEn,visibility:vis,members:0,admins:["You"],viewers:[],persons:{},rootNode:null,createdAt:new Date().toISOString().slice(0,10)});
    }
    setLoad(false);
  };

  const Field = ({label,val,set,ph,hint}) => (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
      <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",fontSize:13,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"8px 10px"}}/>
      {hint && <div style={{fontSize:10,color:T.text3,marginTop:3}}>{hint}</div>}
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:14,backdropFilter:"blur(4px)"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,width:"100%",maxWidth:440,overflow:"hidden",boxShadow:T.shadow}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.text,fontSize:15}}>
          New Family Tree / నూతన వంశవృక్షం
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:18}}>✕</button>
        </div>
        <div style={{padding:18}}>
          <div style={{background:T.accentBg,border:`1px solid ${T.accent}44`,borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:11,color:T.accent}}>
            <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>
            Tree name format: <strong>VillageName_Surname_TreeNumber</strong>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><Field label="Village Name" val={village} set={setVillage} ph="e.g. Kotrapalli" hint="పల్లె పేరు"/></div>
            <div><Field label="Surname / ఇంటి పేరు" val={surname} set={setSurname} ph="e.g. Raju" hint="Family surname"/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
            <div><Field label="Tree No" val={treeNo} set={setTreeNo} ph="1" hint="Branch number"/></div>
            <div>
              <label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Generated Name</label>
              <div style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,fontWeight:700,color:T.accent,fontFamily:"monospace"}}>{treeName||"Village_Surname_1"}</div>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Visibility</label>
            <div style={{display:"flex",gap:8}}>
              {[["private","ti-lock","Private"],["public","ti-world","Public"]].map(([v,ic,lbl])=>(
                <div key={v} onClick={()=>setVis(v)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:`1px solid ${vis===v?T.accent:T.border}`,borderRadius:8,cursor:"pointer",background:vis===v?T.accentBg:"transparent"}}>
                  <i className={`ti ${ic}`} style={{fontSize:16,color:vis===v?T.accent:T.text3}}/>
                  <span style={{fontSize:12,fontWeight:500,color:vis===v?T.accent:T.text2}}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"7px 16px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
          <button disabled={!village||!surname||!treeNo||loading} onClick={submit} style={{background:(!village||!surname||!treeNo)?T.bg3:T.grad,border:"none",color:(!village||!surname||!treeNo)?T.text3:"#fff",padding:"7px 16px",borderRadius:8,cursor:(!village||!surname||!treeNo)?"not-allowed":"pointer",fontSize:12,fontWeight:600}}>
            {loading?"Creating…":"Create Tree"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Chat ───────────────────────────────────────────────
function AIChat({tree, onClose, T}) {
  const [msgs,setMsgs] = useState([{role:"assistant",text:"నమస్కారం! 🙏 I am your Family Tree AI.\n\nAsk me:\n• \"Who has a B.Tech degree?\"\n• \"How many generations?\"\n• \"List all members\"\n• \"Translate any name\""}]);
  const [inp,setInp]   = useState("");
  const [load,setLoad] = useState(false);
  const endRef = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);
  const send = async () => {
    if (!inp.trim()||load) return;
    const txt=inp; setInp(""); setLoad(true);
    setMsgs(m=>[...m,{role:"user",text:txt}]);
    try {
      const data = await api("POST","/api/ai/chat",{messages:[...msgs.slice(1),{role:"user",content:txt}].map(m=>({role:m.role,content:m.text||m.content})),treeContext:{name:tree.nameEn,persons:Object.values(tree.persons)}});
      setMsgs(m=>[...m,{role:"assistant",text:data.reply}]);
    } catch(e) { setMsgs(m=>[...m,{role:"assistant",text:"Error: "+e.message}]); }
    setLoad(false);
  };
  return (
    <div style={{position:"fixed",bottom:80,right:16,width:300,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,display:"flex",flexDirection:"column",zIndex:1000,maxHeight:440,boxShadow:T.shadow}}>
      <div style={{display:"flex",alignItems:"center",gap:7,padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
        <i className="ti ti-sparkles" style={{fontSize:14,color:T.accent}}/><span style={{fontWeight:600,fontSize:12,color:T.text}}>AI సహాయకుడు</span>
        <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:15}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8,minHeight:170,maxHeight:290}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{padding:"7px 10px",borderRadius:10,fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",maxWidth:"88%",background:m.role==="user"?T.accentBg:T.bg3,color:m.role==="user"?T.accent:T.text,border:`1px solid ${m.role==="user"?T.accent+"44":T.border}`}}>{m.text}</div>
          </div>
        ))}
        {load && <div style={{display:"flex"}}><div style={{padding:"7px 10px",borderRadius:10,fontSize:18,letterSpacing:2,color:T.text3,background:T.bg3,border:`1px solid ${T.border}`}}>●●●</div></div>}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:7,padding:"9px 11px",borderTop:`1px solid ${T.border}`}}>
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your family tree…" style={{flex:1,fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/>
        <button onClick={send} disabled={load} style={{background:T.grad,border:"none",color:"#fff",padding:"5px 10px",borderRadius:8,cursor:"pointer"}}><i className="ti ti-send" style={{fontSize:12}}/></button>
      </div>
    </div>
  );
}

// ── Permissions Modal ─────────────────────────────────────
function PermModal({tree, onClose, onSave, T}) {
  const [vis,setVis]=useState(tree.visibility); const [inv,setInv]=useState(""); const [viewers,setV]=useState([...(tree.viewers||[])]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:14,backdropFilter:"blur(4px)"}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,width:"100%",maxWidth:420,overflow:"hidden",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:600,color:T.text}}>
          Permissions / అనుమతులు<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:16}}>✕</button>
        </div>
        <div style={{padding:16,overflow:"auto",flex:1}}>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["private","ti-lock","Private","Invited only"],["public","ti-world","Public","Anyone with link"]].map(([v,ic,lbl,desc])=>(
              <div key={v} onClick={()=>setVis(v)} style={{flex:1,display:"flex",alignItems:"center",gap:9,padding:"10px 12px",border:`1px solid ${vis===v?T.accent:T.border}`,borderRadius:8,cursor:"pointer",background:vis===v?T.accentBg:"transparent"}}>
                <i className={`ti ${ic}`} style={{fontSize:18,color:vis===v?T.accent:T.text3}}/>
                <div><div style={{fontWeight:500,fontSize:12,color:T.text}}>{lbl}</div><div style={{fontSize:10,color:T.text2}}>{desc}</div></div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:T.text2}}>Admins</div>
          {(tree.admins||[]).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",color:T.text2}}><i className="ti ti-crown" style={{fontSize:10,color:T.warning}}/>{a}</div>)}
          <div style={{fontSize:12,fontWeight:600,margin:"10px 0 6px",color:T.text2}}>Viewers</div>
          {viewers.length===0?<div style={{fontSize:11,color:T.text3}}>None yet</div>:viewers.map(v=><div key={v} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",color:T.text2}}><i className="ti ti-eye" style={{fontSize:10}}/>{v}<button onClick={()=>setV(vv=>vv.filter(x=>x!==v))} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:T.danger,fontSize:11}}>✕</button></div>)}
          <div style={{marginTop:10}}>
            <label style={{fontSize:10,color:T.text3}}>Invite by email</label>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <input value={inv} onChange={e=>setInv(e.target.value)} placeholder="email@example.com" style={{flex:1,fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/>
              <button onClick={()=>{if(inv.trim()){setV(v=>[...v,inv.trim()]);setInv("");}}} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>Invite</button>
            </div>
          </div>
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
          <button onClick={()=>onSave({visibility:vis,admins:tree.admins,viewers})} style={{background:T.grad,border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Auth Page ─────────────────────────────────────────────
function AuthPage({onLogin, T}) {
  const [mode,setMode]=useState("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState("");
  const [error,setError]=useState(""); const [load,setLoad]=useState(false);
  const submit = async () => {
    if (!email||!pass) return setError("Email and password required");
    if (mode==="register"&&!name) return setError("Name required");
    setLoad(true); setError("");
    try {
      const data = await api("POST", mode==="login"?"/api/auth/login":"/api/auth/register", mode==="login"?{email,password:pass}:{name,email,password:pass});
      localStorage.setItem("ft_token",data.token); localStorage.setItem("ft_user",JSON.stringify(data.user));
      onLogin(data.user);
    } catch(e) { setError(e.message); }
    setLoad(false);
  };
  return (
    <div style={{minHeight:"100vh",background:T.treeCanvas,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:20,padding:"36px 28px",width:"100%",maxWidth:380,boxShadow:T.shadow}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:20,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:`0 8px 24px ${T.accent}44`}}>
            <i className="ti ti-binary-tree-2" style={{fontSize:30,color:"#fff"}}/>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:0.5}}>వంశవృక్షం</div>
          <div style={{fontSize:12,color:T.text2,marginTop:4}}>Telugu Family Tree Builder</div>
        </div>
        <div style={{display:"flex",background:T.bg3,borderRadius:10,marginBottom:20,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"8px",fontSize:12,fontWeight:700,background:mode===m?T.grad:"transparent",color:mode===m?"#fff":T.text2,border:"none",cursor:"pointer",borderRadius:8,transition:"all 0.2s"}}>
              {m==="login"?"Login":"Register"}
            </button>
          ))}
        </div>
        {mode==="register" && <div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"9px 11px",fontSize:13}}/></div>}
        <div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&submit()} style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"9px 11px",fontSize:13}}/></div>
        <div style={{marginBottom:16}}><label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Password</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} style={{width:"100%",background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"9px 11px",fontSize:13}}/></div>
        {error && <div style={{background:`${T.danger}22`,border:`1px solid ${T.danger}`,color:T.danger,fontSize:12,padding:"9px 11px",borderRadius:8,marginBottom:12,wordBreak:"break-word"}}>{error}</div>}
        <button onClick={submit} disabled={load} style={{width:"100%",padding:"12px",fontSize:14,fontWeight:700,background:load?T.bg3:T.grad,color:load?T.text3:"#fff",border:"none",borderRadius:10,cursor:load?"not-allowed":"pointer",marginBottom:14,boxShadow:load?"none":`0 4px 16px ${T.accent}44`}}>
          {load?"Please wait…":mode==="login"?"Login →":"Create Account →"}
        </button>
        <div style={{textAlign:"center",fontSize:12,color:T.text2}}>
          {mode==="login"?<>No account? <span style={{color:T.accent,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("register");setError("");}}>Register free</span></>:<>Have account? <span style={{color:T.accent,cursor:"pointer",fontWeight:600}} onClick={()=>{setMode("login");setError("");}}>Login</span></>}
        </div>
        <div style={{marginTop:14,background:T.bg3,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 11px",fontSize:11,color:T.text2,display:"flex",alignItems:"center",gap:6}}>
          <i className="ti ti-info-circle" style={{fontSize:13,color:T.accent}}/>{mode==="register"?"First account becomes SuperAdmin":"Enter your credentials to continue"}
        </div>
        {!BASE && <div style={{marginTop:8,background:`${T.danger}22`,border:`1px solid ${T.danger}`,borderRadius:8,padding:"8px 11px",fontSize:11,color:T.danger}}>⚠️ VITE_API_URL not set in Railway frontend variables</div>}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard({trees, onOpen, onNew, user, T}) {
  return (
    <div style={{padding:24,maxWidth:960,margin:"0 auto",width:"100%",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div><div style={{fontSize:22,fontWeight:800,color:T.text}}>నా వంశవృక్షాలు</div><div style={{fontSize:13,color:T.text2,marginTop:3}}>Welcome back, {user?.name}</div></div>
        <button onClick={onNew} style={{background:T.grad,border:"none",color:"#fff",padding:"8px 16px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}>
          <i className="ti ti-plus" style={{fontSize:14}}/>New Tree
        </button>
      </div>
      {trees.length===0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,border:`1px solid ${T.border}`}}><i className="ti ti-binary-tree" style={{fontSize:40,color:T.border}}/></div>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>No family trees yet</div>
          <div style={{fontSize:13,color:T.text2,marginBottom:20}}>Create your first family tree to get started</div>
          <button onClick={onNew} style={{background:T.grad,border:"none",color:"#fff",padding:"9px 18px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}><i className="ti ti-plus" style={{fontSize:13}}/>Create First Tree</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,marginBottom:24}}>
          {trees.map((t,i)=>(
            <div key={t.id} onClick={()=>onOpen(t)}
              style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:18,cursor:"pointer",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=GEN_COLORS[i%GEN_COLORS.length];e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=T.shadow;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{width:46,height:46,borderRadius:12,background:`${GEN_COLORS[i%GEN_COLORS.length]}22`,border:`2px solid ${GEN_COLORS[i%GEN_COLORS.length]}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                <i className="ti ti-binary-tree" style={{fontSize:22,color:GEN_COLORS[i%GEN_COLORS.length]}}/>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:T.text,fontFamily:"monospace"}}>{t.nameEn}</div>
              <div style={{fontSize:11,color:T.text2,marginTop:3}}>{t.name}</div>
              <div style={{display:"flex",gap:10,marginTop:10,fontSize:10,color:T.text3}}>
                <span><i className="ti ti-users" style={{fontSize:10,marginRight:2}}/>{t.members||t._count?.persons||0}</span>
                <span><i className={`ti ti-${t.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{t.visibility}</span>
              </div>
            </div>
          ))}
          <div onClick={onNew} style={{background:T.bg,border:`2px dashed ${T.border}`,borderRadius:14,padding:18,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:140,transition:"border-color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
            <i className="ti ti-plus" style={{fontSize:28,color:T.border,marginBottom:8}}/>
            <div style={{fontSize:13,color:T.text3,fontWeight:600}}>New Tree</div>
          </div>
        </div>
      )}
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:16}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Platform Features</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
          {[["ti-language","#3b82f6","Bilingual","Telugu & English"],["ti-photo-ai","#7c3aed","AI Upload","Image & PDF"],["ti-heart","#ec4899","Spouse","Heart connector"],["ti-lock","#8b5cf6","Private","Access control"],["ti-sparkles","#06b6d4","AI Chat","Smart assistant"],["ti-sun","#f59e0b","Themes","Light & Dark"]].map(([ic,col,t,d])=>(
            <div key={t} style={{background:T.bg3,borderRadius:10,padding:10,textAlign:"center"}}>
              <i className={`ti ${ic}`} style={{fontSize:18,color:col,display:"block",marginBottom:5}}/><div style={{fontWeight:700,fontSize:11,color:T.text}}>{t}</div><div style={{fontSize:10,color:T.text2,marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tree Editor ───────────────────────────────────────────
function TreeEditor({tree, setTree, onBack, T}) {
  const [selP,setSelP]           = useState(null);
  const [showAI,setShowAI]       = useState(false);
  const [showRel,setShowRel]     = useState(false);
  const [relFor,setRelFor]       = useState(null);
  const [showPerm,setShowPerm]   = useState(false);
  const [showUpload,setShowUpload] = useState(false);

  const savePerson = p => setTree(t=>({...t,persons:{...t.persons,[p.id]:p}}));

  const addRel = ({rel,mode,pid,name,nameEn,edu,exId}) => {
    if (mode==="new"&&!nameEn.trim()) return;
    if (mode==="existing"&&!exId) return;
    const isSpouse = SPOUSE_TYPES.includes(rel);
    setTree(t => {
      const nid = "px"+Date.now();
      const np = mode==="new" ? {...t.persons,[nid]:{id:nid,name,nameEn,education:edu,photo:null,birth:"",death:null,occupation:"",notes:"",spouseId:isSpouse?pid:null,gender:["Wife","Ex-wife"].includes(rel)?"female":"male"}} : t.persons;
      const tid = mode==="new" ? nid : exId;
      if (isSpouse) {
        return {...t, persons:{...np,[pid]:{...(np[pid]||t.persons[pid]),spouseId:tid},[tid]:{...(np[tid]||t.persons[tid]||{}),spouseId:pid}}, members:t.members+(mode==="new"?1:0)};
      }
      const addChild = n => n.id===pid ? {...n,children:[...(n.children||[]),{id:tid,children:[]}]} : n.children ? {...n,children:n.children.map(addChild)} : n;
      return {...t, persons:np, rootNode:t.rootNode?addChild(t.rootNode):{id:tid,children:[]}, members:t.members+(mode==="new"?1:0)};
    });
    setShowRel(false);
  };

  const buildFromExtract = (extracted) => {
    const persons = {};
    (extracted.persons||[]).forEach(p => { persons[p.id]={id:p.id,name:p.name||"",nameEn:p.nameEn||p.name||"",education:p.education||"",photo:null,birth:p.birth||"",death:p.death||null,occupation:"",notes:"",spouseId:null}; });
    const cm = {};
    (extracted.relationships||[]).forEach(r=>{ if(!cm[r.parentId])cm[r.parentId]=[]; cm[r.parentId].push(r.childId); });
    const allC = new Set((extracted.relationships||[]).map(r=>r.childId));
    const rootId = (extracted.persons||[]).find(p=>!allC.has(p.id))?.id || (extracted.persons||[])[0]?.id;
    const buildN = (id, vis=new Set()) => { if(vis.has(id))return{id,children:[]}; vis.add(id); return{id,children:(cm[id]||[]).map(c=>buildN(c,new Set(vis)))}; };
    setTree(t=>({...t, persons, rootNode:rootId?buildN(rootId):{id:"root",children:[]}, members:(extracted.persons||[]).length}));
  };

  const hasPersons = tree.rootNode && tree.persons && tree.persons[tree.rootNode?.id];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",height:"100%"}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:T.bg2,borderBottom:`1px solid ${T.border}`,flexWrap:"wrap",flexShrink:0}}>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}>
          <i className="ti ti-chevron-left" style={{fontSize:10}}/>Trees
        </button>
        <span style={{fontSize:12,color:T.text,fontWeight:600,fontFamily:"monospace"}}>{tree.nameEn}</span>
        <span style={{fontSize:10,color:T.text3}}>· {tree.members||0} members</span>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>setShowUpload(true)} style={{background:`${T.accent}22`,border:`1px solid ${T.accent}55`,color:T.accent,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}>
            <i className="ti ti-photo-ai" style={{fontSize:11}}/>AI Upload
          </button>
          <button onClick={()=>setShowPerm(true)} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}>
            <i className={`ti ti-${tree.visibility==="private"?"lock":"world"}`} style={{fontSize:10}}/>{tree.visibility}
          </button>
          <button onClick={()=>{
            if (!hasPersons) {
              const en=window.prompt("English name of first person:")||"Person";
              const nm=window.prompt("Telugu name:")||en;
              setTree(t=>({...t,persons:{...t.persons,root:{id:"root",name:nm,nameEn:en,education:"",photo:null,birth:"",death:null,occupation:"",notes:"",spouseId:null}},rootNode:{id:"root",children:[]},members:1}));
            } else { setRelFor(tree.rootNode.id); setShowRel(true); }
          }} style={{background:T.grad,border:"none",color:"#fff",padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}>
            <i className="ti ti-user-plus" style={{fontSize:11}}/>{hasPersons?"Add Person":"Add First Person"}
          </button>
        </div>
      </div>

      {/* Canvas + Panel */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{flex:1,overflow:"auto",padding:"32px 32px 80px",display:"flex",justifyContent:"center",alignItems:"flex-start",background:T.treeCanvas}}>
          {hasPersons ? (
            <div style={{overflow:"visible",minWidth:"max-content"}}>
              <FTNode node={tree.rootNode} persons={tree.persons} selId={selP} onSel={setSelP} onAdd={id=>{setRelFor(id);setShowRel(true);}} T={T}/>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}>
              <i className="ti ti-binary-tree" style={{fontSize:60,color:T.border,display:"block",marginBottom:16}}/>
              <div style={{fontSize:15,fontWeight:700,color:T.text2,marginBottom:8}}>Empty Tree</div>
              <div style={{fontSize:12,color:T.text3,marginBottom:16}}>Click "Add First Person" or use "AI Upload" to build from an image</div>
            </div>
          )}
        </div>
        {selP && <PersonPanel pid={selP} persons={tree.persons} onClose={()=>setSelP(null)} onSave={savePerson} onAddRel={id=>{setRelFor(id);setShowRel(true);}} T={T}/>}
      </div>

      {/* FABs */}
      <button onClick={()=>setShowAI(v=>!v)} title="AI Assistant" style={{position:"fixed",bottom:16,right:16,width:48,height:48,borderRadius:"50%",background:T.grad,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${T.accent}55`,zIndex:999}}>
        <i className="ti ti-sparkles" style={{fontSize:20,color:"#fff"}}/>
      </button>

      {showAI     && <AIChat tree={tree} onClose={()=>setShowAI(false)} T={T}/>}
      {showUpload && <ClaudeUpload onClose={()=>setShowUpload(false)} onBuildTree={buildFromExtract} T={T}/>}
      {showRel    && relFor && <AddRelModal pid={relFor} persons={tree.persons} onClose={()=>setShowRel(false)} onAdd={addRel} T={T}/>}
      {showPerm   && <PermModal tree={tree} onClose={()=>setShowPerm(false)} onSave={({visibility,admins,viewers})=>{setTree(t=>({...t,visibility,admins,viewers}));setShowPerm(false);}} T={T}/>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [user,setUser]       = useState(()=>{try{return JSON.parse(localStorage.getItem("ft_user"));}catch{return null;}});
  const [theme,setTheme]     = useState(()=>localStorage.getItem("ft_theme")||"dark");
  const [view,setView]       = useState("dashboard");
  const [trees,setTrees]     = useState([SAMPLE_TREE]);
  const [active,setActive]   = useState(null);
  const [showNew,setShowNew] = useState(false);

  const T = THEMES[theme];
  const isAdmin = user?.role==="ADMIN"||user?.role==="SUPERADMIN";

  const toggleTheme = () => { const next=theme==="dark"?"light":"dark"; setTheme(next); localStorage.setItem("ft_theme",next); };

  useEffect(()=>{
    if (!user) return;
    api("GET","/api/trees").then(data=>{
      const all=[...(data.owned||[]),...(data.shared||[])];
      setTrees(all.length>0?all:[SAMPLE_TREE]);
    }).catch(()=>setTrees([SAMPLE_TREE]));
  },[user]);

  const logout = () => { localStorage.removeItem("ft_token"); localStorage.removeItem("ft_user"); setUser(null); setView("dashboard"); setActive(null); };
  const openTree = t => { setActive({...t}); setView("tree"); };
  const createTree = t => { setTrees(ts=>[...ts.filter(x=>x.id!=="demo"),t]); setShowNew(false); openTree(t); };

  if (!user) return (
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Noto Sans Telugu",system-ui,sans-serif}`}</style>
      <AuthPage onLogin={u=>setUser(u)} T={T}/>
    </>
  );

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%}
        body{font-family:"Noto Sans Telugu",system-ui,sans-serif;font-size:13px;background:${T.bg};color:${T.text}}
        input,select,textarea,button{font-family:inherit}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        .fg{margin-bottom:10px}
        .ftn{display:flex;flex-direction:column;align-items:center;position:relative;padding-bottom:8px}
        .ftn-row{display:flex;align-items:center}
        .pnode{display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:8px;transition:transform 0.15s;position:relative}
        .pnode:hover{transform:translateY(-4px)}.pnode:hover .pnode-add{opacity:1}
        .pnode-ring{width:72px;height:72px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;overflow:visible;position:relative;transition:all 0.2s;flex-shrink:0}
        .pnode-img{width:66px;height:66px;border-radius:50%;object-fit:cover}
        .pnode-ini{width:66px;height:66px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
        .pnode-add{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;border:2px solid ${T.bg2};color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-weight:800;opacity:0;transition:opacity 0.15s;z-index:10}
        .pnode-name{font-size:12px;font-weight:700;margin-top:8px;text-align:center;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pnode-en{font-size:10px;text-align:center;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
        .pnode-yr{font-size:9px;text-align:center;margin-top:1px}
        .pnode-edu{font-size:9px;font-weight:700;text-align:center;margin-top:2px}
        .heart-line{display:flex;align-items:center;margin-top:-26px;padding:0 3px}
        .heart-dash{width:18px;height:1.5px}
        .heart-ico{font-size:15px;color:#ff6b8a;filter:drop-shadow(0 0 5px #ff6b8a99)}
        .ftvl{width:2px;height:24px;border-radius:1px;flex-shrink:0;margin:2px auto 0}
        .ftvs{width:2px;height:20px;border-radius:1px;flex-shrink:0;margin:0 auto}
        .fthr{display:flex;flex-direction:row;align-items:flex-start}
        .ftcc{display:flex;flex-direction:column;align-items:center;padding:0 8px;position:relative}
        .ftcc::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--lc,rgba(100,100,200,0.3));border-radius:1px}
        .ftcf::before{left:50%}.ftcl::before{right:50%}.ftco::before{display:none}
        .ftn-toggle{margin-top:6px;background:${T.bg2};border:1.5px solid;border-radius:99px;padding:2px 10px;cursor:pointer;font-size:10px;font-weight:700;transition:opacity 0.15s}
        .ftn-toggle:hover{opacity:0.8}
        .pp{width:280px;min-width:260px;display:flex;flex-direction:column;overflow:hidden}
        .pph{display:flex;align-items:center;gap:10px;padding:14px}
        .ppaw{position:relative;flex-shrink:0}
        .ppai{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid ${T.border}}
        .ppap{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;border:2px solid}
        .ppcam{position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .ppb{flex:1;overflow-y:auto;padding:12px 14px}
        .ppf{padding:10px 14px;display:flex;gap:8px}
      `}</style>

      <div style={{height:"100%",display:"flex",flexDirection:"column",background:T.bg}}>
        {/* Header */}
        <header style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:T.bg2,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:10,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-binary-tree-2" style={{fontSize:16,color:"#fff"}}/>
            </div>
            <span style={{fontSize:15,fontWeight:800,color:T.text}}>వంశవృక్షం</span>
            <span style={{fontSize:9,color:T.text3,fontWeight:400}}>SaaS v2</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={`Switch to ${theme==="dark"?"light":"dark"} mode`}
              style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text2,padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:12,display:"inline-flex",alignItems:"center",gap:4}}>
              <i className={`ti ti-${theme==="dark"?"sun":"moon"}`} style={{fontSize:13}}/>
              {theme==="dark"?"Light":"Dark"}
            </button>
            <span style={{fontSize:11,color:T.text2}}>{user.name}</span>
            {isAdmin && <button onClick={()=>setView("admin")} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}>
              <i className="ti ti-shield-lock" style={{fontSize:11}}/>Admin
            </button>}
            <button onClick={logout} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}>
              <i className="ti ti-logout" style={{fontSize:11}}/>Logout
            </button>
          </div>
        </header>

        {/* Body */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {view==="dashboard" && <Dashboard trees={trees} user={user} onOpen={openTree} onNew={()=>setShowNew(true)} T={T}/>}
          {view==="admin"     && <AdminPanel user={user} onBack={()=>setView("dashboard")} T={T}/>}
          {view==="tree"      && active && <TreeEditor tree={active} setTree={setActive} onBack={()=>setView("dashboard")} T={T}/>}
        </div>

        {showNew && <NewTreeModal onClose={()=>setShowNew(false)} onCreate={createTree} T={T}/>}
      </div>
    </>
  );
}
