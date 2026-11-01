/* Thế Chiến — âm thanh từ FILE THẬT (không tổng hợp bằng code).
   Đặt file vào thư mục audio/ cạnh index-7.html, tên theo audio/README.txt.
   Mỗi tên có thể là .mp3 hoặc .ogg. File nào thiếu thì bỏ qua, game vẫn chạy. */
(function(){
const DIR='audio/',EXT=['mp3','ogg'],KEY='thechien_snd';
const SFX=['begin','ui','speed','pause','resume','select','deselect','event','march','train','ship','mission','war','war2','hit','die','cap','cityCap','lost','lostCity','city','tick','alarm','autoOff','autoOn','build','deny','error','fall','landed','medal','order','pact','peace','rebel','rest','split','upgrade'];
const MUS=['music_menu','music_peace','music_tension','music_war','music_win','music_lose'];
const VOL=[0,.35,.65,1];
let c={m:2,s:3,x:0};try{Object.assign(c,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){}
const ui=[];let unlocked=false,inGame=false,mood=0,paused=false,over=0,cur=null,curName='';
const bank={},bad={};
function load(n){if(bank[n]||bad[n])return bank[n];const a=new Audio();a.preload='auto';let i=0;
 const tryNext=()=>{if(i>=EXT.length){bad[n]=1;delete bank[n];return;}a.src=DIR+n+'.'+EXT[i++];a.load();};
 a.addEventListener('error',tryNext);bank[n]=a;tryNext();return a;}
const last={};
function play(n,o){o=o||{};if(c.x||!c.s||!unlocked)return;const a=load(n);if(!a||bad[n])return;
 const t=performance.now();if(last[n]&&t-last[n]<(o.gap||70))return;last[n]=t;
 const p=a.cloneNode();p.volume=Math.min(1,VOL[c.s]*(o.g==null?1:o.g));p.play().catch(()=>{});}
function musVol(){return c.x?0:VOL[c.m]*(paused?.4:1);}
function setMusic(n,loop){if(n===curName)return;curName=n;const old=cur;cur=null;
 if(old){fade(old,0,600,()=>old.pause());}
 if(!n||!unlocked)return;const a=load(n);if(!a||bad[n])return;
 const m=a.cloneNode();m.loop=!!loop;m.volume=0;cur=m;m.play().then(()=>fade(m,musVol(),900)).catch(()=>{});}
function fade(a,to,ms,done){const from=a.volume,t0=performance.now();(function s(){const k=Math.min(1,(performance.now()-t0)/ms);a.volume=Math.max(0,Math.min(1,from+(to-from)*k));if(k<1)requestAnimationFrame(s);else done&&done();})();}
function route(){if(over)return;setMusic(!inGame?'music_menu':['music_peace','music_tension','music_war'][mood]||'music_peace',1);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(c));}catch(e){}ui.forEach(f=>{try{f();}catch(e){}});if(cur)cur.volume=musVol();}
const SND=window.SND={
 play,
 unlock(){if(unlocked)return;unlocked=true;[...SFX.slice(0,8),...MUS.slice(0,2)].forEach(load);route();},
 mood(k){if(k===mood)return;mood=k;if(inGame)route();},
 game(on){inGame=!!on;over=0;route();},
 pause(p){p=!!p;if(p===paused)return;paused=p;if(cur)fade(cur,musVol(),400);},
 end(win){over=1;setMusic(win?'music_win':'music_lose',0);},
 names:()=>SFX.concat(MUS),
 get:()=>({m:c.m,s:c.s,x:c.x}),
 set(k,v){c[k]=v;if(k==='x'&&!v)route();save();},
 toggleMute(){c.x=c.x?0:1;save();},
 onUI(f){ui.push(f);}
};
window.snd=function(n,o){play(n,o);};
['pointerdown','keydown','touchend'].forEach(e=>addEventListener(e,()=>SND.unlock(),{passive:true}));
document.addEventListener('visibilitychange',()=>{if(cur){document.hidden?cur.pause():cur.play().catch(()=>{});}});
})();
