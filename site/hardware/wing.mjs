import { fileURLToPath } from "node:url";
import { drawWing } from "./wing-view.mjs";
import { bundle, notices, writeDemo } from "./jet-engine-layout.mjs";

export async function build(outputDirectory) {
  const license=await notices();
  await writeDemo(outputDirectory,{
    id:"wing",
    title:"Inside an aircraft wing",
    introduction:"Remove the upper skin, compare 3 wing shapes, and move the leading-edge slat and trailing-edge flap.",
    svg:drawWing(license),
    controls:`<label for="wing-shape"><span>Wing shape</span><select id="wing-shape"><option value="rectangular">Rectangular</option><option value="tapered">Tapered</option><option value="swept" selected>Swept</option></select></label><label for="wing-flap"><span>Flap</span><input id="wing-flap" type="range" min="0" max="35" step="1" value="0" aria-valuetext="0 degrees of flap deflection"><output id="wing-degrees" for="wing-flap">0°</output></label><label><input id="wing-slat" type="checkbox"> Extend slat</label><label><input id="wing-skin" type="checkbox"> Show upper skin</label><button type="button" id="wing-reset">Reset</button>`,
    readout:`<h2>Swept · flap 0° · slat retracted</h2><p>A swept wing places its tip farther aft than its root. The long spars carry loads along the span; the ribs hold the airfoil shape. Flap and slat are stowed against the wing.</p>`,
    legend:`<span><i class="key structure"></i>Ribs &amp; skin</span><span><i class="key"></i>Leading-edge slat</span><span><i class="key hot"></i>Trailing-edge flap</span>`,
    notes:`<p>A wing’s cross-section is its airfoil, and the chord runs from leading edge to trailing edge. Its shape from above is the planform; sweep and taper describe different aspects of that shape.</p><p>Extending flaps and slats changes the airfoil shape and can increase wing area, helping an aircraft fly at lower speeds. Flaps also add drag.</p><p>This drawing shows the moving parts with simplified geometry. It doesn’t calculate lift, drag, or stall speed.</p>`,
    sources:[["NASA: wing geometry","https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wing-geometry/"],["NASA: flaps and slats","https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flaps-and-slats/"]],
    runtime:await bundle(fileURLToPath(new URL("./wing-runtime.mjs",import.meta.url))),
    license,
  });
}
