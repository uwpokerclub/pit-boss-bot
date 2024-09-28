import type {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

/** Command is an interface representing a slash command in Discord. */
export interface Command {
  /** The configuration of the slash command. */
  data: SlashCommandBuilder;

  /** Runs the command. */
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
