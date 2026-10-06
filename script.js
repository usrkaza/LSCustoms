
const STORAGE_KEY = "benefactor_rp_local_v1";
const USE_SUPABASE = false;
const supabaseClient = null;

const defaultData = {
  members: [
    { id: 1, name: "Emilio Martinez", role: "Patron", password: "Admin", active: true },
    { id: 2, name: "admin", role: "Admin", password: "admin", active: true },
    { id: 3, name: "Isaac Rosenberg", role: "Co-Patron", password: "Isaac1234", active: true },
    { id: 4, name: "Noam Rosenberg", role: "Responsable", password: "Noam1234", active: true },
    { id: 5, name: "Omri Rosenberg", role: "Employés Expérimenter", password: "Omri1234", active: true },
    { id: 6, name: "Adam Rosenberg", role: "Employés Expérimenter", password: "Adam1234", active: true },
    { id: 7, name: "Micky Williams", role: "Employés Expérimenter", password: "Micky1234", active: true }
  ],
  sales: [], customs: [], payroll: [], stock: [], clients: [], objectives: []
};

let data = loadLocalData();
let session = null;
let supabaseSession = null;
function siteSettingsDefaults(){
  return {
    itemNames:{item1:"Chiffon",item2:"Kit de réparation"},
    customCatalog:[
      {id:"moteur",name:"Moteur",description:"Préparation moteur, admission et réglage."},
      {id:"performance",name:"Full performance",description:"Préparation performance complète."},
      {id:"turbo",name:"Turbo",description:"Montage ou amélioration turbo."},
      {id:"echappement",name:"Échappement",description:"Ligne et échappement personnalisés."},
      {id:"peinture",name:"Peinture",description:"Changement ou rénovation de couleur."},
      {id:"carrosserie",name:"Carrosserie",description:"Travail extérieur et finition."},
      {id:"jantes",name:"Jantes / pneus",description:"Montage et personnalisation roues."},
      {id:"freinage",name:"Freinage",description:"Upgrade ou remplacement du freinage."},
      {id:"suspension",name:"Suspension",description:"Rabaissement et réglage de suspension."},
      {id:"esthetique",name:"Esthétique",description:"Détails visuels et accessoires."}
    ],
    compensation:{
      Admin:{salePercent:0,prestation:0,custom:0,gradeBonus:0},
      Patron:{salePercent:55,prestation:0,custom:0,gradeBonus:0},
      "Co-Patron":{salePercent:50,prestation:0,custom:0,gradeBonus:0},
      Directeur:{salePercent:45,prestation:0,custom:0,gradeBonus:0},
      Responsable:{salePercent:40,prestation:0,custom:0,gradeBonus:0},
      "Chef D'Atelier":{salePercent:35,prestation:0,custom:0,gradeBonus:0},
      "Chef D'Atelier Adjoint":{salePercent:35,prestation:0,custom:0,gradeBonus:0},
      "Ressource Humaine":{salePercent:30,prestation:0,custom:0,gradeBonus:0},
      Formateur:{salePercent:30,prestation:0,custom:0,gradeBonus:0},
      "Employés Expérimenter":{salePercent:25,prestation:0,custom:0,gradeBonus:0},
      "Employés":{salePercent:25,prestation:0,custom:0,gradeBonus:0},
      "Nouvel employé":{salePercent:20,prestation:0,custom:0,gradeBonus:0}
    },
    theme:{accent:"#ffffff",panelOpacity:0.93,bgOverlay:0.76,borderRadius:12,sidebarWidth:245},
    dashboard:{objective:true,activity:true,quickActions:true},
    permissions:null
  };
}
let siteSettings = {
  id: 1,
  companyName: "LS CUSTOMS",
  subtitle: "GARAGE & CUSTOMS RP",
  loginSubtitle: "Garage & Customs RP",
  weeklyObjectiveDefault: 0,
  weekStartsOn: 1,
  itemNames:{item1:"Chiffon",item2:"Kit de réparation"},
  customCatalog: structuredClone(siteSettingsDefaults().customCatalog),
  compensation: structuredClone(siteSettingsDefaults().compensation),
  theme: structuredClone(siteSettingsDefaults().theme),
  dashboard: structuredClone(siteSettingsDefaults().dashboard),
  permissions: null
};
let auditLogs = [];
try {
  const saved = JSON.parse(localStorage.getItem("benefactor_site_settings"));
  if(saved) siteSettings={...siteSettings,...saved};
  if(siteSettings.companyName === "Bénéfactor") siteSettings.companyName = "LS CUSTOMS";
  if(siteSettings.subtitle === "Concessionnaire RP") siteSettings.subtitle = "GARAGE & CUSTOMS RP";
  if(siteSettings.loginSubtitle === "Comptabilité — Concessionnaire RP") siteSettings.loginSubtitle = "Garage & Customs RP";
} catch(e) {}
siteSettings.itemNames ||= {item1:"Chiffon",item2:"Kit de réparation"};
siteSettings.compensation ||= structuredClone(siteSettingsDefaults().compensation);
const GRADE_COMMISSIONS={Patron:55,"Co-Patron":50,Directeur:45,Responsable:40,"Chef D'Atelier":35,"Chef D'Atelier Adjoint":35,"Ressource Humaine":30,Formateur:30,"Employés Expérimenter":25,"Employés":25,"Nouvel employé":20};
for(const [r,pct] of Object.entries(GRADE_COMMISSIONS)){siteSettings.compensation[r] ||= {salePercent:pct,prestation:0,custom:0,gradeBonus:0};siteSettings.compensation[r].salePercent=pct;siteSettings.compensation[r].prestation=0;siteSettings.compensation[r].custom=0;siteSettings.compensation[r].gradeBonus=0;}
siteSettings.compensation.Admin ||= {salePercent:0,prestation:0,custom:0,gradeBonus:0};
const ROLE_MIGRATION={"Co-patron":"Co-Patron",Vendeur:"Employés",Mécanicien:"Employés Expérimenter"};
for(const m of data.members||[]){if(ROLE_MIGRATION[m.role])m.role=ROLE_MIGRATION[m.role];}
save();
siteSettings.theme ||= structuredClone(siteSettingsDefaults().theme);
siteSettings.dashboard ||= structuredClone(siteSettingsDefaults().dashboard);
if(!Array.isArray(siteSettings.customCatalog) || !siteSettings.customCatalog.length){ siteSettings.customCatalog = structuredClone(siteSettingsDefaults().customCatalog); }
// Migration: supprimer les anciens prix pré-remplis des catalogues Customs.
siteSettings.customCatalog = siteSettings.customCatalog.map((x,i)=>({id:x.id||`custom-${i}`,name:x.name||`Custom ${i+1}`,description:x.description||""}));
try { auditLogs = JSON.parse(localStorage.getItem("benefactor_audit_logs")||"[]"); } catch(e) {}


