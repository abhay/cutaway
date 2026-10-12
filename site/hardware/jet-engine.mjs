import { fileURLToPath } from "node:url";
import { drawJet } from "./jet-engine-view.mjs";
import { bundle, notices, writeDemo } from "./jet-engine-layout.mjs";
import { jetParts } from "./jet-engine-parts.mjs";

export async function build(outputDirectory) {
  const license = await notices();
  await writeDemo(outputDirectory, {
    id: "jet-engine",
    title: "Inside the GE9X",
    introduction: "GE Aerospace’s engine for the Boeing 777X. Follow its core and bypass airflow, then select a component to see how it works.",
    svg: drawJet(license),
    controls: `<div class="stages" role="group" aria-label="GE9X component">${jetParts.map(({id,label})=>`<button type="button" data-stage-button="${id}" aria-pressed="${id==="fan"}">${label}</button>`).join("")}</div><label><input id="jet-flow" type="checkbox" checked> Show airflow</label><button type="button" id="jet-animate" aria-pressed="false">Animate flow</button><span class="fine">Inlet left · exhaust right</span>`,
    readout: `<h2>${jetParts[0].title}</h2><p>${jetParts[0].description}</p>`,
    legend: `<span><i class="key"></i><span data-jet-legend="cool">Bypass air</span></span><span><i class="key hot"></i><span data-jet-legend="warm">Core air &amp; exhaust</span></span>`,
    notes: `<p>This educational cutaway follows the GE9X’s published architecture: 1 fan, 3 booster stages, 11 high-pressure compressor stages, a TAPS III combustor, 2 high-pressure turbine stages, and 6 low-pressure turbine stages.</p><p>The drawing shows all 16 fan blades and each rotor stage. Other blade and vane counts, spacing, profiles, nacelle contours, and internal dimensions are illustrative.</p><p>The drawing omits cooling, seals, accessory systems, and much of the casing. Moving dashes indicate flow direction only; their speed and spacing don’t represent airspeed or bypass ratio. This original illustration uses public references; manufacturer CAD wasn’t used.</p>`,
    sources: [["GE Aerospace: GE9X specifications","https://www.geaerospace.com/commercial/aircraft-engines/ge9x"],["GE: compressor, combustor and materials","https://www.geaerospace.com/news/articles/product/first-ge9x-hits-test-targets-and-prepares-chilling-icing-tests"],["NASA: turbofan operation","https://www.grc.nasa.gov/WWW/K-12/airplane/aturbf.html"]],
    runtime: await bundle(fileURLToPath(new URL("./jet-engine-runtime.mjs",import.meta.url))),
    license,
  });
}
