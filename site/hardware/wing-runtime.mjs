import { wingBody } from "./wing-view.mjs";

const shape=document.querySelector("#wing-shape");
const flap=document.querySelector("#wing-flap");
const slat=document.querySelector("#wing-slat");
const skin=document.querySelector("#wing-skin");
const degree=document.querySelector("#wing-degrees");
const status=document.querySelector(".readout h2");
const description=document.querySelector(".readout p");
const mechanism=document.querySelector("#wing-mechanism");
const descriptions={
  rectangular:"A rectangular wing keeps the same chord from root to tip.",
  tapered:"A tapered wing has a shorter chord at its tip than at its root.",
  swept:"A swept wing places its tip farther aft than its root.",
};

function update() {
  const angle=Math.min(35,Math.max(0,Number(flap.value)));
  mechanism.innerHTML=wingBody({shape:shape.value,flap:angle,slat:slat.checked,skin:skin.checked});
  degree.textContent=`${angle}°`;
  flap.setAttribute("aria-valuetext",`${angle} degrees of flap deflection`);
  status.textContent=`${shape.options[shape.selectedIndex].text} · flap ${angle}° · slat ${slat.checked ? "extended" : "retracted"}`;
  description.textContent=`${descriptions[shape.value]} ${skin.checked ? "The skin covers the ribs and spars; open it to inspect the structure." : "The long spars carry loads along the span; the ribs hold the airfoil shape."} ${angle || slat.checked ? "The extended surfaces change the wing’s shape for low-speed flight." : "Flap and slat are stowed against the wing."}`;
  document.querySelector("#wing-desc").textContent=`${shape.options[shape.selectedIndex].text} wing with ${skin.checked ? "closed upper skin" : "visible ribs and spars"}, a ${angle}-degree trailing-edge flap and ${slat.checked ? "extended" : "retracted"} leading-edge slat.`;
}
shape.addEventListener("change",update);
flap.addEventListener("input",update);
slat.addEventListener("change",update);
skin.addEventListener("change",update);
document.querySelector("#wing-reset").addEventListener("click",()=>{
  shape.value="swept";flap.value="0";slat.checked=false;skin.checked=false;update();
});
update();
