import { DependencyList, useEffect } from "react";

export function useCancellableEffect(
  callback: (continuing: () => boolean) => any,
  changeDetectors?: DependencyList
) {
  useEffect(() => {
    let continuing = true;
    callback(() => continuing);
    return () => {
      continuing = false;
    };
  }, changeDetectors);
}