const DEFAULT_PERMISSIONS = {
  Admin:["dashboard","sales","customs","payroll","members","accounting","reports","settings"],
  Patron:["dashboard","sales","customs","payroll","members","accounting","reports","settings"],
  "Co-Patron":["dashboard","sales","customs","payroll","members","accounting","reports","settings"],
  Directeur:["dashboard","sales","customs","payroll","accounting","reports"],
  Responsable:["dashboard","sales","customs","payroll","accounting","reports"],
  "Chef D'Atelier":["dashboard","sales","customs","payroll"],
  "Chef D'Atelier Adjoint":["dashboard","sales","customs","payroll"],
  "Ressource Humaine":["dashboard","payroll","members"],
  Formateur:["dashboard","sales","customs"],
  "Employés Expérimenter":["dashboard","sales","customs"],
  "Employés":["dashboard","sales","customs"],
  "Nouvel employé":["dashboard","sales","customs"]
};
let rolePermissions = structuredClone(DEFAULT_PERMISSIONS);
setPermissionsFromSettings(siteSettings.permissions);
applySiteSettings();

function loadLocalData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const d = saved || structuredClone(defaultData);
    d.members ||= []; d.sales ||= []; d.payroll ||= []; d.stock ||= []; d.clients ||= []; d.customs ||= []; d.objectives ||= [];
    const seed = [
      {id:2,name:"abc",role:"Admin",password:"Admin"},
      {id:2,name:"Emilio Martinez",role:"Patron",password:"Admin"},
      {id:3,name:"Isaac Rosenberg",role:"Co-Patron",password:"Isaac1234"},
      {id:4,name:"Noam Rosenberg",role:"Responsable",password:"Noam1234"},
      {id:5,name:"Omri Rosenberg",role:"Employés Expérimenter",password:"Omri1234"},
      {id:6,name:"Adam Rosenberg",role:"Employés Expérimenter",password:"Adam1234"},
      {id:7,name:"Micky Williams",role:"Employés Expérimenter",password:"Micky1234"}
    ];
    for (const wanted of seed) {
      let m = d.members.find(x => String(x.name).toLowerCase() === wanted.name.toLowerCase());
      if (!m) d.members.push({...wanted, active:true});
      else { m.role=wanted.role; m.password=wanted.password; m.active=true; if(m.id==null)m.id=wanted.id; }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return d;
  } catch {
    return structuredClone(defaultData);
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isSiteAdmin() { return !!session && ["Admin","Patron","Co-Patron"].includes(session.role); }
function canEditAnyData() { return isSiteAdmin(); }
function canManageOperationalData() { return !!session && ["Admin","Patron","Co-Patron","Directeur","Responsable"].includes(session.role); }
function compensationFor(role){ const d=siteSettings.compensation?.[role]||{}; return {salePercent:Number(d.salePercent)||0,prestation:Number(d.prestation)||0,custom:Number(d.custom)||0,gradeBonus:Number(d.gradeBonus)||0}; }
function memberWeeklyStats(member){
  const sales=data.sales.filter(s=>isThisWeek(s.date)&&s.seller===member.name);
  const customs=(data.customs||[]).filter(c=>isThisWeek(c.date)&&c.technician===member.name);
  const salesCA=sales.reduce((a,s)=>a+Number(s.price||0),0);
  const c=compensationFor(member.role);
  const prestaBonus=sales.length*c.prestation;
  const customBonus=customs.length*c.custom;
  const saleCommission=salesCA*c.salePercent/100;
  const final=saleCommission+prestaBonus+customBonus+c.gradeBonus;
  return {sales,customs,salesCA,saleCommission,prestaBonus,customBonus,gradeBonus:c.gradeBonus,totalCount:sales.length+customs.length,final,settings:c};
}
function saveSiteSettingsLocal(){ localStorage.setItem('benefactor_site_settings',JSON.stringify(siteSettings)); applySiteSettings(); }

function applySiteSettings() {
  const company=siteSettings.companyName||"LS CUSTOMS";
  document.title=`${company} RP — Gestion`;
  document.querySelectorAll(".brand").forEach(el=>el.textContent=company);
  document.querySelectorAll(".sidebar .subtitle").forEach(el=>el.textContent=(siteSettings.subtitle||"GARAGE & CUSTOMS RP").toUpperCase());
  const loginSubtitle=document.getElementById("login-subtitle"); if(loginSubtitle) loginSubtitle.textContent=siteSettings.loginSubtitle||"Garage & Customs RP";
  const t=siteSettings.theme||{};
  document.documentElement.style.setProperty('--accent',t.accent||'#fff');
  document.documentElement.style.setProperty('--panel-opacity',String(t.panelOpacity ?? .93));
  document.documentElement.style.setProperty('--border-radius',`${Number(t.borderRadius||12)}px`);
  document.documentElement.style.setProperty('--sidebar-width',`${Number(t.sidebarWidth||245)}px`);
  const before=document.getElementById('runtime-theme');
  if(before) before.remove();
  const st=document.createElement('style'); st.id='runtime-theme'; st.textContent=`
    .card,.panel,.settings-card,.login-card{background:rgba(13,13,13,var(--panel-opacity));border-radius:var(--border-radius)}
    .sidebar{width:var(--sidebar-width)} .main{margin-left:var(--sidebar-width)}
    .primary{background:var(--accent);border-color:var(--accent);color:#050505}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)}
    @media(max-width:900px){.sidebar{width:190px}.main{margin-left:190px}}
    @media(max-width:650px){.sidebar{width:100%}.main{margin-left:0}}
  `; document.head.appendChild(st);
}
function setPermissionsFromSettings(raw){
  rolePermissions=structuredClone(DEFAULT_PERMISSIONS);
  if(raw && typeof raw === "object") for(const role of Object.keys(DEFAULT_PERMISSIONS)) if(Array.isArray(raw[role])) rolePermissions[role]=raw[role].slice();
  rolePermissions.Admin=DEFAULT_PERMISSIONS.Admin.slice();
  for(const role of ["Patron","Co-Patron"]) if(!rolePermissions[role].includes("settings")) rolePermissions[role].push("settings");
}

async function logAction(action,entity,entityId=null,details=null){
  const record={actor_member_id:session?.id||null,actor_name:session?.name||"Système",action,entity,entity_id:entityId?String(entityId):null,details:details||{}};
  if(!USE_SUPABASE){auditLogs.unshift({...record,created_at:new Date().toISOString()});auditLogs=auditLogs.slice(0,200);localStorage.setItem("benefactor_audit_logs",JSON.stringify(auditLogs));return;}
  try{await supabaseClient.from("audit_logs").insert(record);}catch(e){console.warn("Journal indisponible",e);}
}
async function loadAuditLogs(){
  if(!USE_SUPABASE||!isSiteAdmin()){try{auditLogs=JSON.parse(localStorage.getItem("benefactor_audit_logs")||"[]");}catch(e){auditLogs=[];}return;}
  const {data:rows,error}=await supabaseClient.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(100);if(!error)auditLogs=rows||[];
}
function downloadBackup(){
  if(!isSiteAdmin())return;
  const payload={version:"benefactor-local-v13",exportedAt:new Date().toISOString(),members:data.members.map(m=>({id:m.id,name:m.name,role:m.role,password:m.password,active:m.active!==false})),sales:data.sales,customs:data.customs,payroll:data.payroll,clients:data.clients,objectives:data.objectives,settings:siteSettings};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`benefactor-sauvegarde-${todayISO()}.json`;a.click();URL.revokeObjectURL(url);logAction("export","backup",null,{version:"v12"});
}
async function ensureAuthUser(name,password){
  const secondary=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let user=null;
  const sign=await secondary.auth.signUp({email:usernameToEmail(name),password,options:{data:{display_name:name}}});
  if(!sign.error&&sign.user&&sign.session)user=sign.user;
  if(!user){const loginResult=await secondary.auth.signInWithPassword({email:usernameToEmail(name),password});if(!loginResult.error)user=loginResult.data.user;}
  await secondary.auth.signOut();
  if(!user)throw new Error("Compte Auth impossible à créer ou retrouver. Vérifie la confirmation e-mail dans Supabase.");
  return user.id;
}
async function syncLocalMembersToSupabase(){
  if(!USE_SUPABASE||!isSiteAdmin())return alert("Action réservée à Admin, Patron et Co-Patron.");
  const local=loadLocalData().members.filter(m=>m.password&&m.active!==false);if(!local.length)return alert("Aucun ancien compte local à synchroniser.");
  let done=0,skipped=0;
  for(const m of local){
    try{
      const {data:rows}=await supabaseClient.from("members").select("id,name,role,active,auth_user_id").ilike("name",m.name).limit(1);const db=rows?.[0]||null;
      if(db?.auth_user_id){skipped++;continue;}
      const authUserId=await ensureAuthUser(m.name,m.password);
      const row={name:m.name,role:m.name.toLowerCase()==="admin"?"Admin":m.role,active:true,auth_user_id:authUserId};
      if(db){const {error}=await supabaseClient.from("members").update(row).eq("id",db.id);if(error)throw error;}else{const {error}=await supabaseClient.from("members").insert(row);if(error)throw error;}
      done++;
    }catch(e){console.warn("Sync membre",m.name,e);skipped++;}
  }
  await refreshSupabaseData();await logAction("sync","members",null,{synced:done,skipped});alert(`Synchronisation : ${done} relié(s), ${skipped} ignoré(s).`);render("settings");
}

function money(value) {
  return new Intl.NumberFormat("fr-FR", {style:"currency", currency:"EUR"}).format(Number(value)||0);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function today() {
  return new Date().toLocaleDateString("fr-FR");
}

function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const weekStartsOn = Number(siteSettings?.weekStartsOn) === 0 ? 0 : 1;
  const currentDay = d.getDay();
  const diff = weekStartsOn === 1 ? ((currentDay + 6) % 7) : currentDay;
  const start = new Date(d);
  start.setHours(0,0,0,0);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
}
function weekStartISO(date = new Date()) {
  const { start } = getWeekRange(date);
  const y = start.getFullYear();
  const m = String(start.getMonth()+1).padStart(2,"0");
  const d = String(start.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function isThisWeek(value) {
  const d = parseDate(value);
  if (!d) return false;
  const {start,end} = getWeekRange();
  return d >= start && d <= end;
}

function weekLabel() {
  const {start,end} = getWeekRange();
  return `${start.toLocaleDateString("fr-FR")} → ${end.toLocaleDateString("fr-FR")}`;
}

function can(page) {
  return !!session && rolePermissions[session.role]?.includes(page);
}

function canManageMembers() { return isSiteAdmin(); }
function canEditObjective() { return isSiteAdmin(); }

function updateNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const allowed = can(btn.dataset.page);
    btn.classList.toggle("hidden", !allowed);
    btn.disabled = !allowed;
  });
  const quick = document.getElementById("quick-sale");
  if (quick) quick.classList.toggle("hidden", !can("sales"));
  const quickCustom = document.getElementById("quick-custom");
  if (quickCustom) quickCustom.classList.toggle("hidden", !can("customs"));
}

