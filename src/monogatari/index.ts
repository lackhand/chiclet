import "@/monogatari/core/monogatari.css";
// Loading for side effect baybee.
import "@/monogatari/core/monogatari";

type Monogatari = any;
interface MonogatariGlobal {
  $_ready(cb: () => void): void;
  $_(): void;
  default: Monogatari;
}

declare global {
  interface Window {
    Monogatari: MonogatariGlobal;
  }
}

export default window.Monogatari;
