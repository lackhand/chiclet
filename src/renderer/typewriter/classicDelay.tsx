export default function classicDelay(
  strings: string[],
  delay = 0.05,
  classFactor = stringFactor
) {
  let accums = [] as number[];
  const ensure = (i: number): number => {
    if (accums[i] == undefined) {
      const s = strings[i];
      accums[i] = (i ? ensure(i - 1) : 0) + s.length * delay * classFactor(s);
    }
    return accums[i];
  };
  return ensure;
}
const CLASSES = [
  [/^\s+$/, 0.25],
  [/^[-.,;?!(){}\[\]]+$/, 1.25],
] as [regex: RegExp, mult: number][];
function stringFactor(s: string, classes = CLASSES): number {
  for (let [clazz, factor] of classes) {
    if (clazz.test(s)) return factor;
  }
  return 1;
}
