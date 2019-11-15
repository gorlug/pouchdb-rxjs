import { ajax } from "rxjs/ajax";
import { of, throwError } from "rxjs";
import { catchError, concatMap } from "rxjs/operators";
import { PouchDBWrapper } from "./PouchDBWrapper";
import { fromPromise } from "rxjs/internal-compatibility";
/**
 * This class is used to build a configuration object to connect
 * to a couchdb instance.
 */
var CouchDBConf = /** @class */ (function () {
    function CouchDBConf() {
    }
    CouchDBConf.prototype.clone = function () {
        var clone = new CouchDBConf();
        clone.host = this.host;
        clone.protocol = this.protocol;
        clone.dbName = this.dbName;
        clone.port = this.port;
        clone.credentials = this.credentials;
        clone.generator = this.generator;
        return clone;
    };
    CouchDBConf.prototype.setBaseUrl = function (url) {
        url = url.trim();
        if (url[url.length - 1] !== "/") {
            url += "/";
        }
        this.baseUrl = url;
    };
    CouchDBConf.prototype.setHost = function (host) {
        this.host = host;
    };
    CouchDBConf.prototype.setPort = function (port) {
        this.port = port;
    };
    CouchDBConf.prototype.setDBName = function (dbName) {
        this.dbName = dbName;
    };
    CouchDBConf.prototype.setHttp = function () {
        this.protocol = "http";
    };
    CouchDBConf.prototype.setHttps = function () {
        this.protocol = "https";
    };
    CouchDBConf.prototype.setGenerator = function (generator) {
        this.generator = generator;
    };
    CouchDBConf.prototype.getGenerator = function () {
        return this.generator;
    };
    CouchDBConf.prototype.setCredentials = function (credentials) {
        this.credentials = credentials;
    };
    CouchDBConf.prototype.getCredentials = function () {
        return this.credentials;
    };
    CouchDBConf.prototype.toBaseUrl = function () {
        if (this.baseUrl === undefined) {
            var url = this.protocol + "://";
            url += this.host;
            url += ":" + this.port + "/";
            return url;
        }
        return this.baseUrl;
    };
    CouchDBConf.prototype.toUrl = function () {
        return this.toBaseUrl() + this.dbName;
    };
    CouchDBConf.prototype.setBtoaFunction = function (btoa) {
        this.btoa = btoa;
    };
    CouchDBConf.prototype.setCreateXHR = function (createXHR) {
        this.createXHR = createXHR;
    };
    CouchDBConf.prototype.callBtoa = function (input) {
        if (typeof window !== "undefined") {
            return btoa(input);
        }
        return this.btoa(input);
    };
    CouchDBConf.prototype.toRequest = function (log) {
        var request = {
            url: this.toUrl(),
            crossDomain: true,
        };
        if (this.credentials) {
            var auth = "Basic " + this.callBtoa(this.credentials.username + ":" + this.credentials.password);
            request.headers = {
                Authorization: auth
            };
        }
        if (this.createXHR !== undefined) {
            request.createXHR = this.createXHR;
        }
        log.logMessage(this.getLogName(), "toRequest created request", this.getDebugInfo());
        return request;
    };
    CouchDBConf.prototype.getLogName = function () {
        return "CouchDBConf";
    };
    CouchDBConf.prototype.getDebugInfo = function () {
        return {
            url: this.toUrl(),
            user: this.credentials.username
        };
    };
    return CouchDBConf;
}());
export { CouchDBConf };
/**
 * A utility class for managing an external couchdb.
 */