function usernameToEmail(name) {
  const clean = String(name || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${clean || "membre"}@benefactor-rp.local`;
}

async function supabaseLogin(name, password) {
  const email = usernameToEmail(name);
  let result = await supabaseClient.auth.signInWithPassword({ email, password });

  if (result.error && ["admin", "emilio martinez"].includes(String(name).trim().toLowerCase())) {
    const signup = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim() } }
    });
    if (!signup.error && signup.data.user) {
      if (!signup.data.session) {
        throw new Error("Le compte a été créé, mais Supabase demande une confirmation d’e-mail. Désactive la confirmation d’e-mail dans Supabase > Authentication > Providers > Email.");
      }
      result = { data: { user: signup.data.user, session: signup.data.session }, error: null };
    }
  }

  if (result.error || !result.data?.user) throw new Error("Identifiant ou mot de passe incorrect.");

  supabaseSession = result.data.session || (await supabaseClient.auth.getSession()).data.session;
  const user = result.data.user;
  const { data: members, error: membersError } = await supabaseClient
    .from("members")
    .select("id,name,role,active,auth_user_id")
    .ilike("name", name.trim());
  if (membersError) throw membersError;

  let member = members?.find(m => !m.auth_user_id || m.auth_user_id === user.id);
  if (!member) throw new Error("Compte Auth trouvé mais aucun membre Bénéfactor correspondant.");
  if (member.active === false) {
    await supabaseClient.auth.signOut();
    throw new Error("Ce compte est désactivé.");
  }

  if (!member.auth_user_id) {
    const { data: linked, error: linkError } = await supabaseClient
      .from("members")
      .update({ auth_user_id: user.id })
      .eq("id", member.id)
      .select("id,name,role,active,auth_user_id")
      .single();
    if (linkError) throw linkError;
    member = linked;
  }

  session = { id: member.id, authUserId: user.id, name: member.name, role: member.role };
  await refreshSupabaseData();
  enterApp();
  return true;
}

function localLogin(name, password) {
  const normalizedName = String(name || "").trim().toLowerCase();

  // Compte admin principal : fonctionne même si une ancienne version du site
  // a laissé une mauvaise sauvegarde dans le localStorage.
  if (normalizedName === "admin" && String(password || "") === "admin") {
    let admin = data.members.find(m => String(m.name || "").trim().toLowerCase() === "admin");
    if (!admin) {
      admin = {id:2,name:"admin",role:"Admin",password:"admin",active:true};
      data.members.push(admin);
    } else {
      admin.name = "admin";
      admin.role = "Admin";
      admin.password = "admin";
      admin.active = true;
      if (admin.id == null) admin.id = 2;
    }
    save();
    session = {id:admin.id,name:"admin",role:"Admin"};
    enterApp();
    return true;
  }

  const member = data.members.find(
    m => String(m.name || "").trim().toLowerCase() === normalizedName && String(m.password || "") === String(password || "")
  );
  if (!member || member.active === false) return false;
  session = {id:member.id,name:member.name,role:member.role};
  enterApp();
  return true;
}

async function login(name,password){return localLogin(name,password);}

function enterApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("user-name").textContent = session.name;
  document.getElementById("user-role").textContent = session.role;
  document.getElementById("today").textContent = today();
  updateNavigation();
  applySiteSettings();
  if(isSiteAdmin()) loadAuditLogs();
  render("dashboard");
}

async function logout() {
  supabaseSession = null;
  session = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("hidden"));
  document.getElementById("quick-sale").classList.remove("hidden");
  document.getElementById("quick-custom").classList.remove("hidden");
  document.getElementById("login-form").reset();
  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
}

function applyDashboardVisibility(){ const o=document.querySelector('[data-dashboard-section="objective"]'); const a=document.querySelector('[data-dashboard-section="activity"]'); if(o)o.style.display=siteSettings.dashboard?.objective===false?'none':''; if(a)a.style.display=siteSettings.dashboard?.activity===false?'none':''; }
function render(page) {
  if (!can(page)) return;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const titles = {
    dashboard:"Tableau de bord", sales:"Vendre", customs:"Customs", payroll:"Salaires",
    members:"Membres", accounting:"Comptabilité", reports:"Rapports", settings:"Paramètres"
  };
  document.getElementById("page-title").textContent = titles[page];
  const target = document.getElementById("page-content");
  target.innerHTML = pages[page]();
}

function objectiveValue() {
  const found = data.objectives?.find(o => o.weekStart === weekStartISO());
  return Number(found?.targetAmount ?? siteSettings.weeklyObjectiveDefault ?? 250000);
}

function dashboardPage() {
  const visibleSales = ["Employés","Employés Expérimenter","Nouvel employé"].includes(session.role) ? data.sales.filter(s => s.seller === session.name) : data.sales;
  const weeklySales = visibleSales.filter(s => isThisWeek(s.date));
  const weeklyCustoms = (data.customs||[]).filter(c => isThisWeek(c.date) && (!["Employés","Employés Expérimenter","Nouvel employé"].includes(session.role) || c.technician === session.name));
  const caSales = weeklySales.reduce((sum,s)=>sum+Number(s.price||0),0);
  const caCustoms = weeklyCustoms.reduce((sum,c)=>sum+Number(c.amount||0),0);
  const ca = caSales + caCustoms;
  const weeklyPayroll = can("payroll") ? data.payroll.filter(p=>isThisWeek(p.date)) : [];
  const payments = weeklyPayroll.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const balance = ca - payments;
  const target = objectiveValue();
  const progress = target > 0 ? Math.min(100, Math.round(ca/target*100)) : 0;
  const recentSales = weeklySales.slice().reverse().slice(0,5);
  const recentPayroll = weeklyPayroll.slice().reverse().slice(0,5);
  return `
    <div class="welcome"><div><div class="eyebrow">LS CUSTOMS · ESPACE PROFESSIONNEL</div><h2>Bienvenue, ${esc(session.name)}</h2><p>Suivi des ventes boutique et prestations de customisation du garage.</p></div><div class="welcome-date">${today()}</div></div>
    <div class="cards">
      <div class="card"><div class="label">Chiffre d'affaires semaine</div><div class="value">${money(ca)}</div><div class="card-sub">${weekLabel()}</div></div>
      <div class="card"><div class="label">Ventes boutique</div><div class="value">${weeklySales.length}</div><div class="card-sub">Chiffons + kits</div></div>
      <div class="card"><div class="label">Prestations Customs</div><div class="value">${weeklyCustoms.length}</div><div class="card-sub">Cette semaine</div></div>
      <div class="card"><div class="label">Paiements semaine</div><div class="value">${money(payments)}</div><div class="card-sub">Salaires / primes</div></div>
      <div class="card"><div class="label">Solde théorique</div><div class="value">${money(balance)}</div><div class="card-sub">Après paiements</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="panel objective-panel" data-dashboard-section="objective"><div class="panel-heading"><div><div class="eyebrow">OBJECTIF DE LA SEMAINE</div><h2>${money(ca)} / ${money(target)}</h2></div><strong>${progress}%</strong></div><div class="progress"><span style="width:${progress}%"></span></div><div class="panel-actions-row"><p class="muted">${weekLabel()}</p>${canEditObjective()?'<button class="text-btn" onclick="openObjectiveModal()">Modifier l’objectif</button>':''}</div></div>
      <div class="panel"><div class="panel-heading"><h2>Actions rapides</h2></div><div class="quick-actions">${can("sales")?'<button class="btn primary" onclick="openSaleModal()">+ Vendre</button>':''}${can("customs")?'<button class="btn secondary" onclick="openCustomModal()">+ Custom</button>':''}${can("payroll")?'<button class="btn secondary" onclick="openPayrollModal()">+ Paiement</button>':''}${can("members")?'<button class="btn secondary" onclick="openMemberModal()">+ Membre</button>':''}</div></div>
      <div class="panel"><div class="panel-heading"><h2>Dernières ventes</h2>${can("sales")?'<button class="text-btn" onclick="render(\'sales\')">Voir tout</button>':''}</div>${salesMiniTable(recentSales)}</div>
      ${can("payroll")?`<div class="panel"><div class="panel-heading"><h2>Derniers paiements</h2><button class="text-btn" onclick="render('payroll')">Voir tout</button></div>${payrollMiniTable(recentPayroll)}</div>`:''}
      <div class="panel activity-panel" data-dashboard-section="activity"><div class="panel-heading"><h2>Activité récente</h2></div>${activityList(visibleSales,recentPayroll)}</div>
    </div>`;
}

function parseDate(value) {
  if (!value) return null;
  const parts = String(value).split("/");
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function salesMiniTable(rows) {
  if (!rows.length) return '<div class="empty">Aucune vente enregistrée.</div>';
  return `<div class="mini-list">${rows.map(s => `<div class="mini-row"><div><strong>${esc(s.vehicle)}</strong><span>${esc(s.seller)}</span></div><strong>${money(s.price)}</strong></div>`).join("")}</div>`;
}

function payrollMiniTable(rows) {
  if (!rows.length) return '<div class="empty">Aucun paiement enregistré.</div>';
  return `<div class="mini-list">${rows.map(p => `<div class="mini-row"><div><strong>${esc(p.member)}</strong><span>${esc(p.type)}${p.note ? " · " + esc(p.note) : ""}</span></div><strong>-${money(p.amount)}</strong></div>`).join("")}</div>`;
}

function activityList(sales, payroll) {
  const items = [
    ...sales.map(s => ({date:s.date, title:`Vente — ${s.vehicle}`, detail:`${s.seller} · ${money(s.price)}`})),
    ...payroll.map(p => ({date:p.date, title:`Paiement — ${p.member}`, detail:`${p.type} · ${money(p.amount)}`}))
  ].slice(-6).reverse();
  if (!items.length) return '<div class="empty">Aucune activité pour le moment.</div>';
  return `<div class="activity-list">${items.map(i => `<div class="activity-item"><div class="activity-dot"></div><div><strong>${esc(i.title)}</strong><span>${esc(i.detail)}</span></div><small>${esc(i.date)}</small></div>`).join("")}</div>`;
}

function salesPage() {
  const visible = ["Employés","Employés Expérimenter","Nouvel employé"].includes(session.role) ? data.sales.filter(s=>s.seller===session.name) : data.sales;
  return `<div class="panel"><div class="actions"><button class="btn primary" onclick="openSaleModal()">+ Vendre</button>${canEditAnyData()?'<button class="btn secondary" onclick="openSettingsSalesManager()">🛠️ Gérer les ventes</button>':''}</div><br>${salesTable(visible.slice().reverse())}</div>`;
}
function salesTable(rows){
  if(!rows.length) return '<div class="empty">Aucune vente enregistrée.</div>';
  return `<table><tr><th>Date</th><th>Vendeur</th><th>Article</th><th>Prix</th><th>Facture</th>${canEditAnyData()?'<th>Actions</th>':''}</tr>${rows.map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.seller)}</td><td>${esc(s.vehicle)}</td><td>${money(s.price)}</td><td>${s.invoice?.path||s.invoice?.data?`<button class="text-btn invoice-link" data-sale-id="${esc(s.id)}">Voir</button>`:'—'}</td>${canEditAnyData()?`<td><button class="btn secondary" onclick="openEditSaleModal('${esc(s.id)}')">Modifier</button> <button class="btn danger" onclick="deleteSale('${esc(s.id)}')">Supprimer</button></td>`:''}</tr>`).join('')}</table>`;
}

