export const jetParts = [
  {
    id: "fan", label: "Fan", title: "Fan · 16 composite blades",
    description: "The GE9X’s 134-inch (3.40 m) fan draws air into the engine, with most passing around the core through the bypass duct. GE gives an approximate bypass ratio of 10:1, or about 10 parts of bypass air for each part entering the core, by mass.",
  },
  {
    id: "booster", label: "Booster", title: "Booster · 3 stages",
    description: "Behind the fan, 3 low-pressure compressor stages begin compressing the core air. This booster turns with the fan and low-pressure turbine on the same shaft.",
  },
  {
    id: "compressor", label: "HP compressor", title: "High-pressure compressor · 11 stages",
    description: "11 rotor stages work with fixed stator vanes to compress the core air further. The high-pressure turbine drives this compressor through its own shaft. The drawing spaces the rows so you can distinguish them.",
  },
  {
    id: "combustor", label: "Combustor", title: "TAPS III annular combustor",
    description: "Fuel mixes with compressed air and burns in a ring-shaped chamber around the shafts. The GE9X uses GE’s TAPS III combustor. Its hot gases pass first into the high-pressure turbine.",
  },
  {
    id: "hpt", label: "HP turbine", title: "High-pressure turbine · 2 stages",
    description: "The first 2 turbine stages extract energy from the hot gas to drive the high-pressure compressor. The GE9X uses ceramic matrix composite components in its hot section. The drawing omits their cooling passages and material layers.",
  },
  {
    id: "lpt", label: "LP turbine", title: "Low-pressure turbine · 6 stages",
    description: "6 turbine stages farther aft drive the fan and booster through the inner shaft. The blades grow toward the rear as the gas expands through the turbine.",
  },
  {
    id: "shafts", label: "Shafts", title: "2 concentric shafts",
    description: "The long inner shaft connects the low-pressure turbine to the fan and booster. A shorter hollow outer shaft connects the high-pressure turbine to the compressor. The 2 assemblies can turn at different speeds; the drawing cuts away part of the outer shaft to show the inner one.",
  },
  {
    id: "nozzle", label: "Exhaust", title: "Separate core and bypass exhaust",
    description: "The bypass stream leaves around the core, while the hot core stream exits behind the turbines. Both streams produce thrust. The drawing simplifies the surrounding nacelle and exhaust shapes to keep both paths visible.",
  },
];
