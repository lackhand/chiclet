import { Pubsub as PubsubPlugin } from "@/src/engine/plugin";
import { Key, Path } from "./objectPath";

export type SubscriberT = (topic: Path, event: any) => void;

export default class Pubsub extends PubsubPlugin {
  root = new Topic();

  publish(path: Path, payload?: any) {
    try {
      const targets: Topic[] = [];
      let ptr: Topic = this.root;
      targets.push(ptr);
      for (let i = 0; i < path.length; ++i) {
        let next = ptr.topics.get(path[i]);
        if (!next) break;
        targets.push(next);
        ptr = next;
      }
      for (let i = targets.length - 1; i >= 0; --i) {
        const slice = path.slice(i);
        for (let subscriber of targets[i].subscribers) {
          queueMicrotask(() => {
            try {
              subscriber(slice, payload);
            } catch (e) {
              console.error(
                "Microtask error!",
                e,
                "by handler",
                subscriber,
                "on",
                path.slice(0, i),
                "!",
                slice,
                payload
              );
            }
          });
        }
      }
    } catch (e) {
      console.error("publish error", e, path, payload);
    }
  }
  subscribe(path: Path, subscriber: SubscriberT) {
    this.find(path).subscribers.add(subscriber);
    return () => this.unsubscribe(path, subscriber);
  }
  unsubscribe(path: Path, subscriber: SubscriberT) {
    this.find(path).subscribers.delete(subscriber);
  }
  private find(path: Path): Topic {
    return this.root.find(path, 0);
  }

  import(_: any) {}
  export(_: any) {}
}

class Topic {
  readonly subscribers = new Set<SubscriberT>();
  readonly topics = new Map<Key, Topic>();

  find(path: Path, offset: number): Topic {
    if (offset >= path.length) {
      return this;
    }
    const key = path[offset];
    let next = this.topics.get(key);
    if (!next) {
      this.topics.set(key, (next = new Topic()));
    }
    return next.find(path, offset + 1);
  }
}
