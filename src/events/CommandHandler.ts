import { ChatInputCommandInteraction, Collection, EmbedBuilder, Events } from "discord.js";
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
        if (!interaction.isChatInputCommand) {
            return;
        }

        const command: Command = this.client.commands.get(interaction.commandName)!;
        
        if (!command) {
            interaction.reply({ content: "This command does not exist", ephemeral: true });
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
        const coolDownAmount = (command.coolDown || 3) * 100;

        const userId: string = interaction.user.id;
        if (timestamps.has(userId) && (now < timestamps.get(userId)! + coolDownAmount)) {
            const timeLeft: string = ((timestamps.get(userId)! + coolDownAmount - now) / 1000).toFixed(1);
            interaction.reply({ embeds: [new EmbedBuilder()
                .setColor("Red")
                .setDescription(`Please wait another \`${timeLeft}\` seconds to run this command!`)
            ], ephemeral: true });
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

        command.execute(interaction);
    }
}