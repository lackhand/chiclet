import React, { useEffect } from "react";
import exec from "@/src/engine/exec";
import renderer from "@/src/renderer";

export default function Game({}): React.JSX.Element {
  useEffect(() => {
    exec.run();
  }, []);
  return <div>{renderer.render()!}</div>;
}
