'use strict';
// ═══════════════════════════════════════════════════════
//  FORTRESS INVADERS
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const LW = 800, LH = 570;
canvas.width  = LW;
canvas.height = LH;

const HUD_H = 26;
const BTN_H = 28;

// ── AUDIO ───────────────────────────────────────────────
let _ac = null;
const ac = () => { if(!_ac) _ac = new(window.AudioContext||window.webkitAudioContext)(); return _ac; };
function beep(freq,dur,type='sine',vol=0.22,slide=0){
  try{
    const c=ac(),o=c.createOscillator(),g=c.createGain();
    o.connect(g);g.connect(c.destination);
    o.type=type; o.frequency.value=freq;
    if(slide) o.frequency.exponentialRampToValueAtTime(slide,c.currentTime+dur);
    g.gain.setValueAtTime(vol,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
    o.start(); o.stop(c.currentTime+dur);
  }catch(e){}
}
const SFX = {
  shoot  : ()=>beep(700,.09,'sawtooth',.14,80),
  ashoot : ()=>beep(180,.14,'square',.1,60),
  hit    : ()=>beep(120,.28,'sawtooth',.28,40),
  explode: ()=>{ beep(140,.32,'sawtooth',.3,30); setTimeout(()=>beep(80,.25,'sawtooth',.2),60); },
  place  : ()=>beep(380,.08,'sine',.18,520),
  brickHit:()=>beep(320,.11,'sawtooth',.18,90),
  wave   : ()=>{ [400,550,700,900].forEach((f,i)=>setTimeout(()=>beep(f,.18,'sine',.2),i*110)); },
  over   : ()=>{ [400,300,220,130].forEach((f,i)=>setTimeout(()=>beep(f,.3,'sawtooth',.25),i*180)); },
  shield : ()=>beep(900,.14,'sine',.2,1200),
  repair : ()=>beep(500,.1,'sine',.15,600),
};

// ── CONSTANTS ───────────────────────────────────────────
const BS         = 20;
const FORT_TOP   = LH - 210;
const FORT_BOT   = LH - 58;
const PLAYER_Y   = LH - 38;
const ALIEN_START_Y = 55;

// ── STARS ───────────────────────────────────────────────
const STARS = Array.from({length:130},()=>({
  x:Math.random()*LW, y:Math.random()*LH,
  r:Math.random()*1.4+.2, spd:Math.random()*.25+.05, b:Math.random()
}));
function tickStars(){ STARS.forEach(s=>{ s.y+=s.spd; if(s.y>LH){s.y=0;s.x=Math.random()*LW;} }); }
function drawStars(){
  STARS.forEach(s=>{
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${.25+s.b*.7})`; ctx.fill();
  });
}

// ── PARTICLES ───────────────────────────────────────────
let parts=[];
function spark(x,y,col,n=14,spd=4){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, v=.5+Math.random()*spd;
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.5,
      life:1,dec:.028+Math.random()*.04,r:1.5+Math.random()*3,col,sq:false});
  }
}
function debris(x,y){
  for(let i=0;i<10;i++){
    const a=Math.random()*Math.PI*2, v=1+Math.random()*5;
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,
      life:1,dec:.022,r:2+Math.random()*5,
      col:`hsl(${25+Math.random()*25},65%,${38+Math.random()*28}%)`,
      sq:true,rot:Math.random()*Math.PI*2,rv:(Math.random()-.5)*.25});
  }
}
function tickParts(){
  parts=parts.filter(p=>p.life>0);
  parts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy; p.vy+=.09;
    p.vx*=.96; p.vy*=.96; p.life-=p.dec;
    if(p.sq&&p.rv) p.rot+=p.rv;
  });
}
function drawParts(){
  parts.forEach(p=>{
    ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
    if(p.sq){
      ctx.translate(p.x,p.y); ctx.rotate(p.rot||0);
      ctx.fillStyle=p.col; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r);
    } else {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);
      ctx.fillStyle=p.col; ctx.shadowColor=p.col; ctx.shadowBlur=5; ctx.fill();
    }
    ctx.restore();
  });
}

// ── BLOCKS ──────────────────────────────────────────────
let bmap = {};
const BMAX = 3;
function gridKey(gx,gy){ return `${gx},${gy}`; }
function tryPlace(gx,gy){
  if(buildingBlocks<=0) return false;
  const py=gy*BS;
  if(py<FORT_TOP||py+BS>FORT_BOT+BS) return false;
  const k=gridKey(gx,gy);
  if(bmap[k]) return false;
  bmap[k]={x:gx*BS,y:py,gx,gy,hp:BMAX,maxHp:BMAX};
  buildingBlocks--; SFX.place(); updUI(); return true;
}
function tryRepair(gx,gy){
  if(buildingBlocks<=0) return false;
  const k=gridKey(gx,gy);
  if(!bmap[k]||bmap[k].hp>=bmap[k].maxHp) return false;
  bmap[k].hp=bmap[k].maxHp; buildingBlocks--;
  SFX.repair(); updUI(); return true;
}
function hitBlock(k,dmg=1){
  if(!bmap[k]) return;
  bmap[k].hp-=dmg; SFX.brickHit();
  debris(bmap[k].x+BS/2,bmap[k].y+BS/2);
  if(bmap[k].hp<=0){ spark(bmap[k].x+BS/2,bmap[k].y+BS/2,'#aa7722',16,4); delete bmap[k]; }
}
function drawBlocks(){
  Object.values(bmap).forEach(b=>{
    const t=b.hp/b.maxHp;
    ctx.save();
    ctx.shadowColor='#cc8822'; ctx.shadowBlur=5*t;
    ctx.fillStyle=`hsl(35,58%,${28+t*26}%)`;
    ctx.fillRect(b.x,b.y,BS,BS);
    ctx.fillStyle=`rgba(255,255,255,${.12*t})`;
    ctx.fillRect(b.x+1,b.y+1,BS-2,3);
    ctx.strokeStyle=`rgba(255,170,55,${.55*t})`; ctx.lineWidth=1.2;
    ctx.strokeRect(b.x+.5,b.y+.5,BS-1,BS-1);
    if(b.hp<BMAX){
      ctx.strokeStyle='rgba(0,0,0,.55)'; ctx.lineWidth=1;
      ctx.beginPath();
      if(b.hp===2){ ctx.moveTo(b.x+3,b.y+4); ctx.lineTo(b.x+9,b.y+11); ctx.lineTo(b.x+7,b.y+17); }
      else { ctx.moveTo(b.x+2,b.y+3); ctx.lineTo(b.x+8,b.y+9); ctx.lineTo(b.x+15,b.y+7);
             ctx.moveTo(b.x+10,b.y+4); ctx.lineTo(b.x+17,b.y+14);
             ctx.moveTo(b.x+3,b.y+14); ctx.lineTo(b.x+13,b.y+18); }
      ctx.stroke();
    }
    ctx.restore();
  });
}

// ── PLAYER ──────────────────────────────────────────────
const PLR = { x:LW/2, y:PLAYER_Y, w:38, h:22, hp:3, maxHp:3,
  spd:4.5, sTimer:0, sDelay:12, inv:0, thrAnim:0 };
function resetPlayer(){ PLR.x=LW/2; PLR.y=PLAYER_Y; PLR.hp=PLR.maxHp; PLR.inv=0; PLR.sTimer=0; }
function drawPlayer(){
  if(PLR.inv>0&&Math.floor(Date.now()/75)%2===0) return;
  const {x,y,w,h}=PLR;
  PLR.thrAnim=(PLR.thrAnim+.18)%(Math.PI*2);
  ctx.save();
  const fh=7+Math.sin(PLR.thrAnim)*4;
  const fg=ctx.createLinearGradient(x,y+h/2,x,y+h/2+fh+10);
  fg.addColorStop(0,'rgba(60,160,255,.9)'); fg.addColorStop(1,'transparent');
  ctx.beginPath(); ctx.moveTo(x-9,y+h/2); ctx.lineTo(x,y+h/2+fh+10); ctx.lineTo(x+9,y+h/2);
  ctx.fillStyle=fg; ctx.fill();
  ctx.shadowColor='#2266ff'; ctx.shadowBlur=14;
  ctx.fillStyle='#0033bb';
  ctx.beginPath(); ctx.moveTo(x,y+3); ctx.lineTo(x+w/2+10,y+h/2+5); ctx.lineTo(x+w/2,y+h/2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x,y+3); ctx.lineTo(x-w/2-10,y+h/2+5); ctx.lineTo(x-w/2,y+h/2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#1a5fff';
  ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x+w/2,y+h/2); ctx.lineTo(x-w/2,y+h/2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#99ddff'; ctx.shadowColor='#99ddff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.ellipse(x,y-1,6,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#88ccff'; ctx.shadowBlur=0;
  ctx.fillRect(x-2,y-h/2-7,4,8);
  ctx.restore();
  for(let i=0;i<PLR.maxHp;i++){
    ctx.fillStyle= i<PLR.hp ? '#ff3344' : '#333';
    ctx.font='11px serif'; ctx.textAlign='left';
    ctx.fillText('♥', x - PLR.maxHp*9 + i*18, y+h/2+14);
  }
}

// ── BULLETS ─────────────────────────────────────────────
let pBullets=[], aBullets=[];
function firePlayer(){
  pBullets.push({x:PLR.x,y:PLR.y-PLR.h/2-4,spd:10,w:3,h:16}); SFX.shoot();
}
function drawBullets(){
  pBullets.forEach(b=>{
    ctx.save(); ctx.shadowColor='#00ffcc'; ctx.shadowBlur=12;
    const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    g.addColorStop(0,'#ffffff'); g.addColorStop(.3,'#00ffcc'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(b.x-b.w/2,b.y,b.w,b.h); ctx.restore();
  });
  aBullets.forEach(b=>{
    ctx.save();
    if(b.type==='explosive'){
      ctx.shadowColor='#ff6600'; ctx.shadowBlur=14;
      const g=ctx.createRadialGradient(b.x,b.y+5,0,b.x,b.y+5,9);
      g.addColorStop(0,'#ffff44'); g.addColorStop(.5,'#ff6600'); g.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(b.x,b.y+5,9,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    } else if(b.type==='sniper'){
      ctx.shadowColor='#ff44ff'; ctx.shadowBlur=10;
      ctx.fillStyle='#ff44ff'; ctx.fillRect(b.x-1.5,b.y-8,3,20);
    } else {
      ctx.shadowColor='#ff3333'; ctx.shadowBlur=8;
      const g=ctx.createLinearGradient(b.x,b.y-8,b.x,b.y+8);
      g.addColorStop(0,'transparent'); g.addColorStop(.5,'#ff4444'); g.addColorStop(1,'#ff9966');
      ctx.fillStyle=g; ctx.fillRect(b.x-2,b.y-8,4,16);
    }
    ctx.restore();
  });
}

// ── ALIENS ──────────────────────────────────────────────
const ACFG = {
  basic   :{hp:1,pts:1, col:'#00ee88',w:28,h:20,sDelay:130,bType:'normal'},
  heavy   :{hp:3,pts:3, col:'#ff6600',w:36,h:24,sDelay:110,bType:'explosive'},
  sniper  :{hp:2,pts:2, col:'#ee00ee',w:24,h:28,sDelay: 90,bType:'sniper'},
  kamikaze:{hp:1,pts:2, col:'#ff2222',w:22,h:22,sDelay:999,bType:'none',diver:true},
  boss    :{hp:50,pts:30,col:'#ffdd00',w:72,h:48,sDelay:45,bType:'triple'}
};
let aliens=[], alienDir=1, alienStep=0, alienInterval=48, alienDescend=20;

function spawnWave(w){
  aliens=[]; alienDir=1; alienStep=0;
  alienInterval=Math.max(11,48-w*3);

  if(w%5===0){
    const c=ACFG.boss;
    aliens.push({...c,type:'boss',x:LW/2,y:70,maxHp:c.hp+w*5,hp:c.hp+w*5,
      st:0,patT:0,pat:0,flash:0,diveMode:false,id:1});
    return;
  }
  const typePool = w<3?['basic','basic','basic']:
                   w<6?['basic','basic','heavy']:
                   w<9?['basic','heavy','sniper']:
                       ['basic','heavy','sniper','kamikaze'];
  const cols=Math.min(10,5+Math.floor(w/2));
  const rows=Math.min(5, 2+Math.floor(w/3));
  const sx=(LW-(cols-1)*62)/2;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const type=typePool[Math.floor(Math.random()*typePool.length)];
    const cfg=ACFG[type];
    aliens.push({...cfg,type,x:sx+c*62,y:ALIEN_START_Y+r*44,maxHp:cfg.hp,
      st:Math.floor(Math.random()*100),flash:0,diveMode:false,
      id:r*100+c+Date.now()%1e6});
  }
  SFX.wave();
}

function drawAlien(a){
  const {x,y,w,h,col,hp,maxHp,type}=a;
  const t=hp/maxHp;
  ctx.save();
  ctx.shadowColor=col; ctx.shadowBlur=9*t;

  if(type==='basic'){
    ctx.fillStyle=col;
    ctx.fillRect(x-w/2+3,y-h/2,w-6,h);
    ctx.fillRect(x-w/2,y-h/2+6,7,h/2+2); ctx.fillRect(x+w/2-7,y-h/2+6,7,h/2+2);
    ctx.fillStyle='#000310';
    ctx.fillRect(x-7,y-h/2+4,5,5); ctx.fillRect(x+2,y-h/2+4,5,5);
    ctx.strokeStyle=col; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-6,y-h/2); ctx.lineTo(x-10,y-h/2-7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6,y-h/2); ctx.lineTo(x+10,y-h/2-7); ctx.stroke();
  } else if(type==='heavy'){
    ctx.fillStyle=col;
    ctx.fillRect(x-w/2,y-h/2,w,h);
    ctx.fillStyle='#cc4400'; ctx.fillRect(x-7,y+h/2-7,14,9);
    ctx.fillStyle='#ffff00';
    ctx.beginPath(); ctx.arc(x-9,y-1,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+9,y-1,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(x-9,y-1,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(x+9,y-1,2,0,Math.PI*2); ctx.fill();
  } else if(type==='sniper'){
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x+w/2,y+h/2); ctx.lineTo(x-w/2,y+h/2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=col; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x,y-h/2-14); ctx.stroke();
    ctx.fillStyle='#cc00cc'; ctx.beginPath(); ctx.arc(x,y-h/2-16,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y-h/2-16,2,0,Math.PI*2); ctx.fill();
  } else if(type==='kamikaze'){
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w/2,y-h/2); ctx.lineTo(x-w/2,y-h/2); ctx.closePath(); ctx.fill();
    const fg=ctx.createLinearGradient(x,y+h/2,x,y+h/2+18);
    fg.addColorStop(0,'rgba(255,80,0,.85)'); fg.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(x,y+h/2+9,8,0,Math.PI*2); ctx.fillStyle=fg; ctx.fill();
  } else if(type==='boss'){
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#aa8800';
    ctx.beginPath(); ctx.ellipse(x,y-4,w/4,h/3-.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#cc9900';
    ctx.fillRect(x-w/2-15,y-7,16,14); ctx.fillRect(x+w/2-1,y-7,16,14);
    ctx.fillStyle='#553300';
    [-w/4,0,w/4].forEach(ox=>ctx.fillRect(x+ox-3,y+h/2-3,6,11));
    const bw=84;
    ctx.fillStyle='#222'; ctx.fillRect(x-bw/2,y-h/2-16,bw,8);
    ctx.fillStyle=t>.5?'#00ff44':t>.25?'#ffaa00':'#ff2222';
    ctx.fillRect(x-bw/2,y-h/2-16,bw*t,8);
    ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(x-bw/2,y-h/2-16,bw,8);
  }

  if(a.flash>0){
    ctx.globalAlpha=a.flash*.7;
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.ellipse(x,y,w/2+5,h/2+5,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── GAME STATE ───────────────────────────────────────────
let state='title';
let score=0, wave=1, buildingBlocks=5;
let bestScore=parseInt(localStorage.getItem('fi_best')||'0');
let editMode='none';
let mx=0, my=0;
let waveClearTimer=0, warnFlash=0, frameN=0;
const keys={};

function updUI(){
  document.getElementById('sScore').textContent=score;
  document.getElementById('sBest').textContent=bestScore;
  document.getElementById('sWave').textContent=wave;
  document.getElementById('sAliens').textContent=aliens.length;
  document.getElementById('sBlocks').textContent=buildingBlocks;
  document.getElementById('sHp').textContent=PLR.hp;
  const lbl=editMode==='build'?'🔨 BUILD MODE — click to place':
            editMode==='repair'?'🔧 REPAIR MODE — click to repair':'';
  document.getElementById('sModeLabel').textContent=lbl;
  ['bBuild','bRepair'].forEach(id=>document.getElementById(id).classList.remove('on'));
  if(editMode==='build')  document.getElementById('bBuild').classList.add('on');
  if(editMode==='repair') document.getElementById('bRepair').classList.add('on');
}
function setMode(m){ editMode=(editMode===m?'none':m); updUI(); }
function togglePause(){
  if(state==='playing')   state='paused';
  else if(state==='paused') state='playing';
}

// ── SCORING ──────────────────────────────────────────────
function addPts(n){
  const prev=Math.floor(score/15);
  score+=n;
  const now=Math.floor(score/15);
  if(now>prev){ buildingBlocks+=(now-prev); spark(LW/2,32,'#ffdd00',10,3); }
  if(score>bestScore){ bestScore=score; localStorage.setItem('fi_best',bestScore); }
  updUI();
}

// ── COLLISION HELPERS ────────────────────────────────────
function rHit(ax,ay,aw,ah,bx,by,bw,bh){
  return ax-aw/2<bx+bw/2 && ax+aw/2>bx-bw/2 && ay-ah/2<by+bh/2 && ay+ah/2>by-bh/2;
}
function ptInBlock(px,py,b){ return px>=b.x&&px<=b.x+BS&&py>=b.y&&py<=b.y+BS; }

// ── UPDATE ───────────────────────────────────────────────
function update(){
  frameN++;
  tickStars(); tickParts();
  if(PLR.inv>0) PLR.inv--;

  if(editMode==='none'){
    if((keys['ArrowLeft']||keys['a']||keys['A'])&&PLR.x-PLR.w/2>PLR.spd) PLR.x-=PLR.spd;
    if((keys['ArrowRight']||keys['d']||keys['D'])&&PLR.x+PLR.w/2<LW-PLR.spd) PLR.x+=PLR.spd;
  }

  PLR.sTimer++;
  if(PLR.sTimer>=PLR.sDelay){
    if(keys[' ']||keys['z']||keys['Z']||keys['ArrowUp']){ PLR.sTimer=0; firePlayer(); }
  }

  pBullets=pBullets.filter(b=>{ b.y-=b.spd; return b.y+b.h>0; });
  aBullets=aBullets.filter(b=>{
    if(b.homing){ const dx=PLR.x-b.x; b.x+=Math.sign(dx)*Math.min(2,Math.abs(dx)); }
    b.y+=b.spd; return b.y<LH+20;
  });

  const isBoss = aliens.length===1&&aliens[0].type==='boss';
  if(isBoss){
    const bo=aliens[0];
    bo.patT++;
    if(bo.pat===0){ bo.x+=alienDir*1.8; if(bo.x>LW-80||bo.x<80){alienDir*=-1;bo.pat=1;bo.patT=0;} }
    else { bo.y+=0.6; if(bo.patT>70){bo.pat=0;} }
    bo.y=Math.max(65,Math.min(220,bo.y));
    bo.st++;
    if(bo.st>=bo.sDelay){
      bo.st=0;
      [-24,0,24].forEach(ox=>{
        aBullets.push({x:bo.x+ox,y:bo.y+bo.h/2,spd:4+wave*.25,type:'explosive',homing:false});
      });
      if(wave>=10) aBullets.push({x:bo.x,y:bo.y+bo.h/2,spd:5,type:'sniper',homing:true});
      SFX.ashoot();
    }
    if(bo.flash>0) bo.flash=Math.max(0,bo.flash-.12);
  } else {
    alienStep++;
    if(alienStep>=alienInterval){
      alienStep=0;
      let edge=false;
      aliens.forEach(a=>{ if(!a.diveMode){
        if(alienDir===1&&a.x+a.w/2+20>LW) edge=true;
        if(alienDir===-1&&a.x-a.w/2-20<0)  edge=true;
      }});
      if(edge){ alienDir*=-1; aliens.forEach(a=>{ if(!a.diveMode) a.y+=alienDescend; }); }
      else { aliens.forEach(a=>{ if(!a.diveMode) a.x+=alienDir*20; }); }
    }

    const toRemove=new Set();
    aliens.forEach((a,ai)=>{
      if(a.flash>0) a.flash=Math.max(0,a.flash-.14);

      if(a.type==='kamikaze'&&!a.diveMode&&a.y>120&&Math.random()<.0018+wave*.0004){
        a.diveMode=true;
      }
      if(a.diveMode){
        const dx=PLR.x-a.x, dy=PLR.y-a.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d>2){ a.x+=dx/d*a.spd; a.y+=dy/d*a.spd; }
        for(const [k,bl] of Object.entries(bmap)){
          if(rHit(a.x,a.y,a.w,a.h,bl.x+BS/2,bl.y+BS/2,BS,BS)){
            hitBlock(k,2); spark(a.x,a.y,a.col,20,5); toRemove.add(ai); break;
          }
        }
        if(!toRemove.has(ai)&&rHit(a.x,a.y,a.w,a.h,PLR.x,PLR.y,PLR.w,PLR.h)){
          hurtPlayer(2); spark(a.x,a.y,a.col,20,5); toRemove.add(ai);
        }
      } else {
        const shootOk=Math.random()<(.0025+wave*.0012+(a.type==='sniper'?.003:a.type==='heavy'?.001:0));
        if(a.st<=0&&shootOk){
          a.st=a.sDelay;
          if(a.bType!=='none'){
            aBullets.push({x:a.x,y:a.y+a.h/2,spd:3+wave*.22,type:a.bType,homing:a.type==='sniper'});
            SFX.ashoot();
          }
        }
        if(a.st>0) a.st--;
        if(a.y+a.h/2>FORT_TOP-10) warnFlash=130;
        if(a.y+a.h/2>LH-50){ hurtPlayer(1); spark(a.x,a.y,a.col,12,3); toRemove.add(ai); }
      }
    });
    if(toRemove.size>0) aliens=aliens.filter((_,i)=>!toRemove.has(i));
  }

  for(let bi=pBullets.length-1;bi>=0;bi--){
    const b=pBullets[bi]; let hit=false;
    for(let ai=aliens.length-1;ai>=0;ai--){
      const a=aliens[ai];
      if(rHit(b.x,b.y+b.h/2,b.w,b.h,a.x,a.y,a.w,a.h)){
        a.hp--; a.flash=1; pBullets.splice(bi,1); hit=true;
        if(a.hp<=0){ spark(a.x,a.y,a.col,20,6); debris(a.x,a.y); SFX.explode(); addPts(a.pts); aliens.splice(ai,1); }
        break;
      }
    }
  }

  for(let bi=aBullets.length-1;bi>=0;bi--){
    const b=aBullets[bi]; let hit=false;
    for(const [k,bl] of Object.entries(bmap)){
      if(ptInBlock(b.x,b.y,bl)||ptInBlock(b.x,b.y-8,bl)){
        hitBlock(k,b.type==='explosive'?2:1);
        if(b.type==='explosive') spark(b.x,b.y,'#ff6600',18,5);
        aBullets.splice(bi,1); hit=true; break;
      }
    }
    if(!hit&&rHit(b.x,b.y,4,16,PLR.x,PLR.y,PLR.w,PLR.h)){
      aBullets.splice(bi,1); hurtPlayer(b.type==='explosive'?2:1);
    }
  }

  if(warnFlash>0) warnFlash--;

  if(aliens.length===0&&state==='playing'){
    state='waveclear'; waveClearTimer=145;
    const bonus=Math.max(1,Math.ceil(wave/2));
    buildingBlocks+=bonus; SFX.wave(); updUI();
  }
  if(state==='waveclear'){
    waveClearTimer--;
    if(waveClearTimer<=0){ wave++; state='playing'; spawnWave(wave); updUI(); }
  }
}

function hurtPlayer(dmg){
  if(PLR.inv>0) return;
  PLR.hp-=dmg; PLR.inv=90; SFX.hit();
  spark(PLR.x,PLR.y,'#4488ff',16,4); updUI();
  if(PLR.hp<=0) endGame();
}

// ── DRAW HELPERS ─────────────────────────────────────────
function drawFortZone(){
  if(editMode==='none') return;
  const col=editMode==='build'?'0,255,204':'255,170,0';
  ctx.fillStyle=`rgba(${col},.03)`; ctx.fillRect(0,FORT_TOP,LW,FORT_BOT-FORT_TOP);
  ctx.strokeStyle=`rgba(${col},.25)`; ctx.lineWidth=1;
  ctx.setLineDash([5,5]); ctx.strokeRect(.5,FORT_TOP,LW-1,FORT_BOT-FORT_TOP); ctx.setLineDash([]);
  ctx.strokeStyle=`rgba(${col},.05)`; ctx.lineWidth=.5;
  for(let x=0;x<LW;x+=BS){ ctx.beginPath();ctx.moveTo(x,FORT_TOP);ctx.lineTo(x,FORT_BOT);ctx.stroke(); }
  for(let y=FORT_TOP;y<=FORT_BOT;y+=BS){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(LW,y);ctx.stroke(); }

  if(my>=FORT_TOP&&my<=FORT_BOT){
    const gx=Math.floor(mx/BS),gy=Math.floor(my/BS),k=gridKey(gx,gy);
    const hasBl=!!bmap[k];
    const canRep=hasBl&&bmap[k].hp<bmap[k].maxHp;
    ctx.fillStyle= editMode==='build'&&!hasBl?`rgba(${col},.38)`:
                   (canRep)?`rgba(255,200,0,.38)`:`rgba(255,50,50,.12)`;
    ctx.fillRect(gx*BS,gy*BS,BS,BS);
    ctx.strokeStyle=`rgba(${col},.8)`; ctx.lineWidth=1.5;
    ctx.strokeRect(gx*BS+.5,gy*BS+.5,BS-1,BS-1);
  }
}

function drawWarn(){
  if(warnFlash<=0||Math.floor(frameN/12)%2!==0) return;
  ctx.save(); ctx.textAlign='center'; ctx.font='bold 15px Courier New';
  ctx.fillStyle='#ff3333'; ctx.shadowColor='#ff0000'; ctx.shadowBlur=16;
  ctx.fillText('⚠  ALIENS BREACHING PERIMETER  ⚠', LW/2, FORT_TOP-8);
  ctx.restore();
}

function drawWaveClear(){
  if(state!=='waveclear') return;
  const a=Math.min(1,Math.min(waveClearTimer/30,(145-waveClearTimer)/30)*1);
  ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center';
  ctx.font='bold 44px Courier New'; ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.shadowBlur=26;
  ctx.fillText(`WAVE ${wave} CLEARED!`,LW/2,LH/2-24);
  ctx.font='bold 20px Courier New'; ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=14;
  ctx.fillText(`+${Math.max(1,Math.ceil(wave/2))} bonus blocks`,LW/2,LH/2+22);
  ctx.restore();
}

function drawTitle(){
  const bg=ctx.createLinearGradient(0,0,0,LH);
  bg.addColorStop(0,'#00000f'); bg.addColorStop(1,'#000820');
  ctx.fillStyle=bg; ctx.fillRect(0,0,LW,LH);
  drawStars();
  ctx.save(); ctx.textAlign='center';
  ctx.font='bold 58px Courier New'; ctx.shadowBlur=32;
  ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.fillText('FORTRESS',LW/2,LH/2-90);
  ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.fillText('INVADERS',LW/2,LH/2-26);
  if(Math.floor(Date.now()/650)%2===0){
    ctx.font='bold 20px Courier New'; ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12;
    ctx.fillText('PRESS  ENTER  OR  CLICK  TO  START',LW/2,LH/2+50);
  }
  ctx.font='13px Courier New'; ctx.shadowBlur=0; ctx.fillStyle='#6688aa';
  ['← → / A D  —  Move', 'SPACE / Z / ↑  —  Fire',
   'B  —  Build Mode    R  —  Repair Mode',
   'Click in zone to place/repair    Right-click to remove'].forEach((t,i)=>{
    ctx.fillText(t,LW/2,LH/2+100+i*22);
  });
  if(bestScore>0){
    ctx.font='bold 16px Courier New'; ctx.fillStyle='#ffdd00'; ctx.fillText(`HIGH SCORE: ${bestScore}`,LW/2,LH/2+200);
  }
  ctx.restore();
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,.78)'; ctx.fillRect(0,0,LW,LH);
  ctx.save(); ctx.textAlign='center';
  ctx.font='bold 58px Courier New'; ctx.fillStyle='#ff2222'; ctx.shadowColor='#ff2222'; ctx.shadowBlur=28;
  ctx.fillText('GAME OVER',LW/2,LH/2-70);
  ctx.font='bold 24px Courier New'; ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=10;
  ctx.fillText(`SCORE: ${score}`,LW/2,LH/2-10);
  ctx.fillText(`WAVE REACHED: ${wave}`,LW/2,LH/2+30);
  ctx.font='bold 18px Courier New'; ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00';
  ctx.fillText(`HIGH SCORE: ${bestScore}`,LW/2,LH/2+72);
  if(Math.floor(Date.now()/650)%2===0){
    ctx.font='bold 17px Courier New'; ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.shadowBlur=12;
    ctx.fillText('PRESS  ENTER  OR  CLICK  TO  RESTART',LW/2,LH/2+116);
  }
  ctx.restore();
}

function drawPaused(){
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,LW,LH);
  ctx.save(); ctx.textAlign='center';
  ctx.font='bold 46px Courier New'; ctx.fillStyle='#aaaaff'; ctx.shadowColor='#aaaaff'; ctx.shadowBlur=22;
  ctx.fillText('PAUSED',LW/2,LH/2);
  ctx.font='16px Courier New'; ctx.fillStyle='#8888cc'; ctx.shadowBlur=0;
  ctx.fillText('Press P to resume',LW/2,LH/2+42);
  ctx.restore();
}

function drawBG(){
  const g=ctx.createLinearGradient(0,0,0,LH);
  g.addColorStop(0,'#00000f'); g.addColorStop(1,'#000820');
  ctx.fillStyle=g; ctx.fillRect(0,0,LW,LH);
  drawStars();
  ctx.strokeStyle='rgba(30,60,130,.3)'; ctx.lineWidth=1; ctx.setLineDash([4,6]);
  ctx.beginPath(); ctx.moveTo(0,FORT_TOP); ctx.lineTo(LW,FORT_TOP); ctx.stroke();
  ctx.setLineDash([]);
}

// ── RENDER ───────────────────────────────────────────────
function render(){
  if(state==='title'){ drawTitle(); return; }
  drawBG();
  drawFortZone();
  drawBlocks();
  aliens.forEach(drawAlien);
  drawBullets();
  if(PLR.hp>0) drawPlayer();
  drawParts();
  drawWarn();
  drawWaveClear();
  if(state==='gameover') drawGameOver();
  if(state==='paused') drawPaused();
}

// ── LIFECYCLE ────────────────────────────────────────────
function startGame(){
  score=0; wave=1; buildingBlocks=5; editMode='none';
  state='playing'; frameN=0; warnFlash=0;
  pBullets=[]; aBullets=[]; bmap={}; parts=[];
  alienDir=1; alienStep=0; alienInterval=48;
  resetPlayer(); spawnWave(1); updUI();
}
function endGame(){ state='gameover'; SFX.over(); spark(PLR.x,PLR.y,'#2244ff',30,6); }

function loop(){
  if(state==='playing'||state==='waveclear') update();
  render();
  requestAnimationFrame(loop);
}

// ── INPUT ─────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(['b','B'].includes(e.key)) setMode('build');
  if(['r','R'].includes(e.key)) setMode('repair');
  if(e.key==='p'||e.key==='P') togglePause();
  if(e.key==='Escape'){ editMode='none'; updUI(); }
  if(e.key==='Enter'){
    if(state==='title'||state==='gameover') startGame();
    else if(state==='paused') state='playing';
  }
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup',e=>{ keys[e.key]=false; });

function canvasPos(e){
  const r=canvas.getBoundingClientRect();
  const sx=LW/r.width, sy=LH/r.height;
  return {cx:(e.clientX-r.left)*sx, cy:(e.clientY-r.top)*sy};
}
canvas.addEventListener('mousemove',e=>{ const p=canvasPos(e); mx=p.cx; my=p.cy; });
canvas.addEventListener('click',e=>{
  if(state==='title'||state==='gameover'){ startGame(); return; }
  if(editMode==='none') return;
  const {cx,cy}=canvasPos(e);
  if(cy<FORT_TOP||cy>FORT_BOT) return;
  const gx=Math.floor(cx/BS), gy=Math.floor(cy/BS), k=gridKey(gx,gy);
  if(editMode==='build'){
    if(bmap[k]) tryRepair(gx,gy);
    else { if(tryPlace(gx,gy)) spark(cx,cy,'#00ffcc',10,2); }
  } else {
    if(tryRepair(gx,gy)) spark(cx,cy,'#ffaa00',10,2);
  }
});
canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();
  if(state!=='playing'&&state!=='waveclear') return;
  const {cx,cy}=canvasPos(e);
  const gx=Math.floor(cx/BS),gy=Math.floor(cy/BS),k=gridKey(gx,gy);
  if(bmap[k]){ debris(cx,cy); delete bmap[k]; buildingBlocks++; updUI(); }
});

// ── RESPONSIVE ───────────────────────────────────────────
function resize(){
  const mw=window.innerWidth, mh=window.innerHeight-(HUD_H+BTN_H+16);
  const s=Math.min(mw/LW, mh/LH, 1);
  canvas.style.width=LW*s+'px'; canvas.style.height=LH*s+'px';
}
window.addEventListener('resize',resize); resize();

// expose to HTML onclick handlers
window.setMode = setMode;
window.togglePause = togglePause;

updUI(); loop();
