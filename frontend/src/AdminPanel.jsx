import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "";
const api = async (method, path, body) => {
  const token = localStorage.getItem("ft_token");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error||"Request failed");
  return data;
};

const ROLE_C = {
  SUPERADMIN:{bg:"rgba(248,81,73,0.15)",text:"#ff8182",border:"#f85149",label:"SuperAdmin"},
  ADMIN:     {bg:"rgba(210,153,34,0.15)",text:"#e3b341",border:"#d29922",label:"Admin"},
  USER:      {bg:"rgba(48,54,61,0.5)",   text:"#8b949e",border:"#484f58",label:"User"},
};
const RoleBadge = ({role}) => { const c=ROLE_C[role]||ROLE_C.USER; return <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{c.label}</span>; };

function StatCard({icon,label,value,sub,color,T}){
  return(
    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><i className={`ti ${icon}`} style={{fontSize:20,color}}/></div>
        <div style={{fontSize:28,fontWeight:800,color:T.text}}>{value}</div>
      </div>
      <div style={{fontSize:12,fontWeight:700,color:T.text}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:T.text3,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────
function SettingsTab({T}){
  const [s,setS]=useState({});
  const [loading,setLoad]=useState(true);
  const [saving,setSave]=useState(null);
  const [msgs,setMsgs]=useState({});

  useEffect(()=>{
    api("GET","/api/settings")
      .then(data=>setS(data))
      .catch(()=>setS({}))
      .finally(()=>setLoad(false));
  },[]);

  const upd = k => e => setS(p=>({...p,[k]:e.target.type==="checkbox"?String(e.target.checked):e.target.value}));
  const toggle = k => setS(p=>({...p,[k]:String(p[k]!=="true")}));

  const save = async (sectionId, keys) => {
    setSave(sectionId);
    try {
      const payload={};
      keys.forEach(k=>{ if(s[k]!==undefined&&s[k]!=="••••••••") payload[k]=s[k]; });
      await api("POST","/api/settings",payload);
      setMsgs(m=>({...m,[sectionId]:{type:"ok",text:"✓ Saved successfully"}}));
    } catch(e) { setMsgs(m=>({...m,[sectionId]:{type:"err",text:"Error: "+e.message}})); }
    setSave(null);
    setTimeout(()=>setMsgs(m=>({...m,[sectionId]:null})),3000);
  };

  if (loading) return <div style={{textAlign:"center",padding:48,color:T.text3}}><i className="ti ti-loader-2" style={{fontSize:32,display:"block",marginBottom:8,animation:"spin 1s linear infinite"}}/><style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>Loading settings…</div>;

  const Section = ({id,title,icon,color,children,keys}) => (
    <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,marginBottom:16,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${T.border}`,background:T.bg3}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:8,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><i className={`ti ${icon}`} style={{fontSize:16,color}}/></div>
          <span style={{fontWeight:700,fontSize:13,color:T.text}}>{title}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {msgs[id] && <span style={{fontSize:11,color:msgs[id].type==="ok"?T.success:T.danger}}>{msgs[id].text}</span>}
          <button onClick={()=>save(id,keys)} disabled={saving===id} style={{background:saving===id?T.bg3:`linear-gradient(135deg,#1d4ed8,#7c3aed)`,border:"none",color:saving===id?T.text3:"#fff",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>{saving===id?"Saving…":"Save"}</button>
        </div>
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );

  const Field = ({k,label,type="text",ph="",hint,opts}) => (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:10,color:T.text3,marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
      {opts ? <select value={s[k]||""} onChange={upd(k)} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}>
          {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      : type==="toggle"
        ? <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div onClick={()=>toggle(k)} style={{width:42,height:23,borderRadius:12,background:s[k]==="true"?"#3b82f6":T.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{position:"absolute",top:2,left:s[k]==="true"?20:2,width:19,height:19,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
            <span style={{fontSize:12,color:T.text2}}>{s[k]==="true"?"Enabled":"Disabled"}</span>
          </div>
        : <input type={type} value={s[k]||""} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/>
      }
      {hint && <div style={{fontSize:10,color:T.text3,marginTop:3}}>{hint}</div>}
    </div>
  );

  const G2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{children}</div>;
  const G1 = ({children}) => <div style={{gridColumn:"1/-1"}}>{children}</div>;

  return (
    <div>
      <Section id="app" title="App Settings" icon="ti-settings" color="#3b82f6" keys={["app_name","app_tagline","allow_registration","max_trees_per_user","maintenance_mode","default_visibility"]}>
        <G2>
          <Field k="app_name" label="App Name" ph="వంశవృక్షం"/>
          <Field k="app_tagline" label="App Tagline" ph="Telugu Family Tree Builder"/>
          <Field k="max_trees_per_user" label="Max Trees Per User" type="number" ph="10" hint="0 = unlimited"/>
          <Field k="default_visibility" label="Default Visibility" opts={[["private","Private"],["public","Public"]]}/>
          <Field k="allow_registration" label="Allow Registration" type="toggle" hint="Disable to stop new signups"/>
          <Field k="maintenance_mode" label="Maintenance Mode" type="toggle" hint="Show maintenance page"/>
        </G2>
      </Section>

      <Section id="ai" title="Anthropic AI Settings" icon="ti-sparkles" color="#7c3aed" keys={["anthropic_api_key","anthropic_model","anthropic_max_tokens","enable_ai_chat","enable_image_extraction"]}>
        <div style={{background:`rgba(124,58,237,0.1)`,border:"1px solid rgba(124,58,237,0.3)",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#a78bfa"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>Get your API key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:"#7c3aed",fontWeight:700}}>console.anthropic.com</a>
        </div>
        <G2>
          <G1><Field k="anthropic_api_key" label="Anthropic API Key" type="password" ph="sk-ant-api03-…" hint="Secret key — never share this publicly"/></G1>
          <Field k="anthropic_model" label="Model" opts={[["claude-sonnet-4-20250514","Claude Sonnet 4 (Recommended)"],["claude-opus-4-5","Claude Opus 4.5 (Most Powerful)"],["claude-haiku-4-5-20251001","Claude Haiku 4.5 (Fastest)"]]} hint="Used for AI chat, translation, extraction"/>
          <Field k="anthropic_max_tokens" label="Max Response Tokens" type="number" ph="1000" hint="Higher = longer responses"/>
          <Field k="enable_ai_chat" label="AI Chat Feature" type="toggle" hint="Enable chat in tree editor"/>
          <Field k="enable_image_extraction" label="Image/PDF Extraction" type="toggle" hint="Upload docs to auto-build tree"/>
        </G2>
      </Section>

      <Section id="smtp" title="SMTP / Email Settings" icon="ti-mail" color="#10b981" keys={["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_encryption","smtp_enabled"]}>
        <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#6ee7b7"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>Used for password reset, invite emails, and notifications
        </div>
        <G2>
          <Field k="smtp_host" label="SMTP Host" ph="smtp.gmail.com" hint="e.g. smtp.gmail.com, smtp.sendgrid.net"/>
          <Field k="smtp_port" label="SMTP Port" type="number" ph="587" hint="587=TLS · 465=SSL · 25=None"/>
          <Field k="smtp_user" label="SMTP Username" ph="your@email.com"/>
          <Field k="smtp_pass" label="SMTP Password" type="password" ph="••••••••" hint="Use App Password for Gmail"/>
          <Field k="smtp_from_name" label="From Name" ph="వంశవృక్షం Team"/>
          <Field k="smtp_from_email" label="From Email" ph="noreply@yourdomain.com"/>
          <Field k="smtp_encryption" label="Encryption" opts={[["tls","TLS (Port 587)"],["ssl","SSL (Port 465)"],["none","None (Port 25)"]]}/>
          <Field k="smtp_enabled" label="Enable Emails" type="toggle" hint="Send system emails"/>
        </G2>
        <button onClick={async()=>{try{await api("POST","/api/settings/test-email",{});alert("Test email sent!");}catch(e){alert("Error: "+e.message);}}} style={{marginTop:8,background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,display:"inline-flex",alignItems:"center",gap:5}}>
          <i className="ti ti-send" style={{fontSize:11}}/>Send Test Email
        </button>
      </Section>

      <Section id="storage" title="Cloudinary Storage (Photos)" icon="ti-cloud-upload" color="#f59e0b" keys={["cloudinary_cloud_name","cloudinary_api_key","cloudinary_api_secret","enable_photo_upload","max_photo_size_mb"]}>
        <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#fcd34d"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>Free tier at <a href="https://cloudinary.com" target="_blank" rel="noreferrer" style={{color:"#f59e0b",fontWeight:700}}>cloudinary.com</a> · 25GB storage included
        </div>
        <G2>
          <Field k="cloudinary_cloud_name" label="Cloud Name" ph="your-cloud-name"/>
          <Field k="max_photo_size_mb" label="Max Photo Size (MB)" type="number" ph="5"/>
          <G1><Field k="cloudinary_api_key" label="API Key" type="password" ph="••••••••••••••••"/></G1>
          <G1><Field k="cloudinary_api_secret" label="API Secret" type="password" ph="••••••••••••••••" hint="Never expose this in frontend code"/></G1>
          <Field k="enable_photo_upload" label="Photo Upload" type="toggle" hint="Allow profile photos"/>
        </G2>
      </Section>

      <Section id="features" title="Feature Toggles" icon="ti-toggle-right" color="#06b6d4" keys={["enable_public_trees","enable_guest_view","enable_search","enable_export","enable_telugu_ocr","enable_notifications"]}>
        <G2>
          <Field k="enable_public_trees" label="Public Trees" type="toggle" hint="Allow trees to be set public"/>
          <Field k="enable_guest_view" label="Guest View" type="toggle" hint="Non-logged-in users view public trees"/>
          <Field k="enable_search" label="Tree Search" type="toggle" hint="Search within a family tree"/>
          <Field k="enable_export" label="Export to PDF" type="toggle" hint="Download tree as PDF"/>
          <Field k="enable_telugu_ocr" label="Telugu OCR / AI" type="toggle" hint="AI extracts Telugu documents"/>
          <Field k="enable_notifications" label="Email Notifications" type="toggle" hint="Notify on invites and changes"/>
        </G2>
      </Section>
    </div>
  );
}

function OverviewTab({T}){
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("GET","/api/admin/stats").then(setStats).catch(()=>setStats(null));}, []);
  if (!stats) return <div style={{textAlign:"center",padding:48,color:T.text3}}>Loading stats…</div>;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:16}}>
        <StatCard icon="ti-users" label="Total Users" value={stats.totalUsers} sub={`+${stats.recentUsers} this week`} color="#3b82f6" T={T}/>
        <StatCard icon="ti-binary-tree" label="Total Trees" value={stats.totalTrees} sub={`+${stats.recentTrees} this week`} color="#10b981" T={T}/>
        <StatCard icon="ti-user-circle" label="Family Members" value={stats.totalPersons} sub="People recorded" color="#f59e0b" T={T}/>
        <StatCard icon="ti-arrows-join" label="Relationships" value={stats.totalRelationships} sub="Links recorded" color="#8b5cf6" T={T}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text2,marginBottom:14}}>Tree Visibility</div>
          {[["Public",stats.publicTrees,T.success],["Private",stats.privateTrees,T.text3]].map(([lbl,val,col])=>(
            <div key={lbl} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span style={{color:col,fontWeight:700}}>{lbl}</span><span style={{color:T.text2}}>{val}/{stats.totalTrees}</span></div>
              <div style={{height:6,background:T.bg3,borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${stats.totalTrees>0?(val/stats.totalTrees)*100:0}%`,background:col,borderRadius:999}}/></div>
            </div>
          ))}
        </div>
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text2,marginBottom:14}}>User Roles</div>
          {[["SUPERADMIN",stats.superAdmins],["ADMIN",stats.admins],["USER",stats.totalUsers-stats.superAdmins-stats.admins]].map(([role,val])=>(
            <div key={role} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><RoleBadge role={role}/><span style={{fontSize:20,fontWeight:800,color:T.text}}>{val}</span></div>
          ))}
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:T.text3}}>Active</span><span style={{fontSize:16,fontWeight:800,color:T.success}}>{stats.activeUsers}</span></div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({currentUser,T}){
  const [users,setUsers]=useState([]); const [load,setLoad]=useState(true); const [search,setSearch]=useState(""); const [showAdd,setAdd]=useState(false); const [msg,setMsg]=useState("");
  useEffect(()=>{api("GET","/api/admin/users").then(setUsers).finally(()=>setLoad(false));}, []);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const changeRole=async(id,role)=>{try{await api("PATCH",`/api/admin/users/${id}/role`,{role});setUsers(us=>us.map(u=>u.id===id?{...u,role}:u));flash("Role updated");}catch(e){flash("Error: "+e.message);}};
  const toggleSt=async(id,a)=>{try{const u=await api("PATCH",`/api/admin/users/${id}/status`,{isActive:!a});setUsers(us=>us.map(x=>x.id===id?{...x,isActive:u.isActive}:x));flash(u.isActive?"Activated":"Deactivated");}catch(e){flash("Error: "+e.message);}};
  const del=async(id,name)=>{if(!window.confirm(`Delete "${name}"?`))return;try{await api("DELETE",`/api/admin/users/${id}`);setUsers(us=>us.filter(u=>u.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}};
  const filtered=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));
  const btn=(style,onClick,icon,title)=><button onClick={onClick} title={title} style={{...{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 7px",cursor:"pointer",color:T.text2,display:"inline-flex",alignItems:"center"},...style}}><i className={`ti ${icon}`} style={{fontSize:12}}/></button>;

  const AddModal=({onClose,onAdd})=>{
    const [f,setF]=useState({name:"",email:"",password:"",role:"USER"}); const [l,setL]=useState(false); const [e,setE]=useState("");
    const upd=k=>ev=>setF(p=>({...p,[k]:ev.target.value}));
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:14}}>
        <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,width:"100%",maxWidth:400,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.text}}>Add User<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:16}}>✕</button></div>
          <div style={{padding:16}}>
            {[["name","Full Name","text","Full name"],["email","Email","email","user@example.com"],["password","Password","password","••••••••"]].map(([k,lbl,t,ph])=>(
              <div key={k} style={{marginBottom:11}}><label style={{display:"block",fontSize:10,color:T.text3,marginBottom:3,fontWeight:700,textTransform:"uppercase"}}>{lbl}</label><input type={t} value={f[k]} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/></div>
            ))}
            <div style={{marginBottom:11}}><label style={{display:"block",fontSize:10,color:T.text3,marginBottom:3,fontWeight:700,textTransform:"uppercase"}}>Role</label><select value={f.role} onChange={upd("role")} style={{width:"100%",fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}><option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option></select></div>
            {e&&<div style={{color:T.danger,fontSize:12,marginTop:6}}>{e}</div>}
          </div>
          <div style={{padding:"11px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
            <button onClick={async()=>{if(!f.name||!f.email||!f.password)return setE("All fields required");setL(true);setE("");try{const u=await api("POST","/api/admin/users",f);onAdd(u);onClose();}catch(e){setE(e.message);}setL(false);}} disabled={l} style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>{l?"Adding…":"Add User"}</button>
          </div>
        </div>
      </div>
    );
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…" style={{width:220,fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/>
        <button onClick={()=>setAdd(true)} style={{marginLeft:"auto",background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><i className="ti ti-user-plus" style={{fontSize:12}}/>Add User</button>
      </div>
      {msg&&<div style={{background:`${T.success}22`,border:`1px solid ${T.success}`,color:T.success,padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:10}}>{msg}</div>}
      {load?<div style={{textAlign:"center",padding:48,color:T.text3}}>Loading…</div>:(
        <div style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",background:T.bg2}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:T.bg3}}><tr>{["Name","Email","Role","Status","Trees","Joined","Actions"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{opacity:u.isActive?1:0.5,borderTop:`1px solid ${T.border2}`}}>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:T.accentBg,border:`1px solid ${T.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:T.accent,flexShrink:0}}>{u.name[0]}</div><span style={{fontWeight:600,color:T.text}}>{u.name}{u.id===currentUser.id&&<span style={{fontSize:9,color:T.accent,marginLeft:4}}>(you)</span>}</span></div></td>
                  <td style={{padding:"10px 12px",color:T.text2,fontSize:11}}>{u.email}</td>
                  <td style={{padding:"10px 12px"}}>{u.id===currentUser.id?<RoleBadge role={u.role}/>:<select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{fontSize:10,padding:"2px 6px",background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,cursor:"pointer"}}><option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option></select>}</td>
                  <td style={{padding:"10px 12px"}}><span style={{background:u.isActive?`${T.success}22`:T.bg3,color:u.isActive?T.success:T.text3,border:`1px solid ${u.isActive?T.success:T.border}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{u.isActive?"Active":"Inactive"}</span></td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:T.text2}}>{u._count?.ownedTrees||0}</td>
                  <td style={{padding:"10px 12px",color:T.text3,fontSize:10,whiteSpace:"nowrap"}}>{u.createdAt?.slice(0,10)}</td>
                  <td style={{padding:"10px 12px"}}>{u.id!==currentUser.id&&<div style={{display:"flex",gap:4}}>{btn({},()=>toggleSt(u.id,u.isActive),u.isActive?"ti-user-off":"ti-user-check","Toggle")}{btn({color:T.danger},()=>del(u.id,u.name),"ti-trash","Delete")}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:T.text3,fontSize:12}}>No users found</div>}
        </div>
      )}
      {showAdd&&<AddModal onClose={()=>setAdd(false)} onAdd={u=>setUsers(us=>[u,...us])}/>}
    </div>
  );
}

function TreesTab({T}){
  const [trees,setTrees]=useState([]); const [load,setLoad]=useState(true); const [search,setSearch]=useState(""); const [msg,setMsg]=useState("");
  useEffect(()=>{api("GET","/api/admin/trees").then(setTrees).finally(()=>setLoad(false));}, []);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const toggleVis=async(id,cur)=>{const n=cur==="public"?"private":"public";try{await api("PATCH",`/api/admin/trees/${id}`,{visibility:n});setTrees(ts=>ts.map(t=>t.id===id?{...t,visibility:n}:t));flash(`Set to ${n}`);}catch(e){flash("Error: "+e.message);}};
  const del=async(id,name)=>{if(!window.confirm(`Delete "${name}"?`))return;try{await api("DELETE",`/api/admin/trees/${id}`);setTrees(ts=>ts.filter(t=>t.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}};
  const filtered=trees.filter(t=>t.nameEn?.toLowerCase().includes(search.toLowerCase())||t.name?.toLowerCase().includes(search.toLowerCase())||t.owner?.name?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search trees…" style={{width:220,fontSize:12,background:T.input,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,padding:"7px 10px"}}/></div>
      {msg&&<div style={{background:`${T.success}22`,border:`1px solid ${T.success}`,color:T.success,padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:10}}>{msg}</div>}
      {load?<div style={{textAlign:"center",padding:48,color:T.text3}}>Loading…</div>:(
        <div style={{border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",background:T.bg2}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:T.bg3}}><tr>{["Tree","Owner","Members","Visibility","Created","Actions"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id} style={{borderTop:`1px solid ${T.border2}`}}>
                  <td style={{padding:"10px 12px"}}><div style={{fontWeight:700,color:T.text,fontFamily:"monospace",fontSize:11}}>{t.nameEn}</div><div style={{fontSize:10,color:T.text3}}>{t.name}</div></td>
                  <td style={{padding:"10px 12px"}}><div style={{color:T.text2,fontSize:11}}>{t.owner?.name}</div><div style={{fontSize:10,color:T.text3}}>{t.owner?.email}</div></td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:T.text2}}>{t._count?.persons||0}</td>
                  <td style={{padding:"10px 12px"}}><span style={{background:t.visibility==="public"?`${T.success}22`:T.bg3,color:t.visibility==="public"?T.success:T.text3,border:`1px solid ${t.visibility==="public"?T.success:T.border}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{t.visibility}</span></td>
                  <td style={{padding:"10px 12px",color:T.text3,fontSize:10}}>{t.createdAt?.slice(0,10)}</td>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:4}}>
                    <button onClick={()=>toggleVis(t.id,t.visibility)} style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 7px",cursor:"pointer",color:T.text2,display:"inline-flex",alignItems:"center"}}><i className={`ti ti-${t.visibility==="public"?"lock":"world"}`} style={{fontSize:12}}/></button>
                    <button onClick={()=>del(t.id,t.nameEn)} style={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 7px",cursor:"pointer",color:T.danger,display:"inline-flex",alignItems:"center"}}><i className="ti ti-trash" style={{fontSize:12}}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:T.text3,fontSize:12}}>No trees found</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({user, onBack, T}){
  const [tab,setTab]=useState("overview");
  const TABS=[{id:"overview",label:"Overview",icon:"ti-dashboard"},{id:"users",label:"Users",icon:"ti-users"},{id:"trees",label:"Trees",icon:"ti-binary-tree"},{id:"settings",label:"Settings",icon:"ti-settings"}];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
      <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
          <button onClick={onBack} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.text2,padding:"4px 10px",borderRadius:8,cursor:"pointer",fontSize:11,display:"inline-flex",alignItems:"center",gap:3}}><i className="ti ti-chevron-left" style={{fontSize:10}}/>Back</button>
          <div style={{width:32,height:32,borderRadius:8,background:"rgba(248,81,73,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><i className="ti ti-shield-lock" style={{fontSize:16,color:T.danger}}/></div>
          <div><div style={{fontWeight:800,fontSize:14,color:T.text}}>Admin Panel</div><div style={{fontSize:10,color:T.text3}}>వంశవృక్షం · {user.role}</div></div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <RoleBadge role={user.role}/>
            <span style={{fontSize:11,color:T.text2}}>{user.name}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:2}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",fontSize:12,fontWeight:700,background:"none",border:"none",cursor:"pointer",color:tab===t.id?T.accent:T.text2,borderBottom:`2px solid ${tab===t.id?T.accent:"transparent"}`,display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s"}}><i className={`ti ${t.icon}`} style={{fontSize:13}}/>{t.label}</button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {tab==="overview" && <OverviewTab T={T}/>}
        {tab==="users"    && <UsersTab currentUser={user} T={T}/>}
        {tab==="trees"    && <TreesTab T={T}/>}
        {tab==="settings" && <SettingsTab T={T}/>}
      </div>
    </div>
  );
}
