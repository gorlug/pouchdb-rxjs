import { PouchDBDocumentGenerator } from "./PouchDBDocument";
import { AjaxRequest, AjaxResponse } from "rxjs/ajax";
import { Observable } from "rxjs";
import { Logger, ValueWithLogger } from "./Logger";
export interface Credentials {
    username: string;
    password: string;
}
export declare class CouchDBConf {
    host: string;
    protocol: string;
    dbName: string;
    port: number;
    credentials: Credentials;
    generator: PouchDBDocumentGenerator<any>;
    btoa: Function;
    createXHR: () => XMLHttpRequest;
    clone(): CouchDBConf;
    setHttp(): void;
    setHttps(): void;
    setGenerator(generator: PouchDBDocumentGenerator<any>): void;
    setCredentials(credentials: Credentials): void;
    toBaseUrl(): string;
    toUrl(): string;
    setBtoaFunction(btoa: Function): void;
    setCreateXHR(createXHR: () => XMLHttpRequest): void;
    callBtoa(input: string): any;
    toRequest(log: Logger): AjaxRequest;
    getLogName(): string;
    getDebugInfo(): {
        url: string;
        user: string;
    };
}
export declare class CouchDBWrapper {
    static getLogName(): string;
    static createAjaxObservable(ajaxRequest: AjaxRequest, log: Logger): Observable<AjaxResponse>;
    static createCouchDBDatabase(conf: CouchDBConf, log: Logger): Observable<{
        value: AjaxResponse;
        log: Logger;
    }>;
    private static logCreationResponse;
    private static logCreationError;
    private static getAjaxResponseDebugInfo;
    static deleteCouchDBDatabase(conf: CouchDBConf, log: Logger): Observable<{
        value: AjaxResponse;
        log: Logger;
    }>;
    private static logDeleteResponse;
    static createUser(conf: CouchDBConf, userCredentials: Credentials, log: Logger): Observable<{
        value: any;
        log: Logger;
    }>;
    private static handleCreateUserError;
    private static signUpUser;
    private static getUserLogParams;
    static deleteUser(conf: CouchDBConf, username: string, log: Logger): Observable<{
        value: any;
        log: Logger;
    }>;
    private static handleDeleteUserResponse;
    private static handleDeleteUserError;
    static setDBAuthorization(conf: CouchDBConf, members: string[], log: Logger): Observable<ValueWithLogger>;
    private static logDBAuthorizationResponse;
}
