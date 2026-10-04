/* Self · carga de datos reales desde Supabase.
   Transforma las tablas en la misma estructura que usa la demo.
   Guarda una copia local para poder abrir la app sin conexión. */
const SELF_CACHE='self.cache.v1';
const N_DAYS=90,PRE_DAYS=30;

async function loadLive(sb,user,cfg){
  const today=startOfDay(new Date()),since=dayKey(addDays(today,-(N_DAYS+PRE_DAYS-1)));
  let rows,offline=false;
  try{
    const q=async(table,cols,build)=>{let req=sb.from(table).select(cols);if(build)req=build(req);const {data,error}=await req;if(error)throw error;return data||[]};
    const [daily,stages,acts,nut,wods,prs,labs,wx,ctx,settings]=await Promise.all([
      q('daily','*',r=>r.gte('day',since).order('day')),
      q('sleep_stages','day,start_local,end_local,stage',r=>r.gte('day',dayKey(addDays(today,-1))).order('start_local')),
      q('activities','id,day,start_local,kind,name,distance_m,duration_s,avg_hr,avg_pace_s,training_load,calories',r=>r.gte('day',since).order('start_local',{ascending:false})),
      q('nutrition','*',r=>r.gte('day',since).order('ts')),
      q('wods','*',r=>r.order('day')),
      q('personal_records','*',r=>r.order('day')),
      q('lab_results','*',r=>r.order('day')),
      q('weather','*',r=>r.gte('day',since)),
      q('context_daily','*',r=>r.gte('day',since)),
      q('settings','*')
    ]);
    rows={daily,stages,acts,nut,wods,prs,labs,wx,ctx,settings,at:Date.now()};
    try{localStorage.setItem(SELF_CACHE,JSON.stringify(rows))}catch(e){}
  }catch(err){
    try{rows=JSON.parse(localStorage.getItem(SELF_CACHE))}catch(e){}
    if(!rows)throw err;
    offline=true;
  }
  const DS=assemble(rows,today,cfg);
  DS.mode='live';
  DS.offline=offline;
  DS.actDetail=id=>liveDetail(sb,rows,id,DS);
  DS.save=async(table,row,conflict)=>{const req=conflict?sb.from(table).upsert({...row,user_id:user.id},{onConflict:conflict}):sb.from(table).insert({...row,user_id:user.id});const {error}=await req;if(error)throw error};
  DS.saveSettings=async s=>{await sb.from('settings').upsert({user_id:user.id,...s,updated_at:new Date().toISOString()},{onConflict:'user_id'})};
  DS.signOut=async()=>{await sb.auth.signOut();try{localStorage.removeItem(SELF_CACHE)}catch(e){}};
  return DS;
}

