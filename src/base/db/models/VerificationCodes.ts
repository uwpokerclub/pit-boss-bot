import { DataTypes, Model, type InitOptions, type ModelAttributes } from 'sequelize';
import { sqliteDB } from "../sqliteDB.js";


export class VerificationCodes extends Model {
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
        // code can be null if the email address the user provided is invalid, in this case a null code will be used to ensure the user will always fail the verification system
    },
};

const initOptions: InitOptions<Model<any, any>> = {
    sequelize: sqliteDB,
    modelName: "verification_codes",
    freezeTableName: true,
};


export function schemaInit() {
    VerificationCodes.init(modelAttributes, initOptions);
}