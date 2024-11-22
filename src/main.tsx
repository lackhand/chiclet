import "./index.css";
import Game from "./game.tsx";
import { createRoot } from "react-dom/client";
import React from "react";

// Render your React component instead
const root = createRoot(document.getElementById("app")!);
root.render(<Game />);
