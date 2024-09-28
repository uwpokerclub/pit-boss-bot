import { SlashCommandBuilder } from "discord.js";

import type { Command } from "../../types/command.d.ts";

const PingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!"),

  async execute(interaction) {
    await interaction.reply("Pong!");
  },
};

export default PingCommand;
