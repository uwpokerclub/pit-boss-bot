import { Collection, Events, REST, Routes } from "discord.js";
import type BossClient from "../base/classes/BossClient.js";
import Event from "../base/classes/Event.js";
import type Command from "../base/classes/Command.js";

export default class Ready extends Event {
  constructor(client: BossClient) {
    super(client, {
      name: Events.ClientReady,
      description: "Ready event",
      once: true,
    });
  }

  override async execute() {
    const { token, clientId, guildId } = this.client.config.discord;
    console.log(`${this.client.user?.tag} is now ready`);

    // commands do not have to be registered every time the bot is deployed
    // however, this should not be an issue in the short term
    // dedicated register script can be found in the scripts folder
    const commands: object[] = this.getJson(this.client.commands);
    const rest: REST = new REST().setToken(token);
    const setCommands: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });

    console.log(`Successfully set ${setCommands.length} commands`);
  }


  private getJson(commands: Collection<string, Command>): object[] {
    const data: object[] = [];
    commands.forEach(command => {
      data.push({
        name: command.name,
        description: command.description,
        options: command.options,
        default_member_permissions: command.defaultMemberPerm.toString(),
        dm_permission: command.dmPerm,
      });
    });
    return data;
  }
}