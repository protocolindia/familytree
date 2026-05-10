import { useState, useRef, useEffect } from "react";
import AdminPanel from "./AdminPanel";

// ── API helper ────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "";

const api = async (method, path, body) => {
  const token = localStorage.getItem("ft_token");
  const url   = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error(`Cannot reach server at ${url}. Check VITE_API_URL in Railway.`);
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Server returned non-JSON response. URL: ${url}`); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const REL_TYPES = ["Son","Daughter","Father","Mother","Brother","Sister","Wife","Husband","Ex-wife","Ex-husband","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece"];

const SAMPLE_PERSONS = {
  root:{id:"root",name:"శ్రీ పద్మరాజు",nameEn:"Sri Padmaraju",education:"",photo:null,birth:"",occupation:"Zamindar",notes:"కుటుంబ మూలపురుషుడు"},
  p1:{id:"p1",name:"నరసరాజు",nameEn:"Narasaraju",education:"",photo:null,birth:"",occupation:"",notes:""},
  p2:{id:"p2",name:"లింగరాజు",nameEn:"Lingaraju",education:"",photo:null,birth:"",occupation:"",notes:""},
  p3:{id:"p3",name:"వెంకట్రాజు",nameEn:"Venkatraju",education:"",photo:null,birth:"",occupation:"",notes:""},
  p4:{id:"p4",name:"భాస్కరరాజు",nameEn:"Bhaskarraju",education:"B.com",photo:null,birth:"",occupation:"Business",notes:""},
  p5:{id:"p5",name:"సీతారామరాజు",nameEn:"Seetharamaraju",education:"B.Tech",photo:null,birth:"",occupation:"Engineer",notes:""},
};
const SAMPLE_ROOT = {id:"root",children:[{id:"p1",children:[{id:"p2",children:[{id:"p3",children:[{id:"p4",children:[]},{id:"p5",children:[]}]}]}]}]};
const SAMPLE_TREE = {id:"demo",name:"కొత్రపల్లి వంశవృక్షం",nameEn:"Kotrapalli Family Tree (Demo)",visibility:"private",members:6,admins:["You"],viewers:[],persons:SAMPLE_PERSONS,rootNode:SAMPLE_ROOT,createdAt:"2024-01-15"};

// ── Auth Page ─────────────────────────────────────────────
function AuthPage({onLogin}){
  const [mode,setMode]     = useState("login");
  const [name,setName]     = useState("");
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [error,setError]   = useState("");
  const [loading,setLoad]  = useState(false);

  const submit = async () => {
    if(!email||!pass) return setError("Email and password required");
    if(mode==="register"&&!name) return setError("Name required");
    setLoad(true); setError("");
    try {
      const path = mode==="login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode==="login" ? {email,password:pass} : {name,email,password:pass};
      const data = await api("POST", path, body);
      localStorage.setItem("ft_token", data.token);
      localStorage.setItem("ft_user",  JSON.stringify(data.user));
      onLogin(data.user);
    } catch(e){ setError(e.message); }
    setLoad(false);
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div style={{textAlign:"center",marginBottom:24}}>
          <i className="ti ti-binary-tree-2" style={{fontSize:44,color:"var(--color-text-info)"}}/>
          <div style={{fontSize:24,fontWeight:600,marginTop:8}}>వంశవృక్షం</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:3}}>Telugu Family Tree Builder</div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode==="login"?"active":""}`}    onClick={()=>{setMode("login");setError("");}}>Login</button>
          <button className={`auth-tab ${mode==="register"?"active":""}`} onClick={()=>{setMode("register");setError("");}}>Register</button>
        </div>

        {mode==="register"&&(
          <div className="fg"><label>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
          </div>
        )}
        <div className="fg"><label>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div className="fg"><label>Password</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn1" style={{width:"100%",justifyContent:"center",padding:"10px",fontSize:13,marginTop:4}} onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : mode==="login" ? "Login →" : "Create Account →"}
        </button>

        <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"var(--color-text-secondary)"}}>
          {mode==="login"
            ? <>No account? <span className="auth-link" onClick={()=>{setMode("register");setError("");}}>Register free</span></>
            : <>Have account? <span className="auth-link" onClick={()=>{setMode("login");setError("");}}>Login</span></>
          }
        </div>

        {!BASE && (
          <div style={{marginTop:12,background:"var(--color-background-danger)",color:"var(--color-text-danger)",fontSize:11,padding:"8px 10px",borderRadius:"var(--border-radius-md)"}}>
            ⚠️ VITE_API_URL not set in Railway frontend variables
          </div>
        )}

        <div className="auth-demo">
          <i className="ti ti-info-circle" style={{fontSize:13,marginRight:5}}/>
          {mode==="register" ? "First account registered becomes SuperAdmin" : "Register a free account to get started"}
        </div>
      </div>
    </div>
  );
}

