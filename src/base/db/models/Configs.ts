import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class Configs extends Model {
    declare current_semester_id: string; 
}


const modelAttributes: ModelAttributes<Model<any, any>> = {
    current_semester_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "configs",
    freezeTableName: true,
} 


export function schemaInit() {
    Configs.init(modelAttributes, initOptions);
}