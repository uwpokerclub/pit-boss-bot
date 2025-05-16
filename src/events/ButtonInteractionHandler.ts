import { ButtonInteraction, Events } from "discord.js";
import type BossClient from "../base/classes/BossClient.js";
import Event from "../base/classes/Event.js";
import ButtonManager from "../base/classes/ButtonManager.js";

export default class ButtonInteractionHandler extends Event {
    constructor(client: BossClient) {
        super(client, {
            name: Events.InteractionCreate,
            description: "Button interaction handler event",
            once: false
        });
    }

    override execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) {
            return;
        }

        // Every button's customId must adhere to this pattern: 
            // [commandName, originInteractionId, buttonName, ...args] joined by ButtonManager.interactionDelimiter
        const commandName: string | undefined = interaction.customId.split(ButtonManager.interactionDelimiter)[0];

        // if button is not named correctly
        if (!commandName) {
            return;
        }

        let buttonManager: ButtonManager | undefined = this.client.buttonManagers.get(commandName);
        if (!buttonManager) {
            return;
        }

        buttonManager.execute(interaction);
        

    }
}