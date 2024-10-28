import { Events } from "discord.js";

import type { Client } from "discord.js";
import type { EventHandler } from "../types/event.d.ts";

const ReadyEventHandler: EventHandler = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    // TODO: implement some sort of logger and remove console.log
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  }
}

export default ReadyEventHandler;
