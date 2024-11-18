import Executor from "@/src/engine/executor";
import Pubsub, { Topic } from "@/src/util/pubsub";

const HANDLES = [handleError, handleWarning, handleInfo, handleDebug];
export default function consoleLogger(executor: Executor): Executor {
  (async () => {
    for await (let [e, t] of executor.plugin(Pubsub).getAll("")) {
      HANDLES.find((it) => it(e, t));
    }
  })();
  return executor;
}
const ERRORS = ["error"];
function handleError(event: any, topic: Topic) {
  if (!ERRORS.some((pre) => topic.startsWith(pre))) return false;
  console.error(event, topic);
  return true;
}
const WARNINGS = ["scene", "tell"];
function handleWarning(event: any, topic: Topic) {
  if (!WARNINGS.some((pre) => topic.startsWith(pre))) return false;
  console.info(event, topic);
  return true;
}
const INFOS: string[] = [];
function handleInfo(event: any, topic: Topic) {
  if (!INFOS.some((pre) => topic.startsWith(pre))) return false;
  console.info(event, topic);
  return true;
}
function handleDebug(event: any, topic: Topic) {
  console.debug(event, topic);
  return true;
}
