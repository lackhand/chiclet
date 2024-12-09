import actor, { Actor, BeatFactory } from "../engine/actor";
import { Key } from "../engine/exec";
import drawer, { Drawer } from "../engine/draw";

export default function enactor(
  key: Key,
  ...drawers: Drawer[]
): BeatFactory & Actor {
  drawer.add(key, ...drawers);
  return actor(key);
}
