import { createContext } from "react";
import Executor from "../engine/executor";

export default createContext<Executor | undefined>(undefined);
