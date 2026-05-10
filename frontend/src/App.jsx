import { useState, useRef, useEffect } from "react";
import AdminPanel from "./AdminPanel";

const BASE = import.meta.env.VITE_API_URL || "";
const api = async (method, path, body) => {
  const token = localStorage.getItem("ft_token");
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new Error(`Cannot reach server. Check VITE_API_URL in Railway: ${url}`); }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Server error at ${url}`); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const REL_TYPES = ["Son","Daughter","Father","Mother","Brother","Sister","Wife","Husband","Ex-wife","Ex-husband","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece"];
const SPOUSE_TYPES = ["Wife","Husband","Ex-wife","Ex-husband"];
const GEN_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#14b8a6"];

const SAMPLE_PERSONS = {
  root:{id:"root",name:"శ్రీ పద్మరాజు",nameEn:"Sri Padmaraju",education:"",photo:null,birth:"1920",death:"1995",occupation:"Zamindar",notes:"కుటుంబ మూలపురుషుడు",spouseId:"root_w"},
  root_w:{id:"root_w",name:"సావిత్రమ్మ",nameEn:"Savithramma",education:"",photo:null,birth:"1925",death:"2000",occupation:"",notes:"",spouseId:"root"},
  p1:{id:"p1",name:"నరసరాజు",nameEn:"Narasaraju",education:"",photo:null,birth:"1945",death:null,occupation:"",notes:"",spouseId:null},
  p2:{id:"p2",name:"లింగరాజు",nameEn:"Lingaraju",education:"",photo:null,birth:"1948",death:null,occupation:"",notes:"",spouseId:null},
  p3:{id:"p3",name:"భాస్కరరాజు",nameEn:"Bhaskarraju",education:"B.com",photo:null,birth:"1970",death:null,occupation:"Business",notes:"",spouseId:null},
  p4:{id:"p4",name:"సీతారామరాజు",nameEn:"Seetharamaraju",education:"B.Tech",photo:null,birth:"1975",death:null,occupation:"Engineer",notes:"",spouseId:null},
};
const SAMPLE_ROOT = {id:"root",children:[{id:"p1",children:[{id:"p3",children:[]},{id:"p4",children:[]}]},{id:"p2",children:[]}]};
const SAMPLE_TREE = {id:"demo",name:"కొత్రపల్లి వంశవృక్షం",nameEn:"Kotrapalli Family Tree (Demo)",visibility:"private",members:6,admins:["You"],viewers:[],persons:SAMPLE_PERSONS,rootNode:SAMPLE_ROOT,createdAt:"2024-01-15"};

// ── Person Node (circular, dark themed) ───────────────────
function PersonNode({person, selected, onSel, onAdd, depth}) {
  if (!person) return null;
  const color = GEN_COLORS[depth % GEN_COLORS.length];
  const initials = (person.nameEn||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const years = [person.birth, person.death].filter(Boolean).join(" – ");
  return (
    <div className="pnode" onClick={()=>onSel(person.id)}>
      <div className="pnode-ring" style={{borderColor: selected ? "#fff" : color, boxShadow: selected ? `0 0 0 3px ${color}` : `0 0 0 2px ${color}44`}}>
        {person.photo
          ? <img src={person.photo} alt="" className="pnode-img"/>
          : <div className="pnode-initials" style={{background:`${color}22`,color}}>{initials}</div>
        }
        <button className="pnode-add" onClick={e=>{e.stopPropagation();onAdd(person.id);}} title="Add relation" style={{background:color}}>+</button>
      </div>
      <div className="pnode-name">{person.name}</div>
      <div className="pnode-en">{person.nameEn}</div>
      {years && <div className="pnode-years">{years}</div>}
      {person.education && <div className="pnode-edu" style={{color}}>{person.education}</div>}
    </div>
  );
}

// ── Family Tree Node ───────────────────────────────────────
function FTNode({node, persons, selId, onSel, onAdd, depth=0}) {
  const [col, setCol] = useState(depth >= 3);
  const person = persons[node.id];
  if (!person) return null;
  const spouse = person.spouseId ? persons[person.spouseId] : null;
  const kids = (node.children||[]).filter(c => c.id !== person.spouseId);
  const hk = kids.length > 0;

  return (
    <div className="ftn">
      {/* Couple or single person */}
      <div className="ftn-row">
        <PersonNode person={person} selected={selId===node.id} onSel={onSel} onAdd={onAdd} depth={depth}/>
        {spouse && (
          <>
            <div className="heart-line">
              <div className="heart-dash"/>
              <span className="heart-icon">❤</span>
              <div className="heart-dash"/>
            </div>
            <PersonNode person={spouse} selected={selId===spouse.id} onSel={onSel} onAdd={onAdd} depth={depth}/>
          </>
        )}
      </div>

      {/* Children */}
      {hk && !col && (
        <>
          <div className="ftvl" style={{background:GEN_COLORS[depth%GEN_COLORS.length]+"66"}}/>
          <div className="fthr">
            {kids.map((c,i)=>(
              <div key={c.id} className={`ftcc ${i===0?"ftcf":""} ${i===kids.length-1?"ftcl":""} ${kids.length===1?"ftco":""}`}
                style={{"--line-color":GEN_COLORS[(depth+1)%GEN_COLORS.length]+"66"}}>
                <div className="ftvs" style={{background:GEN_COLORS[(depth+1)%GEN_COLORS.length]+"66"}}/>
                <FTNode node={c} persons={persons} selId={selId} onSel={onSel} onAdd={onAdd} depth={depth+1}/>
              </div>
            ))}
          </div>
        </>
      )}

      {hk && (
        <button className="ftn-toggle" onClick={e=>{e.stopPropagation();setCol(v=>!v);}}
          style={{borderColor:GEN_COLORS[depth%GEN_COLORS.length],color:GEN_COLORS[depth%GEN_COLORS.length]}}>
          {col ? `▼ ${kids.length}` : "▲"}
        </button>
      )}
    </div>
  );
}

// ── Person Edit Panel ──────────────────────────────────────
function PersonPanel({pid, persons, onClose, onSave, onAddRel}) {
  const [form, setForm] = useState({...persons[pid]});
  const fileRef = useRef();
  useEffect(()=>setForm({...persons[pid]}),[pid,persons]);
  if (!persons[pid]) return null;
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const onPhoto = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,photo:ev.target.result})); r.readAsDataURL(f);
  };
  const depth = 0;
  const color = GEN_COLORS[depth % GEN_COLORS.length];
  return (
    <div className="pp">
      <div className="pph">
        <div className="ppaw" onClick={()=>fileRef.current.click()}>
          {form.photo
            ? <img src={form.photo} className="ppai" alt=""/>
            : <div className="ppap" style={{background:`${color}22`,borderColor:color,color}}>{(form.nameEn||"?")[0]}</div>
          }
          <div className="ppcam"><i className="ti ti-camera" style={{fontSize:11}}/></div>
          <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onPhoto}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:15,color:"#e6edf3",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.name}</div>
          <div style={{fontSize:11,color:"#8b949e"}}>{form.nameEn}</div>
          {(form.birth||form.death) && <div style={{fontSize:10,color:"#6e7681"}}>{[form.birth,form.death].filter(Boolean).join(" – ")}</div>}
        </div>
        <button onClick={onClose} className="iconbtn">✕</button>
      </div>
      <div className="ppb">
        {[["name","Telugu Name","తెలుగు పేరు"],["nameEn","English Name","Full name"],
          ["birth","Birth Year","e.g. 1950"],["death","Death Year","Leave blank if living"],
          ["gender","Gender",null],["education","Education","e.g. B.Tech, M.A."],
          ["occupation","Occupation","Job or profession"],["notes","Notes","Additional info"]
        ].map(([k,lbl,ph])=>(
          <div className="fg" key={k}>
            <label>{lbl}</label>
            {k==="gender"
              ? <select value={form.gender||"male"} onChange={upd(k)} style={{width:"100%",fontSize:12}}>
                  <option value="male">Male / పురుషుడు</option>
                  <option value="female">Female / స్త్రీ</option>
                </select>
              : k==="notes"
              ? <textarea value={form[k]||""} onChange={upd(k)} placeholder={ph} rows={2} style={{width:"100%",fontSize:12,resize:"vertical"}}/>
              : <input value={form[k]||""} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/>
            }
          </div>
        ))}
      </div>
      <div className="ppf">
        <button className="btn2" onClick={()=>onAddRel(pid)}><i className="ti ti-users-plus" style={{fontSize:12,marginRight:3}}/>Add Relation</button>
        <button className="btn1" onClick={()=>onSave(form)}><i className="ti ti-device-floppy" style={{fontSize:12,marginRight:3}}/>Save</button>
      </div>
    </div>
  );
}

// ── AI Chat ───────────────────────────────────────────────
function AIChat({tree, onClose}) {
  const [msgs,setMsgs] = useState([{role:"assistant",text:"నమస్కారం! 🙏 I am your Family Tree AI assistant.\n\nAsk me anything:\n• \"Who has a B.Tech degree?\"\n• \"How many generations?\"\n• \"List all members\"\n• \"Translate a name to Telugu\""}]);
  const [inp,setInp]   = useState("");
  const [load,setLoad] = useState(false);
  const endRef         = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);
  const send = async () => {
    if (!inp.trim()||load) return;
    const txt=inp; setInp(""); setLoad(true);
    setMsgs(m=>[...m,{role:"user",text:txt}]);
    try {
      const data = await api("POST","/api/ai/chat",{
        messages:[...msgs.slice(1),{role:"user",content:txt}].map(m=>({role:m.role,content:m.text||m.content})),
        treeContext:{name:tree.nameEn,persons:Object.values(tree.persons)}
      });
      setMsgs(m=>[...m,{role:"assistant",text:data.reply}]);
    } catch(e){ setMsgs(m=>[...m,{role:"assistant",text:"Error: "+e.message}]); }
    setLoad(false);
  };
  return (
    <div className="aic">
      <div className="aih">
        <i className="ti ti-sparkles" style={{fontSize:14,color:"#3b82f6"}}/>
        <span style={{fontWeight:600,fontSize:12,color:"#e6edf3"}}>AI సహాయకుడు</span>
        <span style={{fontSize:10,color:"#6e7681",marginLeft:4}}>Family Tree AI</span>
        <button onClick={onClose} className="iconbtn" style={{marginLeft:"auto"}}>✕</button>
      </div>
      <div className="aim">
        {msgs.map((m,i)=>(
          <div key={i} className={`aimr ${m.role==="user"?"aimu":"aima"}`}>
            <div className="aib" style={{background:m.role==="user"?"#1d4ed822":"#1c2333",color:m.role==="user"?"#93c5fd":"#e6edf3",border:m.role==="user"?"1px solid #1d4ed8":"1px solid #30363d"}}>
              {m.text}
            </div>
          </div>
        ))}
        {load && <div className="aima"><div className="aib" style={{background:"#1c2333",border:"1px solid #30363d",color:"#6e7681",fontSize:18,letterSpacing:2}}>●●●</div></div>}
        <div ref={endRef}/>
      </div>
      <div className="aiir">
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your family tree…" style={{flex:1,fontSize:12}}/>
        <button onClick={send} className="btn1" style={{padding:"5px 10px"}} disabled={load}><i className="ti ti-send" style={{fontSize:12}}/></button>
      </div>
    </div>
  );
}

// ── Add Relation Modal ────────────────────────────────────
function AddRelModal({pid, persons, onClose, onAdd}) {
  const [rel,setRel]     = useState("Son");
  const [mode,setMode]   = useState("new");
  const [name,setName]   = useState(""); const [nameEn,setNameEn]=useState(""); const [edu,setEdu]=useState(""); const [exId,setExId]=useState("");
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:600}}>Add Relation · {persons[pid]?.nameEn}</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div className="fg"><label>Relation Type</label>
          <select value={rel} onChange={e=>setRel(e.target.value)} style={{width:"100%",fontSize:12}}>
            {REL_TYPES.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <button className={mode==="new"?"btn1":"btn2"} onClick={()=>setMode("new")}>New Person</button>
          <button className={mode==="existing"?"btn1":"btn2"} onClick={()=>setMode("existing")}>Existing</button>
        </div>
        {mode==="new" ? <>
          <div className="fg"><label>Telugu Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="తెలుగు పేరు" style={{width:"100%",fontSize:12}}/></div>
          <div className="fg"><label>English Name</label><input value={nameEn} onChange={e=>setNameEn(e.target.value)} placeholder="English name" style={{width:"100%",fontSize:12}}/></div>
          <div className="fg"><label>Education</label><input value={edu} onChange={e=>setEdu(e.target.value)} placeholder="e.g. B.Tech" style={{width:"100%",fontSize:12}}/></div>
        </> : (
          <div className="fg"><label>Select Person</label>
            <select value={exId} onChange={e=>setExId(e.target.value)} style={{width:"100%",fontSize:12}}>
              <option value="">-- Select --</option>
              {Object.values(persons).filter(x=>x.id!==pid).map(x=><option key={x.id} value={x.id}>{x.nameEn} ({x.name})</option>)}
            </select>
          </div>
        )}
        {SPOUSE_TYPES.includes(rel) && <div style={{background:"#1d4ed822",border:"1px solid #1d4ed8",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#93c5fd",marginTop:4}}>❤ This will be shown as a spouse connection in the tree</div>}
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={()=>onAdd({rel,mode,pid,name,nameEn,edu,exId})}>Add</button></div>
    </div></div>
  );
}

// ── Permissions Modal ─────────────────────────────────────
function PermModal({tree, onClose, onSave}) {
  const [vis,setVis]   = useState(tree.visibility);
  const [inv,setInv]   = useState("");
  const [viewers,setV] = useState([...(tree.viewers||[])]);
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:600}}>Permissions / అనుమతులు</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["private","ti-lock","Private","Invited only"],["public","ti-world","Public","Anyone with link"]].map(([v,ic,lbl,desc])=>(
            <div key={v} style={{flex:1,display:"flex",alignItems:"center",gap:9,padding:"10px 12px",border:`1px solid ${vis===v?"#3b82f6":"#30363d"}`,borderRadius:8,cursor:"pointer",background:vis===v?"#1d4ed822":"transparent"}} onClick={()=>setVis(v)}>
              <i className={`ti ${ic}`} style={{fontSize:18,color:vis===v?"#3b82f6":"#6e7681"}}/>
              <div><div style={{fontWeight:500,fontSize:12,color:"#e6edf3"}}>{lbl}</div><div style={{fontSize:10,color:"#6e7681"}}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6,color:"#8b949e"}}>Admins</div>
        {(tree.admins||[]).map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",color:"#8b949e"}}><i className="ti ti-crown" style={{fontSize:10,color:"#f59e0b"}}/>{a}</div>)}
        <div style={{fontSize:12,fontWeight:500,margin:"10px 0 6px",color:"#8b949e"}}>Viewers</div>
        {viewers.length===0 ? <div style={{fontSize:11,color:"#6e7681"}}>None yet</div>
          : viewers.map(v=><div key={v} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",color:"#8b949e"}}><i className="ti ti-eye" style={{fontSize:10}}/>{v}
              <button onClick={()=>setV(vv=>vv.filter(x=>x!==v))} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#f85149",fontSize:11}}>✕</button>
            </div>)}
        <div style={{marginTop:10}}>
          <label style={{fontSize:10,color:"#6e7681"}}>Invite by email</label>
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <input value={inv} onChange={e=>setInv(e.target.value)} placeholder="email@example.com" style={{flex:1,fontSize:12}}/>
            <button className="btn2" onClick={()=>{if(inv.trim()){setV(v=>[...v,inv.trim()]);setInv("");}}}>Invite</button>
          </div>
        </div>
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={()=>onSave({visibility:vis,admins:tree.admins,viewers})}>Save</button></div>
    </div></div>
  );
}

// ── New Tree Modal ────────────────────────────────────────
function NewTreeModal({onClose, onCreate}) {
  const [name,setName]=useState(""); const [nameEn,setNameEn]=useState(""); const [vis,setVis]=useState("private"); const [load,setLoad]=useState(false);
  const submit = async () => {
    if (!name||!nameEn) return;
    setLoad(true);
    try { const t=await api("POST","/api/trees",{name,nameEn,visibility:vis}); onCreate(t); }
    catch { onCreate({id:"t"+Date.now(),name,nameEn,visibility:vis,members:0,admins:["You"],viewers:[],persons:{},rootNode:null,createdAt:new Date().toISOString().slice(0,10)}); }
    setLoad(false);
  };
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:600}}>New Family Tree / నూతన వంశవృక్షం</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div className="fg"><label>Telugu Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. కొత్రపల్లి వంశవృక్షం" style={{width:"100%"}}/></div>
        <div className="fg"><label>English Name</label><input value={nameEn} onChange={e=>setNameEn(e.target.value)} placeholder="e.g. Kotrapalli Family Tree" style={{width:"100%"}}/></div>
        <div className="fg"><label>Visibility</label>
          <select value={vis} onChange={e=>setVis(e.target.value)} style={{width:"100%"}}>
            <option value="private">Private — only me</option><option value="public">Public — anyone with link</option>
          </select>
        </div>
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" disabled={!name||!nameEn||load} onClick={submit}>{load?"Creating…":"Create Tree"}</button></div>
    </div></div>
  );
}

// ── Auth Page ─────────────────────────────────────────────
function AuthPage({onLogin}) {
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
    } catch(e){ setError(e.message); }
    setLoad(false);
  };
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0d1117 0%,#0f1f3d 50%,#0d1117 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:16,padding:"32px 28px",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <i className="ti ti-binary-tree-2" style={{fontSize:28,color:"#fff"}}/>
          </div>
          <div style={{fontSize:26,fontWeight:700,color:"#e6edf3",letterSpacing:1}}>వంశవృక్షం</div>
          <div style={{fontSize:12,color:"#8b949e",marginTop:4}}>Telugu Family Tree Builder</div>
        </div>
        <div style={{display:"flex",background:"#0d1117",borderRadius:8,marginBottom:20,padding:3}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"7px",fontSize:12,fontWeight:600,background:mode===m?"linear-gradient(135deg,#1d4ed8,#7c3aed)":"transparent",color:mode===m?"#fff":"#8b949e",border:"none",cursor:"pointer",borderRadius:6,transition:"all 0.2s"}}>
              {m==="login"?"Login":"Register"}
            </button>
          ))}
        </div>
        {mode==="register" && <div className="fg"><label>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>}
        <div className="fg"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div className="fg"><label>Password</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        {error && <div style={{background:"#f8514922",border:"1px solid #f85149",color:"#ff8182",fontSize:12,padding:"8px 10px",borderRadius:8,marginBottom:12,wordBreak:"break-word"}}>{error}</div>}
        <button onClick={submit} disabled={load} style={{width:"100%",padding:"11px",fontSize:14,fontWeight:600,background:load?"#1c2333":"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:"#fff",border:"none",borderRadius:8,cursor:load?"not-allowed":"pointer",marginBottom:12}}>
          {load?"Please wait…":mode==="login"?"Login →":"Create Account →"}
        </button>
        <div style={{textAlign:"center",fontSize:12,color:"#8b949e"}}>
          {mode==="login" ? <>No account? <span style={{color:"#3b82f6",cursor:"pointer"}} onClick={()=>{setMode("register");setError("");}}>Register free</span></>
            : <>Have account? <span style={{color:"#3b82f6",cursor:"pointer"}} onClick={()=>{setMode("login");setError("");}}>Login</span></>}
        </div>
        <div style={{marginTop:14,background:"#1c2333",border:"1px solid #30363d",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#8b949e",display:"flex",alignItems:"center",gap:6}}>
          <i className="ti ti-info-circle" style={{fontSize:13,color:"#3b82f6"}}/>
          {mode==="register"?"First account becomes SuperAdmin":"Enter your credentials to continue"}
        </div>
        {!BASE && <div style={{marginTop:8,background:"#f8514922",border:"1px solid #f85149",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#ff8182"}}>⚠️ VITE_API_URL not set in Railway</div>}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard({trees, onOpen, onNew, user}) {
  return (
    <div className="dash">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:"#e6edf3"}}>నా వంశవృక్షాలు</div>
          <div style={{fontSize:13,color:"#8b949e",marginTop:3}}>Welcome back, {user?.name}</div>
        </div>
        <button className="btn1" onClick={onNew}><i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>New Tree</button>
      </div>

      {trees.length===0 ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"#1c2333",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
            <i className="ti ti-binary-tree" style={{fontSize:40,color:"#30363d"}}/>
          </div>
          <div style={{fontSize:16,fontWeight:600,color:"#e6edf3",marginBottom:8}}>No family trees yet</div>
          <div style={{fontSize:13,color:"#8b949e",marginBottom:20}}>Create your first family tree to get started</div>
          <button className="btn1" onClick={onNew}><i className="ti ti-plus" style={{fontSize:13,marginRight:4}}/>Create First Tree</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,marginBottom:24}}>
          {trees.map((t,i)=>(
            <div key={t.id} onClick={()=>onOpen(t)} style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,padding:18,cursor:"pointer",transition:"all 0.2s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=GEN_COLORS[i%GEN_COLORS.length];e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#30363d";e.currentTarget.style.transform="translateY(0)";}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:`${GEN_COLORS[i%GEN_COLORS.length]}22`,border:`2px solid ${GEN_COLORS[i%GEN_COLORS.length]}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}>
                <i className="ti ti-binary-tree" style={{fontSize:20,color:GEN_COLORS[i%GEN_COLORS.length]}}/>
              </div>
              <div style={{fontWeight:600,fontSize:15,color:"#e6edf3"}}>{t.name}</div>
              <div style={{fontSize:11,color:"#8b949e",marginTop:2}}>{t.nameEn}</div>
              <div style={{display:"flex",gap:10,marginTop:10,fontSize:10,color:"#6e7681"}}>
                <span><i className="ti ti-users" style={{fontSize:10,marginRight:2}}/>{t.members||t._count?.persons||0} members</span>
                <span><i className={`ti ti-${t.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{t.visibility}</span>
              </div>
            </div>
          ))}
          <div onClick={onNew} style={{background:"#0d1117",border:"1px dashed #30363d",borderRadius:12,padding:18,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:140,transition:"border-color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"} onMouseLeave={e=>e.currentTarget.style.borderColor="#30363d"}>
            <i className="ti ti-plus" style={{fontSize:28,color:"#30363d",marginBottom:8}}/>
            <div style={{fontSize:13,color:"#6e7681",fontWeight:500}}>New Tree</div>
          </div>
        </div>
      )}

      <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,padding:16}}>
        <div style={{fontSize:11,fontWeight:600,color:"#6e7681",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Platform Features</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
          {[["ti-language","#3b82f6","Bilingual","Telugu & English"],["ti-users-plus","#10b981","Relations","14+ types"],["ti-photo","#f59e0b","Photos","Profile pics"],["ti-lock","#8b5cf6","Private","Access control"],["ti-sparkles","#06b6d4","AI Chat","Smart assistant"],["ti-shield-lock","#ef4444","Admin Panel","Full control"]].map(([ic,col,t,d])=>(
            <div key={t} style={{background:"#0d1117",borderRadius:8,padding:10,textAlign:"center"}}>
              <i className={`ti ${ic}`} style={{fontSize:18,color:col,display:"block",marginBottom:6}}/>
              <div style={{fontWeight:600,fontSize:11,color:"#e6edf3"}}>{t}</div>
              <div style={{fontSize:10,color:"#6e7681",marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tree Editor ───────────────────────────────────────────
function TreeEditor({tree, setTree, onBack}) {
  const [selP,setSelP]         = useState(null);
  const [showAI,setShowAI]     = useState(false);
  const [showRel,setShowRel]   = useState(false);
  const [relFor,setRelFor]     = useState(null);
  const [showPerm,setShowPerm] = useState(false);

  const savePerson = p => setTree(t=>({...t,persons:{...t.persons,[p.id]:p}}));

  const addRel = ({rel,mode,pid,name,nameEn,edu,exId}) => {
    if (mode==="new"&&!nameEn.trim()) return;
    if (mode==="existing"&&!exId) return;
    const isSpouse = SPOUSE_TYPES.includes(rel);

    setTree(t => {
      const nid = "px"+Date.now();
      const newPersons = mode==="new"
        ? {...t.persons,[nid]:{id:nid,name,nameEn,education:edu,photo:null,birth:"",death:"",occupation:"",notes:"",spouseId:isSpouse?pid:null,gender:["Wife","Ex-wife"].includes(rel)?"female":"male"}}
        : t.persons;
      const tid = mode==="new" ? nid : exId;

      if (isSpouse) {
        // Link as spouse — update spouseId on both persons
        const updatedPersons = {
          ...newPersons,
          [pid]: {...(newPersons[pid]||t.persons[pid]), spouseId:tid},
          [tid]: {...(newPersons[tid]||t.persons[tid]||{}), spouseId:pid},
        };
        return {...t, persons:updatedPersons, members:t.members+(mode==="new"?1:0)};
      } else {
        // Add as child node
        const addChild = n => n.id===pid ? {...n,children:[...(n.children||[]),{id:tid,children:[]}]} : n.children ? {...n,children:n.children.map(addChild)} : n;
        return {...t, persons:newPersons, rootNode:t.rootNode?addChild(t.rootNode):{id:tid,children:[]}, members:t.members+(mode==="new"?1:0)};
      }
    });
    setShowRel(false);
  };

  const hasPersons = tree.rootNode && tree.persons && tree.persons[tree.rootNode?.id];

  return (
    <div className="te">
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"#161b22",borderBottom:"1px solid #30363d",flexWrap:"wrap"}}>
        <button className="btn2" style={{padding:"4px 10px",fontSize:11}} onClick={onBack}><i className="ti ti-chevron-left" style={{fontSize:10}}/>Trees</button>
        <span style={{fontSize:12,color:"#e6edf3",fontWeight:500}}>{tree.nameEn}</span>
        <span style={{fontSize:10,color:"#6e7681"}}>· {tree.members||0} members</span>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button className="btn2" style={{padding:"4px 10px",fontSize:11}} onClick={()=>setShowPerm(true)}>
            <i className={`ti ti-${tree.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{tree.visibility}
          </button>
          <button className="btn1" style={{padding:"4px 10px",fontSize:11}} onClick={()=>{
            if (!hasPersons) {
              const nm=window.prompt("Telugu name of first person:")||"వ్యక్తి";
              const en=window.prompt("English name:")||"Person";
              setTree(t=>({...t,persons:{...t.persons,root:{id:"root",name:nm,nameEn:en,education:"",photo:null,birth:"",death:"",occupation:"",notes:"",spouseId:null}},rootNode:{id:"root",children:[]},members:1}));
            } else { setRelFor(tree.rootNode.id); setShowRel(true); }
          }}>
            <i className="ti ti-user-plus" style={{fontSize:10,marginRight:3}}/>{hasPersons?"Add Person":"Add First Person"}
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Tree canvas */}
        <div style={{flex:1,overflow:"auto",padding:"32px 32px 80px",display:"flex",justifyContent:"center",alignItems:"flex-start",background:"radial-gradient(ellipse at center,#0f1f3d 0%,#0d1117 70%)"}}>
          {hasPersons ? (
            <div style={{overflow:"visible",minWidth:"max-content"}}>
              <FTNode node={tree.rootNode} persons={tree.persons} selId={selP} onSel={setSelP} onAdd={id=>{setRelFor(id);setShowRel(true);}}/>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:"#161b22",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
                <i className="ti ti-binary-tree" style={{fontSize:40,color:"#30363d"}}/>
              </div>
              <div style={{fontSize:15,fontWeight:600,color:"#e6edf3",marginBottom:8}}>Empty Tree</div>
              <div style={{fontSize:12,color:"#6e7681"}}>Click "Add First Person" to start building</div>
            </div>
          )}
        </div>

        {/* Person panel */}
        {selP && <PersonPanel pid={selP} persons={tree.persons} onClose={()=>setSelP(null)} onSave={savePerson} onAddRel={id=>{setRelFor(id);setShowRel(true);}}/>}
      </div>

      {/* AI FAB */}
      <button onClick={()=>setShowAI(v=>!v)} title="AI Assistant"
        style={{position:"fixed",bottom:16,right:16,width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(59,130,246,0.4)",zIndex:999}}>
        <i className="ti ti-sparkles" style={{fontSize:20,color:"#fff"}}/>
      </button>

      {showAI   && <AIChat tree={tree} onClose={()=>setShowAI(false)}/>}
      {showRel  && relFor && <AddRelModal pid={relFor} persons={tree.persons} onClose={()=>setShowRel(false)} onAdd={addRel}/>}
      {showPerm && <PermModal tree={tree} onClose={()=>setShowPerm(false)} onSave={({visibility,admins,viewers})=>{setTree(t=>({...t,visibility,admins,viewers}));setShowPerm(false);}}/>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(()=>{try{return JSON.parse(localStorage.getItem("ft_user"));}catch{return null;}});
  const [view,setView]         = useState("dashboard");
  const [trees,setTrees]       = useState([SAMPLE_TREE]);
  const [activeTree,setActive] = useState(null);
  const [showNew,setShowNew]   = useState(false);
  const isAdmin = user?.role==="ADMIN"||user?.role==="SUPERADMIN";

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

  if (!user) return <><GS/><AuthPage onLogin={u=>setUser(u)}/></>;

  return (
    <><GS/>
      <div className="app">
        <header style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"#161b22",borderBottom:"1px solid #30363d",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-binary-tree-2" style={{fontSize:16,color:"#fff"}}/>
            </div>
            <span style={{fontSize:15,fontWeight:700,color:"#e6edf3"}}>వంశవృక్షం</span>
            <span style={{fontSize:9,color:"#6e7681",fontWeight:400}}>SaaS</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
            <span style={{fontSize:11,color:"#8b949e"}}>{user.name}</span>
            {isAdmin && (
              <button className="btn2" style={{padding:"3px 10px",fontSize:11}} onClick={()=>setView("admin")}>
                <i className="ti ti-shield-lock" style={{fontSize:11,marginRight:3}}/>Admin
              </button>
            )}
            <button className="btn2" style={{padding:"3px 10px",fontSize:11}} onClick={logout}>
              <i className="ti ti-logout" style={{fontSize:11,marginRight:3}}/>Logout
            </button>
          </div>
        </header>

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {view==="dashboard" && <Dashboard trees={trees} user={user} onOpen={openTree} onNew={()=>setShowNew(true)}/>}
          {view==="admin"     && <AdminPanel user={user} onBack={()=>setView("dashboard")}/>}
          {view==="tree"      && activeTree && <TreeEditor tree={activeTree} setTree={setActive} onBack={()=>setView("dashboard")}/>}
        </div>
        {showNew && <NewTreeModal onClose={()=>setShowNew(false)} onCreate={createTree}/>}
      </div>
    </>
  );
}

// ── Global Styles (Dark Theme) ────────────────────────────
function GS(){return <style>{`
  *{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{font-family:"Noto Sans Telugu",system-ui,sans-serif;font-size:13px;background:#0d1117;color:#e6edf3}
  input,select,textarea,button{font-family:inherit}
  input,select,textarea{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:8px 10px;color:#e6edf3;font-size:12px;outline:none;transition:border-color 0.15s}
  input:focus,select:focus,textarea:focus{border-color:#3b82f6}
  input::placeholder{color:#6e7681}
  select option{background:#1c2333}
  .app{height:100%;display:flex;flex-direction:column;background:#0d1117}
  .iconbtn{background:none;border:none;cursor:pointer;color:#8b949e;font-size:15px;padding:2px;display:flex;align-items:center}
  .iconbtn:hover{color:#e6edf3}
  .btn1{background:linear-gradient(135deg,#1d4ed8,#7c3aed);border:none;color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;transition:opacity 0.15s}
  .btn1:hover{opacity:0.9}.btn1:disabled{opacity:.4;cursor:not-allowed}
  .btn2{background:transparent;border:1px solid #30363d;color:#8b949e;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;transition:all 0.15s}
  .btn2:hover{border-color:#8b949e;color:#e6edf3}
  .dash{padding:24px;max-width:960px;margin:0 auto;width:100%;overflow-y:auto;height:100%}
  .te{flex:1;display:flex;flex-direction:column;overflow:hidden;height:100%}
  /* Tree styles */
  .ftn{display:flex;flex-direction:column;align-items:center;position:relative;padding-bottom:8px}
  .ftn-row{display:flex;align-items:center;gap:0}
  .pnode{display:flex;flex-direction:column;align-items:center;cursor:pointer;padding:8px;transition:transform 0.15s;position:relative}
  .pnode:hover{transform:translateY(-3px)}
  .pnode:hover .pnode-add{opacity:1}
  .pnode-ring{width:72px;height:72px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;overflow:visible;position:relative;transition:all 0.2s;flex-shrink:0}
  .pnode-img{width:66px;height:66px;border-radius:50%;object-fit:cover}
  .pnode-initials{width:66px;height:66px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700}
  .pnode-add{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;border:none;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;font-weight:700;opacity:0;transition:opacity 0.15s;z-index:10}
  .pnode-name{font-size:12px;font-weight:600;color:#e6edf3;margin-top:8px;text-align:center;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pnode-en{font-size:10px;color:#8b949e;text-align:center;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pnode-years{font-size:9px;color:#6e7681;text-align:center;margin-top:1px}
  .pnode-edu{font-size:9px;font-weight:600;text-align:center;margin-top:1px}
  .heart-line{display:flex;align-items:center;gap:0;padding:0 2px;margin-top:-28px}
  .heart-dash{width:16px;height:1px;background:#ff6b8a66}
  .heart-icon{font-size:14px;color:#ff6b8a;filter:drop-shadow(0 0 4px #ff6b8a88)}
  .ftvl{width:2px;height:24px;border-radius:1px;flex-shrink:0;margin:2px auto 0}
  .ftvs{width:2px;height:20px;border-radius:1px;flex-shrink:0;margin:0 auto}
  .fthr{display:flex;flex-direction:row;align-items:flex-start}
  .ftcc{display:flex;flex-direction:column;align-items:center;padding:0 8px;position:relative}
  .ftcc::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--line-color,rgba(255,255,255,0.15));border-radius:1px}
  .ftcf::before{left:50%}.ftcl::before{right:50%}.ftco::before{display:none}
  .ftn-toggle{margin-top:4px;background:#1c2333;border:1px solid;border-radius:99px;padding:2px 8px;cursor:pointer;font-size:9px;font-weight:600}
  /* Person Panel */
  .pp{width:280px;min-width:260px;background:#161b22;border-left:1px solid #30363d;display:flex;flex-direction:column;overflow:hidden}
  .pph{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #30363d}
  .ppaw{position:relative;flex-shrink:0;cursor:pointer}
  .ppai{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #30363d}
  .ppap{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:2px solid}
  .ppcam{position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#1c2333;border:1px solid #30363d;display:flex;align-items:center;justify-content:center;color:#8b949e}
  .ppb{flex:1;overflow-y:auto;padding:12px 14px}
  .ppb::-webkit-scrollbar{width:4px}.ppb::-webkit-scrollbar-track{background:#0d1117}.ppb::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px}
  .ppf{padding:10px 14px;border-top:1px solid #30363d;display:flex;gap:8px}
  .fg{margin-bottom:10px}
  .fg label{display:block;font-size:10px;color:#6e7681;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  /* AI Chat */
  .aic{position:fixed;bottom:76px;right:16px;width:300px;background:#161b22;border:1px solid #30363d;border-radius:12px;display:flex;flex-direction:column;z-index:1000;max-height:440px;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
  .aih{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid #30363d}
  .aim{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;min-height:170px;max-height:290px}
  .aim::-webkit-scrollbar{width:3px}.aim::-webkit-scrollbar-track{background:transparent}.aim::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px}
  .aimr{display:flex}.aimu{justify-content:flex-end}
  .aib{padding:8px 11px;border-radius:10px;font-size:12px;line-height:1.5;white-space:pre-wrap;max-width:90%}
  .aiir{display:flex;gap:7px;padding:10px 12px;border-top:1px solid #30363d}
  .aiir input{flex:1;font-size:12px;width:auto;background:#0d1117}
  /* Modals */
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(4px)}
  .mb{background:#161b22;border:1px solid #30363d;border-radius:12px;width:100%;max-width:420px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
  .mh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #30363d;font-size:14px;color:#e6edf3}
  .mbd{padding:16px;overflow-y:auto;flex:1}
  .mf{padding:12px 16px;border-top:1px solid #30363d;display:flex;gap:8px;justify-content:flex-end}
`}</style>;}
