import React from "react";
import Sidebar from "./sidebar";
import Logs from "./logs";
import plugin from "../engine/plugins";

export class Renderer {
  render(): React.JSX.Element {
    return (
      <div className="w-screen h-screen">
        <Sidebar>
          <Logs />
        </Sidebar>
        <main className="w-full h-full">
          <GamePane />
        </main>
      </div>
    );
  }
}
export default plugin.add(new Renderer());
