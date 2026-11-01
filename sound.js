/* Thế Chiến — âm thanh tổng hợp bằng WebAudio (không cần file mp3).
   Nhạc nền phát sinh theo tình hình: menu / yên bình / căng thẳng / chiến tranh / thắng / thua.
   Hiệu ứng nhiều lớp (đại bác, súng trường, kèn đồng, chuông, trống timpani, hành quân...). */
(()=>{
const AC=window.AudioContext||window.webkitAudioContext,LV=[0,.3,.6,1];
let ctx,sb,mb,rv,NB,st={m:2,s:2,x:0},cbs=[],moodV=0,inGame=false,paused=false,ended=null,seq=null,trk='';
const last={};
try{Object.assign(st,JSON.parse(localStorage.getItem('thechien_snd')||'{}'));}catch(e){}
const notify=()=>{try{localStorage.setItem('thechien_snd',JSON.stringify(st));}catch(e){}cbs.forEach(f=>f());};
const mtof=n=>440*Math.pow(2,(n-69)/12);
function vol(){if(!ctx)return;const t=ctx.currentTime;sb.gain.setTargetAtTime(st.x?0:LV[st.s],t,.03);mb.gain.setTargetAtTime(st.x?0:LV[st.m]*.5*(paused?.35:1),t,.15);}
function setup(c){ctx=c;const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;comp.connect(c.destination);
 sb=c.createGain();mb=c.createGain();sb.connect(comp);mb.connect(comp);
 const len=c.sampleRate*2.4|0,imp=c.createBuffer(2,len,c.sampleRate);for(let h=0;h<2;h++){const d=imp.getChannelData(h);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8);}
 rv=c.createConvolver();rv.buffer=imp;const rg=c.createGain();rg.gain.value=.55;rv.connect(rg);rg.connect(comp);
 const a=c.createGain(),b=c.createGain();a.gain.value=.2;b.gain.value=.38;sb.connect(a);a.connect(rv);mb.connect(b);b.connect(rv);
 NB=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;vol();}
// ---- khối dựng âm ----
function env(g,t,a,d,v){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(v,.0002),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
function osc(o,type,f,t,a,d,v,f2){const s=ctx.createOscillator(),g=ctx.createGain();s.type=type;s.frequency.setValueAtTime(f,t);if(f2)s.frequency.exponentialRampToValueAtTime(f2,t+a+d);env(g,t,a,d,v);s.connect(g);g.connect(o);s.start(t);s.stop(t+a+d+.05);}
function nz(o,t,a,d,v,ft,f0,f1,q){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=NB;s.loop=true;f.type=ft;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+a+d);f.Q.value=q||1;env(g,t,a,d,v);s.connect(f);f.connect(g);g.connect(o);s.start(t,Math.random());s.stop(t+a+d+.05);}
const LP=(o,f,q)=>{const b=ctx.createBiquadFilter();b.type='lowpass';b.frequency.value=f;b.Q.value=q||.7;b.connect(o);return b;};
function brass(o,f,t,d,v){const b=ctx.createBiquadFilter(),g=ctx.createGain();b.type='lowpass';b.Q.value=1.5;b.frequency.setValueAtTime(f*1.4,t);b.frequency.linearRampToValueAtTime(f*5,t+.12);b.frequency.linearRampToValueAtTime(f*2.6,t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.06);g.gain.setValueAtTime(v,t+Math.max(.07,d-.08));g.gain.linearRampToValueAtTime(.0001,t+d+.14);
 [-7,7].forEach(c=>{const s=ctx.createOscillator();s.type='sawtooth';s.frequency.value=f;s.detune.value=c;s.connect(b);s.start(t);s.stop(t+d+.2);});b.connect(g);g.connect(o);}
function strings(o,f,t,d,v){const b=ctx.createBiquadFilter(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();b.type='lowpass';b.frequency.value=Math.min(f*4,5000);b.Q.value=.5;
 g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.4,d*.4));g.gain.setValueAtTime(v,t+d*.7);g.gain.linearRampToValueAtTime(.0001,t+d+.3);
 l.frequency.value=5.2;lg.gain.value=f*.004;l.connect(lg);l.start(t);l.stop(t+d+.4);
 [-12,0,12].forEach(c=>{const s=ctx.createOscillator();s.type='sawtooth';s.frequency.value=f;s.detune.value=c;lg.connect(s.frequency);s.connect(b);s.start(t);s.stop(t+d+.4);});b.connect(g);g.connect(o);}
