import { Events } from "discord.js";
import type BossClient from "../base/classes/BossClient.js";
import Event from "../base/classes/Event.js";

export default class Ready extends Event {
  constructor(client: BossClient) {
    super(client, {
      name: Events.ClientReady,
      description: "Ready event",
      once: true,
    });
  }

  override async execute() {
    console.log(`${this.client.user?.tag} is now ready`);
  }
}