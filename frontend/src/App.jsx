import { useState, useRef, useEffect } from "react";

// ── API ───────────────────────────────────────────────────
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
  let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid server response"); }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const claude = async (messages, system, maxTokens = 500) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, ...(system ? { system } : {}), messages }),
  });
  const d = await res.json();
  return d.content?.find(c => c.type === "text")?.text || "";
};

// ── Constants ─────────────────────────────────────────────
const BLOOD_RELS   = ["Child","Son","Daughter","Father","Mother","Parent","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece"];
const PARTNER_RELS = ["Partner","Wife","Husband","Ex-Partner","Ex-Wife","Ex-Husband"];
const ALL_RELS     = [...BLOOD_RELS, ...PARTNER_RELS];
const GEN_COLORS   = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#14b8a6"];

const parseTreeName = name => {
  if (!name) return { village:"", surname:"" };
  const p = name.split("_");
  return { village: p[0]||"", surname: p[1]||"" };
};

// ── Theme ─────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("ft_theme") || "dark");
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("ft_theme", theme); }, [theme]);
  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

// Translation removed - requires API key in browser

// Sample data
const SP = {
  root:{ id:"root",name:"శ్రీ పద్మరాజు",nameEn:"Sri Padmaraju",education:"",photo:null,birth:"1920",death:"1995",occupation:"",notes:"",spouseId:"sw",gender:"male",memberNo:1 },
  sw:  { id:"sw",  name:"సావిత్రమ్మ", nameEn:"Savithramma", education:"",photo:null,birth:"1925",death:"2000",occupation:"",notes:"",spouseId:"root",gender:"female",memberNo:2 },
  p1:  { id:"p1",  name:"నరసరాజు",    nameEn:"Narasaraju",  education:"",photo:null,birth:"1948",death:null, occupation:"",notes:"",spouseId:null,gender:"male",memberNo:3 },
  p2:  { id:"p2",  name:"లక్ష్మి",     nameEn:"Lakshmi",    education:"M.A",photo:null,birth:"1952",death:null,occupation:"Teacher",notes:"",spouseId:null,gender:"female",memberNo:4 },
};
const SR   = { id:"root", children:[{ id:"p1", children:[{ id:"p2", children:[] }] }] };
const DEMO = { id:"demo",name:"Kotrapalli_Krishna_1",nameEn:"Kotrapalli_Krishna_1",visibility:"private",members:4,admins:["You"],viewers:[],persons:SP,rootNode:SR,createdAt:"2024-01-15",memberCounter:4 };

