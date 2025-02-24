import { Sequelize } from "sequelize";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";

export const sqliteDB = new Sequelize("database", "user", "password", {
    dialect: "sqlite", 
    host: "localhost",
    storage: "database.sqlite",
    logging: false
});


export async function sqliteDBInit() {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    let foldersPath: string = path.join(dirname, "models");
    const files: string[] = getFiles(foldersPath);

    await Promise.all(files.map(async (file: string) => {
        const { schemaInit } = await import(file);
        schemaInit();
    }));

    await sqliteDB.sync({ alter: true });
}

//baseDirName must the name of a sub dir under src
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
