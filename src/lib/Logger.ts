import {v4 as uuid} from "uuid";
import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "./PouchDBDocument";
import {Observable, of, Subscriber} from "rxjs";
import {concatMap, share} from "rxjs/operators";
import {POUCHDB_WRAPPER_JSON_VERSION, PouchDBWrapper} from "./PouchDBWrapper";

export interface LogMessage  {
    msg: string;
    version: string;
    name?: string;
    trace?: string;
    params?: any;
    duration?: number;
    run?: string;
    error?: string;
}

export interface LogMessageTimestamp extends LogMessage {
    timestamp: string;
}

export interface LogDocumentJSON extends LogMessageTimestamp, PouchDBDocumentJSON {}

export class LogDocument extends PouchDBDocument<LogDocumentJSON> {

    protected version = POUCHDB_WRAPPER_JSON_VERSION;

    get error(): string {
        return this._error;
    }

    set error(value: string) {
        this._error = value;
    }
    get msg(): string {
        return this._msg;
    }

    set msg(value: string) {
        this._msg = value;
    }

    get name(): string {
        return this._logName;
    }

    set name(value: string) {
        this._logName = value;
    }

    get trace(): string {
        return this._trace;
    }

    set trace(value: string) {
        this._trace = value;
    }

    get params(): any {
        return this._params;
    }

    set params(value: any) {
        this.modifyPouchDBDocumentDebugOutput(value);
        this._params = value;
    }

    get duration(): number {
        return this._duration;
    }

    set duration(value: number) {
        this._duration = value;
    }

    get run(): string {
        return this._run;
    }

    set run(value: string) {
        this._run = value;
    }

    get timestamp(): string {
        return this._timestamp;
    }

    set timestamp(value: string) {
        this._timestamp = value;
    }

    private _msg: string;
    private _logName: string;
    private _trace: string;
    private _params: any;
    private _duration = -1;
    private _run: string;
    private _timestamp: string;
    private _error: string;

    constructor(name: string, msg: string) {
        super();
        this._id = uuid();
        this._timestamp = new Date().toISOString();
        this._logName = name;
        this._msg = msg;
    }

    public setVersion(version: string) {
        this.version = version;
    }

    private modifyPouchDBDocumentDebugOutput(params: any) {
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                const param = params[key];
                if (param instanceof PouchDBDocument) {
                    const doc = param as PouchDBDocument<any>;
                    params[key] = doc.getDebugInfo();
                }
            }
        }
    }


    protected addValuesToJSONDocument(json: LogDocumentJSON) {
        json.msg = this._msg;
        json.name = this._logName;
        json.trace = this._trace;
        json.params = this._params;
        json.duration = this._duration;
        json.run = this._run;
        json.timestamp = this._timestamp;
        json.error = this._error;
        json.version = this.version;
    }

    toLogMessage(): LogMessageTimestamp {
        const json: any = {};
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

    protected getNameOfDoc(): string {
        return "LogDocument";
    }

}

export class LogDocumentGenerator extends PouchDBDocumentGenerator<LogDocument> {

    protected createDocument(json: LogDocumentJSON): LogDocument {
        const doc = new LogDocument(json.name, json.msg);
        doc.trace = json.trace;
        doc.params = json.params;
        doc.duration = json.duration;
        doc.run = json.run;
        doc.error = json.error;
        doc.timestamp = json.timestamp;
        doc.setVersion(json.version);
        return doc;
    }

}

export interface ValueWithLogger {
    value: any;
    log: Logger;
}

/**
 * Logger used for tracing function calls. This can be achieved by using a trace id.
 */
export class Logger {

    private name: string;
    private trace: string;
    private startTime = -1;
    private dsc: string;
    private params: any;
    private logDB: PouchDBWrapper;
    private silent = false;

    static getLogger(name: string): Logger {
        return new Logger(name);
    }

    /**
     * Creates a logger with a trace id.
     * @param name
     */
    static getLoggerTrace(name = ""): Logger {
        const logger = new Logger(name);
        logger.setTrace(Logger.generateTrace());
        return logger;
    }

