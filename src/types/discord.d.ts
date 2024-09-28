import type { Client as DiscordClient, Collection } from "discord.js";
import type { Command } from "./command.d.ts";

declare module "discord.js" {
  export interface Client extends DiscordClient {
    commands: Collection<string, Command>;
  }
}
