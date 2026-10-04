/* Self · utilidades compartidas (formato, estadística, fechas y logotipo) */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const gaussOf=r=>()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const isNum=v=>v!=null&&v!==''&&isFinite(v);
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd=a=>{const m=avg(a);return Math.sqrt(avg(a.map(x=>(x-m)**2)))};
const median=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;if(!n)return 0;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
const f1=(x,d=1)=>isNum(x)?(+x).toFixed(d).replace('.',','):'—';
const fi=x=>{if(!isNum(x))return'—';const n=Math.round(x),s=Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');return(n<0?'−':'')+s};
const pad=n=>String(n).padStart(2,'0');
const hShort=m=>{if(!isNum(m))return'—';m=Math.round(m);return Math.floor(m/60)+' h '+pad(m%60)};
const clock=m=>{if(!isNum(m))return'—';m=((Math.round(m)%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60)};
const mmss=s=>{if(!isNum(s))return'—';s=Math.round(s);return Math.floor(s/60)+':'+pad(s%60)};
const hmmss=s=>{if(!isNum(s))return'—';s=Math.round(s);const h=Math.floor(s/3600);return h?h+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60):mmss(s)};
const sgn=x=>x>=0?'+':'−';
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAL=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DIA3=['dom','lun','mar','mié','jue','vie','sáb'];
const dShort=d=>d.getDate()+' '+MES[d.getMonth()];
const dDay=d=>DIA3[d.getDay()]+' '+d.getDate()+' '+MES[d.getMonth()];
const esc=s=>s==null?'':String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
const dayKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseDay=s=>{const [y,m,d]=s.slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r};
const startOfDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
function pearson(x,y){const mx=avg(x),my=avg(y);let n=0,a=0,b=0;x.forEach((v,i)=>{n+=(v-mx)*(y[i]-my);a+=(v-mx)**2;b+=(y[i]-my)**2});const r=n/Math.sqrt(a*b);return isFinite(r)?r:0}
function slope(y){const xs=y.map((_,i)=>i),mx=avg(xs),my=avg(y);let a=0,b=0;xs.forEach((x,i)=>{a+=(x-mx)*(y[i]-my);b+=(x-mx)**2});return b?a/b:0}
function slope2(x,y){const mx=avg(x),my=avg(y);let a=0,b=0;x.forEach((v,i)=>{a+=(v-mx)*(y[i]-my);b+=(v-mx)**2});return b?a/b:0}

/* Logotipo: columna vertebral en forma de S.
   Para cambiar el logotipo, sustituye esta función y los PNG de /icons. */
function spine(size,anim=false){
  let v='';const n=7;
  for(let k=0;k<n;k++){const t=k/(n-1),y=12.5+t*39,x=32+7.5*Math.sin(t*2*Math.PI),ang=Math.atan(7.5*2*Math.PI/39*Math.cos(t*2*Math.PI))*180/Math.PI,w=10.5+t*9.5;
    v+=`<g transform="rotate(${(-ang).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})"><rect ${anim?`class="vt" style="animation-delay:${80+k*55}ms"`:''} x="${(x-w/2).toFixed(2)}" y="${(y-1.95).toFixed(2)}" width="${w.toFixed(2)}" height="3.9" rx="1.95" fill="#fff"/></g>`}
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect ${anim?'class="icon"':''} width="64" height="64" rx="15" style="fill:var(--logo)"/>${v}</svg>`;
}