// ── Tree Node ─────────────────────────────────────────────
function FTNode({node,persons,selId,onSel,onAdd}){
  const [col,setCol] = useState(false);
  const p = persons[node.id]; if(!p) return null;
  const kids = node.children||[]; const hk = kids.length>0;
  return (
    <div className="ftn">
      <div className={`ftb ${selId===node.id?"fts":""} ${node.id==="root"?"ftroot":""} ${p.education?"ftgrad":""}`} onClick={()=>onSel(node.id)}>
        {p.photo?<img src={p.photo} alt="" className="ftavi"/>:<div className="ftav">{(p.nameEn||"?")[0]}</div>}
        <div className="ftnm">{p.name}</div>
        <div className="ften">{p.nameEn}</div>
        {p.education&&<div className="ftdg">{p.education}</div>}
        <button className="ftadd" onClick={e=>{e.stopPropagation();onAdd(node.id);}}>+</button>
        {hk&&<button className="ftcol" onClick={e=>{e.stopPropagation();setCol(v=>!v);}}>{col?"▶":"▼"}</button>}
      </div>
      {hk&&!col&&(
        <><div className="ftvl"/>
          <div className="fthr">
            {kids.map((c,i)=>(
              <div key={c.id} className={`ftcc ${i===0?"ftcf":""} ${i===kids.length-1?"ftcl":""} ${kids.length===1?"ftco":""}`}>
                <div className="ftvs"/><FTNode node={c} persons={persons} selId={selId} onSel={onSel} onAdd={onAdd}/>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Person Panel ──────────────────────────────────────────
function PersonPanel({pid,persons,onClose,onSave,onAddRel}){
  const [form,setForm] = useState({...persons[pid]});
  const fileRef = useRef();
  useEffect(()=>setForm({...persons[pid]}),[pid,persons]);
  if(!persons[pid]) return null;
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const onPhoto = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,photo:ev.target.result})); r.readAsDataURL(f);
  };
  return (
    <div className="pp">
      <div className="pph">
        <div className="ppaw">
          {form.photo?<img src={form.photo} className="ppai" alt=""/>:<div className="ppap">{(form.nameEn||"?")[0]}</div>}
          <button className="ppcam" onClick={()=>fileRef.current.click()}><i className="ti ti-camera" style={{fontSize:11}}/></button>
          <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onPhoto}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:500,fontSize:14,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.name}</div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{form.nameEn}</div>
        </div>
        <button onClick={onClose} className="iconbtn">✕</button>
      </div>
      <div className="ppb">
        {[["name","Telugu Name","తెలుగు పేరు"],["nameEn","English Name","Full name"],
          ["birth","Birth Year","e.g. 1950"],["education","Education","e.g. B.Tech"],
          ["occupation","Occupation","Job"],["notes","Notes","Extra info"]
        ].map(([k,lbl,ph])=>(
          <div className="fg" key={k}><label>{lbl}</label>
            {k==="notes"
              ?<textarea value={form[k]||""} onChange={upd(k)} placeholder={ph} rows={2} style={{width:"100%",fontSize:12}}/>
              :<input value={form[k]||""} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/>
            }
          </div>
        ))}
      </div>
      <div className="ppf">
        <button className="btn2" onClick={()=>onAddRel(pid)}><i className="ti ti-users-plus" style={{fontSize:12,marginRight:3}}/>Relation</button>
        <button className="btn1" onClick={()=>onSave(form)}><i className="ti ti-device-floppy" style={{fontSize:12,marginRight:3}}/>Save</button>
      </div>
    </div>
  );
}

// ── AI Chat ───────────────────────────────────────────────
function AIChat({tree,onClose}){
  const [msgs,setMsgs]     = useState([{role:"assistant",text:"నమస్కారం! 🙏 I am your Family Tree AI.\n\nAsk me:\n• \"Who has a B.Tech degree?\"\n• \"How many generations?\"\n• \"Add a sister to root person\""}]);
  const [inp,setInp]       = useState("");
  const [loading,setLoad]  = useState(false);
  const endRef             = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

  const send = async () => {
    if(!inp.trim()||loading) return;
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
        <i className="ti ti-sparkles" style={{fontSize:14,color:"var(--color-text-info)"}}/>
        <span style={{fontWeight:500,fontSize:12}}>AI సహాయకుడు</span>
        <button onClick={onClose} className="iconbtn" style={{marginLeft:"auto"}}>✕</button>
      </div>
      <div className="aim">
        {msgs.map((m,i)=>(
          <div key={i} className={`aimr ${m.role==="user"?"aimu":"aima"}`}><div className="aib">{m.text}</div></div>
        ))}
        {loading&&<div className="aima"><div className="aib aitp">●●●</div></div>}
        <div ref={endRef}/>
      </div>
      <div className="aiir">
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your family tree…"/>
        <button onClick={send} className="btn1" style={{padding:"5px 10px"}} disabled={loading}><i className="ti ti-send" style={{fontSize:12}}/></button>
      </div>
    </div>
  );
}

// ── Add Relation Modal ────────────────────────────────────
function AddRelModal({pid,persons,onClose,onAdd}){
  const [rel,setRel]   = useState("Son");
  const [mode,setMode] = useState("new");
  const [name,setName] = useState(""); const [nameEn,setNameEn]=useState(""); const [edu,setEdu]=useState(""); const [exId,setExId]=useState("");
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:500}}>Add Relation · {persons[pid]?.nameEn}</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div className="fg"><label>Relation Type</label>
          <select value={rel} onChange={e=>setRel(e.target.value)} style={{width:"100%",fontSize:12}}>{REL_TYPES.map(r=><option key={r}>{r}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <button className={mode==="new"?"btn1":"btn2"} onClick={()=>setMode("new")}>New Person</button>
          <button className={mode==="existing"?"btn1":"btn2"} onClick={()=>setMode("existing")}>Existing</button>
        </div>
        {mode==="new"?<>
          <div className="fg"><label>Telugu Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="తెలుగు పేరు" style={{width:"100%",fontSize:12}}/></div>
          <div className="fg"><label>English Name</label><input value={nameEn} onChange={e=>setNameEn(e.target.value)} placeholder="English name" style={{width:"100%",fontSize:12}}/></div>
          <div className="fg"><label>Education</label><input value={edu} onChange={e=>setEdu(e.target.value)} placeholder="e.g. B.Tech" style={{width:"100%",fontSize:12}}/></div>
        </>:(
          <div className="fg"><label>Select Person</label>
            <select value={exId} onChange={e=>setExId(e.target.value)} style={{width:"100%",fontSize:12}}>
              <option value="">-- Select --</option>
              {Object.values(persons).filter(x=>x.id!==pid).map(x=><option key={x.id} value={x.id}>{x.nameEn} ({x.name})</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={()=>onAdd({rel,mode,pid,name,nameEn,edu,exId})}>Add</button></div>
    </div></div>
  );
}

// ── Permissions Modal ─────────────────────────────────────
function PermModal({tree,onClose,onSave}){
  const [vis,setVis]       = useState(tree.visibility);
  const [inv,setInv]       = useState("");
  const [viewers,setView]  = useState([...(tree.viewers||[])]);
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:500}}>Permissions / అనుమతులు</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["private","ti-lock","Private","Invited only"],["public","ti-world","Public","Anyone with link"]].map(([v,ic,lbl,desc])=>(
            <div key={v} className={`po ${vis===v?"poa":""}`} onClick={()=>setVis(v)}>
              <i className={`ti ${ic}`} style={{fontSize:18,color:vis===v?"var(--color-text-info)":"var(--color-text-tertiary)"}}/>
              <div><div style={{fontWeight:500,fontSize:12}}>{lbl}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div style={{fontSize:12,fontWeight:500,marginBottom:6}}>Admins</div>
        {(tree.admins||[]).map(a=><div key={a} className="pu"><i className="ti ti-crown" style={{fontSize:10,color:"var(--color-text-warning)"}}/> {a}</div>)}
        <div style={{fontSize:12,fontWeight:500,margin:"10px 0 6px"}}>Viewers</div>
        {viewers.length===0?<div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>None yet</div>
          :viewers.map(v=><div key={v} className="pu"><i className="ti ti-eye" style={{fontSize:10}}/> {v}
            <button onClick={()=>setView(vv=>vv.filter(x=>x!==v))} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--color-text-danger)",fontSize:11}}>✕</button>
          </div>)}
        <div style={{marginTop:10}}>
          <label style={{fontSize:10,color:"var(--color-text-secondary)"}}>Invite by email</label>
          <div style={{display:"flex",gap:6,marginTop:4}}>
            <input value={inv} onChange={e=>setInv(e.target.value)} placeholder="email@example.com" style={{flex:1,fontSize:12}}/>
            <button className="btn2" onClick={()=>{if(inv.trim()){setView(v=>[...v,inv.trim()]);setInv("");}}}>Invite</button>
          </div>
        </div>
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={()=>onSave({visibility:vis,admins:tree.admins,viewers})}>Save</button></div>
    </div></div>
  );
}

// ── New Tree Modal ────────────────────────────────────────
function NewTreeModal({onClose,onCreate}){
  const [name,setName]     = useState(""); const [nameEn,setNameEn]=useState(""); const [vis,setVis]=useState("private");
  const [loading,setLoad]  = useState(false);
  const submit = async () => {
    if(!name||!nameEn) return;
    setLoad(true);
    try { const t=await api("POST","/api/trees",{name,nameEn,visibility:vis}); onCreate(t); }
    catch  { onCreate({id:"t"+Date.now(),name,nameEn,visibility:vis,members:0,admins:["You"],viewers:[],persons:{},rootNode:null,createdAt:new Date().toISOString().slice(0,10)}); }
    setLoad(false);
  };
  return (
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:500}}>New Family Tree</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div className="fg"><label>Telugu Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. కొత్రపల్లి వంశవృక్షం" style={{width:"100%"}}/></div>
        <div className="fg"><label>English Name</label><input value={nameEn} onChange={e=>setNameEn(e.target.value)} placeholder="e.g. Kotrapalli Family Tree" style={{width:"100%"}}/></div>
        <div className="fg"><label>Visibility</label>
          <select value={vis} onChange={e=>setVis(e.target.value)} style={{width:"100%"}}>
            <option value="private">Private — only me</option>
            <option value="public">Public — anyone with link</option>
          </select>
        </div>
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" disabled={!name||!nameEn||loading} onClick={submit}>{loading?"Creating…":"Create Tree"}</button></div>
    </div></div>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard({trees,onOpen,onNew,user}){
  return (
    <div className="dash">
      <div className="dh">
        <div>
          <div style={{fontSize:20,fontWeight:500}}>నా వంశవృక్షాలు</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>Welcome, {user?.name}</div>
        </div>
        <button className="btn1" onClick={onNew}><i className="ti ti-plus" style={{fontSize:12,marginRight:4}}/>New Tree</button>
      </div>
      {trees.length===0?(
        <div className="empty-state">
          <i className="ti ti-binary-tree" style={{fontSize:54,color:"var(--color-text-tertiary)",display:"block",marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:500,marginBottom:6}}>No family trees yet</div>
          <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:16}}>Create your first family tree to get started</div>
          <button className="btn1" onClick={onNew}><i className="ti ti-plus" style={{fontSize:12,marginRight:4}}/>Create First Tree</button>
        </div>
      ):(
        <div className="dcards">
          {trees.map(t=>(
            <div key={t.id} className="dcard" onClick={()=>onOpen(t)}>
              <div style={{marginBottom:10}}><i className="ti ti-binary-tree" style={{fontSize:34,color:"var(--color-text-secondary)"}}/></div>
              <div style={{fontWeight:500,fontSize:14}}>{t.name}</div>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>{t.nameEn}</div>
              <div style={{display:"flex",gap:10,marginTop:8,fontSize:10,color:"var(--color-text-tertiary)"}}>
                <span><i className="ti ti-users" style={{fontSize:10,marginRight:2}}/>{t.members||t._count?.persons||0} members</span>
                <span><i className={`ti ti-${t.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{t.visibility}</span>
              </div>
            </div>
          ))}
          <div className="dcard dcnew" onClick={onNew}>
            <i className="ti ti-plus" style={{fontSize:28,color:"var(--color-text-secondary)",marginBottom:8}}/>
            <div style={{fontWeight:500,fontSize:12}}>New Tree</div>
          </div>
        </div>
      )}
      <div className="dfeat">
        <div style={{fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:8}}>Platform Features</div>
        <div className="dfgrid">
          {[["ti-language","Bilingual","Telugu & English"],["ti-users-plus","Relations","14+ types"],["ti-photo","Photos","Profile pics"],["ti-lock","Private","Access control"],["ti-sparkles","AI Chat","Smart assistant"],["ti-shield-lock","Admin Panel","Full control"]].map(([ic,t,d])=>(
            <div key={t} className="dfitem">
              <i className={`ti ${ic}`} style={{fontSize:16,color:"var(--color-text-info)",marginBottom:4}}/>
              <div style={{fontWeight:500,fontSize:11}}>{t}</div>
              <div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:1}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tree Editor ───────────────────────────────────────────
function TreeEditor({tree,setTree,onBack}){
  const [selP,setSelP]         = useState(null);
  const [showAI,setShowAI]     = useState(false);
  const [showRel,setShowRel]   = useState(false);
  const [relFor,setRelFor]     = useState(null);
  const [showPerm,setShowPerm] = useState(false);

  const savePerson = p => setTree(t=>({...t,persons:{...t.persons,[p.id]:p}}));

  const addRel = ({rel,mode,pid,name,nameEn,edu,exId}) => {
    if(mode==="new"&&!nameEn.trim()) return;
    if(mode==="existing"&&!exId) return;
    setTree(t=>{
      const nid="px"+Date.now();
      const np = mode==="new" ? {...t.persons,[nid]:{id:nid,name,nameEn,education:edu,photo:null,birth:"",occupation:"",notes:`${rel} of ${t.persons[pid]?.nameEn}`}} : t.persons;
      const tid = mode==="new" ? nid : exId;
      const addChild = n => n.id===pid ? {...n,children:[...(n.children||[]),{id:tid,children:[]}]} : n.children ? {...n,children:n.children.map(addChild)} : n;
      return {...t,persons:np,rootNode:t.rootNode?addChild(t.rootNode):{id:tid,children:[]},members:(t.members||0)+(mode==="new"?1:0)};
    });
    setShowRel(false);
  };

  const hasPersons = tree.rootNode && tree.persons && tree.persons[tree.rootNode?.id];

  return (
    <div className="te">
      <div className="tb">
        <button className="btn2" style={{padding:"4px 9px",fontSize:11}} onClick={onBack}><i className="ti ti-chevron-left" style={{fontSize:10}}/>Trees</button>
        <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{tree.nameEn}</span>
        <span style={{fontSize:10,color:"var(--color-text-tertiary)",marginLeft:4}}>· {tree.members||0} members</span>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button className="btn2" style={{padding:"4px 9px",fontSize:11}} onClick={()=>setShowPerm(true)}>
            <i className={`ti ti-${tree.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{tree.visibility}
          </button>
          <button className="btn1" style={{padding:"4px 9px",fontSize:11}} onClick={()=>{
            if(!hasPersons){
              const nm=window.prompt("Telugu name of first person:")||"వ్యక్తి";
              const en=window.prompt("English name:")||"Person";
              setTree(t=>({...t,persons:{...t.persons,root:{id:"root",name:nm,nameEn:en,education:"",photo:null,birth:"",occupation:"",notes:""}},rootNode:{id:"root",children:[]},members:1}));
            }else{setRelFor(tree.rootNode.id);setShowRel(true);}
          }}>
            <i className="ti ti-user-plus" style={{fontSize:10,marginRight:3}}/>{hasPersons?"Add Person":"Add First Person"}
          </button>
        </div>
      </div>

      <div className="tm">
        <div className="tc">
          {hasPersons?(
            <div style={{overflow:"visible",minWidth:"max-content"}}>
              <FTNode node={tree.rootNode} persons={tree.persons} selId={selP} onSel={setSelP} onAdd={id=>{setRelFor(id);setShowRel(true);}}/>
            </div>
          ):(
            <div className="empty-state">
              <i className="ti ti-binary-tree" style={{fontSize:52,color:"var(--color-text-tertiary)",display:"block",marginBottom:10}}/>
              <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>Empty Tree</div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>Click "Add First Person" to start</div>
            </div>
          )}
        </div>
        {selP&&<PersonPanel pid={selP} persons={tree.persons} onClose={()=>setSelP(null)} onSave={savePerson} onAddRel={id=>{setRelFor(id);setShowRel(true);}}/>}
      </div>

      <button className="aifab" onClick={()=>setShowAI(v=>!v)} title="AI Assistant">
        <i className="ti ti-sparkles" style={{fontSize:17,color:"var(--color-text-info)"}}/>
      </button>

      {showAI   && <AIChat tree={tree} onClose={()=>setShowAI(false)}/>}
      {showRel  && relFor && <AddRelModal pid={relFor} persons={tree.persons} onClose={()=>setShowRel(false)} onAdd={addRel}/>}
      {showPerm && <PermModal tree={tree} onClose={()=>setShowPerm(false)} onSave={({visibility,admins,viewers})=>{setTree(t=>({...t,visibility,admins,viewers}));setShowPerm(false);}}/>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App(){
  const [user,setUser]           = useState(()=>{ try{return JSON.parse(localStorage.getItem("ft_user"));}catch{return null;} });
  const [view,setView]           = useState("dashboard");
  const [trees,setTrees]         = useState([SAMPLE_TREE]);
  const [activeTree,setActiveTree] = useState(null);
  const [showNewTree,setShowNew] = useState(false);
  const isAdmin = user?.role==="ADMIN"||user?.role==="SUPERADMIN";

  useEffect(()=>{
    if(!user) return;
    api("GET","/api/trees").then(data=>{
      const all=[...(data.owned||[]),...(data.shared||[])];
      setTrees(all.length>0 ? all : [SAMPLE_TREE]);
    }).catch(()=>setTrees([SAMPLE_TREE]));
  },[user]);

  const handleLogin  = u => { setUser(u); };
  const handleLogout = () => { localStorage.removeItem("ft_token"); localStorage.removeItem("ft_user"); setUser(null); setView("dashboard"); setActiveTree(null); };
  const openTree     = t => { setActiveTree({...t}); setView("tree"); };
  const createTree   = t => { setTrees(ts=>[...ts.filter(x=>x.id!=="demo"),t]); setShowNew(false); openTree(t); };

  if(!user) return <><GS/><AuthPage onLogin={handleLogin}/></>;

  return (
    <><GS/>
      <div className="app">
        <header className="apph">
          <div className="logo">
            <i className="ti ti-binary-tree-2" style={{fontSize:17,color:"var(--color-text-info)"}}/>
            వంశవృక్షం
            <span style={{fontSize:9,fontWeight:400,color:"var(--color-text-tertiary)",marginLeft:3}}>SaaS</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
            <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{user.name}</span>
            {isAdmin&&(
              <button className="btn2" style={{padding:"3px 9px",fontSize:11}} onClick={()=>setView("admin")}>
                <i className="ti ti-shield-lock" style={{fontSize:11,marginRight:3}}/>Admin
              </button>
            )}
            <button className="btn2" style={{padding:"3px 9px",fontSize:11}} onClick={handleLogout}>
              <i className="ti ti-logout" style={{fontSize:11,marginRight:3}}/>Logout
            </button>
          </div>
        </header>

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {view==="dashboard" && <Dashboard trees={trees} user={user} onOpen={openTree} onNew={()=>setShowNew(true)}/>}
          {view==="admin"     && <AdminPanel user={user} onBack={()=>setView("dashboard")}/>}
          {view==="tree"      && activeTree && <TreeEditor tree={activeTree} setTree={setActiveTree} onBack={()=>setView("dashboard")}/>}
        </div>

        {showNewTree && <NewTreeModal onClose={()=>setShowNew(false)} onCreate={createTree}/>}
      </div>
    </>
  );
}

// ── Global Styles ─────────────────────────────────────────
function GS(){return <style>{`
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Noto Sans Telugu",system-ui,sans-serif;font-size:13px}
  input,select,textarea,button{font-family:inherit}
  input,select,textarea{background:var(--color-background-primary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:7px 10px;color:var(--color-text-primary);font-size:12px;outline:none;width:100%}
  input:focus,select:focus,textarea:focus{border-color:var(--color-border-info)}
  .auth-bg{min-height:100vh;background:var(--color-background-tertiary);display:flex;align-items:center;justify-content:center;padding:16px}
  .auth-card{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:28px 24px;width:100%;max-width:360px}
  .auth-tabs{display:flex;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);overflow:hidden;margin-bottom:18px}
  .auth-tab{flex:1;padding:8px;font-size:12px;font-weight:500;background:transparent;border:none;cursor:pointer;color:var(--color-text-secondary)}
  .auth-tab.active{background:var(--color-background-info);color:var(--color-text-info)}
  .auth-error{background:var(--color-background-danger);color:var(--color-text-danger);font-size:12px;padding:8px 10px;border-radius:var(--border-radius-md);margin-bottom:10px;word-break:break-word}
  .auth-link{color:var(--color-text-info);cursor:pointer;text-decoration:underline}
  .auth-demo{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:8px 10px;font-size:11px;color:var(--color-text-secondary);margin-top:14px;display:flex;align-items:center}
  .app{min-height:100vh;background:var(--color-background-tertiary);display:flex;flex-direction:column}
  .apph{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)}
  .logo{display:flex;align-items:center;gap:6px;font-weight:500;font-size:14px;color:var(--color-text-primary)}
  .iconbtn{background:none;border:none;cursor:pointer;color:var(--color-text-secondary);font-size:14px;padding:2px;display:flex;align-items:center}
  .btn1{background:transparent;border:0.5px solid var(--color-border-info);color:var(--color-text-info);padding:6px 13px;border-radius:var(--border-radius-md);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:2px;white-space:nowrap}
  .btn1:hover{background:var(--color-background-info)}.btn1:disabled{opacity:.5;cursor:not-allowed}
  .btn2{background:transparent;border:0.5px solid var(--color-border-secondary);color:var(--color-text-secondary);padding:6px 13px;border-radius:var(--border-radius-md);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:2px;white-space:nowrap}
  .btn2:hover{background:var(--color-background-secondary)}
  .dash{padding:20px;max-width:900px;margin:0 auto;width:100%;overflow-y:auto}
  .dh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px}
  .dcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:12px;margin-bottom:20px}
  .dcard{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:14px;cursor:pointer;transition:border-color .12s}
  .dcard:hover{border-color:var(--color-border-secondary)}
  .dcnew{display:flex;flex-direction:column;align-items:center;justify-content:center;border-style:dashed;min-height:120px}
  .dfeat{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:12px}
  .dfgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
  .dfitem{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:9px;text-align:center}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center;flex:1}
  .te{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .tb{display:flex;align-items:center;gap:7px;padding:7px 14px;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);flex-wrap:wrap}
  .tm{display:flex;flex:1;overflow:hidden}
  .tc{flex:1;overflow:auto;padding:24px 24px 80px;display:flex;justify-content:center;align-items:flex-start}
  .ftn{display:flex;flex-direction:column;align-items:center;position:relative}
  .ftb{display:inline-flex;flex-direction:column;align-items:center;padding:8px 11px 6px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);cursor:pointer;text-align:center;transition:all .12s;position:relative;min-width:85px;max-width:115px;user-select:none}
  .ftb:hover{border-color:var(--color-border-primary);background:var(--color-background-secondary)}
  .ftb:hover .ftadd{display:flex}
  .fts{border-color:var(--color-border-info)!important;background:var(--color-background-info)!important}
  .ftroot{border-color:var(--color-border-info);background:var(--color-background-info)}.ftgrad{border-color:var(--color-border-success)}
  .ftav{width:30px;height:30px;border-radius:50%;background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:4px;flex-shrink:0}
  .ftavi{width:30px;height:30px;border-radius:50%;object-fit:cover;margin-bottom:4px}
  .ftnm{font-size:11px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px}
  .ften{font-size:9px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px}
  .ftdg{font-size:9px;color:var(--color-text-success);margin-top:2px}
  .ftadd{position:absolute;top:-7px;right:-7px;width:16px;height:16px;border-radius:50%;background:var(--color-background-info);border:0.5px solid var(--color-border-info);color:var(--color-text-info);font-size:13px;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;font-weight:500}
  .ftcol{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:14px;height:14px;border-radius:50%;background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);cursor:pointer;font-size:7px;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;color:var(--color-text-tertiary)}
  .ftvl{width:1px;height:20px;background:var(--color-border-secondary);flex-shrink:0}
  .ftvs{width:1px;height:16px;background:var(--color-border-secondary);flex-shrink:0}
  .fthr{display:flex;flex-direction:row;align-items:flex-start}
  .ftcc{display:flex;flex-direction:column;align-items:center;padding:0 7px;position:relative}
  .ftcc::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:var(--color-border-secondary)}
  .ftcf::before{left:50%}.ftcl::before{right:50%}.ftco::before{display:none}
  .pp{width:265px;min-width:245px;background:var(--color-background-primary);border-left:0.5px solid var(--color-border-tertiary);display:flex;flex-direction:column;overflow:hidden}
  .pph{display:flex;align-items:center;gap:9px;padding:11px 13px;border-bottom:0.5px solid var(--color-border-tertiary)}
  .ppaw{position:relative;flex-shrink:0}
  .ppai{width:42px;height:42px;border-radius:50%;object-fit:cover}
  .ppap{width:42px;height:42px;border-radius:50%;background:var(--color-background-info);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:500;color:var(--color-text-info)}
  .ppcam{position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  .ppb{flex:1;overflow-y:auto;padding:11px 13px}.ppf{padding:9px 13px;border-top:0.5px solid var(--color-border-tertiary);display:flex;gap:7px}
  .fg{margin-bottom:9px}.fg label{display:block;font-size:10px;color:var(--color-text-secondary);margin-bottom:3px;font-weight:500;text-transform:uppercase;letter-spacing:0.3px}
  .aic{position:fixed;bottom:68px;right:14px;width:290px;background:var(--color-background-primary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-lg);display:flex;flex-direction:column;z-index:1000;max-height:430px}
  .aih{display:flex;align-items:center;gap:7px;padding:9px 11px;border-bottom:0.5px solid var(--color-border-tertiary)}
  .aim{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;min-height:170px;max-height:290px}
  .aimr{display:flex}.aimu{justify-content:flex-end}
  .aib{padding:7px 10px;border-radius:10px;font-size:12px;line-height:1.5;white-space:pre-wrap;max-width:88%}
  .aimu .aib{background:var(--color-background-info);color:var(--color-text-info)}
  .aima .aib{background:var(--color-background-secondary);color:var(--color-text-primary)}
  .aitp{color:var(--color-text-tertiary);font-size:16px;letter-spacing:2px;animation:pulse 1s infinite}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  .aiir{display:flex;gap:7px;padding:9px 11px;border-top:0.5px solid var(--color-border-tertiary)}
  .aiir input{flex:1;font-size:12px;width:auto}
  .aifab{position:fixed;bottom:14px;right:14px;width:44px;height:44px;border-radius:50%;background:var(--color-background-info);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:999}
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:2000;display:flex;align-items:center;justify-content:center;padding:14px}
  .mb{background:var(--color-background-primary);border-radius:var(--border-radius-lg);width:100%;max-width:400px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden}
  .mh{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:0.5px solid var(--color-border-tertiary);font-size:13px}
  .mbd{padding:14px;overflow-y:auto;flex:1}
  .mf{padding:11px 14px;border-top:0.5px solid var(--color-border-tertiary);display:flex;gap:8px;justify-content:flex-end}
  .po{flex:1;display:flex;align-items:center;gap:9px;padding:9px 11px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer}
  .poa{border-color:var(--color-border-info);background:var(--color-background-info)}
  .pu{display:flex;align-items:center;gap:5px;font-size:11px;padding:3px 0;color:var(--color-text-secondary)}
`}</style>;}
