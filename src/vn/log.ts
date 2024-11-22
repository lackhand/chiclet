import Executor from "@/src/engine/executor";
import { Plugin, Serialization } from "@/src/engine/plugin";
import { arr, Path } from "../util/objectPath";

interface Record {
  i: number;
  topic: Path;
  body: any;
}

const DEFAULT_SUBS: Path[] = [
  arr`tell`,
  arr`ask`,
  arr`echo answer`,
  arr`scene start`,
  arr`scene end`,
];
const TOPIC = ["logs"];
export default class Log implements Plugin {
  private _exec: Executor;
  private _capacity: number;
  private _count = 0;
  private _data: Record[] = [];
  get data(): Record[] {
    return this._data;
  }
  constructor(exec: Executor) {
    this._exec = exec;
    this._capacity = exec.props.log?.history ?? 20;
    for (let prefix of exec.props.log?.subs ?? DEFAULT_SUBS) {
      const subscr = (topic: Path, event: any) =>
        this.push(prefix, topic, event);
      exec.pubsub.subscribe(prefix, subscr);
    }
  }
  private push(prefix: Path, suffix: Path, body: any) {
    const topic = [...prefix, ...suffix];
    // Because React, this wants to be a new instance on each append.
    this._data = [
      ...this._data.slice(-(this._capacity - 1)),
      {
        i: this._count,
        topic,
        body: body && JSON.stringify(body),
      },
    ];
    this._exec.pubsub.publish(TOPIC, this._count++);
  }
  export(into: Serialization): void {
    into.log = {
      count: this._count,
      entries: this._data,
    };
  }
  import(from: Serialization): void {
    this._count = from.log?.count ?? 0;
    this._data = [...(from.log?.entries ?? [])];
  }
}
