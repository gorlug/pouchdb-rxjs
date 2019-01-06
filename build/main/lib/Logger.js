"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const PouchDBDocument_1 = require("./PouchDBDocument");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
class LogDocument extends PouchDBDocument_1.PouchDBDocument {
    constructor(name, msg) {
        super();
        this._duration = -1;
        this._id = uuid_1.v4();
        this._timestamp = new Date().toISOString();
        this._name = name;
        this._msg = msg;
    }
    get error() {
        return this._error;
    }
    set error(value) {
        this._error = value;
    }
    get msg() {
        return this._msg;
    }
    set msg(value) {
        this._msg = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
    get trace() {
        return this._trace;
    }
    set trace(value) {
        this._trace = value;
    }
    get params() {
        return this._params;
    }
    set params(value) {
        this.modifyPouchDBDocumentDebugOutput(value);
        this._params = value;
    }
    get duration() {
        return this._duration;
    }
    set duration(value) {
        this._duration = value;
    }
    get run() {
        return this._run;
    }
    set run(value) {
        this._run = value;
    }
    get timestamp() {
        return this._timestamp;
    }
    set timestamp(value) {
        this._timestamp = value;
    }
    modifyPouchDBDocumentDebugOutput(params) {
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                const param = params[key];
                if (param instanceof PouchDBDocument_1.PouchDBDocument) {
                    const doc = param;
                    params[key] = doc.getDebugInfo();
                }
            }
        }
    }
    addValuesToJSONDocument(json) {
        json.msg = this._msg;
        json.name = this._name;
        json.trace = this._trace;
        json.params = this._params;
        json.duration = this._duration;
        json.run = this._run;
        json.timestamp = this._timestamp;
        json.error = this._error;
    }
    toLogMessage() {
        const json = {};
        this.addValuesToJSONDocument(json);
        if (this._params === undefined) {
            delete json.params;
        }
        if (this._duration === -1) {
            delete json.duration;
        }
        if (this._run === undefined) {
            delete json.run;
        }
        if (this._error === undefined) {
            delete json.error;
        }
        return json;
    }
}
exports.LogDocument = LogDocument;
class LogDocumentGenerator extends PouchDBDocument_1.PouchDBDocumentGenerator {
    createDocument(json) {
        const doc = new LogDocument(json.name, json.msg);
        doc.trace = json.trace;
        doc.params = json.params;
        doc.duration = json.duration;
        doc.run = json.run;
        doc.error = json.error;
        doc.timestamp = json.timestamp;
        return doc;
    }
}
exports.LogDocumentGenerator = LogDocumentGenerator;
class Logger {
    constructor(name = "") {
        this.startTime = -1;
        this.silent = false;
        this.name = name;
    }
    static getLogger(name) {
        return new Logger(name);
    }
    static getLoggerTrace(name = "") {
        const logger = new Logger(name);
        logger.setTrace(Logger.generateTrace());
        return logger;
    }
    static getLoggerTraceWithDB(db, name = "") {
        const logger = this.getLoggerTrace(name);
        logger.setLogDB(db);
        return logger;
    }
    static generateTrace() {
        return uuid_1.v4();
    }
    setLogDB(logDB) {
        this.logDB = logDB;
    }
    getLogDB() {
        return this.logDB;
    }
    setSilent(silent) {
        this.silent = silent;
    }
    getSilent() {
        return this.silent;
    }
    setTrace(trace) {
        this.trace = trace;
    }
    getName() {
        return this.name;
    }
    complete(error) {
        if (this.startTime !== -1) {
            const observable = this.logEnd(this.name, this.dsc, this.params, this.startTime, error);
            this.startTime = -1;
            return observable;
        }
        return rxjs_1.of(this);
    }
    createLogDocument(name, dsc, params) {
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.trace = this.trace;
        return message;
    }
    logMessage(name, dsc, params = {}) {
        return this.log(this.createLogDocument(name, dsc, params));
    }
    logError(name, dsc, error, params = {}) {
        const message = this.createLogDocument(name, dsc, params);
        message.error = error;
        return this.log(message).pipe(operators_1.concatMap(() => this.complete(error)));
    }
    logErrorAndSendSubscriberErrorComplete(subscriber, name, dsc, error, params = {}) {
        this.logError(name, dsc, error, params);
        subscriber.error(error);
        subscriber.complete();
    }
    log(message) {
        if (this.silent) {
            return rxjs_1.of(this);
        }
        if (message.name === undefined) {
            message.name = this.name;
        }
        if (this.trace !== undefined) {
            message.trace = this.trace;
        }
        // console.log("+++++", message.name, message.msg, message.run);
        const logMessage = message.toLogMessage();
        console.log(logMessage);
        return this.logToDB(message);
    }
    logStart(name, dsc, params) {
        const start = new Date().getTime();
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.run = "start";
        this.log(message);
        return start;
    }
    logEnd(name, dsc, params, start, error) {
        const duration = new Date().getTime() - start;
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.duration = duration;
        message.run = "end";
        if (error !== undefined) {
            message.error = error;
        }
        return this.log(message);
    }
    start(name, dsc, params = {}) {
        this.complete();
        const log = new Logger(name);
        log.dsc = dsc;
        log.params = params;
        log.startTime = this.logStart(name, dsc, params);
        log.trace = this.trace;
        log.silent = this.silent;
        log.logDB = this.logDB;
        return log;
    }
    addTo(observable) {
        return observable.pipe(operators_1.concatMap(result => rxjs_1.of({ value: result, log: this })));
    }
    addToValue(value) {
        return {
            value: value,
            log: this
        };
    }
    addToSubscriberNextAndComplete(subscriber, value) {
        this.complete();
        subscriber.next({ value: value, log: this });
        subscriber.complete();
    }
    logToDB(logMessage) {
        if (this.logDB !== undefined) {
            const log = new Logger("");
            log.setSilent(true);
            const saveRequest$ = this.logDB.saveDocument(logMessage, log).pipe(operators_1.share());
            saveRequest$.subscribe(() => { }, error => {
                console.log(error);
            });
            return saveRequest$.pipe(operators_1.concatMap(() => rxjs_1.of(this)));
        }
        return rxjs_1.of(this);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Mb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBZ0M7QUFDaEMsdURBQWlHO0FBQ2pHLCtCQUFnRDtBQUNoRCw4Q0FBZ0Q7QUFtQmhELE1BQWEsV0FBWSxTQUFRLGlDQUFnQztJQTBFN0QsWUFBWSxJQUFZLEVBQUUsR0FBVztRQUNqQyxLQUFLLEVBQUUsQ0FBQztRQU5KLGNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQU9uQixJQUFJLENBQUMsR0FBRyxHQUFHLFNBQUksRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUNwQixDQUFDO0lBL0VELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBSSxLQUFLLENBQUMsS0FBYTtRQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUN4QixDQUFDO0lBQ0QsSUFBSSxHQUFHO1FBQ0gsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLEdBQUcsQ0FBQyxLQUFhO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDSixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksSUFBSSxDQUFDLEtBQWE7UUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQUksS0FBSztRQUNMLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lB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