function customCatalog(){ return Array.isArray(siteSettings.customCatalog) ? siteSettings.customCatalog : []; }
function customsPage(){
  if(!can("customs"))return '<div class="panel"><div class="empty">Accès refusé.</div></div>';
  const restricted=["Employés Expérimenter","Employés","Nouvel employé"].includes(session.role);
  const visible=restricted?(data.customs||[]).filter(c=>c.technician===session.name):(data.customs||[]);
  return `<div class="panel"><div class="actions"><button class="btn primary" onclick="openCustomModal()">+ Custom</button>${canEditAnyData()?'<button class="btn secondary" onclick="openCustomManager()">🛠️ Gérer les Customs</button>':''}</div><br>${customsTable(visible.slice().reverse())}</div>`;
}
function customsTable(rows){
  if(!rows.length)return '<div class="empty">Aucune custom enregistrée.</div>';
  return `<table><tr><th>Date</th><th>Technicien</th><th>Détails</th><th>Montant total</th><th>Facture</th>${canEditAnyData()?'<th>Actions</th>':''}</tr>${rows.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.technician)}</td><td>${esc(c.details||'—')}</td><td>${Number(c.amount)>0?money(c.amount):'—'}</td><td>${c.invoice?.data||c.invoice?.path?`<button class="text-btn custom-invoice-link" data-custom-id="${esc(c.id)}">Voir</button>`:'—'}</td>${canEditAnyData()?`<td><button class="btn secondary" onclick="openEditCustomModal('${esc(c.id)}')">Modifier</button> <button class="btn danger" onclick="deleteCustom('${esc(c.id)}')">Supprimer</button></td>`:''}</tr>`).join('')}</table>`;
}
function openCustomManager(){if(!canEditAnyData())return;openModal(`<h2>🛠️ Gestion des Customs</h2><p class="muted">Modifier ou supprimer les customs enregistrées.</p><div style="max-height:60vh;overflow:auto">${customsTable((data.customs||[]).slice().reverse())}</div>`);}
function openCustomModal(){
  if(!can("customs"))return;
  const techs=data.members.filter(m=>m.active!==false&&m.role!=="Ressource Humaine");
  if(!techs.length&&session)techs.push(session);
  openModal(`<h2>🔧 Nouvelle custom</h2><div class="form-grid"><div class="field"><label>Technicien</label><select id="custom-tech">${techs.map(m=>`<option ${m.name===session.name?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div><div class="field field-full"><label>Détails de la custom</label><textarea id="custom-details" placeholder="Écris ici tous les détails de la custom : modifications, pièces, peinture, jantes, performance, etc."></textarea></div><div class="field"><label>Montant total (€)</label><input id="custom-amount" type="number" min="0.01" step="0.01" placeholder="Montant total de la custom"></div><div class="field field-full"><label>Capture de la facture <strong>(obligatoire)</strong></label><input id="custom-invoice" type="file" accept="image/*" required><small class="muted">Une capture/photo de la facture est obligatoire pour enregistrer la custom.</small></div></div><br><button class="btn primary" onclick="addCustom()">Enregistrer la custom</button>`);
}
async function addCustom(){
  if(!can("customs"))return;
  const technician=document.getElementById("custom-tech")?.value.trim();const details=document.getElementById("custom-details")?.value.trim()||'';const amount=Number(document.getElementById("custom-amount")?.value);const file=document.getElementById("custom-invoice")?.files?.[0];
  if(!details)return alert("Les détails de la custom sont obligatoires.");if(!amount||amount<=0)return alert("Le montant total est obligatoire.");if(!file)return alert("La capture de la facture est obligatoire.");if(!file.type.startsWith('image/'))return alert("La facture doit être une image.");
  const invoice=await fileToDataURL(file);const id=Date.now();data.customs.push({id,date:today(),technician,details,amount,invoice:{name:file.name,type:file.type,data:invoice,path:null}});save();await logAction("create","custom",id,{technician,details,amount,invoice:file.name});closeModal();render("customs");
}
function openEditCustomModal(id){
  if(!canEditAnyData())return;const c=data.customs.find(x=>String(x.id)===String(id));if(!c)return;const techs=data.members.filter(m=>m.active!==false);const hasInvoice=!!(c.invoice?.data||c.invoice?.path);
  openModal(`<h2>✎ Modifier une custom</h2><div class="form-grid"><div class="field"><label>Technicien</label><select id="edit-custom-tech">${techs.map(m=>`<option ${m.name===c.technician?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div><div class="field field-full"><label>Détails de la custom</label><textarea id="edit-custom-details">${esc(c.details||'')}</textarea></div><div class="field"><label>Montant total (€)</label><input id="edit-custom-amount" type="number" min="0.01" step="0.01" value="${Number(c.amount||c.price)||0}"></div><div class="field field-full"><label>Remplacer la facture ${hasInvoice?'(facultatif)':'<strong>(obligatoire)</strong>'}</label><input id="edit-custom-invoice" type="file" accept="image/*"></div></div><br><button class="btn primary" onclick="editCustom('${esc(c.id)}')">Enregistrer</button>`);
}
async function editCustom(id){
  if(!canEditAnyData())return;const c=data.customs.find(x=>String(x.id)===String(id));if(!c)return;const technician=document.getElementById('edit-custom-tech')?.value;const details=document.getElementById('edit-custom-details')?.value.trim()||'';const amount=Number(document.getElementById('edit-custom-amount')?.value);const file=document.getElementById('edit-custom-invoice')?.files?.[0];
  if(!details)return alert('Les détails de la custom sont obligatoires.');if(!amount||amount<=0)return alert('Le montant total est obligatoire.');if(!c.invoice?.data&&!c.invoice?.path&&!file)return alert('La capture de la facture est obligatoire.');if(file&&!file.type.startsWith('image/'))return alert('La facture doit être une image.');
  Object.assign(c,{technician,details,amount});delete c.client;delete c.items;delete c.type;delete c.price;if(file)c.invoice={name:file.name,type:file.type,data:await fileToDataURL(file),path:null};save();await logAction('update','custom',id,{technician,details,amount});closeModal();render('customs');
}
async function deleteCustom(id){if(!canEditAnyData())return;const c=data.customs.find(x=>String(x.id)===String(id));if(!c)return;if(!confirm(`Supprimer la custom du ${c.date} ?`))return;data.customs=data.customs.filter(x=>String(x.id)!==String(id));save();await logAction('delete','custom',id,{date:c.date});render('customs');}

function openEditPayrollModal(id){if(!canEditAnyData())return;const p=data.payroll.find(x=>String(x.id)===String(id));if(!p)return;openModal(`<h2>✎ Modifier un paiement</h2><div class="form-grid"><div class="field"><label>Membre</label><select id="edit-pay-member">${data.members.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(p.memberId)?'selected':''}>${esc(m.name)}</option>`).join("")}</select></div><div class="field"><label>Type</label><select id="edit-pay-type">${["Salaire","Prime","Autre"].map(t=>`<option ${t===p.type?'selected':''}>${t}</option>`).join("")}</select></div><div class="field"><label>Montant (€)</label><input id="edit-pay-amount" type="number" min="0" value="${Number(p.amount)||0}"></div><div class="field"><label>Date</label><input id="edit-pay-date" value="${esc(p.date)}"></div><div class="field field-full"><label>Note</label><input id="edit-pay-note" value="${esc(p.note)}"></div></div><br><button class="btn primary" onclick="editPayroll('${esc(p.id)}')">Enregistrer</button>`);}
async function editPayroll(id){if(!canEditAnyData())return;const p=data.payroll.find(x=>String(x.id)===String(id));if(!p)return;const member=data.members.find(m=>String(m.id)===String(document.getElementById("edit-pay-member")?.value)),amount=Number(document.getElementById("edit-pay-amount")?.value);if(!member||!amount)return alert("Membre et montant obligatoires.");const row={member_id:member.id,member_name:member.name,type:document.getElementById("edit-pay-type")?.value,amount,note:document.getElementById("edit-pay-note")?.value.trim()||null,payment_date:isoFromDisplayDate(document.getElementById("edit-pay-date")?.value)};if(!USE_SUPABASE){Object.assign(p,{member:row.member_name,memberId:row.member_id,type:row.type,amount:row.amount,note:row.note,date:new Date(`${row.payment_date}T12:00:00`).toLocaleDateString("fr-FR")});save();await logAction("update","payroll",id,row);closeModal();render("payroll");return;}const {data:updated,error}=await supabaseClient.from("payroll").update(row).eq("id",id).select("*").single();if(error)return alert(`Impossible de modifier : ${error.message}`);const idx=data.payroll.findIndex(x=>String(x.id)===String(id));if(idx>=0)data.payroll[idx]=mapPayroll(updated);await logAction("update","payroll",id,row);closeModal();render("payroll");}
async function deletePayroll(id){if(!canEditAnyData())return;const p=data.payroll.find(x=>String(x.id)===String(id));if(!p)return;if(!confirm(`Supprimer le paiement de ${money(p.amount)} ?`))return;if(!USE_SUPABASE){data.payroll=data.payroll.filter(x=>String(x.id)!==String(id));save();await logAction("delete","payroll",id,{amount:p.amount});closeModal();render("payroll");return;}const {error}=await supabaseClient.from("payroll").delete().eq("id",id);if(error)return alert(`Impossible de supprimer : ${error.message}`);data.payroll=data.payroll.filter(x=>String(x.id)!==String(id));await logAction("delete","payroll",id,{amount:p.amount});closeModal();render("payroll");}
function safeFileName(name) {
  return String(name || "facture").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,120);
}

