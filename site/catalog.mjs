export const hardwareTopics = [
  {
    id: "jet-engine", title: "GE9X jet engine", category: "AIRFLOW",
    description: "Look inside the GE9X. Follow its 2 air paths and explore the fan, booster, compressor, and turbines.",
    alt: "GE9X educational cutaway with 16 fan blades, a 3-stage booster, an 11-stage compressor, and separate high- and low-pressure turbines",
    prompt: "Build an interactive GE9X cutaway using GE Aerospace’s published references. Show its 16-blade fan, 3-stage booster, 11-stage high-pressure compressor, TAPS III combustor, 2-stage high-pressure turbine, 6-stage low-pressure turbine, and 2 shafts, with separate core and bypass airflow. Let me select parts and pause the flow. Explain the simplifications, cite sources, and deliver self-contained HTML.",
  },
  {
    id: "wing", title: "Wing designs", category: "WING GEOMETRY",
    description: "Compare wing shapes and see what changes when flaps and slats extend.",
    alt: "Aircraft wing cutaway showing internal structure, a leading-edge slat, and a trailing-edge flap",
    prompt: "Build an interactive aircraft wing cutaway. Show the spars, ribs, skin, flaps, and slats, with controls to compare rectangular, tapered, and swept wings and extend the high-lift devices. Explain what changes, state the limits of the drawing, include sources, and deliver a self-contained HTML file.",
  },
  {
    id: "espresso", title: "Espresso machine", category: "WATER & HEAT",
    description: "Trace water from the reservoir through the pump and boiler to the coffee.",
    alt: "Espresso machine cutaway showing the reservoir, pump, boiler, brew valve, group head, and cup",
    prompt: "Build a cutaway espresso machine with a reservoir, pump, boiler, brew valve, group head, and portafilter. Trace the water into the cup, with controls to step through heating and brewing and select parts to read about them. Explain the simplified plumbing, include sources, and deliver a self-contained HTML file.",
  },
  {
    id: "boxer", title: "Boxer engine", category: "CYLINDER LAYOUT",
    description: "Watch opposing pistons move toward and away from the crankshaft.",
    alt: "4-cylinder boxer cutaway with horizontally opposed pistons and separate crankpins",
    prompt: "Build an interactive cutaway of a 4-cylinder boxer engine with horizontally opposed pistons, connecting rods, and separate crankpins. Let me turn the crankshaft and follow an opposing piston pair to see why the pistons move together. Explain the simplifications, include sources, and deliver self-contained HTML.",
  },
];

export const hardwareArtifacts = ["index.html", ...hardwareTopics.flatMap(({ id }) => [`${id}.html`, `${id}.svg`])];
