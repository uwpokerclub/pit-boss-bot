import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class Members extends Model {
    declare discord_client_id: string; 
    declare email: string; 
    declare user_id: number;
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
    user_id: {
        type: DataTypes.NUMBER,
        unique: true,
    }
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "members",
    freezeTableName: true,
} 


export function schemaInit() {
    Members.init(modelAttributes, initOptions);
}