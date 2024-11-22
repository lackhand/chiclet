import { createContext } from "react";
import Clock from "@/src/util/clock";

export default createContext<Clock | undefined>(undefined);
