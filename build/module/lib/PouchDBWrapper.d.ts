/// <reference types="pouchdb-core" />
import { Observable, Subject } from "rxjs";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { CouchDBConf } from "./CouchDBWrapper";
import { Logger, ValueWithLogger } from "./Logger";
import Database = PouchDB.Database;
export declare const POUCHDB_WRAPPER_JSON_VERSION = "0.2.0";
export interface DeletedDocument {
    _id: string;
}
export interface DBValueWithLog {
    value: PouchDBWrapper;
    log: Logger;
}
/**
 * Wrapper around the pouchdb API that returns an observable for every call.
 * Every method also need to be provided with a [[Logger]] instance. The return values
 * also all contain a reference to a Logger instance. The Logger enables tracing method
 * calls initiated by a single action using a trace id.
 */
export declare class PouchDBWrapper {
    protected db: Database;
    protected url: string;
    private generator;
    /**
     * Observable for saved documents.
     */
    docSaved$: Subject<ValueWithLogger>;
    /**
     * Observable for deleted documents.
     */
    docDeleted$: Subject<{
        value: DeletedDocument;
        log: Logger;
    }>;
    /**
     * Load a local pouchdb inside the browser.
     * @param name the name of the database
     * @param generator the generator for the documents of the database
     * @param log
     */
    static loadLocalDB(name: string, generator: PouchDBDocumentGenerator<any>, log: Logger): Observable<DBValueWithLog>;
    /**
     * Destroys a local db in the browser.
     * @param name name of the database to be destroyed
     * @param log
     */
    static destroyLocalDB(name: string, log: Logger): Observable<ValueWithLogger>;
    static getLogName(): string;
    /**
     * Loads an external couchdb database.
     * @param conf configuration object of the couchdb
     * @param log
     */
    static loadExternalDB(conf: CouchDBConf, log: Logger): Observable<{
        value: PouchDBWrapper;
        log: Logger;
    }>;
    /**
     * Keeps the documents of two databases in sync.
     * @param firstDB
     * @param secondDB
     * @param log
     */
    static syncDBs(firstDB: PouchDBWrapper, secondDB: PouchDBWrapper, log: Logger): any;
    private static onSyncChange;
    private static emitDocChanges;
    private static filterOutId;
    /**
     * Replicate all documents from the current pouchdb to a target pouchdb.
     * @param to the target pouchdb
     * @param log
     */
    replicateTo(to: PouchDBWrapper, log: Logger): Observable<ValueWithLogger>;
    /**
     * Returns the underlying pouchdb object.
     */
    getPouchDB(): Database;
    getDebugInfo(params?: {}): {
        db: string;
    };
    protected logStart(dsc: string, log: Logger, doc: PouchDBDocument<any>, id?: string): Logger;
    /**
     * Save a document to the pouchdb.
     * @param document the document to be saved
     * @param log
     */
    saveDocument(document: PouchDBDocument<any>, log: Logger): Observable<ValueWithLogger>;
    private handleGetDocument404Error;
    private handleGetDocumentError;
    /**
     * Returns the document with the given id or throws an error if it does not exist.
     * @param id the id of the document
     * @param log
     */
    getDocument(id: string, log: Logger): Observable<ValueWithLogger>;
    /**
     * Return all documents inside the pouchdb.
     * @param log
     */
    getAllDocuments(log: Logger): Observable<ValueWithLogger>;
    private createDocumentListFromResponse;
    /**
     * Deletes the document from the pouchdb. Returns the document with the updated delete revision.
     * @param document the document to be deleted
     * @param log
     */
    deleteDocument(document: PouchDBDocument<any>, log: Logger): Observable<ValueWithLogger>;
    private markDocumentForDeletion;
    getGenerator(): PouchDBDocumentGenerator<any>;
    /**
     * Monitors all changes of the pouchdb by emitting saved documents. Useful for monitoring an external couchdb.
     * @param log
     */
    listenToChanges(log: Logger): PouchDB.Core.Changes<{}>;
}