// ─────────────────────────────────────────────────────────
// PERSON CARD (matches reference design)
// ─────────────────────────────────────────────────────────
function PersonCard({ person, selected, onClick, onEdit, onDelete, onAdd, onLinkTree, depth, isSpouse=false }) {
  if (!person) return null;
  const isFemale = person.gender === "female";
  const ringColor = isFemale ? "#ec4899" : GEN_COLORS[depth % GEN_COLORS.length];
  const initials  = (person.nameEn || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const dobDisplay  = person.dobActual || person.dobRecords || person.birth || "";
  const dodDisplay  = !person.isAlive && person.dateOfDeath ? person.dateOfDeath : (person.death||"");
  const years       = [dobDisplay, dodDisplay].filter(Boolean).map(d => d.length > 4 ? d.slice(0,4) : d).join(" – ");

  return (
    <div className={`pc ${selected ? "pc-sel" : ""}`} style={{ "--ring": ringColor }} onClick={onClick}>
      {/* Photo - overlaps top of card */}
      <div className="pc-photo-wrap">
        <div className="pc-ring" style={{ borderColor: ringColor, background: `${ringColor}11` }}>
          {person.photo
            ? <img src={person.photo} alt="" className="pc-img" />
            : person.avatar
            ? (() => {
                const avColors = person.gender==="female" ? FEMALE_AVATARS : MALE_AVATARS;
                const idx = parseInt(person.avatar.slice(1)) || 0;
                const avColor = avColors[idx % avColors.length] || ringColor;
                return <div className="pc-av" style={{ background:`${avColor}33`, color:avColor }}>
                  <i className={`ti ti-${person.gender==="female"?"user-circle":"user"}`} style={{ fontSize:26 }}/>
                </div>;
              })()
            : <div className="pc-av" style={{ color: ringColor }}>
                {isFemale ? <i className="ti ti-user-circle" style={{ fontSize: 26 }} /> : initials}
              </div>
          }
        </div>
        {/* Member number badge */}
        <div className="pc-num">{person.memberNo || "—"}</div>
        {/* Gender badge */}
        <div className="pc-gbadge" style={{ background: ringColor }}>{isFemale ? "♀" : "♂"}</div>
      </div>

      {/* Card body */}
      <div className="pc-body">
        <div className="pc-name">{person.nameEn || "—"}</div>
        {person.nickname && <div className="pc-name-te" style={{fontStyle:"italic"}}>"{person.nickname}"</div>}
        {years && <div className="pc-years">{years}</div>}
        {person.education && <div className="pc-edu" style={{ color: ringColor }}>{person.education}</div>}
        {person.childNumber && <div className="pc-years">Child #{person.childNumber}</div>}
      </div>

      {/* Action bar */}
      <div className="pc-acts">
        <button className="pc-btn" onClick={e=>{e.stopPropagation();onEdit(person.id);}} title="Edit"><i className="ti ti-pencil" style={{fontSize:11}}/></button>
        <button className="pc-btn pc-del" onClick={e=>{e.stopPropagation();onDelete(person.id);}} title="Delete"><i className="ti ti-trash" style={{fontSize:11}}/></button>
        {isSpouse
          ? <button className="pc-btn" onClick={e=>{e.stopPropagation();onLinkTree&&onLinkTree(person);}} title="Link to family tree"
              style={{color:"#6366f1",borderColor:"#6366f1aa",background:"#6366f111"}}>
              <i className="ti ti-link" style={{fontSize:11}}/>
            </button>
          : <button className="pc-btn pc-add" onClick={e=>{e.stopPropagation();onAdd(person.id);}} title="Add relation">
              <i className="ti ti-plus" style={{fontSize:11}}/>
            </button>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TREE NODE with collapse dot on connecting line
// ─────────────────────────────────────────────────────────
function FTNode({ node, persons, selId, onSel, onEdit, onDelete, onAdd, onLinkTree, depth = 0 }) {
  const [col, setCol] = useState(depth >= 3);
  const person = persons[node.id]; if (!person) return null;
  const spouse = person.spouseId ? persons[person.spouseId] : null;
  const kids   = (node.children || []).filter(c => c.id !== person.spouseId && persons[c.id]);
  const hk     = kids.length > 0;
  const lc     = GEN_COLORS[(depth + 1) % GEN_COLORS.length];

  return (
    <div className="ftn">
      {/* Couple row */}
      <div className="ftn-row">
        <PersonCard person={person} selected={selId === node.id} onClick={() => onSel(node.id)} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} depth={depth} />
        {spouse && <>
          <div className="couple-conn">
            <div className="couple-line" />
            <span className="couple-heart">❤</span>
            <div className="couple-line" />
          </div>
          <PersonCard person={spouse} selected={selId===spouse.id} onClick={()=>onSel(spouse.id)} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} onLinkTree={onLinkTree} depth={depth} isSpouse={true}/>
        </>}
      </div>

      {/* Vertical line + COLLAPSE DOT at junction */}
      {hk && (
        <div className="ftn-vwrap">
          <div className="ftvl-top" style={{ background: `${lc}77` }} />
          <button
            className="collapse-dot"
            onClick={e => { e.stopPropagation(); setCol(v => !v); }}
            title={col ? "Expand children" : "Collapse children"}
          >{col ? "+" : "−"}</button>
          {!col && <div className="ftvl-bottom" style={{ background: `${lc}77` }} />}
        </div>
      )}

      {/* Children */}
      {hk && !col && (
        <div className="fthr">
          {kids.map((c, i) => (
            <div key={c.id}
              className={`ftcc ${i===0?"ftcf":""} ${i===kids.length-1?"ftcl":""} ${kids.length===1?"ftco":""}`}
              style={{ "--lc": `${lc}66` }}>
              <div className="ftvs" style={{ background: `${lc}66` }} />
              <FTNode node={c} persons={persons} selId={selId} onSel={onSel} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} onLinkTree={onLinkTree} depth={depth+1}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────────────────
const MALE_AVATARS   = ["#3b82f6","#0ea5e9","#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444"];
const FEMALE_AVATARS = ["#ec4899","#f43f5e","#a855f7","#e879f9","#fb7185","#f97316","#14b8a6","#84cc16"];

function AvatarPicker({ gender, selected, onSelect }) {
  const colors = gender === "female" ? FEMALE_AVATARS : MALE_AVATARS;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
      {colors.map((c,i) => {
        const id = `${gender[0]}${i}`;
        const isSelected = selected === id;
        return (
          <div key={id} onClick={() => onSelect(isSelected ? "" : id)}
            style={{ width:40, height:40, borderRadius:"50%", background:`${c}22`, border:`2px solid ${isSelected?c:"var(--border)"}`,
              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
              boxShadow: isSelected ? `0 0 0 2px ${c}44` : "none", transition:"all 0.15s", flexShrink:0 }}>
            <i className={`ti ti-${gender==="female"?"user-circle":"user"}`} style={{ fontSize:18, color:c }} />
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ADD RELATION MODAL — full featured
// ─────────────────────────────────────────────────────────
// ── Stable form helpers (must be OUTSIDE modal to prevent cursor jump) ──
const TI = ({ value, onChange, placeholder="", disabled=false, type="text" }) => (
  <input type={type} value={value||""} onChange={e => onChange && onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled}
    style={{ width:"100%", padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8,
      fontSize:12, background:disabled?"#f3f4f6":"#fff", color:disabled?"#6b7280":"#111827",
      outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
);

const FL = ({ label, children, style={} }) => (
  <div style={{ marginBottom:14, ...style }}>
    <div style={{ fontSize:12, fontWeight:500, color:"#374151", marginBottom:5 }}>{label}</div>
    {children}
  </div>
);


// ── Link Tree Modal — connect partner to their family tree ──
function LinkTreeModal({ person, trees, onClose, onLink }) {
  const village = person?.village || "";
  const villageTrees = trees.filter(t => t.name && t.name.startsWith(village));
  const [selectedTree, setSelectedTree] = useState("");

  return (
    <div className="ov" onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,width:"90%",maxWidth:460,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,color:"#111827"}}>
            <i className="ti ti-link" style={{marginRight:8,color:"#6366f1"}}/>
            Link to Family Tree
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
        </div>

        <div style={{background:"#f3f4f6",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#374151"}}>
          <strong>{person?.nameEn}</strong> · Village: <strong>{village||"—"}</strong> · Surname: <strong>{person?.surname||"—"}</strong>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:500,color:"#374151",marginBottom:6}}>
            Select Family Tree to Link
            {village && <span style={{color:"#6b7280",fontWeight:400}}> (showing trees from {village})</span>}
          </div>
          {villageTrees.length === 0 ? (
            <div style={{fontSize:12,color:"#9ca3af",padding:"12px",background:"#f9fafb",borderRadius:8,border:"1px solid #e5e7eb"}}>
              No trees found for village "{village}". All available trees shown below.
            </div>
          ) : null}
          <select value={selectedTree} onChange={e=>setSelectedTree(e.target.value)}
            style={{width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,marginTop:6,outline:"none"}}>
            <option value="">-- Select a tree --</option>
            {(villageTrees.length > 0 ? villageTrees : trees).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 20px",border:"1px solid #d1d5db",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,color:"#374151"}}>Cancel</button>
          <button onClick={()=>selectedTree&&onLink(person.id,selectedTree)} disabled={!selectedTree}
            style={{padding:"8px 20px",border:"none",borderRadius:8,background:"#6366f1",color:"#fff",cursor:selectedTree?"pointer":"not-allowed",fontSize:12,fontWeight:600,opacity:selectedTree?1:0.5}}>
            <i className="ti ti-link" style={{marginRight:5}}/>Link Tree
          </button>
        </div>
      </div>
    </div>
  );
}

const ADD_RELS = ["Child","Partner","Ex-Partner","Parent","Brother","Sister"];
const LOCKED_ADD  = ["Child","Brother","Sister","Parent"];
const PARTNER_ADD = ["Partner","Ex-Partner"];

function hasParentInTree(pid, node) {
  if (!node) return false;
  if ((node.children||[]).some(c => c.id === pid)) return true;
  return (node.children||[]).some(c => hasParentInTree(pid, c));
}

function AddRelModal({ pid, persons, treeVillage, treeSurname, villages, surnames, treeRootNode, onClose, onAdd }) {
  const person       = persons[pid];
  const parentExists = hasParentInTree(pid, treeRootNode);

  const [rel,       setRel]    = useState("Child");
  const [tab,       setTab]    = useState("personal");

  // Personal fields
  const [firstName, setFN]     = useState("");
  const [fullname,  setFull]   = useState(treeSurname || "");
  const [nickname,  setNick]   = useState("");
  const [gender,    setGender] = useState("male");
  const [childNo,   setChildNo]= useState("");
  const [childNoTxt,setCNTxt]  = useState("");
  const [isAlive,   setAlive]  = useState(true);
  const [dobActual, setDobA]   = useState("");
  const [dobRecords,setDobR]   = useState("");
  const [marriageDate,setMD]   = useState("");
  const [bloodGroup,setBG]     = useState("");
  const [dateOfDeath,setDod]   = useState("");
  const [selVil,    setSelVil] = useState("");
  const [selSur,    setSelSur] = useState("");

  // Biographical
  const [education, setEdu]    = useState("");
  const [occupation,setOcc]    = useState("");

  // Contact
  const [phone,     setPhone]  = useState("");
  const [email,     setEmail]  = useState("");
  const [address,   setAddr]   = useState("");
  const [notes,     setNotes]  = useState("");

  // Pictures
  const [photo,     setPhoto]  = useState("");
  const [avatar,    setAvatar] = useState("");
  const [coParentId, setCoParentId] = useState("");
  const fileRef = useRef();

  const locked      = LOCKED_ADD.includes(rel);
  const isPartner   = PARTNER_ADD.includes(rel);
  const showChildNo = ["Child","Brother","Sister"].includes(rel);
  const genderFixed = rel === "Brother" || rel === "Sister";

  // Auto-set when relation changes
  useEffect(() => {
    if      (rel === "Brother")                setGender("male");
    else if (rel === "Sister")                 setGender("female");
    else if (isPartner) setGender(person?.gender === "male" ? "female" : "male");
    else    setGender("male");
    setChildNo(""); setAvatar("");
    if (locked) setFull(treeSurname || "");
    else        setFull("");
  }, [rel]);

  // Auto-update fullname based on relation type
  useEffect(() => {
    if (locked) {
      // Blood relation: firstName + treeSurname
      setFull(firstName ? `${firstName} ${treeSurname || ""}`.trim() : treeSurname || "");
    } else {
      // Partner: firstName + selected surname
      const sur = selSur || "";
      setFull(firstName ? `${firstName} ${sur}`.trim() : sur);
    }
  }, [firstName, locked, treeSurname, selSur]);

  // Get used child numbers for siblings of pid
  const usedChildNums = (() => {
    const findNode = (node, id) => {
      if (!node) return null;
      if (node.id === id) return node;
      for (const c of (node.children || [])) { const r = findNode(c, id); if (r) return r; }
      return null;
    };
    const pidNode = findNode(treeRootNode, pid);
    return (pidNode?.children || []).map(c => persons[c.id]?.childNumber).filter(Boolean);
  })();

  const onPhotoFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setPhoto(ev.target.result); setAvatar(""); };
    r.readAsDataURL(f);
  };

  const submit = () => {
    const name = fullname?.trim() || firstName?.trim();
    if (!name) return;
    const childNumber = childNo === ">9" ? childNoTxt : childNo;
    onAdd({ rel, pid,
      nameEn: name, firstName, nickname, gender, childNumber,
      coParentId: rel === "Child" ? coParentId : "",
      village: locked ? treeVillage : selVil,
      surname: locked ? treeSurname : selSur,
      isAlive, dobActual, dobRecords, marriageDate, bloodGroup, dateOfDeath,
      education, occupation, phone, email, address, notes, photo, avatar });
  };

  const TABS = [
    { id:"personal",     label:"Personal" },
    { id:"contact",      label:"Contact" },
    { id:"biographical", label:"Biographical" },
    { id:"pictures",     label:"Pictures" },
  ];

  return (
    <div className="ov" onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:14, width:"96%", maxWidth:700, maxHeight:"94vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        boxShadow:"0 25px 60px rgba(0,0,0,0.35)", color:"#111827" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #e5e7eb",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>
            Add Relation · <span style={{ color:"#6366f1" }}>{person?.nameEn}</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"#9ca3af", lineHeight:1 }}>✕</button>
        </div>

        {/* ── Relation type buttons ── */}
        <div style={{ padding:"12px 20px 0", display:"flex", gap:8, flexWrap:"wrap", flexShrink:0 }}>
          {ADD_RELS.map(r => {
            const dis = r === "Parent" && parentExists;
            return (
              <button key={r} disabled={dis} onClick={() => !dis && setRel(r)}
                style={{ padding:"6px 18px", borderRadius:20, fontSize:12, fontWeight:600,
                  cursor: dis ? "not-allowed" : "pointer",
                  border:`1.5px solid ${rel===r?"#6366f1":"#d1d5db"}`,
                  background: rel===r ? "#6366f1" : "#fff",
                  color: rel===r ? "#fff" : dis ? "#9ca3af" : "#374151",
                  opacity: dis ? 0.5 : 1, transition:"all 0.15s" }}>
                {r}{dis ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", borderBottom:"1px solid #e5e7eb", padding:"0 20px",
          marginTop:10, flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"9px 18px", fontSize:12, fontWeight:600, cursor:"pointer",
                background: tab===t.id ? "#6366f1" : "transparent",
                color: tab===t.id ? "#fff" : "#9ca3af",
                border:"none", borderRadius:"8px 8px 0 0", marginRight:2,
                transition:"all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

          {/* ══ PERSONAL TAB ══ */}
          {tab === "personal" && <>

            {/* Row 1: Village | Surname | Relation Type */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <FL label="Village">
                {locked
                  ? <TI value={treeVillage} disabled/>
                  : <select value={selVil} onChange={e=>setSelVil(e.target.value)}
                      style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,outline:"none",background:"#fff"}}>
                      <option value="">-- Select --</option>
                      {villages.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
                    </select>}
              </FL>
              <FL label="Surname">
                {locked
                  ? <TI value={treeSurname} disabled/>
                  : <select value={selSur} onChange={e=>setSelSur(e.target.value)}
                      style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,outline:"none",background:"#fff"}}>
                      <option value="">-- Select --</option>
                      {surnames.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>}
              </FL>
              <FL label="Relation Type"><TI value={rel} disabled/></FL>
            </div>

            {/* Child Number */}
            {showChildNo && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#374151", marginBottom:8 }}>Child No</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => {
                    const used   = usedChildNums.includes(String(n));
                    const active = childNo === String(n);
                    return (
                      <button key={n} disabled={used} onClick={() => setChildNo(active ? "" : String(n))}
                        style={{ width:40, height:40, borderRadius:8, fontWeight:700, fontSize:13,
                          cursor: used ? "not-allowed" : "pointer",
                          border:`1.5px solid ${used?"#e5e7eb":"#10b981"}`,
                          background: active ? "#10b981" : "#fff",
                          color: active ? "#fff" : used ? "#d1d5db" : "#10b981",
                          opacity: used ? 0.5 : 1, transition:"all 0.15s" }}>
                        {n}
                      </button>
                    );
                  })}
                  <button onClick={() => setChildNo(childNo===">9" ? "" : ">9")}
                    style={{ padding:"0 14px", height:40, borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer",
                      border:`1.5px solid #10b981`,
                      background: childNo===">9" ? "#10b981" : "#fff",
                      color: childNo===">9" ? "#fff" : "#10b981", transition:"all 0.15s" }}>
                    &gt;9
                  </button>
                </div>
                {childNo === ">9" && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"#374151", marginBottom:4 }}>Child No Greater Than 9</div>
                    <TI value={childNoTxt} onChange={setCNTxt} placeholder="Enter Child No"/>
                  </div>
                )}
              </div>
            )}

            {/* Co-parent selection when adding a child */}
            {rel === "Child" && (() => {
              const partners = Object.values(persons).filter(p =>
                p.spouseId === pid || persons[pid]?.spouseId === p.id
              );
              return partners.length > 0 ? (
                <FL label="Mother / Father of this child">
                  <select value={coParentId} onChange={e=>setCoParentId(e.target.value)}
                    style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,outline:"none",background:"#fff"}}>
                    <option value="">-- Select partner (optional) --</option>
                    {partners.map(p=><option key={p.id} value={p.id}>{p.nameEn} {p.village?"("+p.village+")":""}</option>)}
                  </select>
                </FL>
              ) : null;
            })()}

            {/* Row: First Name | Fullname | Nickname */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <FL label="First Name:">
                <TI value={firstName}
                  onChange={v => { setFN(v); if (locked) setFull(`${v} ${treeSurname||""}`.trim()); }}
                  placeholder="Enter first name"/>
              </FL>
              <FL label="Fullname">
                <div style={{padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,
                  fontSize:12,background:"#f3f4f6",color: fullname?"#374151":"#9ca3af",minHeight:36,
                  display:"flex",alignItems:"center"}}>
                  {fullname || (locked ? `Enter First Name above to auto-fill` : `Select Surname to auto-fill`)}
                </div>
              </FL>
              <FL label="Nickname">
                <TI value={nickname} onChange={setNick} placeholder="Enter Nickname"/>
              </FL>
            </div>

            {/* Row: Gender radios + Alive toggle */}
            <div style={{ display:"flex", alignItems:"center", gap:28, marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                {["female","male"].map(v => (
                  <label key={v} style={{ display:"flex", alignItems:"center", gap:6, cursor:genderFixed?"default":"pointer", fontSize:13 }}>
                    <input type="radio" name="gender" value={v} checked={gender===v}
                      onChange={() => !genderFixed && setGender(v)} disabled={genderFixed}
                      style={{ accentColor:"#6366f1", width:15, height:15 }}/>
                    {v === "female" ? "Female" : "Male"}
                  </label>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div onClick={() => setAlive(v => !v)}
                  style={{ width:46, height:26, borderRadius:13, background:isAlive?"#6366f1":"#d1d5db",
                    cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:3, left:isAlive?21:3, width:20, height:20,
                    borderRadius:"50%", background:"#fff", transition:"left 0.2s",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }}/>
                </div>
                <span style={{ fontSize:13, color:"#374151" }}>This person is alive</span>
              </div>
            </div>

            {/* Dates + Blood Group row */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
              <FL label="Actual Birth Date:">
                <input type="date" value={dobActual} onChange={e=>setDobA(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:11,outline:"none",color:"#374151"}}/>
              </FL>
              <FL label="Birth Date (As Per ID):">
                <input type="date" value={dobRecords} onChange={e=>setDobR(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:11,outline:"none",color:"#374151"}}/>
              </FL>
              <FL label="Marriage Date:">
                <input type="date" value={marriageDate} onChange={e=>setMD(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:11,outline:"none",color:"#374151"}}/>
              </FL>
              <FL label="Blood Group">
                <select value={bloodGroup} onChange={e=>setBG(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,outline:"none",background:"#fff",color:"#374151"}}>
                  <option value="">--select--</option>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g=><option key={g}>{g}</option>)}
                </select>
              </FL>
            </div>

            {/* Date of Death (if deceased) */}
            {!isAlive && (
              <FL label="Date of Death">
                <input type="date" value={dateOfDeath} onChange={e=>setDod(e.target.value)}
                  style={{width:"50%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,outline:"none"}}/>
              </FL>
            )}

            {/* Photo URL */}
            <FL label="Photo:">
              <TI value={photo.startsWith?.("data:") ? "(uploaded)" : photo} onChange={v=>!v.startsWith?.("data:")&&setPhoto(v)} placeholder="Enter Photo URL"/>
            </FL>
          </>}

          {/* ══ CONTACT TAB ══ */}
          {tab === "contact" && <>
            <FL label="Phone Number"><TI value={phone} onChange={setPhone} placeholder="+91 99999 99999" type="tel"/></FL>
            <FL label="Email Address"><TI value={email} onChange={setEmail} placeholder="email@example.com" type="email"/></FL>
            <FL label="Address">
              <textarea value={address} onChange={e=>setAddr(e.target.value)} placeholder="House / Street / City / State" rows={3}
                style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
            </FL>
            <FL label="Notes">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional information…" rows={3}
                style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
            </FL>
          </>}

          {/* ══ BIOGRAPHICAL TAB ══ */}
          {tab === "biographical" && <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <FL label="Education"><TI value={education} onChange={setEdu} placeholder="e.g. B.Tech, M.A."/></FL>
              <FL label="Occupation"><TI value={occupation} onChange={setOcc} placeholder="Job / Profession"/></FL>
            </div>
            <FL label="Notes / Bio">
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Additional biographical information…" rows={4}
                style={{width:"100%",padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,resize:"vertical",outline:"none",fontFamily:"inherit"}}/>
            </FL>
          </>}

          {/* ══ PICTURES TAB ══ */}
          {tab === "pictures" && <>
            <FL label="Upload Photo">
              <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <div style={{width:90,height:90,borderRadius:"50%",border:"2px solid #e5e7eb",overflow:"hidden",flexShrink:0,background:"#f9fafb",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {photo && photo.startsWith("data:")
                    ? <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                    : <i className="ti ti-user" style={{fontSize:38,color:"#d1d5db"}}/>}
                </div>
                <div style={{flex:1}}>
                  <button onClick={()=>fileRef.current?.click()}
                    style={{width:"100%",padding:"9px",border:"1.5px solid #6366f1",borderRadius:8,background:"#fff",color:"#6366f1",cursor:"pointer",fontWeight:600,fontSize:12,marginBottom:8}}>
                    <i className="ti ti-upload" style={{marginRight:6}}/>Upload Photo
                  </button>
                  {photo && <button onClick={()=>setPhoto("")}
                    style={{width:"100%",padding:"7px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff",color:"#6b7280",cursor:"pointer",fontSize:11}}>
                    Remove Photo
                  </button>}
                  <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onPhotoFile}/>
                  <div style={{fontSize:10,color:"#9ca3af",marginTop:6}}>PNG, JPG, JPEG up to 5MB</div>
                </div>
              </div>
            </FL>
            {!photo && (
              <FL label="Or Choose Avatar Color">
                <AvatarPicker gender={gender} selected={avatar} onSelect={setAvatar}/>
              </FL>
            )}
          </>}

        </div>

        {/* ── Footer ── */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #e5e7eb",
          display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose}
            style={{padding:"9px 24px",border:"1px solid #d1d5db",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:500,color:"#374151"}}>
            Cancel
          </button>
          <button onClick={submit} disabled={!fullname?.trim() && !firstName?.trim()}
            style={{padding:"9px 24px",border:"none",borderRadius:8,background:"#6366f1",color:"#fff",
              cursor:(!fullname?.trim()&&!firstName?.trim())?"not-allowed":"pointer",fontSize:12,fontWeight:600,
              opacity:(!fullname?.trim()&&!firstName?.trim())?0.5:1}}>
            <i className="ti ti-user-plus" style={{marginRight:6}}/>Add {rel}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// PERSON EDIT PANEL — tabbed
// ─────────────────────────────────────────────────────────
function PersonPanel({ pid, persons, onClose, onSave, onAddRel, onDelete }) {
  const [form, setForm]   = useState({...persons[pid]});
  const [tab,  setTab]    = useState("basic");
  const fileRef            = useRef();
  useEffect(() => setForm({...persons[pid]}), [pid, persons]);
  if (!persons[pid]) return null;

  const upd  = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const updB = k => v  => setForm(f => ({...f, [k]: v}));
  const onPh = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,photo:ev.target.result,avatar:""})); r.readAsDataURL(f); };
  const gCol = form.gender==="female" ? "#ec4899" : "#3b82f6";

  const TABS = [
    {id:"basic",  label:"Basic",        icon:"ti-user"},
    {id:"bio",    label:"Biographical", icon:"ti-calendar"},
    {id:"contact",label:"Contact",      icon:"ti-phone"},
    {id:"photos", label:"Photos",       icon:"ti-photo"},
  ];

  const F = ({label,children,hint,half}) => (
    <div className="fg" style={{marginBottom:8,...(half?{}:{})}}>
      <label style={{display:"flex",justifyContent:"space-between"}}>
        <span>{label}</span>{hint&&<span style={{fontSize:9,color:"var(--text3)",fontWeight:400}}>{hint}</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="pp">
      {/* Header */}
      <div className="pph">
        <div className="ppaw" onClick={()=>fileRef.current.click()} title="Click to change photo">
          {form.photo
            ? <img src={form.photo} className="ppai" alt=""/>
            : <div className="ppap" style={{borderColor:gCol,background:`${gCol}22`,color:gCol}}>
                {form.gender==="female"
                  ? <i className="ti ti-user-circle" style={{fontSize:22}}/>
                  : (form.nameEn||"?")[0]}
              </div>}
          <div className="ppcam"><i className="ti ti-camera" style={{fontSize:11}}/></div>
          <input type="file" accept="image/*" ref={fileRef} style={{display:"none"}} onChange={onPh}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.nameEn||"—"}</div>
          {form.nickname&&<div style={{fontSize:10,color:gCol,fontStyle:"italic"}}>"{form.nickname}"</div>}
          <div style={{fontSize:10,color:"var(--text3)"}}>
            {form.gender==="female"?"♀":"♂"} · #{form.memberNo}
            {form.village&&` · ${form.village}`}
          </div>
        </div>
        <button onClick={onClose} className="iconbtn">✕</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg3)",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"7px 2px",fontSize:10,fontWeight:600,background:"transparent",border:"none",cursor:"pointer",
              color:tab===t.id?"var(--accent)":"var(--text3)",borderBottom:`2px solid ${tab===t.id?"var(--accent)":"transparent"}`,
              display:"flex",alignItems:"center",justifyContent:"center",gap:3,transition:"all 0.15s"}}>
            <i className={`ti ${t.icon}`} style={{fontSize:11}}/>{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ppb">

        {/* ── BASIC ── */}
        {tab==="basic" && <>
          <F label="Gender">
            <div style={{display:"flex",gap:6}}>
              {[["male","♂ Male","#3b82f6"],["female","♀ Female","#ec4899"]].map(([v,l,c])=>(
                <button key={v} onClick={()=>setForm(f=>({...f,gender:v}))}
                  style={{flex:1,padding:"6px",fontSize:11,fontWeight:600,borderRadius:8,cursor:"pointer",
                    background:form.gender===v?`${c}22`:"transparent",border:`1px solid ${form.gender===v?c:"var(--border)"}`,
                    color:form.gender===v?c:"var(--text2)"}}>
                  {l}
                </button>
              ))}
            </div>
          </F>
          <F label="English Name"><input value={form.nameEn||""} onChange={upd("nameEn")} placeholder="Full English name" style={{width:"100%",fontSize:12}}/></F>
          <F label="Nickname" hint="optional"><input value={form.nickname||""} onChange={upd("nickname")} placeholder="Nickname or alias" style={{width:"100%",fontSize:12}}/></F>
          {form.childNumber&&<F label="Child Number"><input value={form.childNumber||""} onChange={upd("childNumber")} style={{width:"100%",fontSize:12}}/></F>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <F label="Village"><input value={form.village||""} onChange={upd("village")} placeholder="Village" style={{width:"100%",fontSize:12}}/></F>
            <F label="Surname"><input value={form.surname||""} onChange={upd("surname")} placeholder="Surname" style={{width:"100%",fontSize:12}}/></F>
          </div>
        </>}

        {/* ── BIOGRAPHICAL ── */}
        {tab==="bio" && <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <F label="DOB (Actual)"><input type="date" value={form.dobActual||""} onChange={upd("dobActual")} style={{width:"100%",fontSize:12}}/></F>
            <F label="DOB (Records)" hint="approx"><input type="date" value={form.dobRecords||""} onChange={upd("dobRecords")} style={{width:"100%",fontSize:12}}/></F>
          </div>
          <F label="Living Status">
            <div style={{display:"flex",gap:6}}>
              {[["true","✅ Living","#10b981"],["false","✝ Deceased","#6e7681"]].map(([v,l,c])=>(
                <button key={v} onClick={()=>updB("isAlive")(v==="true")}
                  style={{flex:1,padding:"6px",fontSize:11,fontWeight:600,borderRadius:8,cursor:"pointer",
                    background:String(form.isAlive!==false)===v?`${c}22`:"transparent",
                    border:`1px solid ${String(form.isAlive!==false)===v?c:"var(--border)"}`,
                    color:String(form.isAlive!==false)===v?c:"var(--text2)"}}>
                  {l}
                </button>
              ))}
            </div>
          </F>
          {form.isAlive===false&&<F label="Date of Death"><input type="date" value={form.dateOfDeath||""} onChange={upd("dateOfDeath")} style={{width:"100%",fontSize:12}}/></F>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <F label="Education"><input value={form.education||""} onChange={upd("education")} placeholder="e.g. B.Tech" style={{width:"100%",fontSize:12}}/></F>
            <F label="Occupation"><input value={form.occupation||""} onChange={upd("occupation")} placeholder="Job / Profession" style={{width:"100%",fontSize:12}}/></F>
          </div>
        </>}

        {/* ── CONTACT ── */}
        {tab==="contact" && <>
          <F label="Phone"><input value={form.phone||""} onChange={upd("phone")} placeholder="+91 99999 99999" type="tel" style={{width:"100%",fontSize:12}}/></F>
          <F label="Email"><input value={form.email||""} onChange={upd("email")} placeholder="email@example.com" type="email" style={{width:"100%",fontSize:12}}/></F>
          <F label="Address"><textarea value={form.address||""} onChange={upd("address")} placeholder="House / Street / City / State" rows={3} style={{width:"100%",fontSize:12,resize:"vertical"}}/></F>
          <F label="Notes"><textarea value={form.notes||""} onChange={upd("notes")} placeholder="Additional information…" rows={2} style={{width:"100%",fontSize:12}}/></F>
        </>}

        {/* ── PHOTOS ── */}
        {tab==="photos" && <>
          <F label="Profile Photo">
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:72,height:72,borderRadius:"50%",border:`2px solid ${gCol}`,overflow:"hidden",flexShrink:0,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {form.photo
                  ? <img src={form.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <i className="ti ti-user-circle" style={{fontSize:32,color:gCol}}/>}
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                <button className="btn2" style={{justifyContent:"center"}} onClick={()=>fileRef.current.click()}>
                  <i className="ti ti-upload" style={{fontSize:12,marginRight:5}}/>Upload Photo
                </button>
                {form.photo&&<button className="btn2" style={{justifyContent:"center",fontSize:11}} onClick={()=>setForm(f=>({...f,photo:"",avatar:""}))}>
                  <i className="ti ti-trash" style={{fontSize:11,marginRight:4}}/>Remove
                </button>}
              </div>
            </div>
          </F>
          {!form.photo&&<F label="Or Choose Avatar">
            <AvatarPicker gender={form.gender||"male"} selected={form.avatar||""} onSelect={v=>setForm(f=>({...f,avatar:v}))}/>
          </F>}
        </>}

      </div>

      {/* Footer */}
      <div className="ppf">
        <button className="btn2" style={{color:"var(--danger)",borderColor:"var(--danger)"}} onClick={()=>onDelete(pid)}>
          <i className="ti ti-trash" style={{fontSize:12,marginRight:3}}/>Delete
        </button>
        <button className="btn2" onClick={()=>onAddRel(pid)}>
          <i className="ti ti-users-plus" style={{fontSize:12,marginRight:3}}/>Add Relation
        </button>
        <button className="btn1" onClick={()=>onSave(form)}>
          <i className="ti ti-device-floppy" style={{fontSize:12,marginRight:3}}/>Save
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AI CHAT
// ─────────────────────────────────────────────────────────
function AIChat({ tree, onClose }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", text:"నమస్కారం! 🙏 Ask me about this family tree.\n\n• \"Who has a B.Tech?\"\n• \"How many generations?\"\n• \"List all members\"\n• \"Find all females\"" }]);
  const [inp, setInp]   = useState(""); const [load, setLoad] = useState(false); const endRef = useRef();
  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);
  const send = async() => {
    if(!inp.trim()||load)return;
    const txt=inp; setInp(""); setLoad(true);
    setMsgs(m=>[...m,{role:"user",text:txt}]);
    try{const d=await api("POST","/api/ai/chat",{messages:[...msgs.slice(1),{role:"user",content:txt}].map(m=>({role:m.role,content:m.text||m.content})),treeContext:{name:tree.nameEn,persons:Object.values(tree.persons)}});setMsgs(m=>[...m,{role:"assistant",text:d.reply}]);}
    catch(e){setMsgs(m=>[...m,{role:"assistant",text:"Error: "+e.message}]);}
    setLoad(false);
  };
  return(
    <div className="aic">
      <div className="aih"><i className="ti ti-sparkles" style={{fontSize:14,color:"#3b82f6"}}/><span style={{fontWeight:600,fontSize:12,color:"var(--text)"}}>AI Assistant</span><button onClick={onClose} className="iconbtn" style={{marginLeft:"auto"}}>✕</button></div>
      <div className="aim">
        {msgs.map((m,i)=><div key={i} className={`aimr ${m.role==="user"?"aimu":"aima"}`}><div className="aib" data-role={m.role}>{m.text}</div></div>)}
        {load&&<div className="aima"><div className="aib" data-role="assistant" style={{letterSpacing:3}}>●●●</div></div>}
        <div ref={endRef}/>
      </div>
      <div className="aiir"><input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your family tree…"/><button onClick={send} className="btn1" style={{padding:"5px 10px",flexShrink:0}} disabled={load}><i className="ti ti-send" style={{fontSize:12}}/></button></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DOCUMENT UPLOAD
// ─────────────────────────────────────────────────────────
function DocUploadModal({ onClose, onBuild }) {
  const [file,setFile]=useState(null); const [preview,setPrev]=useState(null); const [status,setStat]=useState(""); const [proc,setProc]=useState(false); const fileRef=useRef();
  const handleFile=f=>{setFile(f);if(f.type.startsWith("image/")){const r=new FileReader();r.onload=ev=>setPrev({type:"image",src:ev.target.result});r.readAsDataURL(f);}else setPrev({type:"pdf",name:f.name});};
  const extract=async()=>{
    if(!file)return; setProc(true); setStat("Reading document…");
    try{
      const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=ev=>res(ev.target.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
      const b64=await toB64(file); const isPdf=file.type==="application/pdf";
      setStat("AI extracting family members…");
      const content=[isPdf?{type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}}:{type:"image",source:{type:"base64",media_type:file.type,data:b64}},{type:"text",text:`Analyze this genealogy document. Extract all family members and parent-child relationships.\nReturn ONLY valid JSON:\n{"title":"surname","titleEn":"English surname","persons":[{"id":"p1","name":"Telugu name","nameEn":"English name","education":"degree or empty","birth":"year or empty","death":"year or null","gender":"male or female"}],"relationships":[{"parentId":"p1","childId":"p2"}]}\nFirst person = oldest ancestor. Use sequential IDs p1,p2…`}];
      const reply=await claude([{role:"user",content}],null,3000);
      let parsed; try{parsed=JSON.parse(reply.replace(/```json\n?|```\n?/g,"").trim());}catch{parsed=null;}
      if(parsed?.persons?.length>0){setStat(`✓ Found ${parsed.persons.length} members!`);setTimeout(()=>{onBuild(parsed);onClose();},800);}
      else{setStat("Could not parse. Try a clearer image.");setProc(false);}
    }catch(e){setStat("Error: "+e.message);setProc(false);}
  };
  return(
    <div className="ov" onClick={onClose}><div className="mb" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
      <div className="mh"><div style={{display:"flex",alignItems:"center",gap:8}}><i className="ti ti-photo-ai" style={{fontSize:18,color:"#3b82f6"}}/><span>AI Tree Builder — Image / PDF</span></div><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",fontSize:11,color:"var(--text2)",marginBottom:14,display:"flex",gap:6}}><i className="ti ti-info-circle" style={{fontSize:13,color:"#3b82f6",flexShrink:0}}/>Upload a Telugu or English genealogy document. AI reads names and relationships automatically.</div>
        {!preview?(
          <div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}} onClick={()=>fileRef.current.click()}>
            <i className="ti ti-file-upload" style={{fontSize:52,color:"var(--text3)",display:"block",marginBottom:12}}/>
            <div style={{fontWeight:600,fontSize:14,color:"var(--text)",marginBottom:6}}>Drop file or click to browse</div>
            <div style={{fontSize:12,color:"var(--text2)"}}>PNG · JPG · JPEG · WEBP · PDF</div>
            <input type="file" accept="image/*,.pdf,application/pdf" ref={fileRef} style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
          </div>
        ):(
          <div style={{textAlign:"center"}}>
            {preview.type==="image"?<img src={preview.src} alt="" style={{maxHeight:200,maxWidth:"100%",borderRadius:8,border:"1px solid var(--border)"}}/>
              :<div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"24px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><i className="ti ti-file-type-pdf" style={{fontSize:40,color:"#ef4444"}}/><div style={{fontWeight:500,color:"var(--text)"}}>{preview.name}</div></div>}
            <div style={{fontSize:11,color:"var(--text3)",marginTop:8}}>{file.name} · {(file.size/1024).toFixed(0)}KB</div>
            {status&&<div style={{fontSize:12,marginTop:10,fontWeight:500,padding:"8px 12px",borderRadius:8,background:status.startsWith("✓")?"var(--success-bg)":"var(--bg3)",color:status.startsWith("✓")?"var(--success)":"var(--text2)",border:`1px solid ${status.startsWith("✓")?"var(--success)":"var(--border)"}`}}>{status}</div>}
          </div>
        )}
      </div>
      <div className="mf"><button className="btn2" onClick={()=>{setFile(null);setPrev(null);setStat("");setProc(false);}}>{preview?"Change":"Cancel"}</button><button className="btn1" disabled={!file||proc} onClick={extract}><i className="ti ti-sparkles" style={{fontSize:13,marginRight:4}}/>{proc?"Processing…":"Extract & Build Tree"}</button></div>
    </div></div>
  );
}

// ─────────────────────────────────────────────────────────
// TREE EDITOR
// ─────────────────────────────────────────────────────────
function TreeEditor({ tree, setTree, onBack, allTrees=[] }) {
  const [selP, setSelP]         = useState(null);
  const [showAI, setShowAI]     = useState(false);
  const [showRel, setShowRel]   = useState(false);
  const [relFor, setRelFor]     = useState(null);
  const [showDoc, setShowDoc]   = useState(false);
  const [showPanel, setPanel]   = useState(false);
  const [search, setSearch]     = useState("");
  const [villages, setVil]      = useState([]);
  const [surnames, setSur]      = useState([]);

  const { village: treeVillage, surname: treeSurname } = parseTreeName(tree.nameEn || tree.name);

  useEffect(() => {
    api("GET","/api/masterdata/villages").then(setVil).catch(()=>{});
    api("GET","/api/masterdata/surnames").then(setSur).catch(()=>{});
  }, []);

  const savePerson = p => setTree(t => ({ ...t, persons: { ...t.persons, [p.id]: p } }));

  const linkTree = (person, treeId) => {
    setTree(t => ({ ...t, persons: { ...t.persons, [person.id]: { ...t.persons[person.id], linkedTreeId: treeId } } }));
    setLinkPerson(null);
  };

  const deletePerson = pid => {
    const p = tree.persons[pid];
    if (!window.confirm(`Delete "${p?.nameEn}"? This cannot be undone.`)) return;
    setTree(t => {
      const np = { ...t.persons };
      if (np[pid]?.spouseId && np[np[pid].spouseId]) np[np[pid].spouseId] = { ...np[np[pid].spouseId], spouseId: null };
      delete np[pid];
      const removeN = n => { if (!n) return null; if (n.id === pid) return null; return { ...n, children: (n.children||[]).map(removeN).filter(Boolean) }; };
      return { ...t, persons: np, rootNode: removeN(t.rootNode), members: Math.max(0,(t.members||0)-1) };
    });
    if (selP === pid) { setSelP(null); setPanel(false); }
  };

  const openEdit = id => { setSelP(id); setPanel(true); };

  const addRel = ({ rel, pid, exId,
      nameEn, firstName, nickname, gender, childNumber,
      village, surname, dobActual, dobRecords,
      isAlive, dateOfDeath, marriageDate, bloodGroup,
      education, occupation,
      phone, email, address, notes, photo, avatar }) => {
    const name = nameEn?.trim() || firstName?.trim();
    if (!name && !exId) return;
    const isPartner = PARTNER_ADD.includes(rel);
    const isParent  = rel === "Parent";
    setTree(t => {
      const nid     = "px" + Date.now();
      const counter = (t.memberCounter || Object.keys(t.persons).length) + 1;
      const newPerson = {
        id: nid, nameEn: name||"", name: name||"",
        firstName: firstName||"", nickname: nickname||"",
        gender: gender||"male", childNumber: childNumber||"",
        education: education||"", occupation: occupation||"",
        village: village||"", surname: surname||"",
        dobActual: dobActual||"", dobRecords: dobRecords||"",
        isAlive: isAlive !== false, dateOfDeath: dateOfDeath||"",
        marriageDate: marriageDate||"", bloodGroup: bloodGroup||"",
        phone: phone||"", email: email||"", address: address||"",
        notes: notes||"", photo: photo||"", avatar: avatar||"",
        spouseId: isPartner ? pid : null,
        coParentId: coParentId || "",
        linkedTreeId: "",
        memberNo: counter,
      };
      const np  = exId ? t.persons : { ...t.persons, [nid]: newPerson };
      const tid = exId || nid;

      // ── Partner: link as spouse ──────────────────────────
      if (isPartner) {
        return { ...t,
          persons: { ...np,
            [pid]: { ...(np[pid]||t.persons[pid]), spouseId: tid },
            [tid]: { ...(np[tid]||{}),             spouseId: pid } },
          members: (t.members||0) + (exId?0:1), memberCounter: counter };
      }

      // ── Parent: new person becomes parent of pid ─────────
      if (isParent) {
        const newRoot = t.rootNode?.id === pid
          ? { id: tid, children: [t.rootNode] }
          : (() => {
              const wrap = node => {
                if (!node) return node;
                const ch = node.children || [];
                if (ch.some(c => c.id === pid))
                  return { ...node, children: ch.map(c => c.id===pid ? {id:tid,children:[c]} : c) };
                return { ...node, children: ch.map(wrap) };
              };
              return wrap(t.rootNode);
            })();
        return { ...t, persons: np, rootNode: newRoot,
          members: (t.members||0)+(exId?0:1), memberCounter: counter };
      }

      // ── Child / Brother / Sister: add as child of pid ────
      const addC = n => n.id===pid
        ? { ...n, children: [...(n.children||[]), {id:tid,children:[]}] }
        : n.children ? { ...n, children: n.children.map(addC) } : n;
      return { ...t, persons: np,
        rootNode: t.rootNode ? addC(t.rootNode) : {id:tid,children:[]},
        members: (t.members||0)+(exId?0:1), memberCounter: counter };
    });
    setShowRel(false);
  };

  const handleDocBuild = parsed => {
    const persons = {};
    let counter = tree.memberCounter || Object.keys(tree.persons).length;
    parsed.persons.forEach(p => { counter++; persons[p.id]={id:p.id,name:p.name||"",nameEn:p.nameEn||p.name||"",education:p.education||"",photo:null,birth:p.birth||"",death:p.death||"",occupation:"",notes:"",spouseId:null,gender:p.gender||"male",memberNo:counter}; });
    const cm={};parsed.relationships.forEach(r=>{if(!cm[r.parentId])cm[r.parentId]=[];cm[r.parentId].push(r.childId);});
    const allC=new Set(parsed.relationships.map(r=>r.childId));
    const rootId=parsed.persons.find(p=>!allC.has(p.id))?.id||parsed.persons[0]?.id;
    const buildN=(id,vis=new Set())=>{if(vis.has(id))return{id,children:[]};vis.add(id);return{id,children:(cm[id]||[]).map(c=>buildN(c,new Set(vis)))};};
    setTree(t=>({...t,persons:{...t.persons,...persons},rootNode:rootId?buildN(rootId):t.rootNode,members:(t.members||0)+parsed.persons.length,memberCounter:counter}));
  };

  const hasPersons = tree.rootNode && tree.persons && tree.persons[tree.rootNode?.id];

  // Search filter
  const searchResults = search.trim().length > 1
    ? Object.values(tree.persons).filter(p =>
        p.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
        p.name?.includes(search))
    : [];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", height:"100%" }}>
      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"var(--card)", borderBottom:"1px solid var(--border)", flexWrap:"wrap", flexShrink:0 }}>
        <button className="btn2" style={{ padding:"4px 10px", fontSize:11 }} onClick={onBack}><i className="ti ti-chevron-left" style={{ fontSize:10 }} />Back</button>
        <div style={{ fontWeight:700, fontSize:13, color:"var(--text)", fontFamily:"monospace" }}>{tree.nameEn}</div>
        <span style={{ fontSize:10, color:"var(--text3)" }}>· {tree.members||0} members</span>

        {/* Search */}
        <div style={{ position:"relative", marginLeft:"auto" }}>
          <i className="ti ti-search" style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"var(--text3)" }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search member…" style={{ paddingLeft:28, width:180, fontSize:11 }} />
          {searchResults.length > 0 && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, maxHeight:200, overflowY:"auto", zIndex:100, boxShadow:"0 8px 24px var(--shadow)" }}>
              {searchResults.map(p => (
                <div key={p.id} onClick={()=>{setSelP(p.id);setPanel(true);setSearch("");}} style={{ padding:"8px 12px", cursor:"pointer", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", gap:8 }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:p.gender==="female"?"#ec489922":"var(--accent-bg)", border:`1px solid ${p.gender==="female"?"#ec4899":"var(--accent)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:p.gender==="female"?"#ec4899":"var(--accent)", flexShrink:0 }}>{(p.nameEn||"?")[0]}</div>
                  <div><div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{p.nameEn}</div><div style={{ fontSize:10, color:"var(--text3)" }}>{p.name} · #{p.memberNo}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:5 }}>
          <button className="btn2" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>setShowDoc(true)}><i className="ti ti-photo-ai" style={{ fontSize:11, marginRight:3 }} />Build from Doc</button>
          <button className="btn1" style={{ padding:"4px 10px", fontSize:11 }} onClick={()=>{
            if (!hasPersons) {
              const en=window.prompt("English name of first person:")||"Person";
              const counter=1;
              setTree(t=>({...t,persons:{...t.persons,root:{id:"root",name:"",nameEn:en,education:"",photo:null,birth:"",death:"",occupation:"",notes:"",spouseId:null,gender:"male",memberNo:counter}},rootNode:{id:"root",children:[]},members:1,memberCounter:1}));
            } else { setRelFor(tree.rootNode.id); setShowRel(true); }
          }}><i className="ti ti-user-plus" style={{ fontSize:10, marginRight:3 }} />{hasPersons?"Add Person":"Add First Person"}</button>
        </div>
      </div>

      {/* Canvas + Panel */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <div style={{ flex:1, overflow:"auto", padding:"48px 32px 80px", display:"flex", justifyContent:"center", alignItems:"flex-start", background:"var(--tree-bg)" }}
          onClick={() => { setSearch(""); }}>
          {tree._loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:80,color:"var(--text3)"}}>
              <i className="ti ti-loader-2" style={{fontSize:28,marginRight:10,animation:"spin 1s linear infinite"}}/>
              <span style={{fontSize:14}}>Loading tree data…</span>
            </div>
          ) : hasPersons ? (
            <div style={{ overflow:"visible", minWidth:"max-content" }}>
              <FTNode
                node={tree.rootNode} persons={tree.persons} selId={selP}
                onSel={id=>{setSelP(id);setPanel(true);}}
                onEdit={openEdit}
                onDelete={deletePerson}
                onAdd={id=>{setRelFor(id);setShowRel(true);}}
                onLinkTree={p=>setLinkPerson(p)}
              />
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <i className="ti ti-binary-tree" style={{ fontSize:54, color:"var(--text3)", display:"block", marginBottom:12 }} />
              <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:6 }}>Empty Tree</div>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:16 }}>Add the first person or upload a document</div>
              <button className="btn2" onClick={()=>setShowDoc(true)}><i className="ti ti-photo-ai" style={{ fontSize:12, marginRight:4 }} />Build from Image / PDF</button>
            </div>
          )}
        </div>

        {/* Person edit panel */}
        {showPanel && selP && tree.persons[selP] && (
          <PersonPanel pid={selP} persons={tree.persons} onClose={()=>{setPanel(false);setSelP(null);}} onSave={p=>{savePerson(p);}} onAddRel={id=>{setRelFor(id);setShowRel(true);}} />
        )}
      </div>

      {/* AI FAB */}
      <button onClick={()=>setShowAI(v=>!v)} style={{ position:"fixed", bottom:16, right:16, width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(59,130,246,0.4)", zIndex:999 }}>
        <i className="ti ti-sparkles" style={{ fontSize:22, color:"#fff" }} />
      </button>

      {showAI   && <AIChat tree={tree} onClose={()=>setShowAI(false)} />}
      {showRel   && relFor    && <AddRelModal pid={relFor} persons={tree.persons} treeVillage={treeVillage} treeSurname={treeSurname} villages={villages} surnames={surnames} treeRootNode={tree.rootNode} onClose={()=>setShowRel(false)} onAdd={addRel}/>}
      {showDoc   && <DocUploadModal onClose={()=>setShowDoc(false)} onBuild={handleDocBuild}/>}
      {linkPerson && <LinkTreeModal person={linkPerson} trees={allTrees} onClose={()=>setLinkPerson(null)} onLink={linkTree}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────
function AuthPage({ onLogin, theme, toggleTheme }) {
  const [mode,setMode]=useState("login"); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [error,setError]=useState(""); const [load,setLoad]=useState(false);
  const submit=async()=>{
    if(!email||!pass)return setError("Email and password required");
    if(mode==="register"&&!name)return setError("Name required");
    setLoad(true);setError("");
    try{const d=await api("POST",mode==="login"?"/api/auth/login":"/api/auth/register",mode==="login"?{email,password:pass}:{name,email,password:pass});localStorage.setItem("ft_token",d.token);localStorage.setItem("ft_user",JSON.stringify(d.user));onLogin(d.user);}
    catch(e){setError(e.message);}setLoad(false);
  };
  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <button onClick={toggleTheme} style={{position:"fixed",top:16,right:16}} className="btn2"><i className={`ti ti-${theme==="dark"?"sun":"moon"}`} style={{fontSize:13,marginRight:4}}/>{theme==="dark"?"Light":"Dark"}</button>
      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,padding:"32px 28px",width:"100%",maxWidth:380,boxShadow:"0 20px 60px var(--shadow)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><i className="ti ti-binary-tree-2" style={{fontSize:30,color:"#fff"}}/></div>
          <div style={{fontSize:26,fontWeight:700,color:"var(--text)"}}>వంశవృక్షం</div>
          <div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>Telugu Family Tree Builder</div>
        </div>
        <div style={{display:"flex",background:"var(--bg)",borderRadius:8,marginBottom:20,padding:3,border:"1px solid var(--border)"}}>
          {["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:7,fontSize:12,fontWeight:600,background:mode===m?"linear-gradient(135deg,#1d4ed8,#7c3aed)":"transparent",color:mode===m?"#fff":"var(--text3)",border:"none",cursor:"pointer",borderRadius:6,transition:"all 0.2s"}}>{m==="login"?"Login":"Register"}</button>)}
        </div>
        {mode==="register"&&<div className="fg"><label>Full Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>}
        <div className="fg"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <div className="fg"><label>Password</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        {error&&<div style={{background:"var(--danger-bg)",border:"1px solid var(--danger)",color:"var(--danger-text)",fontSize:12,padding:"8px 10px",borderRadius:8,marginBottom:12,wordBreak:"break-word"}}>{error}</div>}
        <button onClick={submit} disabled={load} style={{width:"100%",padding:11,fontSize:14,fontWeight:600,background:load?"var(--bg3)":"linear-gradient(135deg,#1d4ed8,#7c3aed)",color:load?"var(--text3)":"#fff",border:"none",borderRadius:8,cursor:load?"not-allowed":"pointer",marginBottom:12}}>{load?"Please wait…":mode==="login"?"Login →":"Create Account →"}</button>
        <div style={{textAlign:"center",fontSize:12,color:"var(--text3)"}}>{mode==="login"?<><span>No account? </span><span style={{color:"var(--accent)",cursor:"pointer"}} onClick={()=>{setMode("register");setError("");}}>Register free</span></>:<><span>Have account? </span><span style={{color:"var(--accent)",cursor:"pointer"}} onClick={()=>{setMode("login");setError("");}}>Login</span></>}</div>
        {!BASE&&<div style={{marginTop:10,background:"var(--danger-bg)",border:"1px solid var(--danger)",borderRadius:8,padding:"8px 10px",fontSize:11,color:"var(--danger-text)"}}>⚠️ VITE_API_URL not set in Railway</div>}
        <div style={{marginTop:12,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px",fontSize:11,color:"var(--text3)",display:"flex",alignItems:"center",gap:6}}><i className="ti ti-info-circle" style={{fontSize:13,color:"var(--accent)"}}/>{mode==="register"?"First account becomes SuperAdmin":"Enter your credentials"}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ALL OTHER VIEWS (reused from v4)
// ─────────────────────────────────────────────────────────
function MyTreesView({ trees, onOpenTree, treesLoading }) {
  // trees comes from App (shared state) 
  return(<div className="view-wrap"><div className="view-header"><div><div className="view-title">My Trees</div><div className="view-sub">Family trees you have access to</div></div></div>
    {treesLoading?(<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"var(--text3)"}}><i className="ti ti-loader-2" style={{fontSize:24,marginRight:8,animation:"spin 1s linear infinite"}}/>Loading trees…</div>):trees.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:"var(--text3)"}}><i className="ti ti-binary-tree" style={{fontSize:48,display:"block",marginBottom:12}}/><div style={{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:6}}>No trees assigned yet</div><div style={{fontSize:12,marginTop:4}}>Contact admin to assign trees to your account</div></div>):(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
        {trees.map((t,i)=>(<div key={t.id} onClick={()=>onOpenTree(t)} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:18,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=GEN_COLORS[i%GEN_COLORS.length];e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="";}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:`${GEN_COLORS[i%GEN_COLORS.length]}22`,border:`2px solid ${GEN_COLORS[i%GEN_COLORS.length]}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}><i className="ti ti-binary-tree" style={{fontSize:20,color:GEN_COLORS[i%GEN_COLORS.length]}}/></div>
          <div style={{fontWeight:700,fontSize:13,color:"var(--text)",fontFamily:"monospace",wordBreak:"break-all"}}>{t.name}</div>
          <div style={{display:"flex",gap:10,marginTop:10,fontSize:10,color:"var(--text3)"}}><span><i className="ti ti-users" style={{fontSize:10,marginRight:2}}/>{t.members||t._count?.persons||0}</span><span><i className={`ti ti-${t.visibility==="private"?"lock":"world"}`} style={{fontSize:10,marginRight:2}}/>{t.visibility}</span></div>
        </div>))}
      </div>
    )}
  </div>);
}

function MasterDataView({ type }) {
  const path=type==="villages"?"villages":"surnames"; const icon=type==="villages"?"ti-map-pin":"ti-id-badge";
  const [items,setItems]=useState([]); const [showAdd,setAdd]=useState(false); const [name,setName]=useState(""); const [nameEn,setNameEn]=useState(""); const [saving,setSave]=useState(false); const [editId,setEditId]=useState(null); const [editName,setEN]=useState(""); const [editTe,setET]=useState(""); const [msg,setMsg]=useState("");
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  useEffect(()=>{api("GET",`/api/masterdata/${path}`).then(setItems).catch(()=>{});},[ path]);
  const add=async()=>{if(!name)return;setSave(true);try{const it=await api("POST",`/api/masterdata/${path}`,{name:name.trim(),teluguName:nameEn.trim()||name.trim()});setItems(v=>[...v,it]);setName("");setNameEn("");setAdd(false);flash("Added");}catch(e){flash("Error: "+e.message);}setSave(false);};
  const del=async(id,nm)=>{if(!window.confirm(`Delete "${nm}"?`))return;try{await api("DELETE",`/api/masterdata/${path}/${id}`);setItems(v=>v.filter(x=>x.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}};
  const saveEdit=async()=>{try{await api("PATCH",`/api/masterdata/${path}/${editId}`,{name:editName,teluguName:editTe});setItems(v=>v.map(x=>x.id===editId?{...x,name:editName,teluguName:editTe}:x));setEditId(null);flash("Updated");}catch(e){flash("Error: "+e.message);}};
  return(<div className="view-wrap"><div className="view-header"><div><div className="view-title"><i className={`ti ${icon}`} style={{marginRight:8}}/>{type==="villages"?"Villages — గ్రామాలు":"Surnames — ఇంటిపేర్లు"}</div><div className="view-sub">{type==="villages"?"Manage village names used in tree creation":"Manage surname/family names used in tree creation"}</div></div><button className="btn1" onClick={()=>setAdd(v=>!v)}><i className="ti ti-plus" style={{fontSize:12,marginRight:4}}/>Add {type==="villages"?"Village":"Surname"}</button></div>
    {msg&&<div style={{background:"var(--success-bg)",border:"1px solid var(--success)",color:"var(--success)",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:14}}>{msg}</div>}
    {showAdd&&(<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:12}}>Add New {type==="villages"?"Village":"Surname"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div className="fg"><label>English Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Kotrapalli" style={{width:"100%",fontSize:12}}/></div>

      </div>
      <div style={{display:"flex",gap:8}}><button className="btn2" onClick={()=>setAdd(false)}>Cancel</button><button className="btn1" onClick={add} disabled={!name||saving}>{saving?"Saving…":"Save"}</button></div>
    </div>)}
    <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead style={{background:"var(--bg3)"}}><tr>{["Name","Added",""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}</tr></thead>
        <tbody>{items.map(it=>(
          <tr key={it.id} style={{borderTop:"1px solid var(--border2)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
            <td style={{padding:"10px 14px",color:"var(--text)",fontWeight:500}}>{editId===it.id?<input value={editName} onChange={e=>setEN(e.target.value)} style={{fontSize:12,width:"100%"}}/>:it.name}</td>
            
            <td style={{padding:"10px 14px",color:"var(--text3)",fontSize:10}}>{it.createdAt?.slice(0,10)}</td>
            <td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>{editId===it.id?<><button onClick={saveEdit} className="btn1" style={{padding:"3px 8px",fontSize:10}}>Save</button><button onClick={()=>setEditId(null)} className="btn2" style={{padding:"3px 8px",fontSize:10}}>✕</button></>:<><button onClick={()=>{setEditId(it.id);setEN(it.name);setET(it.teluguName);}} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--text2)",display:"inline-flex",alignItems:"center"}}><i className="ti ti-edit" style={{fontSize:12}}/></button><button onClick={()=>del(it.id,it.name)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--text2)",display:"inline-flex",alignItems:"center"}}><i className="ti ti-trash" style={{fontSize:12}}/></button></>}</div></td>
          </tr>))}
        </tbody>
      </table>
      {items.length===0&&<div style={{textAlign:"center",padding:"32px 20px",color:"var(--text3)",fontSize:12}}>No {type} added yet.</div>}
    </div>
  </div>);
}

function AdminTreesView({ onOpenTree, onTreeCreated, currentUser }) {
  const [trees,   setTrees]  = useState([]);  // OWN local state - never touches App.trees
  const [villages,setVil]    = useState([]); const [surnames,setSur]=useState([]); const [showNew,setNew]=useState(false); const [village,setVillage]=useState(""); const [surname,setSurname]=useState(""); const [treeNo,setTreeNo]=useState("1"); const [vis,setVis]=useState("private"); const [loading,setLoad]=useState(true); const [saving,setSave]=useState(false); const [msg,setMsg]=useState(""); const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const treeName=[village,surname,treeNo].filter(Boolean).join("_");
  useEffect(()=>{const treesUrl=currentUser?.role==="SUPERADMIN"?"/api/admin/trees":"/api/trees";Promise.all([api("GET",treesUrl),api("GET","/api/masterdata/villages"),api("GET","/api/masterdata/surnames")]).then(([td,v,s])=>{const all=currentUser?.role==="SUPERADMIN"?td:[...(td.owned||[]),...(td.shared||[])];setTrees(all);setVil(v);setSur(s);}).catch(()=>{}).finally(()=>setLoad(false));},[]); 
  const createTree=async()=>{if(!treeName)return;setSave(true);try{const t=await api("POST","/api/trees",{name:treeName,nameEn:treeName,visibility:vis});setTrees(v=>[t,...v]);setNew(false);setVillage("");setSurname("");setTreeNo("1");flash("Tree created!");onTreeCreated&&onTreeCreated(t);}catch(e){flash("Error: "+e.message);}setSave(false);};
  const delTree=async(id,name)=>{if(!window.confirm(`Delete tree "${name}"?`))return;try{await api("DELETE",`/api/admin/trees/${id}`);setTrees(v=>v.filter(t=>t.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}};
  return(<div className="view-wrap"><div className="view-header"><div><div className="view-title">Family Trees</div><div className="view-sub">Create and manage all family trees</div></div><button className="btn1" onClick={()=>setNew(v=>!v)}><i className="ti ti-plus" style={{fontSize:12,marginRight:4}}/>New Family Tree</button></div>
    {msg&&<div style={{background:"var(--success-bg)",border:"1px solid var(--success)",color:"var(--success)",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:14}}>{msg}</div>}
    {showNew&&(<div style={{background:"var(--card)",border:"1px solid var(--accent)",borderRadius:12,padding:20,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:14}}>Create New Family Tree</div>
      {(villages.length===0||surnames.length===0)&&<div style={{background:"var(--danger-bg)",border:"1px solid var(--danger)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--danger-text)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}><i className="ti ti-alert-triangle" style={{fontSize:14,flexShrink:0}}/>{villages.length===0?"Add villages in Master Data first.":"Add surnames in Master Data first."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px",gap:12,marginBottom:14}}>
        <div className="fg"><label>Village / గ్రామం</label><select value={village} onChange={e=>setVillage(e.target.value)} style={{width:"100%",fontSize:12}}><option value="">-- Select Village --</option>{villages.map(v=><option key={v.id} value={v.name}>{v.name} ({v.teluguName})</option>)}</select></div>
        <div className="fg"><label>Surname / ఇంటిపేరు</label><select value={surname} onChange={e=>setSurname(e.target.value)} style={{width:"100%",fontSize:12}}><option value="">-- Select Surname --</option>{surnames.map(s=><option key={s.id} value={s.name}>{s.name} ({s.teluguName})</option>)}</select></div>
        <div className="fg"><label>No.</label><input value={treeNo} onChange={e=>setTreeNo(e.target.value)} placeholder="1" style={{width:"100%",fontSize:12}}/></div>
      </div>
      {treeName&&<div style={{background:"var(--accent-bg)",border:"1px solid var(--accent)",borderRadius:8,padding:"10px 14px",marginBottom:14}}><div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>Tree Name Preview</div><div style={{fontSize:18,fontWeight:700,color:"var(--accent)",fontFamily:"monospace",letterSpacing:1}}>{treeName}</div></div>}
      <div className="fg" style={{marginBottom:14}}><label>Visibility</label><select value={vis} onChange={e=>setVis(e.target.value)} style={{width:"100%",fontSize:12}}><option value="private">Private — invited only</option><option value="public">Public — anyone with link</option></select></div>
      <div style={{display:"flex",gap:8}}><button className="btn2" onClick={()=>setNew(false)}>Cancel</button><button className="btn1" disabled={!treeName||saving||villages.length===0||surnames.length===0} onClick={createTree}>{saving?"Creating…":"Create Tree"}</button></div>
    </div>)}
    {loading?<Loader/>:(<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead style={{background:"var(--bg3)"}}><tr>{["Tree Name","Owner","Members","Visibility","Created","Actions"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
        <tbody>{trees.map(t=>(<tr key={t.id} style={{borderTop:"1px solid var(--border2)"}} onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
          <td style={{padding:"10px 14px"}}><div style={{fontWeight:700,color:"var(--text)",fontFamily:"monospace",fontSize:13}}>{t.name}</div></td>
          <td style={{padding:"10px 14px",color:"var(--text2)"}}>{t.owner?.name||"—"}</td>
          <td style={{padding:"10px 14px",textAlign:"center",color:"var(--text2)"}}>{t._count?.persons||0}</td>
          <td style={{padding:"10px 14px"}}><span style={{background:t.visibility==="public"?"var(--success-bg)":"var(--bg3)",color:t.visibility==="public"?"var(--success)":"var(--text3)",border:`1px solid ${t.visibility==="public"?"var(--success)":"var(--border)"}`,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:600}}>{t.visibility}</span></td>
          <td style={{padding:"10px 14px",color:"var(--text3)",fontSize:10}}>{t.createdAt?.slice(0,10)}</td>
          <td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:4}}><button onClick={()=>onOpenTree(t)} style={{background:"var(--accent-bg)",border:"1px solid var(--accent)",borderRadius:6,padding:"4px 9px",cursor:"pointer",color:"var(--accent)",display:"inline-flex",alignItems:"center",fontSize:11,gap:4,fontWeight:500}}><i className="ti ti-external-link" style={{fontSize:11}}/>Open</button><button onClick={()=>delTree(t.id,t.name)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--text2)",display:"inline-flex",alignItems:"center"}}><i className="ti ti-trash" style={{fontSize:12}}/></button></div></td>
        </tr>))}</tbody>
      </table>
      {trees.length===0&&<div style={{textAlign:"center",padding:"32px 20px",color:"var(--text3)",fontSize:12}}>No trees yet.</div>}
    </div>)}
  </div>);
}

function AdminOverviewView(){const[S,setS]=useState(null);useEffect(()=>{api("GET","/api/admin/stats").then(setS).catch(()=>{});},[]); if(!S)return<Loader/>;const C=["#3b82f6","#10b981","#f59e0b","#8b5cf6"];const st=[["ti-users","Users",S.totalUsers,`+${S.recentUsers} this week`,0],["ti-binary-tree","Trees",S.totalTrees,`+${S.recentTrees} this week`,1],["ti-user-circle","Members",S.totalPersons,"People recorded",2],["ti-arrows-join","Relations",S.totalRelationships,"Links",3]];return(<div className="view-wrap"><div className="view-header"><div><div className="view-title">Overview</div><div className="view-sub">Platform statistics</div></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12}}>{st.map(([ic,lb,vl,sb,ci])=>(<div key={lb} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:16}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{width:40,height:40,borderRadius:10,background:C[ci]+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><i className={`ti ${ic}`} style={{fontSize:20,color:C[ci]}}/></div><div style={{fontSize:28,fontWeight:700,color:"var(--text)"}}>{vl}</div></div><div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{lb}</div><div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>{sb}</div></div>))}</div></div>);}


// ── Assign Trees Modal ────────────────────────────────────
function AssignTreesModal({ user, allTrees, onClose }) {
  const [assigned,  setAssigned]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(null); // treeId being toggled
  const [msg,       setMsg]       = useState("");

  useEffect(() => {
    api("GET", `/api/admin/users/${user.id}/trees`)
      .then(ts => setAssigned(ts.map(t => t.id)))
      .finally(() => setLoading(false));
  }, [user.id]);

  const toggle = async (treeId) => {
    setSaving(treeId);
    try {
      if (assigned.includes(treeId)) {
        await api("DELETE", `/api/admin/users/${user.id}/trees/${treeId}`);
        setAssigned(v => v.filter(id => id !== treeId));
        setMsg("Tree removed");
      } else {
        await api("POST", `/api/admin/users/${user.id}/trees`, { treeId, role: "editor" });
        setAssigned(v => [...v, treeId]);
        setMsg("Tree assigned");
      }
    } catch(e) { setMsg("Error: " + e.message); }
    setSaving(null);
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="ov" onClick={onClose}>
      <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,width:"90%",maxWidth:520,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px var(--shadow)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>Assign Trees</div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>User: {user.name} · {user.role}</div>
          </div>
          <button onClick={onClose} className="iconbtn">✕</button>
        </div>

        {msg && <div style={{padding:"8px 18px",background:"var(--success-bg)",borderBottom:"1px solid var(--success)",fontSize:12,color:"var(--success)"}}>{msg}</div>}

        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {loading ? <Loader/> : allTrees.length === 0
            ? <div style={{textAlign:"center",padding:32,color:"var(--text3)",fontSize:12}}>No trees available. Create trees in the Family Trees section first.</div>
            : allTrees.map(t => {
                const isAssigned = assigned.includes(t.id);
                const isSaving   = saving === t.id;
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid var(--border)",borderRadius:10,marginBottom:8,background:isAssigned?"var(--accent-bg)":"var(--bg3)",transition:"all 0.15s"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:isAssigned?"var(--accent-bg)":"var(--bg3)",border:`2px solid ${isAssigned?"var(--accent)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <i className="ti ti-binary-tree" style={{fontSize:18,color:isAssigned?"var(--accent)":"var(--text3)"}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:"var(--text)",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>
                      <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>Owner: {t.owner?.name||"—"} · {t._count?.persons||0} members</div>
                    </div>
                    <button onClick={()=>toggle(t.id)} disabled={isSaving}
                      style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${isAssigned?"var(--danger)":"var(--accent)"}`,
                        background:isAssigned?"var(--danger-bg)":"var(--accent-bg)",
                        color:isAssigned?"var(--danger)":"var(--accent)",
                        cursor:isSaving?"not-allowed":"pointer",fontSize:11,fontWeight:600,flexShrink:0,
                        opacity:isSaving?0.5:1,whiteSpace:"nowrap"}}>
                      {isSaving?"…":isAssigned?"Remove":"Assign"}
                    </button>
                  </div>
                );
              })
          }
        </div>

        <div style={{padding:"12px 18px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"flex-end"}}>
          <button className="btn1" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersView({currentUser}){const isSA=currentUser?.role==="SUPERADMIN";const[users,setUsers]=useState([]);const[load,setLoad]=useState(true);const[srch,setSrch]=useState("");const[msg,setMsg]=useState("");const[showAdd,setAdd]=useState(false);const[form,setForm]=useState({name:"",email:"",password:"",role:"USER"});const[saving,setSave]=useState(false);const[assignUser,setAssignUser]=useState(null);const[allTrees,setAllTrees]=useState([]);const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};useEffect(()=>{api("GET","/api/admin/users").then(setUsers).finally(()=>setLoad(false));api("GET","/api/admin/trees").then(setAllTrees).catch(()=>{});},[]); const changeRole=async(id,role)=>{try{await api("PATCH",`/api/admin/users/${id}/role`,{role});setUsers(u=>u.map(x=>x.id===id?{...x,role}:x));flash("Role updated");}catch(e){flash("Error: "+e.message);}};const toggleStatus=async(id,isActive)=>{try{const u=await api("PATCH",`/api/admin/users/${id}/status`,{isActive:!isActive});setUsers(us=>us.map(x=>x.id===id?{...x,isActive:u.isActive}:x));flash(u.isActive?"Activated":"Deactivated");}catch(e){flash("Error: "+e.message);}};const del=async(id,n)=>{if(!window.confirm(`Delete "${n}"?`))return;try{await api("DELETE",`/api/admin/users/${id}`);setUsers(u=>u.filter(x=>x.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}};const addUser=async()=>{if(!form.name||!form.email||!form.password)return;setSave(true);try{const u=await api("POST","/api/admin/users",form);setUsers(us=>[u,...us]);setAdd(false);setForm({name:"",email:"",password:"",role:"USER"});flash("User added");}catch(e){flash("Error: "+e.message);}setSave(false);};const upd=k=>e=>setForm(f=>({...f,[k]:e.target.value}));const filtered=users.filter(u=>(isSA||u.role!=="SUPERADMIN")&&(u.name.toLowerCase().includes(srch.toLowerCase())||u.email.toLowerCase().includes(srch.toLowerCase())));return(<div className="view-wrap"><div className="view-header"><div><div className="view-title">Users</div><div className="view-sub">Manage user accounts and roles</div></div><button className="btn1" onClick={()=>setAdd(v=>!v)}><i className="ti ti-user-plus" style={{fontSize:12,marginRight:4}}/>Add User</button></div>
  {msg&&<div style={{background:"var(--success-bg)",border:"1px solid var(--success)",color:"var(--success)",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:14}}>{msg}</div>}
  {showAdd&&<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:16,marginBottom:14}}><div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:12}}>Add New User</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>{[["name","Full Name","text","Full name"],["email","Email","email","email@example.com"],["password","Password","password","••••••••"]].map(([k,lb,t,ph])=><div key={k} className="fg"><label>{lb}</label><input type={t} value={form[k]} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/></div>)}<div className="fg"><label>Role</label><select value={form.role} onChange={upd("role")} style={{width:"100%",fontSize:12}}><option value="USER">User</option><option value="ADMIN">Admin</option>{isSA&&<option value="SUPERADMIN">SuperAdmin</option>}</select></div></div><div style={{display:"flex",gap:8}}><button className="btn2" onClick={()=>setAdd(false)}>Cancel</button><button className="btn1" onClick={addUser} disabled={saving}>{saving?"Adding…":"Add User"}</button></div></div>}
  <div style={{display:"flex",gap:8,marginBottom:14}}><input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search users…" style={{width:240,fontSize:12}}/></div>
  {load?<Loader/>:<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead style={{background:"var(--bg3)"}}><tr>{["User","Email","Role","Status","Trees","Joined","Actions"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{filtered.map(u=><tr key={u.id} style={{borderTop:"1px solid var(--border2)",opacity:u.isActive?1:0.5}} onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{u.name[0]}</div><span style={{fontWeight:500,color:"var(--text)"}}>{u.name}{u.id===currentUser.id&&<span style={{fontSize:9,color:"var(--accent)",marginLeft:4}}>(you)</span>}</span></div></td><td style={{padding:"10px 14px",color:"var(--text2)",fontSize:11}}>{u.email}</td><td style={{padding:"10px 14px"}}>{u.id===currentUser.id?<span style={{fontSize:10,fontWeight:700}}>{u.role}</span>:<select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{fontSize:10,padding:"2px 6px",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",cursor:"pointer"}}><option value="USER">User</option><option value="ADMIN">Admin</option>{isSA&&<option value="SUPERADMIN">SuperAdmin</option>}</select>}</td><td style={{padding:"10px 14px"}}><span style={{background:u.isActive?"var(--success-bg)":"var(--bg3)",color:u.isActive?"var(--success)":"var(--text3)",border:`1px solid ${u.isActive?"var(--success)":"var(--border)"}`,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700}}>{u.isActive?"Active":"Inactive"}</span></td><td style={{padding:"10px 14px",textAlign:"center",color:"var(--text2)"}}>{u._count?.ownedTrees||0}</td><td style={{padding:"10px 14px",color:"var(--text3)",fontSize:10,whiteSpace:"nowrap"}}>{u.createdAt?.slice(0,10)}</td><td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}><button onClick={()=>setAssignUser(u)} title="Assign Trees" style={{background:"var(--accent-bg)",border:"1px solid var(--accent)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600}}><i className="ti ti-binary-tree" style={{fontSize:11}}/>Trees</button>{u.id!==currentUser.id&&<><button onClick={()=>toggleStatus(u.id,u.isActive)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--text2)",display:"inline-flex",alignItems:"center"}}><i className={`ti ti-${u.isActive?"user-off":"user-check"}`} style={{fontSize:12}}/></button><button onClick={()=>del(u.id,u.name)} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"var(--text2)",display:"inline-flex",alignItems:"center"}}><i className="ti ti-trash" style={{fontSize:12}}/></button></>}</div></td></tr>)}</tbody></table>{filtered.length===0&&<div style={{textAlign:"center",padding:"24px 20px",color:"var(--text3)",fontSize:12}}>No users found</div>}</div>}
{assignUser&&<AssignTreesModal user={assignUser} allTrees={allTrees} onClose={()=>setAssignUser(null)}/>}</div>);}

function AdminSettingsView(){const[settings,setSettings]=useState({});const[load,setLoad]=useState(true);const[saving,setSave]=useState(false);const[msg,setMsg]=useState({text:"",type:""});useEffect(()=>{api("GET","/api/settings").then(setSettings).catch(()=>{}).finally(()=>setLoad(false));},[]); const upd=k=>e=>setSettings(s=>({...s,[k]:e.target.type==="checkbox"?String(e.target.checked):e.target.value}));const save=async(keys)=>{setSave(true);setMsg({text:"",type:""});try{const sub={};keys.forEach(k=>{if(settings[k]!==undefined&&settings[k]!=="••••••••")sub[k]=settings[k];});await api("POST","/api/settings",sub);setMsg({text:"✓ Saved",type:"success"});}catch(e){setMsg({text:"Error: "+e.message,type:"error"});}setSave(false);setTimeout(()=>setMsg({text:"",type:""}),3000);};const Field=({label,k,type="text",ph="",hint,opts})=>(<div className="fg"><label>{label}</label>{opts?<select value={settings[k]||""} onChange={upd(k)} style={{width:"100%",fontSize:12}}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:type==="toggle"?(<div style={{display:"flex",alignItems:"center",gap:10}}><div onClick={()=>setSettings(s=>({...s,[k]:String(s[k]!=="true")}))} style={{width:40,height:22,borderRadius:11,background:settings[k]==="true"?"#3b82f6":"var(--border)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{position:"absolute",top:2,left:settings[k]==="true"?18:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/></div><span style={{fontSize:12,color:"var(--text2)"}}>{settings[k]==="true"?"Enabled":"Disabled"}</span></div>):<input type={type} value={settings[k]||""} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/>}{hint&&<div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>{hint}</div>}</div>);const Sec=({title,icon,color,keys,children})=>(<div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",marginBottom:16}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:"1px solid var(--border)",background:"var(--bg3)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:32,height:32,borderRadius:8,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><i className={`ti ${icon}`} style={{fontSize:15,color}}/></div><span style={{fontWeight:600,fontSize:13,color:"var(--text)"}}>{title}</span></div><button className="btn1" style={{padding:"4px 12px",fontSize:11}} onClick={()=>save(keys)} disabled={saving}>{saving?"Saving…":"Save"}</button></div><div style={{padding:16}}>{children}</div></div>);
if(load)return<Loader/>;return(<div className="view-wrap"><div className="view-header"><div><div className="view-title">Settings</div><div className="view-sub">Platform configuration</div></div></div>{msg.text&&<div style={{background:msg.type==="success"?"var(--success-bg)":"var(--danger-bg)",border:`1px solid var(--${msg.type==="success"?"success":"danger"})`,color:`var(--${msg.type==="success"?"success":"danger-text"})`,padding:"10px 14px",borderRadius:8,fontSize:12,marginBottom:16}}>{msg.text}</div>}
<Sec title="App Settings" icon="ti-settings" color="#3b82f6" keys={["app_name","app_tagline","allow_registration","max_trees_per_user","maintenance_mode"]}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Field label="App Name" k="app_name" ph="వంశవృక్షం"/><Field label="App Tagline" k="app_tagline" ph="Telugu Family Tree Builder"/><Field label="Max Trees Per User" k="max_trees_per_user" type="number" ph="10" hint="0 = unlimited"/><Field label="Allow Registration" k="allow_registration" type="toggle"/><Field label="Maintenance Mode" k="maintenance_mode" type="toggle"/></div></Sec>
<Sec title="Anthropic AI Settings" icon="ti-sparkles" color="#7c3aed" keys={["anthropic_api_key","anthropic_model","anthropic_max_tokens","enable_ai_chat"]}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div style={{gridColumn:"1/-1"}}><Field label="Anthropic API Key" k="anthropic_api_key" type="password" ph="sk-ant-api03-…" hint="From console.anthropic.com"/></div><Field label="Model" k="anthropic_model" opts={[["claude-sonnet-4-20250514","Claude Sonnet 4"],["claude-haiku-4-5-20251001","Claude Haiku 4.5 (Fast)"]]}/><Field label="Max Tokens" k="anthropic_max_tokens" type="number" ph="1000"/><Field label="AI Chat" k="enable_ai_chat" type="toggle"/></div></Sec>
<Sec title="SMTP / Email Settings" icon="ti-mail" color="#10b981" keys={["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_encryption","smtp_enabled"]}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Field label="SMTP Host" k="smtp_host" ph="smtp.gmail.com"/><Field label="SMTP Port" k="smtp_port" type="number" ph="587"/><Field label="Username" k="smtp_user" ph="your@email.com"/><Field label="Password" k="smtp_pass" type="password" ph="App password"/><Field label="From Name" k="smtp_from_name" ph="వంశవృక్షం"/><Field label="From Email" k="smtp_from_email" ph="noreply@yourdomain.com"/><Field label="Encryption" k="smtp_encryption" opts={[["tls","TLS (587)"],["ssl","SSL (465)"],["none","None"]]}/><Field label="Enable Emails" k="smtp_enabled" type="toggle"/></div></Sec>
<Sec title="Cloudinary Storage" icon="ti-cloud-upload" color="#f59e0b" keys={["cloudinary_cloud_name","cloudinary_api_key","cloudinary_api_secret"]}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Field label="Cloud Name" k="cloudinary_cloud_name" ph="your-cloud-name"/><Field label="API Key" k="cloudinary_api_key" type="password" ph="123…"/><div style={{gridColumn:"1/-1"}}><Field label="API Secret" k="cloudinary_api_secret" type="password" ph="••••••••"/></div></div></Sec>
</div>);}

function Loader(){return<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"var(--text3)"}}><i className="ti ti-loader-2" style={{fontSize:24,marginRight:8,animation:"spin 1s linear infinite"}}/>Loading…</div>;}

// ─────────────────────────────────────────────────────────
// LEFT SIDEBAR
// ─────────────────────────────────────────────────────────
function Sidebar({ view, setView, user, theme, toggleTheme, onLogout }) {
  const [masterOpen, setMasterOpen] = useState(view?.startsWith("master"));
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin      = user?.role === "ADMIN" || isSuperAdmin;
  const NavBtn = ({ id, icon, label, indent=false }) => (
    <button onClick={()=>setView(id)} className={`nav-btn ${view===id?"nav-active":""} ${indent?"nav-indent":""}`}>
      <i className={`ti ${icon}`} style={{ fontSize:14, flexShrink:0 }} /><span style={{ flex:1, textAlign:"left" }}>{label}</span>
    </button>
  );
  return (
    <div className="sidebar">
      <div className="sb-brand">
        <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <i className="ti ti-binary-tree-2" style={{ fontSize:18, color:"#fff" }} />
        </div>
        <div><div style={{ fontSize:14, fontWeight:700, color:"var(--text)" }}>వంశవృక్షం</div><div style={{ fontSize:9, color:"var(--text3)", letterSpacing:0.5 }}>FAMILY TREE SaaS</div></div>
      </div>
      <nav style={{ flex:1, overflowY:"auto", padding:"8px 8px" }}>
        <div className="nav-section">MY ACCOUNT</div>
        <NavBtn id="my-trees" icon="ti-home" label="My Trees" />
        {isAdmin && <>
          <div className="nav-section" style={{ marginTop:16 }}>{isSuperAdmin?"SUPER ADMIN":"ADMIN"}</div>
          {isSuperAdmin && <NavBtn id="admin-overview" icon="ti-dashboard" label="Overview"/>}
          <NavBtn id="admin-trees"  icon="ti-trees"   label="Family Trees"/>
          <NavBtn id="admin-users"  icon="ti-users"   label="Users"/>
          {isSuperAdmin && <>
            <button onClick={()=>setMasterOpen(v=>!v)} className={`nav-btn ${(view==="master-villages"||view==="master-surnames")?"nav-parent-active":""}`}>
              <i className="ti ti-database" style={{fontSize:14,flexShrink:0}}/><span style={{flex:1,textAlign:"left"}}>Master Data</span>
              <i className={`ti ti-chevron-${masterOpen?"down":"right"}`} style={{fontSize:11,color:"var(--text3)"}}/>
            </button>
            {masterOpen && <>
              <NavBtn id="master-villages" icon="ti-map-pin"  label="Villages" indent/>
              <NavBtn id="master-surnames" icon="ti-id-badge" label="Surnames"  indent/>
            </>}
            <NavBtn id="admin-settings" icon="ti-settings" label="Settings"/>
          </>}
        </>}
      </nav>
      <div className="sb-footer">
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 4px", borderTop:"1px solid var(--border)", marginBottom:8 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{user?.name?.[0]||"?"}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ fontSize:9, color:"var(--text3)", textTransform:"uppercase", letterSpacing:0.5 }}>{user?.role}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={toggleTheme} className="sb-icon-btn" title={theme==="dark"?"Light":"Dark"}>
            <i className={`ti ti-${theme==="dark"?"sun":"moon"}`} style={{ fontSize:14 }} />
          </button>
          <button onClick={onLogout} className="sb-icon-btn sb-logout">
            <i className="ti ti-logout" style={{ fontSize:13 }} /><span style={{ fontSize:11, fontWeight:500 }}>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(()=>{ try{return JSON.parse(localStorage.getItem("ft_user"));}catch{return null;} });
  const [view, setView]         = useState("my-trees");
  const [trees, setTrees]       = useState([]);
  const [treesLoading, setTreesLoading] = useState(true);
  const [treeView, setTreeView] = useState(null);
  const treeRef                 = useRef(null);              // always latest tree
  const { theme, toggle }       = useTheme();

  // Keep ref in sync so closures always see the latest tree
  useEffect(() => { treeRef.current = treeView; }, [treeView]);

  // Load trees from backend after login
  useEffect(() => {
    if (!user) return;
    setTreesLoading(true);
    api("GET", "/api/trees")
      .then(d => { setTrees([...(d.owned||[]),...(d.shared||[])]); })
      .catch(e => { console.error("Trees fetch failed:", e); setTrees([]); })
      .finally(() => setTreesLoading(false));
  }, [user]);

  // Save tree to backend + update local list
  const syncTree = async () => {
    const cur = treeRef.current;
    if (!cur) return;
    // Always update local state
    setTrees(ts => ts.map(t => t.id === cur.id ? {...cur} : t));
    // Save to backend (skip demo tree)
    if (cur.id && cur.id !== "demo") {
      try {
        await api("PATCH", `/api/trees/${cur.id}`, {
          treeData:    JSON.stringify({ rootNode: cur.rootNode, persons: cur.persons, memberCounter: cur.memberCounter }),
          memberCount: Object.keys(cur.persons || {}).length,
        });
      } catch(e) { console.error("Auto-save failed:", e.message); }
    }
  };

  // Open a tree — load full data from backend
  const openTree = async (t) => {
    // Start with basic tree info immediately (fast UI response)
    setTreeView({ ...t, persons:{}, rootNode:null, members:0, _loading:true });
    try {
      const full = await api("GET", `/api/trees/${t.id}`);
      let persons = {}; let rootNode = null; let memberCounter = 0;
      if (full.treeData) {
        try {
          const parsed = JSON.parse(full.treeData);
          persons       = parsed.persons       || {};
          rootNode      = parsed.rootNode      || null;
          memberCounter = parsed.memberCounter || Object.keys(parsed.persons||{}).length;
        } catch(parseErr) { console.error("treeData parse error:", parseErr); }
      }
      setTreeView({ ...t, ...full, persons, rootNode, memberCounter,
        members: full.memberCount || Object.keys(persons).length, _loading:false });
    } catch(e) {
      console.error("openTree failed:", e.message);
      // Keep the basic tree info but mark as loaded
      setTreeView(prev => prev ? {...prev, _loading:false} : null);
    }
  };

  // Called by Back button in TreeEditor
  const syncAndClose = async () => { await syncTree(); setTreeView(null); };

  // Called by sidebar nav buttons
  const handleNav = async (v) => { await syncTree(); setTreeView(null); setView(v); };

  const isSuperAdmin = user?.role === "SUPERADMIN";
  const isAdmin      = user?.role === "ADMIN" || isSuperAdmin;

  const logout = () => { localStorage.removeItem("ft_token"); localStorage.removeItem("ft_user"); setUser(null); setView("my-trees"); setTreeView(null); };

  if (!user) return <><GS/><AuthPage onLogin={u=>setUser(u)} theme={theme} toggleTheme={toggle}/></>;
  return(
    <><GS/>
      <div className="app-shell">
        <Sidebar view={view} setView={handleNav} user={user} theme={theme} toggleTheme={toggle} onLogout={logout}/>
        <div className="app-content">
          {treeView ? (
            <TreeEditor tree={treeView} setTree={setTreeView} onBack={syncAndClose} allTrees={trees}/>
          ) : <>
            {view==="my-trees"        && <MyTreesView     trees={trees} onOpenTree={openTree} treesLoading={treesLoading}/>}
            {view==="admin-overview"  && isSuperAdmin && <AdminOverviewView/>}
            {view==="admin-trees"     && <AdminTreesView  onOpenTree={openTree} onTreeCreated={t=>setTrees(ts=>[t,...ts.filter(x=>x.id!==t.id)])} currentUser={user}/>}
            {view==="admin-users"     && <AdminUsersView   currentUser={user}/>}
            {view==="master-villages" && isSuperAdmin && <MasterDataView type="villages"/>}
            {view==="master-surnames" && isSuperAdmin && <MasterDataView type="surnames"/>}
            {view==="admin-settings"  && isSuperAdmin && <AdminSettingsView/>}
          </>}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────
function GS(){return<style>{`
  :root{--bg:#0d1117;--bg2:#161b22;--bg3:#21262d;--text:#e6edf3;--text2:#8b949e;--text3:#6e7681;--border:#30363d;--border2:#21262d;--card:#161b22;--input-bg:#0d1117;--shadow:rgba(0,0,0,0.5);--tree-bg:radial-gradient(ellipse at center,#0f1f3d 0%,#0d1117 70%);--accent:#3b82f6;--accent-bg:#1d4ed822;--accent-text:#93c5fd;--success:#3fb950;--success-bg:#3fb95022;--danger:#f85149;--danger-bg:#f8514922;--danger-text:#ff8182;}
  [data-theme="light"]{--bg:#f6f8fa;--bg2:#ffffff;--bg3:#eaeef2;--text:#24292f;--text2:#57606a;--text3:#8c959f;--border:#d0d7de;--border2:#eaeef2;--card:#ffffff;--input-bg:#ffffff;--shadow:rgba(0,0,0,0.12);--tree-bg:radial-gradient(ellipse at center,#dbeafe 0%,#f6f8fa 70%);--accent:#0969da;--accent-bg:#0969da15;--accent-text:#0550ae;--success:#1a7f37;--success-bg:#1a7f3715;--danger:#cf222e;--danger-bg:#cf222e15;--danger-text:#a40e26;}
  *{box-sizing:border-box;margin:0;padding:0}html,body,#root{height:100%;overflow:hidden}
  body{font-family:"Noto Sans Telugu",system-ui,sans-serif;font-size:13px;background:var(--bg);color:var(--text);transition:background 0.2s,color 0.2s}
  input,select,textarea,button{font-family:inherit}
  input,select,textarea{background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-size:12px;outline:none;transition:border-color 0.15s}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)}input::placeholder,textarea::placeholder{color:var(--text3)}select option{background:var(--card)}
  @keyframes spin{to{transform:rotate(360deg)}}
  .app-shell{display:flex;height:100vh;overflow:hidden}
  .app-content{flex:1;overflow:hidden;display:flex;flex-direction:column;background:var(--bg)}
  /* Sidebar */
  .sidebar{width:220px;flex-shrink:0;background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
  .sb-brand{display:flex;align-items:center;gap:10px;padding:14px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
  .sb-footer{padding:10px 10px 12px;flex-shrink:0}
  .sb-icon-btn{display:flex;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--text2);transition:all 0.15s;flex-shrink:0}
  .sb-icon-btn:hover{border-color:var(--text2);color:var(--text)}
  .sb-logout{flex:1;gap:5px;justify-content:center;font-size:12px;font-weight:500}.sb-logout:hover{border-color:var(--danger);color:var(--danger)}
  .nav-btn{width:100%;display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:transparent;border:none;cursor:pointer;color:var(--text2);font-size:12px;font-weight:500;transition:all 0.15s;margin-bottom:2px}
  .nav-btn:hover{background:var(--bg3);color:var(--text)}.nav-active{background:var(--accent-bg)!important;color:var(--accent)!important}
  .nav-parent-active{color:var(--accent)}.nav-indent{padding-left:26px;font-size:11px}
  .nav-section{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;padding:4px 10px 2px}
  /* Views */
  .view-wrap{flex:1;overflow-y:auto;padding:24px;background:var(--bg)}
  .view-wrap::-webkit-scrollbar{width:5px}.view-wrap::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  .view-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
  .view-title{font-size:20px;font-weight:700;color:var(--text)}.view-sub{font-size:12px;color:var(--text3);margin-top:3px}
  /* Buttons */
  .iconbtn{background:none;border:none;cursor:pointer;color:var(--text2);font-size:15px;padding:2px;display:flex;align-items:center}.iconbtn:hover{color:var(--text)}
  .btn1{background:linear-gradient(135deg,#1d4ed8,#7c3aed);border:none;color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;transition:opacity 0.15s}.btn1:hover{opacity:0.88}.btn1:disabled{opacity:.4;cursor:not-allowed}
  .btn2{background:transparent;border:1px solid var(--border);color:var(--text2);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;transition:all 0.15s}.btn2:hover{border-color:var(--text2);color:var(--text)}
  .fg{margin-bottom:10px}.fg label{display:block;font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  /* ── PERSON CARD ───────────────────────────────── */
  .pc{width:130px;background:var(--card);border:1.5px solid var(--border);border-radius:12px;display:flex;flex-direction:column;align-items:center;padding-top:40px;position:relative;transition:all 0.15s;cursor:pointer;flex-shrink:0}
  .pc:hover{border-color:var(--ring,var(--accent));box-shadow:0 4px 20px color-mix(in srgb,var(--ring,var(--accent)) 30%,transparent)}
  .pc-sel{border-color:var(--ring,var(--accent))!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--ring,var(--accent)) 30%,transparent)!important}
  .pc-photo-wrap{position:absolute;top:-28px;display:flex;flex-direction:column;align-items:center}
  .pc-ring{width:60px;height:60px;border-radius:50%;border:3px solid;overflow:hidden;background:var(--bg3);display:flex;align-items:center;justify-content:center;position:relative}
  .pc-img{width:54px;height:54px;border-radius:50%;object-fit:cover}
  .pc-av{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;background:var(--bg2)}
  .pc-num{position:absolute;bottom:-4px;left:-4px;width:18px;height:18px;border-radius:50%;background:var(--card);border:1.5px solid var(--border);font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;color:var(--text);z-index:2}
  .pc-gbadge{position:absolute;bottom:-4px;right:-4px;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;z-index:2}
  .pc-body{text-align:center;padding:6px 8px 4px;width:100%}
  .pc-name{font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}
  .pc-name-te{font-size:9px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;margin-top:1px}
  .pc-years{font-size:9px;color:var(--text3);margin-top:1px}
  .pc-edu{font-size:9px;font-weight:600;margin-top:2px}
  .pc-acts{display:flex;gap:3px;padding:5px 6px 6px;border-top:1px solid var(--border2);width:100%;justify-content:center}
  .pc-btn{width:26px;height:26px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text2);transition:all 0.12s}
  .pc-btn:hover{background:var(--bg);color:var(--text);border-color:var(--text2)}
  .pc-del:hover{border-color:var(--danger)!important;color:var(--danger)!important}
  .pc-add:hover{border-color:var(--success)!important;color:var(--success)!important}
  /* ── TREE STRUCTURE ─────────────────────────────── */
  .ftn{display:flex;flex-direction:column;align-items:center;position:relative}
  .ftn-row{display:flex;align-items:center}
  .couple-conn{display:flex;align-items:center;padding:0 4px;margin-top:0}
  .couple-line{width:16px;height:2px;background:#ef444488}
  .couple-heart{font-size:14px;color:#ef4444;filter:drop-shadow(0 0 4px #ef444466)}
  .ftn-vwrap{display:flex;flex-direction:column;align-items:center;position:relative}
  .ftvl-top{width:2px;height:16px;border-radius:1px;flex-shrink:0}
  .ftvl-bottom{width:2px;height:16px;border-radius:1px;flex-shrink:0}
  /* Collapse dot on connecting line */
  .collapse-dot{width:22px;height:22px;border-radius:50%;background:var(--text);color:var(--bg);border:2px solid var(--bg);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:2;box-shadow:0 2px 8px var(--shadow);transition:all 0.15s;line-height:1;flex-shrink:0}
  .collapse-dot:hover{transform:scale(1.15)}
  .fthr{display:flex;flex-direction:row;align-items:flex-start}
  .ftcc{display:flex;flex-direction:column;align-items:center;padding:0 8px;position:relative}
  .ftcc::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--lc,rgba(128,128,128,0.3));border-radius:1px}
  .ftcf::before{left:50%}.ftcl::before{right:50%}.ftco::before{display:none}
  .ftvs{width:2px;height:18px;border-radius:1px;flex-shrink:0;margin:0 auto}
  /* Person panel */
  .pp{width:285px;min-width:265px;background:var(--card);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
  .pph{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid var(--border)}
  .ppaw{position:relative;flex-shrink:0;cursor:pointer}
  .ppai{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--border)}
  .ppap{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:2px solid}
  .ppcam{position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text2)}
  .ppb{flex:1;overflow-y:auto;padding:12px 14px}.ppf{padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px}
  .ppb::-webkit-scrollbar{width:4px}.ppb::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  /* Locked field */
  .locked-field{display:flex;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:12px;color:var(--text3);gap:4px}
  /* AI */
  .aic{position:fixed;bottom:80px;right:16px;width:305px;background:var(--card);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;z-index:1000;max-height:440px;box-shadow:0 8px 32px var(--shadow)}
  .aih{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid var(--border)}
  .aim{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;min-height:160px;max-height:280px}
  .aim::-webkit-scrollbar{width:3px}.aim::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  .aimr{display:flex}.aimu{justify-content:flex-end}
  .aib{padding:8px 11px;border-radius:10px;font-size:12px;line-height:1.5;white-space:pre-wrap;max-width:90%}
  .aib[data-role="user"]{background:var(--accent-bg);color:var(--accent-text);border:1px solid rgba(59,130,246,0.3)}
  .aib[data-role="assistant"]{background:var(--bg3);color:var(--text);border:1px solid var(--border)}
  .aiir{display:flex;gap:7px;padding:10px 12px;border-top:1px solid var(--border)}.aiir input{flex:1;font-size:12px}
  /* Modals */
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(4px)}
  .mb{background:var(--card);border:1px solid var(--border);border-radius:12px;width:100%;max-width:420px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px var(--shadow)}
  .mh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text);font-weight:600}
  .mbd{padding:16px;overflow-y:auto;flex:1}.mf{padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end}
  .upload-zone{border:2px dashed var(--border);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all 0.2s}.upload-zone:hover{border-color:var(--accent);background:var(--accent-bg)}
`}</style>;}
