import { sqliteDB } from "../base/db/sqliteDB.js";
import path from "path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";



function getFiles(directory: string): string[] {
    const files: string[] = [];
    
    fs.readdirSync(directory).forEach(file => {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) {
            getFiles(absolute).forEach(subFile => {
                files.push(subFile);
            });
            return;
        }
        else if (file.endsWith(".js")) {
            files.push(absolute);
            return;
        }
    });
    return files;
}

let foldersPath: string = path.join("dist", "src", "base", "db", "models");
const files: string[] = getFiles(foldersPath);


await Promise.all(files.map(async (file: string) => {
    const fileUrl = pathToFileURL(file).href;
    const { schemaInit } = await import(fileUrl);
    schemaInit();
}));

await sqliteDB.sync({ alter: true });
await sqliteDB.truncate();
// await sqliteDB.drop();