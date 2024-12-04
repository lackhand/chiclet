import { useCallback, useSyncExternalStore } from "react";
import tell, { Told } from "../engine/tell";
import exec from "../engine/exec";

export default function useTold(): [told: Told, next: () => void] {
  const told = useSyncExternalStore(
    (onChange: () => void) =>
      tell.onTell.add(({ texts }) => {
        if (texts.length > 0) {
          exec.trapUser();
        }
        onChange();
      }),
    () => tell.told
  );
  const ready = useCallback(exec.userReady.bind(exec), []);
  return [told, ready];
}
