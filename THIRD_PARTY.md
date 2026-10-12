# Third-party source

Cutaway's original code, demos, and website use the root [MIT license](LICENSE), copyright (c) 2026 Abhay Kumar. The bundled sources below keep their own copyright and MIT notices.

`skills/cutaway/upstream/` contains selected source and references from [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy), copyright (c) 2026 Ryan. The directory includes its MIT license.

The source came from public `raw.githubusercontent.com/wheresryan22/anatomy/main/` pages on 2026-10-11 through the web source reader, without a Git checkout or verified commit SHA.

The local copies use LF line endings. `upstream-files.json` records their digests to detect local changes; it can't verify which upstream commit they came from.

Local changes to `scripts/inline-kit.mjs` remove `fixedScript()` and `glSharedScript()` because their source modules weren't available. `kitScript()` also excludes the document helpers and styles beginning at `figureSvg()`, whose unused page templates caused inline fragment validation to reject previews.

The runtime keeps geometry and SVG-part helpers, along with the `kitScript()`, `glScript()`, and `turnScript()` entry points.

The package includes the upstream dial-indicator and desk-computer builders, but omits the other examples and browser scripts mentioned in the references. The Anthropic artwork belongs to the original desk-computer example.

Cutaway adds the ChatGPT entrypoint, project initializer, packaging tools, browser checks, and software examples under `skills/cutaway/examples/`. The website and hardware demos under `site/hardware/` are also original Cutaway work, with technical sources and applicable license notices in each demo.

The GE9X drawing uses GE Aerospace's published architecture and component counts. It was drawn for Cutaway from public references, without copying manufacturer artwork or CAD.

## Iso-glow presentation layer

`skills/cutaway/glow/` adapts the 2D SVG filters, active-part highlighting, and Ember/City palettes from [iso-glow](https://isoglow.dev/). Its MIT license credits copyright (c) 2026 April Zhu for iso-glow and copyright (c) 2026 Tolga Cohce for iso-figure.

`skills/cutaway/glow/LICENSE` keeps the full notice. The initializer copies it to generated projects, and the example HTML/SVG exports embed it alongside Cutaway's and Ryan's notices.

The user supplied `iso-glow.zip`, with SHA-256 `f96cd6a38db085f8746c2565e1da8155db707cb8a4b5642f68187ebc8909221f`. Its upstream release version and commit are unknown.

The adaptation uses `iso-glow/assets/gallery.html`, SHA-256 `c1821987bea64207d127cd7d54bc1d147e14bd286a8c11aa4844ab4e12882df5`. Review covered the archive and JavaScript source before adaptation; the original templates and skill workflow were never run or installed.

Cutaway gives each figure its own filter IDs and styles, bounds filters to the viewBox, and validates palette, theme, and style choices. UI colors stay readable independently of the drawing's bright accents, and the model determines which parts light up.

Palette controls use native selects without saving preferences. The adaptation omits the upstream external font, gallery runtime, automatic demos, parent-page access, and 3D template/CDN imports. Anatomy draws the geometry; iso-glow supplies the optional lighting.
