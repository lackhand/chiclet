export type Value = boolean | number | string;
export type State = { [k: string]: Value | Value[] | State | State[] };
