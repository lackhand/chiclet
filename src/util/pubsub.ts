import { Pubsub as PubsubPlugin } from "../engine/plugin";
import { asyncIterateAll } from "./promises";

export type Topic = string;
export type SubscriberK = string | symbol;
export type SubscriberT = (
  event: any,
  topic: string,
  myOwnName: SubscriberK
) => void;

export default class Pubsub extends PubsubPlugin {
  topics = new Map<Topic, Map<SubscriberK, SubscriberT>>();

  protected sendExact(topic: Topic, event: any, asTopic?: Topic): number {
    let succeeded = 0;
    for (let [name, sub] of this.topics.get(topic) ?? []) {
      try {
        window.queueMicrotask(() => sub(event, asTopic ?? topic, name));
        succeeded++;
      } catch (e: any) {
        console.error("sub", sub, "on event", event, "errored", e);
      }
    }
    return succeeded;
  }
  publish(fullTopic: string, event: any) {
    let succeeded = 0;
    for (
      let i = 0;
      i >= 0 && i < fullTopic.length;
      i = fullTopic.indexOf(".", i + 1)
    ) {
      succeeded += this.sendExact(fullTopic.slice(0, i), event, fullTopic);
    }
    if (fullTopic.length > 0) {
      succeeded += this.sendExact(fullTopic, event, fullTopic);
    }
    if (succeeded <= 0) {
      console.info("Discarding unsubscribed", fullTopic, event);
    }
  }
  subscribe(topic: Topic, name: SubscriberK, handler: SubscriberT) {
    let subs = this.topics.get(topic);
    if (!subs) {
      this.topics.set(topic, (subs = new Map()));
    }
    subs.set(name, handler);
  }
  unsubscribe(topic: Topic, name: SubscriberK) {
    let subs = this.topics.get(topic);
    if (subs) {
      subs.delete(name);
    }
  }
  async getOne(topic: Topic): Promise<[event: any, topic: Topic]> {
    return await new Promise((resolve, _reject) => {
      this.subscribe(
        topic,
        Symbol(`subscribeOnce.${topic}`),
        (event, topic, name) => {
          this.unsubscribe(topic, name);
          resolve([event, topic]);
        }
      );
    });
  }
  async ask(
    fullTopic: Topic,
    event: any,
    response: Topic
  ): Promise<[event: any, topic: Topic]> {
    const result = this.getOne(response);
    this.publish(fullTopic, event);
    return result;
  }
  getAll(
    topic: Topic
  ): AsyncGenerator<[event: any, topic: Topic], void, unknown> {
    return asyncIterateAll((resolveEach) => {
      const symbol = Symbol(`subscribeAsyncIterator.${topic}`);
      this.subscribe(topic, symbol, (event, topic) => {
        resolveEach([event, topic]);
      });
      return () => this.unsubscribe(topic, symbol);
    });
  }

  import(_: any) {}
  export(_: any) {}
}