function assemble(R,today,cfg){
  const total=N_DAYS+PRE_DAYS,first=addDays(today,-(total-1));
  const by=(arr,key='day')=>{const m={};(arr||[]).forEach(r=>{(m[r[key].slice(0,10)]??=[]).push(r)});return m};
  const dly=by(R.daily),wx=by(R.wx),ctx=by(R.ctx),nut=by(R.nut),acts=by(R.acts),wods=by(R.wods);
  const toLocal=ts=>new Date(String(ts).slice(0,19).replace(' ','T'));
  const minsFrom=(ts,base)=>ts?(toLocal(ts)-base)/60000:null;
  const sum=(a,k)=>a.reduce((s,r)=>s+(+r[k]||0),0);
  const all=[];
  for(let n=0;n<total;n++){
    const d=addDays(first,n),k=dayKey(d),dow=d.getDay(),x={d,dow,we:dow===0||dow===6};
    const a=(dly[k]||[])[0]||{},w=(wx[k]||[])[0]||{},c=(ctx[k]||[])[0]||{},ns=nut[k]||[],as=acts[k]||[],ws=wods[k]||[];
    const prevMid=addDays(d,-1);
    Object.assign(x,{
      hrv:a.hrv??null,rhr:a.rhr??null,sScore:a.sleep_score??null,
      sleep:a.sleep_min??null,deep:a.deep_min??null,light:a.light_min??null,rem:a.rem_min??null,awake:a.awake_min??null,
      bed:minsFrom(a.bed_local,prevMid),wake:minsFrom(a.wake_local,prevMid),
      spo2:a.spo2??null,resp:a.resp??null,skin:a.skin_temp_dev??null,stress:a.stress_avg??null,bb:a.bb_max??null,
      steps:a.steps_phone??a.steps_garmin??null,kAct:a.active_kcal??null,weight:a.weight_kg??null,
      tNight:w.t_min??null,tMax:w.t_max??null,hum:w.humidity??null,wind:w.wind_kmh??null,
      energy:c.energy??null,tasks:c.tasks_done??null,meet:c.meetings??null,habits:c.habits_pct??null
    });
    x.sleepH=isNum(x.sleep)?x.sleep/60:null;
    x.work=isNum(x.tasks)?x.tasks+(+x.meet||0)*1.5:null;
    if(ns.length){x.kIn=sum(ns,'kcal');x.prot=sum(ns,'protein_g');x.carb=sum(ns,'carbs_g');x.fat=sum(ns,'fat_g');x.caf=sum(ns,'caffeine_mg');x.alc=sum(ns,'alcohol_units');x.water=sum(ns,'water_glasses')}
    else Object.assign(x,{kIn:null,prot:null,carb:null,fat:null,caf:null,alc:null,water:null});
    const runs=as.filter(r=>r.kind==='run'),cfs=as.filter(r=>r.kind==='cf');
    x.run=runs.reduce((s,r)=>s+(+r.distance_m||0)/1000,0);
    x.runMin=runs.reduce((s,r)=>s+(+r.duration_s||0)/60,0);
    x.pace=x.run?x.runMin*60/x.run:0;
    x.runHr=runs.length?Math.round(avg(runs.map(r=>+r.avg_hr||0).filter(Boolean))):0;
    x.runType=runs.length?(runs.sort((p,q)=>q.distance_m-p.distance_m)[0].name||'Carrera'):null;
    x.cf=cfs.length>0;x.cfMin=cfs.reduce((s,r)=>s+(+r.duration_s||0)/60,0);
    x.wod=ws.length?ws[ws.length-1].name:(cfs[0]?.name||null);
    x.trainMin=as.reduce((s,r)=>s+(+r.duration_s||0)/60,0);
    const load=as.reduce((s,r)=>s+(+r.training_load||(+r.duration_s||0)/40),0);
    x.strain=(isNum(x.kAct)||as.length)?+clamp(2+(+x.kAct||0)/100+load/30,0,21).toFixed(1):null;
    all.push(x);
  }
  /* Recuperación: HRV, FC en reposo y sueño frente a tu línea base de 30 días */
  all.forEach((x,i)=>{
    const prev=all.slice(Math.max(0,i-30),i),h=prev.map(p=>p.hrv).filter(isNum),r=prev.map(p=>p.rhr).filter(isNum);
    if(!isNum(x.hrv)||h.length<7){x.rec=null;return}
    const zH=clamp((x.hrv-avg(h))/Math.max(sd(h),avg(h)*.08),-3,3),zR=isNum(x.rhr)&&r.length>=7?clamp((x.rhr-avg(r))/Math.max(sd(r),2),-3,3):0;
    x.rec=Math.round(clamp(55+12*zH-7*zR+.4*((x.sScore??75)-75),1,99));
  });
  all.forEach((x,i)=>{if(i<27){x.acwr=null;return}const a=all.slice(i-6,i+1).reduce((s,y)=>s+y.trainMin,0),c=all.slice(i-27,i+1).reduce((s,y)=>s+y.trainMin,0)/4;x.acwr=c?+(a/c).toFixed(2):null});
  const D=all.slice(-N_DAYS);D.forEach((x,i)=>x.i=i);
  const LAST=D.length-1,firstKey=dayKey(D[0].d),idxOf=k=>{const i=Math.round((parseDay(k)-D[0].d)/864e5);return i>=0&&i<=LAST?i:null};

  /* Hipnograma de anoche */
  const todayKey=dayKey(today),base=addDays(today,-1);
  const hyp=(R.stages||[]).filter(s=>s.day===todayKey).map(s=>{const t0=(toLocal(s.start_local)-base)/6e4,t1=(toLocal(s.end_local)-base)/6e4;return{st:s.stage,t0,dur:t1-t0}}).filter(s=>s.dur>0);

  /* Comidas de hoy */
  const meals=(R.nut||[]).filter(r=>r.day===todayKey).map(r=>{const t=new Date(r.ts);return{t:pad(t.getHours())+':'+pad(t.getMinutes()),n:r.meal||'Registro',d:r.description||'',k:r.kcal,p:r.protein_g}});

  /* Actividades */
  const actList=(R.acts||[]).filter(r=>r.day>=firstKey).map(r=>{const i=idxOf(r.day),w=(R.wods||[]).filter(x=>x.activity_id===r.id||(x.day===r.day&&r.kind==='cf')).slice(-1)[0];
    return{id:String(r.id),i,kind:r.kind,name:r.kind==='cf'&&w?'CrossFit: '+w.name:(r.name||'Actividad'),km:(+r.distance_m||0)/1000,pace:r.avg_pace_s,hr:r.avg_hr,durMin:Math.round((+r.duration_s||0)/60),result:w?.result,source:w?'Garmin y Self':'Garmin',start:r.start_local}}).filter(a=>a.i!=null);

  /* Marcas personales */
  const prs=Object.values((R.prs||[]).reduce((m,r)=>{(m[r.name]??=[]).push(r);return m},{})).map(list=>{
    const isT=list[0].unit==='time',best=list.reduce((b,r)=>(isT?+r.value<+b.value:+r.value>+b.value)?r:b,list[0]),bd=parseDay(best.day);
    return{n:list[0].name,u:list[0].unit,best:+best.value,date:dShort(bd),isNew:(today-bd)/864e5<=14,hist:list.slice(-8).map(r=>[MES[parseDay(r.day).getMonth()],+r.value])}});

  /* Analíticas */
  const labs=Object.values((R.labs||[]).reduce((m,r)=>{(m[r.marker]??=[]).push(r);return m},{})).map(list=>{const l=list[list.length-1];
    return{n:l.marker,u:l.unit||'',lo:l.ref_low,hi:l.ref_high,desc:'',vals:list.slice(-6).map(r=>{const d=parseDay(r.day);return{d:MES[d.getMonth()]+' '+d.getFullYear(),v:+r.value}})}});

  /* Fuentes y última sincronización */
  const rel=ts=>{if(!ts)return'Sin datos';const t=new Date(ts),days=Math.floor((today-startOfDay(t))/864e5);return days<=0?`Hoy, ${pad(t.getHours())}:${pad(t.getMinutes())}`:days===1?'Ayer':dShort(t)};
  const maxOf=(arr,k)=>(arr||[]).reduce((m,r)=>r[k]&&(!m||r[k]>m)?r[k]:m,null);
  const lastPhone=(R.daily||[]).filter(r=>r.steps_phone!=null||r.weight_kg!=null).map(r=>r.day).pop();
  const garminTs=maxOf(R.daily,'updated_at');
  const sources=[
    ['watch','Reloj Garmin','Actividades, GPS y frecuencia cardíaca en entreno','Garmin Connect',rel(maxOf(R.acts,'start_local'))],
    ['band','Garmin CIRQA','Sueño, HRV, SpO₂, estrés y Body Battery','Garmin Connect',rel(garminTs)],
    ['phone','Apple Salud','Pasos y peso','Atajo de iOS',lastPhone?rel(lastPhone+'T12:00:00'):'Sin datos'],
    ['nutri','Registros de Self','Comidas, cafeína, alcohol, WOD y analíticas','Supabase',rel(maxOf(R.nut,'ts'))],
    ['cloud','Open-Meteo','Clima diario','API pública',(R.wx||[]).length?rel(maxOf(R.wx,'day')+'T06:00:00'):'Sin datos'],
    ['brief','Summit y Órbita','Tareas, reuniones, hábitos y estado','Supabase',rel(maxOf(R.ctx,'updated_at'))]
  ];
  const st=(R.settings||[])[0]||null;
  return{today,now:new Date().getHours()*60+new Date().getMinutes(),days:D,hyp,meals,acts:actList,prs,labs,sources,
    lastSync:garminTs?`Última sincronización de Garmin: ${rel(garminTs).toLowerCase()}`:'Aún no hay datos de Garmin. Ejecuta la sincronización inicial.',
    settings:st?{home:st.home,colors:st.colors}:null,name:cfg.name,initials:cfg.initials};
}

