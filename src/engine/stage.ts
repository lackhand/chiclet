import Signal from "../util/signal";
import plugin, { Plugin } from "./plugins";

export interface PxXY {
  unit: "px";
  x: number;
  y: number;
  z: number;
}
export interface RelXY {
  unit?: "rel";
  x?: number | Scale;
  y?: number | Scale;
  z?: number | Scale;
}

export type Point = PxXY | RelXY;
export type At = string | RelXY | PxXY;

type NakedScale = keyof typeof DEFAULT_SCALES;
export type Scale = `${"-" | "+"}${NakedScale}` | NakedScale;
const DEFAULT_SCALES = {
  none: 0,
  vin: 1 / 6,
  in: 2 / 6,
  default: 2 / 6,
  mid: 3 / 6,
  far: 4 / 6,
  vfar: 5 / 6,
  edge: 1,
  side: 1,
  off: 2,
  out: 2,
  voff: 6,
  vout: 6,
} as const;
const DEFAULT_ATS = {
  center: {},
  left: { x: "-default" },
  right: { x: "+default" },
  outleft: { x: "-out" },
  outright: { x: "+out" },
  top: { y: "-edge" },
  up: { y: "-default" },
  down: { y: "+default" },
  bottom: { y: "+edge" },
} as Record<string, Point>;

const DEFAULT_DIMS: PxXY = { unit: "px", x: 480, y: 360, z: 100 };

/**
 * Supports binding to geometry.
 *
 * You give the stage a size in px space dims for the bottom right corner (upper left is automatically 0/0 in this frame).
 *
 * You give the stage a set of named locations (the `atValues`) and variable lookups (the `scaleValues`).
 * These are dynamically overridable.
 *
 * Thereafter, whenever at `at` is encountered, it can be compared against this set.
 * First, if `at` is a string, then it's looked up in atValues.
 * Then, if this is in px space, it's returned directly.
 */
export class Stage implements Plugin {
  scaleValues = { ...DEFAULT_SCALES };
  atValues = { ...DEFAULT_ATS };
  #dims: PxXY = { ...DEFAULT_DIMS };
  readonly onDims = new Signal("stageDims").bridgeTo(Signal.INFO);

  get dims() {
    return this.#dims;
  }
  set dims(value: PxXY) {
    this.#dims = value;
    this.onDims.notify();
  }

  // The extent of the stage. Since we use 0-based relative coordinates, the dev doesn't really have to interact with this.
  // But for instance, a dim of [-.75, .33] would be 1/4 inset from the left edge, and .66 inset from the top edge.
  get w_2() {
    return this.dims.x / 2;
  }
  get h_2() {
    return this.dims.y / 2;
  }
  get d_2() {
    return this.dims.z / 2;
  }

  getPixels(at: undefined | At): [x: number, y: number, z: number] {
    if ("string" === typeof at) {
      return this.#expandPoint(this.atValues[at]);
    }
    return this.#expandPoint(at);
  }
  #expandPoint(
    at: undefined | Partial<Point>
  ): [x: number, y: number, z: number] {
    if (at?.unit === "px") {
      return [
        this.#px(at.x, this.w_2),
        this.#px(at.y, this.h_2),
        this.#px(at.z, this.d_2),
      ];
    }
    return [
      this.#scale(at?.x, this.w_2),
      this.#scale(at?.y, this.h_2),
      this.#scale(at?.z, this.d_2),
    ];
  }
  #px(value: undefined | number | Scale, dim: number): number {
    if ("string" === typeof value) {
      return this.#scale(value, dim);
    }
    return value ?? dim;
  }
  #scale(value: undefined | number | Scale, dim: number): number {
    let scale = dim;
    switch (typeof value) {
      case "undefined":
        scale = 0;
        break;
      case "number":
        scale = dim;
        break;
      case "string":
        if (value.startsWith("-")) {
          scale *= -(this.scaleValues[value.slice(1) as NakedScale] ?? 0);
        } else if (value.startsWith("+")) {
          scale *= +(this.scaleValues[value.slice(1) as NakedScale] ?? 0);
        }
        break;
    }
    return dim + scale;
  }
  import(source: any): void {
    this.scaleValues = { ...DEFAULT_SCALES, ...source.stage?.scaleValues };
    this.atValues = { ...DEFAULT_ATS, ...source.stage?.atValues };
    this.dims = source.stage?.dims ?? DEFAULT_DIMS;
  }
  export(): object {
    return {
      stage: {
        atValues: this.atValues,
        scaleValues: this.scaleValues,
        dims: this.dims,
      },
    };
  }
}
export default plugin.add(new Stage());
