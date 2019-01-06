import { ajax } from "rxjs/ajax";
import { of, throwError } from "rxjs";
import { catchError, concatMap } from "rxjs/operators";
import { PouchDBWrapper } from "./PouchDBWrapper";
import { fromPromise } from "rxjs/internal-compatibility";
export class CouchDBConf {
    clone() {
        const clone = new CouchDBConf();
        clone.host = this.host;
        clone.protocol = this.protocol;
        clone.dbName = this.dbName;
        clone.port = this.port;
        clone.credentials = this.credentials;
        clone.generator = this.generator;
        return clone;
    }
    setHttp() {
        this.protocol = "http";
    }
    setHttps() {
        this.protocol = "https";
    }
    setGenerator(generator) {
        this.generator = generator;
    }
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    toBaseUrl() {
        let url = `${this.protocol}://`;
        url += this.host;
        url += `:${this.port}/`;
        return url;
    }
    toUrl() {
        return this.toBaseUrl() + this.dbName;
    }
    setBtoaFunction(btoa) {
        this.btoa = btoa;
    }
    setCreateXHR(createXHR) {
        this.createXHR = createXHR;
    }
    callBtoa(input) {
        if (typeof window !== "undefined") {
            return btoa(input);
        }
        return this.btoa(input);
    }
    toRequest(log) {
        const request = {
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
        log.logMessage(this.getLogName(), "toRequest created request", this.getDebugInfo());
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
export class CouchDBWrapper {
    static getLogName() {
        return "CouchDBWrapper";
    }
    static createAjaxObservable(ajaxRequest, log) {
        let request$ = ajax(ajaxRequest);
        // add the share pipe so that only one subscribe triggers the request
        request$ = request$.pipe(catchError((error) => {
            log.logError(this.getLogName(), "createAjaxObservable error", "error during ajax request", { status: error.status, response: error.response });
            return throwError(error);
        }), concatMap((response) => {
            log.logMessage(this.getLogName(), "createAjaxObservable response", { status: response.status, response: response.response });
            return of(response);
        }));
        /* request$.subscribe({
            next(response) {
                console.log("response", response.status, response.response);
            },
            error(error) {
                console.log("error", error.status, error.response);
            }
        });*/
        return request$;
    }
    static createCouchDBDatabase(conf, log) {
        log = log.start(this.getLogName(), "createCouchDBDatabase creating a new database", conf.getDebugInfo());
        const ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "PUT";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(catchError(error => this.logCreationError(error, conf, log)), concatMap(result => this.logCreationResponse(result)));
    }
    static logCreationResponse(result) {
        const { log, value } = result;
        log.complete();
        log.logMessage(this.getLogName(), "createCouchDBDatabase create response", this.getAjaxResponseDebugInfo(value));
        return of(result);
    }
    static logCreationError(error, conf, log) {
        if (error.status === 412) {
            log.logError(this.getLogName(), "createCouchDBDatabase error", "database already exists", conf.getDebugInfo());
            return throwError({ exists: true, msg: "CouchDB database " + conf.toUrl() + " already exists" });
        }
        return throwError(error.response);
    }
    static getAjaxResponseDebugInfo(value) {
        return { status: value.status, response: value.response };
    }
    static deleteCouchDBDatabase(conf, log) {
        log = log.start(this.getLogName(), "deleteCouchDBDatabase deleting database", conf.getDebugInfo());
        const ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "DELETE";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(concatMap(result => this.logDeleteResponse(result)));
    }
    static logDeleteResponse(result) {
        const { value, log } = result;
        log.complete();
        log.logMessage(this.getLogName(), "deleteCouchDBDatabase delete response", this.getAjaxResponseDebugInfo(value));
        return of(result);
    }
    static createUser(conf, userCredentials, log) {
        conf.dbName = "_users";
        return PouchDBWrapper.loadExternalDB(conf, log).pipe(concatMap(result => this.signUpUser(result, conf, userCredentials)), concatMap(createResponse => {
            log.logMessage(this.getLogName(), "createUser response", createResponse);
            log.complete();
            return of(createResponse);
        }));
    }
    static handleCreateUserError(error, conf, userCredentials, log) {
        if (error.status === 409) {
            log.logError(this.getLogName(), "createUser error", "user already exists", conf.getDebugInfo());
            return throwError({ exists: true, msg: `user ${userCredentials.username} already exists` });
        }
        log.logError(this.getLogName(), "createUser error", error.reason, { conf: conf.getDebugInfo(), error: error });
        return throwError(error);
    }
    static signUpUser(result, conf, userCredentials) {
        let log = result.log;
        const db = result.value;
        log = log.start(this.getLogName(), "createUser creating a new user", this.getUserLogParams(conf, userCredentials.username));
        return log.addTo(fromPromise(db.getPouchDB().signUp(userCredentials.username, userCredentials.password))).pipe(catchError(error => this.handleCreateUserError(error, conf, userCredentials, log)));
    }
    static getUserLogParams(conf, username) {
        const logParams = conf.getDebugInfo();
        logParams.userBeingChanged = username;
        return logParams;
    }
    static deleteUser(conf, username, log) {
        conf.dbName = "_users";
        return log.addTo(PouchDBWrapper.loadExternalDB(conf, log).pipe(concatMap(result => {
            log = result.log;
            const db = result.value;
            log = log.start(this.getLogName(), "deleteUser deleting user", this.getUserLogParams(conf, username));
            console.log("db.getPouchDB", db.getPouchDB());
            return fromPromise(db.getPouchDB().deleteUser(username));
        }), catchError(error => this.handleDeleteUserError(error, conf, username, log)), concatMap(deleteResponse => this.handleDeleteUserResponse(log, this.getUserLogParams(conf, username), deleteResponse))));
    }
    static handleDeleteUserResponse(log, params, deleteResponse) {
        log.logMessage(this.getLogName(), "deleteUser response", { db: params, response: deleteResponse });
        log.complete();
        return of(deleteResponse);
    }
    static handleDeleteUserError(error, conf, username, log) {
        if (error.status === 404) {
            log.logError(this.getLogName(), "deleteUser error", "user not found", {
                db: this.getUserLogParams(conf, username), error: error
            });
            return throwError({ doesNotExist: true, msg: `user ${username} does not exist` });
        }
        log.logError(this.getLogName(), "deleteUser error", "some error", {
            db: this.getUserLogParams(conf, username), error: error
        });
        return throwError(error);
    }
    static setDBAuthorization(conf, members, log) {
        const ajaxRequest = conf.toRequest(log);
        const logParams = conf.getDebugInfo();
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(concatMap(result => this.logDBAuthorizationResponse(result)));
    }
    static logDBAuthorizationResponse(result) {
        const response = result.value;
        result.log.complete();
        result.log.logMessage(this.getLogName(), "setDBAuthorization response", { status: response.status, response: response.response });
        return of(result);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ291Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBQyxJQUFJLEVBQXVDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBYSxFQUFFLEVBQUUsVUFBVSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2hELE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckQsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQVF4RCxNQUFNLE9BQU8sV0FBVztJQVVwQixLQUFLO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkIsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDdkIsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3JDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNqQyxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRUQsT0FBTztRQUNILElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0lBQzNCLENBQUM7SUFFRCxRQUFRO1FBQ0osSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDNUIsQ0FBQztJQUVELFlBQVksQ0FBQyxTQUF3QztRQUNqRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNB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