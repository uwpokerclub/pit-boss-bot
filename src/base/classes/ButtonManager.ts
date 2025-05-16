import type { ButtonInteraction } from "discord.js";
import type BossClient from "./BossClient.js";
import type IButtonManagerOptions from "../interfaces/IButtonManagerOptions.js";

export default abstract class ButtonManager {
    client: BossClient;
    name: string;   // name must be the same as the associated command's name
    static interactionDelimiter: string = "|";


    constructor(client: BossClient, options: IButtonManagerOptions) {
        this.client = client;
        this.name = options.name;
    }

    abstract execute(interaction: ButtonInteraction): void;
}