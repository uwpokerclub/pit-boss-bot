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
}