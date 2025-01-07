import { it } from "vitest";
import unwrap, { isLazy, LazyPromise } from "./lazy";

it.for([
  [() => {}, true],
  ["a value", false],
  [1, false],
  [() => 1, true],
  [() => () => 1, true],
] as [any, boolean][])("%#: isLazy(%o)=%b", ([fn, exp], { expect }) =>
  expect(isLazy(fn)).toBe(exp)
);

it.for([
  [() => undefined, undefined],
  [undefined, undefined],
  [1, 1],
  [() => 1, 1],
  [() => () => 1, 1],
] as [any, any][])("%#: unwrap(%o)=%o", ([fn, exp], { expect }) =>
  expect(unwrap(fn)).toBe(exp)
);

it("lazyPromiseAwaits", async ({ expect }) => {
  let callCount = 0;
  let lazyPromise = LazyPromise.of(() => {
    callCount++;
  });
  expect(callCount).toBe(0);
  await lazyPromise;
  expect(callCount).toBe(1);
  await lazyPromise;
  expect(callCount).toBe(1);
});
