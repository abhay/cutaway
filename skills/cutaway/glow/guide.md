# Optional 2D glow

Use this layer when the user asks for glow, illuminated working parts, or the iso-glow look. Keep Cutaway's geometry and simulation model, with technical style available as an option. Light mode uses flat accents.

The project initializer copies this directory to `<project>/glow/`. It adapts iso-glow's filters, palettes, and active-part highlighting, with no network requests, storage, audio, timers, or parent-page access.

The upstream page shell and 3D renderer aren't included. Keep [LICENSE](LICENSE) when sharing the code; the example HTML and SVG exports also carry the full notices.

## Build a figure

`palettes.mjs` exports the fixed `palettes` list, `appearance({palette, theme, presentation})`, and `appearanceStyle(settings)`. Palette IDs are `ember`, `cyan`, `lime`, `violet`, `rose`, `ice`, `sodium`, `tungsten`, `neon`, `signal`, `dusk`, and `moon`.

Themes are `light` and `dark`; presentations are `technical` and `glow`. The helpers reject invalid choices and darken light-theme accents for contrast against the background. The returned CSS variables include Anatomy accent colors and a separate accent for readable UI text and buttons.

`svg.mjs` exports `glowDefs(prefix, {x, y, width, height})` and `glowCss(prefix)`. Use a unique prefix per SVG and its actual viewBox bounds. The filters use user-space bounds so straight horizontal and vertical lines don't disappear. Put both resources inside the SVG, including static exports.

For example, with trusted drawing markup produced by the Anatomy kit:

```js
import { appearance, appearanceStyle } from "./glow/palettes.mjs";
import { glowDefs, glowCss } from "./glow/svg.mjs";

const settings = appearance({ palette: "sodium", theme: "dark", presentation: "glow" });
const figure = `<svg xmlns="http://www.w3.org/2000/svg" class="iso iso-svg"
  data-glow="pump" data-theme="${settings.theme}"
  data-presentation="${settings.presentation}" data-palette="${settings.palette}"
  style="${appearanceStyle(settings)}" viewBox="0 0 820 500" role="img" aria-label="Pump state">
  <style>${ISO_CSS}${glowCss("pump")}</style>
  ${glowDefs("pump", { width: 820, height: 500 })}
  <g class="cutaway-active" data-active="${model.pumping}">${pumpDrawing}</g>
</svg>`;
```

Import `ISO_CSS` and construct `pumpDrawing` with the local Anatomy kit in the build script. Keep this code out of the inline runtime. Use a label that describes the user's diagram and escape any user-provided text.

## Highlight active parts

Add `class="cutaway-active"` and a boolean `data-active` attribute to the smallest moving or lit group. Derive the attribute from the same model as motion and readouts. Geometry within the group uses the normal Anatomy `data-lit` solids.

For custom shapes, `.cutaway-led` supplies an active fill and `.cutaway-wire` supplies an active stroke, with neutral resting colors. These accents stay visible in technical mode. Use `data-glow-strength="strong"` sparingly, or add a `.cutaway-halo` shape behind an illuminated area for bloom.

Explain what the light means: a borrowed connection may glow while waiting jobs stay dim, or a failure indicator may light up as a warning. Labels and positions must make that meaning clear. Distinguish model state from measured current or validated physical performance.

For appearance controls, use native labeled selects named `palette`, `theme`, and `presentation` inside 1 control container. Populate palette labels with `textContent`, or HTML-escape them during a build.

`bindAppearance(root, svg, controls)` in `controls.mjs` applies the selected values to the figure and its page/container, then returns a listener cleanup function. It leaves model state intact and doesn't save preferences.

Glow is static. Keep the simulation's manual clock, offscreen pause, and reduced-motion behavior. Light and technical modes remove the glow filters through scoped CSS, keeping inactive parts legible.

Check both themes and confirm that changing palettes keeps the mechanism's state. Keep fonts local and omit external scripts. For SVG renderers without CSS variable support, resolve variables to literal colors as the example builder does.

See the examples' `build.mjs`, `drawings.mjs`, and `view.mjs` for working code. Credit Ryan for Anatomy and April Zhu for iso-glow, based on Tolga Cohce's iso-figure. Credit Abhay Kumar for Cutaway's models and keep all applicable MIT notices with the exported files.
