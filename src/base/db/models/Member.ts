import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class Member extends Model {
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
    modelName: "member",
    freezeTableName: true,
} 


export function schemaInit() {
    Member.init(modelAttributes, initOptions);
}