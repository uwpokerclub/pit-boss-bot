import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class Members extends Model {
    declare discord_client_id: string; 
    declare first_name: string;
    declare last_name: string;
    declare email: string; 
    declare user_id: number;
    declare membership_id: string;
}


const modelAttributes: ModelAttributes<Model<any, any>> = {
    discord_client_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    }, 
    first_name: {
        type: DataTypes.STRING,
    },
    last_name: {
        type: DataTypes.STRING,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    user_id: {
        type: DataTypes.NUMBER,
        unique: true,
    },
    membership_id: {
        type: DataTypes.STRING,
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