"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ajax_1 = require("rxjs/ajax");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var PouchDBWrapper_1 = require("./PouchDBWrapper");
var internal_compatibility_1 = require("rxjs/internal-compatibility");
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
exports.CouchDBConf = CouchDBConf;
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
        var request$ = ajax_1.ajax(ajaxRequest);
        // add the share pipe so that only one subscribe triggers the request
        request$ = request$.pipe(operators_1.catchError(function (error) {
            log.logError(_this.getLogName(), "createAjaxObservable error", "error during ajax request", { status: error.status, response: error.response });
            return rxjs_1.throwError(error);
        }), operators_1.concatMap(function (response) {
            log.logMessage(_this.getLogName(), "createAjaxObservable response", { status: response.status, response: response.response });
            return rxjs_1.of(response);
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.catchError(function (error) { return _this.logCreationError(error, conf, log); }), operators_1.concatMap(function (result) { return _this.logCreationResponse(result); }));
    };
    CouchDBWrapper.logCreationResponse = function (result) {
        var log = result.log, value = result.value;
        log.complete();
        log.logMessage(this.getLogName(), "createCouchDBDatabase create response", this.getAjaxResponseDebugInfo(value));
        return rxjs_1.of(result);
    };
    CouchDBWrapper.logCreationError = function (error, conf, log) {
        if (error.status === 412) {
            log.logError(this.getLogName(), "createCouchDBDatabase error", "database already exists", conf.getDebugInfo());
            return rxjs_1.throwError({ exists: true, msg: "CouchDB database " + conf.toUrl() + " already exists" });
        }
        if (error.response !== undefined) {
            return rxjs_1.throwError(error.response);
        }
        return rxjs_1.throwError(error);
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.concatMap(function (result) { return _this.logDeleteResponse(result); }));
    };
    CouchDBWrapper.logDeleteResponse = function (result) {
        var value = result.value, log = result.log;
        log.complete();
        log.logMessage(this.getLogName(), "deleteCouchDBDatabase delete response", this.getAjaxResponseDebugInfo(value));
        return rxjs_1.of(result);
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
        return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(conf, log).pipe(operators_1.concatMap(function (result) { return _this.signUpUser(result, conf, userCredentials); }), operators_1.concatMap(function (createResponse) {
            log.logMessage(_this.getLogName(), "createUser response", createResponse);
            log.complete();
            return rxjs_1.of(createResponse);
        }));
    };
    CouchDBWrapper.handleCreateUserError = function (error, conf, userCredentials, log) {
        if (error.status === 409) {
            log.logError(this.getLogName(), "createUser error", "user already exists", conf.getDebugInfo());
            return rxjs_1.throwError({ exists: true, msg: "user " + userCredentials.username + " already exists" });
        }
        log.logError(this.getLogName(), "createUser error", error.reason, { conf: conf.getDebugInfo(), error: error });
        return rxjs_1.throwError(error);
    };
    CouchDBWrapper.signUpUser = function (result, conf, userCredentials) {
        var _this = this;
        var log = result.log;
        var db = result.value;
        log = log.start(this.getLogName(), "createUser creating a new user", this.getUserLogParams(conf, userCredentials.username));
        return log.addTo(internal_compatibility_1.fromPromise(db.getPouchDB().signUp(userCredentials.username, userCredentials.password))).pipe(operators_1.catchError(function (error) { return _this.handleCreateUserError(error, conf, userCredentials, log); }));
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
        return log.addTo(PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(conf, log).pipe(operators_1.concatMap(function (result) {
            log = result.log;
            var db = result.value;
            log = log.start(_this.getLogName(), "deleteUser deleting user", _this.getUserLogParams(conf, username));
            console.log("db.getPouchDB", db.getPouchDB());
            return internal_compatibility_1.fromPromise(db.getPouchDB().deleteUser(username));
        }), operators_1.catchError(function (error) { return _this.handleDeleteUserError(error, conf, username, log); }), operators_1.concatMap(function (deleteResponse) { return _this.handleDeleteUserResponse(log, _this.getUserLogParams(conf, username), deleteResponse); })));
    };
    CouchDBWrapper.handleDeleteUserResponse = function (log, params, deleteResponse) {
        log.logMessage(this.getLogName(), "deleteUser response", { db: params, response: deleteResponse });
        log.complete();
        return rxjs_1.of(deleteResponse);
    };
    CouchDBWrapper.handleDeleteUserError = function (error, conf, username, log) {
        if (error.status === 404) {
            log.logError(this.getLogName(), "deleteUser error", "user not found", {
                db: this.getUserLogParams(conf, username), error: error
            });
            return rxjs_1.throwError({ doesNotExist: true, msg: "user " + username + " does not exist" });
        }
        log.logError(this.getLogName(), "deleteUser error", "some error", {
            db: this.getUserLogParams(conf, username), error: error
        });
        return rxjs_1.throwError(error);
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
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.concatMap(function (result) { return _this.logDBAuthorizationResponse("setDBAuthorization", result); }));
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
        return rxjs_1.of(result);
    };
    CouchDBWrapper.getDBAuthorization = function (conf, log) {
        var _this = this;
        var ajaxRequest = CouchDBWrapper.createAuthorizationRequest(conf, log);
        var logParams = conf.getDebugInfo();
        var start = log.start(this.getLogName(), "getDBAuthorization", logParams);
        ajaxRequest.method = "GET";
        return log.addTo(this.createAjaxObservable(ajaxRequest, log)).pipe(operators_1.concatMap(function (result) {
            _this.logDBAuthorizationResponse("getDBAuthorization", result);
            start.complete();
            if (result.value.response.members) {
                return result.log.addTo(rxjs_1.of(result.value.response.members.names));
            }
            return result.log.addTo(rxjs_1.of([]));
        }));
    };
    return CouchDBWrapper;
}());
exports.CouchDBWrapper = CouchDBWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ291Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL0NvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esa0NBQXFFO0FBQ3JFLDZCQUFnRDtBQUNoRCw0Q0FBcUQ7QUFDckQsbURBQWdEO0FBQ2hELHNFQUF3RDtBQVF4RDs7O0dBR0c7QUFDSDtJQUFBO0lBNEhBLENBQUM7SUFqSEcsMkJBQUssR0FBTDtRQUNJLElBQU0sS0FBSyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDaEMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMvQixLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNyQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDakMsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUVELGdDQUFVLEdBQVYsVUFBVyxHQUFXO1FBQ2xCLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7WUFDN0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztTQUNkO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDdkIsQ0FBQztJQUVELDZCQUFPLEdBQVAsVUFBUSxJQUFZO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCw2QkFBTyxHQUFQLFVBQVEsSUFB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