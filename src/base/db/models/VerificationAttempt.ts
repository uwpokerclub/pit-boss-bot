import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class VerificationAttempt extends Model {
    declare discord_client_id: string; 
    declare remaining_failed_attempts: number; 
}


const modelAttributes: ModelAttributes<Model<any, any>> = {
    discord_client_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    }, 
    remaining_failed_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "verification_attempt",
    freezeTableName: true,
} 


export function schemaInit() {
    VerificationAttempt.init(modelAttributes, initOptions);
}