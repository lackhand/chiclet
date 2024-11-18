import Action from "../engine/action";
import Each from "../engine/actions/each";
import Executor from "../engine/executor";
import { Parser } from "../engine/parser";
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
    const [send, receive] = ["start", "ready"].map(
      (v) => `scene.${v}.${executor.peek.join(".")}`
    );
    await executor.plugin(Pubsub).ask(send, this, receive);
    super.run(executor);
  }
}
