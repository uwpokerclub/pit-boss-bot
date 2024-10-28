import { Events } from "discord.js";

import type { Interaction, CacheType } from "discord.js";
import type { EventHandler } from "../types/event.d.ts";

const InteractionCreateEventHandler: EventHandler = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction<CacheType>) {
    // If the interaction is not a slash command, ignore it
    if (!interaction.isChatInputCommand()) return;

    // Find the command
    const command = interaction.client.commands.get(interaction.commandName);

    // If no command is found, log an error
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command.",
          ephemeral: true,
        });
      }
    }
  }
}

export default InteractionCreateEventHandler;