async function fileToDataURL(file) {
  const raw = await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
  return await new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const max=1500;
      const scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(img.width*scale));
      canvas.height=Math.max(1,Math.round(img.height*scale));
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL('image/jpeg',0.72));
    };
    img.onerror=()=>resolve(raw);
    img.src=raw;
  });
}

async function viewInvoice(path) {
  if(!path)return;
  if(String(path).startsWith("data:image/")){window.open(path,"_blank","noopener");return;}
  if(!USE_SUPABASE){const sale=data.sales.find(s=>s.invoice?.path===path);if(sale?.invoice?.data)window.open(sale.invoice.data,"_blank","noopener");else alert("Facture introuvable.");return;}
  const {data:signed,error}=await supabaseClient.storage.from("invoices").createSignedUrl(path,1800);if(error)return alert(`Impossible d'ouvrir la facture : ${error.message}`);window.open(signed.signedUrl,"_blank","noopener");
}
function viewInvoiceBySaleId(id){const s=data.sales.find(x=>String(x.id)===String(id));if(!s)return;if(s.invoice?.data)return viewInvoice(s.invoice.data);if(s.invoice?.path)return viewInvoice(s.invoice.path);}
function viewCustomInvoiceById(id){const c=(data.customs||[]).find(x=>String(x.id)===String(id));if(!c)return;if(c.invoice?.data){window.open(c.invoice.data,"_blank","noopener");return;}if(c.invoice?.path)viewInvoice(c.invoice.path);}

