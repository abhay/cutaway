# Cutaway

<img src="assets/icon.svg" width="80" height="80" alt="Cutaway icon">

/anatomy, adapted for ChatGPT.

Cutaway is a ChatGPT plugin for learning how machines work. Look inside the GE9X jet engine, follow water through an espresso machine, compare wing designs, or study the pistons and crankshaft in a boxer engine.

Ask for labels, controls, and explanations of the parts. Cutaway uses the file and code tools in your ChatGPT session to produce HTML, SVG drawings, or editable source, without a separate API key.

The drawing toolkit and illustration guidance come from [Ryan's (@wheresryan22) Anatomy](https://github.com/wheresryan22/anatomy). Cutaway adapts that work for ChatGPT and adds the plugin, demos, and file delivery instructions.

## Use in ChatGPT

Public installation is coming soon. Once installed, select **Cutaway** using `@` in a new conversation and describe the machine you want to understand.

Workspace admins can build the [marketplace package](#packaging) and follow the [workspace import instructions](https://learn.chatgpt.com/docs/enterprise/plugin-management). For local development, see the [plugin setup guide](https://developers.openai.com/plugins/build/plugins).

Ask for self-contained HTML, labels, assumptions, and sources. Cutaway returns a downloadable file and shows an inline preview when the host supports one.

## Demos and prompts

These previews show the finished hardware demos. Each demo runs offline and includes controls, sources, and an explanation of its simplifications. Animations start paused.

[Build the demos locally](#development), or use the prompts below to create your own cutaways in ChatGPT.

### GE9X jet engine

![GE9X cutaway showing the fan, compressor, combustor, turbines, and separate core and bypass airflow](assets/examples/jet-engine.svg)

```text
Build a GE9X cutaway using GE Aerospace's published references: the 16-blade fan,
3-stage booster, 11-stage compressor, 2 high-pressure and 6 low-pressure turbine
stages, and concentric shafts. Separate core and bypass airflow, and let me select
parts and pause the flow. Explain the simplifications and include sources.
```

### Wing designs

![Aircraft wing cutaway showing spars, ribs, a leading-edge slat, and a trailing-edge flap](assets/examples/wing.svg)

```text
Build a wing cutaway with spars, ribs, flaps, and slats. Let me compare rectangular,
tapered, and swept wings. Explain what changes when the high-lift devices extend.
```

### Espresso machine

![Espresso machine cutaway showing the reservoir, pump, boiler, group head, and water path into the cup](assets/examples/espresso.svg)

```text
Build a cutaway espresso machine with a reservoir, pump, boiler, brew valve,
group head, and portafilter. Trace the water into the cup and let me step through
heating and brewing.
```

### Boxer engine

![4-cylinder boxer cutaway showing horizontally opposed pistons, connecting rods, and separate crankpins](assets/examples/boxer.svg)

```text
Build a 4-cylinder boxer cutaway with horizontally opposed pistons and separate
crankpins. Let me turn the crankshaft and follow an opposing piston pair.
Explain why the opposing pistons move together.
```

## Optional glow

Cutaway includes 2D SVG lighting and palettes from [April Zhu's iso-glow](https://isoglow.dev/), based on Tolga Cohce's iso-figure. Ask for glow to highlight active parts or flow paths in dark mode. For an espresso machine, add:

```text
Use 2D glow in dark mode. Light up the water path while pumping and the heater
while heating. Include technical/glow and light/dark controls.
```

The [glow guide](skills/cutaway/glow/guide.md) covers palettes, filters, and how to use them in editable drawings.

## Development

Use Bun and Node.js 22 or newer. Packaging also needs the system `zip` and `unzip` commands. The build and model tests don't require package dependencies.

```sh
bun run check
bun run test
bun run build:site
bun run preview:site
```

Open `http://127.0.0.1:4322`, or open `dist/site/index.html` directly. The website source is in `site/`; `build:site` also rebuilds the release archives. Host the contents of `dist/site` with a static hosting provider.

To build only the hardware demos:

```sh
bun run hardware
```

Open `dist/hardware/index.html`. Each demo has a self-contained HTML file and a standalone SVG, with source in `site/hardware/`.

With JSDOM available, `bun run check:site` and `bun run check:hardware` check the generated pages and controls. Check layout and motion in a browser after changing drawings or controls.

## Packaging

```sh
bun run package
```

This creates `dist/cutaway-<version>.zip` and `dist/workspace-marketplace/`, using the version in [plugin.json](plugin.json). The plugin contains the drawing toolkit and generation instructions. The interactive hardware demos ship separately.

For workspace import, copy the contents of `dist/workspace-marketplace/` into a GitHub repository, preserving the hidden `.agents` directory. Reimport or reinstall the package after rebuilding to use the changes.

Run `bun run release` to build `dist/releases/<version>/`. It contains plugin, source, marketplace, hardware, and software-example archives, plus `SHA256SUMS`. Copy exported source outside `dist/` before editing it; builds replace generated files.

## Credits and license

Cutaway's original code, demos, and website use the [MIT license](LICENSE), copyright © 2026 Abhay Kumar. Bundled Anatomy and iso-glow code keeps its original copyright and MIT notices.

See [THIRD_PARTY.md](THIRD_PARTY.md) for upstream sources, local changes, and license details.
