import { it } from "vitest";
import { Knapsack } from "./knapsack";

it("knapsacks", ({ expect }) => {
  let calls = 0;
  let kn = new Knapsack<number>(
    (old: number, _new: number) => (++calls, old + _new)
  );
  expect(kn.calculate(12, [1, 2, 3, 4])).toEqual([12, 13, 15, 18, 22]);
  expect(kn.calculate(12, [1, 2, 3, 4])).toEqual([12, 13, 15, 18, 22]);
  expect(calls).toEqual(4);
  expect(kn.calculate(12, [1, 2, 3])).toEqual([12, 13, 15, 18]);
  expect(calls).toEqual(4);
  expect(kn.calculate(22, [1, 2, 3])).toEqual([22, 23, 25, 28]);
  expect(calls).toEqual(7);
});
