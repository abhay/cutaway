// Filters and active-state treatment adapted from iso-glow (MIT; see LICENSE).
function filterPrefix(prefix) {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(prefix)) throw new Error("Use a unique, plain SVG filter prefix");
  return prefix;
}

export function glowDefs(prefix, { x = 0, y = 0, width, height }) {
  filterPrefix(prefix);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Glow filters need finite, positive figure bounds");
  const bounds = `filterUnits="userSpaceOnUse" x="${x - 32}" y="${y - 32}" width="${width + 64}" height="${height + 64}" color-interpolation-filters="sRGB"`;
  return `<defs><filter id="${prefix}-glow" ${bounds}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${prefix}-soft" ${bounds}><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${prefix}-bloom" ${bounds}><feGaussianBlur stdDeviation="9"/></filter></defs>`;
}

export function glowCss(prefix) {
  filterPrefix(prefix);
  const root = `svg[data-glow="${prefix}"]`;
  const live = `${root} .cutaway-active[data-active="true"]`;
  const dark = `${root}[data-presentation="glow"][data-theme="dark"]`;
  const idle = `${root}[data-presentation="glow"] .cutaway-active[data-active="false"]`;
  return `${root} .cutaway-led{fill:var(--anatomy-lo);stroke:var(--anatomy-mid)}
${root} .cutaway-wire{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);vector-effect:non-scaling-stroke}
${root} .cutaway-halo{display:none;fill:var(--cutaway-accent);stroke:none;opacity:.22}
${idle} .iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-paper)}
${idle} .iso-solid[data-lit]>.iso-top{fill:var(--anatomy-top);stroke:var(--anatomy-top)}
${idle} .iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-shade-1);stroke:var(--anatomy-shade-1)}
${idle} .iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-mid)}
${live} .cutaway-led{fill:var(--cutaway-accent);stroke:var(--cutaway-highlight)}
${live} .cutaway-wire{stroke:var(--cutaway-accent)}
${dark} .cutaway-active[data-active="true"]{filter:url(#${prefix}-soft)}
${dark} .cutaway-active[data-active="true"][data-glow-strength="strong"]{filter:url(#${prefix}-glow)}
${dark} .cutaway-active[data-active="true"] .cutaway-halo{display:inline;filter:url(#${prefix}-bloom)}
@media(prefers-reduced-motion:reduce){${root} .cutaway-active,${root} .cutaway-active *{animation:none!important;transition:none!important}}`;
}
