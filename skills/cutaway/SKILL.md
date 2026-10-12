---
name: cutaway
description: Create educational cutaways of machines and hardware as interactive HTML, isometric SVG, or editable React figures. Use to explain engines, wings, pumps, appliances, and other physical mechanisms. Also supports requested software analogies. Doesn't cover medical anatomy or ordinary flowcharts.
---

# Cutaway

Build a cutaway that explains how the requested machine works. For a jet engine, separate core and bypass flow; for an espresso machine, follow water through the pump, boiler, and group head; for a piston engine, connect crank position to piston and valve motion.

Draw the actual mechanism when the user asks about a physical object, and use an analogy when requested. Every visible number and moving part must agree with the same model.

Name the hardware layout and explain its simplifications, such as illustrative dimensions in an engine or uncalculated airflow over a wing. When arrangement or timing affects the explanation, check an authoritative diagram or technical reference and cite it. Name each part, describe its job, and show what changes when the user operates a control.

Cutaway adapts Ryan's MIT-licensed Anatomy toolkit for ChatGPT. Its optional 2D glow layer adapts April Zhu's iso-glow, based on Tolga Cohce's iso-figure, with their MIT notices preserved.

User instructions take precedence over these defaults. Resolve the paths below relative to this skill directory.

## Deliver in ChatGPT

Default to a light-theme, self-contained interactive HTML file with inline SVG, CSS, and JavaScript. Honor a request for static SVG, React, a different theme, or a simpler figure. Use the host's available file and execution tools; no MCP server, external model API, or network request is required to generate a figure.

Create a writable project outside the installed plugin. With a JavaScript runtime available, use:

```sh
bun <skill-dir>/scripts/create-project.mjs <output-directory>
bun <output-directory>/examples/dial-indicator/build.mjs --light
```

Node.js can run these `.mjs` scripts too. The initializer copies the kit, its MIT license, and a working example while preserving relative imports.

Start from that example, replace its model and geometry with the requested mechanism, and return the generated file and editable source. Don't deliver the sample unchanged for an unrelated request.

For software behavior, the initializer also accepts `--example token-bucket`, `lru-cache`, `connection-pool`, or `circuit-breaker`. These examples use Bun and emit interactive HTML and a styled static SVG snapshot:

```sh
bun <output-directory>/build.mjs --light
```

Their [models](examples/models.mjs), [drawing code](examples/drawings.mjs), and [experiment prompts](examples/catalog.mjs) are starting points for related requests.

If the host has an interactive HTML preview or Canvas tool, present the generated artifact there as well as providing the file. Use the tool's actual documented interface; don't assume arbitrary HTML in a chat message executes or invent a preview URL.

If previews are unavailable, provide the downloadable HTML. If execution is unavailable, write a self-contained artifact with the available file tools and state that it hasn’t been run. If file tools are also unavailable, provide complete source and state the limitation.

Don't install tools on the user's computer, publish a website, or create external records merely to deliver a figure. Those are separate user requests. Keep generated standalone files free of network dependencies.

Preserve Cutaway's [MIT notice](examples/LICENSE) and the applicable upstream notices when distributing source.

Keep build-time page helpers out of the inline runtime. Use `kitScript()` or a bundle containing only the runtime imports; don't paste all of `iso-kit.mjs` into a script. An unused `pageHtml()` helper embeds full-document markup inside its JavaScript and has caused inline fragment validation to fail.

When a host requests an HTML fragment, supply the fragment it accepts and retain the complete document as the download. Check the final serialized preview payload as well as the standalone file; a successful build doesn't prove the preview ran.

## Design and build