var CouchDBWrapper = /** @class */ (function () {
    function CouchDBWrapper() {
    }
    CouchDBWrapper.getLogName = function () {
        return "CouchDBWrapper";
    };
    CouchDBWrapper.createAjaxObservable = function (ajaxRequest, log) {
        var _this = this;
        var request$ = ajax(ajaxRequest);
        // add the share pipe so that only one subscribe triggers the request
        request$ = request$.pipe(catchError(function (error) {
            log.logError(_this.getLogName(), "createAjaxObservable error", "error during ajax request", { status: error.status, response: error.response });
            return throwError(error);
        }), concatMap(function (response) {
            log.logMessage(_this.getLogName(), "createAjaxObservable response", { status: response.status, response: response.response });
            return of(response);
        }));
        return request$;
    };
    /**
     * Creates a new couchdb.
     * @param conf configuration info for the new couchdb
     * @param log
     */
    CouchDBWrapper.createCouchDBDatabase = function (conf, log) {
        var _this = this;
        log = log.start(this.getLogName(), "createCouchDBDatabase creating a new database", conf.getDebugInfo());
        var ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "PUT";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(catchError(function (error) { return _this.logCreationError(error, conf, log); }), concatMap(function (result) { return _this.logCreationResponse(result); }));
    };
    CouchDBWrapper.logCreationResponse = function (result) {
        var log = result.log, value = result.value;
        log.complete();
        log.logMessage(this.getLogName(), "createCouchDBDatabase create response", this.getAjaxResponseDebugInfo(value));
        return of(result);
    };
    CouchDBWrapper.logCreationError = function (error, conf, log) {
        if (error.status === 412) {
            log.logError(this.getLogName(), "createCouchDBDatabase error", "database already exists", conf.getDebugInfo());
            return throwError({ exists: true, msg: "CouchDB database " + conf.toUrl() + " already exists" });
        }
        if (error.response !== undefined) {
            return throwError(error.response);
        }
        return throwError(error);
    };
    CouchDBWrapper.getAjaxResponseDebugInfo = function (value) {
        return { status: value.status, response: value.response };
    };
    /**
     * Deletes a couchdb.
     * @param conf
     * @param log
     */
    CouchDBWrapper.deleteCouchDBDatabase = function (conf, log) {
        var _this = this;
        log = log.start(this.getLogName(), "deleteCouchDBDatabase deleting database", conf.getDebugInfo());
        var ajaxRequest = conf.toRequest(log);
        ajaxRequest.method = "DELETE";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(concatMap(function (result) { return _this.logDeleteResponse(result); }));
    };
    CouchDBWrapper.logDeleteResponse = function (result) {
        var value = result.value, log = result.log;
        log.complete();
        log.logMessage(this.getLogName(), "deleteCouchDBDatabase delete response", this.getAjaxResponseDebugInfo(value));
        return of(result);
    };
    /**
     * Creates a new couchdb user.
     * @param conf
     * @param userCredentials
     * @param log
     */
    CouchDBWrapper.createUser = function (conf, userCredentials, log) {
        var _this = this;
        conf.setDBName("_users");
        return PouchDBWrapper.loadExternalDB(conf, log).pipe(concatMap(function (result) { return _this.signUpUser(result, conf, userCredentials); }), concatMap(function (createResponse) {
            log.logMessage(_this.getLogName(), "createUser response", createResponse);
            log.complete();
            return of(createResponse);
        }));
    };
    CouchDBWrapper.handleCreateUserError = function (error, conf, userCredentials, log) {
        if (error.status === 409) {
            log.logError(this.getLogName(), "createUser error", "user already exists", conf.getDebugInfo());
            return throwError({ exists: true, msg: "user " + userCredentials.username + " already exists" });
        }
        log.logError(this.getLogName(), "createUser error", error.reason, { conf: conf.getDebugInfo(), error: error });
        return throwError(error);
    };
    CouchDBWrapper.signUpUser = function (result, conf, userCredentials) {
        var _this = this;
        var log = result.log;
        var db = result.value;
        log = log.start(this.getLogName(), "createUser creating a new user", this.getUserLogParams(conf, userCredentials.username));
        return log.addTo(fromPromise(db.getPouchDB().signUp(userCredentials.username, userCredentials.password))).pipe(catchError(function (error) { return _this.handleCreateUserError(error, conf, userCredentials, log); }));
    };
    CouchDBWrapper.getUserLogParams = function (conf, username) {
        var logParams = conf.getDebugInfo();
        logParams.userBeingChanged = username;
        return logParams;
    };
    /**
     * Deletes a couchdb user.
     * @param conf
     * @param username
     * @param log
     */
    CouchDBWrapper.deleteUser = function (conf, username, log) {
        var _this = this;
        conf.setDBName("_users");
        return log.addTo(PouchDBWrapper.loadExternalDB(conf, log).pipe(concatMap(function (result) {
            log = result.log;
            var db = result.value;
            log = log.start(_this.getLogName(), "deleteUser deleting user", _this.getUserLogParams(conf, username));
            console.log("db.getPouchDB", db.getPouchDB());
            return fromPromise(db.getPouchDB().deleteUser(username));
        }), catchError(function (error) { return _this.handleDeleteUserError(error, conf, username, log); }), concatMap(function (deleteResponse) { return _this.handleDeleteUserResponse(log, _this.getUserLogParams(conf, username), deleteResponse); })));
    };
    CouchDBWrapper.handleDeleteUserResponse = function (log, params, deleteResponse) {
        log.logMessage(this.getLogName(), "deleteUser response", { db: params, response: deleteResponse });
        log.complete();
        return of(deleteResponse);
    };
    CouchDBWrapper.handleDeleteUserError = function (error, conf, username, log) {
        if (error.status === 404) {
            log.logError(this.getLogName(), "deleteUser error", "user not found", {
                db: this.getUserLogParams(conf, username), error: error
            });
            return throwError({ doesNotExist: true, msg: "user " + username + " does not exist" });
        }
        log.logError(this.getLogName(), "deleteUser error", "some error", {
            db: this.getUserLogParams(conf, username), error: error
        });
        return throwError(error);
    };
    /**
     * Authorizes certain users to access a couchdb.
     * @param conf
     * @param members array of users to be authorized
     * @param log
     */
    CouchDBWrapper.setDBAuthorization = function (conf, members, log) {
        var _this = this;
        var ajaxRequest = CouchDBWrapper.createAuthorizationRequest(conf, log);
        var logParams = conf.getDebugInfo();
        logParams.members = members;
        log = log.start(this.getLogName(), "setDBAuthorization", logParams);
        ajaxRequest.method = "PUT";
        ajaxRequest.body = {
            members: {
                names: members,
            }
        };
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(concatMap(function (result) { return _this.logDBAuthorizationResponse("setDBAuthorization", result); }));
    };
    CouchDBWrapper.createAuthorizationRequest = function (conf, log) {
        var ajaxRequest = conf.toRequest(log);
        ajaxRequest.url += "/_security";
        ajaxRequest.headers["Content-Type"] = "application/json";
        return ajaxRequest;
    };
    CouchDBWrapper.logDBAuthorizationResponse = function (name, result) {
        var response = result.value;
        result.log.complete();
        result.log.logMessage(this.getLogName(), name + " response", { status: response.status, response: response.response });
        return of(result);
    };
    CouchDBWrapper.getDBAuthorization = function (conf, log) {
        var _this = this;
        var ajaxRequest = CouchDBWrapper.createAuthorizationRequest(conf, log);
        var logParams = conf.getDebugInfo();
        var start = log.start(this.getLogName(), "getDBAuthorization", logParams);
        ajaxRequest.method = "GET";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(concatMap(function (result) {
            _this.logDBAuthorizationResponse("getDBAuthorization", result);
            start.complete();
            if (result.value.response.members) {
                return result.log.addTo(of(result.value.response.members.names));
            }
            return result.log.addTo(of([]));
        }));
    };
    return CouchDBWrapper;
}());
export { CouchDBWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ291Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBQyxJQUFJLEVBQXVDLE1BQU0sV0FBVyxDQUFDO0FBQ3JFLE9BQU8sRUFBYSxFQUFFLEVBQUUsVUFBVSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2hELE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDckQsT0FBTyxFQUFDLGNBQWMsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQVF4RDs7O0dBR0c7QUFDSDtJQUFBO0lBNEhBLENBQUM7SUFqSEcsMkJBQUssR0FBTDtRQUNJLElBQU0sS0FBSyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDaEMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMvQixLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELGdDQUFVLEdBQVYsVUFBVyxHQUFXO1FBQ2xCLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0IsR0FB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