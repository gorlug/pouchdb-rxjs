import {PouchDBDocumentGenerator} from "./PouchDBDocument";
import {ajax, AjaxError, AjaxRequest, AjaxResponse} from "rxjs/ajax";
import {Observable, of, throwError} from "rxjs";
import {catchError, concatMap} from "rxjs/operators";
import {PouchDBWrapper} from "./PouchDBWrapper";
import {fromPromise} from "rxjs/internal-compatibility";
import {Logger, ValueWithLogger} from "./Logger";

export interface Credentials {
    username: string;
    password: string;
}

/**
 * This class is used to build a configuration object to connect
 * to a couchdb instance.
 */
export class CouchDBConf {
    private host: string;
    private protocol: string;
    private dbName: string;
    private port: number;
    private credentials: Credentials;
    private generator: PouchDBDocumentGenerator<any>;
    private btoa: Function;
    private createXHR: () => XMLHttpRequest;
    private baseUrl: string;

    clone(): CouchDBConf {
        const clone = new CouchDBConf();
        clone.host = this.host;
        clone.protocol = this.protocol;
        clone.dbName = this.dbName;
        clone.port = this.port;
        clone.credentials = this.credentials;
        clone.generator = this.generator;
        return clone;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    setHost(host: string) {
        this.host = host;
    }

    setPort(port: number) {
        this.port = port;
    }

    setDBName(dbName: string) {
        this.dbName = dbName;
    }

    setHttp() {
        this.protocol = "http";
    }

    setHttps() {
        this.protocol = "https";
    }

    setGenerator(generator: PouchDBDocumentGenerator<any>) {
        this.generator = generator;
    }

    getGenerator(): PouchDBDocumentGenerator<any> {
        return this.generator;
    }

    setCredentials(credentials: Credentials) {
        this.credentials = credentials;
    }

    getCredentials(): Credentials {
        return this.credentials;
    }

    toBaseUrl() {
        if (this.baseUrl === undefined) {
            let url = `${this.protocol}://`;
            url += this.host;
            url += `:${this.port}/`;
            return url;
        }
        return this.baseUrl;
    }

    toUrl() {
        return this.toBaseUrl() + this.dbName;
    }

    setBtoaFunction(btoa: Function) {
        this.btoa = btoa;
    }

    setCreateXHR(createXHR: () => XMLHttpRequest) {
        this.createXHR = createXHR;
    }

    callBtoa(input: string) {
        if (typeof window !== "undefined") {
            return btoa(input);
        }
        return this.btoa(input);
    }

    toRequest(log: Logger): AjaxRequest {
        const request: AjaxRequest = {
            url: this.toUrl(),
            crossDomain: true,
        };
        if (this.credentials) {
            const auth = "Basic " + this.callBtoa(this.credentials.username + ":" + this.credentials.password);
            request.headers = {
                Authorization: auth
            };
        }
        if (this.createXHR !== undefined) {
            request.createXHR = this.createXHR;
        }
        log.logMessage(this.getLogName(), "toRequest created request",
            this.getDebugInfo());
        return request;
    }

    getLogName() {
        return "CouchDBConf";
    }

    getDebugInfo() {
        return {
            url: this.toUrl(),
            user: this.credentials.username
        };
    }
}

/**
 * A utility class for managing an external couchdb.
 */
export class CouchDBWrapper {

    static getLogName() {
        return "CouchDBWrapper";
    }

    static createAjaxObservable(ajaxRequest: AjaxRequest, log: Logger): Observable<AjaxResponse> {
        let request$ = ajax(ajaxRequest);
        // add the share pipe so that only one subscribe triggers the request
        request$ = request$.pipe(
            catchError((error: AjaxError) => {
                log.logError(this.getLogName(), "createAjaxObservable error", "error during ajax request",
                {status: error.status, response: error.response});
                return throwError(error);
            }),
            concatMap((response: AjaxResponse) => {
                log.logMessage(this.getLogName(), "createAjaxObservable response",
                    {status: response.status, response: response.response});
                return of(response);
            })
        );
        return request$;
    }

    /**
     * Creates a new couchdb.
     * @param conf configuration info for the new couchdb
     * @param log
     */
    static createCouchDBDatabase(conf: CouchDBConf, log: Logger):
        Observable<{ value: AjaxResponse, log: Logger}> {
        log = log.start(this.getLogName(), "createCouchDBDatabase creating a new database",
            conf.getDebugInfo());
        const ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "PUT";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(
            catchError(error => this.logCreationError(error, conf, log)),
            concatMap(result => this.logCreationResponse(result)));
    }

    private static logCreationResponse(result: { value: AjaxResponse, log: Logger}) {
        const {log, value} = result;
        log.complete();
        log.logMessage(this.getLogName(), "createCouchDBDatabase create response",
            this.getAjaxResponseDebugInfo(value));
        return of(result);
    }

    private static logCreationError(error: AjaxError, conf: CouchDBConf, log: Logger) {
        if (error.status === 412) {
            log.logError(this.getLogName(), "createCouchDBDatabase error", "database already exists",
                conf.getDebugInfo());
            return throwError({exists: true, msg: "CouchDB database " + conf.toUrl() + " already exists"});
        }
        if (error.response !== undefined) {
            return throwError(error.response);
        }
        return throwError(error);
    }