function pluck(o,f,t,v){osc(o,'triangle',f,t,.003,.6,v);osc(o,'sine',f*2,t,.003,.3,v*.35);}
function timp(o,t,v){osc(o,'sine',118,t,.004,.55,v,46);nz(o,t,.002,.07,v*.45,'lowpass',1000);}
function snare(o,t,v){nz(o,t,.001,.17,v,'highpass',1800);osc(o,'triangle',200,t,.001,.09,v*.5,120);}
function bell(o,f,t,v,d){[1,2.76,5.4,8.9].forEach((m,i)=>osc(o,'sine',f*m,t,.002,(d||1.6)/(i+1),v/(i+1)));}
function gong(o,t,f,v){[1,1.47,2.09,2.55,3.1].forEach((m,i)=>osc(o,'sine',f*m,t,.005,3/(i+1),v/(i+1)));nz(o,t,.01,1.5,v*.2,'bandpass',900,300);}
// ---- hiệu ứng ----
const X={
ui:(t,o)=>{osc(o,'triangle',1500,t,.001,.05,.25,900);nz(o,t,.001,.03,.2,'bandpass',3000,0,2);},
tick:(t,o)=>{osc(o,'sine',260,t,.002,.07,.4,150);},
select:(t,o)=>{brass(o,mtof(62),t,.12,.16);brass(o,mtof(69),t+.08,.16,.16);},
deselect:(t,o)=>{brass(o,mtof(69),t,.1,.13);brass(o,mtof(62),t+.08,.14,.13);},
city:(t,o)=>{bell(o,mtof(74),t,.22,1.8);bell(o,mtof(81),t+.12,.14,1.4);},
cap:(t,o)=>{[62,66,69,74].forEach((n,i)=>brass(o,mtof(n),t+i*.09,i==3?.5:.1,.18));timp(o,t,.5);},
cityCap:(t,o)=>{[57,62,66,69,74,78].forEach((n,i)=>brass(o,mtof(n),t+i*.1,i>4?.9:.12,.17));timp(o,t,.6);timp(o,t+.5,.5);bell(o,mtof(86),t+.6,.14,2);},
lost:(t,o)=>{brass(o,mtof(50),t,.5,.2);brass(o,mtof(47),t+.35,.8,.2);timp(o,t,.6);},
lostCity:(t,o)=>{[50,47,43].forEach((n,i)=>brass(o,mtof(n),t+i*.4,i==2?1.2:.45,.22));timp(o,t,.55);timp(o,t+.8,.55);gong(o,t+.8,mtof(36),.2);},
pause:(t,o)=>{osc(o,'sine',520,t,.002,.12,.3,260);},
resume:(t,o)=>{osc(o,'sine',260,t,.002,.12,.3,520);},
begin:(t,o)=>{for(let i=0;i<8;i++)timp(o,t+i*.09,.25+i*.06);[50,57,62].forEach((n,i)=>brass(o,mtof(n),t+.5+i*.05,1.3,.16));},
event:(t,o)=>{bell(o,mtof(67),t,.2,1.2);bell(o,mtof(72),t+.18,.2,1.5);},
march:(t,o)=>{for(let i=0;i<4;i++){const u=t+i*.28;nz(o,u,.003,.09,.3,'lowpass',700,300);osc(o,'sine',90,u,.003,.12,.25,55);nz(o,u+.14,.002,.05,.12,'highpass',3500);}},
mission:(t,o)=>{[72,76,79,84].forEach((n,i)=>bell(o,mtof(n),t+i*.1,.18,1.4));},
ship:(t,o)=>{[110,138].forEach(f=>osc(LP(o,500,1),'sawtooth',f,t,.15,1.3,.2));nz(o,t,.5,1.2,.08,'lowpass',400);},
speed:(t,o,p)=>{const n=(p&&p.n)||0;nz(o,t,.01,.12,.3,'bandpass',800+n*500,2400+n*700,3);osc(o,'square',300+n*120,t,.001,.06,.07);},
train:(t,o)=>{bell(o,880,t,.15,.5);nz(o,t,.001,.05,.35,'highpass',4000);osc(o,'square',220,t+.06,.001,.05,.1);nz(o,t+.12,.001,.05,.3,'highpass',3000);},
war:(t,o)=>{for(let i=0;i<7;i++){const u=t+Math.random()*.5;nz(o,u,.001,.09,.32,'bandpass',1800+Math.random()*1200,500,1);osc(o,'sine',140,u,.001,.06,.2,70);}},
war2:(t,o)=>{osc(o,'sine',95,t,.005,.9,.55,28);nz(o,t,.003,.7,.4,'lowpass',2200,120);nz(o,t,.001,.05,.3,'highpass',2500);},
hit:(t,o)=>{osc(o,'sine',180,t,.002,.14,.6,60);nz(o,t,.001,.07,.4,'bandpass',1500,600,1);},
die:(t,o)=>{osc(o,'sine',140,t,.003,.5,.6,35);nz(o,t,.005,.4,.35,'lowpass',1200,150);},
alarm:(t,o)=>{for(let i=0;i<4;i++)osc(LP(o,2200,1),'sawtooth',i%2?640:880,t+i*.22,.01,.2,.15);},
error:(t,o)=>{const l=LP(o,500,2);osc(l,'square',140,t,.005,.12,.2);osc(l,'square',120,t+.14,.005,.16,.2);},
deny:(t,o)=>{brass(o,mtof(52),t,.12,.17);brass(o,mtof(46),t+.14,.2,.17);},
fall:(t,o)=>{gong(o,t,mtof(38),.3);osc(o,'sine',80,t,.01,1.6,.5,24);nz(o,t,.02,1.6,.25,'lowpass',900,100);},
pact:(t,o)=>{osc(o,'sine',120,t,.002,.2,.8,50);nz(o,t,.001,.05,.4,'lowpass',1200);[62,66,69].forEach(n=>strings(o,mtof(n),t+.15,.9,.1));bell(o,mtof(81),t+.2,.12,1.4);},
peace:(t,o)=>{[62,66,69,74].forEach((n,i)=>strings(o,mtof(n),t+i*.06,1.8,.1));bell(o,mtof(86),t+.5,.1,2);},
rebel:(t,o)=>{for(let i=0;i<8;i++)timp(o,t+i*.07,.2+i*.05);brass(o,mtof(45),t+.1,.7,.18);nz(o,t,.2,.6,.1,'bandpass',1000,300);},
upgrade:(t,o)=>{[69,74,78,81,86].forEach((n,i)=>{osc(o,'triangle',mtof(n),t+i*.06,.003,.35,.16);osc(o,'sine',mtof(n)*2,t+i*.06,.003,.25,.06);});nz(o,t,.001,.25,.05,'highpass',6000);},
build:(t,o)=>{for(let i=0;i<3;i++){const u=t+i*.17;osc(o,'triangle',900+i*120,u,.001,.08,.2,500);nz(o,u,.001,.06,.35,'bandpass',2500,1000,2);osc(o,'sine',140,u,.002,.08,.35,80);}},
split:(t,o)=>{nz(o,t,.02,.16,.25,'bandpass',500,2500,2);nz(o,t+.08,.02,.16,.25,'bandpass',2500,500,2);},
rest:(t,o)=>{[50,57,62].forEach(n=>strings(o,mtof(n),t,.7,.08));},
medal:(t,o)=>{brass(o,mtof(67),t,.12,.18);brass(o,mtof(74),t+.12,.5,.2);bell(o,mtof(86),t+.12,.14,2);},
order:(t,o)=>{snare(o,t,.45);brass(o,mtof(57),t,.12,.18);},
landed:(t,o)=>{osc(o,'sine',100,t,.003,.3,.7,40);nz(o,t,.05,.6,.35,'bandpass',900,300,.8);timp(o,t+.15,.4);},
autoOn:(t,o)=>{bell(o,mtof(72),t,.14,.5);bell(o,mtof(79),t+.1,.14,.7);},
autoOff:(t,o)=>{bell(o,mtof(79),t,.14,.5);bell(o,mtof(72),t+.1,.14,.7);}
};
// ---- nhạc nền ----
const CH={
menu:[[50,57,62,65],[46,53,58,62],[43,50,55,58],[45,52,57,61]],
peace:[[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]]};
const TR={
menu:{s:60/68/4,step(i,t,o,s){const b=i>>4&3,k=i&15,c=CH.menu[b];
 if(k==0){c.forEach(n=>strings(o,mtof(n),t,16*s,.065));timp(o,t,.5);brass(o,mtof([74,70,67,69][b]),t+s*2,6*s,.075);}
 if(k==8)timp(o,t,.22);if(k==12&&b&1)bell(o,mtof([81,77,74,76][b]),t,.07,2);}},
peace:{s:60/84/4,step(i,t,o,s){const b=i>>4&3,k=i&15,c=CH.peace[b];
 if(k==0){c.forEach(n=>strings(o,mtof(n),t,16*s,.04));timp(o,t,.14);}
 if(!(k&1)){const p=[0,2,1,3,2,3,1,2][k>>1];pluck(o,mtof(c[p]+12+(k==8?12:0)),t,.09);}}},
tension:{s:60/96/4,step(i,t,o,s){const b=i>>5&3,k=i&15,r=[38,34,36,33][b];
 if(!(k&1))strings(o,mtof(r+(k%8==6?7:0)),t,2*s,k%4==0?.11:.07);
 if(i%32==0){strings(o,mtof(62),t,32*s,.035);strings(o,mtof(63),t,32*s,.03);}
 if(k==4||k==12)snare(o,t,.09);if(k==0||k==10)timp(o,t,.28);}},
war:{s:60/132/4,step(i,t,o,s){const b=i>>4&3,k=i&15,r=[38,34,31,33][b];
 if(!(k&1))timp(o,t,k%4==0?.45:.28);if(k==4||k==12)snare(o,t,.28);if(k>=14)snare(o,t,.14);
 if(!(k&1))brass(o,mtof(r+12+[0,0,3,0,5,3,0,-2][k>>1]),t,2*s,.1);
 if(k==0||k==6||k==10)[0,7,12].forEach(n=>strings(o,mtof(r+12+n),t,3*s,.06));}},
win:{one(t,o){[[62,0,.2],[66,.18,.2],[69,.36,.2],[74,.54,1.6]].forEach(([n,d,l])=>{brass(o,mtof(n),t+d,l,.14);brass(o,mtof(n-12),t+d,l,.09);});
 [62,66,69,74,78].forEach(n=>strings(o,mtof(n),t+.54,3,.07));for(let i=0;i<6;i++)timp(o,t+i*.09,.25+i*.05);timp(o,t+.54,.6);bell(o,mtof(86),t+.7,.12,3);}},
lose:{one(t,o){[50,47,45,38].forEach((n,i)=>{brass(o,mtof(n),t+i*.7,i>2?2.4:.65,.18);strings(o,mtof(n+12),t+i*.7,i>2?3:.8,.06);});timp(o,t,.6);timp(o,t+1.4,.6);gong(o,t+2.1,mtof(33),.4);}}};
function stopTrack(){const q=seq;seq=null;if(!q)return;clearInterval(q.h);const n=ctx.currentTime;q.o.gain.cancelScheduledValues(n);q.o.gain.setTargetAtTime(0,n,.35);setTimeout(()=>{try{q.o.disconnect();}catch(e){}},2500);}
function music(){if(!ctx)return;const n=!inGame?'menu':ended||['peace','tension','war'][moodV];if(n===trk)return;trk=n;stopTrack();const T=TR[n],o=ctx.createGain(),now=ctx.currentTime;
 o.gain.setValueAtTime(T.one?1:.0001,now);if(!T.one)o.gain.setTargetAtTime(1,now+.05,.6);o.connect(mb);const q={o,i:0,t:now+.08};seq=q;
 if(T.one)T.one(q.t,o);else q.h=setInterval(()=>{while(q.t<ctx.currentTime+.3){T.step(q.i,q.t,o,T.s);q.i++;q.t+=T.s;}},60);}
