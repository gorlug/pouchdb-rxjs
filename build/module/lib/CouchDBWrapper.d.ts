import { PouchDBDocumentGenerator } from "./PouchDBDocument";
import { AjaxRequest, AjaxResponse } from "rxjs/ajax";
import { Observable } from "rxjs";
import { Logger, ValueWithLogger } from "./Logger";
export interface Credentials {
    username: string;
    password: string;
}
/**
 * This class is used to build a configuration object to connect
 * to a couchdb instance.
 */
export declare class CouchDBConf {
    private host;
    private protocol;
    private dbName;
    private port;
    private credentials;
    private generator;
    private btoa;
    private createXHR;
    private baseUrl;
    clone(): CouchDBConf;
    setBaseUrl(url: string): void;
    setHost(host: string): void;
    setPort(port: number): void;
    setDBName(dbName: string): void;
    setHttp(): void;
    setHttps(): void;
    setGenerator(generator: PouchDBDocumentGenerator<any>): void;
    getGenerator(): PouchDBDocumentGenerator<any>;
    setCredentials(credentials: Credentials): void;
    getCredentials(): Credentials;
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
/**
 * A utility class for managing an external couchdb.
 */
export declare class CouchDBWrapper {
    static getLogName(): string;
    static createAjaxObservable(ajaxRequest: AjaxRequest, log: Logger): Observable<AjaxResponse>;
    /**
     * Creates a new couchdb.
     * @param conf configuration info for the new couchdb
     * @param log
     */
    static createCouchDBDatabase(conf: CouchDBConf, log: Logger): Observable<{
        value: AjaxResponse;
        log: Logger;
    }>;
    private static logCreationResponse;
    private static logCreationError;
    private static getAjaxResponseDebugInfo;
    /**
     * Deletes a couchdb.
     * @param conf
     * @param log
     */
    static deleteCouchDBDatabase(conf: CouchDBConf, log: Logger): Observable<{
        value: AjaxResponse;
        log: Logger;
    }>;
    private static logDeleteResponse;
    /**
     * Creates a new couchdb user.
     * @param conf
     * @param userCredentials
     * @param log
     */
    static createUser(conf: CouchDBConf, userCredentials: Credentials, log: Logger): Observable<{
        value: any;
        log: Logger;
    }>;
    private static handleCreateUserError;
    private static signUpUser;
    private static getUserLogParams;
    /**
     * Deletes a couchdb user.
     * @param conf
     * @param username
     * @param log
     */
    static deleteUser(conf: CouchDBConf, username: string, log: Logger): Observable<{
        value: any;
        log: Logger;
    }>;
    private static handleDeleteUserResponse;
    private static handleDeleteUserError;
    /**
     * Authorizes certain users to access a couchdb.
     * @param conf
     * @param members array of users to be authorized
     * @param log
     */
    static setDBAuthorization(conf: CouchDBConf, members: string[], log: Logger): Observable<ValueWithLogger>;
    private static createAuthorizationRequest;
    private static logDBAuthorizationResponse;
    static getDBAuthorization(conf: CouchDBConf, log: Logger): any;
}