    private static getAjaxResponseDebugInfo(value: AjaxResponse) {
        return {status: value.status, response: value.response};
    }

    /**
     * Deletes a couchdb.
     * @param conf
     * @param log
     */
    static deleteCouchDBDatabase(conf: CouchDBConf, log: Logger): Observable<{value: AjaxResponse, log: Logger}> {
        log = log.start(this.getLogName(), "deleteCouchDBDatabase deleting database", conf.getDebugInfo());
        const ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "DELETE";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(
            concatMap(result => this.logDeleteResponse(result))
        );
    }

    private static logDeleteResponse(result: {value: AjaxResponse, log: Logger}) {
        const {value, log} = result;
        log.complete();
        log.logMessage(this.getLogName(), "deleteCouchDBDatabase delete response", this.getAjaxResponseDebugInfo(value));
        return of(result);
    }

    /**
     * Creates a new couchdb user.
     * @param conf
     * @param userCredentials
     * @param log
     */
    static createUser(conf: CouchDBConf, userCredentials: Credentials, log: Logger):
            Observable<{value: any, log: Logger}> {
        conf.setDBName("_users");
        return PouchDBWrapper.loadExternalDB(conf, log).pipe(
            concatMap(result => this.signUpUser(result, conf, userCredentials)),
            concatMap(createResponse => {
                log.logMessage(this.getLogName(), "createUser response", createResponse);
                log.complete();
                return of(createResponse);
            })
        );
    }

    private static handleCreateUserError(error, conf: CouchDBConf, userCredentials: Credentials, log: Logger) {
        if (error.status === 409) {
            log.logError(this.getLogName(), "createUser error", "user already exists",
                conf.getDebugInfo());
            return throwError({ exists: true, msg: `user ${userCredentials.username} already exists`});
        }
        log.logError(this.getLogName(), "createUser error", error.reason,
            {conf: conf.getDebugInfo(), error: error});
        return throwError(error);
    }

    private static signUpUser(result, conf: CouchDBConf, userCredentials: Credentials): Observable<ValueWithLogger> {
        let log = result.log;
        const db: PouchDBWrapper = result.value;
        log = log.start(this.getLogName(), "createUser creating a new user",
            this.getUserLogParams(conf, userCredentials.username));
        return log.addTo(fromPromise(
            db.getPouchDB().signUp(userCredentials.username, userCredentials.password))).pipe(
                catchError(error => this.handleCreateUserError(error, conf, userCredentials, log)),
        );
    }

    private static getUserLogParams(conf: CouchDBConf, username: string) {
        const logParams: any = conf.getDebugInfo();
        logParams.userBeingChanged = username;
        return logParams;
    }

    /**
     * Deletes a couchdb user.
     * @param conf
     * @param username
     * @param log
     */
    static deleteUser(conf: CouchDBConf, username: string, log: Logger):
            Observable<{value: any, log: Logger}> {
        conf.setDBName("_users");
        return log.addTo(PouchDBWrapper.loadExternalDB(conf, log).pipe(
            concatMap(result => {
                log = result.log;
                const db: PouchDBWrapper = result.value;
                log = log.start(this.getLogName(), "deleteUser deleting user",
                    this.getUserLogParams(conf, username));
                console.log("db.getPouchDB", db.getPouchDB());
                return fromPromise(db.getPouchDB().deleteUser(username));
            }),
            catchError(error => this.handleDeleteUserError(error, conf, username, log)),
            concatMap(deleteResponse => this.handleDeleteUserResponse(log, this.getUserLogParams(conf, username),
                deleteResponse))
        ));
    }

    private static handleDeleteUserResponse(log: Logger, params, deleteResponse) {
        log.logMessage(this.getLogName(), "deleteUser response",
            {db: params, response: deleteResponse});
        log.complete();
        return of(deleteResponse);
    }

    private static handleDeleteUserError(error: any, conf: CouchDBConf, username: string, log: Logger) {
        if (error.status === 404) {
            log.logError(this.getLogName(), "deleteUser error", "user not found", {
                db: this.getUserLogParams(conf, username), error: error
            });
            return throwError({doesNotExist: true, msg: `user ${username} does not exist`});
        }
        log.logError(this.getLogName(), "deleteUser error", "some error", {
            db: this.getUserLogParams(conf, username), error: error
        });
        return throwError(error);
    }

    /**
     * Authorizes certain users to access a couchdb.
     * @param conf
     * @param members array of users to be authorized
     * @param log
     */
    static setDBAuthorization(conf: CouchDBConf, members: string[], log: Logger):
            Observable<ValueWithLogger> {
        const ajaxRequest = conf.toRequest(log);
        const logParams: any = conf.getDebugInfo();
        logParams.members = members;
        log = log.start(this.getLogName(), "setDBAuthorization", logParams);
        ajaxRequest.url += "/_security";
        ajaxRequest.method = "PUT";
        ajaxRequest.headers["Content-Type"] = "application/json";
        ajaxRequest.body = {
            members: {
                names: members,
            }
        };
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(
            concatMap(result => this.logDBAuthorizationResponse(result) )
        );
    }

    private static logDBAuthorizationResponse(result: ValueWithLogger) {
        const response: AjaxResponse = result.value;
        result.log.complete();
        result.log.logMessage(this.getLogName(), "setDBAuthorization response",
            {status: response.status, response: response.response});
        return of(result);
    }

}
