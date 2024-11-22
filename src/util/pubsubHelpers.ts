import { Pubsub } from "@/src/engine/plugin";
import { Path } from "./objectPath";
import { asyncIterateAll } from "./promises";

type Published = [path: Path, event: any];

declare module "@/src/engine/plugin" {
  interface Pubsub {
    getOne(topic: Path): Promise<Published>;
    ask(askTopic: Path, askEvent: any, responseTopic: Path): Promise<Published>;
    getAll(topic: Path): AsyncGenerator<Published>;
  }
}
Pubsub.prototype.getOne = async function getOne(
  this: Pubsub,
  topic: Path
): Promise<Published> {
  return await new Promise((resolve, _reject) => {
    const subscr = (subpath: Path, payload: any) => {
      this.unsubscribe(topic, subscr);
      resolve([subpath, payload]);
    };
    this.subscribe(topic, subscr);
  });
};
Pubsub.prototype.ask = async function ask(
  this: Pubsub,
  askTopic: Path,
  askEvent: any,
  responseTopic: Path
): Promise<Published> {
  const resultPromise = this.getOne(responseTopic);
  this.publish(askTopic, askEvent);
  const result = await resultPromise;
  return result;
};
Pubsub.prototype.getAll = function getAll(
  this: Pubsub,
  topic: Path
): AsyncGenerator<Published> {
  return asyncIterateAll((resolveEach) => {
    const subscr = (subtopic: Path, event: any) => {
      resolveEach([subtopic, event]);
    };
    this.subscribe(topic, subscr);
    return () => this.unsubscribe(topic, subscr);
  });
};
