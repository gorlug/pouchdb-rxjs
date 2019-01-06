/// <reference types="pouchdb-replication" />
/// <reference types="pouchdb-core" />
import { Observable, Subject } from "rxjs";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { CouchDBConf } from "./CouchDBWrapper";
import Database = PouchDB.Database;
import { Logger, ValueWithLogger } from "./Logger";
export interface DeletedDocument {
    _id: string;
}
export interface DBValueWithLog {
    value: PouchDBWrapper;
    log: Logger;
}
export declare class PouchDBWrapper {
    protected db: Database;
    protected url: string;
    private generator;
    docSaved$: Subject<ValueWithLogger>;
    docDeleted$: Subject<{
        value: DeletedDocument;
        log: Logger;
    }>;
    static loadLocalDB(name: string, generator: PouchDBDocumentGenerator<any>, log: Logger): Observable<{
        value: PouchDBWrapper;
        log: Logger;
    }>;
    static destroyLocalDB(name: string, log: Logger): Observable<ValueWithLogger>;
    static getLogName(): string;
    static loadExternalDB(conf: CouchDBConf, log: Logger): Observable<{
        value: PouchDBWrapper;
        log: Logger;
    }>;
    static syncDBs(firstDB: PouchDBWrapper, secondDB: PouchDBWrapper, log: Logger): PouchDB.Replication.Sync<{}>;
    private static onSyncChange;
    private static emitDocChanges;
    replicateTo(to: PouchDBWrapper, log: Logger): Observable<ValueWithLogger>;
    getPouchDB(): Database;
    getDebugInfo(params?: {}): {
        db: string;
    };
    protected logStart(dsc: string, log: Logger, doc: PouchDBDocument<any>): Logger;
    saveDocument(document: PouchDBDocument<any>, log: Logger): Observable<ValueWithLogger>;
    private handleGetDocument404Error;
    private handleGetDocumentError;
    getDocument(id: string, log: Logger): Observable<ValueWithLogger>;
    getAllDocuments(log: Logger): Observable<ValueWithLogger>;
    private createDocumentListFromResponse;
    deleteDocument(document: PouchDBDocument<any>, log: Logger): Observable<ValueWithLogger>;
    private markDocumentForDeletion;
    getGenerator(): PouchDBDocumentGenerator<any>;
    listenToChanges(log: Logger): PouchDB.Core.Changes<{}>;
}