function play(n,p){p=p||{};if(!ctx||st.x||!st.s||!X[n])return;const w=performance.now();if(w-(last[n]||0)<70)return;last[n]=w;
 try{const g=ctx.createGain();g.gain.value=p.g==null?1:p.g;let out=g;if(p.pan&&ctx.createStereoPanner){const sp=ctx.createStereoPanner();sp.pan.value=p.pan;g.connect(sp);out=sp;}out.connect(sb);X[n](ctx.currentTime+.005,g,p);}catch(e){}}
function unlock(){if(!ctx&&AC)setup(new AC());if(ctx&&ctx.state!=='running')ctx.resume();music();}
['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,unlock,{passive:true}));
window.SND={play,unlock,names:()=>Object.keys(X),get:()=>({m:st.m,s:st.s,x:st.x}),onUI:f=>{cbs.push(f);},
 set(k,v){st[k]=v;if(v>0)st.x=0;vol();notify();},toggleMute(){st.x=st.x?0:1;vol();notify();},
 mood(v){if(v!==moodV){moodV=v;music();}},game(b){inGame=!!b;ended=null;music();},end(w){ended=w?'win':'lose';music();},
 pause(b){b=!!b;if(b!==paused){paused=b;vol();}},_t:{setup,X,TR}};
window.snd=(n,o)=>SND.play(n,o);
})();
