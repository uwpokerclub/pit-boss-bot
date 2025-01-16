import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class ClientCode extends Model {
    declare discord_client_id: string; 
    declare code: number; 
}


const modelAttributes: ModelAttributes<Model<any, any>> = {
    discord_client_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    }, 
    code: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "client_code",
    freezeTableName: true,
};


export function schemaInit() {
    ClientCode.init(modelAttributes, initOptions);
}