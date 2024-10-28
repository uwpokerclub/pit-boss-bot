import type { Events } from "discord.js";

/** Interface that describes Discord.js Client Event handlers */
export interface EventHandler {
  /** Name is the name of the Discord.js event */
  name: Events;

  /** Whether or not the event should only run once */
  once: boolean;

  /** A function that is executed when the event is emitted */
  execute(...args: unknown[]): void;
}

