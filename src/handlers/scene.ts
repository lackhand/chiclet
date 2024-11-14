import Action from "../engine/action";
import Executor from "../engine/executor";
import { Parser } from "../engine/parser";
import { Key } from "../util/jpath";

export default class Scene extends Action {
  name: string;
  actions: Action[];
  constructor(name: string, actions: Action[]) {
    super();
    this.name = name;
    this.actions = actions;
  }
  static parse(parser: Parser): Scene {
    return new Scene(parser.name, parser.parseChildren(null));
  }
  get(key: Key) {
    return this.actions[key as number];
  }
  beforePush(executor: Executor): void {
    executor.pubsub.publish(`scene.start`, this);
  }
  async run(executor: Executor) {
    executor.pushRelative([0]);
  }
  afterPop(executor: Executor): void {
    executor.pubsub.publish(`scene.end`, this);
  }
  catch(executor: Executor): boolean {
    // Handle the error -- but also clear our own frame.
    // This is how we implement jumps: the closest (real) scene eats it.
    executor.pop();
    return true;
  }
}
