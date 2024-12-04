export function fmt(strs: ReadonlyArray<string>, ...args: any[]) {
  let all = [] as string[];
  for (let i = 0; i < args.length; ++i) {
    all.push(strs[i]);
    all.push(`${args[i]}`);
  }
  all.push(strs[strs.length - 1]);
  return all.join("");
}
export function raw(strs: TemplateStringsArray, ...args: any[]) {
  return fmt(strs.raw, ...args);
}
