// import "./style.css";
// import "./game.ts";

import Executor from "./engine/executor";
import { Parser } from "./engine/parser";
import * as Handlers from "./handlers";
import Scene from "./handlers/scene";
import Tell from "./handlers/tell";
// import Pubsub from "./util/pubsub";

// async function testPubsub() {
//   const pubsub = new Pubsub();
//   pubsub.subscribe("", "one", (...params) => console.log(...params));
//   pubsub.subscribe("foo", "two", (...params) => console.log(...params));
//   pubsub.subscribe("foo.bar", "three", (...params) => console.log(...params));

//   pubsub.publish("none", "one only");
//   pubsub.publish("foo", "one and two I hope");
//   pubsub.publish("foo.bar", "all three?");
//   pubsub.publish("foo.bar.baz", "all three again!");
//   pubsub.publish("foo.qux", "one and two I hope!");
// }
// testPubsub();

async function test() {
  console.log("testing");
  const unparsed = `
    start {
      jump "scene1"
    }
    scene1 "diner" "bgmusic" "phoenix" "larry" "larry.panicked" {
      diner fade=0 wait=0
      larry fade=1 wait=0 mood="panicked"
      phoenix at="left" wait=0
      bgmusic "start"
      larry "oh god phoenix..." {
        - "... I killed him..."
        - "it was a mistake you gotta believe me"
        - "_it was not a mistake_"
        - "angry" "but he deserved it"
      }
      phoenix "wtf I asked what you wanted for breakfast." {
        - "subtext: ..."
        - wait=0 "annoyed" "wait larry"
      }
      choice {
        "why do you do this you goddamn idiot." target="scene2"
        "you goddamn idiot, \${larry.name}" {
          larry at="right" from="outright" "dat's right!"
          jump "back"
        }
        if cond=r"sucker > 2" "its fine don't worry" {
          set sucker=12
        }
      }
    }
    scene2 {
      say "its alive"
    }
  `;
  const handlers = Object.fromEntries(
    Object.entries(Handlers).map(([k, v]) => [k, v.parse])
  );
  handlers.opt = handlers.ask;

  const parser = new Parser(handlers, Tell.parse, Scene.parse);
  const lookup = parser.parseText(unparsed);
  console.log("Parsed", unparsed, "into", lookup);
  const manager = new Executor({ lookup });
  manager.pubsub.subscribe("", Symbol("main"), (event, topic) => {
    if (topic.startsWith("error")) {
      console.error("error!", topic, event);
      return;
    }
    console.log(topic, event);
  });
  console.log(manager.pubsub);
  console.warn("!!!begining!!!");
  await manager.run();
  console.warn("!!!all done!!!");
}
test();
