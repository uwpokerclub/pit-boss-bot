import type Category from "../enums/Category.js";

export default interface ICommand {
    name: string;
    description: string;
    category: Category;
    syntax: string;
    helpDescription: string;
    options: object;
    defaultMemberPerm: bigint;
    dmPerm: boolean;
    coolDown: number;
    global: boolean;    // whether the command can be used in any channel or only in the dedicated channel
}