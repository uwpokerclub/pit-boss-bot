import { glob } from "glob";
import { sqliteDB } from "../base/db/sqliteDB.js";
import path from "path";


const files = (await glob(`dist/src/base/db/models/**/*.js`)).map((filePath: string) => path.resolve(filePath));


await Promise.all(files.map(async (file: string) => {
    const { schemaInit } = await import(file);
    schemaInit();
}));


await sqliteDB.sync({ alter: true });
await sqliteDB.truncate();