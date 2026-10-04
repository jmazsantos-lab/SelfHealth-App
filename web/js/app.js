/* Self · interfaz. Recibe un conjunto de datos (demo o Supabase) y pinta la app. */
function startSelf(DS){
const D=DS.days,N=D.length,LAST=N-1,TODAY=DS.today,T=D[LAST],Y=D[LAST-1]||{},HYP=DS.hyp||[],NOW=DS.now,MEALS=DS.meals||[];
const L30=D.slice(-30),B=D.slice(-30,-1);
const A=k=>{const v=D.slice(-30,-1).map(x=>x[k]).filter(isNum);return v.length?avg(v):null};
const C={pop:'var(--pop)',rec:'var(--rec)',slp:'var(--slp)',act:'var(--act)',hrv:'var(--hrv)',str:'var(--str)',nut:'var(--nut)',alc:'var(--alc)',red:'var(--red)',cf:'var(--cf)',caf:'var(--caf)',mu:'var(--mu)',mu2:'var(--mu2)',tx:'var(--tx)',acc:'var(--acc)',deep:'var(--deep)',light:'var(--light)',remc:'var(--remc)',awake:'var(--awake)'};
const EMPTY=(h=90,t='Todavía no hay datos suficientes')=>`<div class="empty" style="height:${h}px">${t}</div>`;

/* ===================== Registro de métricas ===================== */
const M={
  rec:{n:'Recuperación',u:'%',c:'rec',hb:1,d:0,src:'Calculado por Self',desc:'Índice de 0 a 100 que combina HRV, frecuencia cardíaca en reposo y calidad del sueño frente a tu línea base de los últimos 30 días.',freq:'Una vez al día, al despertar',bands:[[67,'Alta'],[34,'Moderada'],[0,'Baja']]},
  sScore:{n:'Puntuación de sueño',u:'',c:'slp',hb:1,d:0,src:'Garmin',desc:'Valoración de 0 a 100 de la noche según duración, fases, interrupciones y estrés nocturno.',freq:'Cada noche'},
  sleepH:{n:'Duración del sueño',u:'h',c:'slp',hb:1,d:1,src:'Garmin',desc:'Tiempo total dormido, sin contar los despertares.',freq:'Cada noche',goal:7.75,chart:'bar',fmt:v=>hShort(v*60)},
  deep:{n:'Sueño profundo',u:'min',c:'deep',hb:1,d:0,src:'Garmin',desc:'Fase de mayor recuperación física. Lo habitual es entre el 13 y el 23 % del total.',freq:'Cada noche',chart:'bar'},
  light:{n:'Sueño ligero',u:'min',c:'light',hb:null,d:0,src:'Garmin',desc:'Fase de transición que ocupa aproximadamente la mitad de la noche.',freq:'Cada noche',chart:'bar'},
  rem:{n:'Sueño REM',u:'min',c:'remc',hb:1,d:0,src:'Garmin',desc:'Fase asociada a la recuperación mental y la memoria.',freq:'Cada noche',chart:'bar'},
  strain:{n:'Esfuerzo',u:'/21',c:'act',hb:null,d:1,src:'Calculado por Self con datos de Garmin',desc:'Carga cardiovascular acumulada del día, en escala de 0 a 21, a partir de tus calorías activas y la carga de tus entrenamientos.',freq:'Continuo',partial:1},
  hrv:{n:'HRV nocturna',u:'ms',c:'hrv',hb:1,d:0,src:'Garmin',desc:'Variabilidad de la frecuencia cardíaca durante la noche. Valores por encima de tu media indican buena recuperación.',freq:'Cada noche'},
  rhr:{n:'FC en reposo',u:'lpm',c:'cf',hb:0,d:0,src:'Garmin',desc:'Frecuencia cardíaca más baja sostenida en reposo. Una subida de 3 lpm o más sobre tu media suele indicar fatiga o alcohol.',freq:'Cada noche'},
  bb:{n:'Body Battery',u:'',c:'rec',hb:1,d:0,src:'Garmin',desc:'Nivel de energía estimado por Garmin (0–100), máximo alcanzado en el día.',freq:'Continuo'},
  stress:{n:'Estrés medio',u:'',c:'str',hb:0,d:0,src:'Garmin',desc:'Media diaria del nivel de estrés fisiológico (0–100), calculado a partir de la HRV.',freq:'Cada 3 minutos'},
  spo2:{n:'SpO₂',u:'%',c:'slp',hb:1,d:1,src:'Garmin',desc:'Saturación de oxígeno media durante el sueño.',freq:'Cada noche'},
  skin:{n:'Temperatura de la piel',u:'°C',c:'alc',hb:null,d:1,src:'Garmin',desc:'Desviación de la temperatura de la piel nocturna respecto a tu valor base.',freq:'Cada noche'},
  resp:{n:'Respiración',u:'rpm',c:'rec',hb:0,d:1,src:'Garmin',desc:'Frecuencia respiratoria media durante el sueño.',freq:'Cada noche'},
  steps:{n:'Pasos',u:'',c:'act',hb:1,d:0,src:'iPhone y Garmin',desc:'Pasos diarios. Si el Atajo de iOS envía los pasos del iPhone, se usan esos; si no, los de Garmin.',freq:'Continuo',goal:10000,chart:'bar',partial:1},
  kAct:{n:'Calorías activas',u:'kcal',c:'act',hb:1,d:0,src:'Garmin',desc:'Energía gastada por encima del metabolismo basal.',freq:'Continuo',goal:700,chart:'bar',partial:1},
  trainMin:{n:'Minutos de entrenamiento',u:'min',c:'cf',hb:1,d:0,src:'Garmin',desc:'Tiempo total de actividades registradas.',freq:'Por actividad',chart:'bar'},
  acwr:{n:'Ratio carga aguda/crónica',u:'',c:'act',hb:null,d:2,src:'Calculado por Self',desc:'Carga de los últimos 7 días frente a la media semanal de los últimos 28. La zona óptima está entre 0,8 y 1,3; por encima de 1,5 aumenta el riesgo de lesión.',freq:'Diario'},
  runPace:{n:'Ritmo en carrera',u:'/km',c:'act',hb:0,d:0,src:'Garmin',desc:'Ritmo medio de cada día con carrera. Las tiradas largas y los rodajes son más lentos por diseño.',freq:'Por actividad',fmt:v=>mmss(v),inv:1,get:x=>x.run?x.pace:null},
  kIn:{n:'Calorías consumidas',u:'kcal',c:'nut',hb:null,d:0,src:'Registros de Self',desc:'Energía total registrada en comidas y bebidas, alcohol incluido.',freq:'Por comida',goal:2600,chart:'bar',partial:1},
  prot:{n:'Proteína',u:'g',c:'rec',hb:1,d:0,src:'Registros de Self',desc:'Proteína diaria registrada. Objetivo: 2 g por kg de peso corporal.',freq:'Por comida',goal:160,chart:'bar',partial:1},
  carb:{n:'Carbohidratos',u:'g',c:'nut',hb:null,d:0,src:'Registros de Self',desc:'Carbohidratos diarios registrados.',freq:'Por comida',goal:300,chart:'bar',partial:1},
  fat:{n:'Grasas',u:'g',c:'act',hb:null,d:0,src:'Registros de Self',desc:'Grasas diarias registradas.',freq:'Por comida',goal:80,chart:'bar',partial:1},
  water:{n:'Agua',u:'vasos',c:'hrv',hb:1,d:0,src:'Registros de Self',desc:'Vasos de agua registrados (250 ml cada uno).',freq:'Manual',goal:8,chart:'bar',partial:1},
  caf:{n:'Cafeína',u:'mg',c:'caf',hb:0,d:0,src:'Registros de Self',desc:'Cafeína registrada en cafés y bebidas. Límite recomendado: 400 mg al día.',freq:'Por bebida',goal:400,chart:'bar',partial:1},
  alc:{n:'Alcohol',u:'consumiciones',c:'alc',hb:0,d:0,src:'Registros de Self',desc:'Consumiciones de alcohol registradas (una cerveza de 33 cl equivale a una consumición).',freq:'Por bebida',chart:'bar',partial:1},
  weight:{n:'Peso',u:'kg',c:'nut',hb:null,d:1,src:'Apple Salud',desc:'Peso corporal enviado por el Atajo de iOS.',freq:'Diario'},
  energy:{n:'Energía percibida',u:'/5',c:'rec',hb:1,d:0,src:'Registros de Self',desc:'Valoración subjetiva de tu energía al despertar.',freq:'Diario',chart:'bar'},
  habits:{n:'Hábitos cumplidos',u:'%',c:'rec',hb:1,d:0,src:'Órbita',desc:'Porcentaje de hábitos diarios completados.',freq:'Diario',chart:'bar',partial:1},
  tNight:{n:'Temperatura exterior',u:'°C',c:'nut',hb:null,d:1,src:'Open-Meteo',desc:'Temperatura nocturna. Self la cruza con tu sueño, y la máxima del día con tu estrés, tus pasos y tu ritmo en carrera.',freq:'Diario'},
  work:{n:'Carga de trabajo',u:'tareas',c:'str',hb:null,d:0,src:'Summit',desc:'Tareas completadas cada día.',freq:'Diario',chart:'bar',get:x=>x.tasks}
};
const mget=(k,x)=>{if(!x)return null;const v=M[k].get?M[k].get(x):x[k];return isNum(v)?+v:null};
const mfmt=(k,v)=>{const m=M[k];if(!isNum(v))return'—';if(m.fmt)return m.fmt(v);if(k==='skin')return(v>=0?'+':'−')+f1(Math.abs(v));return m.d?f1(v,m.d):fi(v)};

/* ===================== Iconos ===================== */
const IC={
  hoy:'<path d="M4 12h3l2-5 3 10 2.5-7 1.5 2H20"/>',
  sueno:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  entreno:'<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2.5V21M6 11.5l3.5-3.5 4.5.5 2.5 3.5 3 1M11 8.5l-1.5 6.5"/>',
  nutri:'<path d="M7 3v7.5a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M9 3v6M9 12.5V21"/><path d="M17 21V3c-2.2 1.2-3.5 4.3-3.5 8.5H17"/>',
  tend:'<path d="M4 4v16h16"/><path d="M8 15l3.5-4 3 2.5L20 7"/>',
  sync:'<path d="M20 11a8 8 0 0 0-14.9-3.5M4 13a8 8 0 0 0 14.9 3.5"/><path d="M4 4v4h4M20 20v-4h-4"/>',
  run:'<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2.5V21M6 11.5l3.5-3.5 4.5.5 2.5 3.5 3 1M11 8.5l-1.5 6.5"/>',
  cf:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',chev:'<path d="M15 5l-7 7 7 7"/>',next:'<path d="M9 5l7 7-7 7"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  brief:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3.2 4M16 6h3a3 3 0 0 1-3.2 4M12 13v4M8 20h8M10 17h4v3h-4z"/>',
  flask:'<path d="M9 3h6M10 3v6l-5.2 9A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3L14 9V3M7.5 15h9"/>',
  watch:'<rect x="6" y="6" width="12" height="12" rx="3.5"/><path d="M9 6l.6-3h4.8L15 6M9 18l.6 3h4.8l.6-3M12 9.5V12l1.5 1.5"/>',
  band:'<path d="M4 9.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5v5c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5z"/><path d="M4 9.5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  cloud:'<path d="M7 18.5a4.2 4.2 0 0 1-.6-8.4 5.6 5.6 0 0 1 10.8-1.3 4.8 4.8 0 0 1 .3 9.7z"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  heart:'<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  wave:'<path d="M3 12c2 0 2-5 4.5-5S10 17 12.5 17 15 7 17.5 7 19 12 21 12"/>',
  battery:'<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10.5v3M6.5 10v4M9.5 10v4M12.5 10v4"/>',
  flame:'<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
  drop:'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  lungs:'<path d="M12 4v8M12 9l-3 3M12 9l3 3"/><path d="M9 8c-3-1-5 3-5 8 0 2.5 1.5 3.5 3 3.2 2-.2 3-1.7 3-4.2v-4"/><path d="M15 8c3-1 5 3 5 8 0 2.5-1.5 3.5-3 3.2-2-.2-3-1.7-3-4.2v-4"/>',
  smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  foot:'<ellipse cx="8.5" cy="8" rx="2.6" ry="4"/><ellipse cx="15.5" cy="14" rx="2.6" ry="4"/><path d="M7.3 15h2.4M14.3 21h2.4"/>',
  coffee:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5"/>',
  beer:'<path d="M6 7h10v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 7a3 3 0 0 1 3-3 3 3 0 0 1 5 0 2.5 2.5 0 0 1 2 3"/>',
  scale:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a4.5 4.5 0 0 1 7 0l-2.2 2.5"/>',
  gauge:'<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
  recover:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/><path d="M9 12.5l2 2 4-4"/>',
  stressI:'<circle cx="12" cy="12" r="8.5"/><path d="M7 13h2l1.5-3 3 6 1.5-3h2"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',grip:'<path d="M5 9h14M5 15h14"/>',up:'<path d="M6 15l6-6 6 6"/>',minus:'<path d="M6 12h12"/>',
  therm:'<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/>',
  logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>'
};
const ico=(n,s=22,sw=1.6)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]||IC.spark}</svg>`;
const nextI=`<span class="chev">${ico('next',16,2)}</span>`;

/* ===================== Gráficos SVG ===================== */
let gid=0;
function smooth(p){if(p.length<2)return`M${p[0][0]},${p[0][1]}`;let d=`M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;for(let i=0;i<p.length-1;i++){const p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2;d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`}return d}
const grid=(W,P,y,label,hide)=>`<line x1="${P.l}" x2="${W-P.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--line)"/>${hide?'':`<text x="${W-P.r+6}" y="${(y+3).toFixed(1)}">${label}</text>`}`;
function xLab(W,P,h,n,dates){
  const X=i=>P.l+(i+.5)*(W-P.l-P.r)/n;if(!dates||!n)return'';
  const idx=n<3?[0,n-1]:[0,Math.floor((n-1)/2),n-1];
  return idx.map((i,k)=>`<text x="${X(i).toFixed(1)}" y="${h-4}" text-anchor="${k===0?'start':k===idx.length-1?'end':'middle'}">${dates[i].getTime()===TODAY.getTime()?'Hoy':dShort(dates[i])}</text>`).join('');
}
function lineChart(vals,{color,h=160,dates,fmt=v=>Math.round(v),inv=false,avg7=true,band,refLine,dots=false}={}){
  const ok=vals.map(isNum);vals=vals.filter((_,i)=>ok[i]).map(Number);if(dates)dates=dates.filter((_,i)=>ok[i]);
  if(vals.length<2)return EMPTY(h-30);
  const W=340,P={l:2,r:36,t:12,b:22},id='lg'+(gid++),n=vals.length,bd=(band||[]).filter(isNum);
  let mn=Math.min(...vals,...bd),mx=Math.max(...vals,...bd);const pd=(mx-mn)*.15||1;mn-=pd;mx+=pd;
  const X=i=>P.l+(i+.5)*(W-P.l-P.r)/n,Yv=v=>{const r=(v-mn)/(mx-mn);return P.t+(inv?r:1-r)*(h-P.t-P.b)};
  const pts=vals.map((v,i)=>[X(i),Yv(v)]),line=smooth(pts),area=line+` L${pts[n-1][0]},${h-P.b} L${pts[0][0]},${h-P.b} Z`;
  let s='';for(let k=0;k<3;k++){const v=mn+(mx-mn)*(k+.5)/3;s+=grid(W,P,Yv(v),fmt(v))}
  if(band&&bd.length===2){const y1=Yv(band[1]),y0=Yv(band[0]);s+=`<rect x="${P.l}" width="${W-P.l-P.r}" y="${Math.min(y0,y1).toFixed(1)}" height="${Math.abs(y0-y1).toFixed(1)}" style="fill:${color};opacity:.08"/>`}
  if(refLine!=null){const y=Yv(refLine);s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" style="stroke:var(--tx);stroke-opacity:.45" stroke-dasharray="2 3"/>`}
  s+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.22"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs><path d="${area}" fill="url(#${id})"/><path class="ln" pathLength="1" d="${line}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linecap="round"/>`;
  if(avg7&&n>7){const r=vals.map((v,i)=>avg(vals.slice(Math.max(0,i-6),i+1)));s+=`<path d="${smooth(r.map((v,i)=>[X(i),Yv(v)]))}" fill="none" style="stroke:var(--tx);stroke-opacity:.5" stroke-width="1.3" stroke-dasharray="3 3"/>`}
  if(dots)pts.forEach(p=>{s+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" style="fill:${color}"/>`});
  const L=pts[n-1];s+=`<circle cx="${L[0]}" cy="${L[1]}" r="3.5" style="fill:${color};stroke:var(--s1)" stroke-width="1.5"/>`+xLab(W,P,h,n,dates);
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}
function barChart(vals,{color,h=140,dates,goal,goalLabel,colorFn,fmt=v=>fi(v),hi,neg=false,labels}={}){
  vals=vals.map(v=>isNum(v)?+v:0);if(!vals.length||vals.every(v=>v===0))return EMPTY(h-30);
  const W=340,P={l:2,r:36,t:12,b:22},n=vals.length,bw=(W-P.l-P.r)/n;
  let mn=neg?Math.min(0,...vals)*1.15:0,mx=hi??Math.max(...vals,goal||0)*1.12;if(neg)mx=Math.max(0,...vals)*1.15||1;if(mx===mn)mx=mn+1;
  const Yv=v=>P.t+(1-(v-mn)/(mx-mn))*(h-P.t-P.b);
  let s='';for(let k=0;k<3;k++){const v=mn+(mx-mn)*(k+.5)/3,y=Yv(v);s+=grid(W,P,y,fmt(v),goal!=null&&Math.abs(y-Yv(goal))<12)}
  vals.forEach((v,i)=>{const x=P.l+i*bw+bw*.18,w=bw*.64,y0=Yv(0),y=Yv(v),c=colorFn?colorFn(v,i):color;
    s+=`<rect class="${v<0?'brn':'br'}" style="animation-delay:${Math.min(i*10,500)}ms;fill:${c}" x="${x.toFixed(1)}" y="${Math.min(y,y0).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1.5,Math.abs(y-y0)).toFixed(1)}" rx="${Math.min(2.5,w/2).toFixed(1)}"/>`});
  if(neg)s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${Yv(0)}" y2="${Yv(0)}" style="stroke:var(--mu2)"/>`;
  if(goal!=null){const y=Yv(goal);s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y}" y2="${y}" style="stroke:var(--tx);stroke-opacity:.5" stroke-dasharray="3 3"/><text x="${W-P.r+6}" y="${y+3}" style="fill:var(--tx);font-weight:600">${goalLabel||fmt(goal)}</text>`}
  if(labels)labels.forEach((l,i)=>{s+=`<text x="${(P.l+(i+.5)*bw).toFixed(1)}" y="${h-4}" text-anchor="middle">${l}</text>`});else s+=xLab(W,P,h,n,dates);
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}
function spark(vals,color){
  vals=vals.filter(isNum);if(vals.length<2)return'';
  const W=120,h=28,n=vals.length;let mn=Math.min(...vals),mx=Math.max(...vals);if(mx===mn)mx=mn+1;
  const p=vals.map((v,i)=>[2+i*(W-4)/(n-1),3+(1-(v-mn)/(mx-mn))*(h-6)]),L=p[n-1];
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" style="margin-top:6px"><path class="ln" pathLength="1" d="${smooth(p)}" fill="none" style="stroke:${color}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${L[0]}" cy="${L[1]}" r="2.4" style="fill:${color}"/></svg>`;
}
function xyChart(xs,ys,{color,h=110,inv=false,fmt=v=>Math.round(v),xfmt=v=>f1(v)+' km',area=true,bands}={}){
  const ok=xs.map((x,i)=>isNum(x)&&isNum(ys[i]));xs=xs.filter((_,i)=>ok[i]);ys=ys.filter((_,i)=>ok[i]);
  if(xs.length<2)return EMPTY(h-20,'Sin datos de este sensor');
  const W=340,P={l:2,r:38,t:8,b:20},id='xy'+(gid++);
  let mn=Math.min(...ys),mx=Math.max(...ys);const pd=(mx-mn)*.12||1;mn-=pd;mx+=pd;
  const x0=xs[0],x1=xs[xs.length-1],X=v=>P.l+(v-x0)/((x1-x0)||1)*(W-P.l-P.r),Yv=v=>{const r=(v-mn)/(mx-mn);return P.t+(inv?r:1-r)*(h-P.t-P.b)};
  let s='';
  if(bands)bands.forEach(b=>{s+=`<rect x="${X(b[0]).toFixed(1)}" y="${P.t}" width="${(X(b[1])-X(b[0])).toFixed(1)}" height="${h-P.t-P.b}" style="fill:var(--s3);opacity:.7"/>`+(b[2]?`<text x="${((X(b[0])+X(b[1]))/2).toFixed(1)}" y="${P.t+10}" text-anchor="middle">${b[2]}</text>`:'')});
  for(let k=0;k<3;k++){const v=mn+(mx-mn)*(k+.5)/3;s+=grid(W,P,Yv(v),fmt(v))}
  const d='M'+xs.map((x,i)=>X(x).toFixed(1)+','+Yv(ys[i]).toFixed(1)).join(' L');
  if(area)s+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${color};stop-opacity:.25"/><stop offset="1" style="stop-color:${color};stop-opacity:0"/></linearGradient></defs><path d="${d} L${X(x1)},${h-P.b} L${X(x0)},${h-P.b} Z" fill="url(#${id})"/>`;
  s+=`<path class="ln" pathLength="1" d="${d}" fill="none" style="stroke:${color}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s+=`<text x="${P.l}" y="${h-4}">${xfmt(x0)}</text><text x="${X((x0+x1)/2)}" y="${h-4}" text-anchor="middle">${xfmt((x0+x1)/2)}</text><text x="${X(x1)}" y="${h-4}" text-anchor="end">${xfmt(x1)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}
function hypnoChart(){
  const W=340,h=150,P={l:64,r:6,t:8,b:22},t0=HYP[0].t0,t1=HYP[HYP.length-1].t0+HYP[HYP.length-1].dur;
  const X=t=>P.l+(t-t0)/(t1-t0)*(W-P.l-P.r),rowY=[16,48,80,112],cols=[C.awake,C.remc,C.light,C.deep],names=['Despierto','REM','Ligero','Profundo'];
  let s='';names.forEach((nm,k)=>{s+=`<text x="0" y="${rowY[k]+4}" style="fill:var(--mu);font-size:11px">${nm}</text><line x1="${P.l}" x2="${W-P.r}" y1="${rowY[k]}" y2="${rowY[k]}" style="stroke:var(--line)"/>`});
  HYP.forEach((sg,i)=>{const x=X(sg.t0),w=Math.max(1.6,X(sg.t0+sg.dur)-x);
    if(i>0){const pv=HYP[i-1];s+=`<line x1="${x}" x2="${x}" y1="${rowY[pv.st]}" y2="${rowY[sg.st]}" style="stroke:var(--mu2)" stroke-width=".8"/>`}
    s+=`<rect class="br" style="animation-delay:${Math.min(i*12,600)}ms;fill:${cols[sg.st]}" x="${x.toFixed(1)}" y="${rowY[sg.st]-7}" width="${w.toFixed(1)}" height="14" rx="2.5"/>`});
  for(let hh=Math.ceil(t0/60);hh*60<t1;hh++){if(hh*60-t0<40||t1-hh*60<55||hh%2)continue;s+=`<text x="${X(hh*60)}" y="${h-4}" text-anchor="middle">${clock(hh*60)}</text>`}
  s+=`<text x="${P.l}" y="${h-4}" style="fill:var(--tx)">${clock(t0)}</text><text x="${W-P.r}" y="${h-4}" text-anchor="end" style="fill:var(--tx)">${clock(t1)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}
function consistencyChart(){
  const days=L30.filter(x=>isNum(x.bed)&&isNum(x.wake));if(days.length<3)return EMPTY(120);
  const W=340,h=150,P={l:2,r:36,t:10,b:22},lo=21*60,hi=33*60,n=L30.length,bw=(W-P.l-P.r)/n,Yv=m=>P.t+(clamp(m,lo,hi)-lo)/(hi-lo)*(h-P.t-P.b);
  let s='';[23,25,27,29,31].forEach(hh=>{s+=grid(W,P,Yv(hh*60),clock(hh*60))});
  L30.forEach((x,i)=>{if(!isNum(x.bed)||!isNum(x.wake))return;const w=x.dow===6||x.dow===0;s+=`<rect class="brn" style="animation-delay:${i*10}ms;fill:var(--slp);opacity:${w?.45:.9}" x="${(P.l+i*bw+bw*.2).toFixed(1)}" y="${Yv(x.bed).toFixed(1)}" width="${(bw*.6).toFixed(1)}" height="${(Yv(x.wake)-Yv(x.bed)).toFixed(1)}" rx="2.5"/>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s+xLab(W,P,h,n,L30.map(x=>x.d))}</svg>`;
}
function stackedWeeks(){
  const W=340,h=150,P={l:2,r:2,t:16,b:22};
  const weeks=[0,1,2,3].map(w=>{const a=N-28+7*w,sl=D.slice(Math.max(0,a),a+7);return{lab:sl[0]?dShort(sl[0].d):'',run:sl.reduce((s,x)=>s+(x.runMin||0),0),cf:sl.reduce((s,x)=>s+(x.cfMin||0),0)}});
  const mx=Math.max(...weeks.map(w=>w.run+w.cf))*1.12;if(!mx)return EMPTY(120,'Sin entrenamientos en las últimas 4 semanas');
  const bw=(W-P.l-P.r)/4,Yv=v=>P.t+(1-v/mx)*(h-P.t-P.b);let s='';
  weeks.forEach((w,i)=>{const x=P.l+i*bw+bw*.22,b=bw*.56,yR=Yv(w.run),yT=Yv(w.run+w.cf),y0=Yv(0);
    s+=`<rect class="br" style="animation-delay:${i*60}ms;fill:var(--act)" x="${x}" y="${yR}" width="${b}" height="${y0-yR}" rx="3"/><rect class="br" style="animation-delay:${i*60+100}ms;fill:var(--cf)" x="${x}" y="${yT}" width="${b}" height="${Math.max(0,yR-yT-2)}" rx="3"/><text x="${x+b/2}" y="${yT-5}" text-anchor="middle" style="fill:var(--tx);font-weight:600">${f1((w.run+w.cf)/60)} h</text><text x="${x+b/2}" y="${h-4}" text-anchor="middle">Desde ${w.lab}</text>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}
function scatter(xs,ys,color,lx='Bajo',hx='Alto',fy=v=>Math.round(v)){
  const W=340,h=140,P={l:2,r:36,t:10,b:22};
  const pdy=(Math.max(...ys)-Math.min(...ys))*.12||1,mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys)-pdy,mxy=Math.max(...ys)+pdy;
  const X=v=>P.l+(v-mnx)/(mxx-mnx||1)*(W-P.l-P.r),Yv=v=>P.t+(1-(v-mny)/(mxy-mny))*(h-P.t-P.b),b=slope2(xs,ys),a=avg(ys)-b*avg(xs);
  let s='';for(let k=0;k<3;k++){const v=mny+(mxy-mny)*(k+.5)/3;s+=grid(W,P,Yv(v),fy(v))}
  xs.forEach((v,i)=>{s+=`<circle cx="${X(v).toFixed(1)}" cy="${Yv(ys[i]).toFixed(1)}" r="3.6" style="fill:${color};fill-opacity:.65;stroke:var(--s1)"/>`});
  s+=`<line x1="${X(mnx)}" y1="${Yv(a+b*mnx)}" x2="${X(mxx)}" y2="${Yv(a+b*mxx)}" style="stroke:var(--tx);stroke-opacity:.6" stroke-width="1.4"/><text x="${P.l}" y="${h-4}">${lx}</text><text x="${W-P.r}" y="${h-4}" text-anchor="end">${hx}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">${s}</svg>`;
}

/* ===================== Mapas ===================== */
/* Demo: ruta dibujada sobre el Malecón. Datos reales: mapa de OpenStreetMap con tu GPS. */
const COAST=[[1.2,-.35],[.6,-.1],[0,0],[-.6,.05],[-1.3,0],[-2.0,-.12],[-2.6,.08],[-3.1,-.05],[-3.8,-.3],[-4.6,-.6],[-5.4,-.95],[-6.2,-1.3],[-7.0,-1.6],[-7.8,-1.9],[-8.6,-2.1]];
const ROUTE=COAST.slice(2).map(p=>[p[0],p[1]-.075]);
const RLEN=(()=>{const c=[0];for(let i=1;i<ROUTE.length;i++)c.push(c[i-1]+Math.hypot(ROUTE[i][0]-ROUTE[i-1][0],ROUTE[i][1]-ROUTE[i-1][1]));return c})();
function along(d){for(let i=1;i<ROUTE.length;i++){if(d<=RLEN[i]){const f=(d-RLEN[i-1])/(RLEN[i]-RLEN[i-1]);return[ROUTE[i-1][0]+f*(ROUTE[i][0]-ROUTE[i-1][0]),ROUTE[i-1][1]+f*(ROUTE[i][1]-ROUTE[i-1][1])]}}return ROUTE[ROUTE.length-1]}
function demoMap(act){
  const W=340,H=230,half=act.km/2;
  const pos=act.dist.map(d=>{const out=d<=half,q=along(out?d:act.km-d);return out?q:[q[0]+.012,q[1]-.03]});
  const xsK=pos.map(p=>p[0]),ysK=pos.map(p=>p[1]);
  const minx=Math.min(...xsK)-.45,maxx=Math.max(...xsK)+.45,miny=Math.min(...ysK)-.6,maxy=Math.max(...ysK)+.75;
  const sc=Math.min(W/(maxx-minx),H/(maxy-miny)),cx=(minx+maxx)/2,cy=(miny+maxy)/2,PX=p=>[W/2+(p[0]-cx)*sc,H/2-(p[1]-cy)*sc];
  const cp=COAST.map(PX),path=cp.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' L');
  const id='mp'+(gid++);let streets='';const step=.22*sc;
  for(let k=-30;k<=30;k++){streets+=`<line x1="${-W}" x2="${2*W}" y1="${(H/2+k*step).toFixed(1)}" y2="${(H/2+k*step).toFixed(1)}"/><line y1="${-H}" y2="${2*H}" x1="${(W/2+k*step).toFixed(1)}" x2="${(W/2+k*step).toFixed(1)}"/>`}
  const pmn=Math.min(...act.pace),pmx=Math.max(...act.pace),sp=pos.map(PX);let route='';
  for(let i=0;i<sp.length-1;i+=2){const j=Math.min(i+2,sp.length-1),f=1-(act.pace[i]-pmn)/(pmx-pmn||1);route+=`<path d="M${sp[i][0].toFixed(1)},${sp[i][1].toFixed(1)} L${sp[i+1][0].toFixed(1)},${sp[i+1][1].toFixed(1)} L${sp[j][0].toFixed(1)},${sp[j][1].toFixed(1)}" style="stroke:var(--act);stroke-opacity:${(.35+.65*f).toFixed(2)}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`}
  const lab=(p,t,st='')=>{const q=PX(p);if(q[0]<10||q[0]>W-10||q[1]<10||q[1]>H-6)return'';return`<text x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" text-anchor="middle" style="fill:var(--mu);font-size:10px;${st}">${t}</text>`};
  let kms='';for(let k=2;k<half;k+=2){const q=PX(along(k));kms+=`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="7" style="fill:var(--s1);stroke:var(--act)" stroke-width="1.2"/><text x="${q[0].toFixed(1)}" y="${(q[1]+3).toFixed(1)}" text-anchor="middle" style="fill:var(--tx);font-size:8.5px;font-weight:600">${k}</text>`}
  const st=PX(pos[0]),tp=PX(along(half));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="border-radius:10px;background:var(--land)" role="img" aria-label="Ruta en el mapa"><defs><clipPath id="${id}"><path d="M${path} L${-W},${2*H} L${2*W},${2*H} Z"/></clipPath><clipPath id="${id}b"><rect width="${W}" height="${H}" rx="10"/></clipPath></defs><g clip-path="url(#${id}b)"><g clip-path="url(#${id})" style="stroke:var(--street)" stroke-width="1"><g transform="rotate(-14 ${W/2} ${H/2})">${streets}</g></g><path d="M${path} L${-W},${-H} L${2*W},${-H} Z" style="fill:var(--sea)"/><path d="M${path}" fill="none" style="stroke:var(--mu2)" stroke-width="1"/>
  ${lab([cx,maxy-.25],'Estrecho de la Florida','font-style:italic')}${lab([-1.4,-.55],'Centro Habana')}${lab([-4.3,-1.15],'Vedado')}${lab([-6.6,-2.05],'Miramar')}${lab([-2.6,-.33],'Malecón','font-weight:600')}
  ${route}${kms}<circle cx="${tp[0].toFixed(1)}" cy="${tp[1].toFixed(1)}" r="5" style="fill:var(--s1);stroke:var(--tx)" stroke-width="2"/><circle cx="${st[0].toFixed(1)}" cy="${st[1].toFixed(1)}" r="6" style="fill:var(--rec);stroke:var(--s1)" stroke-width="2"/></g></svg>`;
}
let MAPQ=[];
function trackSvg(a){
  const t=a.track,lat0=t[0][0]*Math.PI/180,xs=t.map(p=>p[1]*Math.cos(lat0)),ys=t.map(p=>p[0]);
  const W=340,H=220,mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys),mxy=Math.max(...ys),sc=Math.min((W-30)/((mxx-mnx)||1e-4),(H-30)/((mxy-mny)||1e-4));
  const P=i=>[(W-(mxx-mnx)*sc)/2+(xs[i]-mnx)*sc,(H-(mxy-mny)*sc)/2+(mxy-ys[i])*sc];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="border-radius:10px;background:var(--land)"><path d="M${t.map((_,i)=>P(i).map(v=>v.toFixed(1)).join(',')).join(' L')}" fill="none" style="stroke:var(--act)" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${P(0)[0]}" cy="${P(0)[1]}" r="6" style="fill:var(--rec);stroke:var(--s1)" stroke-width="2"/></svg>`;
}
function mapBlock(a){
  if(a.demoRoute)return demoMap(a);
  if(!a.track||a.track.length<2)return'';
  if(window.L&&navigator.onLine!==false){MAPQ.push(a);return`<div class="lmap" id="lm${MAPQ.length-1}" role="img" aria-label="Ruta en el mapa"></div>`}
  return trackSvg(a);
}
function initMaps(){
  const q=MAPQ;MAPQ=[];
  q.forEach((a,i)=>{const el=document.getElementById('lm'+i);if(!el||!window.L)return;
    const map=L.map(el,{zoomControl:false,scrollWheelZoom:false,attributionControl:true});
    const dark=matchMedia('(prefers-color-scheme: dark)').matches;
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark?'dark_all':'light_all'}/{z}/{x}/{y}{r}.png`,{attribution:'© OpenStreetMap · © CARTO',maxZoom:19}).addTo(map);
    const col=getComputedStyle(document.documentElement).getPropertyValue('--c4').trim()||'#1F7FA6';
    const pv=(a.pace||[]).filter(isNum),pmn=Math.min(...pv),pmx=Math.max(...pv),n=a.track.length;
    for(let k=0;k<n-1;k++){const si=a.pace&&a.pace.length?Math.round(k/(n-1)*(a.pace.length-1)):0,p=a.pace?.[si];const f=isNum(p)&&pmx>pmn?1-(p-pmn)/(pmx-pmn):1;
      L.polyline([a.track[k],a.track[k+1]],{color:col,weight:4,opacity:.35+.65*f,lineCap:'round'}).addTo(map)}
    L.circleMarker(a.track[0],{radius:6,color:'#fff',weight:2,fillColor:getComputedStyle(document.documentElement).getPropertyValue('--c2').trim()||'#178A5E',fillOpacity:1}).addTo(map);
    map.fitBounds(L.latLngBounds(a.track),{padding:[16,16]});
  });
}

/* ===================== Motor de relaciones ===================== */
const NIGHT=new Set(['hrv','rhr','deep','rem','light','sScore','sleepH','rec','bb','spo2','resp','skin','energy']);
const DRIVERS={
  alc:{n:'Alcohol',s:'Alcohol',af:'el alcohol',metric:'alc',bin:true,get:x=>x.alc,per:'Cada consumición más',ps:'por consumición',hi:'con alcohol',lo:'sin alcohol',f:v=>v+(v===1?' consumición':' consumiciones')},
  temp:{n:'Temperatura exterior',s:'Calor',af:'el calor',metric:'tNight',get:(x,night)=>night?x.tNight:x.tMax,per:'Cada grado más',ps:'por grado',hi:'los días más calurosos',lo:'los más frescos',hiN:'las noches más calurosas',loN:'las más frescas',f:v=>f1(v)+' °C'},
  work:{n:'Carga de trabajo',s:'Trabajo',af:'la carga de trabajo',metric:'work',get:x=>x.tasks,per:'Cada tarea más',ps:'por tarea',hi:'los días de más carga',lo:'los de menos carga',f:v=>v+' tareas'},
  caf:{n:'Cafeína',s:'Cafeína',af:'la cafeína',metric:'caf',get:x=>x.caf,scale:100,per:'Cada 100 mg más de cafeína',ps:'por 100 mg',hi:'los días con más cafeína',lo:'los de menos',f:v=>Math.round(v/10)*10+' mg'},
  strain:{n:'Entrenamiento',s:'Entreno',af:'el entrenamiento',metric:'strain',get:x=>x.strain,per:'Cada punto más de esfuerzo',ps:'por punto de esfuerzo',hi:'los días de entreno intenso',lo:'los días suaves',f:v=>f1(v)+' de esfuerzo'},
  sleepH:{n:'Horas de sueño',s:'Sueño',af:'dormir más',metric:'sleepH',nightDriver:true,get:x=>x.sleepH,per:'Cada hora más de sueño',ps:'por hora de sueño',hi:'las noches largas',lo:'las cortas',f:v=>hShort(v*60)}
};
const OUTS=['hrv','rhr','deep','sScore','rec','stress','energy','runPace','steps','bb','sleepH','rem','spo2','resp'];
const lcf=s=>/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s)?s[0].toLowerCase()+s.slice(1):s;
const quant=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.round(q*(s.length-1))]};
const PTS=new Set(['rec','sScore','stress','bb','energy']);
const uOf=k=>{if(k==='runPace')return'/km';const u=M[k].u||'';if(!u||u.length>=6)return'';return u.startsWith('/')?u:' '+u};
const valFmt=(ok,v)=>ok==='sleepH'?hShort(v*60):mfmt(ok,v)+uOf(ok);
function effFmt(ok,v){const a=Math.abs(v);if(ok==='runPace')return`${sgn(v)}${Math.round(a)} s/km`;if(ok==='sleepH')return`${sgn(v)}${Math.round(a*60)} min`;const d=a<10?1:0;return`${sgn(v)}${f1(a,d)}${PTS.has(ok)?' puntos':uOf(ok)}`}
const EFF={};
function pairData(dk,ok){
  const dr=DRIVERS[dk],night=NIGHT.has(ok);
  if(dr.metric===ok||(dr.nightDriver&&night&&ok!=='energy'))return null;
  const xs=[],ys=[];
  for(let i=1;i<LAST;i++){const y=mget(ok,D[i]);if(y==null)continue;const src=dr.nightDriver?D[i]:night?D[i-1]:D[i];const xv=dr.get(src,night);if(!isNum(xv))continue;xs.push(+xv);ys.push(y)}
  return{xs,ys,night};
}
function effect(dk,ok){
  const key=dk+'|'+ok;if(key in EFF)return EFF[key];
  const p=pairData(dk,ok);if(!p||p.xs.length<12)return EFF[key]=null;
  const dr=DRIVERS[dk],ix=p.xs.map((x,i)=>i);let lo,hi,mid=[],t1,t2;
  if(dr.bin){lo=ix.filter(i=>p.xs[i]===0);hi=ix.filter(i=>p.xs[i]>0)}
  else{t1=quant(p.xs,1/3);t2=quant(p.xs,2/3);if(t1===t2){t1=quant(p.xs,.25);t2=quant(p.xs,.75)}lo=ix.filter(i=>p.xs[i]<=t1);hi=ix.filter(i=>p.xs[i]>=t2);mid=ix.filter(i=>p.xs[i]>t1&&p.xs[i]<t2)}
  if(lo.length<4||hi.length<4)return EFF[key]=null;
  const mean=a=>avg(a.map(i=>p.ys[i])),ml=mean(lo),mh=mean(hi),r=pearson(p.xs,p.ys),b=slope2(p.xs,p.ys)*(dr.scale||1),hb=M[ok].hb,diff=mh-ml;
  return EFF[key]={dk,ok,p,ml,mh,mm:mid.length?mean(mid):null,nLo:lo.length,nHi:hi.length,nMid:mid.length,t1,t2,r,b,diff,pct:ml?diff/Math.abs(ml)*100:0,good:hb==null?null:(diff>0)===!!hb,ar:Math.abs(r)};
}
const strengthOf=r=>{r=Math.abs(r);return r>=.5?'Relación fuerte':r>=.3?'Relación moderada':r>=.15?'Relación débil':'Sin relación clara'};
const effCol=ef=>ef.good==null?C.acc:ef.good?C.rec:C.red;
function grp(ef,w){const dr=DRIVERS[ef.dk],n=ef.p.night&&dr.hiN;if(dr.bin)return w==='hi'?dr.hi:dr.lo;const lab=w==='hi'?(n?dr.hiN:dr.hi):(n?dr.loN:dr.lo);return w==='hi'?`${lab} (${dr.f(ef.t2)} o más)`:`${lab} (${dr.f(ef.t1)} o menos)`}
function sentence(ef){
  const dr=DRIVERS[ef.dk],m=M[ef.ok],n=ef.p.night,hi=grp(ef,'hi'),lo=grp(ef,'lo');let pre,post;
  if(dr.bin){pre=n?'Las noches después de beber':'Los días con alcohol';post='sin alcohol'}
  else if(dr.nightDriver||(n&&!dr.hiN)){pre='Tras '+hi;post='tras '+lo}else{pre='En '+hi;post='en '+lo}
  return`${pre}, tu ${lcf(m.n)} es de ${valFmt(ef.ok,ef.mh)}, frente a ${valFmt(ef.ok,ef.ml)} ${post}.`;
}
const perUnit=ef=>`${DRIVERS[ef.dk].per} se asocia a ${effFmt(ef.ok,ef.b)} de ${lcf(M[ef.ok].n)}.`;
function explainToday(ok){
  const night=NIGHT.has(ok),cur=mget(ok,T),base=A(ok);if(cur==null||base==null)return[];
  const dev=cur-base;
  return Object.keys(DRIVERS).map(dk=>{const ef=effect(dk,ok);if(!ef||ef.ar<.15)return null;const dr=DRIVERS[dk],src=dr.nightDriver?T:night?Y:T,xv=dr.get(src,night);if(!isNum(xv))return null;return{dk,ef,xv:+xv,c:slope2(ef.p.xs,ef.p.ys)*(xv-avg(ef.p.xs))}})
    .filter(o=>o&&Math.sign(o.c)===Math.sign(dev)&&Math.abs(o.c)>1e-6).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)).slice(0,3);
}
function relRow(ef,mode){
  const dr=DRIVERS[ef.dk],m=M[ef.ok],col=effCol(ef);
  const val=mode==='cause'?`${effFmt(ef.ok,ef.b)} <span class="muted" style="font-weight:400;font-size:13px">${dr.ps}</span>`:`${sgn(ef.pct)}${Math.abs(Math.round(ef.pct))} %`;
  return`<div class="rel" data-open="p:${ef.dk}:${ef.ok}"><div class="row"><span class="t1">${mode==='cause'?dr.n:m.n}</span><b style="color:${col}">${val}</b></div><div class="rs"><div class="str"><i style="width:${Math.min(100,ef.ar*150)}%;background:${col}"></i></div><span>${strengthOf(ef.r)}</span>${nextI}</div></div>`;
}
function scatterP(ef){const dr=DRIVERS[ef.dk],r=mulberry32(5),xs=ef.p.xs.map(x=>dr.bin?x+(r()-.5)*.35:x);return scatter(xs,ef.p.ys,effCol(ef),dr.f(Math.min(...ef.p.xs)),dr.f(Math.max(...ef.p.xs)),v=>ef.ok==='sleepH'?f1(v)+' h':mfmt(ef.ok,v))}
const MX_ROWS=['alc','temp','work','caf','strain','sleepH'],MX_COLS=[['hrv','HRV'],['rhr','FC reposo'],['deep','Sueño prof.'],['rec','Recup.'],['stress','Estrés'],['energy','Energía'],['runPace','Ritmo']];
function matrix(){
  let h=`<div class="mx"><div></div>${MX_COLS.map(c=>`<div class="mxh">${c[1]}</div>`).join('')}`;
  MX_ROWS.forEach(dk=>{h+=`<div class="mxr">${DRIVERS[dk].s}</div>`;MX_COLS.forEach(([ok])=>{const ef=effect(dk,ok);if(!ef){h+=`<div class="mxc na">—</div>`;return}
    const a=Math.round(Math.min(.92,ef.ar*1.5)*100),col=effCol(ef);
    h+=ef.ar<.15?`<button class="mxc na" data-open="p:${dk}:${ok}">·</button>`:`<button class="mxc" data-open="p:${dk}:${ok}" style="background:color-mix(in srgb,${col} ${a}%,var(--s2));color:${a>48&&ef.good!==false?'#fff':'var(--tx)'}">${sgn(ef.pct)}${Math.abs(Math.round(ef.pct))}%</button>`})});
  return h+'</div>';
}

/* ===================== Componentes ===================== */
const recBand=v=>!isNum(v)?{t:'Sin datos',c:C.mu}:v>=67?{t:'Alta',c:C.rec}:v>=34?{t:'Moderada',c:C.slp}:{t:'Baja',c:C.red};
function delta(k,v){const m=M[k],a=A(k);if(!isNum(v)||a==null)return`<div class="td neu">Sin referencia todavía</div>`;const d=v-a;if(Math.abs(d)<(m.d?.05:.5))return`<div class="td neu">En tu media</div>`;const cls=m.hb==null?'neu':((d>0)===!!m.hb?'up':'down');return`<div class="td ${cls}">${sgn(d)}${m.d?f1(Math.abs(d),m.d):fi(Math.abs(d))}${m.u&&m.u.length<5?' '+m.u:''} frente a tu media</div>`}
function tile(k,label,val,extra){const m=M[k],cur=mget(k,T);let cause='';if(extra==null&&OUTS.includes(k)&&!m.partial&&cur!=null){const hs=D.slice(0,LAST).map(x=>mget(k,x)).filter(isNum);if(hs.length>5&&Math.abs(cur-avg(hs))>.5*sd(hs)){const ex=explainToday(k);if(ex.length)cause=`<div class="cause">Causa probable: ${lcf(DRIVERS[ex[0].dk].n)}</div>`}}return`<div class="tile" data-open="m:${k}"><div class="tl"><span>${label||m.n}</span>${nextI}</div><div class="tv num">${val??mfmt(k,cur)}<small>${m.u&&m.u.length<6?m.u:''}</small></div>${extra??delta(k,cur)}${cause}${spark(D.slice(-14).map(x=>mget(k,x)),C[m.c])}</div>`}
function pbar(label,val,max,color,right,open){return`<div ${open?`data-open="m:${open}"`:''}><div class="pl"><span>${label}</span><b>${right}</b></div><div class="bar"><i data-w="${clamp((+val||0)/max*100,0,100)}" style="background:${color}"></i></div></div>`}
function card(title,right,body,attrs=''){return`<div class="card" ${attrs}>${title?`<div class="ct"><h3>${title}</h3>${right!=null?`<span class="r">${right}</span>`:''}</div>`:''}${body}</div>`}
const todayStr=cap(`${DIAL[TODAY.getDay()]}, ${TODAY.getDate()} de ${MESL[TODAY.getMonth()]}`);
const greet=()=>{const h=new Date().getHours();return(h<12?'Buenos días':h<20?'Buenas tardes':'Buenas noches')+(DS.name?', '+DS.name:'')};
function hdr(sub,title){return`<div class="brand"><div class="bl">${spine(30)}<span class="wm">Self</span></div><div class="hbtns"><button class="iconbtn" data-reg="1" aria-label="Registrar">${ico('plus',19,2)}</button><button class="iconbtn" data-sheet="1" aria-label="Fuentes de datos">${ico('sync',18)}<span class="live" style="${DS.offline?'background:var(--pop)':''}"></span></button><button class="avatar" data-set="1" aria-label="Ajustes">${DS.initials||'Yo'}</button></div></div>${DS.mode==='demo'?'<div class="banner">Modo demostración: datos ficticios</div>':DS.offline?'<div class="banner">Sin conexión: mostrando los últimos datos guardados</div>':''}<div class="ph"><div class="date">${sub}</div><h1>${title}</h1></div>`}
function topbar(title){const prev=stack.length>1?stack[stack.length-2].title:TABN[tab];return`<div class="tb"><button class="back" data-back="1">${ico('chev',20,2.2)}${prev}</button><span class="tbt">${title}</span><span style="width:64px"></span></div>`}
const kv=(l,v)=>`<div class="stat"><b>${v}</b><span>${l}</span></div>`;
const val=(v,f=x=>x,u='')=>isNum(v)?f(v)+u:'—';

/* ===================== Inicio modular ===================== */
const MI={rec:'recover',sScore:'sueno',sleepH:'sueno',deep:'sueno',rem:'sueno',light:'sueno',strain:'flame',hrv:'wave',rhr:'heart',bb:'battery',stress:'stressI',spo2:'drop',skin:'therm',resp:'lungs',steps:'foot',kAct:'flame',trainMin:'cf',acwr:'gauge',runPace:'run',kIn:'nutri',prot:'nutri',carb:'nutri',fat:'nutri',water:'drop',caf:'coffee',alc:'beer',weight:'scale',energy:'smile',habits:'check',tNight:'therm',work:'brief'};
const CATS=[['Recuperación',['rec','hrv','rhr','bb','stress','spo2','skin','resp','energy']],['Sueño',['sScore','sleepH','deep','rem']],['Actividad',['steps','kAct','strain','trainMin','acwr','runPace']],['Nutrición',['kIn','prot','carb','fat','water','caf','alc','weight']],['Hábitos y entorno',['habits','tNight','work']]];
const HOME_DEF=['rec','sScore','hrv','rhr','stress','bb','steps','kIn'];
const validHome=v=>Array.isArray(v)&&v.length&&v.every(k=>M[k]);
let home=(()=>{if(validHome(DS.settings?.home))return DS.settings.home;try{const v=JSON.parse(localStorage.getItem('self.home'));if(validHome(v))return v}catch(e){}return[...HOME_DEF]})();
let syncT;const pushSettings=()=>{clearTimeout(syncT);syncT=setTimeout(()=>DS.saveSettings({home,colors}).catch(()=>{}),1200)};
const saveHome=()=>{try{localStorage.setItem('self.home',JSON.stringify(home))}catch(e){}pushSettings()};
let editing=false;
const runs10=()=>D.filter(x=>x.run&&isNum(x.pace)).slice(-10);
function modBars(k){
  const m=M[k],col=C[m.c],pts=k==='runPace'?runs10().slice(-7).map(x=>({x,v:x.pace})):D.slice(-7).map(x=>({x,v:mget(k,x)})).filter(o=>o.v!=null);
  if(!pts.length)return`<div class="empty" style="height:58px;font-size:11.5px">Sin datos</div>`;
  const vals=pts.map(o=>o.v),n=vals.length,W=132,H=62,ch=48,bw=W/Math.max(n,4);
  const mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||Math.abs(mx)||1;
  const hOf=v=>m.inv?6+(mx+rg*.5-v)/(rg*1.5)*(ch-6):6+(v-(mn-rg*.5))/(rg*1.5)*(ch-6);
  let g='';const off=W-n*bw;
  vals.forEach((v,i)=>{const h=Math.max(3,hOf(v)),x=off+i*bw+bw*.2,w=bw*.6,last=i===n-1;
    g+=`<rect class="br" style="animation-delay:${i*30}ms;fill:${last?'var(--pop)':col};opacity:${last?1:.75}" x="${x.toFixed(1)}" y="${(ch-h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3,w/2).toFixed(1)}"/><text x="${(x+w/2).toFixed(1)}" y="${H-2}" text-anchor="middle">${pts[i].x.i===LAST?'H':['D','L','M','X','J','V','S'][pts[i].x.dow]}</text>`});
  return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Últimos registros de ${m.n}">${g}</svg>`;
}
function modValue(k){if(k==='runPace')return runs10().slice(-1)[0]?.pace??null;return mget(k,T)}
function modStatus(k,cur){
  const m=M[k];
  if(cur==null)return{cls:'',txt:'Sin datos de hoy'};
  if(OUTS.includes(k)&&!m.partial&&k!=='runPace'){const hs=D.slice(0,LAST).map(x=>mget(k,x)).filter(isNum);if(hs.length>5&&Math.abs(cur-avg(hs))>.5*sd(hs)){const ex=explainToday(k);if(ex.length){const good=m.hb==null?null:(ex[0].c>0)===!!m.hb;return{cls:good==null?'':good?'up':'down',txt:`${cap(lcf(DRIVERS[ex[0].dk].n))}: ${effFmt(k,ex[0].c)}`}}}}
  if(k==='rec'){const b=recBand(cur);return{cls:cur>=67?'up':cur>=34?'':'down',txt:'Recuperación '+b.t.toLowerCase()}}
  if(m.partial&&m.goal){const pc=Math.round(cur/m.goal*100);return{cls:'',txt:`${pc} % ${m.hb===0?'del límite':'del objetivo'}`}}
  if(m.partial)return{cls:'',txt:'Hoy hasta ahora'};
  const bv=k==='runPace'?D.filter(x=>x.run&&isNum(x.pace)).map(x=>x.pace):D.slice(-30,-1).map(x=>mget(k,x)).filter(isNum);
  if(!bv.length)return{cls:'',txt:'Primer registro'};
  const d=cur-avg(bv);if(Math.abs(d)<(k==='runPace'?3:m.d?.05:.5))return{cls:'',txt:'En tu media'};
  const good=m.hb==null?null:(d>0)===!!m.hb,dv=k==='runPace'?Math.round(Math.abs(d))+' s':(m.d?f1(Math.abs(d),m.d):fi(Math.abs(d)))+uOf(k);
  return{cls:good==null?'':good?'up':'down',txt:`${sgn(d)}${dv} frente a tu media`};
}
function module(k){
  const m=M[k],col=C[m.c],cur=modValue(k),st=modStatus(k,cur),u=uOf(k).trim();
  return`<article class="mod" data-open="m:${k}"><div style="min-width:0"><div class="mh"><span class="mi" style="color:${col};background:color-mix(in srgb,${col} 14%,transparent)">${ico(MI[k]||'spark',15,2)}</span><span class="mt">${m.n}</span></div>
  <div class="mv num">${mfmt(k,cur)}${u&&cur!=null?`<small>${u}</small>`:''}</div><div class="ms ${st.cls}">${st.txt}</div></div><div class="mc">${modBars(k)}</div></article>`;
}
function editView(){
  const icoC=k=>`<span class="mi" style="color:${C[M[k].c]};background:color-mix(in srgb,${C[M[k].c]} 12%,transparent);width:34px;height:34px">${ico(MI[k]||'spark',18,1.7)}</span>`;
  const hidden=CATS.map(([cn,ks])=>[cn,ks.filter(k=>!home.includes(k))]).filter(c=>c[1].length);
  return`<div class="tb"><span style="width:64px"></span><span class="tbt">Personalizar inicio</span><button class="back" data-hdone="1" style="font-weight:600">Listo</button></div>
  <div class="ph"><h1>Tu inicio</h1><p class="lead" style="margin-top:8px">Arrastra desde las dos rayas para cambiar el orden. Quita lo que no necesites y añade lo que quieras ver.</p></div>
  <h2 class="sec">En tu inicio (${home.length})</h2>
  <div class="elist" id="elist">${home.map((k,i)=>`<div class="erow" data-k="${k}"><span class="handle" aria-label="Arrastrar para reordenar">${ico('grip',20,2)}</span>${icoC(k)}<span class="en">${M[k].n}</span>${i?`<button class="eb" data-hup="${k}" aria-label="Subir">${ico('up',16,2)}</button>`:''}<button class="eb del" data-hdel="${k}" aria-label="Quitar">${ico('minus',16,2.2)}</button></div>`).join('')}</div>
  ${hidden.map(([cn,ks])=>`<h2 class="sec">${cn}</h2><div class="elist">${ks.map(k=>`<div class="erow">${icoC(k)}<span class="en">${M[k].n}<span class="es">${M[k].src}</span></span><button class="eb add2" data-hadd="${k}" aria-label="Añadir">${ico('plus',16,2.2)}</button></div>`).join('')}</div>`).join('')}
  <button class="more" style="margin-top:24px" data-hreset="1">Restablecer el inicio predeterminado</button>`;
}
function pHoy(){
  if(editing)return editView();
  const rb=recBand(T.rec),tip=!isNum(T.rec)?'Cuando haya datos de Garmin de esta noche verás aquí tu recuperación.':T.rec>=67?'Buen día para entrenar con intensidad.':T.rec>=34?'Hoy conviene una sesión suave.':'Hoy toca descanso activo.';
  return`${hdr(todayStr,greet())}
  <p class="lead">${isNum(T.rec)?`Recuperación ${rb.t.toLowerCase()}. `:''}${tip}</p>
  <div class="row" style="margin:22px 2px 12px"><h2 class="sec" style="margin:0">Tu resumen</h2><button class="ebtn" data-hedit="1">${ico('edit',15,1.8)} Personalizar</button></div>
  ${home.map(module).join('')}
  <button class="add" data-hedit="1">${ico('plus',16)} Añadir, quitar o reordenar</button>`;
}

/* ===================== Sueño ===================== */
function pSueno(){
  const t=T,need=465,yd=addDays(TODAY,-1);
  const title=`Noche del ${yd.getDate()}${yd.getMonth()!==TODAY.getMonth()?' de '+MESL[yd.getMonth()]:''} al ${TODAY.getDate()} de ${MESL[TODAY.getMonth()]}`;
  if(!isNum(t.sleep))return`${hdr(title,'Sueño')}${card('',null,'<p class="ins-s">Todavía no hay datos de sueño de esta noche. Sincroniza tu CIRQA con Garmin Connect; Self los recogerá en la próxima sincronización.</p>')}
    ${card('Duración en los últimos 30 días',null,barChart(L30.map(x=>x.sleepH),{dates:L30.map(x=>x.d),fmt:v=>f1(v)+' h',goal:need/60,goalLabel:'7,8 h',color:C.slp}),'data-open="m:sleepH"')}`;
  const tot=(t.deep||0)+(t.rem||0)+(t.light||0)+(t.awake||0)||1;
  const st=[['deep','Profundo',t.deep,C.deep],['light','Ligero',t.light,C.light],['rem','REM',t.rem,C.remc],['','Despierto',t.awake,C.awake]];
  const wd=L30.filter(x=>!(x.dow===6||x.dow===0)&&isNum(x.bed)),we=L30.filter(x=>(x.dow===6||x.dow===0)&&isNum(x.bed));
  const beds=L30.map(x=>x.bed).filter(isNum),sdv=beds.length>2?sd(beds):null,Asl=A('sleep');
  const fx=(dk,ok,icon,colv,t1)=>{const ef=effect(dk,ok);if(!ef)return'';const dr=DRIVERS[dk],xv=dr.get(Y,true);if(!isNum(xv))return'';const c=slope2(ef.p.xs,ef.p.ys)*(xv-avg(ef.p.xs));return`<div class="it" data-open="p:${dk}:${ok}"><div class="ico" style="color:${colv}">${ico(icon,18)}</div><div class="mid"><div class="t1">${t1}</div><div class="t2">Efecto estimado: ${effFmt(ok,c)} de ${lcf(M[ok].n)}</div></div>${nextI}</div>`};
  const factors=[fx('alc','hrv','beer',C.alc,`${val(Y.alc)} consumiciones de alcohol`),fx('temp','deep','therm',C.nut,`${f1(Y.tNight)} °C de temperatura nocturna`),fx('strain','rec','cf',C.cf,Y.cf&&Y.wod?`Entreno: ${Y.wod}`:`Esfuerzo de ${f1(Y.strain)}`),fx('caf','deep','coffee',C.caf,`${val(Y.caf)} mg de cafeína`),fx('work','hrv','brief',C.str,`${val(Y.tasks)} tareas en el trabajo`)].join('');
  return `${hdr(title,'Sueño')}
  ${card('',null,`<div class="row" style="align-items:flex-end" data-open="m:sScore"><div><div class="muted small">Puntuación de sueño</div><div class="big num" style="margin-top:4px">${val(t.sScore,fi)}<small>de 100</small></div></div><div style="text-align:right"><div class="muted small">Dormido</div><div class="num" style="font-size:30px;margin-top:4px">${hShort(t.sleep)}</div></div></div>
   <div class="meter" style="height:6px;margin-top:14px"><i data-w="${t.sleep/need*100}" style="background:var(--slp)"></i></div>
   <div class="row small muted" style="margin-top:8px"><span>${Math.round(t.sleep/need*100)} % de tu necesidad (${hShort(need)})</span><span>${clock(t.bed)} a ${clock(t.wake)}</span></div>`)}
  ${card('Fases del sueño',`<span class="src">Garmin</span>`,`${HYP.length>1?hypnoChart():''}
   <div class="grid2" style="margin:12px 0 0">${st.map(s=>`<div class="stat" ${s[0]?`data-open="m:${s[0]}"`:''}><b style="color:${s[3]}">${hShort(s[2])}</b><span>${s[1]}, ${isNum(s[2])?Math.round(s[2]/tot*100):'—'} %</span></div>`).join('')}</div>`)}
  <h2 class="sec">Durante la noche</h2>
  <div class="grid2">${tile('hrv','HRV nocturna')}${tile('rhr','FC en reposo')}${tile('resp','Respiración')}${tile('spo2','SpO₂ media')}</div>
  ${factors?card('Qué ha influido en tu noche','Según tus datos',`<div class="list">${factors}</div><p class="small muted" style="margin-top:12px;line-height:1.5">Cada efecto compara el valor de ayer con tu media y aplica la relación que Self ha detectado en tus datos.</p>`):''}
  ${card('Duración en los últimos 30 días',Asl!=null?`Media ${hShort(Asl)}`:null,barChart(L30.map(x=>x.sleepH),{dates:L30.map(x=>x.d),fmt:v=>f1(v)+' h',goal:need/60,goalLabel:'7,8 h',colorFn:(v,i)=>L30[i].sScore>=85?C.remc:L30[i].sScore>=70?C.slp:C.deep})+`<div class="legend"><span><i class="sw" style="background:var(--remc)"></i>Puntuación 85 o más</span><span><i class="sw" style="background:var(--slp)"></i>70 a 84</span><span><i class="sw" style="background:var(--deep)"></i>Menos de 70</span></div>`,'data-open="m:sleepH"')}
  ${card('Regularidad de horarios',sdv!=null?`Variación ±${Math.round(sdv)} min`:null,consistencyChart()+(wd.length?`<div class="row small" style="margin-top:12px"><span class="muted">Días laborables</span><span>${clock(avg(wd.map(x=>x.bed)))} a ${clock(avg(wd.map(x=>x.wake)))}</span></div>`:'')+(we.length?`<div class="row small" style="margin-top:6px"><span class="muted">Fin de semana</span><span>${clock(avg(we.map(x=>x.bed)))} a ${clock(avg(we.map(x=>x.wake)))}</span></div>`:''))}`;
}

/* ===================== Entreno ===================== */
let actsAll=false;
const actIco=a=>a.kind==='cf'?['cf','var(--cf)']:a.kind==='run'?['run','var(--act)']:['flame','var(--str)'];
function actRow(a){
  const [ic,col]=actIco(a),d=D[a.i]?.d;
  const sub=a.kind==='run'?`${mmss(a.pace)}/km, FC media ${val(a.hr,fi)}`:a.result?`Resultado: ${esc(a.result)}`:`FC media ${val(a.hr,fi)}`;
  return`<div class="it" data-open="a:${a.id}"><div class="ico" style="color:${col}">${ico(ic,20)}</div><div class="mid"><div class="t1">${esc(a.name)}${a.kind==='run'&&a.km?`, ${f1(a.km)} km`:''}</div><div class="t2">${d?cap(dDay(d)):''}, ${sub}</div></div><div class="end">${val(a.durMin,fi)} min<span>${a.source||'Garmin'}</span></div>${nextI}</div>`;
}
function pEntreno(){
  const t=T,acwr=t.acwr,pos=isNum(acwr)?clamp((acwr-.4)/(1.8-.4)*100,2,98):null;
  const acute=D.slice(-7).reduce((s,x)=>s+(x.trainMin||0),0),chronic=D.slice(-28).reduce((s,x)=>s+(x.trainMin||0),0)/4;
  const runs=L30.filter(x=>x.run&&isNum(x.pace)),km=runs.reduce((s,x)=>s+x.run,0),prevKm=D.slice(-60,-30).filter(x=>x.run).reduce((s,x)=>s+x.run,0);
  const acts=DS.acts||[],a30=acts.filter(a=>a.i>=N-30),shown=actsAll?acts:acts.slice(0,8);
  const status=!isNum(acwr)?['Sin datos suficientes',C.mu]:acwr>=.8&&acwr<=1.3?['Productivo',C.rec]:acwr<.8?['Recuperación',C.hrv]:['Sobrecarga',C.red];
  const prevRuns=D.slice(-60,-30).filter(x=>x.run&&isNum(x.pace));
  return `${hdr('Últimos 30 días','Entreno')}
  ${card('Estado de entrenamiento',`<span class="flag" style="color:${status[1]}">${status[0]}</span>`,`
   <div class="row" style="margin-bottom:14px;align-items:flex-end" data-open="m:acwr"><div><div class="big num">${val(acwr,v=>f1(v,2))}</div><div class="small muted" style="margin-top:6px">Ratio de carga aguda y crónica</div></div><div class="small muted" style="text-align:right;line-height:1.7">Últimos 7 días: <b style="color:var(--tx)">${f1(acute/60)} h</b><br>Media de 28 días: <b style="color:var(--tx)">${f1(chronic/60)} h por semana</b></div></div>
   <div style="position:relative"><div class="gauge"><i style="width:28.5%;background:var(--s3)"></i><i style="width:35.7%;background:var(--rec)"></i><i style="width:14.3%;background:color-mix(in srgb,var(--pop) 55%,var(--s3))"></i><i style="flex:1;background:var(--pop)"></i></div>${pos!=null?`<span class="gmark" style="left:${pos}%"></span>`:''}</div>
   <div class="gl"><span>Baja</span><span>Óptima (0,8 a 1,3)</span><span>Alta</span><span>Riesgo</span></div>`)}
  <div class="grid2">
    <div class="tile" data-open="m:trainMin"><div class="tl"><span>Sesiones</span>${nextI}</div><div class="tv num">${a30.length}</div><div class="td neu">${a30.filter(a=>a.kind==='cf').length} de fuerza y ${a30.filter(a=>a.kind==='run').length} carreras</div></div>
    <div class="tile" data-open="m:runPace"><div class="tl"><span>Distancia</span>${nextI}</div><div class="tv num">${f1(km)}<small>km</small></div><div class="td ${km>=prevKm?'up':'down'}">${prevKm?`${sgn(km-prevKm)}${f1(Math.abs((km-prevKm)/prevKm*100),0)} % frente al mes anterior`:'En los últimos 30 días'}</div></div>
  </div>
  ${card('Volumen semanal',null,stackedWeeks()+`<div class="legend"><span><i class="sw" style="background:var(--act)"></i>Carrera</span><span><i class="sw" style="background:var(--cf)"></i>Fuerza y CrossFit</span></div>`,'data-open="m:trainMin"')}
  ${runs.length>1?card('Ritmo medio en carrera',`<span class="src">Garmin</span>`,lineChart(runs.map(x=>x.pace),{color:C.act,dates:runs.map(x=>x.d),fmt:v=>mmss(v),inv:true,avg7:false,h:150,dots:true})+(prevRuns.length?`<p class="small muted" style="margin-top:10px">Tu ritmo medio ha ${avg(prevRuns.map(x=>x.pace))>=avg(runs.map(x=>x.pace))?'mejorado':'empeorado'} ${Math.abs(Math.round(avg(prevRuns.map(x=>x.pace))-avg(runs.map(x=>x.pace))))} s/km frente al mes anterior.</p>`:''),'data-open="m:runPace"'):''}
  ${card('Actividades',`${acts.length} en 90 días`,acts.length?`<div class="list">${shown.map(actRow).join('')}</div>${actsAll||acts.length<=8?'':`<button class="more" data-more="1">Ver las ${acts.length} actividades</button>`}`:'<p class="ins-s">Todavía no hay actividades. Aparecerán tras la próxima sincronización con Garmin.</p>')}
  ${card('Marcas personales',`<span class="src">Self</span>`,(DS.prs.length?`<div class="list">${DS.prs.map((p,k)=>`<div class="it" data-open="pr:${k}"><div class="ico" style="color:${p.isNew?'var(--pop)':'var(--mu)'}">${ico('trophy',18)}</div><div class="mid"><div class="t1">${esc(p.n)}</div><div class="t2">${p.date}</div></div><div class="end num" style="font-size:20px">${prFmt(p,p.best)}${p.isNew?'<span style="color:var(--red);font-stretch:100%">Nueva marca</span>':''}</div>${nextI}</div>`).join('')}</div>`:'<p class="ins-s">Aún no has registrado marcas personales.</p>')+`<button class="add" data-form="pr">${ico('plus',16)} Registrar marca personal</button>`)}
  ${card('Pasos en los últimos 30 días',A('steps')!=null?`Media ${fi(A('steps'))}`:null,barChart(B.map(x=>x.steps),{dates:B.map(x=>x.d),goal:10000,goalLabel:'10.000',fmt:v=>Math.round(v/1000)+' mil',colorFn:v=>v>=10000?C.act:'color-mix(in srgb,var(--act) 40%,var(--s3))'}),'data-open="m:steps"')}`;
}
const prFmt=(p,v)=>p.u==='kg'?f1(v,v%1?1:0)+' kg':mmss(v);

/* ===================== Nutrición ===================== */
function pNutri(){
  const t=T,goal=2600,bmr=1790,bd=B.filter(x=>isNum(x.kIn)&&isNum(x.kAct)),bal=bd.map(x=>x.kIn-(bmr+x.kAct)),eA=effect('alc','hrv'),eC=effect('caf','deep');
  const wts=L30.map(x=>x.weight).filter(isNum);
  return `${hdr(todayStr,'Nutrición')}
  ${card('',null,`<div class="row" data-open="m:kIn" style="align-items:flex-end"><div><div class="small muted">Consumidas hoy</div><div class="big num" style="margin-top:4px">${fi(t.kIn||0)}<small>kcal</small></div></div><div style="text-align:right" class="small muted">Objetivo ${fi(goal)}<br>Quedan <b style="color:var(--tx)">${fi(goal-(t.kIn||0))}</b></div></div>
   <div class="meter" style="height:6px;margin-top:14px"><i data-w="${(t.kIn||0)/goal*100}" style="background:var(--nut)"></i></div>
   <div class="stack" style="margin-top:20px">
     ${pbar('Proteína',t.prot,160,C.rec,`${fi(t.prot||0)} <span class="muted">de 160 g</span>`,'prot')}
     ${pbar('Carbohidratos',t.carb,300,C.nut,`${fi(t.carb||0)} <span class="muted">de 300 g</span>`,'carb')}
     ${pbar('Grasas',t.fat,80,C.act,`${fi(t.fat||0)} <span class="muted">de 80 g</span>`,'fat')}
   </div>`)}
  ${card('Comidas de hoy',`<span class="src">Self</span>`,`${MEALS.length?`<div class="list">${MEALS.map(m=>`<div class="it"><div class="ico" style="color:var(--nut)">${ico('nutri',18)}</div><div class="mid"><div class="t1">${esc(m.n)}, ${m.t}</div><div class="t2">${esc(m.d)}</div></div><div class="end">${val(m.k,fi,' kcal')}<span>${val(m.p,fi,' g de proteína')}</span></div></div>`).join('')}</div>`:'<p class="ins-s">Todavía no has registrado nada hoy.</p>'}
   <button class="add" data-form="meal">${ico('plus',16)} Añadir comida o bebida</button>`)}
  <div class="grid2">${tile('water','Agua',`${fi(t.water||0)} de 8`,'<div class="td neu">Vasos de 250 ml</div>')}${tile('caf','Cafeína',fi(t.caf||0),'<div class="td neu">Límite de 400 mg</div>')}</div>
  ${card('Balance energético en 30 días',bal.length?`Media ${fi(avg(bal))} kcal`:null,(bal.length>2?barChart(bal,{dates:bd.map(x=>x.d),neg:true,fmt:v=>fi(v),colorFn:v=>v<0?C.hrv:C.nut})+`<div class="legend"><span><i class="sw" style="background:var(--hrv)"></i>Déficit</span><span><i class="sw" style="background:var(--nut)"></i>Superávit</span></div>`:EMPTY(100,'Registra tus comidas para ver tu balance'))+`<p class="small muted" style="margin-top:10px;line-height:1.5">Consumo menos gasto estimado (metabolismo basal más calorías activas de Garmin).${wts.length>1?` Tu peso ha pasado de ${f1(wts[0])} a ${f1(wts[wts.length-1])} kg.`:''}</p>`,'data-open="m:weight"')}
  ${card('Alcohol en 30 días',`${fi(B.reduce((s,x)=>s+(x.alc||0),0))} consumiciones`,barChart(B.map(x=>x.alc),{dates:B.map(x=>x.d),color:C.alc,fmt:v=>f1(v,0),hi:4.5})+(eA?`<div class="divider"></div><p class="ins-s">${sentence(eA)}</p><button class="more" data-open="p:alc:hrv">Ver cómo te afecta el alcohol</button>`:''),'data-open="m:alc"')}
  ${card('Cafeína en 30 días',A('caf')!=null?`Media ${Math.round(A('caf'))} mg`:null,barChart(B.map(x=>x.caf),{dates:B.map(x=>x.d),color:C.caf,goal:400,goalLabel:'400',fmt:v=>Math.round(v)})+(eC?`<div class="divider"></div><p class="ins-s">${sentence(eC)}</p><button class="more" data-open="p:caf:deep">Ver cómo te afecta la cafeína</button>`:''),'data-open="m:caf"')}`;
}

/* ===================== Tendencias ===================== */
const TMET=['hrv','rec','rhr','sleepH','steps','stress','weight'];
let curMet='hrv';
const labStatus=l=>{const v=l.vals[l.vals.length-1].v;if((isNum(l.lo)&&v<l.lo)||(isNum(l.hi)&&v>l.hi))return['Fuera de rango',C.red];if(isNum(l.lo)&&isNum(l.hi)&&v-l.lo<(l.hi-l.lo)*.05)return['En el límite',C.red];return['En rango',C.rec]};
const refTxt=l=>isNum(l.lo)&&isNum(l.hi)?`${l.lo} a ${l.hi}`:isNum(l.hi)?`menos de ${l.hi}`:isNum(l.lo)?`más de ${l.lo}`:'sin referencia';
function pTend(){
  const k=curMet,m=M[k],src=m.partial?B:L30,v=src.map(x=>mget(k,x)),fm=x=>mfmt(k,x),vv=v.filter(isNum);
  const l7=avg(vv.slice(-7)),p7=avg(vv.slice(-14,-7)),tr=p7?(l7-p7)/p7*100:0,good=m.hb==null?null:(tr>0)===!!m.hb;
  const best=Object.keys(DRIVERS).map(dk=>OUTS.map(ok=>effect(dk,ok)).filter(Boolean).sort((a,b)=>b.ar-a.ar)[0]).filter(x=>x&&x.ar>=.25).sort((a,b)=>b.ar-a.ar);
  const wts=L30.map(x=>x.weight).filter(isNum),Ar=A('rec'),As=A('sleep');
  return `${hdr('Últimos 90 días','Tendencias')}
  ${card('Resumen del mes',null,`<div class="s4">
    <div class="stat" data-open="m:rec"><b style="color:var(--rec)">${Ar!=null?Math.round(Ar)+' %':'—'}</b><span>Recuperación</span></div>
    <div class="stat" data-open="m:sleepH"><b style="color:var(--slp)">${hShort(As)}</b><span>Sueño</span></div>
    <div class="stat" data-open="m:trainMin"><b style="color:var(--cf)">${(DS.acts||[]).filter(a=>a.i>=N-30).length}</b><span>Sesiones</span></div>
    <div class="stat" data-open="m:weight"><b style="color:var(--nut)">${wts.length>1?sgn(wts[wts.length-1]-wts[0])+f1(Math.abs(wts[wts.length-1]-wts[0])):'—'}</b><span>kg de peso</span></div>
  </div>`)}
  ${card('Cómo se relacionan tus datos',null,matrix()+`<div class="legend"><span><i class="sw" style="background:var(--rec)"></i>Efecto favorable</span><span><i class="sw" style="background:var(--red)"></i>Desfavorable</span><span><i class="sw" style="background:var(--s2);border:1px solid var(--line)"></i>Sin relación o sin datos</span></div><p class="small muted" style="margin-top:8px;line-height:1.5">Cada casilla indica cuánto cambia el resultado de la columna entre los días con más y con menos de cada factor. Hacen falta al menos 12 días con ambos datos. Toca una casilla para ver el detalle.</p>`)}
  ${best.length?`<h2 class="sec">Tus relaciones más claras</h2>${best.map(ef=>{const col=effCol(ef);return card('',null,`<div class="row" style="align-items:flex-start"><div style="font-size:15px;font-weight:600">${DRIVERS[ef.dk].n} y ${lcf(M[ef.ok].n)}</div><span class="flag" style="color:${col}">${sgn(ef.pct)}${Math.abs(Math.round(ef.pct))} %</span></div><p class="small" style="margin-top:6px;line-height:1.5">${sentence(ef)}</p><div class="rs"><div class="str"><i style="width:${Math.min(100,ef.ar*150)}%;background:${col}"></i></div><span>${strengthOf(ef.r)}</span>${nextI}</div>`,`data-open="p:${ef.dk}:${ef.ok}"`)}).join('')}`:''}
  <h2 class="sec">Evolución</h2>
  <div class="chips">${TMET.map(x=>`<button class="chip ${x===k?'on':''}" data-met="${x}">${M[x].n.replace(' nocturna','').replace('Duración del sueño','Sueño')}</button>`).join('')}</div>
  ${card(m.n+' en 30 días',vv.length>7?`<span class="flag" style="color:${good==null?'var(--mu)':good?'var(--rec)':'var(--red)'}">${sgn(tr)}${f1(Math.abs(tr))} % semanal</span>`:null,lineChart(v,{color:C[m.c],dates:src.map(x=>x.d),fmt:fm,h:170})+`<button class="more" data-open="m:${k}">Ver qué influye en ${lcf(m.n)}</button>`)}
  <h2 class="sec">Analíticas</h2>
  ${card('Analítica de sangre',DS.labs.length?DS.labs[0].vals[DS.labs[0].vals.length-1].d:null,(DS.labs.length?`<div class="list">${DS.labs.map((l,k)=>{const n=l.vals.length,last=l.vals[n-1],prev=l.vals[n-2],d=prev?last.v-prev.v:null,s=labStatus(l);return`<div class="it" data-open="lab:${k}"><div class="mid"><div class="t1">${esc(l.n)}</div><div class="t2">Referencia ${refTxt(l)} ${esc(l.u)}</div></div><div class="end"><span class="num" style="font-size:20px;color:var(--tx);display:inline">${f1(last.v,last.v%1?1:0)}</span><span style="display:block">${d==null?'Primer registro':d===0?'Sin cambios':`${d>0?'Sube':'Baja'} ${f1(Math.abs(d),Math.abs(d)%1?1:0)}`}</span></div><span class="flag" style="color:${s[1]};width:84px;justify-content:flex-end">${s[0]}</span></div>`}).join('')}</div>`:'<p class="ins-s">Añade los resultados de tu última analítica para seguir su evolución.</p>')+`<button class="add" data-form="lab">${ico('flask',16)} Añadir resultado de analítica</button>`)}`;
}

/* ===================== Detalle de una métrica ===================== */
function pMetric(e){
  const k=e.key,m=M[k],range=e.range||30,col=C[m.c];
  const sl=D.slice(-range).filter(x=>!(m.partial&&x.i===LAST)).map(x=>({x,v:mget(k,x)})).filter(o=>o.v!=null);
  const v=sl.map(o=>o.v),dates=sl.map(o=>o.x.d);
  const hist=D.slice(0,LAST).map(x=>mget(k,x)).filter(isNum),mean=hist.length?avg(hist):null,s=hist.length>2?sd(hist):0;
  const curRaw=mget(k,T),cur=curRaw??(hist.length?hist[hist.length-1]:null);
  const fm=x=>mfmt(k,x),u=uOf(k);
  const dk=Object.keys(DRIVERS).find(d=>DRIVERS[d].metric===k);
  const causes=Object.keys(DRIVERS).map(d=>effect(d,k)).filter(x=>x&&x.ar>=.15).sort((a,b)=>b.ar-a.ar);
  const impacts=dk?OUTS.map(o=>effect(dk,o)).filter(x=>x&&x.ar>=.15).sort((a,b)=>b.ar-a.ar):[];
  const top=[...impacts,...causes].sort((a,b)=>b.ar-a.ar)[0];
  const today=!m.partial&&curRaw!=null&&OUTS.includes(k)?explainToday(k):[];
  const pos=cur==null||mean==null?'':cur<mean-s?'Por debajo de tu rango habitual':cur>mean+s?'Por encima de tu rango habitual':'Dentro de tu rango habitual';
  const tr=v.length>2?slope(v)*7:0,flat=Math.abs(tr)<s*.08||v.length<3;
  const trTxt=v.length<3?'Aún hay pocos registros en este periodo.':flat?'Estable en este periodo.':`${m.hb==null?(tr>0?'Sube':'Baja'):((tr>0)===!!m.hb?'Mejora':'Empeora')} ${k==='runPace'?Math.round(Math.abs(tr))+' s/km':k==='sleepH'?Math.round(Math.abs(tr)*60)+' min':f1(Math.abs(tr),m.d||1)+u} por semana.`;
  const chart=m.chart==='bar'?barChart(v,{dates,color:col,goal:m.goal,fmt:fm,h:160}):lineChart(v,{color:col,dates,fmt:fm,h:170,inv:m.inv,band:mean!=null?[mean-s,mean+s]:null,avg7:range>7});
  const wd=[1,2,3,4,5,6,0].map(dw=>{const a=D.slice(0,LAST).filter(x=>x.dow===dw).map(x=>mget(k,x)).filter(isNum);return a.length>=3?avg(a):null});
  const wdv=wd.filter(isNum),WDN=['lunes','martes','miércoles','jueves','viernes','sábados','domingos'];
  let wdCard='';
  if(wdv.length>4&&s&&Math.max(...wdv)-Math.min(...wdv)>s*.6){
    const hiI=wd.indexOf(Math.max(...wdv)),loI=wd.indexOf(Math.min(...wdv)),best=m.hb===0?loI:hiI,worst=m.hb===0?hiI:loI;
    const txt=m.hb==null?`Tus valores más altos se dan los ${WDN[hiI]} (${fm(wd[hiI])}${u}) y los más bajos, los ${WDN[loI]} (${fm(wd[loI])}${u}).`:`Los ${WDN[best]} son tus mejores días (${fm(wd[best])}${u}) y los ${WDN[worst]}, los peores (${fm(wd[worst])}${u}).`;
    wdCard=card('Tu semana','Media de 90 días',`<p class="ins-s" style="margin-bottom:10px">${txt}</p>`+barChart(wd.map(x=>x??0),{color:col,labels:['L','M','X','J','V','S','D'],fmt:fm,h:110,hi:Math.max(...wdv)*1.12,colorFn:(x,i)=>m.hb==null?col:i===worst?C.red:i===best?C.rec:'color-mix(in srgb,'+col+' 45%,var(--s3))'}));
  }
  const rows=[...sl].reverse();
  return `${topbar(m.n)}
  <div class="ph"><h1>${m.n}</h1><div class="date" style="margin-top:6px;line-height:1.5">${m.desc}</div></div>
  ${card('',null,`<div class="row" style="align-items:flex-end"><div><span class="muted small">${m.partial?'Hoy hasta ahora':'Último valor'}</span><div class="big num" style="margin-top:4px;color:${col}">${fm(cur)}<small>${cur!=null?u.trim():''}</small></div></div><div class="small" style="text-align:right;max-width:52%;line-height:1.5">${m.partial||!pos?'':`<b>${pos}</b><br>`}${mean!=null?`<span class="muted">Habitual: ${fm(mean-s)} a ${fm(mean+s)}${u}</span>`:''}</div></div>
   ${today.length?`<div class="divider"></div><div class="small" style="font-weight:600;margin-bottom:6px">Por qué hoy</div>${today.map(o=>`<div class="row small" data-open="p:${o.dk}:${k}" style="padding:5px 0"><span>${DRIVERS[o.dk].n}: ${DRIVERS[o.dk].f(o.xv)}</span><b style="color:${m.hb==null?'var(--tx)':(o.c>0)===!!m.hb?'var(--rec)':'var(--red)'}">${effFmt(k,o.c)}</b></div>`).join('')}`:''}`)}
  ${card('Lo más relevante',null,top?`<p class="ins">${sentence(top)}</p><p class="small muted" style="margin-top:8px;line-height:1.5">${perUnit(top)} ${strengthOf(top.r)}.</p><button class="more" data-open="p:${top.dk}:${top.ok}">Ver la relación completa</button>`:`<p class="ins-s">Todavía no hay una relación clara entre este dato y el resto. Con más días de registro, Self detectará los patrones.</p>`)}
  ${impacts.length?card(`Cómo te afecta ${DRIVERS[dk].af}`,'Más frente a menos',impacts.slice(0,6).map(ef=>relRow(ef,'impact')).join('')):''}
  ${causes.length?card(`Qué influye en tu ${lcf(m.n)}`,'Efecto por unidad',causes.slice(0,5).map(ef=>relRow(ef,'cause')).join('')):''}
  <div class="seg">${[7,30,90].map(r=>`<button class="${r===range?'on':''}" data-range="${r}">${r} días</button>`).join('')}</div>
  ${card('Evolución',`${v.length} días`,`<p class="small" style="margin:-4px 0 10px;color:${flat||m.hb==null?'var(--mu)':(tr>0)===!!m.hb?'var(--rec)':'var(--red)'}">${trTxt}</p>`+chart+(m.chart==='bar'||mean==null?'':`<div class="legend"><span><i class="sw" style="background:${col};opacity:.25"></i>Tu rango habitual</span></div>`))}
  ${wdCard}
  ${rows.length?(e.all?card('Registros diarios',m.freq,`<table class="tbl"><thead><tr><th>Fecha</th><th>Valor</th><th>Frente a tu media</th></tr></thead><tbody>${rows.map(o=>{const d=mean!=null?o.v-mean:null;return`<tr><td>${cap(dDay(o.x.d))}</td><td><b>${fm(o.v)}</b></td><td class="${d==null||m.hb==null?'neu':(d>0)===!!m.hb?'up':'down'}">${d==null?'—':sgn(d)+(k==='runPace'?mmss(Math.abs(d)):m.d?f1(Math.abs(d),m.d):fi(Math.abs(d)))}</td></tr>`}).join('')}</tbody></table>`):`<button class="more" data-all="1">Ver los registros diarios</button>`):''}
  <p class="src" style="padding:12px 4px 0">Fuente: ${m.src}. ${DS.lastSync}.</p>`;
}

/* ===================== Detalle de una relación ===================== */
function pPair(e){
  const ef=effect(e.dk,e.ok),dr=DRIVERS[e.dk],m=M[e.ok];
  if(!ef)return`${topbar('Relación')}<div class="ph"><h1>${dr.n} y ${lcf(m.n)}</h1></div>${card('',null,'<p class="ins-s">Todavía no hay datos suficientes para analizar esta relación. Hacen falta al menos 12 días con ambos datos y 4 días en cada extremo.</p>')}`;
  const col=effCol(ef),G=[[cap(grp(ef,'lo')),ef.ml,ef.nLo]];
  if(ef.mm!=null)G.push(['Valores intermedios',ef.mm,ef.nMid]);G.push([cap(grp(ef,'hi')),ef.mh,ef.nHi]);
  const gmax=Math.max(...G.map(g=>g[1]))||1;
  const timing=dr.nightDriver?`Se compara la duración de cada noche con tu ${lcf(m.n)} del día siguiente.`:ef.p.night?(e.dk==='temp'?`Se compara la temperatura de cada noche con tu ${lcf(m.n)} de esa misma noche.`:`Se compara lo registrado cada día con tu ${lcf(m.n)} de la noche siguiente.`):`Se compara cada día con tu ${lcf(m.n)} de ese mismo día.`;
  const method=dr.bin?'Se comparan los días con y sin alcohol.':`Los días se ordenan según ${lcf(dr.n)} y se comparan el tercio más alto y el más bajo.`;
  return `${topbar('Relación')}
  <div class="ph"><div class="date">${ef.p.xs.length} días analizados</div><h1>${dr.n} y ${lcf(m.n)}</h1></div>
  ${card('',null,`<div class="big num" style="color:${col}">${sgn(ef.pct)}${Math.abs(Math.round(ef.pct))}<small>%</small></div><p class="ins" style="margin-top:12px">${sentence(ef)}</p><p class="small muted" style="margin-top:8px;line-height:1.5">${perUnit(ef)}</p><div class="rs" style="margin-top:10px"><div class="str"><i style="width:${Math.min(100,ef.ar*150)}%;background:${col}"></i></div><span>${strengthOf(ef.r)} (r = ${ef.r<0?'−':''}${f1(Math.abs(ef.r),2)})</span></div>`)}
  ${card('Comparación',null,G.map(g=>`<div class="cmp" style="grid-template-columns:1fr 80px 70px;margin-top:12px"><span style="line-height:1.3">${g[0]}<br><span class="muted" style="font-size:11.5px">${g[2]} días</span></span><div class="bar"><i data-w="${g[1]/gmax*100}" style="background:${col}"></i></div><b>${valFmt(ef.ok,g[1])}</b></div>`).join(''))}
  ${card('Cada día analizado',null,scatterP(ef)+`<p class="small muted" style="margin-top:8px">Eje horizontal: ${lcf(dr.n)}. Eje vertical: ${lcf(m.n)}.</p>`)}
  ${card('Cómo se calcula',null,`<p class="small muted" style="line-height:1.55">${timing} ${method} Una correlación indica que dos datos se mueven juntos, no necesariamente que uno cause el otro.</p>`)}
  <div class="grid2"><button class="more" style="margin:0" data-open="m:${dr.metric}">Ver ${lcf(dr.n)}</button><button class="more" style="margin:0" data-open="m:${ef.ok}">Ver ${lcf(m.n)}</button></div>`;
}

/* ===================== Detalle de una actividad ===================== */
const ZCOL=[C.mu2,C.hrv,C.rec,C.nut,C.red],ZNAME=['Z1 Calentamiento','Z2 Aeróbica suave','Z3 Aeróbica','Z4 Umbral','Z5 Máxima'];
function zonesCard(zt){if(!Array.isArray(zt))return'';const tot=zt.reduce((a,b)=>a+(+b||0),0);if(!tot)return'';return card('Zonas de frecuencia cardíaca',null,`<div class="stack">${zt.map((s,z)=>`<div><div class="pl"><span>${ZNAME[z]}</span><b>${mmss(s)} <span class="muted">${Math.round(s/tot*100)} %</span></b></div><div class="bar"><i data-w="${s/tot*100}" style="background:${ZCOL[z]}"></i></div></div>`).reverse().join('')}</div>`)}
const DETAIL={};
function pActivity(e){
  const act=(DS.acts||[]).find(a=>String(a.id)===String(e.id));
  const a=DETAIL[e.id];
  if(!a){
    DS.actDetail(act?act.id:e.id).then(r=>{DETAIL[e.id]=r;if(stack[stack.length-1]===e)render(true)}).catch(()=>{DETAIL[e.id]={error:true};if(stack[stack.length-1]===e)render(true)});
    return`${topbar(act?.kind==='cf'?'Entrenamiento':'Actividad')}<div class="ph"><h1>${esc(act?.name||'Actividad')}</h1></div>${card('',null,EMPTY(120,'Cargando el detalle de Garmin…'))}`;
  }
  if(a.error)return`${topbar('Actividad')}<div class="ph"><h1>${act?.name||'Actividad'}</h1></div>${card('',null,'<p class="ins-s">No se ha podido cargar el detalle. Comprueba tu conexión e inténtalo de nuevo.</p>')}`;
  const when=`${cap(dDay(a.day))}${isNum(a.start)?' a las '+clock(a.start):''}${a.place?', '+a.place:''}`;
  if(a.kind==='cf'){
    const w=a.wod,vol=(a.sets||[]).reduce((s,q)=>s+(+q.reps||0)*(+q.kg||0),0);
    return `${topbar('Entrenamiento')}
    <div class="ph"><div class="date">${when}</div><h1>${esc(a.title)}</h1></div>
    ${w?card('WOD',`<span class="src">Self</span>`,`${w.desc?`<p style="font-size:15px;line-height:1.5">${esc(w.desc)}</p>`:''}<div class="row" style="margin-top:14px;align-items:flex-end"><div><div class="small muted">Resultado</div><div class="big num">${esc(w.result)||'—'}</div></div><div style="text-align:right">${w.rx?'<span class="flag" style="color:var(--rec)">RX</span>':'<span class="flag" style="color:var(--mu)">Escalado</span>'}${w.prev?`<div class="small muted" style="margin-top:6px">Intento anterior (${dShort(w.prev.date)}): <b style="color:var(--tx)">${esc(w.prev.result)}</b></div>`:''}</div></div>${w.notes?`<p class="small muted" style="margin-top:10px">${esc(w.notes)}</p>`:''}`)
      :card('WOD',null,`<p class="ins-s">Añade el WOD y tu resultado para compararlo con intentos anteriores.</p><button class="add" data-form="wod" data-act="${a.activityId||''}" data-day="${dayKey(a.day)}">${ico('plus',16)} Registrar WOD de esta sesión</button>`)}
    <div class="grid3" style="margin-bottom:12px">${kv('Duración',hmmss(a.durS))}${kv('Calorías',val(a.kcal,fi,' kcal'))}${kv('FC media',val(a.hrAvg,fi,' lpm'))}${kv('FC máxima',val(a.hrMax,fi,' lpm'))}${kv('Efecto aeróbico',val(a.te,f1))}${kv('Efecto anaeróbico',val(a.tea,f1))}${kv('Carga',val(a.load,fi))}${kv('Series',a.sets?.length||'—')}${kv('Volumen',vol?fi(vol)+' kg':'—')}</div>
    ${card('Frecuencia cardíaca',`<span class="src">Garmin</span>`,xyChart(a.tm||[],a.hr||[],{color:C.red,h:150,fmt:v=>Math.round(v),xfmt:v=>Math.round(v)+' min',bands:a.bands?a.bands.map(p=>[p[0],p[1],p[2]]):null}))}
    ${zonesCard(a.zt)}
    ${a.sets&&a.sets.length?card('Series de fuerza','Detectadas por Garmin',`<table class="tbl"><thead><tr><th>Ejercicio</th><th>Repeticiones</th><th>Peso</th><th>Duración</th></tr></thead><tbody>${a.sets.map(q=>`<tr><td>${esc(q.ex)}</td><td>${val(q.reps,fi)}</td><td><b>${isNum(q.kg)?f1(q.kg,q.kg%1?1:0)+' kg':'—'}</b></td><td>${val(q.dur,fi,' s')}</td></tr>`).join('')}</tbody></table>`):''}
    ${a.phases?card('Bloques de la sesión',null,`<table class="tbl"><thead><tr><th>Bloque</th><th>Inicio</th><th>Duración</th></tr></thead><tbody>${a.phases.map(p=>`<tr><td>${p[2]}</td><td>${mmss(p[0]*60)}</td><td>${mmss((p[1]-p[0])*60)}</td></tr>`).join('')}</tbody></table>`):''}
    <p class="src" style="padding:4px">Actividad de Garmin Connect. El WOD y los pesos se registran en Self.</p>`;
  }
  const splits=a.splits||[],bestK=splits.filter(s=>s.dd>=.95).reduce((b,s)=>!b||s.p<b.p?s:b,null)?.k;
  let rc=0;
  return `${topbar('Carrera')}
  <div class="ph"><div class="date">${when}</div><h1>${esc(a.title)}</h1></div>
  ${card('',null,`<div class="row" style="align-items:flex-end;margin-bottom:14px"><div><div class="small muted">Distancia</div><div class="big num">${f1(a.km,2)}<small>km</small></div></div><div style="text-align:right"><div class="small muted">Tiempo</div><div class="num" style="font-size:32px">${hmmss(a.total)}</div></div></div>${mapBlock(a)}${a.track||a.demoRoute?`<div class="legend"><span><i class="sw" style="background:var(--act)"></i>Más rápido</span><span><i class="sw" style="background:var(--act);opacity:.35"></i>Más lento</span></div>`:''}`)}
  <div class="grid3" style="margin-bottom:12px">
    ${kv('Ritmo medio',val(a.avgPace,mmss,'/km'))}${kv('Mejor km',val(a.best,mmss,'/km'))}${kv('FC media',val(a.hrAvg,fi,' lpm'))}
    ${kv('FC máxima',val(a.hrMax,fi,' lpm'))}${kv('Cadencia',val(a.cadAvg,fi,' ppm'))}${kv('Zancada',val(a.stride,v=>f1(v,2),' m'))}
    ${kv('Desnivel',val(a.up,fi,' m'))}${kv('Calorías',val(a.kcal,fi,' kcal'))}${kv('Potencia',val(a.power,fi,' W'))}
    ${kv('Efecto aeróbico',val(a.te,f1))}${kv('Efecto anaeróbico',val(a.tea,f1))}${kv('Carga',val(a.load,fi))}
    ${kv('Oscilación vertical',val(a.vo,f1,' cm'))}${kv('Contacto con el suelo',val(a.gct,fi,' ms'))}${kv('Sudor estimado',val(a.sweat,fi,' ml'))}
    ${kv('Body Battery',val(a.bbi,fi))}${kv('VO₂ máx.',val(a.vo2,fi))}${kv('Esfuerzo percibido',val(a.rpe,fi,'/10'))}
  </div>
  ${card('Condiciones al inicio',`<span class="src">Open-Meteo</span>`,`<div class="grid3">${kv('Temperatura',val(a.temp,f1,' °C'))}${kv('Humedad',val(a.hum,fi,' %'))}${kv('Viento',val(a.wind,fi,' km/h')+(a.windDir&&isNum(a.wind)?' '+a.windDir:''))}</div>`)}
  ${card('Ritmo',null,xyChart(a.dist,a.pace,{color:C.act,inv:true,fmt:v=>mmss(v),h:120}))}
  ${card('Frecuencia cardíaca',null,xyChart(a.dist,a.hr,{color:C.red,fmt:v=>Math.round(v),h:120}))}
  ${card('Altitud',null,xyChart(a.dist,a.elev,{color:C.rec,fmt:v=>Math.round(v)+' m',h:100}))}
  ${card('Cadencia',null,xyChart(a.dist,a.cad,{color:C.cf,fmt:v=>Math.round(v),h:100,area:false}))}
  ${zonesCard(a.zt)}
  ${a.laps&&a.laps.length>1?card('Vueltas y series',`${a.laps.filter(l=>l.rep).length} series`,`<table class="tbl"><thead><tr><th>Vuelta</th><th>Distancia</th><th>Tiempo</th><th>Ritmo</th><th>FC</th></tr></thead><tbody>${a.laps.map(l=>`<tr ${l.rep?'class="best"':''}><td>${l.rep?'Serie '+(++rc):l.label}</td><td>${fi(l.d)} m</td><td>${mmss(l.t)}</td><td>${mmss(l.p)}</td><td>${val(l.hr,fi)}</td></tr>`).join('')}</tbody></table>`):''}
  ${splits.length?card('Parciales por kilómetro',null,`<table class="tbl"><thead><tr><th>Km</th><th>Tiempo</th><th>Ritmo</th><th>FC</th><th>Cadencia</th><th>Desnivel</th></tr></thead><tbody>${splits.map(s=>`<tr ${s.k===bestK?'class="best"':''}><td>${s.dd<.95?f1(a.km,1):s.k}${s.k===bestK?' <span class="tag">mejor</span>':''}</td><td>${mmss(s.t)}</td><td>${mmss(s.p)}</td><td>${val(s.hr,fi)}</td><td>${val(s.cad,fi)}</td><td>+${val(s.up,fi)} m</td></tr>`).join('')}</tbody></table>`):''}
  <p class="src" style="padding:4px">Datos de Garmin Connect: GPS y sensores del reloj. Condiciones meteorológicas de Open-Meteo al inicio de la actividad.</p>`;
}

/* ===================== Marcas y analíticas ===================== */
function pPR(e){
  const p=DS.prs[e.k],vals=p.hist.map(h=>h[1]),isT=p.u==='time',first=vals[0],last=vals[vals.length-1],fm=v=>prFmt(p,v);
  const lastW=D.map(x=>x.weight).filter(isNum).pop();
  return `${topbar('Marca personal')}
  <div class="ph"><div class="date">Conseguida el ${p.date}</div><h1>${esc(p.n)}</h1></div>
  ${card('',null,`<div class="small muted">Mejor marca</div><div class="big num" style="margin-top:4px;color:var(--nut)">${fm(p.best)}</div>${vals.length>1?`<div class="small" style="margin-top:8px"><span class="up">${isT?'−'+mmss(first-last):'+'+f1(last-first,(last-first)%1?1:0)+' kg'}</span> <span class="muted">desde ${p.hist[0][0]}</span></div>`:''}`)}
  ${vals.length>1?card('Progresión',null,lineChart(vals,{color:C.nut,fmt:fm,inv:isT,avg7:false,h:160,dots:true})+`<div class="row small muted" style="margin-top:4px">${p.hist.map(h=>`<span>${h[0]}</span>`).join('')}</div>`):''}
  ${!isT&&lastW?`<div class="grid2">${kv('Relación con tu peso',f1(p.best/lastW,2)+' veces')}${kv('Siguiente objetivo',f1(p.best+5,0)+' kg')}</div>`:''}
  ${card('Historial',null,`<table class="tbl"><thead><tr><th>Mes</th><th>Marca</th><th>Mejora</th></tr></thead><tbody>${[...p.hist].reverse().map((h,j,arr)=>{const nx=arr[j+1];return`<tr><td>${cap(h[0])}</td><td><b>${fm(h[1])}</b></td><td class="up">${nx?(isT?'−'+mmss(nx[1]-h[1]):'+'+f1(h[1]-nx[1],(h[1]-nx[1])%1?1:0)+' kg'):'—'}</td></tr>`}).join('')}</tbody></table>`)}
  <button class="add" data-form="pr" data-name="${esc(p.n)}" data-unit="${p.u}">${ico('plus',16)} Registrar un nuevo intento</button>`;
}
function pLab(e){
  const l=DS.labs[e.k],s=labStatus(l),vv=l.vals.map(x=>x.v),last=l.vals[l.vals.length-1];
  const band=isNum(l.lo)||isNum(l.hi)?[isNum(l.lo)?l.lo:Math.min(...vv)*.9,isNum(l.hi)?l.hi:Math.max(...vv)*1.1]:null;
  return `${topbar('Analítica')}
  <div class="ph"><div class="date">Último resultado: ${last.d}</div><h1>${esc(l.n)}</h1>${l.desc?`<div class="date" style="margin-top:6px">${l.desc}</div>`:''}</div>
  ${card('',null,`<div class="row" style="align-items:flex-end"><div><div class="small muted">Valor actual</div><div class="big num" style="margin-top:4px">${f1(last.v,last.v%1?1:0)}<small>${l.u}</small></div></div><div style="text-align:right"><span class="flag" style="color:${s[1]}">${s[0]}</span><div class="small muted" style="margin-top:6px">Referencia ${refTxt(l)}</div></div></div>`)}
  ${vv.length>1?card('Evolución',`${vv.length} analíticas`,lineChart(vv,{color:s[1],fmt:v=>Math.round(v),avg7:false,h:150,dots:true,band})+`<div class="row small muted" style="margin-top:4px">${l.vals.map(x=>`<span>${x.d}</span>`).join('')}</div>${band?`<div class="legend"><span><i class="sw" style="background:${s[1]};opacity:.2"></i>Rango de referencia</span></div>`:''}`):''}
  ${card('Historial',null,`<table class="tbl"><thead><tr><th>Fecha</th><th>Valor</th><th>Cambio</th></tr></thead><tbody>${l.vals.map((x,j)=>({...x,c:j?x.v-l.vals[j-1].v:null})).reverse().map(r=>`<tr><td>${cap(r.d)}</td><td><b>${f1(r.v,r.v%1?1:0)} ${l.u}</b></td><td>${r.c==null?'—':sgn(r.c)+f1(Math.abs(r.c),Math.abs(r.c)%1?1:0)}</td></tr>`).join('')}</tbody></table>`)}
  <p class="src" style="padding:4px">Los valores de referencia los indica tu laboratorio. Ante cualquier duda, consulta con tu médico.</p>`;
}

/* ===================== Registros (formularios) ===================== */
const FORMS={
  meal:{t:'Comida o bebida',table:'nutrition',fields:[['meal','Momento','select',['Desayuno','Media mañana','Almuerzo','Merienda','Cena','Bebida','Otro']],['description','Descripción','text'],['kcal','Calorías (kcal)','num'],['protein_g','Proteína (g)','num'],['carbs_g','Carbohidratos (g)','num'],['fat_g','Grasas (g)','num'],['caffeine_mg','Cafeína (mg)','num'],['alcohol_units','Alcohol (consumiciones)','num'],['water_glasses','Agua (vasos de 250 ml)','num']]},
  state:{t:'Estado y trabajo de hoy',table:'context_daily',conflict:'user_id,day',fields:[['energy','Energía al despertar (1 a 5)','num'],['mood','Ánimo (1 a 5)','num'],['tasks_done','Tareas completadas hoy','num'],['meetings','Reuniones hoy','num'],['habits_pct','Hábitos cumplidos (%)','num']]},
  wod:{t:'WOD',table:'wods',fields:[['name','Nombre del WOD','text'],['description','Descripción','text'],['result','Resultado (tiempo, rondas o kg)','text'],['rx','Hecho en RX','check'],['notes','Notas','text']]},
  pr:{t:'Marca personal',table:'personal_records',fields:[['name','Ejercicio o prueba','text'],['unit','Unidad','select',['kg','tiempo']],['value','Valor (kg, o tiempo en mm:ss)','text'],['day','Fecha','date']]},
  lab:{t:'Resultado de analítica',table:'lab_results',fields:[['day','Fecha de la analítica','date'],['marker','Marcador (por ejemplo, Glucosa)','text'],['value','Valor','num'],['unit','Unidad (por ejemplo, mg/dL)','text'],['ref_low','Referencia mínima','num'],['ref_high','Referencia máxima','num']]}
};
function regMenu(){return`<div class="grab"></div><div class="row" style="margin-bottom:12px"><h3 style="font-size:22px;font-stretch:76%;font-weight:700">Registrar</h3><button class="iconbtn" data-close="1" style="width:34px;height:34px" aria-label="Cerrar">${ico('x',16)}</button></div><div class="list">${[['meal','nutri','Comida o bebida','Calorías, macros, cafeína, alcohol y agua'],['state','smile','Estado y trabajo de hoy','Energía, ánimo, tareas y reuniones'],['wod','cf','WOD','Resultado de tu sesión de CrossFit'],['pr','trophy','Marca personal','Fuerza o tiempos de carrera'],['lab','flask','Analítica','Resultados de laboratorio']].map(r=>`<div class="it" data-form="${r[0]}"><div class="ico">${ico(r[1],18)}</div><div class="mid"><div class="t1">${r[2]}</div><div class="t2">${r[3]}</div></div>${nextI}</div>`).join('')}</div>`}
function formHTML(kind,pre={}){
  const f=FORMS[kind];
  return`<div class="grab"></div><div class="row" style="margin-bottom:12px"><h3 style="font-size:22px;font-stretch:76%;font-weight:700">${f.t}</h3><button class="iconbtn" data-close="1" style="width:34px;height:34px" aria-label="Cerrar">${ico('x',16)}</button></div>
  <form id="rform" data-kind="${kind}" data-act="${pre.act||''}" data-day="${pre.day||''}">${f.fields.map(([k,l,t,opts])=>{const v=pre[k]??'';
    if(t==='select')return`<label class="fld"><span>${l}</span><select name="${k}">${opts.map(o=>`<option ${o===v||(k==='unit'&&v==='time'&&o==='tiempo')?'selected':''}>${o}</option>`).join('')}</select></label>`;
    if(t==='check')return`<label class="fld chk"><input type="checkbox" name="${k}" checked><span>${l}</span></label>`;
    return`<label class="fld"><span>${l}</span><input name="${k}" ${t==='num'?'inputmode="decimal"':''} type="${t==='date'?'date':'text'}" value="${t==='date'&&!v?dayKey(TODAY):esc(v)}" ${k==='name'||k==='marker'||k==='value'?'required':''}></label>`}).join('')}
  <button class="primary" type="submit">Guardar</button></form>`;
}
async function submitForm(form){
  const kind=form.dataset.kind,f=FORMS[kind],fd=new FormData(form),row={};
  f.fields.forEach(([k,,t])=>{let v=fd.get(k);if(t==='check'){row[k]=!!v;return}if(v==null||v==='')return;v=String(v).trim();
    if(t==='num'){const n=parseFloat(v.replace(',','.'));if(isFinite(n))row[k]=n;return}row[k]=v});
  if(kind==='pr'){row.unit=row.unit==='tiempo'?'time':'kg';if(row.unit==='time'){const p=String(row.value).split(':').map(Number);row.value=p.reduce((a,b)=>a*60+b,0)}else row.value=parseFloat(String(row.value).replace(',','.'))}
  if(kind==='meal'||kind==='state'||kind==='wod')row.day=form.dataset.day||dayKey(TODAY);
  if(kind==='wod'&&form.dataset.act)row.activity_id=+form.dataset.act;
  try{await DS.save(f.table,row,f.conflict);toast('Guardado');closeSheet();setTimeout(()=>location.reload(),700)}
  catch(err){toast(DS.mode==='demo'?'En modo demostración no se guardan datos':'No se ha podido guardar: '+(err.message||'error'))}
}

/* ===================== Fuentes y ajustes ===================== */
function sheetHTML(){return`<div class="grab"></div><div class="row" style="margin-bottom:4px"><h3 style="font-size:22px;font-stretch:76%;font-weight:700">Fuentes de datos</h3><button class="iconbtn" data-close="1" style="width:34px;height:34px" aria-label="Cerrar">${ico('x',16)}</button></div><p class="small muted" style="margin-bottom:14px">${DS.lastSync}.</p><div class="list">${DS.sources.map(s=>`<div class="it"><div class="ico">${ico(s[0],18)}</div><div class="mid"><div class="t1">${s[1]}</div><div class="t2">${s[2]}</div></div><div class="end" style="font-size:13px;font-weight:500">${s[4]}<span>${s[3]}</span></div></div>`).join('')}</div>`}
const CROLES=[['c1','Principal','Botones, enlaces, menú activo y logotipo'],['c2','Recuperación y bienestar','HRV, recuperación, Body Battery y nutrición'],['c3','Sueño','Puntuación, duración y fases del sueño'],['c4','Actividad','Pasos, entrenamientos, carrera y estrés'],['c5','Destacado','Valor de hoy, avisos y nuevas marcas']];
const CDEF={c1:'#1D5FB8',c2:'#178A5E',c3:'#2E5FB0',c4:'#1F7FA6',c5:'#F2C230'};
const PRESETS=[['Predeterminado',CDEF],['Océano',{c1:'#0B4F8A',c2:'#127C86',c3:'#2D4FA0',c4:'#2A8FC4',c5:'#F5D04C'}],['Bosque',{c1:'#1E5E3F',c2:'#2E8B57',c3:'#3A6E8F',c4:'#5C9A5C',c5:'#E9C46A'}],['Grafito',{c1:'#33414A',c2:'#4D7A6A',c3:'#4A5F7A',c4:'#6A8291',c5:'#F2C230'}],['Garmin',{c1:'#007CC3',c2:'#11A579',c3:'#5B4FC7',c4:'#00A3E0',c5:'#FFC72C'}]];
const validColors=v=>v&&CROLES.every(r=>/^#[0-9a-f]{6}$/i.test(v[r[0]]||''));
let colors=(()=>{if(validColors(DS.settings?.colors))return DS.settings.colors;try{const v=JSON.parse(localStorage.getItem('self.colors'));if(validColors(v))return v}catch(e){}return{...CDEF}})();
function applyColors(){const st=document.documentElement.style;Object.entries(colors).forEach(([k,v])=>st.setProperty('--'+k,v))}
const saveColors=()=>{try{localStorage.setItem('self.colors',JSON.stringify(colors))}catch(e){}pushSettings()};
applyColors();
function pSettings(){
  return`${topbar('Ajustes')}
  <div class="ph"><h1>Ajustes</h1></div>
  <h2 class="sec">Colores de la app</h2>
  ${card('',null,`<div class="list">${CROLES.map(([k,n,d])=>`<label class="it" style="cursor:pointer"><span class="mi" style="width:34px;height:34px;background:${colors[k]};border:2px solid var(--s1);box-shadow:0 0 0 1px var(--line)"></span><div class="mid"><div class="t1">${n}</div><div class="t2 w">${d}</div></div><input type="color" class="cpick" data-c="${k}" value="${colors[k]}" aria-label="Color ${n}"></label>`).join('')}</div>`)}
  <h2 class="sec">Combinaciones predefinidas</h2>
  <div class="elist">${PRESETS.map(([n,c],i)=>`<button class="erow" data-preset="${i}" style="width:100%;text-align:left"><span class="en">${n}</span><span style="display:flex;gap:4px">${CROLES.map(r=>`<i style="width:20px;height:20px;border-radius:50%;background:${c[r[0]]};display:block"></i>`).join('')}</span></button>`).join('')}</div>
  <h2 class="sec">Vista previa</h2>
  ${['rec','sScore','steps'].map(module).join('')}
  <button class="more" data-creset="1">Restablecer los colores</button>
  <h2 class="sec">Otros ajustes</h2>
  ${card('',null,`<div class="list">
    <div class="it" data-hedit="1"><div class="ico">${ico('edit',18)}</div><div class="mid"><div class="t1">Personalizar inicio</div><div class="t2">Elegir y ordenar la información</div></div>${nextI}</div>
    <div class="it" data-sheet="1"><div class="ico">${ico('sync',18)}</div><div class="mid"><div class="t1">Fuentes de datos</div><div class="t2">${DS.lastSync}</div></div>${nextI}</div>
    <div class="it" data-reload="1"><div class="ico">${ico('recover',18)}</div><div class="mid"><div class="t1">Actualizar datos</div><div class="t2">Vuelve a cargar la información desde la nube</div></div>${nextI}</div>
    ${DS.signOut?`<div class="it" data-logout="1"><div class="ico" style="color:var(--red)">${ico('logout',18)}</div><div class="mid"><div class="t1">Cerrar sesión</div><div class="t2">Borra también la copia local de tus datos</div></div>${nextI}</div>`:`<div class="it" data-reload="1"><div class="ico">${ico('logout',18)}</div><div class="mid"><div class="t1">Salir del modo demostración</div><div class="t2">Configura Supabase en config.js para usar tus datos</div></div>${nextI}</div>`}
  </div>`)}
  <p class="src" style="padding:4px">Self ${DS.mode==='demo'?'en modo demostración':'conectado a tu Supabase'}.</p>`;
}

/* ===================== Navegación ===================== */
const PAGES={hoy:pHoy,sueno:pSueno,entreno:pEntreno,nutri:pNutri,tend:pTend};
const TABN={hoy:'Hoy',sueno:'Sueño',entreno:'Entreno',nutri:'Nutrición',tend:'Tendencias'};
const main=document.getElementById('main'),nav=document.getElementById('nav'),ov=document.getElementById('ov'),sheet=document.getElementById('sheet'),toastEl=document.getElementById('toast');
let tab='hoy',stack=[];
nav.innerHTML=Object.entries(TABN).map(([k,l])=>`<button data-go="${k}" class="${k===tab?'on':''}">${ico(k,22)}<span>${l}</span></button>`).join('');
function titleOf(e){return e.t==='set'?'Ajustes':e.t==='p'?'Relación':e.t==='m'?M[e.key].n:e.t==='a'?'Actividad':e.t==='pr'?'Marca':'Analítica'}
function render(keep){
  gid=0;MAPQ=[];
  const top=stack[stack.length-1];
  try{
    if(!top)main.innerHTML=PAGES[tab]();
    else main.innerHTML=top.t==='set'?pSettings():top.t==='p'?pPair(top):top.t==='m'?pMetric(top):top.t==='a'?pActivity(top):top.t==='pr'?pPR(top):pLab(top);
  }catch(err){console.error(err);main.innerHTML=`${top?topbar('Error'):hdr(todayStr,'Self')}${card('',null,`<p class="ins-s">No se ha podido mostrar esta pantalla. Detalle técnico: ${String(err.message||err)}</p>`)}`}
  nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.go===tab));
  if(!keep)window.scrollTo(0,0);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{main.querySelectorAll('.bar i,.meter i').forEach(el=>el.style.width=el.dataset.w+'%');initMaps()}));
}
function openE(spec){
  const i=spec.indexOf(':'),t=spec.slice(0,i),rest=spec.slice(i+1);let e;
  if(t==='m')e={t,key:rest,range:30};else if(t==='a')e={t,id:rest};else if(t==='p'){const [a,b]=rest.split(':');e={t,dk:a,ok:b}}else e={t,k:+rest};
  if(t==='m'&&!M[rest])return;
  e.title=titleOf(e);
  if(stack.length)stack[stack.length-1].scroll=window.scrollY;else e.rootScroll=window.scrollY;
  stack.push(e);render();
}
function back(){const e=stack.pop();render(true);window.scrollTo(0,stack.length?(stack[stack.length-1].scroll||0):(e?.rootScroll||0))}
let tt;function toast(m){toastEl.textContent=m;toastEl.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove('on'),2200)}
function openSheet(html){sheet.innerHTML=html||sheetHTML();ov.classList.add('on');sheet.classList.add('on')}
function closeSheet(){ov.classList.remove('on');sheet.classList.remove('on')}
const keepScroll=fn=>{const y=window.scrollY;fn();render(true);window.scrollTo(0,y)};
document.addEventListener('click',e=>{
  if(e.target===ov)return closeSheet();
  const b=e.target.closest('[data-set],[data-preset],[data-creset],[data-hedit],[data-hdone],[data-hadd],[data-hdel],[data-hup],[data-hreset],[data-go],[data-met],[data-toast],[data-sheet],[data-close],[data-open],[data-back],[data-range],[data-all],[data-more],[data-reg],[data-form],[data-reload],[data-logout]');
  if(!b)return;
  const d=b.dataset;
  if(d.set){if(stack.length)stack[stack.length-1].scroll=window.scrollY;stack.push({t:'set',title:'Ajustes'});render()}
  else if(d.preset||d.creset){colors={...(d.creset?CDEF:PRESETS[+d.preset][1])};applyColors();saveColors();keepScroll(()=>{})}
  else if(d.hedit){closeSheet();editing=true;tab='hoy';stack=[];render()}
  else if(d.hdone){editing=false;render()}
  else if(d.hadd||d.hdel||d.hup||d.hreset){
    keepScroll(()=>{if(d.hadd)home.push(d.hadd);if(d.hdel)home=home.filter(k=>k!==d.hdel);if(d.hup){const i=home.indexOf(d.hup);if(i>0)[home[i-1],home[i]]=[home[i],home[i-1]]}if(d.hreset)home=[...HOME_DEF];saveHome()});
  }
  else if(d.go){editing=false;tab=d.go;stack=[];render()}
  else if(d.back)back();
  else if(d.met)keepScroll(()=>{curMet=d.met});
  else if(d.range)keepScroll(()=>{stack[stack.length-1].range=+d.range;stack[stack.length-1].all=false});
  else if(d.all)keepScroll(()=>{stack[stack.length-1].all=true});
  else if(d.more)keepScroll(()=>{actsAll=true});
  else if(d.toast)toast(d.toast);
  else if(d.reg)openSheet(regMenu());
  else if(d.form)openSheet(formHTML(d.form,{act:d.act,day:d.day,name:d.name,unit:d.unit}));
  else if(d.sheet)openSheet();
  else if(d.close)closeSheet();
  else if(d.reload)location.reload();
  else if(d.logout)DS.signOut().then(()=>location.reload());
  else if(d.open)openE(d.open);
});
document.addEventListener('submit',e=>{if(e.target.id==='rform'){e.preventDefault();submitForm(e.target)}});
document.addEventListener('input',e=>{const c=e.target.closest('.cpick');if(!c)return;colors[c.dataset.c]=c.value;applyColors();saveColors();const sw=c.closest('.it').querySelector('.mi');if(sw)sw.style.background=c.value});
document.addEventListener('change',e=>{if(e.target.closest('.cpick'))keepScroll(()=>{})});
let drag=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('.handle');if(!h)return;const row=h.closest('.erow');drag={row,y:e.clientY};row.classList.add('drag');try{h.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
document.addEventListener('pointermove',e=>{if(!drag)return;const r=drag.row;let dy=e.clientY-drag.y;const prev=r.previousElementSibling,next=r.nextElementSibling;
  if(prev&&dy<-prev.offsetHeight/2){r.parentNode.insertBefore(r,prev);drag.y-=prev.offsetHeight+8;dy=e.clientY-drag.y}
  else if(next&&dy>next.offsetHeight/2){r.parentNode.insertBefore(next,r);drag.y+=next.offsetHeight+8;dy=e.clientY-drag.y}
  r.style.transform=`translateY(${dy}px)`});
const endDrag=()=>{if(!drag)return;drag.row.style.transform='';drag.row.classList.remove('drag');home=[...document.querySelectorAll('#elist .erow')].map(x=>x.dataset.k);saveHome();drag=null;keepScroll(()=>{})};
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);

render();
window.__selfReady&&window.__selfReady();
}
