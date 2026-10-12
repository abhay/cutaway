import { translateAlong, lineOnTop } from "../upstream/kit/iso-kit.mjs";

export function presentation(id, state, projection) {
  const pieces = {};
  const move = (x, y, z) => translateAlong(projection, [x, y, z]);
  const needle = (x, y, z, fraction) => {
    const angle = (-0.75 + 1.5 * fraction) * Math.PI;
    return lineOnTop([x, y], [x + Math.sin(angle) * 15, y - Math.cos(angle) * 15], z + 0.5, projection);
  };
  let metrics, detail;
  if (id === "token-bucket") {
    for (let i = 0; i < 20; i++) pieces[`token-${i}`] = { opacity: Math.max(0, Math.min(1, state.tokens - i)), "data-active": state.tokens > i };
    pieces.gate = { transform: move(0, state.tokens >= 1 ? 8 : 0, 0), "data-active": state.tokens >= 1 };
    pieces["needle-tokens"] = { d: needle(50, -4, 19, state.tokens / state.capacity) };
    metrics = [["Tokens", state.tokens.toFixed(2)], ["Accepted", state.accepted], ["Rejected", state.rejected]];
    detail = `${state.capacity} capacity · ${state.rate} tokens/s · gate ${state.tokens >= 1 ? "ready" : "waiting"}`;
  } else if (id === "lru-cache") {
    for (let i = 0; i < 3; i++) {
      pieces[`drawer-${i}`] = { transform: move(0, i === 0 && state.keys.length ? 14 : 0, 0) };
      pieces[`cache-part-${i}`] = { opacity: state.keys[i] ? 1 : 0, "data-active": i === 0 && Boolean(state.keys[i]) };
      pieces[`cache-key-${i}`] = { text: state.keys[i] ?? "" };
    }
    metrics = [["Resident", `${state.keys.length} / 3`], ["Hits", state.hits], ["Misses", state.misses]];
    detail = `Most → least recent: ${state.keys.join(" → ") || "empty"}. Evicted: ${state.evicted ?? "none"}.`;
  } else if (id === "connection-pool") {
    for (let i = 0; i < 3; i++) {
      const job = state.slots[i];
      pieces[`tool-${i}`] = { transform: move(0, job ? 42 : 0, job ? -3 : 0), "data-active": Boolean(job) };
      pieces[`job-${i}`] = { opacity: job ? 1 : 0, "data-active": Boolean(job) };
    }
    for (let i = 0; i < 4; i++) pieces[`waiting-${i}`] = { opacity: i < state.queue.length ? 1 : 0, "data-active": false };
    metrics = [["Borrowed", `${state.slots.filter(Boolean).length} / 3`], ["Waiting", `${state.queue.length} / 4`], ["Rejected", state.rejected]];
    detail = `${state.completed} completed · queue: ${state.queue.join(" → ") || "empty"}`;
  } else if (id === "circuit-breaker") {
    pieces.contact = { transform: move(0, 0, state.phase === "closed" ? 0 : state.phase === "open" ? 25 : 12), "data-active": state.phase === "closed" || state.pending, "data-glow-strength": "strong" };
    pieces.stem = { transform: pieces.contact.transform };
    for (let i = 0; i < 3; i++) pieces[`failure-${i}`] = { transform: move(0, 0, i < state.failures ? 8 : 0), opacity: i < state.failures ? 1 : 0.35, "data-active": i < state.failures };
    pieces["needle-cooldown"] = { d: needle(66, -2, 18, state.remaining / 5) };
    metrics = [["Relay", state.phase], ["Failures", `${state.failures} / 3`], ["Rejected", state.rejected]];
    detail = `${state.healthy ? "Healthy" : "Failing"} downstream · ${state.remaining.toFixed(1)}s cooldown · ${state.pending ? "trial request pending" : `${state.passed} succeeded`}`;
  } else throw new Error(`Unknown example: ${id}`);
  return { pieces, metrics, detail };
}
