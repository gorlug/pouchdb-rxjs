import { PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON } from "./PouchDBDocument";
import { Observable, Subscriber } from "rxjs";
import { PouchDBWrapper } from "./PouchDBWrapper";
export interface LogMessage {
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
export interface LogDocumentJSON extends LogMessageTimestamp, PouchDBDocumentJSON {
}
export declare class LogDocument extends PouchDBDocument<LogDocumentJSON> {
    protected version: string;
    error: string;
    msg: string;
    name: string;
    trace: string;
    params: any;
    duration: number;
    run: string;
    timestamp: string;
    private _msg;
    private _logName;
    private _trace;
    private _params;
    private _duration;
    private _run;
    private _timestamp;
    private _error;
    constructor(name: string, msg: string);
    setVersion(version: string): void;
    private modifyPouchDBDocumentDebugOutput;
    protected addValuesToJSONDocument(json: LogDocumentJSON): void;
    toLogMessage(): LogMessageTimestamp;
    protected getNameOfDoc(): string;
}
export declare class LogDocumentGenerator extends PouchDBDocumentGenerator<LogDocument> {
    protected createDocument(json: LogDocumentJSON): LogDocument;
}
export interface ValueWithLogger {
    value: any;
    log: Logger;
}
export declare class Logger {
    private name;
    private trace;
    private startTime;
    private dsc;
    private params;
    private logDB;
    private silent;
    static getLogger(name: string): Logger;
    static getLoggerTrace(name?: string): Logger;
    static getLoggerTraceWithDB(db: PouchDBWrapper, name?: string): Logger;
    static generateTrace(): string;
    setLogDB(logDB: PouchDBWrapper): void;
    getLogDB(): PouchDBWrapper;
    setSilent(silent: boolean): void;
    getSilent(): any;
    setTrace(trace: string): void;
    constructor(name?: string);
    getName(): string;
    complete(error?: string): Observable<this>;
    private createLogDocument;
    logMessage(name: string, dsc: string, params?: {}): Observable<this>;
    logError(name: string, dsc: string, error: string, params?: {}): Observable<this>;
    logErrorAndSendSubscriberErrorComplete(subscriber: Subscriber<any>, name: string, dsc: string, error: string, params?: {}): void;
    log(message: LogDocument): Observable<this>;
    private logStart;
    private logEnd;
    start(name: string, dsc: string, params?: {}): Logger;
    addTo(observable: Observable<any>): Observable<ValueWithLogger>;
    addToValue(value: any): ValueWithLogger;
    addToSubscriberNextAndComplete(subscriber: Subscriber<any>, value: any): void;
    private logToDB;
}
