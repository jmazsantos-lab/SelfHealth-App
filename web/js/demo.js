/* Self · datos de demostración (90 días ficticios).
   Se usan cuando config.js no tiene Supabase configurado o al pulsar
   «Probar en modo demo». Generan exactamente la misma estructura que data.js. */
function buildDemo(){
  const R=mulberry32(20261003),g=gaussOf(R);
  const N=90,TODAY=startOfDay(new Date()),LAST=N-1;
  const nowD=new Date(),NOW=nowD.getHours()*60+nowD.getMinutes();
  const WODS=['Fran','Cindy','Grace','Helen','Annie','Karen','Isabel','DT','WOD del box','Diane'];
  const WOD={
    Fran:{desc:'21-15-9: thrusters (43 kg) y dominadas',score:'4:38',min:5,type:'time'},
    Cindy:{desc:'AMRAP 20 min: 5 dominadas, 10 flexiones y 15 sentadillas',score:'19 rondas + 7',min:20,type:'amrap'},
    Grace:{desc:'30 clean & jerks (61 kg) por tiempo',score:'3:12',min:3.2,type:'time'},
    Helen:{desc:'3 rondas: 400 m carrera, 21 swings (24 kg) y 12 dominadas',score:'11:05',min:11,type:'time'},
    Annie:{desc:'50-40-30-20-10: dobles de comba y abdominales',score:'9:40',min:9.7,type:'time'},
    Karen:{desc:'150 wall balls (9 kg) por tiempo',score:'8:55',min:9,type:'time'},
    Isabel:{desc:'30 snatches (61 kg) por tiempo',score:'4:02',min:4,type:'time'},
    DT:{desc:'5 rondas: 12 peso muerto, 9 hang power clean y 6 push jerk (70 kg)',score:'10:21',min:10.4,type:'time'},
    'WOD del box':{desc:'AMRAP 20 min: 10 box jumps, 10 swings y 10 burpees',score:'6 rondas + 12',min:20,type:'amrap'},
    Diane:{desc:'21-15-9: peso muerto (102 kg) y flexiones verticales',score:'7:48',min:7.8,type:'time'}
  };
  const LIFTS=[['Sentadilla',[110,115,120,125,125]],['Peso muerto',[140,150,160,165,165]],['Press de hombro',[50,52.5,55,57.5,57.5]],['Halterofilia',[75,80,85,85,85]]];
  const D=[];
  for(let i=0;i<N;i++){const d=addDays(TODAY,-(N-1-i)),dow=d.getDay();D.push({i,d,dow,we:dow===0||dow===6})}
  let wi=0,li=0;
  D.forEach(x=>{
    const {dow,i}=x;
    let alc=0;
    if(dow===5)alc=R()<.75?2+Math.floor(R()*2):0;else if(dow===6)alc=R()<.55?1+Math.floor(R()*3):0;else alc=R()<.1?1:0;
    x.alc=alc;
    const heat=(i>=68&&i<=71)||(i<35&&R()<.3);
    x.tNight=+(heat?27.1+g()*.4:(i<40?25.6:25)+g()*.6).toFixed(1);
    x.tMax=+(x.tNight+6+g()*.7).toFixed(1);
    x.hum=Math.round(clamp(80+g()*5,68,94));
    x.wind=Math.round(clamp(14+g()*4,4,30));
    const audit=i>=77&&i<=81&&!x.we;
    x.tasks=x.we?Math.round(1+R()*2):Math.round(clamp((audit?11:7)+g()*1.5,3,15));
    x.meet=x.we?0:Math.round(clamp((audit?6:3)+g(),0,8));
    x.work=x.tasks+x.meet*1.5;
    x.cf=false;x.run=0;
    if([1,3,5].includes(dow)&&R()>.08){x.cf=true;x.wod=WODS[wi++%WODS.length];x.lift=LIFTS[li++%LIFTS.length]}
    if(dow===2){x.run=+(8.4+R()*.3).toFixed(1);x.runType='Series 5 × 800 m'}
    if(dow===4){x.run=+(6+R()*1.5).toFixed(1);x.runType='Rodaje suave'}
    if(dow===0){x.run=+(12+R()*3).toFixed(1);x.runType='Tirada larga'}
  });
  D[LAST-1].alc=2;D[LAST].alc=0;D[LAST].cf=false;D[LAST].run=0;
  D.forEach((x,i)=>{
    const p=D[i-1]||{alc:0,tNight:25,work:8,cf:false,run:0,strain:8};
    const wkNight=x.dow===6||x.dow===0;
    const bed=(wkNight?23*60+48:23*60+2)+g()*16+p.alc*12;
    const wake=(wkNight?7*60+5:5*60+48)+g()*(wkNight?20:7)+1440;
    const heatX=Math.max(0,p.tNight-25.5),cafX=Math.max(0,(p.caf??200)-180)/100;
    const awake=clamp(14+p.alc*7+heatX*6+cafX*5+g()*4,5,60),asleep=wake-bed-awake;
    const deepF=clamp(.18-p.alc*.022-heatX*.02-cafX*.022+g()*.01,.08,.25),remF=clamp(.23-p.alc*.028+g()*.014,.12,.28);
    Object.assign(x,{bed,wake,awake,sleep:asleep,deep:asleep*deepF,rem:asleep*remF});
    x.light=asleep-x.deep-x.rem;
    x.sScore=Math.round(clamp(18+asleep/60*7+deepF*80+remF*20-p.alc*3.5-heatX*3+g()*2.5,45,97));
    x.hrv=Math.round(clamp(59-p.alc*5.5-heatX*2-(p.cf?3:0)-(p.work>16?4:0)+i*.03+g()*3.5,32,80));
    x.rhr=Math.round(clamp(51-i*.012+p.alc*1.6+heatX*.8+g()*1.1,44,62));
    x.rec=Math.round(clamp(52+(x.hrv-55)*1.7-(x.rhr-51)*3+(x.sScore-78)*.6+g()*3,15,99));
    x.spo2=+clamp(96.6-p.alc*.35+g()*.5,92,99).toFixed(1);
    x.resp=+clamp(14.1+p.alc*.35+g()*.3,12,18).toFixed(1);
    x.skin=+(p.alc*.14+heatX*.1+g()*.12).toFixed(1);
    x.stress=Math.round(clamp((x.we?22:27+x.work*.9)+Math.max(0,x.tMax-30.3)*4.2+(7-asleep/60)*3.5+g()*3,12,75));
    x.bb=Math.round(clamp(x.rec*.55+38+g()*4,25,100));
    x.steps=Math.round(clamp((x.we?6500:8300)+g()*1200+x.run*1050+(x.cf?1500:0)-Math.max(0,x.tMax-31.5)*700,3000,30000));
    x.pace=x.run?Math.round(330-i*.4+Math.max(0,(x.dow===0?x.tNight+.8:x.tMax-2.5)-27)*4+(x.runType==='Tirada larga'?16:x.runType==='Rodaje suave'?10:-8)+g()*5):0;
    x.runHr=x.run?Math.round(148+(x.runType==='Tirada larga'?-4:x.runType==='Rodaje suave'?-8:8)+g()*3):0;
    x.runMin=x.run?x.run*x.pace/60:0;x.cfMin=x.cf?60:0;
    x.trainMin=x.runMin+x.cfMin;
    x.kAct=Math.round(380+x.run*68+(x.cf?540:0)+(x.steps-8000)*.03+g()*40);
    x.strain=+clamp(5.5+(x.cf?7.5:0)+x.run*.42+(x.we?-.6:.6)+g()*.7,3,20).toFixed(1);
    x.prot=Math.round(clamp(148+g()*16,100,200));x.carb=Math.round(clamp(290+g()*28,150,400));x.fat=Math.round(clamp(84+g()*8,50,120));
    x.kIn=x.prot*4+x.carb*4+x.fat*9+x.alc*150;
    x.water=Math.round(clamp(7+g()*1.3,3,11));
    x.caf=Math.round(clamp(215+g()*70,60,450));
    x.weight=+(80.1-i*.026+g()*.2).toFixed(1);
    x.energy=Math.round(clamp(3.3+(x.rec-55)/30+(asleep/60-7)*.7-x.work*.05-(p.strain>12?.35:0)+g()*.4,1,5));
    x.habits=Math.round(clamp(72+g()*12-x.alc*5,25,100));
    x.sleepH=x.sleep/60;
  });
  D.forEach((x,i)=>{if(i<27){x.acwr=null;return}const a=D.slice(i-6,i+1).reduce((s,y)=>s+y.trainMin,0),c=D.slice(i-27,i+1).reduce((s,y)=>s+y.trainMin,0)/4;x.acwr=c?+(a/c).toFixed(2):null});
  const T=D[LAST],Y=D[LAST-1];
  const HYP=(()=>{const S=[];let t=T.bed,c=0;const end=T.wake;
    const push=(st,dur)=>{if(t>=end)return;dur=Math.min(Math.max(2,dur),end-t);S.push({st,t0:t,dur});t+=dur};
    push(0,10+g()*2);
    while(t<end){push(2,22+g()*5);push(3,Math.max(5,40-c*11-Y.alc*4+g()*4));push(2,14+g()*4);push(1,10+c*7-Y.alc*2+g()*3);if(R()<.4||(Y.alc&&c<2))push(0,2+R()*5);c++}
    return S})();
  (()=>{const tot=[0,0,0,0];HYP.forEach(s=>tot[s.st]+=s.dur);T.awake=tot[0];T.rem=tot[1];T.light=tot[2];T.deep=tot[3];T.sleep=tot[1]+tot[2]+tot[3];T.sleepH=T.sleep/60})();
  Object.assign(T,{energy:3,rec:58,bb:66,steps:5240,kAct:236,strain:4.6,prot:58,carb:92,fat:35,kIn:930,water:4,caf:170,stress:24,habits:50});

  /* Actividades */
  const acts=[];
  for(let i=LAST;i>=0;i--){const x=D[i];
    if(x.cf)acts.push({id:`d${i}cf`,i,kind:'cf',name:'CrossFit: '+x.wod,durMin:60,hr:142,result:WOD[x.wod].score,source:'Garmin y Self'});
    if(x.run)acts.push({id:`d${i}run`,i,kind:'run',name:x.runType,km:x.run,pace:x.pace,hr:x.runHr,durMin:Math.round(x.runMin),source:'Garmin'});
  }
  const HRMAX=188,ZONES=[0,.6,.7,.8,.9],zoneOf=hr=>{const p=hr/HRMAX;for(let z=4;z>=0;z--)if(p>=ZONES[z])return z;return 0};
  function runDetail(x){
    const r=mulberry32(x.i*7919+13),gg=gaussOf(r);
    const km=x.run,n=Math.round(km*20),base=x.pace,series=x.runType.startsWith('Series');
    const dist=[],pace=[],hr=[],elev=[],cad=[],time=[],seg=[];let t=0,h=105;
    const segOf=d=>{if(!series)return'run';if(d<1.5)return'warm';const q=d-1.5;if(q<6){const k=Math.floor(q/1.2),f=q-k*1.2;return f<.8?'rep':'rec'}return'cool'};
    for(let k=0;k<=n;k++){const d=Math.min(km,k*.05),sg=segOf(d);
      let p=series?(sg==='rep'?base-42:sg==='rec'?base+85:sg==='warm'?base+38:base+45):base+(d/km-.5)*10;p+=gg()*4;
      const target=series?(sg==='rep'?174:sg==='rec'?146:140):(x.runType==='Tirada larga'?136+d*1.1:140+d*1.2);h+=(target-h)*.18+gg()*.6;
      dist.push(+d.toFixed(2));pace.push(p);hr.push(Math.round(h));elev.push(+(4+2.2*Math.sin(d*1.4)+Math.sin(d*5)*.6).toFixed(1));cad.push(Math.round(170+(sg==='rep'?10:0)-(sg==='rec'?6:0)+gg()*1.6));seg.push(sg);
      if(k>0)t+=p*.05;time.push(t)}
    const sm=(a,w)=>a.map((_,i)=>avg(a.slice(Math.max(0,i-w),i+w+1)));
    const splits=[];
    for(let k=0;k<Math.ceil(km);k++){const ids=dist.map((d,i)=>i).filter(i=>dist[i]>k&&dist[i]<=k+1);if(!ids.length)continue;const dd=Math.min(1,km-k),tt=time[ids[ids.length-1]]-time[ids[0]-1];
      let up=0;for(let j=1;j<ids.length;j++)up+=Math.max(0,elev[ids[j]]-elev[ids[j-1]]);
      splits.push({k:k+1,dd,t:tt,p:tt/dd,hr:Math.round(avg(ids.map(i=>hr[i]))),cad:Math.round(avg(ids.map(i=>cad[i]))),up:Math.round(up)})}
    const laps=[],LN={warm:'Calentamiento',rep:'Serie',rec:'Recuperación',cool:'Vuelta a la calma'};
    if(series){let cur=null;seg.forEach((s,i)=>{if(i===0)return;if(!cur||cur.s!==s){cur={s,i0:i-1,i1:i};laps.push(cur)}else cur.i1=i});
      laps.forEach(l=>{l.d=(dist[l.i1]-dist[l.i0])*1000;l.t=time[l.i1]-time[l.i0];l.p=l.t/(l.d/1000);l.hr=Math.round(avg(hr.slice(l.i0+1,l.i1+1)));l.label=LN[l.s];l.rep=l.s==='rep'})}
    const zt=[0,0,0,0,0];hr.forEach((v,i)=>{if(i)zt[zoneOf(v)]+=pace[i]*.05});
    let up=0;for(let i=1;i<elev.length;i++)up+=Math.max(0,elev[i]-elev[i-1]);
    const temp=x.dow===0?+(x.tNight+.8).toFixed(1):+(x.tMax-2.5).toFixed(1),cadS=sm(cad,3),cadAvg=Math.round(avg(cad));
    return{kind:'run',title:x.runType,day:x.d,start:x.dow===0?6*60+50:18*60+40,place:'Malecón de La Habana',km,total:t,avgPace:t/km,best:Math.min(...splits.map(s=>s.p)),
      hrAvg:Math.round(avg(hr.slice(1))),hrMax:Math.max(...hr),cadAvg,stride:1000/(t/km)*60/cadAvg,up:Math.round(up),kcal:Math.round(km*68),power:Math.round(290+(series?18:0)+gg()*6),
      te:series?3.7:x.runType==='Tirada larga'?3.4:2.6,tea:series?2.6:.4,load:series?142:x.runType==='Tirada larga'?168:82,vo:+(8.4+gg()*.2).toFixed(1),gct:Math.round(244+gg()*5),
      sweat:Math.round(t/3600*(780+(temp-24)*60)),bbi:-Math.round(km*1.5),vo2:49,rpe:series?7:x.runType==='Tirada larga'?6:4,temp,hum:x.hum,wind:x.wind,windDir:'NE',
      dist,pace:sm(pace,series?1:3),hr,elev,cad:cadS,splits,laps,zt,track:null,demoRoute:true};
  }
  function cfDetail(x){
    const r=mulberry32(x.i*6271+7),gg=gaussOf(r),w=WOD[x.wod],wodMin=w.min;
    const ph=[[0,12,'Calentamiento'],[12,32,'Fuerza'],[34,34+wodMin,'WOD'],[34+wodMin,60,'Vuelta a la calma']];
    const tm=[],hr=[];let h=95;
    for(let s=0;s<=60;s+=.25){const target=s<12?112+s*1.2:s<32?(((s-12)%4)<1.2?148:118):s<34?122:s<34+wodMin?Math.min(178,158+(s-34)*3):Math.max(98,135-(s-34-wodMin)*3);h+=(target-h)*.25+gg()*.8;tm.push(s);hr.push(Math.round(h))}
    const zt=[0,0,0,0,0];hr.forEach(v=>zt[zoneOf(v)]+=15);
    const [lift,wts]=x.lift,sets=wts.map(kg=>({ex:lift,reps:5,kg,dur:Math.round(38+gg()*6)}));
    const prev=D.slice(0,x.i).reverse().find(y=>y.cf&&y.wod===x.wod);
    const prevRes=prev?(w.type==='amrap'?w.score.replace(/^(\d+)/,m=>String(+m-1)):mmss(w.score.split(':').reduce((a,b)=>a*60+ +b,0)+19)):null;
    return{kind:'cf',title:'CrossFit: '+x.wod,day:x.d,start:18*60+30,place:'CrossFit Habana',durS:3600,
      wod:{name:x.wod,desc:w.desc,result:w.score,rx:true,prev:prev?{result:prevRes,date:prev.d}:null},
      kcal:540+Math.round(gg()*25),hrAvg:Math.round(avg(hr)),hrMax:Math.max(...hr),te:3.2,tea:2.9,load:118,tm,hr,bands:ph.filter((p,i)=>i%2===0),phases:ph,zt,sets};
  }
  const PRS=[
    {n:'Sentadilla',u:'kg',best:140,date:'27 sep',isNew:true,hist:[['abr',125],['may',127.5],['jun',130],['jul',132.5],['ago',135],['sep',140]]},
    {n:'Fran',u:'time',best:261,date:'20 sep',isNew:true,hist:[['feb',312],['abr',295],['jun',283],['ago',270],['sep',261]]},
    {n:'Peso muerto',u:'kg',best:182.5,date:'12 ago',hist:[['mar',165],['abr',170],['may',172.5],['jun',177.5],['ago',182.5]]},
    {n:'Clean & jerk',u:'kg',best:100,date:'28 jul',hist:[['feb',90],['mar',92.5],['may',95],['jul',100]]},
    {n:'Snatch',u:'kg',best:80,date:'15 jul',hist:[['feb',70],['abr',75],['may',77.5],['jul',80]]},
    {n:'5 km en carrera',u:'time',best:1428,date:'2 jul',hist:[['ene',1545],['mar',1502],['may',1460],['jul',1428]]}
  ];
  const LD=['sep 2025','mar 2026','sep 2026'],lab=(n,u,lo,hi,h,desc)=>({n,u,lo,hi,desc,vals:h.map((v,i)=>({d:LD[i],v}))});
  const LABS=[lab('Glucosa','mg/dL',70,100,[94,91,88],'Glucosa en ayunas.'),lab('Colesterol total','mg/dL',null,200,[211,205,192],'Suma de todas las fracciones de colesterol.'),
    lab('LDL','mg/dL',null,130,[134,128,118],'Colesterol de baja densidad.'),lab('HDL','mg/dL',40,90,[52,54,58],'Colesterol de alta densidad; valores altos son favorables.'),
    lab('Triglicéridos','mg/dL',null,150,[110,96,84],'Grasas en sangre; sensibles al alcohol y a los azúcares.'),lab('Vitamina D','ng/mL',30,100,[24,27,31],'Valor cerca del límite inferior. Coméntalo con tu médico.'),
    lab('Ferritina','ng/mL',30,400,[81,88,96],'Reservas de hierro del organismo.')];
  return{
    mode:'demo',today:TODAY,now:NOW,days:D,hyp:HYP,
    meals:[{t:'07:25',n:'Desayuno',d:'Avena con plátano, huevos revueltos y café',k:640,p:38},{t:'10:30',n:'Media mañana',d:'Yogur griego con nueces y café',k:290,p:20}],
    acts,actDetail:async id=>{const a=acts.find(x=>x.id===id);return a.kind==='cf'?cfDetail(D[a.i]):runDetail(D[a.i])},
    prs:PRS,labs:LABS,
    sources:[['watch','Reloj Garmin','Actividades, GPS y frecuencia cardíaca en entreno','Garmin Connect','Demo'],['band','Garmin CIRQA','Sueño, HRV, SpO₂, estrés y Body Battery','Garmin Connect','Demo'],['phone','Apple Salud','Pasos y peso','Atajo de iOS','Demo'],['nutri','Registros de Self','Comidas, cafeína, alcohol, WOD y analíticas','Supabase','Demo'],['cloud','Open-Meteo','Clima de La Habana','API pública','Demo'],['brief','Summit y Órbita','Tareas, reuniones y hábitos','Supabase','Demo']],
    lastSync:'Modo demostración con datos ficticios',settings:null,
    saveSettings:async()=>{},save:async()=>{throw new Error('demo')},signOut:null
  };
}
