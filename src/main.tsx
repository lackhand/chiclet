import "./style.css";
import "./game.ts";
import { createRoot } from "react-dom/client";
import React from "react";

console.log("0");
// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';
console.log("1");

// Render your React component instead
const root = createRoot(document.getElementById("app")!);
console.log("2");
root.render(<h1>Hello, world{void console.log("3")}</h1>);
console.log("4");