async function liveDetail(sb,R,id,DS){
  const {data,error}=await sb.from('activities').select('*').eq('id',id).single();
  if(error)throw error;
  const a=data,s=a.samples||{},w=(R.wods||[]).filter(x=>x.activity_id===a.id||(x.day===a.day&&a.kind==='cf')).slice(-1)[0];
  const start=a.start_local?(()=>{const t=new Date(String(a.start_local).slice(0,19).replace(' ','T'));return t.getHours()*60+t.getMinutes()})():null;
  const common={day:parseDay(a.day),start,place:a.location||'',kcal:a.calories,hrAvg:a.avg_hr,hrMax:a.max_hr,te:a.te_aerobic,tea:a.te_anaerobic,load:a.training_load,zt:a.hr_zones};
  if(a.kind==='cf'||(!a.distance_m&&a.kind!=='run')){
    let prev=null;
    if(w){const p=(R.wods||[]).filter(x=>x.name===w.name&&x.day<w.day).slice(-1)[0];if(p)prev={result:p.result,date:parseDay(p.day)}}
    return{...common,kind:'cf',title:w?'CrossFit: '+w.name:(a.name||'Entrenamiento'),durS:a.duration_s,
      wod:w?{name:w.name,desc:w.description,result:w.result,rx:w.rx,notes:w.notes,prev}:null,activityId:a.id,
      tm:(s.t||[]).map(v=>v==null?null:v/60),hr:s.hr||[],bands:null,phases:null,sets:a.sets||[]};
  }
  const splits=a.splits||[];
  return{...common,kind:'run',title:a.name||'Carrera',km:(+a.distance_m||0)/1000,total:a.duration_s,avgPace:a.avg_pace_s,
    best:splits.filter(x=>x.dd>=.95).reduce((m,x)=>m==null||x.p<m?x.p:m,null)??a.best_pace_s,
    cadAvg:a.avg_cadence,stride:a.stride_m,up:a.elevation_gain,power:a.avg_power,vo:a.vert_osc_cm,gct:a.gct_ms,sweat:a.sweat_ml,bbi:a.bb_impact,vo2:a.vo2max,rpe:a.rpe,
    temp:a.temp_c,hum:a.humidity,wind:a.wind_kmh,windDir:a.wind_dir,
    dist:s.dist||[],pace:s.pace||[],hr:s.hr||[],elev:s.elev||[],cad:s.cad||[],splits,laps:a.laps||[],track:a.track,demoRoute:false};
}