    /**
     * Gets a logger with a trace id that will write logs to the given pouchdb.
     * @param db
     * @param name
     */
    static getLoggerTraceWithDB(db: PouchDBWrapper, name = "") {
        const logger = this.getLoggerTrace(name);
        logger.setLogDB(db);
        return logger;
    }

    static generateTrace(): string {
        return uuid();
    }

    setLogDB(logDB: PouchDBWrapper) {
        this.logDB = logDB;
    }

    getLogDB(): PouchDBWrapper {
        return this.logDB;
    }

    setSilent(silent: boolean) {
        this.silent = silent;
    }

    getSilent(): any {
        return this.silent;
    }

    setTrace(trace: string) {
        this.trace = trace;
    }

    getTrace(): string {
        return this.trace;
    }

    constructor(name = "") {
        this.name = name;
    }

    getName() {
        return this.name;
    }

    /**
     * Completes a previous [[start]] call by writing out the duration since the start
     * date.
     * @param error
     */
    complete(error?: string) {
        if (this.startTime !== -1) {
            const observable = this.logEnd(this.name, this.dsc, this.params,
                this.startTime, error);
            this.startTime = -1;
            return observable;
        }
        return of(this);
    }

    private createLogDocument(name: string, dsc: string, params) {
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.trace = this.trace;
        return message;
    }

    logMessage(name: string, dsc: string, params = {}) {
        return this.log(this.createLogDocument(name, dsc, params));
    }

    logError(name: string, dsc: string, error: string, params = {}) {
        const message = this.createLogDocument(name, dsc, params);
        message.error = error;
        return this.log(message).pipe(
            concatMap(() => this.complete(error))
        );
    }

    logErrorAndSendSubscriberErrorComplete(subscriber: Subscriber<any>, name: string, dsc: string,
                                           error: string, params = {}) {
        this.logError(name, dsc, error, params);
        subscriber.error(error);
        subscriber.complete();
    }

    log(message: LogDocument) {
        if (this.silent) {
            return of(this);
        }
        if (message.name === undefined) {
            message.name = this.name;
        }
        if (this.trace !== undefined) {
            message.trace = this.trace;
        }
        const logMessage = message.toLogMessage();
        console.log(logMessage);
        return this.logToDB(message);
    }

    private logStart(name: string, dsc: string, params, trace: string, newTrace: string): number {
        const start = new Date().getTime();
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.run = "start";
        message.msg = dsc + " start";
        this.log(message);
        return start;
    }

    private logEnd(name: string, dsc: string, params, start: number, error?: string) {
        const duration = new Date().getTime() - start;
        const message = new LogDocument(name, dsc);
        message.params = params;
        message.duration = duration;
        message.run = "end";
        message.msg = dsc + " end";
        if (error !== undefined) {
            message.error = error;
        }
        return this.log(message);
    }

    /**
     * Log a message and also save the start date of the call.
     * @param name
     * @param dsc
     * @param params
     */
    start(name: string, dsc: string, params = {}): Logger {
        this.complete();
        const log = new Logger(name);
        log.dsc = dsc;
        log.params = params;
        log.trace = this.trace;
        log.startTime = this.logStart(name, dsc, params, this.trace, log.trace);
        log.silent = this.silent;
        log.logDB = this.logDB;
        return log;
    }

    addTo(observable: Observable<any>): Observable<ValueWithLogger> {
        return observable.pipe(
            concatMap(result => of({ value: result, log: this})));
    }

    addToValue(value: any): ValueWithLogger {
        return {
            value: value,
            log: this
        };
    }

    addToSubscriberNextAndComplete(subscriber: Subscriber<any>, value: any) {
        this.complete();
        subscriber.next({value: value, log: this});
        subscriber.complete();
    }

    private logToDB(logMessage: LogDocument) {
        if (this.logDB !== undefined) {
            const log = new Logger("");
            log.setSilent(true);
            const saveRequest$ = this.logDB.saveDocument(logMessage, log).pipe(share());
            saveRequest$.subscribe(() => { } , error => {
                console.log(error);
            });
            return saveRequest$.pipe(
                concatMap(() => of(this))
            );
        }
        return of(this);
    }
}
