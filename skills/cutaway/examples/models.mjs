export const exampleIds = ["token-bucket", "lru-cache", "connection-pool", "circuit-breaker"];

export function createModel(id) {
  const factories = { "token-bucket": tokenBucket, "lru-cache": lruCache, "connection-pool": connectionPool, "circuit-breaker": circuitBreaker };
  if (!factories[id]) throw new Error(`Unknown example: ${id}`);
  return factories[id]();
}

function record(state, message) {
  state.message = message;
  state.events.unshift({ time: state.time, message });
  state.events.length = Math.min(state.events.length, 6);
}

function seconds(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Time must be finite and nonnegative");
  return value;
}

function tokenBucket() {
  const state = { time: 0, tokens: 10, capacity: 10, rate: 2, accepted: 0, rejected: 0, events: [], message: "10 tokens are ready. Send a burst to empty the dispenser." };
  return {
    state,
    advance(dt) {
      state.time += seconds(dt);
      state.tokens = Math.min(state.capacity, state.tokens + state.rate * dt);
    },
    act(action, value) {
      if (action === "capacity") {
        state.capacity = Math.max(2, Math.min(20, Math.round(Number(value) || 2)));
        state.tokens = Math.min(state.tokens, state.capacity);
      } else if (action === "rate") {
        state.rate = Math.max(0, Math.min(5, Number(value) || 0));
      } else if (action === "request" || action === "burst") {
        const count = action === "burst" ? 11 : 1;
        const accepted = Math.min(count, Math.floor(state.tokens + 1e-9));
        state.tokens = Math.max(0, state.tokens - accepted);
        state.accepted += accepted;
        state.rejected += count - accepted;
        record(state, `${accepted} accepted, ${count - accepted} rejected. Each accepted request costs 1 token.`);
      }
    },
  };
}

function lruCache() {
  const state = { time: 0, capacity: 3, keys: [], hits: 0, misses: 0, last: null, evicted: null, events: [], message: "The cabinet is empty. Request a part to fill a drawer." };
  return {
    state,
    advance(dt) { state.time += seconds(dt); },
    act(action, key) {
      if (action !== "request" || !["A", "B", "C", "D"].includes(key)) return;
      const position = state.keys.indexOf(key);
      const hit = position !== -1;
      state.evicted = null;
      if (hit) {
        state.hits++;
        state.keys.splice(position, 1);
      } else {
        state.misses++;
        if (state.keys.length === state.capacity) state.evicted = state.keys.pop();
      }
      state.keys.unshift(key);
      state.last = key;
      record(state, `${key}: ${hit ? "hit" : "miss"}. ${state.evicted ? `The cache evicted ${state.evicted}, the least recently used key.` : `${key} is now most recently used.`}`);
    },
  };
}

function connectionPool() {
  const state = { time: 0, slots: [null, null, null], queue: [], queueCapacity: 4, nextId: 1, completed: 0, rejected: 0, events: [], message: "3 tools are available. Each job holds a tool for 3 simulated seconds." };
  function startWaiting() {
    for (let i = 0; i < state.slots.length && state.queue.length; i++) {
      if (state.slots[i] === null) state.slots[i] = { id: state.queue.shift(), remaining: 3 };
    }
  }
  function finish(index) {
    const job = state.slots[index];
    if (!job) return;
    state.completed++;
    state.slots[index] = null;
    record(state, `Job ${job.id} returned tool ${index + 1}.`);
  }
  return {
    state,
    advance(dt) {
      let remaining = seconds(dt);
      while (remaining > 1e-9) {
        const active = state.slots.filter(Boolean);
        const step = active.length ? Math.min(remaining, ...active.map((job) => job.remaining)) : remaining;
        state.time += step;
        remaining -= step;
        for (const job of active) job.remaining = Math.max(0, job.remaining - step);
        state.slots.forEach((job, index) => { if (job && job.remaining <= 1e-9) finish(index); });
        startWaiting();
      }
    },
    act(action, value) {
      if (action === "request") {
        const free = state.slots.indexOf(null);
        if (free !== -1) {
          const id = state.nextId++;
          state.slots[free] = { id, remaining: 3 };
          record(state, `Job ${id} borrowed tool ${free + 1}.`);
        } else if (state.queue.length < state.queueCapacity) {
          const id = state.nextId++;
          state.queue.push(id);
          record(state, `Job ${id} is waiting. All tools are borrowed.`);
        } else {
          state.rejected++;
          record(state, "Request rejected: all tools and waiting places are occupied.");
        }
      } else if (action === "release") {
        finish(Number(value));
        startWaiting();
      }
    },
  };
}

function circuitBreaker() {
  const state = { time: 0, phase: "closed", failures: 0, healthy: true, remaining: 0, pending: false, passed: 0, rejected: 0, events: [], message: "The relay is closed. Requests can reach the downstream service." };
  function open() {
    state.phase = "open";
    state.remaining = 5;
    state.pending = false;
  }
  function result() {
    if (state.healthy) {
      state.passed++;
      state.failures = 0;
      state.phase = "closed";
      state.pending = false;
      record(state, "Request succeeded. The relay is closed; the failure count resets to 0.");
    } else {
      state.failures = Math.min(3, state.failures + 1);
      if (state.phase === "half-open" || state.failures === 3) {
        open();
        record(state, "Request failed. The relay opened for 5 simulated seconds.");
      } else record(state, `Request failed. ${state.failures} of 3 consecutive failures.`);
    }
  }
  return {
    state,
    advance(dt) {
      state.time += seconds(dt);
      if (state.phase !== "open") return;
      state.remaining = Math.max(0, state.remaining - dt);
      if (state.remaining <= 1e-9) {
        state.remaining = 0;
        state.phase = "half-open";
        record(state, "Cooldown finished. The relay allows 1 trial request.");
      }
    },
    act(action) {
      if (action === "service") {
        state.healthy = !state.healthy;
        record(state, `Downstream service is now ${state.healthy ? "healthy" : "failing"}. The relay stays in its current state until a request or cooldown changes it.`);
      } else if (action === "request") {
        if (state.phase === "open" || state.pending) {
          state.rejected++;
          record(state, state.pending ? "Request rejected: a trial request is still pending." : "Request rejected locally while the relay is open.");
        } else if (state.phase === "half-open") {
          state.pending = true;
          record(state, "Trial request pending. Resolve it to test the downstream service.");
        } else result();
      } else if (action === "resolve" && state.pending) result();
    },
  };
}
