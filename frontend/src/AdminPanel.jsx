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
  SUPERADMIN: { bg:"var(--color-background-danger)",  text:"var(--color-text-danger)",   label:"SuperAdmin" },
  ADMIN:      { bg:"var(--color-background-warning)", text:"var(--color-text-warning)",  label:"Admin" },
  USER:       { bg:"var(--color-background-secondary)",text:"var(--color-text-secondary)",label:"User" },
};
const RoleBadge = ({role}) => { const c=ROLE_COLORS[role]||ROLE_COLORS.USER; return <span style={{background:c.bg,color:c.text,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600}}>{c.label}</span>; };
const StatusBadge = ({active}) => <span style={{background:active?"var(--color-background-success)":"var(--color-background-secondary)",color:active?"var(--color-text-success)":"var(--color-text-tertiary)",padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600}}>{active?"Active":"Inactive"}</span>;

function StatCard({icon,label,value,sub,color}){
  return(
    <div className="adm-stat">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{width:36,height:36,borderRadius:"var(--border-radius-md)",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <i className={`ti ${icon}`} style={{fontSize:18,color}}/>
        </div>
        <div style={{fontSize:26,fontWeight:600,color:"var(--color-text-primary)"}}>{value}</div>
      </div>
      <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function AddUserModal({onClose,onAdd}){
  const [form,setForm]=useState({name:"",email:"",password:"",role:"USER"});
  const [loading,setLoad]=useState(false);const [error,setError]=useState("");
  const upd=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const submit=async()=>{
    if(!form.name||!form.email||!form.password)return setError("All fields required");
    setLoad(true);setError("");
    try{const u=await api("POST","/api/admin/users",form);onAdd(u);onClose();}
    catch(e){setError(e.message);}
    setLoad(false);
  };
  return(
    <div className="ov" onClick={onClose}><div className="mb" onClick={e=>e.stopPropagation()}>
      <div className="mh"><span style={{fontWeight:500}}>Add New User</span><button onClick={onClose} className="iconbtn">✕</button></div>
      <div className="mbd">
        {[["name","Full Name","text","Full name"],["email","Email","email","user@example.com"],["password","Password","password","••••••••"]].map(([k,lbl,t,ph])=>(
          <div className="fg" key={k}><label>{lbl}</label><input type={t} value={form[k]} onChange={upd(k)} placeholder={ph} style={{width:"100%",fontSize:12}}/></div>
        ))}
        <div className="fg"><label>Role</label>
          <select value={form.role} onChange={upd("role")} style={{width:"100%",fontSize:12}}>
            <option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option>
          </select>
        </div>
        {error&&<div style={{color:"var(--color-text-danger)",fontSize:12,marginTop:6}}>{error}</div>}
      </div>
      <div className="mf"><button className="btn2" onClick={onClose}>Cancel</button><button className="btn1" onClick={submit} disabled={loading}>{loading?"Adding…":"Add User"}</button></div>
    </div></div>
  );
}

function OverviewTab(){
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("GET","/api/admin/stats").then(setStats).catch(()=>{});}, []);
  if(!stats) return <div style={{textAlign:"center",padding:40,color:"var(--color-text-tertiary)"}}>Loading stats…</div>;
  return(
    <div>
      <div className="adm-stats-grid">
        <StatCard icon="ti-users"       label="Total Users"       value={stats.totalUsers}         sub={`+${stats.recentUsers} this week`} color="var(--color-text-info)"/>
        <StatCard icon="ti-binary-tree" label="Total Trees"       value={stats.totalTrees}         sub={`+${stats.recentTrees} this week`} color="var(--color-text-success)"/>
        <StatCard icon="ti-user-circle" label="Family Members"    value={stats.totalPersons}       sub="People recorded"                   color="var(--color-text-warning)"/>
        <StatCard icon="ti-arrows-join" label="Relationships"     value={stats.totalRelationships} sub="Links between members"             color="var(--color-text-danger)"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
        <div className="adm-box">
          <div className="adm-box-title">Tree Visibility</div>
          {[["Public",stats.publicTrees,"var(--color-text-success)"],["Private",stats.privateTrees,"var(--color-text-secondary)"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:col,fontWeight:500}}>{lbl}</span>
                <span style={{color:"var(--color-text-secondary)"}}>{val}/{stats.totalTrees}</span>
              </div>
              <div style={{height:6,background:"var(--color-background-secondary)",borderRadius:999,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${stats.totalTrees>0?(val/stats.totalTrees)*100:0}%`,background:col,borderRadius:999}}/>
              </div>
            </div>
          ))}
        </div>
        <div className="adm-box">
          <div className="adm-box-title">User Roles</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>
            {[["SUPERADMIN",stats.superAdmins],["ADMIN",stats.admins],["USER",stats.totalUsers-stats.superAdmins-stats.admins]].map(([role,val])=>(
              <div key={role} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <RoleBadge role={role}/><span style={{fontSize:18,fontWeight:600}}>{val}</span>
              </div>
            ))}
            <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>Active accounts</span>
              <span style={{fontSize:14,fontWeight:600,color:"var(--color-text-success)"}}>{stats.activeUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab({currentUser}){
  const [users,setUsers]=useState([]);const [loading,setLoad]=useState(true);
  const [search,setSearch]=useState("");const [showAdd,setShowAdd]=useState(false);const [msg,setMsg]=useState("");
  useEffect(()=>{api("GET","/api/admin/users").then(setUsers).finally(()=>setLoad(false));}, []);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const changeRole=async(id,role)=>{
    try{const u=await api("PATCH",`/api/admin/users/${id}/role`,{role});setUsers(us=>us.map(u=>u.id===id?{...u,role:u.role}:u));setUsers(us=>us.map(x=>x.id===id?{...x,role}:x));flash("Role updated to "+role);}
    catch(e){flash("Error: "+e.message);}
  };
  const toggleStatus=async(id,isActive)=>{
    try{const u=await api("PATCH",`/api/admin/users/${id}/status`,{isActive:!isActive});setUsers(us=>us.map(x=>x.id===id?{...x,isActive:u.isActive}:x));flash(u.isActive?"User activated":"User deactivated");}
    catch(e){flash("Error: "+e.message);}
  };
  const deleteUser=async(id,name)=>{
    if(!window.confirm(`Delete user "${name}"? This cannot be undone.`))return;
    try{await api("DELETE",`/api/admin/users/${id}`);setUsers(us=>us.filter(u=>u.id!==id));flash("User deleted");}
    catch(e){flash("Error: "+e.message);}
  };
  const filtered=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…" style={{width:220,fontSize:12}}/>
        <button className="btn1" style={{marginLeft:"auto"}} onClick={()=>setShowAdd(true)}><i className="ti ti-user-plus" style={{fontSize:12,marginRight:4}}/>Add User</button>
      </div>
      {msg&&<div style={{background:"var(--color-background-success)",color:"var(--color-text-success)",padding:"7px 12px",borderRadius:"var(--border-radius-md)",fontSize:12,marginBottom:10}}>{msg}</div>}
      {loading?<div style={{textAlign:"center",padding:40,color:"var(--color-text-tertiary)"}}>Loading users…</div>:(
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Trees</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{opacity:u.isActive?1:0.6}}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:"var(--color-background-info)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"var(--color-text-info)",flexShrink:0}}>{u.name[0]}</div>
                      <span style={{fontSize:12,fontWeight:500}}>{u.name}{u.id===currentUser.id&&<span style={{fontSize:10,color:"var(--color-text-info)",marginLeft:4}}>(you)</span>}</span>
                    </div>
                  </td>
                  <td style={{fontSize:11,color:"var(--color-text-secondary)"}}>{u.email}</td>
                  <td>
                    {u.id===currentUser.id?<RoleBadge role={u.role}/>:(
                      <select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{fontSize:10,padding:"2px 4px",borderRadius:4,border:"0.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer"}}>
                        <option value="USER">User</option><option value="ADMIN">Admin</option><option value="SUPERADMIN">SuperAdmin</option>
                      </select>
                    )}
                  </td>
                  <td><StatusBadge active={u.isActive}/></td>
                  <td style={{fontSize:12,textAlign:"center"}}>{u._count?.ownedTrees||0}</td>
                  <td style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{u.createdAt?.slice(0,10)}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      {u.id!==currentUser.id&&<>
                        <button className="adm-act-btn" title={u.isActive?"Deactivate":"Activate"} onClick={()=>toggleStatus(u.id,u.isActive)}><i className={`ti ti-${u.isActive?"user-off":"user-check"}`} style={{fontSize:12}}/></button>
                        <button className="adm-act-btn adm-del" title="Delete" onClick={()=>deleteUser(u.id,u.name)}><i className="ti ti-trash" style={{fontSize:12}}/></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--color-text-tertiary)",fontSize:12}}>No users found</div>}
        </div>
      )}
      {showAdd&&<AddUserModal onClose={()=>setShowAdd(false)} onAdd={u=>setUsers(us=>[u,...us])}/>}
    </div>
  );
}

function TreesTab(){
  const [trees,setTrees]=useState([]);const [loading,setLoad]=useState(true);
  const [search,setSearch]=useState("");const [msg,setMsg]=useState("");
  useEffect(()=>{api("GET","/api/admin/trees").then(setTrees).finally(()=>setLoad(false));}, []);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500);};
  const toggleVis=async(id,current)=>{
    const next=current==="public"?"private":"public";
    try{await api("PATCH",`/api/admin/trees/${id}`,{visibility:next});setTrees(ts=>ts.map(t=>t.id===id?{...t,visibility:next}:t));flash(`Tree set to ${next}`);}
    catch(e){flash("Error: "+e.message);}
  };
  const deleteTree=async(id,name)=>{
    if(!window.confirm(`Delete tree "${name}"? All data lost.`))return;
    try{await api("DELETE",`/api/admin/trees/${id}`);setTrees(ts=>ts.filter(t=>t.id!==id));flash("Tree deleted");}
    catch(e){flash("Error: "+e.message);}
  };
  const filtered=trees.filter(t=>t.nameEn?.toLowerCase().includes(search.toLowerCase())||t.name?.toLowerCase().includes(search.toLowerCase())||t.owner?.name?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search trees…" style={{width:220,fontSize:12}}/>
      </div>
      {msg&&<div style={{background:"var(--color-background-success)",color:"var(--color-text-success)",padding:"7px 12px",borderRadius:"var(--border-radius-md)",fontSize:12,marginBottom:10}}>{msg}</div>}
      {loading?<div style={{textAlign:"center",padding:40,color:"var(--color-text-tertiary)"}}>Loading trees…</div>:(
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Tree Name</th><th>Owner</th><th>Members</th><th>Visibility</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(t=>(
                <tr key={t.id}>
                  <td><div style={{fontWeight:500,fontSize:12}}>{t.name}</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{t.nameEn}</div></td>
                  <td><div style={{fontSize:11}}>{t.owner?.name}</div><div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{t.owner?.email}</div></td>
                  <td style={{textAlign:"center",fontSize:12}}>{t._count?.persons||0}</td>
                  <td><span style={{background:t.visibility==="public"?"var(--color-background-success)":"var(--color-background-secondary)",color:t.visibility==="public"?"var(--color-text-success)":"var(--color-text-secondary)",padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600}}>{t.visibility}</span></td>
                  <td style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{t.createdAt?.slice(0,10)}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="adm-act-btn" title={`Set ${t.visibility==="public"?"private":"public"}`} onClick={()=>toggleVis(t.id,t.visibility)}><i className={`ti ti-${t.visibility==="public"?"lock":"world"}`} style={{fontSize:12}}/></button>
                      <button className="adm-act-btn adm-del" title="Delete" onClick={()=>deleteTree(t.id,t.nameEn)}><i className="ti ti-trash" style={{fontSize:12}}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{textAlign:"center",padding:24,color:"var(--color-text-tertiary)",fontSize:12}}>No trees found</div>}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({user,onBack}){
  const [tab,setTab]=useState("overview");
  const TABS=[{id:"overview",label:"Overview",icon:"ti-dashboard"},{id:"users",label:"Users",icon:"ti-users"},{id:"trees",label:"Trees",icon:"ti-binary-tree"}];
  return(
    <div className="adm-wrap">
      <style>{`
        .adm-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--color-background-tertiary)}
        .adm-header{background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);padding:0 16px}
        .adm-header-top{display:flex;align-items:center;gap:10px;padding:10px 0}
        .adm-tabs{display:flex;gap:2px}
        .adm-tab{padding:8px 14px;font-size:12px;font-weight:500;background:none;border:none;cursor:pointer;color:var(--color-text-secondary);border-bottom:2px solid transparent;display:flex;align-items:center;gap:5px}
        .adm-tab:hover{color:var(--color-text-primary)}.adm-tab.active{color:var(--color-text-info);border-bottom-color:var(--color-border-info)}
        .adm-body{flex:1;overflow-y:auto;padding:16px}
        .adm-stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
        .adm-stat{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:14px}
        .adm-box{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:14px}
        .adm-box-title{font-size:12px;font-weight:500;color:var(--color-text-secondary)}
        .adm-table-wrap{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;background:var(--color-background-primary)}
        .adm-table{width:100%;border-collapse:collapse;font-size:12px}
        .adm-table thead{background:var(--color-background-secondary)}
        .adm-table th{padding:9px 12px;text-align:left;font-size:10px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap}
        .adm-table td{padding:9px 12px;border-top:0.5px solid var(--color-border-tertiary);vertical-align:middle}
        .adm-table tr:hover td{background:var(--color-background-secondary)}
        .adm-act-btn{background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:4px 7px;cursor:pointer;color:var(--color-text-secondary);display:inline-flex;align-items:center}
        .adm-act-btn:hover{background:var(--color-background-tertiary)}.adm-del:hover{color:var(--color-text-danger);border-color:var(--color-border-danger)}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:2000;display:flex;align-items:center;justify-content:center;padding:14px}
        .mb{background:var(--color-background-primary);border-radius:var(--border-radius-lg);width:100%;max-width:400px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden}
        .mh{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:0.5px solid var(--color-border-tertiary);font-size:13px}
        .mbd{padding:14px;overflow-y:auto;flex:1}.mf{padding:11px 14px;border-top:0.5px solid var(--color-border-tertiary);display:flex;gap:8px;justify-content:flex-end}
        .fg{margin-bottom:9px}.fg label{display:block;font-size:10px;color:var(--color-text-secondary);margin-bottom:3px;font-weight:500;text-transform:uppercase;letter-spacing:0.3px}
        .iconbtn{background:none;border:none;cursor:pointer;color:var(--color-text-secondary);font-size:14px;padding:2px;display:flex;align-items:center}
        .btn1{background:transparent;border:0.5px solid var(--color-border-info);color:var(--color-text-info);padding:6px 13px;border-radius:var(--border-radius-md);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .btn1:hover{background:var(--color-background-info)}.btn1:disabled{opacity:.5;cursor:not-allowed}
        .btn2{background:transparent;border:0.5px solid var(--color-border-secondary);color:var(--color-text-secondary);padding:6px 13px;border-radius:var(--border-radius-md);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
        .btn2:hover{background:var(--color-background-secondary)}
      `}</style>
      <div className="adm-header">
        <div className="adm-header-top">
          <button className="btn2" style={{padding:"4px 9px",fontSize:11}} onClick={onBack}><i className="ti ti-chevron-left" style={{fontSize:10}}/>Back</button>
          <i className="ti ti-shield-lock" style={{fontSize:16,color:"var(--color-text-info)"}}/>
          <div><div style={{fontWeight:500,fontSize:14}}>Admin Panel</div><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>వంశవృక్షం · {user.role}</div></div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}><RoleBadge role={user.role}/><span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{user.name}</span></div>
        </div>
        <div className="adm-tabs">
          {TABS.map(t=><button key={t.id} className={`adm-tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}><i className={`ti ${t.icon}`} style={{fontSize:13}}/>{t.label}</button>)}
        </div>
      </div>
      <div className="adm-body">
        {tab==="overview"&&<OverviewTab/>}
        {tab==="users"   &&<UsersTab currentUser={user}/>}
        {tab==="trees"   &&<TreesTab/>}
      </div>
    </div>
  );
}