function openPayrollModal() {
  if(!can("payroll")) return;
  openModal(`<h2>💵 Nouveau paiement</h2><div class="form-grid"><div class="field"><label>Membre</label><select id="pay-member">${data.members.filter(m=>m.active!==false).map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}</select></div><div class="field"><label>Type</label><select id="pay-type"><option>Salaire</option><option>Prime</option><option>Autre</option></select></div><div class="field"><label>Montant (€)</label><input id="pay-amount" type="number" min="0"></div><div class="field"><label>Note</label><input id="pay-note" placeholder="Salaire semaine"></div></div><br><button class="btn primary" onclick="addPayroll()">Enregistrer</button>`);
}

async function addPayroll() {
  const amount=Number(document.getElementById("pay-amount")?.value);
  if(!amount) return alert("Montant invalide.");
  const memberId=document.getElementById("pay-member")?.value;
  const member=data.members.find(m=>String(m.id)===String(memberId));
  const row={member_id:member?.id || null,member_name:member?.name || "",type:document.getElementById("pay-type")?.value,amount,note:document.getElementById("pay-note")?.value.trim()||null,payment_date:todayISO()};
  if(!USE_SUPABASE){const id=Date.now();data.payroll.push({id,date:today(),member:row.member_name,type:row.type,amount,note:row.note});save();await logAction("create","payroll",id,row);closeModal();render("payroll");return;}
  const {data:created,error}=await supabaseClient.from("payroll").insert(row).select("*").single();
  if(error) return alert(`Impossible d'enregistrer le paiement : ${error.message}`);
  data.payroll.unshift(mapPayroll(created)); await logAction("create","payroll",created.id,row); closeModal(); render("payroll");
}

function openMemberModal() {
  if(!canManageMembers()) return;
  openModal(`<h2>👥 Ajouter un membre</h2><div class="form-grid"><div class="field"><label>Nom</label><input id="member-name" placeholder="Nom RP"></div><div class="field"><label>Rôle</label><select id="member-role"><option>Patron</option><option>Co-Patron</option><option>Directeur</option><option>Responsable</option><option>Chef D'Atelier</option><option>Chef D'Atelier Adjoint</option><option>Ressource Humaine</option><option>Formateur</option><option>Employés Expérimenter</option><option>Employés</option><option>Nouvel employé</option><option>Admin</option></select></div><div class="field"><label>Mot de passe</label><input id="member-password" type="text" placeholder="Prénom1234"><small class="muted">Par défaut : prénom + 1234.</small></div></div><br><button class="btn primary" onclick="addMember()">Créer le compte</button>`);
}

