import { expect, it } from "vitest";
import { asyncIterateAll, channel, latch, once } from "./promises";

it("channel", async () => {
  const [consume, produce] = channel<string>();
  // Test that we can consume before produce.
  let didFirstConsume = false;
  consume().then((v) => {
    expect(v).toBe("test1");
    didFirstConsume = true;
  });
  expect(didFirstConsume).toBeFalsy();
  produce("test1");
  // Test that we can produce before consume.
  produce("test2");
  expect(await consume()).toBe("test2");
  // Has to follow an await.
  expect(didFirstConsume).toBeTruthy();
});

it("asyncIterateAll", async ({ expect }) => {
  let subState = false;
  function subscriber(sub: (i: number) => void) {
    subState = true;
    for (let i = 0; i < 10 && subState; ++i) {
      sub(i);
    }
    return () => {
      subState = false;
    };
  }
  let vs = [] as number[];
  expect(subState).toBe(false);
  for await (let v of asyncIterateAll(subscriber)) {
    expect(subState).toBe(true);
    vs.push(v);
    if (vs.length >= 4) break;
  }
  expect(subState).toBe(false);
  expect(vs).toEqual([0, 1, 2, 3]);
});

it("once", ({ expect }) => {
  let count = 0;
  let incr = once(() => ++count);
  expect(count).toBe(0);
  expect(incr()).toBe(1);
  expect(incr()).toBe(1);
  expect(incr()).toBe(1);
});

it("latch", async ({ expect }) => {
  let incr = latch();
  let decrs = [incr(), incr()] as const;
  expect(decrs[0]).toBe(decrs[1]);
  let p1 = decrs[0]();
  let count = 0;
  p1.then(() => ++count);
  let p2 = decrs[1]();
  expect(p1).toBe(p2);
  await p1;
  expect(count).toBe(1);

  decrs = [incr(), incr()];
  p2.then(() => ++count);
  await p2;
  expect(count).toBe(2);
  let p3 = decrs[0]();
  expect(p1).not.toBe(p3);
  p3.then(() => ++count);
  let p4 = decrs[1]();
  expect(p3).toBe(p4);
  await p4;
  expect(count).toBe(3);
});
