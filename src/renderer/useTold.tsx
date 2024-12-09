import { useSyncExternalStore } from "react";
import exec from "../engine/exec";

const ready = () => exec.userReady();

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
  return [told, ready];
}
