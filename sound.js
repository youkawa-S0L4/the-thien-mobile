// ================= sound.js — ÂM THANH CHO THẾ CHIẾN =================
// Nạp bằng <script src="sound.js"></script> TRƯỚC script chính của game. Xuất ra window.SND và window.snd.
// 100% tổng hợp bằng Web Audio (oscillator, noise, filter, envelope, FM) — không dùng file mẫu.
// Chuỗi tín hiệu: voice -> bus (sfx / nhạc / ambience) -> master -> compressor (limiter) -> loa.
// Nhạc nền là bản nhạc Re thứ do sequencer 16-step tự chơi, đổi lớp theo tình hình chiến sự.
window.SND=(()=>{
 const KEY='thechien_snd2',LV=[0,.3,.6,1];
 let C={m:2,s:2,x:0};
 try{const o=JSON.parse(localStorage.getItem(KEY));if(o&&LV[o.m]!==undefined&&LV[o.s]!==undefined)C={m:o.m,s:o.s,x:o.x?1:0};}catch(e){}
 let AC=null,mst,comp,sfxB,musIn,musLP,musB,ambB,revIn,nbuf,amb=null,ok=false,ended=false,inGame=false;
 let mood=0,moodS=0,lowSince=0,paused=false,onUI=null,timer=null,step=0,nextT=0;
 const clamp=(v,a,b)=>v<a?a:v>b?b:v,mf=n=>440*Math.pow(2,(n-69)/12),rr=(a,b)=>a+Math.random()*(b-a);
 const eff=k=>C.x?0:LV[C[k]];

 // ---------- khởi tạo chuỗi xử lý ----------
 function impulse(sec,decay){const n=AC.sampleRate*sec|0,b=AC.createBuffer(2,n,AC.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;for(let i=0;i<n;i++){const t=i/n;lp+=((Math.random()*2-1)-lp)*(.55-.45*t);d[i]=lp*Math.pow(1-t,decay)*2;}}return b;}
 function init(){
  if(AC)return;const K=window.AudioContext||window.webkitAudioContext;if(!K)return;
  AC=new K();
  comp=AC.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=14;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.22;
  mst=AC.createGain();mst.gain.value=.85;mst.connect(comp);comp.connect(AC.destination);
  sfxB=AC.createGain();musB=AC.createGain();ambB=AC.createGain();
  musIn=AC.createGain();musLP=AC.createBiquadFilter();musLP.type='lowpass';musLP.frequency.value=20000;musLP.Q.value=.5;
  musIn.connect(musLP);musLP.connect(musB);
  sfxB.connect(mst);musB.connect(mst);ambB.connect(mst);
  const rev=AC.createConvolver();rev.buffer=impulse(2.4,2.8);revIn=AC.createGain();
  const rg=AC.createGain();rg.gain.value=.5;revIn.connect(rev);rev.connect(rg);rg.connect(mst);
  const nb=AC.sampleRate*2|0;nbuf=AC.createBuffer(1,nb,AC.sampleRate);{const d=nbuf.getChannelData(0);for(let i=0;i<nb;i++)d[i]=Math.random()*2-1;}
  applyVol(true);
 }
 function applyVol(now){if(!AC)return;const t=AC.currentTime,k=now?.001:.06;
  sfxB.gain.setTargetAtTime(eff('s'),t,k);ambB.gain.setTargetAtTime(eff('s')*.8,t,k*3);musB.gain.setTargetAtTime(eff('m')*.9,t,k*2);}

 // ---------- phong bì & định tuyến ----------
 function adsr(p,t,v,a,d,s,dur,r){const hold=t+Math.max(a+d,dur),sv=Math.max(.0001,v*s);
  p.setValueAtTime(.0001,t);p.linearRampToValueAtTime(v,t+a);p.linearRampToValueAtTime(sv,t+a+d);p.setValueAtTime(sv,hold);p.linearRampToValueAtTime(.0001,hold+r);return hold+r;}
 function perc(p,t,v,a,dec){p.setValueAtTime(.0001,t);p.linearRampToValueAtTime(v,t+a);p.exponentialRampToValueAtTime(.0001,t+a+dec);return t+a+dec;}
 function route(n,o){
  if(o.pan&&AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=clamp(o.pan,-1,1);n.connect(p);n=p;}
  const d=o.dest||sfxB;n.connect(d);
  if(o.send){const s=AC.createGain();s.gain.value=o.send*(d===musIn?eff('m'):eff('s'));n.connect(s);s.connect(revIn);}
 }
 // ---------- khối âm cơ bản ----------
 function tone(o){
  const t=o.t,f=o.f,dur=o.dur||.2,v=o.vol??.2;
  const os=AC.createOscillator();os.type=o.type||'square';os.frequency.setValueAtTime(f,t);
  if(o.fend)os.frequency.exponentialRampToValueAtTime(Math.max(20,o.fend),t+(o.bt||dur));
  if(o.det)os.detune.value=o.det;
  let n=os;
  if(o.cut){const fl=AC.createBiquadFilter();fl.type=o.ft||'lowpass';fl.frequency.setValueAtTime(o.cut,t);
   if(o.cut2)fl.frequency.exponentialRampToValueAtTime(o.cut2,t+(o.ct||dur));fl.Q.value=o.q||.7;n.connect(fl);n=fl;}
  const g=AC.createGain();n.connect(g);
  const end=o.perc?perc(g.gain,t,v,o.a??.003,o.dec??dur):adsr(g.gain,t,v,o.a??.005,o.d??.06,o.s??.6,dur,o.r??.06);
  if(o.vib){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=o.vib[0];lg.gain.value=o.vib[1];l.connect(lg);lg.connect(os.detune);l.start(t);l.stop(end+.05);}
  route(g,o);os.start(t);os.stop(end+.05);
 }
 function noise(o){
  const t=o.t,dur=o.dur||.2,v=o.vol??.2;
  const s=AC.createBufferSource();s.buffer=nbuf;s.loop=true;let n=s;
  if(o.cut){const fl=AC.createBiquadFilter();fl.type=o.ft||'lowpass';fl.frequency.setValueAtTime(o.cut,t);
   if(o.cut2)fl.frequency.exponentialRampToValueAtTime(o.cut2,t+(o.ct||dur));fl.Q.value=o.q||.7;n.connect(fl);n=fl;}
  const g=AC.createGain();n.connect(g);
  const end=o.sus?adsr(g.gain,t,v,o.a??.01,o.d??.05,o.s??.7,dur,o.r??.1):perc(g.gain,t,v,o.a??.002,o.dec??dur);
  route(g,o);s.start(t,Math.random()*1.5);s.stop(end+.05);
 }
 function bell(t,f,v,dur,o={}){ // chuông FM
  const c=AC.createOscillator(),m=AC.createOscillator(),mg=AC.createGain(),g=AC.createGain();
  c.frequency.value=f;m.frequency.value=f*(o.ratio||3.51);
  mg.gain.setValueAtTime(f*(o.idx||2.2),t);mg.gain.exponentialRampToValueAtTime(f*.02,t+dur);
  m.connect(mg);mg.connect(c.frequency);c.connect(g);const end=perc(g.gain,t,v,.002,dur);
  route(g,{dest:o.dest,pan:o.pan,send:o.send??.4});c.start(t);m.start(t);c.stop(end+.05);m.stop(end+.05);
 }
 // ---------- nhạc cụ ----------
 function brass(t,f,dur,v,o={}){ // kèn đồng: 2 saw lệch cao độ, bộ lọc mở dần, rung nhẹ
  for(const d of[-7,7])tone({t,f,type:'sawtooth',dur,vol:v*.55,det:d,a:o.a??.035,d:.09,s:.72,r:o.r??.12,cut:f*2.2,cut2:f*5.5,ct:Math.max(.14,o.a??0),q:1.2,vib:[5.4,5],dest:o.dest,pan:o.pan,send:o.send??.25});
 }
 function strings(t,f,dur,v,dest){for(const d of[-11,0,11])tone({t,f,type:'sawtooth',dur,vol:v*.4,det:d,a:.6,d:.3,s:.8,r:.8,cut:1300,q:.5,dest,send:.35,vib:[4.6,3]});}
 function bass(t,f,dur,v,dest){
  tone({t,f,type:'sawtooth',dur,vol:v*.7,a:.01,d:.08,s:.7,r:.06,cut:f*5,cut2:f*1.8,ct:dur,q:1.5,dest});
  tone({t,f,type:'sine',dur,vol:v*.9,a:.01,d:.05,s:.9,r:.05,dest});}
 function flute(t,f,dur,v,dest){
  tone({t,f,type:'triangle',dur,vol:v,a:.06,d:.1,s:.8,r:.1,vib:[5,7],dest,send:.4});
  noise({t,dur,sus:true,a:.06,d:.05,s:.7,r:.1,vol:v*.5,ft:'bandpass',cut:f*2,q:2,dest});}
 function pluck(t,f,v,dest){
  tone({t,f,type:'triangle',perc:true,dec:.5,vol:v,dest,send:.5});
  tone({t,f:f*2,type:'sine',perc:true,dec:.2,vol:v*.4,dest,send:.5});}
 const kick=(t,v,d)=>{tone({t,f:150,fend:45,bt:.12,type:'sine',perc:true,dec:.28,vol:v,dest:d});noise({t,dec:.02,vol:v*.5,ft:'lowpass',cut:2500,dest:d});};
 const snare=(t,v,d,s)=>{noise({t,dec:.16,vol:v*2,ft:'bandpass',cut:1900,q:.8,dest:d,send:s??.1});tone({t,f:210,fend:150,bt:.06,type:'triangle',perc:true,dec:.09,vol:v*.6,dest:d});};
 const hat=(t,v,d,open)=>noise({t,dec:open?.18:.04,vol:v*2.5,ft:'highpass',cut:7500,dest:d});
 const timp=(t,v,d)=>{tone({t,f:96,fend:62,bt:.4,type:'sine',perc:true,dec:.9,vol:v,dest:d,send:.5});tone({t,f:48,type:'sine',perc:true,dec:.6,vol:v*.5,dest:d});noise({t,dec:.05,vol:v*.9,ft:'lowpass',cut:600,dest:d});};
 const cymbal=(t,v,dur,d)=>noise({t,dec:dur,vol:v,ft:'highpass',cut:6000,dest:d,send:.3});

 // ---------- hiệu ứng âm thanh ----------
 const FX={
  ui(o,t){tone({t,f:1320,type:'square',perc:true,dec:.04,vol:.07,cut:3500});},
  tick(o,t){tone({t,f:880,type:'triangle',perc:true,dec:.05,vol:.12});},
  city(o,t){tone({t,f:523,type:'triangle',perc:true,dec:.09,vol:.14});tone({t:t+.06,f:784,type:'triangle',perc:true,dec:.14,vol:.14,send:.2});},
  select(o,t){tone({t,f:659,type:'square',perc:true,dec:.05,vol:.09,cut:3000});tone({t:t+.05,f:988,type:'square',perc:true,dec:.07,vol:.09,cut:3000});noise({t,dec:.03,vol:.1,ft:'highpass',cut:4000});},
  deselect(o,t){tone({t,f:700,fend:420,bt:.08,type:'square',perc:true,dec:.08,vol:.07,cut:2500});},
  order(o,t){snare(t,.18,sfxB,.05);snare(t+.06,.13,sfxB,.05);brass(t+.1,392,.14,.12,{send:.15});},
  error(o,t){tone({t,f:160,fend:120,type:'sawtooth',dur:.09,vol:.13,cut:900});tone({t:t+.11,f:150,fend:105,type:'sawtooth',dur:.12,vol:.13,cut:900});},
  deny(o,t){tone({t,f:440,type:'triangle',dur:.12,vol:.14,a:.005,r:.05});tone({t:t+.13,f:330,type:'triangle',dur:.22,vol:.14,a:.005,r:.12,send:.2});},
  hit(o,t){const ty=o.t||'i',g=o.g??1,p=o.pan;
   if(ty==='a'){ // pháo: nổ trầm + dư âm
    noise({t,dec:.55,vol:1.2*g,ft:'lowpass',cut:700,cut2:90,ct:.5,pan:p,send:.45});
    tone({t,f:80,fend:26,bt:.4,type:'sine',perc:true,dec:.6,vol:.6*g,pan:p,send:.3});
    noise({t:t+.12,dec:.25,vol:.4*g,ft:'bandpass',cut:300,pan:p,send:.5});
   }else if(ty==='t'){ // xe tăng: nổ đại bác + tiếng giáp kêu
    noise({t,dec:.28,vol:.8*g,ft:'lowpass',cut:1800,cut2:200,ct:.25,pan:p,send:.3});
    tone({t,f:130,fend:45,bt:.2,type:'sine',perc:true,dec:.3,vol:.5*g,pan:p});
    tone({t:t+.07,f:310,type:'square',perc:true,dec:.2,vol:.1*g,ft:'bandpass',cut:1500,q:6,pan:p});
   }else{ // bộ binh: loạt súng trường
    const n=2+(o.big?2:0)+(Math.random()*2|0);
    for(let q=0;q<n;q++){const tt=t+q*rr(.025,.07);
     noise({t:tt,dec:.07,vol:rr(.2,.34)*g,ft:'highpass',cut:rr(1200,2200),pan:p,send:.2});
     tone({t:tt,f:rr(150,210),fend:60,bt:.05,type:'sine',perc:true,dec:.08,vol:.18*g,pan:p});}
   }},
  die(o,t){const g=o.g??1,p=o.pan;tone({t,f:120,fend:40,bt:.35,type:'sawtooth',perc:true,dec:.4,vol:.25*g,cut:500,pan:p,send:.3});noise({t,dec:.3,vol:.45*g,ft:'lowpass',cut:900,cut2:150,ct:.3,pan:p});},
  cap(o,t){tone({t,f:988,type:'square',dur:.06,vol:.12,a:.002,d:.01,s:1,r:.02,cut:5000});tone({t:t+.06,f:1319,type:'square',dur:.22,vol:.12,a:.002,d:.05,s:.5,r:.15,cut:5000,send:.2});},
  cityCap(o,t){[[392,0,.1],[494,.11,.1],[587,.22,.1],[784,.33,.55]].forEach(([f,d,l])=>brass(t+d,f,l,.2,{send:.3}));
   timp(t,.3);cymbal(t+.33,.18,.8);bell(t+.33,1568,.08,1.2,{send:.6});},
  lost(o,t){brass(t,147,.4,.2,{send:.4});brass(t,175,.4,.16,{send:.4});timp(t,.3);},
  lostCity(o,t){brass(t,147,.5,.24,{send:.5});brass(t,175,.5,.2,{send:.5});brass(t+.35,131,.8,.24,{send:.5});timp(t,.4);timp(t+.35,.4);},
  war(o,t){brass(t,73.4,1.5,.34,{a:.35,r:.5,send:.5});brass(t,110,1.5,.26,{a:.4,r:.5,send:.5});
   timp(t,.5);timp(t+.5,.45);timp(t+1,.55);cymbal(t+1,.14,1.2);
   for(let q=0;q<8;q++)snare(t+1.1+q*.07,.06+q*.02,sfxB,.15);},
  war2(o,t){brass(t,98,.9,.12,{a:.25,r:.4,send:.6});timp(t,.2);},
  peace(o,t){[523,659,784,1047].forEach((f,q)=>bell(t+q*.18,f,.2,1.6,{send:.6}));},
  pact(o,t){bell(t,587,.2,1.2,{send:.5});bell(t+.15,880,.2,1.4,{send:.5});brass(t+.15,294,.5,.08,{a:.15});},
  train(o,t){noise({t,dec:.05,vol:.4,ft:'bandpass',cut:3200,q:2});tone({t:t+.04,f:150,type:'square',perc:true,dec:.07,vol:.15,cut:900});
   const ty=o.t||'i';
   if(ty==='i'){brass(t+.1,392,.08,.14,{send:.1});brass(t+.19,523,.18,.14,{send:.2});}
   else if(ty==='t'){tone({t:t+.1,f:40,fend:95,bt:.5,type:'sawtooth',dur:.6,vol:.2,a:.05,r:.15,cut:320,q:2});noise({t:t+.1,dur:.6,sus:true,a:.05,vol:.25,ft:'lowpass',cut:260,r:.15});}
   else{for(let q=0;q<5;q++)noise({t:t+.1+q*.045,dec:.03,vol:.3,ft:'bandpass',cut:4200,q:4});tone({t:t+.36,f:90,fend:50,bt:.2,type:'sine',perc:true,dec:.3,vol:.4});}},
  trainGen(o,t){FX.train(o,t);},
  build(o,t){for(let q=0;q<3;q++){const tt=t+q*.17;bell(tt,rr(400,440),.18,.35,{ratio:2.76,idx:3,send:.25});noise({t:tt,dec:.03,vol:.35,ft:'bandpass',cut:3000,q:1.5});}},
  upgrade(o,t){[72,76,79,84,88].forEach((n,q)=>tone({t:t+q*.06,f:mf(n),type:'square',dur:.06,vol:.1,a:.002,d:.01,s:.8,r:.05,cut:4500,send:.3}));bell(t+.32,1319,.12,1.2,{send:.5});},
  medal(o,t){bell(t,1047,.2,1.4,{send:.5});bell(t+.05,1568,.15,1.6,{send:.5});brass(t,262,.4,.15,{send:.3});brass(t,392,.4,.12,{send:.3});},
  rest(o,t){tone({t,f:400,fend:900,bt:.3,type:'sine',dur:.3,vol:.12,a:.02,r:.1,vib:[9,40],send:.2});},
  split(o,t){tone({t,f:800,type:'triangle',perc:true,dec:.06,vol:.12,pan:-.6});tone({t:t+.05,f:1000,type:'triangle',perc:true,dec:.07,vol:.12,pan:.6});},
  event(o,t){noise({t,dur:.4,sus:true,a:.05,d:.1,s:.6,r:.2,vol:.45,ft:'bandpass',cut:800,cut2:3500,ct:.35,q:1.2});brass(t+.25,294,.25,.14);brass(t+.45,392,.45,.15,{send:.4});},
  mission(o,t){[[392,0,.1],[392,.12,.1],[392,.24,.1],[523,.36,.5]].forEach(([f,d,l])=>brass(t+d,f,l,.2,{send:.3}));timp(t,.3);cymbal(t+.36,.25,.9);},
  alarm(o,t){for(let q=0;q<4;q++)tone({t:t+q*.13,f:q%2?660:880,type:'square',dur:.11,vol:.1,a:.004,r:.02,cut:2500});},
  rebel(o,t){timp(t,.35);brass(t,185,.3,.15,{send:.3});brass(t,196,.3,.15,{send:.3});},
  fall(o,t){[392,349,330,294].forEach((f,q)=>brass(t+q*.45,f,.5,.2,{a:.1,r:.3,send:.6}));timp(t,.5);timp(t+.9,.5);},
  landed(o,t){noise({t,dec:.7,vol:.6,ft:'bandpass',cut:500,cut2:2200,ct:.2,q:.6,send:.4});brass(t+.1,175,.3,.12,{send:.4});},
  ship(o,t){brass(t,98,.7,.2,{a:.12,r:.3,send:.5});noise({t,dur:.9,sus:true,a:.3,vol:.35,ft:'bandpass',cut:600,q:.6,r:.4});},
  pause(o,t){tone({t,f:600,fend:300,bt:.12,type:'sine',dur:.12,vol:.1,r:.04});},
  resume(o,t){tone({t,f:300,fend:600,bt:.12,type:'sine',dur:.12,vol:.1,r:.04});},
  speed(o,t){tone({t,f:500+(o.n||0)*150,type:'square',perc:true,dec:.05,vol:.07,cut:3000});},
  autoOn(o,t){[523,659,784].forEach((f,q)=>tone({t:t+q*.05,f,type:'square',dur:.05,vol:.09,cut:3500,r:.03}));},
  autoOff(o,t){[784,659,523].forEach((f,q)=>tone({t:t+q*.05,f,type:'square',dur:.05,vol:.09,cut:3500,r:.03}));},
  march(o,t){const l=(o.k=(o.k||0)+1)&1;tone({t,f:110,fend:70,bt:.1,type:'sine',perc:true,dec:.12,vol:.09,pan:l?-.2:.2});noise({t:t+.01,dec:.05,vol:.1,ft:'bandpass',cut:900,pan:l?-.2:.2});},
  begin(o,t){timp(t,.5);timp(t+.3,.45);brass(t,294,.25,.18,{send:.4});brass(t+.2,392,.25,.18,{send:.4});brass(t+.4,440,.9,.2,{send:.5});cymbal(t+.4,.14,1);},
  win(o,t){const S=[[262,0,.14],[262,.16,.14],[262,.32,.14],[330,.48,.3],[392,.8,.3],[523,1.12,1.4]];
   S.forEach(([f,d,l])=>{brass(t+d,f,l,.22,{send:.4});brass(t+d,f*1.5,l,.12,{send:.4});});
   for(let q=0;q<6;q++)timp(t+q*.16,.25+q*.04);timp(t+1.12,.6);cymbal(t+1.12,.25,2);
   [1047,1319,1568,2093].forEach((f,q)=>bell(t+1.4+q*.15,f,.14,2.4,{send:.7}));},
  lose(o,t){[[294,0,.8],[262,.9,.8],[233,1.8,.8],[220,2.7,2]].forEach(([f,d,l])=>{brass(t+d,f,l,.22,{a:.2,r:.5,send:.6});brass(t+d,f/2,l,.18,{a:.2,r:.5,send:.6});});
   timp(t,.5);timp(t+.9,.45);timp(t+1.8,.45);timp(t+2.7,.6);strings(t+.2,mf(50),3.5,.7,sfxB);}
 };
 const TH={hit:70,die:120,march:380,alarm:1500,ui:30,tick:40,select:40,deselect:40,cap:80,cityCap:200,war2:800,lost:250,lostCity:400,upgrade:120,speed:50};
 const last={};
 function play(n,o){
  if(!AC||AC.state!=='running'||!eff('s'))return;const f=FX[n];if(!f)return;
  const ms=TH[n]||0,tn=performance.now();if(ms&&tn-(last[n]||0)<ms)return;last[n]=tn;
  try{f(o||{},AC.currentTime+.01);}catch(e){}
 }

 // ---------- nhạc nền: Re thứ, 92 BPM, 8 ô nhịp ----------
 const SP=60/92/4;
 const PROG=[[50,[62,65,69]],[46,[58,62,65]],[43,[55,58,62]],[45,[57,61,64]],[50,[62,65,69]],[41,[57,60,65]],[48,[60,64,67]],[45,[57,61,64]]];
 const MEL=[
  [[0,69,6],[6,70,2],[8,74,4],[12,72,2],[14,70,2]],
  [[0,70,4],[4,74,4],[8,77,6],[14,76,2]],
  [[0,74,4],[4,70,4],[8,67,4],[12,70,2],[14,72,2]],
  [[0,73,6],[6,76,2],[8,73,2],[10,69,2],[12,76,4]],
  [[0,74,6],[6,77,2],[8,81,4],[12,79,2],[14,77,2]],
  [[0,77,4],[4,81,4],[8,79,4],[12,77,2],[14,76,2]],
  [[0,76,4],[4,79,4],[8,76,4],[12,74,2],[14,72,2]],
  [[0,73,4],[4,74,2],[6,76,2],[8,76,8]]];
 function stepMusic(s,t){
  const bar=s>>4,sb=s&15,root=PROG[bar][0],ch=PROG[bar][1],d=musIn,m=moodS;
  if(sb===0)for(const n of ch)strings(t,mf(n),SP*16,[.55,.7,.85][m],d);
  // bass
  if(m===0){if(sb===0)bass(t,mf(root),SP*14,.2,d);}
  else if(m===1){if(sb===0||sb===8)bass(t,mf(root),SP*6,.24,d);else if(sb===12)bass(t,mf(root+7),SP*3,.18,d);}
  else if(sb%2===0)bass(t,mf(sb%8===6?root+7:root),SP*1.6,sb%4===0?.3:.2,d);
  // nhịp
  if(m>=1){
   if(m===1){if(sb===0)kick(t,.4,d);if(sb%4===2)hat(t,.04,d);if(bar%4===0&&sb===0)timp(t,.3,d);}
   else{
    if(sb===0||sb===8||(sb===10&&bar%2))kick(t,.6,d);
    if(sb===4||sb===12)snare(t,.3,d,.12);
    if(sb===7||sb===15)snare(t,.1,d,.05);
    if(bar===7&&sb>=12)snare(t,.16+(sb-12)*.05,d,.15);
    if(sb%2===0)hat(t,.045,d,sb===14);
    if(sb===0)timp(t,.4,d);
   }
  }
  // giai điệu
  if(m===0){
   if(sb%4===0)pluck(t,mf(ch[[0,1,2,1][sb>>2]]+12),.09,d);
   if(sb===0&&bar%4===0)bell(t,mf(ch[2]+24),.05,2.4,{dest:d,send:.7});
  }else for(const e of MEL[bar])if(e[0]===sb){
   const f=mf(e[1]),l=e[2]*SP*.95;
   if(m===1)flute(t,f,l,.16,d);
   else{brass(t,f,l,.17,{dest:d,send:.3});brass(t,f/2,l,.08,{dest:d,send:.2});flute(t,f*2,l,.05,d);}
  }
 }
 function sched(){
  if(!AC||AC.state!=='running')return;
  if(ended||!eff('m')){nextT=AC.currentTime+.15;return;}
  if(nextT<AC.currentTime-.4)nextT=AC.currentTime+.05;
  while(nextT<AC.currentTime+.3){
   if((step&15)===0)moodS=mood;
   try{stepMusic(step,nextT);}catch(e){}
   nextT+=SP;step=(step+1)&127;
  }
 }
 function startMusic(){if(timer)return;nextT=AC.currentTime+.1;step=0;timer=setInterval(sched,50);}

 // ---------- nền: sóng biển, gió, sấm xa khi có chiến tranh ----------
 function startAmb(){
  if(amb)return;
  const mk=(ft,f,q)=>{const s=AC.createBufferSource();s.buffer=nbuf;s.loop=true;const fl=AC.createBiquadFilter();fl.type=ft;fl.frequency.value=f;fl.Q.value=q;
   const g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(ambB);s.start(0,Math.random()*1.5);return{g,fl};};
  const lfo=(p,hz,depth)=>{const o=AC.createOscillator(),og=AC.createGain();o.frequency.value=hz;og.gain.value=depth;o.connect(og);og.connect(p);o.start();};
  const wave=mk('lowpass',420,.5),wind=mk('bandpass',900,2.2),rum=mk('lowpass',110,.7);
  wave.g.gain.value=.55;lfo(wave.g.gain,.11,.4);lfo(wave.fl.frequency,.07,180);
  wind.g.gain.value=.2;lfo(wind.g.gain,.05,.15);lfo(wind.fl.frequency,.03,300);
  amb={rum};setRumble();
 }
 function setRumble(){if(!amb)return;amb.rum.g.gain.setTargetAtTime(inGame?[0,.5,1.6][mood]:0,AC.currentTime,1.5);}

 // ---------- điều khiển từ game ----------
 function setMood(m,force){
  if(force){mood=m;lowSince=0;}
  else if(m>mood){mood=m;lowSince=0;}
  else if(m<mood){const n=Date.now();if(!lowSince)lowSince=n;if(n-lowSince>8000){mood=m;lowSince=0;}}
  else lowSince=0;
  setRumble();
 }
 function setPaused(p){if(p===paused)return;paused=p;if(AC)musLP.frequency.setTargetAtTime(p?800:20000,AC.currentTime,.08);}
 function started(){if(AC.state!=='running')return;ok=true;startMusic();startAmb();}
 function unlock(){
  if(ok)return;init();if(!AC)return;
  if(AC.state==='running')started();else{try{const p=AC.resume();if(p&&p.then)p.then(started,()=>{});}catch(e){}}
 }
 ['pointerup','touchend','click','keydown'].forEach(ev=>addEventListener(ev,unlock,{capture:true,passive:true}));
 document.addEventListener('visibilitychange',()=>{if(!AC||!ok)return;try{document.hidden?AC.suspend():AC.resume();}catch(e){}});
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(C));}catch(e){}};
 return{
  play,unlock,mood:setMood,pause:setPaused,names:()=>Object.keys(FX),
  _sched:sched,_ac:()=>AC,
  game(on){inGame=on;ended=false;setMood(0,true);if(AC&&ok){step=0;nextT=AC.currentTime+.1;}},
  end(win){ended=true;setMood(0,true);setPaused(false);play(win?'win':'lose');},
  get:()=>C,
  set(k,v){C[k]=v;save();applyVol();if(k==='s')play('select');if(onUI)onUI();},
  toggleMute(){C.x=C.x?0:1;save();applyVol();if(onUI)onUI();},
  onUI(f){onUI=f;}
 };
})();
window.snd=(n,o)=>window.SND.play(n,o);
