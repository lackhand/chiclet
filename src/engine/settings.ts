import plugin, { Plugin } from "./plugins";

export interface SettingsValues {
  seed: string;
  historySize: number;
  volume: number;
}

const DEFAULTS: SettingsValues = {
  seed: "mothermayi",
  historySize: 20,
  volume: 1.0,
};
export class Settings implements Plugin {
  #values: SettingsValues = { ...DEFAULTS };
  import(source: any): void {
    this.#values = { ...DEFAULTS, ...source.settings };
  }
  export(): object {
    return {
      settings: { ...this.#values },
    };
  }
  get values(): SettingsValues {
    return this.#values;
  }
}
export default plugin.add(new Settings());
