import type IEventOptions from "../interfaces/IEventOptions.js";
import type BossClient from "./BossClient.js";

export default class Event {
    client: BossClient;
    name: string;
    description: string;
    once: boolean;

    constructor(client: BossClient, options: IEventOptions) {
        this.client = client;
        this.name = options.name;
        this.description = options.description;
        this.once = options.once;
    }

    execute(..._args: any): void {
        
    }
}