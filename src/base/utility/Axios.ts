import axios, { type AxiosInstance } from "axios";
import type IConfig from "../interfaces/IConfig.js";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);


const config: IConfig = require(path.resolve("./config.json"));

let sessionCookie: string = "";
export let uwpscApiAxios: AxiosInstance;


export async function axiosInit() {
    sessionCookie = await login();

    uwpscApiAxios = axios.create({
        baseURL: config.uwpsc.apiUrl,
        withCredentials: true
    });


    uwpscApiAxios.interceptors.request.use(axiosConfig => {
        axiosConfig.headers['Cookie'] = `${config.uwpsc.cookieName}=${sessionCookie}`;
        return axiosConfig;
    }, error => {
        return Promise.reject(error);
    });


    uwpscApiAxios.interceptors.response.use(response => {
        return response;
    }, async error => {
        if (error.response.status == 401 && !error.config._retry) {
            error.config._retry = true;
            
            sessionCookie = await login();
            return await uwpscApiAxios(error.config);
        }
        return error;
    });
}


async function login(): Promise<string> {
    const res = await axios.post(config.uwpsc.apiUrl+"/session", 
        {
            "username": config.uwpsc.username,
            "password": config.uwpsc.password
        }, {
            withCredentials: true
        }
    );

    const cookie = (res.headers['set-cookie'] as string[])
    .find(cookie => cookie.includes(config.uwpsc.cookieName))
    ?.match(new RegExp(`^${config.uwpsc.cookieName}=(.+?);`))
    ?.[1];

    return cookie!;
}


