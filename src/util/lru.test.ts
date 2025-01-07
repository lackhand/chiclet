import { it } from "vitest";
import LRU from "./lru";
import { range } from "./objectPath";

it("LRU basic tests", ({ expect }) => {
  let lru = new LRU<number>();
  for (let i = 0; i < 15; ++i) {
    lru.set(i, i);
  }
  expect(lru.size).toBe(10);
  let keys = [...lru.keys()];
  const inOrder = [...range(15, 5)];
  expect(keys).toEqual(inOrder);
  expect(keys).toContain(7);
  expect(lru.get(7)).toBe(7);
  keys = [...lru.keys()];
  expect(keys).not.toEqual(inOrder);
  expect(keys).toEqual([5, 6, ...range(15, 8), 7]);
});