async function addMember(){
  if(!canManageMembers())return;
  const name=document.getElementById("member-name")?.value.trim();
  const role=document.getElementById("member-role")?.value;
  const entered=document.getElementById("member-password")?.value.trim();
  const first=(name||"").split(/\s+/)[0]||"Membre";
  const password=entered||`${first}1234`;
  if(!name)return alert("Nom requis.");
  if(data.members.some(m=>m.name.toLowerCase()===name.toLowerCase()))return alert("Un membre portant ce nom existe déjà.");
  const id=Date.now();data.members.push({id,name,role,password,active:true});save();await logAction("create","member",id,{name,role});closeModal();render("members");
}


function openEditMemberModal(id) {
  if(!canManageMembers()) return;
  const m=data.members.find(x=>String(x.id)===String(id));
  if(!m) return;
  const protectedAdmin = String(m.name).toLowerCase()==="admin";
  openModal(`<h2>✎ Modifier un membre</h2><div class="form-grid"><div class="field"><label>Nom</label><input id="edit-member-name" value="${esc(m.name)}" ${protectedAdmin?'readonly':''}></div><div class="field"><label>Rôle</label><select id="edit-member-role" ${protectedAdmin?'disabled':''}><option>Patron</option><option>Co-Patron</option><option>Directeur</option><option>Responsable</option><option>Chef D'Atelier</option><option>Chef D'Atelier Adjoint</option><option>Ressource Humaine</option><option>Formateur</option><option>Employés Expérimenter</option><option>Employés</option><option>Nouvel employé</option><option>Admin</option></select></div><div class="field"><label>Nouveau mot de passe</label><input id="edit-member-password" type="password" placeholder="Laisser vide pour conserver l’actuel"></div></div><br><button class="btn primary" onclick="editMember('${esc(m.id)}')">Enregistrer les modifications</button>`);
}

async function editMember(id){
  if(!canManageMembers())return;const m=data.members.find(x=>String(x.id)===String(id));if(!m)return;const password=document.getElementById("edit-member-password")?.value,name=document.getElementById("edit-member-name")?.value.trim(),role=document.getElementById("edit-member-role")?.value;if(!name)return alert("Le nom est obligatoire.");const protectedAdmin=String(m.name).toLowerCase()==="admin";if(protectedAdmin&&(name.toLowerCase()!=="admin"||role!=="Admin"))return alert("Le compte admin est protégé.");
  if(!USE_SUPABASE){if(!protectedAdmin){m.name=name;m.role=role;}if(password)m.password=password;save();await logAction("update","member",id,{name,role,passwordChanged:!!password});if(String(m.id)===String(session.id)){session.name=m.name;session.role=m.role;document.getElementById("user-name").textContent=m.name;document.getElementById("user-role").textContent=m.role;}closeModal();updateNavigation();render("members");return;}
  const updates={name};if(!protectedAdmin)updates.role=role;const {data:updated,error}=await supabaseClient.from("members").update(updates).eq("id",m.id).select("id,name,role,active,auth_user_id").single();if(error)return alert(`Impossible de modifier : ${error.message}`);
  if(password){if(m.auth_user_id===session.authUserId){const {error:pwError}=await supabaseClient.auth.updateUser({password});if(pwError)return alert(`Mot de passe non modifié : ${pwError.message}`);}else{return alert("Le nom et le rôle sont modifiables ici. Pour changer le mot de passe d'un autre membre, utilise un reset Auth sécurisé.");}}
  Object.assign(m,updated);await logAction("update","member",id,{name,role});if(String(m.id)===String(session.id)){session.name=m.name;session.role=m.role;document.getElementById("user-name").textContent=m.name;document.getElementById("user-role").textContent=m.role;updateNavigation();}closeModal();render("members");
}

async function deleteMember(id) {
  if(!canManageMembers()) return;
  const m=data.members.find(x=>String(x.id)===String(id));
  if(!m || String(m.name).toLowerCase()==="admin") return alert("Le compte staff admin est protégé.");
  if(!confirm("Désactiver ce compte ?")) return;
  if(!USE_SUPABASE){m.active=false;save();await logAction("disable","member",id,{name:m.name});render("members");return;}
  const {error}=await supabaseClient.from("members").update({active:false}).eq("id",id);
  if(error) return alert(`Impossible de désactiver le membre : ${error.message}`);
  m.active=false; await logAction("disable","member",id,{name:m.name}); render("members");
}

async function activateMember(id){if(!canManageMembers())return;const m=data.members.find(x=>String(x.id)===String(id));if(!m||String(m.name).toLowerCase()==="admin")return;if(!USE_SUPABASE){m.active=true;save();await logAction("activate","member",id,{name:m.name});render("members");return;}const {error}=await supabaseClient.from("members").update({active:true}).eq("id",id);if(error)return alert(`Impossible de réactiver : ${error.message}`);m.active=true;await logAction("activate","member",id,{name:m.name});render("members");}

function openObjectiveModal() {
  if(!canEditObjective()) return;
  const current=objectiveValue();
  openModal(`<h2>🎯 Objectif de la semaine</h2><p class="muted">${weekLabel()}</p><div class="field"><label>Objectif CA (€)</label><input id="objective-amount" type="number" min="0" value="${current}"></div><br><button class="btn primary" onclick="saveObjective()">Enregistrer l’objectif</button>`);
}

async function saveObjective() {
  if(!canEditObjective()) return;
  const amount=Number(document.getElementById("objective-amount")?.value);
  if(amount < 0 || Number.isNaN(amount)) return alert("Objectif invalide.");
  const week=weekStartISO();
  if(!USE_SUPABASE){
    const existing=data.objectives.find(o=>o.weekStart===week);
    if(existing) existing.targetAmount=amount; else data.objectives.push({id:Date.now(),weekStart:week,targetAmount:amount});
    save();await logAction("update","objective",week,{amount});closeModal();render("dashboard");return;
  }
  const {data:row,error}=await supabaseClient.from("weekly_objectives").upsert({week_start:week,target_amount:amount},{onConflict:"week_start"}).select("*").single();
  if(error) return alert(`Impossible d'enregistrer l’objectif : ${error.message}`);
  const idx=data.objectives.findIndex(o=>o.weekStart===week);
  const mapped={id:row.id,weekStart:row.week_start,targetAmount:Number(row.target_amount)};
  if(idx>=0)data.objectives[idx]=mapped;else data.objectives.push(mapped);
  await logAction("update","objective",row.id,{amount,week}); closeModal();render("dashboard");
}

