import Executor from "@/src/engine/executor";
import Pubsub from "@/src/util/pubsub";
import Rand from "@/src/vn/rand";

export default function dummyResponder(executor: Executor): Executor {
  dummyScene(executor);
  dummyAsk(executor);
  dummyTell(executor);
  return executor;
}

async function dummyTell(executor: Executor) {
  for await (let [event, topic] of executor.plugin(Pubsub).getAll("tell")) {
    console.log("doing animations from", topic, event);
    setTimeout(() => {
      console.log("Told", event, "to", topic, event);
      executor.plugin(Pubsub).publish(`told.${topic.slice(5)}`, "from dummy");
    }, executor.plugin(Rand).scale(1000, 250, "dummy"));
  }
}

async function dummyAsk(executor: Executor) {
  for await (let [event, topic] of executor.plugin(Pubsub).getAll("ask")) {
    const options = event.options as { i: number }[];
    const option = executor.plugin(Rand).peek(options).i;
    console.log("considering options from", topic, event);
    setTimeout(() => {
      console.log("Answering", option, "to", topic, event);
      executor.plugin(Pubsub).publish("answer", option);
    }, executor.plugin(Rand).scale(1000, 250, "dummy"));
  }
}
async function dummyScene(executor: Executor) {
  for await (let [event, topic] of executor
    .plugin(Pubsub)
    .getAll("scene.start")) {
    console.log("preloading assets from", topic, event);
    setTimeout(() => {
      console.log("Finished preloading assets from", event, "to", topic, event);
      executor
        .plugin(Pubsub)
        .publish(`scene.ready.${topic.slice(12)}`, "from dummy");
    }, executor.plugin(Rand).scale(1000, 250, "dummy"));
  }
}
