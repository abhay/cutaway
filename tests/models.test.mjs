import { expect, test } from "bun:test";
import { createModel } from "../skills/cutaway/examples/models.mjs";

test("the token bucket spends whole tokens, retains fractional refill, and caps saved capacity", () => {
  const model = createModel("token-bucket");
  model.act("burst");
  expect(model.state).toMatchObject({ tokens: 0, accepted: 10, rejected: 1 });
  model.advance(0.25);
  model.act("request");
  expect(model.state).toMatchObject({ tokens: 0.5, accepted: 10, rejected: 2 });
  model.advance(0.25);
  model.act("request");
  expect(model.state).toMatchObject({ tokens: 0, accepted: 11 });
  model.advance(100);
  expect(model.state.tokens).toBe(10);
  model.act("capacity", 3);
  expect(model.state.tokens).toBe(3);
  model.act("burst");
  model.act("rate", 0);
  model.advance(10);
  expect(model.state.tokens).toBe(0);
});

test("an LRU hit promotes an existing key and changes the next eviction", () => {
  const model = createModel("lru-cache");
  for (const key of ["A", "B", "C", "A", "D"]) model.act("request", key);
  expect(model.state).toMatchObject({ keys: ["D", "A", "C"], hits: 1, misses: 4, evicted: "B" });
  model.act("request", "C");
  expect(model.state).toMatchObject({ keys: ["C", "D", "A"], hits: 2, misses: 4, evicted: null });
});

test("the pool caps active and waiting jobs and gives returned tools to the oldest job", () => {
  const model = createModel("connection-pool");
  for (let i = 0; i < 8; i++) model.act("request");
  expect(model.state.slots.map((job) => job.id)).toEqual([1, 2, 3]);
  expect(model.state.queue).toEqual([4, 5, 6, 7]);
  expect(model.state.rejected).toBe(1);
  model.act("release", 1);
  expect(model.state.slots[1]).toEqual({ id: 4, remaining: 3 });
  expect(model.state.queue).toEqual([5, 6, 7]);
  model.advance(4);
  expect(model.state.slots).toEqual([{ id: 5, remaining: 2 }, { id: 6, remaining: 2 }, { id: 7, remaining: 2 }]);
  expect(model.state.completed).toBe(4);
  model.advance(2);
  expect(model.state.slots).toEqual([null, null, null]);
  expect(model.state.completed).toBe(7);
  expect(model.state.time).toBe(6);
});

test("a successful request resets the consecutive-failure streak", () => {
  const model = createModel("circuit-breaker");
  model.act("service");
  model.act("request");
  model.act("request");
  model.act("service");
  model.act("request");
  model.act("service");
  model.act("request");
  expect(model.state).toMatchObject({ phase: "closed", failures: 1, passed: 1 });
});

test.each([true, false])("the half-open breaker admits 1 probe and uses its result (healthy: %s)", (healthy) => {
  const model = createModel("circuit-breaker");
  model.act("service");
  for (let i = 0; i < 3; i++) model.act("request");
  model.act("request");
  expect(model.state).toMatchObject({ phase: "open", remaining: 5, rejected: 1 });
  model.advance(4.99);
  model.act("request");
  expect(model.state.phase).toBe("open");
  model.advance(0.01);
  if (healthy) model.act("service");
  model.act("request");
  model.act("request");
  expect(model.state).toMatchObject({ phase: "half-open", pending: true, rejected: 3 });
  model.act("resolve");
  expect(model.state).toMatchObject(healthy
    ? { phase: "closed", pending: false, failures: 0, remaining: 0 }
    : { phase: "open", pending: false, failures: 3, remaining: 5 });
});
