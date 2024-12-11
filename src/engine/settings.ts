import Signal from "../util/signal";
import plugin, { Plugin } from "./plugins";

export interface SettingsValues {
  seed: string;
  historySize: number;
  volume: number;
}

interface Setting<T = any> {
  readonly onChange: Signal;
  readonly name: string;
  value: T;
  reset(): void;
}
export class Settings implements Plugin {
  #settings: Setting[] = [];
  readonly onChange = new Signal("settings");
  #setting<T>(name: string, initial: T): Setting<T> {
    let value = initial;
    const onChange = new Signal(name).bridgeTo(this.onChange);
    const setting: Setting<T> = {
      onChange,
      get name() {
        return name;
      },
      get value() {
        return value;
      },
      set value(_new: T) {
        const old = value;
        value = _new;
        onChange.notify(_new, old);
      },
      reset() {
        this.value = initial;
      },
    };
    this.#settings.push(setting as Setting);
    return setting;
  }
  readonly seed = this.#setting("seed", "mothermayi");
  readonly historySize = this.#setting("historySize", 20);
  readonly volume = this.#setting("volume", 0.5);

  import(source: any): void {
    this.#settings.forEach((setting) => {
      let value = source.settings?.[setting.name];
      if (value === undefined) {
        setting.reset();
      } else {
        setting.value = value;
      }
    });
  }
  export(): object {
    return {
      settings: Object.fromEntries(
        this.#settings.map(({ name, value }) => [name, value])
      ),
    };
  }

  // Keeps aware of window specifics.
  get left() {
    return 0;
  }
  get right() {
    return window.innerWidth;
  }
  get top() {
    return 0;
  }
  get bottom() {
    return window.innerHeight;
  }
  get front() {
    return +50;
  }
  get back() {
    return -50;
  }

  get cx() {
    return (this.right + this.left) / 2;
  }
  get cy() {
    return (this.bottom + this.top) / 2;
  }
  get cz() {
    return (this.front + this.back) / 2;
  }
}
export default plugin.add(new Settings());
