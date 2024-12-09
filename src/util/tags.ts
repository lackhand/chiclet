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

function addString(all: string[], str: string, needsSpace: boolean): boolean {
  str.trim();
  if (!str.length) return needsSpace;
  if (needsSpace) all.push(" ");
  all.push(str);
  return true;
}
export function style(strs: TemplateStringsArray, ...args: any[]) {
  let all = [] as string[];
  let needsSpace = false;
  for (let i = 0; i < args.length; ++i) {
    needsSpace = addString(all, strs[i], needsSpace);
    const arg = args[i];
    switch (arg) {
      case null:
        continue;
      case undefined:
        continue;
      case "":
        continue;
    }
    if (Array.isArray(arg)) {
      for (let style of arg) {
        needsSpace = addString(all, style, needsSpace);
      }
      continue;
    }
    needsSpace = addString(all, arg.toString(), needsSpace);
  }
  return all.join("");
}
