import { iso, fitProjection, pathOf } from "../../skills/cutaway/upstream/kit/iso-kit.mjs";

const P=fitProjection([[-115,15,-38],[190,15,52],[-115,-260,-38],[190,-260,52]],760,410,{pad:34,azimuth:49,elevation:31});
const at=(point)=>iso(point,P);
const path=(points,closed=false)=>pathOf(points.map(at),closed);
const polygon=(points,fill,stroke="#89977c")=>`<path d="${path(points,true)}" fill="${fill}" stroke="${stroke}" stroke-width=".7" stroke-linejoin="round"/>`;
const line=(points,color="#8a9a7b",width=.7)=>`<path d="${path(points)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;

function geometry(shape) {
  const tipChord=shape==="rectangular" ? 190 : shape==="tapered" ? 92 : 105;
  const sweep=shape==="swept" ? 104 : shape==="tapered" ? 32 : 0;
  const section=(span,u,upper=true)=>{
    const chord=190+(tipChord-190)*span;
    const x=-95+sweep*span+u*chord;
    const thickness=5*.155*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u*u*u-.1036*u*u*u*u)*chord;
    const camber=Math.sin(Math.PI*u)*chord*.025;
    return [x,-240*span,camber+(upper ? thickness : -thickness)+span*9];
  };
  return {section};
}

function strip(section,s1,s2,u1,u2,upper,fill) {
  const points=[];
  for(let i=0;i<=20;i++) points.push(section(s1,u1+(u2-u1)*i/20,upper));
  for(let i=20;i>=0;i--) points.push(section(s2,u1+(u2-u1)*i/20,upper));
  return polygon(points,fill);
}

function rib(section,span) {
  const upper=Array.from({length:41},(_,i)=>section(span,.15+.63*i/40,true));
  const lower=Array.from({length:41},(_,i)=>section(span,.78-.63*i/40,false));
  const outline=path([...upper,...lower],true);
  const holes=[.37,.52].map((u)=>{
    const top=section(span,u,true),bottom=section(span,u,false);
    const radius=(top[2]-bottom[2])*.29;
    const centerZ=(top[2]+bottom[2])/2;
    return path(Array.from({length:25},(_,i)=>[top[0]+Math.cos(i*Math.PI/12)*radius*1.35,top[1],centerZ+Math.sin(i*Math.PI/12)*radius]),true);
  });
  return `<path d="${outline+holes.join("")}" fill="#8a9a79" stroke="#c0cbb1" stroke-width=".65" fill-rule="evenodd"/>`;
}

function spar(section,u) {
  const a=section(0,u,true),b=section(1,u,true),c=section(1,u,false),d=section(0,u,false);
  const edge=4;
  return polygon([a,b,c,d],"#655e42","#c7b17c")+polygon([a,b,[b[0]+edge,b[1],b[2]],[a[0]+edge,a[1],a[2]]],"#cbb887","#e2d0a3")+polygon([d,c,[c[0]+edge,c[1],c[2]],[d[0]+edge,d[1],d[2]]],"#807654","#c7b17c");
}

function flapSection(section,degrees) {
  const angle=degrees*Math.PI/180;
  return (span,u,upper)=>{
    const [x,y,z]=section(span,u,upper);
    const hinge=section(span,.78,false);
    const dx=x-hinge[0],dz=z-hinge[2];
    return [hinge[0]+dx*Math.cos(angle)+dz*Math.sin(angle)+degrees*.11,y,hinge[2]-dx*Math.sin(angle)+dz*Math.cos(angle)];
  };
}

function slatSection(section,deployed) {
  return (span,u,upper)=>{
    const [x,y,z]=section(span,u,upper);
    return [x-(deployed ? 13 : 0),y,z-(deployed ? 5 : 0)];
  };
}

function endFace(section,span,u1,u2,fill) {
  return polygon([
    ...Array.from({length:22},(_,i)=>section(span,u1+(u2-u1)*i/21,true)),
    ...Array.from({length:22},(_,i)=>section(span,u2-(u2-u1)*i/21,false)),
  ],fill);
}

export function wingBody({shape="swept",flap=0,slat=false,skin=false}={}) {
  const {section}=geometry(shape);
  const flapAt=flapSection(section,flap);
  const slatAt=slatSection(section,slat);
  const out=[`<ellipse cx="381" cy="325" rx="270" ry="38" fill="#060b06" opacity=".45" filter="url(#wing-shadow)"/>`];
  out.push(strip(section,0,1,.15,.78,false,"#2e3e2f"));
  out.push(spar(section,.65));
  for(let n=10;n>=0;n--) {
    const span=n/10;
    out.push(rib(section,span));
  }
  out.push(spar(section,.25));
  for(const u of [.33,.44,.55]) {
    const a=section(0,u,true),b=section(1,u,true);
    out.push(line([a,b],"#728569",1.3));
  }
  out.push(strip(section,.88,1,.15,.78,true,"url(#wing-surface-gradient)"));
  out.push(strip(section,0,.085,.15,.78,true,"url(#wing-surface-gradient)"));
  if(skin) out.push(strip(section,.085,.88,.15,.78,true,"url(#wing-surface-gradient)"));
  out.push(`<g data-part="slat">`);
  out.push(strip(slatAt,0,1,0,.15,false,"#344b42"));
  out.push(strip(slatAt,0,1,0,.15,true,"url(#wing-leading-gradient)"));
  out.push(endFace(slatAt,0,0,.15,"#779f8b"));
  if(slat) for(const span of [.12,.4,.7,.91]) {
    const source=section(span,.14,false),tip=slatAt(span,.12,false);
    out.push(line([source,tip],"#bec9b1",3));
  }
  out.push("</g>");
  out.push(`<g data-part="flap">`);
  out.push(strip(flapAt,0,1,.78,1,false,"#766241"));
  out.push(strip(flapAt,0,1,.78,1,true,"url(#wing-flap-gradient)"));
  out.push(endFace(flapAt,0,.78,1,"#c5a46c"));
  for(const span of [.15,.4,.68,.91]) {
    const hinge=section(span,.77,false),bracket=flapAt(span,.84,false);
    out.push(line([hinge,bracket],"#ced6b8",2.6));
    const [x,y]=at(hinge);
    out.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.8" fill="#e0d7b1"/>`);
  }
  out.push("</g>");
  out.push(endFace(section,0,.15,.78,"#68805d"));
  for(const u of [.25,.65]) {
    const upper=section(0,u,true),lower=section(0,u,false);
    out.push(line([upper,lower],"#e1cb91",4));
  }
  for(const span of [.02,.06,.91,.96]) for(const u of [.19,.27,.36,.47,.57,.67,.73]) {
    const [cx,cy]=at(section(span,u,true));
    out.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r=".85" fill="#d6dcc3"/>`);
  }
  return out.join("");
}

export function drawWing(license) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="410" viewBox="0 0 760 410" role="img" aria-labelledby="wing-title wing-desc"><title id="wing-title">Aircraft wing cutaway</title><desc id="wing-desc">A swept wing with its upper skin removed to reveal ribs, 2 spars, and stringers. The leading-edge slat is green and the trailing-edge flap is amber.</desc><metadata>${license.replaceAll("&","&amp;").replaceAll("<","&lt;")}</metadata><defs><filter id="wing-shadow"><feGaussianBlur stdDeviation="12"/></filter><linearGradient id="wing-surface-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#99ab84"/><stop offset="1" stop-color="#506749"/></linearGradient><linearGradient id="wing-leading-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#add6ba"/><stop offset="1" stop-color="#416f5c"/></linearGradient><linearGradient id="wing-flap-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dfc397"/><stop offset="1" stop-color="#8f774d"/></linearGradient></defs><rect width="760" height="410" fill="#141813"/><g id="wing-mechanism">${wingBody()}</g></svg>`;
}
