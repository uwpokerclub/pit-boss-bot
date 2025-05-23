import { ChatInputCommandInteraction, Collection, EmbedBuilder, Events, MessageFlags } from "discord.js";
import type BossClient from "../base/classes/BossClient.js";
import Event from "../base/classes/Event.js";
import type Command from "../base/classes/Command.js";

export default class CommandHandler extends Event {
    constructor(client: BossClient) {
        super(client, {
            name: Events.InteractionCreate,
            description: "Command handler event",
            once: false
        });
    }

    override execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command: Command | undefined = this.client.commands.get(interaction.commandName);
        
        if (!command) {
            interaction.reply({ content: `This command does not exist`, flags: MessageFlags.Ephemeral });
            this.client.commands.delete(interaction.commandName);
            return;
        }

        const { coolDowns } = this.client;
        if (!coolDowns.has(command.name)) {
            coolDowns.set(command.name, new Collection());
        }

        const now: number = Date.now();
        const timestamps: Collection<string, number> = coolDowns.get(command.name)!;
        // if the command somehow has a coolDown value of 0, use 3 seconds instead
        const coolDownAmount = (command.coolDown || 3) * 1000;

        const userId: string = interaction.user.id;
        if (timestamps.has(userId) && (now < timestamps.get(userId)! + coolDownAmount)) {
            const timeLeft: string = ((timestamps.get(userId)! + coolDownAmount - now) / 1000).toFixed(1);
            interaction.reply({ embeds: [new EmbedBuilder()
                .setColor("Red")
                .setDescription(`Please wait another \`${timeLeft}\` seconds to run this command!`)
            ], flags: MessageFlags.Ephemeral });
            return;
        }

        timestamps.set(userId, now);
        setTimeout(() => {timestamps.delete(userId)}, coolDownAmount);


        const subCommandGroup: string | null = interaction.options.getSubcommandGroup(false);
        if (subCommandGroup) {
            const subCommand: string = `${interaction.commandName}.${subCommandGroup}.${interaction.options.getSubcommand(false)}`;
            this.client.subCommands.get(subCommand)?.execute(interaction);
            return;
        }

        const botCommandChannelId: string = this.client.config.discord.botUsageChannelId;
        if (!command.global && interaction.channelId != botCommandChannelId) {
            interaction.reply({ content: `You can only use this command in the dedicated channel. Please try again in <#${botCommandChannelId}>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        command.execute(interaction);
    }
}