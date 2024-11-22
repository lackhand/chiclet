import Action from "../engine/action";
import Each from "../engine/actions/each";
import Executor from "../engine/executor";
import Parser from "../engine/parser";
import { arr } from "../util/objectPath";
import Pubsub from "../util/pubsub";

export default class Scene extends Each {
  name: string;
  constructor(name: string, actions: Action[]) {
    super(actions);
    this.name = name;
  }
  static parse(parser: Parser): Scene {
    return new Scene(
      parser.properties.name?.toString() ?? parser.name,
      parser.parseChildren(null)
    );
  }
  async run(executor: Executor) {
    const frame = executor.peek;
    const publish = arr`scene start ${frame}`;
    const subscribe = arr`scene ready ${frame}`;
    console.log(
      `Checking pub/sub with stack ${JSON.stringify(frame)}. Sending to`,
      publish,
      "awaiting on",
      subscribe
    );
    await executor.pubsub.ask(publish, this, subscribe);
    super.run(executor);
  }
  toJSON(): string {
    return `{"name": "${this.name}"}`;
  }
}
