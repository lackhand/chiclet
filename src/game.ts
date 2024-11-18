import Executor from "@/src/engine/executor";
import { Parser } from "@/src/engine/parser";
import Rand from "@/src/vn/rand";
import * as Handlers from "@/src/vn/handlers";
import Tell from "@/src/vn/tell";
import Pubsub from "@/src/util/pubsub";
import Chapter from "./vn/chapter";

console.log("0");
const handlers = Object.fromEntries(
  Object.entries(Handlers).map(([k, v]) => [k, v.parse])
);
console.log("1");

// Give ourselves some aliases.
handlers.opt = handlers.ask;
console.log("2");

// Parse the thing with unrecognized leaf as Tell, and with top level values as Scenes.
export const executor = new Executor({
  plugins: [
    Pubsub,
    new Chapter({
      parser: new Parser(handlers, Tell.parse),
    }),
    Rand,
  ],
  start: "start",
});
console.log("3");