function mapSale(s){return {id:s.id,date:s.sale_date?new Date(`${s.sale_date}T12:00:00`).toLocaleDateString("fr-FR"):today(),seller:s.seller_name||"",sellerId:s.seller_id,vehicle:s.vehicle,client:s.client_name||"",price:Number(s.sale_price)||0,invoice:{path:s.invoice_url||null}};}
function mapPayroll(p){return {id:p.id,date:p.payment_date?new Date(`${p.payment_date}T12:00:00`).toLocaleDateString("fr-FR"):today(),member:p.member_name||"",memberId:p.member_id,type:p.type,amount:Number(p.amount)||0,note:p.note||""};}

async function refreshSupabaseData(){
  if(!USE_SUPABASE||!session)return;
  const [membersR,salesR,payrollR,clientsR,objR,settingsR]=await Promise.all([
    supabaseClient.from("members").select("id,name,role,active,auth_user_id").order("created_at",{ascending:true}),
    supabaseClient.from("sales").select("*").order("created_at",{ascending:false}),
    supabaseClient.from("payroll").select("*").order("created_at",{ascending:false}),
    supabaseClient.from("clients").select("*").order("created_at",{ascending:false}),
    supabaseClient.from("weekly_objectives").select("*").order("week_start",{ascending:false}),
    supabaseClient.from("site_settings").select("*").eq("id",1).limit(1)
  ]);
  for(const r of [membersR,salesR,payrollR,clientsR,objR])if(r.error)throw r.error;
  data.members=membersR.data||[];data.sales=(salesR.data||[]).map(mapSale);data.payroll=(payrollR.data||[]).map(mapPayroll);data.clients=clientsR.data||[];data.objectives=(objR.data||[]).map(o=>({id:o.id,weekStart:o.week_start,targetAmount:Number(o.target_amount)||0}));
  if(settingsR.data?.[0]){const r=settingsR.data[0];siteSettings={id:r.id,companyName:r.company_name,subtitle:r.subtitle,loginSubtitle:r.login_subtitle,weeklyObjectiveDefault:Number(r.weekly_objective_default)||0,weekStartsOn:Number(r.week_starts_on)||1,permissions:r.permissions||null};setPermissionsFromSettings(siteSettings.permissions);applySiteSettings();}
}


function payrollPage() {
  if (!can("payroll")) return '<div class="panel"><div class="empty">Accès réservé à la direction.</div></div>';
  const members = data.members.filter(m => m.active !== false);
  const rows = members.map(m => memberWeeklyStats(m));
  const canEdit = canEditAnyData();
  return `<div class="panel">
    <div class="panel-heading">
      <div><h2>Paye de la semaine</h2><span class="muted">${weekLabel()}</span></div>
      ${canEdit ? '<button class="btn primary" onclick="openPayrollModal()">+ Enregistrer un paiement</button>' : ''}
    </div>
    <div style="overflow:auto">
      <table class="payroll-matrix">
        <tr><th>EMPLOYÉ</th><th>GRADE</th><th>% VENTES</th><th>CA VENTES</th><th>NB VENTES</th><th>COMMISSION</th><th>PAYE CALCULÉE</th></tr>
        ${members.map((m,i) => {
          const r = rows[i], c = r.settings;
          return `<tr>
            <td><button class="text-btn" onclick="openMemberWeeklyModal('${esc(m.id)}')">${esc(m.name)}</button></td>
            <td><span class="badge">${esc(m.role)}</span></td>
            <td>${Number(c.salePercent || 0).toFixed(0)}%</td>
            <td>${money(r.salesCA)}</td>
            <td>${r.sales.length}</td>
            <td>${money(r.salesCA * Number(c.salePercent || 0) / 100)}</td>
            <td><strong>${money(r.final)}</strong></td>
          </tr>`;
        }).join('')}
      </table>
    </div>
    <div class="panel" style="margin-top:15px">
      <h2>Paiements manuels de la semaine</h2>
      <table><tr><th>Date</th><th>Membre</th><th>Type</th><th>Montant</th><th>Note</th>${canEdit ? '<th>Actions</th>' : ''}</tr>
      ${(() => {
        const wp = data.payroll.filter(p => isThisWeek(p.date));
        if (!wp.length) return `<tr><td colspan="${canEdit ? 6 : 5}" class="empty">Aucun paiement manuel cette semaine.</td></tr>`;
        return wp.slice().reverse().map(p => `<tr><td>${esc(p.date)}</td><td>${esc(p.member)}</td><td>${esc(p.type)}</td><td>${money(p.amount)}</td><td>${esc(p.note || '')}</td>${canEdit ? `<td><button class="btn secondary" onclick="openEditPayrollModal('${esc(p.id)}')">Modifier</button> <button class="btn danger" onclick="deletePayroll('${esc(p.id)}')">Supprimer</button></td>` : ''}</tr>`).join('');
      })()}
      </table>
    </div>
  </div>`;
}

const pages = {
  dashboard: dashboardPage,
  sales: salesPage,
  customs: customsPage,
  // Protection contre les anciennes copies du fichier : aucune erreur
  // ReferenceError ne doit empêcher le formulaire de connexion de fonctionner.
  payroll: (typeof payrollPage === "function") ? payrollPage : function(){
    return '<div class="panel"><div class="empty">La page Salaires est indisponible dans cette version.</div></div>';
  },
  members: membersPage,
  accounting: accountingPage,
  reports: reportsPage,
  settings: settingsPage
};

async function initializeAuth() { return; }

async function bootstrap() {
  document.getElementById("login-error").textContent = "";
}

document.getElementById("login-form").addEventListener("submit", async e=>{
  e.preventDefault();
  const errorEl=document.getElementById("login-error");
  errorEl.textContent="Connexion...";
  const ok=await login(document.getElementById("login-username").value,document.getElementById("login-password").value);
  if(!ok) errorEl.textContent="Identifiant ou mot de passe incorrect.";
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", event => {
    if (btn.disabled || !can(btn.dataset.page)) return;
    btn.classList.remove("clicked"); void btn.offsetWidth; btn.classList.add("clicked");
    const ripple = document.createElement("span"); ripple.className = "nav-ripple";
    const rect = btn.getBoundingClientRect(); ripple.style.left = `${event.clientX - rect.left}px`; ripple.style.top = `${event.clientY - rect.top}px`;
    btn.appendChild(ripple); setTimeout(() => ripple.remove(), 450);
    render(btn.dataset.page);
  });
});

document.getElementById("logout").addEventListener("click",logout);
document.getElementById("quick-sale").addEventListener("click",openSaleModal);
document.getElementById("quick-custom").addEventListener("click",openCustomModal);
document.getElementById("close-modal").addEventListener("click",closeModal);
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});
document.addEventListener("click", event => {
  const button = event.target.closest(".btn");
  if (button && !button.disabled) { button.classList.remove("button-clicked"); void button.offsetWidth; button.classList.add("button-clicked"); }
  const invoiceBtn = event.target.closest(".invoice-link");
  if (invoiceBtn) { if(invoiceBtn.dataset.saleId) viewInvoiceBySaleId(invoiceBtn.dataset.saleId); else viewInvoice(invoiceBtn.dataset.path); }
  const customInvoiceBtn = event.target.closest(".custom-invoice-link");
  if (customInvoiceBtn) viewCustomInvoiceById(customInvoiceBtn.dataset.customId);
});

bootstrap();

