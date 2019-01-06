"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ajax_1 = require("rxjs/ajax");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const PouchDBWrapper_1 = require("./PouchDBWrapper");
const internal_compatibility_1 = require("rxjs/internal-compatibility");
class CouchDBConf {
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
exports.CouchDBConf = CouchDBConf;
class CouchDBWrapper {
    static getLogName() {
        return "CouchDBWrapper";
    }
    static createAjaxObservable(ajaxRequest, log) {
        let request$ = ajax_1.ajax(ajaxRequest);
        // add the share pipe so that only one subscribe triggers the request
        request$ = request$.pipe(operators_1.catchError((error) => {
            log.logError(this.getLogName(), "createAjaxObservable error", "error during ajax request", { status: error.status, response: error.response });
            return rxjs_1.throwError(error);
        }), operators_1.concatMap((response) => {
            log.logMessage(this.getLogName(), "createAjaxObservable response", { status: response.status, response: response.response });
            return rxjs_1.of(response);
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.catchError(error => this.logCreationError(error, conf, log)), operators_1.concatMap(result => this.logCreationResponse(result)));
    }
    static logCreationResponse(result) {
        const { log, value } = result;
        log.complete();
        log.logMessage(this.getLogName(), "createCouchDBDatabase create response", this.getAjaxResponseDebugInfo(value));
        return rxjs_1.of(result);
    }
    static logCreationError(error, conf, log) {
        if (error.status === 412) {
            log.logError(this.getLogName(), "createCouchDBDatabase error", "database already exists", conf.getDebugInfo());
            return rxjs_1.throwError({ exists: true, msg: "CouchDB database " + conf.toUrl() + " already exists" });
        }
        return rxjs_1.throwError(error.response);
    }
    static getAjaxResponseDebugInfo(value) {
        return { status: value.status, response: value.response };
    }
    static deleteCouchDBDatabase(conf, log) {
        log = log.start(this.getLogName(), "deleteCouchDBDatabase deleting database", conf.getDebugInfo());
        const ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "DELETE";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.concatMap(result => this.logDeleteResponse(result)));
    }
    static logDeleteResponse(result) {
        const { value, log } = result;
        log.complete();
        log.logMessage(this.getLogName(), "deleteCouchDBDatabase delete response", this.getAjaxResponseDebugInfo(value));
        return rxjs_1.of(result);
    }
    static createUser(conf, userCredentials, log) {
        conf.dbName = "_users";
        return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(conf, log).pipe(operators_1.concatMap(result => this.signUpUser(result, conf, userCredentials)), operators_1.concatMap(createResponse => {
            log.logMessage(this.getLogName(), "createUser response", createResponse);
            log.complete();
            return rxjs_1.of(createResponse);
        }));
    }
    static handleCreateUserError(error, conf, userCredentials, log) {
        if (error.status === 409) {
            log.logError(this.getLogName(), "createUser error", "user already exists", conf.getDebugInfo());
            return rxjs_1.throwError({ exists: true, msg: `user ${userCredentials.username} already exists` });
        }
        log.logError(this.getLogName(), "createUser error", error.reason, { conf: conf.getDebugInfo(), error: error });
        return rxjs_1.throwError(error);
    }
    static signUpUser(result, conf, userCredentials) {
        let log = result.log;
        const db = result.value;
        log = log.start(this.getLogName(), "createUser creating a new user", this.getUserLogParams(conf, userCredentials.username));
        return log.addTo(internal_compatibility_1.fromPromise(db.getPouchDB().signUp(userCredentials.username, userCredentials.password))).pipe(operators_1.catchError(error => this.handleCreateUserError(error, conf, userCredentials, log)));
    }
    static getUserLogParams(conf, username) {
        const logParams = conf.getDebugInfo();
        logParams.userBeingChanged = username;
        return logParams;
    }
    static deleteUser(conf, username, log) {
        conf.dbName = "_users";
        return log.addTo(PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(conf, log).pipe(operators_1.concatMap(result => {
            log = result.log;
            const db = result.value;
            log = log.start(this.getLogName(), "deleteUser deleting user", this.getUserLogParams(conf, username));
            console.log("db.getPouchDB", db.getPouchDB());
            return internal_compatibility_1.fromPromise(db.getPouchDB().deleteUser(username));
        }), operators_1.catchError(error => this.handleDeleteUserError(error, conf, username, log)), operators_1.concatMap(deleteResponse => this.handleDeleteUserResponse(log, this.getUserLogParams(conf, username), deleteResponse))));
    }
    static handleDeleteUserResponse(log, params, deleteResponse) {
        log.logMessage(this.getLogName(), "deleteUser response", { db: params, response: deleteResponse });
        log.complete();
        return rxjs_1.of(deleteResponse);
    }
    static handleDeleteUserError(error, conf, username, log) {
        if (error.status === 404) {
            log.logError(this.getLogName(), "deleteUser error", "user not found", {
                db: this.getUserLogParams(conf, username), error: error
            });
            return rxjs_1.throwError({ doesNotExist: true, msg: `user ${username} does not exist` });
        }
        log.logError(this.getLogName(), "deleteUser error", "some error", {
            db: this.getUserLogParams(conf, username), error: error
        });
        return rxjs_1.throwError(error);
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.concatMap(result => this.logDBAuthorizationResponse(result)));
    }
    static logDBAuthorizationResponse(result) {
        const response = result.value;
        result.log.complete();
        result.log.logMessage(this.getLogName(), "setDBAuthorization response", { status: response.status, response: response.response });
        return rxjs_1.of(result);
    }
}
exports.CouchDBWrapper = CouchDBWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ291Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esb0NBQXFFO0FBQ3JFLCtCQUFnRDtBQUNoRCw4Q0FBcUQ7QUFDckQscURBQWdEO0FBQ2hELHdFQUF3RDtBQVF4RCxNQUFhLFdBQVc7SUFVcEIsS0FBSztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDaEMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMvQixLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELE9BQU87UUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBRUQsUUFBUTtRQUNKLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUFZLENBQUMsU0FBd0M7UUFDakQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDL0IsQ0FBQztJQUVELGNBQWMsQ0FBQyxXQUF3QjtRQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztJQUNuQyxDQUFDO0lBRUQsU0FBUztRQUNMLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDO1FBQ2hDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2pCLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUN4QixPQUFPLEdBQUcsQ0FBQztJQUNmLENBQUM7SUFFRCxLQUFLO1FBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUMxQyxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQWM7UUFDMUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVELFlBQVksQ0FBQyxTQUErQjtRQUN4QyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUMvQixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWE7UUFDbEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdEI7UUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFXO1FBQ2pCLE1BQU0sT0FBTyxHQUFnQjtZQUN6QixHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNqQixXQUFXLEVBQUUsSUFBSTtTQUNwQixDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ2xCLE1BQU0sSUFBSSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ25HLE9BQU8sQ0FBQyxPQUFPLEdBQUc7Z0JBQ2QsYUFBYSxFQUFFLElBQUk7YUFDdEIsQ0FBQztTQUNMO1FBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUM5QixPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7U0FDdEM7UUFDRCxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSwyQkFBMkIsRUFDekQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDekIsT0FBTyxPQUFPLENBQUM7SUFDbkIsQ0FBQztJQUVELFVBQVU7UUFDTixPQUFPLGFBQWEsQ0FBQztJQUN6QixDQUFDO0lBRUQsWUFBWTtRQUNSLE9BQU87WUFDSCxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRO1NBQ2xDLENBQUM7SUFDTixDQUFDO0NBQ0o7QUE1RkQsa0NBNEZDO0FBRUQsTUFBYSxjQUFjO0lBRXZCLE1BQU0sQ0FBQyxVQUFVO1FBQ2IsT0FBTyxnQkFBZ0IsQ0FBQztJQUM1QixDQUFDO0lBRUQsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQXdCLEVBQUUsR0FBVztRQUM3RCxJQUFJLFFBQVEsR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDakMscUVBQXFFO1FBQ3JFLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUNwQixzQkFBVSxDQUFDLENBQUMsS0FBZ0IsRUFBRSxFQUFFO1lBQzVCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLDRCQUE0QixFQUFFLDJCQUEyQixFQUN6RixFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQztZQUNsRCxPQUFPLGlCQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLEVBQ0YscUJBQVMsQ0FBQyxDQUFDLFFBQXNCLEVBQUUsRUFBRTtZQUNqQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSwrQkFBK0IsRUFDN0QsRUFBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7WUFDNUQsT0FBTyxTQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztRQUNGOzs7Ozs7O2FBT0s7UUFDTCxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0lBRUQsTUFBTSxDQUFDLHFCQUFxQixDQUFDLElBQWlCLEVBQUUsR0FBVztRQUV2RCxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsK0NBQStDLEVBQzlFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsV0FBVyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDM0IsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzlELHNCQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUM1RCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU8sTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQTJDO1FBQzFFLE1BQU0sRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLEdBQUcsTUFBTSxDQUFDO1FBQzVCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLHVDQUF1QyxFQUNyRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxQyxPQUFPLFNBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQWdCLEVBQUUsSUFBaUIsRUFBRSxHQUFXO1FBQzVFLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7WUFDdEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsNkJBQTZCLEVBQUUseUJBQXlCLEVBQ3BGLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLE9BQU8saUJBQVUsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLG1CQUFtQixHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxpQkFBaUIsRUFBQyxDQUFDLENBQUM7U0FDbEc7UUFDRCxPQUFPLGlCQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxNQUFNLENBQUMsd0JBQXdCLENBQUMsS0FBbUI7UUFDdkQsT0FBTyxFQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFpQixFQUFFLEdBQVc7UUFDdkQsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLHlDQUF5QyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ25HLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsV0FBVyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDOUIsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzlELHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDdEQsQ0FBQztJQUNOLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsTUFBMEM7UUFDdkUsTUFBTSxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxNQUFNLENBQUM7UUFDNUIsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsdUNBQXVDLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakgsT0FBTyxTQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBaUIsRUFBRSxlQUE0QixFQUFFLEdBQVc7UUFFMUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDdkIsT0FBTywrQkFBYyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUNoRCxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDLEVBQ25FLHFCQUFTLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDdkIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNOLENBQUM7SUFFTyxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLElBQWlCLEVBQUUsZUFBNEIsRUFBRSxHQUFXO1FBQ3BHLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7WUFDdEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUscUJBQXFCLEVBQ3JFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLE9BQU8saUJBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsZUFBZSxDQUFDLFFBQVEsaUJBQWlCLEVBQUMsQ0FBQyxDQUFDO1NBQzlGO1FBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFDNUQsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1FBQy9DLE9BQU8saUJBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBaUIsRUFBRSxlQUE0QjtRQUM3RSxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ3JCLE1BQU0sRUFBRSxHQUFtQixNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ3hDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxnQ0FBZ0MsRUFDL0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMzRCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0NBQVcsQ0FDeEIsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM3RSxzQkFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ3pGLENBQUM7SUFDTixDQUFDO0lBRU8sTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQWlCLEVBQUUsUUFBZ0I7UUFDL0QsTUFBTSxTQUFTLEdBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLFNBQVMsQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7UUFDdEMsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBaUIsRUFBRSxRQUFnQixFQUFFLEdBQVc7UUFFOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7UUFDdkIsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLCtCQUFjLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQzFELHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDZixHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNqQixNQUFNLEVBQUUsR0FBbUIsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUN4QyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsMEJBQTBCLEVBQ3pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUM5QyxPQUFPLG9DQUFXLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxFQUNGLHNCQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFDM0UscUJBQVMsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFDaEcsY0FBYyxDQUFDLENBQUMsQ0FDdkIsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFXLEVBQUUsTUFBTSxFQUFFLGNBQWM7UUFDdkUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUscUJBQXFCLEVBQ25ELEVBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUM1QyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPLFNBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUFDLEtBQVUsRUFBRSxJQUFpQixFQUFFLFFBQWdCLEVBQUUsR0FBVztRQUM3RixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFO2dCQUNsRSxFQUFFLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSzthQUMxRCxDQUFDLENBQUM7WUFDSCxPQUFPLGlCQUFVLENBQUMsRUFBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLFFBQVEsaUJBQWlCLEVBQUMsQ0FBQyxDQUFDO1NBQ25GO1FBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFO1lBQzlELEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLO1NBQzFELENBQUMsQ0FBQztRQUNILE9BQU8saUJBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQWlCLEVBQUUsT0FBaUIsRUFBRSxHQUFXO1FBRXZFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzNDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQzVCLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRSxXQUFXLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQztRQUNoQyxXQUFXLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUMzQixXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLGtCQUFrQixDQUFDO1FBQ3pELFdBQVcsQ0FBQyxJQUFJLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ0wsS0FBSyxFQUFFLE9BQU87YUFDakI7U0FDSixDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzlELHFCQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FDaEUsQ0FBQztJQUNOLENBQUM7SUFFTyxNQUFNLENBQUMsMEJBQTBCLENBQUMsTUFBdUI7UUFDN0QsTUFBTSxRQUFRLEdBQWlCLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDNUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QixNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsNkJBQTZCLEVBQ2xFLEVBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDO1FBQzVELE9BQU8sU0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FFSjtBQTFMRCx3Q0EwTEMifQ==