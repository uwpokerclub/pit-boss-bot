import { glob } from "glob";
import { Sequelize } from "sequelize";
import path from "path";

export const sqliteDB = new Sequelize("database", "user", "password", {
    dialect: "sqlite", 
    host: "localhost",
    storage: "database.sqlite",
    logging: false
});


export async function sqliteDBInit() {
    const files = (await glob(`dist/src/base/db/models/**/*.js`)).map((filePath: string) => path.resolve(filePath));

    await Promise.all(files.map(async (file: string) => {
        const { schemaInit } = await import(file);
        schemaInit();
    }));

    await sqliteDB.sync({ alter: true });
}