1. Identify the mechanism, quantities, states, controls, and desired output. Use supplied values and label illustrative assumptions; ask only when a missing fact changes what the figure teaches. Explain the mechanism choice in 1 sentence and proceed.
2. Read [craft](upstream/references/craft.md) for the drawing language and [kit API](upstream/references/kit.md) for the primitives you need. Inspect 1 bundled example: [dial indicator](upstream/examples/dial-indicator/build.mjs) for a moving mechanism or [desk computer](upstream/examples/desk-computer/build.mjs) for keyboard input. The latter includes upstream Anthropic artwork; replace that motif when creating a new figure unless the user requests it.
3. Define the state model before the geometry: clamp values at real boundaries, preserve quantities, and compute readouts and motion from the same state. Keep simulated time separate from rendering. For hardware, distinguish the teaching model from measured or validated performance.
4. Choose a recognizable object and plan its supports, structure, mechanism, controls, fasteners, and surface details. Use details that explain the construction: bushings support shafts, clamps hold pipes, feet support bases. Scale complexity to the request; don't impose a part quota or invent a time estimate.
5. Lay out the object in world coordinates, with z up, using the shared camera and `fitProjection` to include every extreme point. Build static geometry once and let the kit shade solids. Draw nearer parts over farther ones, splitting wrapping parts into front and back portions when necessary.
6. Compose a framed figure with a concise title, interaction hint, live readout, and an explanatory caption outside the drawing. Keep text readable at phone width. Include an accessible description and keyboard equivalents for pointer controls.
7. Read [motion](upstream/references/motion.md) when adding interaction; use time-based easing or springs and stop animation offscreen. Under reduced motion, disable the idle tour and transition directly to user-selected states. Don't put render-loop state through a React rerender every frame.
8. Open the artifact with the available tools, exercise its controls and boundary states, and check console errors. Inspect desktop and narrow layouts, both themes when delivered, and close-ups of joints and overlaps. Report which checks ran and which were unavailable.

## Drawing constraints

- Draw filled solids with thickness, correct occlusion, a common camera, and consistent lighting. Avoid floating labeled boxes when a physical mechanism can carry the explanation.
- Use subdued colors for the base and structure so the moving parts stand out. Use 1 primary accent unless color itself teaches the concept.
- Terminate lines at surfaces, edges, connections, or printed marks. Place detail on actual geometry. Texture must meet an edge or fade.
- Give pipes real endpoints and clearance. Place fittings against their mounts. For dense pipework, use the recorder and geometry audit in `upstream/kit/audit.mjs`; resolve interlocks in geometry rather than hiding them with arbitrary draw-order offsets.
- Keep moving geometry, displayed values, captions, and control labels consistent. Never hardcode a readout that disagrees with the simulation.
- Escape user-provided text in HTML, SVG, and JavaScript contexts. Don't interpolate untrusted strings directly into markup or inline scripts.

## Optional modes

Read only the references needed by the requested output:

- **Static SVG:** use `figureSvg({ standalone: "light" })` or `"dark"` to embed its styles. Provide meaningful accessible text. A static export must not depend on JavaScript for its resting state.
- **2D glow and palettes:** read [glow](glow/guide.md) when the user requests illuminated active parts or the iso-glow look. Use the bundled filters and palettes with the existing model and geometry; the examples include native style, theme, and palette selectors. Keep light mode flat, retain technical mode, and include the full [iso-glow MIT notice](glow/LICENSE) with adapted output source.
- **WebGL:** read [WebGL](upstream/references/webgl.md). Use shaders for light, water, fire, or another effect that SVG can't express well; register the canvas to the SVG camera and keep transitions smooth and effects bounded. Keep a readable SVG fallback when WebGL is unavailable, and test the light theme separately.
- **3D:** read [3D](upstream/references/3d.md). The bundled `turn.mjs`, `turn-build.mjs`, and `turn-audit.mjs` support moving groups. Keep this optional, explain that it's upstream's beta mode, and verify performance in the target host before promising smooth animation.
- **React/Next.js:** read [React integration](upstream/references/react.md). Copy the TypeScript kit and React adapters into the target project, compute static art outside the live component, and preserve the server/client split. React is supplied by the destination project.
- **Detailed visual review:** read [verification](upstream/references/verify.md) for visual failure modes. Only the dial-indicator and desk-computer examples are bundled; use the host's browser and screenshot tools for the other checks. Report which checks you couldn't run, and never claim an audit or screenshot passed without running and inspecting it.

The inlining helper provides `kitScript()`, `glScript()`, and `turnScript()`. `kitScript()` includes geometry and SVG-part helpers through `groupSvg()`. Import `figureSvg()`, `plateHtml()`, `pageHtml()`, and page styles in the build script when composing the document; they're excluded from the inline runtime.

Advanced upstream fixed-canvas and shared-context helpers aren't included. Don't call absent APIs or fetch missing code during ordinary use.

Finish with the artifact, a short explanation of the controls, the model's assumptions, and any material verification limits. Keep build details out of the figure's controls and explanations.
