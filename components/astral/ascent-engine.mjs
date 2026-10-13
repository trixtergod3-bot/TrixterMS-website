import {clamp,ease,stages,journeyState} from './ascent-model.mjs';

/** Original website art only; no game archive data or server-side imports. */
export function mountAscent(journey) {
const query=selector=>journey.querySelector(selector);
const scene=query('.astral-scene');
const canvas=query('#astral-canvas');const ctx=canvas.getContext('2d');
if(!ctx)return ()=>{};
const title=query('#astral-title');const eyebrow=query('#astral-chapter');const description=query('#astral-description');const tag=query('#astral-character');
const play=query('#astral-play');const replay=query('#astral-replay');const motion=query('#astral-motion');const progressBar=query('.astral-progress');const announce=query('.astral-announcement');
const controller=new AbortController();const signal=controller.signal;
let width=1,height=1,progress=0,playing=false,playStart=0,playProgress=0,frame=null,active=true,lastPhase=-1,hidden=document.hidden,disposed=false;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionQuery.matches;
const asset='/art/astral-ascent/';
const world=new Image();world.src=asset+'astral-world-clean.webp';
const atlas=new Image();atlas.src=asset+'avenger-atlas.webp';
const bound=new Image();bound.src=asset+'demon-bound.webp';
const publicEffects=new Image();publicEffects.src=asset+'holy-effects.webp';
const effects=new Map();let effectStatus='loading';
function updateText(){
 const state=journeyState(progress),stage=stages[state.phase];
 if(state.phase!==lastPhase){
  title.innerHTML=stage.title;eyebrow.textContent=stage.chapter;description.textContent=stage.description;
  query('.astral-chapter-index').textContent=String(state.phase+1).padStart(2,'0')+' / 06';
  if(!reduced)query('.astral-titles').animate([{opacity:.15,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:950,easing:'ease-out'});
 }
 tag.textContent=stage.name;
 play.querySelector('span').textContent=playing?'Pause story':'Play the story';play.setAttribute('aria-pressed',String(playing));play.disabled=reduced;
 replay.disabled=reduced;motion.querySelector('span').textContent=reduced?'Enable motion':'Reduce motion';motion.setAttribute('aria-pressed',String(reduced));motion.disabled=motionQuery.matches;
 query('.astral-status').textContent=reduced?'REDUCED MOTION · ASTRAL NEXUS':'';
 journey.classList.toggle('is-reduced',reduced);
 queryAllChapters().forEach((button,i)=>button.setAttribute('aria-current',String(i===state.phase)));
 scene.dataset.stage=stage.key;scene.dataset.character=stage.name;scene.dataset.effects=effectStatus;scene.dataset.progress=progress.toFixed(3);
 progressBar.style.transform='scaleX('+progress+')';lastPhase=state.phase;
}
function queryAllChapters(){return journey.querySelectorAll('button[data-chapter]');}
function bounds(){const top=journey.getBoundingClientRect().top+scrollY;const headerHeight=parseFloat(journey.style.getPropertyValue('--astral-header'))||0;return {top,distance:Math.max(1,journey.offsetHeight-scene.offsetHeight-headerHeight)};}
function fromScroll(){if(disposed)return;if(reduced)progress=1;else{const b=bounds();progress=clamp((scrollY-b.top)/b.distance);}updateText();if(!frame)frame=requestAnimationFrame(tick);}
function goTo(value){playing=false;const b=bounds();window.scrollTo({top:b.top+b.distance*clamp(value),behavior:reduced?'instant':'smooth'});updateText();}
function resize(){if(disposed)return;const headerHeight=document.querySelector('.portal-header')?.getBoundingClientRect().height||0;journey.style.setProperty('--astral-header',Math.round(headerHeight)+'px');const rect=scene.getBoundingClientRect();width=Math.max(1,Math.round(rect.width));height=Math.max(1,Math.round(rect.height));const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=false;fromScroll();}
function light(x,y,r,color,alpha){ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
function drawCharacter(index,x,y,w,h,alpha,time,wingsOnly=false){
  if(!atlas.complete||!atlas.naturalWidth||alpha<=0)return;
  const cell=atlas.naturalWidth/3;const sourceY=250,sourceH=560;
  ctx.save();ctx.globalAlpha=alpha;const flap=reduced?1:.93+Math.sin(time*2.2)*.07;
  // Independently deform the wing sides; keep the face/body anchor fixed.
  const parts=[{left:0,size:.3,wing:true},{left:.3,size:.42,wing:false},{left:.72,size:.28,wing:true}];
  for(const part of parts){if(wingsOnly&&!part.wing)continue;const dy=part.wing?(h-h*flap)*.38:0,dh=part.wing?h*flap:h;ctx.drawImage(atlas,index*cell+part.left*cell,sourceY,part.size*cell,sourceH,x-w/2+part.left*w,y-h/2+dy,part.size*w,dh);}
  ctx.restore();
}
function chains(x,y,w,state){
  if(state.unbound>=1&&progress>.31)return;
  const broken=state.unbound;ctx.save();ctx.globalAlpha=1-broken*.65;ctx.lineWidth=3;
  for(const side of [-1,1]){
    const anchorX=x+side*(width*.32),anchorY=y+height*.18;
    for(let i=0;i<32;i++){
      const f=i/31;let px=x+side*w*.22+(anchorX-x-side*w*.22)*f;let py=y+10+(anchorY-y-10)*f+Math.sin(f*Math.PI)*20;
      if(broken>0){px+=side*broken*(i*6+5);py+=broken*broken*(i*8+20);}
      ctx.strokeStyle=i%2?'#afb0c0':'#56546a';ctx.beginPath();ctx.ellipse(px,py,7,4.5,side*.7+(i%2)*.6,0,Math.PI*2);ctx.stroke();
    }
  }ctx.restore();
}
function nativeEffect(key,x,y,scale,time,alpha=1){
  if(!publicEffects.complete||!publicEffects.naturalWidth||alpha<=0)return;
  const cell=publicEffects.naturalWidth/3,sh=publicEffects.naturalHeight;
  const index=key==='2321008:tile/0'?1:key==='2321008:effect0'?2:0;
  const pulse=reduced?1:.88+Math.sin(time/1000*2)*.12;
  const baseW=index===1?230:index===2?650:470;
  const targetW=baseW*scale, targetH=targetW*sh/cell;
  ctx.save();ctx.globalAlpha=alpha*pulse;
  if(key==='2311003:affected')ctx.globalAlpha*=.25;
  if(key==='2321008:hit')ctx.globalAlpha*=.35;
  ctx.drawImage(publicEffects,index*cell,0,cell,sh,x-targetW/2,y-targetH*.80,targetW,targetH);
  ctx.restore();
}
function render(now){
  const time=reduced?0:now/1000,state=journeyState(progress);ctx.clearRect(0,0,width,height);
  if(world.complete&&world.naturalWidth){
    const scale=Math.max(width/world.naturalWidth,height*3.1/world.naturalHeight);const ww=world.naturalWidth*scale,wh=world.naturalHeight*scale;
    const camera=(wh-height)*ease((progress-.22)/.78);ctx.drawImage(world,(width-ww)/2,-(wh-height)+camera,ww,wh);
  }
  const darkness=1-ease((progress-.20)/.64);
  ctx.fillStyle=`rgba(12,5,22,${darkness*.26})`;ctx.fillRect(0,0,width,height);
  const mobile=width<600,x=width*.5,y=height*(mobile?.415:height<700?.35:.46),w=mobile?(height<740?185:210):Math.min(310,width*.23),h=w*560/512;
  const hover=reduced?0:Math.sin(time*1.8)*5*(.3+state.unbound*.7);const cy=y+hover;const feet=cy+h*.47;
  light(x,cy,w*.9,state.slayerToAngel>.5?'#e8dcb966':state.demonToSlayer>.5?'#8570e966':'#db354766',.65);
  const glory=ease((progress-.64)/.32);
  if(glory>0){
    light(x,cy-35,Math.max(width,height)*.75,'#e9cc8b55',glory*.6);
    ctx.save();ctx.globalAlpha=glory*.52;ctx.strokeStyle='#f5dfa5';ctx.lineWidth=1;
    const radius=w*.68;
    for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(x,cy-25,radius+i*12,radius+i*12,0,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<16;i++){const a=i*Math.PI/8+(reduced?0:time*.035);ctx.beginPath();ctx.moveTo(x+Math.cos(a)*radius,cy-25+Math.sin(a)*radius);ctx.lineTo(x+Math.cos(a)*(radius+18),cy-25+Math.sin(a)*(radius+18));ctx.stroke();}
    ctx.restore();
  }
  if(state.beam>.01){
    light(x,cy,height*.65,'#ffd48088',state.beam*.6);
    const gradient=ctx.createLinearGradient(x-65,0,x+65,0);gradient.addColorStop(0,'#eeca7700');gradient.addColorStop(.4,'#efcc8b33');gradient.addColorStop(.5,'#fff9d999');gradient.addColorStop(.6,'#efcc8b33');gradient.addColorStop(1,'#eeca7700');ctx.save();ctx.globalAlpha=state.beam;ctx.fillStyle=gradient;ctx.fillRect(x-65,0,130,feet);ctx.restore();
    ctx.save();ctx.globalAlpha=state.beam*.8;ctx.fillStyle='#fff9de';ctx.fillRect(x-9,0,18,feet);ctx.fillStyle='#f3cc8f66';ctx.fillRect(x-22,0,44,feet);ctx.restore();
    nativeEffect('2321008:tile/0',x,feet,mobile?1.15:1.65,time*1000,state.beam);nativeEffect('2321008:hit',x,feet,mobile?.85:1.15,time*1000,state.beam);
  }
  chains(x,cy,w,state);
  const wake=ease((progress-.225)/.09);
  if(bound.complete&&bound.naturalWidth&&wake<1){ctx.save();ctx.globalAlpha=(1-wake)*(1-state.demonToSlayer);const bw=w*1.2;ctx.drawImage(bound,x-bw/2,cy-bw/2,bw,bw);ctx.restore();}
  drawCharacter(0,x,cy,w,h,(bound.complete&&bound.naturalWidth?wake:1)*(1-state.demonToSlayer),time);
  drawCharacter(1,x,cy,w,h,state.demonToSlayer*(1-state.slayerToAngel),time);
  drawCharacter(2,x,cy,w,h,state.wingLight*(1-state.slayerToAngel)*.55,time,true);
  if(state.wingLight>0&&state.slayerToAngel<1){ctx.save();ctx.globalCompositeOperation='screen';light(x,cy,w*.7,'#fff2b3aa',state.wingLight*.33);ctx.restore();}
  drawCharacter(2,x,cy,w,h,state.slayerToAngel,time);
  if(state.blessing>.01){nativeEffect('2311003:effect',x,feet,mobile?.65:.88,time*1000,state.blessing);nativeEffect('2311003:affected',x,feet,mobile?.9:1.1,time*1000,state.blessing*.5);light(x,cy-70,180,'#fff4b177',state.blessing*.35);}
  if(progress>.82&&progress<.95){const strength=Math.sin(clamp((progress-.82)/.13)*Math.PI);nativeEffect('2321008:effect0',x,feet,mobile?.65:.95,time*1000,strength);}
  // Red/violet wing fragments fall away as luminous feathers rise.
  if(progress>.83){const broken=clamp((progress-.83)/.12);for(let i=0;i<25;i++){const a=i*2.399;const d=broken*(50+i*8);const px=x+Math.cos(a)*d,py=cy+Math.sin(a)*d+broken*70;ctx.save();ctx.globalAlpha=(1-broken)*.85;ctx.fillStyle=i%2?'#cb345b':'#8562c6';ctx.translate(px,py);ctx.rotate(a+broken*3);ctx.fillRect(-3,-8,6,16);ctx.restore();}}
  if(glory>0){for(let i=0;i<18;i++){const a=i*2.399+time*.1,d=80+i*11,px=x+Math.cos(a)*d,py=cy+Math.sin(a)*d-(time*8+i*5)%70;ctx.save();ctx.globalAlpha=glory*.6;ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle='#fff2c7';ctx.beginPath();ctx.ellipse(0,0,2,9,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
  const goldness=state.slayerToAngel;for(let i=0;i<24;i++){const px=(Math.sin(i*117.23)*.5+.5)*width;const py=((Math.cos(i*52.8)*.5+.5)*height-(time*12+i*5)%(height+30)+height)%(height+30);ctx.fillStyle=goldness>.5?'#fff0cb99':'#bbbcff66';ctx.fillRect(Math.round(px),Math.round(py),i%5===0?3:1,2);}
  if(!reduced&&state.flash>0){ctx.fillStyle=`rgba(255,246,221,${state.flash})`;ctx.fillRect(0,0,width,height);}
  if(effects.size===0&&state.blessing>.1){ctx.save();ctx.strokeStyle='#ffeab4';ctx.lineWidth=2;ctx.globalAlpha=state.blessing;ctx.beginPath();ctx.arc(x,cy,90,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
function tick(now){frame=null;if(disposed)return;
 if(playing){progress=clamp(playProgress+(now-playStart)/58000);const b=bounds();window.scrollTo({top:b.top+b.distance*progress,behavior:'instant'});updateText();if(progress>=1){playing=false;updateText();announce.textContent='You have reached Astral Nexus. Explore TRIXTERMS or begin your adventure.';}}
 if(active&&!hidden){render(now);if(!reduced)frame=requestAnimationFrame(tick);}
}
function stopPlay(){if(playing){playing=false;updateText();}}
play.addEventListener('click',()=>{if(reduced)return;playing=!playing;if(playing){if(progress>.985)progress=0;playProgress=progress;playStart=performance.now();if(!frame)frame=requestAnimationFrame(tick);}updateText();},{signal});
replay.addEventListener('click',()=>{goTo(0);announce.textContent='The story has returned to the abyss.';},{signal});
motion.addEventListener('click',()=>{if(motionQuery.matches)return;playing=false;reduced=!reduced;updateText();resize();window.scrollTo({top:0,behavior:'instant'});},{signal});
queryAllChapters().forEach(button=>button.addEventListener('click',()=>goTo(Number(button.dataset.chapter)),{signal}));
window.addEventListener('wheel',stopPlay,{passive:true,signal});window.addEventListener('touchstart',stopPlay,{passive:true,signal});
window.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))stopPlay();},{signal});
journey.querySelectorAll('a[href]').forEach(link=>link.addEventListener('click',stopPlay,{signal}));
window.addEventListener('scroll',fromScroll,{passive:true,signal});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden)stopPlay();if(!hidden&&!frame)frame=requestAnimationFrame(tick);},{signal});
motionQuery.addEventListener('change',event=>{reduced=event.matches;playing=false;updateText();resize();},{signal});
const intersection=new IntersectionObserver(entries=>{if(disposed)return;active=entries[0].isIntersecting;if(!active)stopPlay();if(active&&!frame)frame=requestAnimationFrame(tick);});intersection.observe(scene);
const observer=new ResizeObserver(resize);observer.observe(scene);const header=document.querySelector('.portal-header');if(header)observer.observe(header);
world.onload=atlas.onload=bound.onload=()=>{if(!disposed)render(performance.now());};
publicEffects.decode().then(()=>{if(disposed)return;effectStatus='authored-public';effects.set('ready',true);updateText();render(performance.now());}).catch(()=>{if(disposed)return;effectStatus='authored-fallback';updateText();});
updateText();resize();
return ()=>{disposed=true;controller.abort();intersection.disconnect();observer.disconnect();if(frame)cancelAnimationFrame(frame);world.onload=atlas.onload=bound.onload=null;};
}
