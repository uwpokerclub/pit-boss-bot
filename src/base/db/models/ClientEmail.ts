import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class ClientEmail extends Model {
    declare discord_client_id: string; 
    declare email: string; 
}


const modelAttributes: ModelAttributes<Model<any, any>> = {
    discord_client_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    }, 
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "client_email",
    freezeTableName: true,
} 


export function schemaInit() {
    ClientEmail.init(modelAttributes, initOptions);
}