import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "";
const api = async (method, path, body) => {
  const token = localStorage.getItem("ft_token");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const ROLE_COLORS = {
  SUPERADMIN:{ bg:"#f8514922", text:"#ff8182", border:"#f85149", label:"SuperAdmin" },
  ADMIN:     { bg:"#d2992222", text:"#e3b341", border:"#d29922", label:"Admin" },
  USER:      { bg:"#30363d",   text:"#8b949e", border:"#484f58", label:"User" },
};
const RoleBadge = ({role}) => { const c=ROLE_COLORS[role]||ROLE_COLORS.USER; return <span style={{background:c.bg,color:c.text,border:`1px solid ${c.border}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{c.label}</span>; };
const StatusBadge = ({active}) => <span style={{background:active?"#3fb95022":"#30363d",color:active?"#3fb950":"#8b949e",border:`1px solid ${active?"#3fb950":"#484f58"}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{active?"Active":"Inactive"}</span>;

function StatCard({icon,label,value,sub,color}){
  return(
    <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,padding:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <i className={`ti ${icon}`} style={{fontSize:20,color}}/>
        </div>
        <div style={{fontSize:28,fontWeight:700,color:"#e6edf3"}}>{value}</div>
      </div>
      <div style={{fontSize:12,fontWeight:600,color:"#e6edf3"}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:"#6e7681",marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────
function SettingsTab(){
  const [settings,setSettings] = useState({});
  const [loading,setLoading]   = useState(true);
  const [saving,setSaving]     = useState(false);
  const [msg,setMsg]           = useState({text:"",type:""});

  useEffect(()=>{
    api("GET","/api/settings").then(data=>{setSettings(data);}).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const upd = k => e => setSettings(s=>({...s,[k]:e.target.type==="checkbox"?String(e.target.checked):e.target.value}));

  const save = async (keys) => {
    setSaving(true); setMsg({text:"",type:""});
    try {
      const subset = {};
      keys.forEach(k=>{ if(settings[k]!==undefined) subset[k]=settings[k]; });
      await api("POST","/api/settings",subset);
      setMsg({text:"✓ Settings saved successfully",type:"success"});
    } catch(e){ setMsg({text:"Error: "+e.message,type:"error"}); }
    setSaving(false);
    setTimeout(()=>setMsg({text:"",type:""}),3000);
  };

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#6e7681"}}>Loading settings…</div>;

  const Section = ({title,icon,color,children,saveKeys}) => (
    <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:"1px solid #30363d",background:"#0d1117"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className={`ti ${icon}`} style={{fontSize:16,color}}/>
          </div>
          <span style={{fontWeight:600,fontSize:13,color:"#e6edf3"}}>{title}</span>
        </div>
        <button className="btn1" style={{padding:"4px 12px",fontSize:11}} onClick={()=>save(saveKeys)} disabled={saving}>{saving?"Saving…":"Save"}</button>
      </div>
      <div style={{padding:"16px"}}>{children}</div>
    </div>
  );

  const Field = ({label,k,type="text",placeholder="",hint,options}) => (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:10,color:"#6e7681",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
      {options ? (
        <select value={settings[k]||""} onChange={upd(k)} style={{width:"100%",fontSize:12}}>
          {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      ) : type==="toggle" ? (
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div onClick={()=>setSettings(s=>({...s,[k]:String(s[k]!=="true")}))}
            style={{width:40,height:22,borderRadius:11,background:settings[k]==="true"?"#3b82f6":"#30363d",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:settings[k]==="true"?18:2,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
          </div>
          <span style={{fontSize:12,color:"#8b949e"}}>{settings[k]==="true"?"Enabled":"Disabled"}</span>
        </div>
      ) : (
        <input type={type} value={settings[k]||""} onChange={upd(k)} placeholder={placeholder} style={{width:"100%",fontSize:12}}/>
      )}
      {hint && <div style={{fontSize:10,color:"#6e7681",marginTop:3}}>{hint}</div>}
    </div>
  );

  return (
    <div>
      {msg.text && <div style={{background:msg.type==="success"?"#3fb95022":"#f8514922",border:`1px solid ${msg.type==="success"?"#3fb950":"#f85149"}`,color:msg.type==="success"?"#3fb950":"#ff8182",padding:"10px 14px",borderRadius:8,marginBottom:16,fontSize:12}}>{msg.text}</div>}

      {/* App Settings */}
      <Section title="App Settings" icon="ti-settings" color="#3b82f6" saveKeys={["app_name","app_tagline","allow_registration","max_trees_per_user","maintenance_mode"]}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><Field label="App Name" k="app_name" placeholder="వంశవృక్షం"/></div>
          <div><Field label="App Tagline" k="app_tagline" placeholder="Telugu Family Tree Builder"/></div>
          <div><Field label="Max Trees Per User" k="max_trees_per_user" type="number" placeholder="10" hint="Set 0 for unlimited"/></div>
          <div><Field label="Allow Registration" k="allow_registration" type="toggle" hint="Disable to prevent new signups"/></div>
          <div><Field label="Maintenance Mode" k="maintenance_mode" type="toggle" hint="Show maintenance page to all users"/></div>
          <div><Field label="Default Tree Visibility" k="default_visibility" options={[["private","Private"],["public","Public"]]} hint="Default when creating new tree"/></div>
        </div>
      </Section>

      {/* Anthropic AI Settings */}
      <Section title="Anthropic AI Settings" icon="ti-sparkles" color="#7c3aed" saveKeys={["anthropic_api_key","anthropic_model","anthropic_max_tokens","enable_ai_chat"]}>
        <div style={{background:"#0d1117",border:"1px solid #7c3aed44",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#a78bfa"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>
          Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{color:"#7c3aed"}}>console.anthropic.com</a>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Anthropic API Key" k="anthropic_api_key" type="password" placeholder="sk-ant-api03-…" hint="Your secret Claude API key — never share this"/></div>
          <div><Field label="Model" k="anthropic_model" options={[["claude-sonnet-4-20250514","Claude Sonnet 4 (Recommended)"],["claude-opus-4-5","Claude Opus 4.5 (Powerful)"],["claude-haiku-4-5-20251001","Claude Haiku 4.5 (Fast)"]]} hint="Model used for AI chat and image extraction"/></div>
          <div><Field label="Max Tokens" k="anthropic_max_tokens" type="number" placeholder="1000" hint="Maximum response length"/></div>
          <div><Field label="AI Chat Feature" k="enable_ai_chat" type="toggle" hint="Enable AI assistant in tree editor"/></div>
          <div><Field label="Image Extraction" k="enable_image_extraction" type="toggle" hint="Allow users to upload genealogy images"/></div>
        </div>
      </Section>

      {/* SMTP Settings */}
      <Section title="SMTP / Email Settings" icon="ti-mail" color="#10b981" saveKeys={["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_encryption","smtp_enabled"]}>
        <div style={{background:"#0d1117",border:"1px solid #10b98144",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#6ee7b7"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>
          Used for password reset, invite emails, and notifications
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><Field label="SMTP Host" k="smtp_host" placeholder="smtp.gmail.com" hint="e.g. smtp.gmail.com, smtp.sendgrid.net"/></div>
          <div><Field label="SMTP Port" k="smtp_port" type="number" placeholder="587" hint="Usually 587 (TLS) or 465 (SSL)"/></div>
          <div><Field label="SMTP Username" k="smtp_user" placeholder="your@email.com"/></div>
          <div><Field label="SMTP Password" k="smtp_pass" type="password" placeholder="••••••••" hint="App password recommended for Gmail"/></div>
          <div><Field label="From Name" k="smtp_from_name" placeholder="వంశవృక్షం Team"/></div>
          <div><Field label="From Email" k="smtp_from_email" placeholder="noreply@yourdomain.com"/></div>
          <div><Field label="Encryption" k="smtp_encryption" options={[["tls","TLS (Port 587)"],["ssl","SSL (Port 465)"],["none","None (Port 25)"]]} hint="TLS recommended"/></div>
          <div><Field label="Enable Emails" k="smtp_enabled" type="toggle" hint="Send system emails to users"/></div>
        </div>
        <div style={{marginTop:8}}>
          <button className="btn2" style={{fontSize:11}} onClick={async()=>{
            try{ await api("POST","/api/settings/test-email",{}); setMsg({text:"✓ Test email sent! Check your inbox.",type:"success"}); }
            catch(e){ setMsg({text:"Error: "+e.message,type:"error"}); }
          }}>
            <i className="ti ti-send" style={{fontSize:11,marginRight:4}}/>Send Test Email
          </button>
        </div>
      </Section>

      {/* Cloudinary Storage */}
      <Section title="Cloudinary Storage (Photos)" icon="ti-cloud-upload" color="#f59e0b" saveKeys={["cloudinary_cloud_name","cloudinary_api_key","cloudinary_api_secret","enable_photo_upload"]}>
        <div style={{background:"#0d1117",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11,color:"#fcd34d"}}>
          <i className="ti ti-info-circle" style={{fontSize:12,marginRight:5}}/>
          Get credentials from <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" style={{color:"#f59e0b"}}>cloudinary.com/console</a> — free tier includes 25GB
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><Field label="Cloud Name" k="cloudinary_cloud_name" placeholder="your-cloud-name"/></div>
          <div><Field label="API Key" k="cloudinary_api_key" placeholder="123456789012345" type="password"/></div>
          <div style={{gridColumn:"1/-1"}}><Field label="API Secret" k="cloudinary_api_secret" type="password" placeholder="••••••••••••••••" hint="Keep this secret — never expose in frontend"/></div>
          <div><Field label="Photo Upload Feature" k="enable_photo_upload" type="toggle" hint="Allow users to upload profile photos"/></div>
          <div><Field label="Max Photo Size (MB)" k="max_photo_size_mb" type="number" placeholder="5" hint="Maximum upload size"/></div>
        </div>
      </Section>

      {/* Feature Toggles */}
      <Section title="Feature Toggles" icon="ti-toggle-right" color="#06b6d4" saveKeys={["enable_public_trees","enable_guest_view","enable_search","enable_export","enable_telugu_ocr"]}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><Field label="Public Trees" k="enable_public_trees" type="toggle" hint="Allow trees to be set as public"/></div>
          <div><Field label="Guest View" k="enable_guest_view" type="toggle" hint="Non-logged-in users can view public trees"/></div>
          <div><Field label="Tree Search" k="enable_search" type="toggle" hint="Search within a family tree"/></div>
          <div><Field label="Export to PDF" k="enable_export" type="toggle" hint="Allow downloading tree as PDF"/></div>
          <div><Field label="Telugu OCR" k="enable_telugu_ocr" type="toggle" hint="AI extracts from Telugu documents"/></div>
          <div><Field label="Email Notifications" k="enable_notifications" type="toggle" hint="Notify users of invites and changes"/></div>
        </div>
      </Section>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────
function OverviewTab(){
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("GET","/api/admin/stats").then(setStats).catch(()=>{});}, []);
  if (!stats) return <div style={{textAlign:"center",padding:40,color:"#6e7681"}}>Loading…</div>;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12,marginBottom:16}}>
        <StatCard icon="ti-users"       label="Total Users"    value={stats.totalUsers}         sub={`+${stats.recentUsers} this week`} color="#3b82f6"/>
        <StatCard icon="ti-binary-tree" label="Total Trees"    value={stats.totalTrees}         sub={`+${stats.recentTrees} this week`} color="#10b981"/>
        <StatCard icon="ti-user-circle" label="Family Members" value={stats.totalPersons}       sub="People recorded"                   color="#f59e0b"/>
        <StatCard icon="ti-arrows-join" label="Relationships"  value={stats.totalRelationships} sub="Links recorded"                    color="#8b5cf6"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#8b949e",marginBottom:14}}>Tree Visibility</div>
          {[["Public",stats.publicTrees,"#10b981"],["Private",stats.privateTrees,"#8b949e"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                <span style={{color:col,fontWeight:600}}>{lbl}</span>
                <span style={{color:"#8b949e"}}>{val} / {stats.totalTrees}</span>
              </div>
              <div style={{height:6,background:"#21262d",borderRadius:999,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${stats.totalTrees>0?(val/stats.totalTrees)*100:0}%`,background:col,borderRadius:999,transition:"width 0.5s"}}/>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"#161b22",border:"1px solid #30363d",borderRadius:12,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#8b949e",marginBottom:14}}>User Roles</div>
          {[["SUPERADMIN",stats.superAdmins],["ADMIN",stats.admins],["USER",stats.totalUsers-stats.superAdmins-stats.admins]].map(([role,val])=>(
            <div key={role} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <RoleBadge role={role}/><span style={{fontSize:20,fontWeight:700,color:"#e6edf3"}}>{val}</span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #30363d",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
            <span style={{fontSize:11,color:"#6e7681"}}>Active accounts</span>
            <span style={{fontSize:16,fontWeight:700,color:"#3fb950"}}>{stats.activeUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────
function UsersTab({currentUser}){
  const [users,setUsers] = useState([]); const [loading,setLoad] = useState(true);
  const [search,setSrch]  = useState(""); const [showAdd,setAdd]  = useState(false); const [msg,setMsg]=useState("");
  useEffect(()=>{ api("GET","/api/admin/users").then(setUsers).finally(()=>setLoad(false)); }, []);
  const flash = m => { setMsg(m); setTimeout(()=>setMsg(""),2500); };
  const changeRole = async(id,role) => {
    try { await api("PATCH",`/api/admin/users/${id}/role`,{role}); setUsers(us=>us.map(u=>u.id===id?{...u,role}:u)); flash("Role updated"); }
    catch(e){ flash("Error: "+e.message); }
  };
  const toggleStatus = async(id,isActive) => {
    try { const u=await api("PATCH",`/api/admin/users/${id}/status`,{isActive:!isActive}); setUsers(us=>us.map(x=>x.id===id?{...x,isActive:u.isActive}:x)); flash(u.isActive?"Activated":"Deactivated"); }
    catch(e){ flash("Error: "+e.message); }
  };
  const deleteUser = async(id,name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await api("DELETE",`/api/admin/users/${id}`); setUsers(us=>us.filter(u=>u.id!==id)); flash("Deleted"); }
    catch(e){ flash("Error: "+e.message); }
  };
  const filtered = users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));

  const AddUserModal = ({onClose,onAdd}) => {
    const [form,setForm]=useState({name:"",email:"",password:"",role:"USER"}); const [load,setL]=useState(false); const [err,setE]=useState("");
    const upd=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
    const submit=async()=>{
      if(!form.name||!form.email||!form.password)return setE("All fields required");
      setL(true); setE("");
      try{const u=await api("POST","/api/admin/users",form);onAdd(u);onClose();}catch(e){setE(e.message);}setL(false);
    };
    return(
      <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
        <div className="mh"><span style={{fontWeight:600}}>Add New User</span><button onClick={onClose} className="iconbtn">✕</button></div>
        <div style={{padding:16}}>
          {[["name","Full Name","text","Full name"],["email","Email","email","user@example.com"],["password","Password","password","••••••••"]].map(([k,lbl,t,ph])=>(
            <div style={{marginBottom:10}} key={k}><label style={{display:"block",fontSize:10,color:"#6e7681",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{lbl}</label><input type={t} value={form[k]} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/></div>
          ))}
          <div style={{marginBottom:10}}><label style={{display:"block",fontSize:10,color:"#6e7681",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Role</label>
            <select value={form.role} onChange={upd("role")} style={{width:"100%",fontSize:12}}><option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option></select>
          </div>
          {err&&<div style={{color:"#ff8182",fontSize:12,marginTop:6}}>{err}</div>}
        </div>
        <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={submit} disabled={load}>{load?"Adding…":"Add User"}</button></div>
      </div></div>
    );
  };

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSrch(e.target.value)} placeholder="Search users…" style={{width:220,fontSize:12}}/>
        <button className="btn1" style={{marginLeft:"auto"}} onClick={()=>setAdd(true)}><i className="ti ti-user-plus" style={{fontSize:12,marginRight:4}}/>Add User</button>
      </div>
      {msg&&<div style={{background:"#3fb95022",border:"1px solid #3fb950",color:"#3fb950",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:10}}>{msg}</div>}
      {loading?<div style={{textAlign:"center",padding:40,color:"#6e7681"}}>Loading…</div>:(
        <div style={{border:"1px solid #30363d",borderRadius:12,overflow:"hidden",background:"#161b22"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#0d1117"}}>
              <tr>{["Name","Email","Role","Status","Trees","Joined","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6e7681",textTransform:"uppercase",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{opacity:u.isActive?1:0.5,borderTop:"1px solid #21262d"}}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:"#1d4ed822",border:"1px solid #1d4ed8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#3b82f6",flexShrink:0}}>{u.name[0]}</div>
                      <span style={{fontWeight:500,color:"#e6edf3"}}>{u.name}{u.id===currentUser.id&&<span style={{fontSize:9,color:"#3b82f6",marginLeft:4}}>(you)</span>}</span>
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",color:"#8b949e",fontSize:11}}>{u.email}</td>
                  <td style={{padding:"10px 12px"}}>
                    {u.id===currentUser.id?<RoleBadge role={u.role}/>:(
                      <select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{fontSize:10,padding:"2px 6px",background:"#0d1117",border:"1px solid #30363d",borderRadius:6,color:"#e6edf3",cursor:"pointer"}}>
                        <option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option>
                      </select>
                    )}
                  </td>
                  <td style={{padding:"10px 12px"}}><StatusBadge active={u.isActive}/></td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:"#8b949e"}}>{u._count?.ownedTrees||0}</td>
                  <td style={{padding:"10px 12px",color:"#6e7681",fontSize:10,whiteSpace:"nowrap"}}>{u.createdAt?.slice(0,10)}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      {u.id!==currentUser.id&&<>
                        <button onClick={()=>toggleStatus(u.id,u.isActive)} title={u.isActive?"Deactivate":"Activate"} style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#8b949e",display:"inline-flex",alignItems:"center"}}>
                          <i className={`ti ti-${u.isActive?"user-off":"user-check"}`} style={{fontSize:12}}/>
                        </button>
                        <button onClick={()=>deleteUser(u.id,u.name)} title="Delete" style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#8b949e",display:"inline-flex",alignItems:"center"}}>
                          <i className="ti ti-trash" style={{fontSize:12}}/>
                        </button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"#6e7681",fontSize:12}}>No users found</div>}
        </div>
      )}
      {showAdd&&<AddUserModal onClose={()=>setAdd(false)} onAdd={u=>setUsers(us=>[u,...us])}/>}
    </div>
  );
}

// ── Trees Tab ─────────────────────────────────────────────
function TreesTab(){
  const [trees,setTrees]=useState([]); const [loading,setLoad]=useState(true); const [search,setSrch]=useState(""); const [msg,setMsg]=useState("");
  useEffect(()=>{ api("GET","/api/admin/trees").then(setTrees).finally(()=>setLoad(false)); }, []);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const toggleVis=async(id,current)=>{
    const next=current==="public"?"private":"public";
    try{await api("PATCH",`/api/admin/trees/${id}`,{visibility:next});setTrees(ts=>ts.map(t=>t.id===id?{...t,visibility:next}:t));flash(`Set to ${next}`);}catch(e){flash("Error: "+e.message);}
  };
  const deleteTree=async(id,name)=>{
    if(!window.confirm(`Delete "${name}"?`))return;
    try{await api("DELETE",`/api/admin/trees/${id}`);setTrees(ts=>ts.filter(t=>t.id!==id));flash("Deleted");}catch(e){flash("Error: "+e.message);}
  };
  const filtered=trees.filter(t=>t.nameEn?.toLowerCase().includes(search.toLowerCase())||t.name?.toLowerCase().includes(search.toLowerCase())||t.owner?.name?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}><input value={search} onChange={e=>setSrch(e.target.value)} placeholder="Search trees…" style={{width:220,fontSize:12}}/></div>
      {msg&&<div style={{background:"#3fb95022",border:"1px solid #3fb950",color:"#3fb950",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:10}}>{msg}</div>}
      {loading?<div style={{textAlign:"center",padding:40,color:"#6e7681"}}>Loading…</div>:(
        <div style={{border:"1px solid #30363d",borderRadius:12,overflow:"hidden",background:"#161b22"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead style={{background:"#0d1117"}}>
              <tr>{["Tree","Owner","Members","Visibility","Created","Actions"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#6e7681",textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id} style={{borderTop:"1px solid #21262d"}}>
                  <td style={{padding:"10px 12px"}}><div style={{fontWeight:600,color:"#e6edf3"}}>{t.name}</div><div style={{fontSize:10,color:"#6e7681"}}>{t.nameEn}</div></td>
                  <td style={{padding:"10px 12px"}}><div style={{color:"#8b949e"}}>{t.owner?.name}</div><div style={{fontSize:10,color:"#6e7681"}}>{t.owner?.email}</div></td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:"#8b949e"}}>{t._count?.persons||0}</td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{background:t.visibility==="public"?"#3fb95022":"#30363d",color:t.visibility==="public"?"#3fb950":"#8b949e",border:`1px solid ${t.visibility==="public"?"#3fb950":"#484f58"}`,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700}}>{t.visibility}</span>
                  </td>
                  <td style={{padding:"10px 12px",color:"#6e7681",fontSize:10}}>{t.createdAt?.slice(0,10)}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>toggleVis(t.id,t.visibility)} title="Toggle visibility" style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#8b949e",display:"inline-flex",alignItems:"center"}}>
                        <i className={`ti ti-${t.visibility==="public"?"lock":"world"}`} style={{fontSize:12}}/>
                      </button>
                      <button onClick={()=>deleteTree(t.id,t.nameEn)} title="Delete" style={{background:"#21262d",border:"1px solid #30363d",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#8b949e",display:"inline-flex",alignItems:"center"}}>
                        <i className="ti ti-trash" style={{fontSize:12}}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"#6e7681",fontSize:12}}>No trees found</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────
export default function AdminPanel({user, onBack}){
  const [tab,setTab]=useState("overview");
  const TABS=[
    {id:"overview",label:"Overview",  icon:"ti-dashboard"},
    {id:"users",   label:"Users",     icon:"ti-users"},
    {id:"trees",   label:"Trees",     icon:"ti-binary-tree"},
    {id:"settings",label:"Settings",  icon:"ti-settings"},
  ];
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#0d1117"}}>
      {/* Header */}
      <div style={{background:"#161b22",borderBottom:"1px solid #30363d",padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
          <button className="btn2" style={{padding:"4px 10px",fontSize:11}} onClick={onBack}><i className="ti ti-chevron-left" style={{fontSize:10}}/>Back</button>
          <div style={{width:32,height:32,borderRadius:8,background:"#f8514922",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="ti ti-shield-lock" style={{fontSize:16,color:"#f85149"}}/>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#e6edf3"}}>Admin Panel</div>
            <div style={{fontSize:10,color:"#6e7681"}}>వంశవృక్షం · {user.role}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <RoleBadge role={user.role}/>
            <span style={{fontSize:11,color:"#8b949e"}}>{user.name}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:2}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",fontSize:12,fontWeight:600,background:"none",border:"none",cursor:"pointer",color:tab===t.id?"#3b82f6":"#8b949e",borderBottom:`2px solid ${tab===t.id?"#3b82f6":"transparent"}`,display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
              <i className={`ti ${t.icon}`} style={{fontSize:13}}/>{t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        <style>{`.ov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(4px)}.mb{background:#161b22;border:1px solid #30363d;border-radius:12px;width:100%;max-width:420px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden}.mh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #30363d;font-size:14px;color:#e6edf3;font-weight:600}.mf{padding:12px 16px;border-top:1px solid #30363d;display:flex;gap:8px;justify-content:flex-end}.iconbtn{background:none;border:none;cursor:pointer;color:#8b949e;font-size:15px;padding:2px;display:flex;align-items:center}.btn1{background:linear-gradient(135deg,#1d4ed8,#7c3aed);border:none;color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.btn1:hover{opacity:0.9}.btn1:disabled{opacity:.4;cursor:not-allowed}.btn2{background:transparent;border:1px solid #30363d;color:#8b949e;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}.btn2:hover{border-color:#8b949e;color:#e6edf3}input,select,textarea{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:8px 10px;color:#e6edf3;font-size:12px;outline:none;font-family:inherit}input:focus,select:focus,textarea:focus{border-color:#3b82f6}input::placeholder{color:#6e7681}select option{background:#1c2333}`}</style>
        {tab==="overview" && <OverviewTab/>}
        {tab==="users"    && <UsersTab currentUser={user}/>}
        {tab==="trees"    && <TreesTab/>}
        {tab==="settings" && <SettingsTab/>}
      </div>
    </div>
  );
}
