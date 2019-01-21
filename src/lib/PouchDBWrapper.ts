// https://pouchdb.com/custom.html
// @ts-ignore
import PouchDB from "pouchdb-core";
// @ts-ignore
import pouchdb_adapter_idb from "pouchdb-adapter-idb";
// @ts-ignore
import pouchdb_adapter_http from "pouchdb-adapter-http";
// @ts-ignore
import pouchdb_authentication from "pouchdb-authentication";
// @ts-ignore
import pouchdb_mapreduce from "pouchdb-mapreduce";
// @ts-ignore
import pouchdb_replication from "pouchdb-replication";
import {Observable, of, Subject, throwError} from "rxjs";
import {catchError, concatMap} from "rxjs/operators";
import {fromPromise} from "rxjs/internal-compatibility";
import {PouchDBDocument, PouchDBDocumentGenerator} from "./PouchDBDocument";
import {CouchDBConf} from "./CouchDBWrapper";

import Database = PouchDB.Database;
import Response = PouchDB.Core.Response;
import AllDocsResponse = PouchDB.Core.AllDocsResponse;
import {Logger, ValueWithLogger} from "./Logger";

PouchDB.plugin(pouchdb_adapter_idb);
PouchDB.plugin(pouchdb_adapter_http);
PouchDB.plugin(pouchdb_mapreduce);
PouchDB.plugin(pouchdb_replication);
PouchDB.plugin(pouchdb_authentication);

export const POUCHDB_WRAPPER_JSON_VERSION = "0.1.5";

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
export class PouchDBWrapper {

    protected db: Database;
    protected url: string;
    private generator: PouchDBDocumentGenerator<any>;

    /**
     * Observable for saved documents.
     */
    public docSaved$: Subject<ValueWithLogger> = new Subject();
    /**
     * Observable for deleted documents.
     */
    public docDeleted$: Subject<{value: DeletedDocument, log: Logger}> = new Subject();

    /**
     * Load a local pouchdb inside the browser.
     * @param name the name of the database
     * @param generator the generator for the documents of the database
     * @param log
     */
    static loadLocalDB(name: string, generator: PouchDBDocumentGenerator<any>, log: Logger):
            Observable<DBValueWithLog> {
        log = log.start(this.getLogName(), "loadLocalDB loading local db", {name: name});
        const wrapper = new PouchDBWrapper();
        wrapper.generator = generator;
        wrapper.db = new PouchDB(name);
        return log.addTo(of(wrapper));
    }

    /**
     * Destroys a local db in the browser.
     * @param name name of the database to be destroyed
     * @param log
     */
    static destroyLocalDB(name: string, log: Logger): Observable<ValueWithLogger> {
        log = log.start(this.getLogName(), "destroyLocalDB destroying local db", {name: name});
        const db = new PouchDB(name);
        return log.addTo(fromPromise(db.destroy())).pipe(
            catchError(error => {
                log.logError(this.getLogName(), "destroyLocalDB error", "error during delete",
                    {error: error});
                return throwError(error);
            }),
            concatMap(result => {
                log.logMessage(this.getLogName(), "destroyLocalDB response", {response: result.value});
                return of(result);
            })
        );
    }

    static getLogName() {
        return "PouchDBWrapper";
    }

    /**
     * Loads an external couchdb database.
     * @param conf configuration object of the couchdb
     * @param log
     */
    static loadExternalDB(conf: CouchDBConf, log: Logger): Observable<{value: PouchDBWrapper, log: Logger}> {
        log = log.start(this.getLogName(), "loadExternalDB loading external db",
            conf.getDebugInfo());
        const wrapper = new PouchDBWrapper();
        wrapper.generator = conf.getGenerator();
        wrapper.url = conf.toUrl();
        const db = new PouchDB(conf.toUrl(), {
            skip_setup: true,
            auth: {
                username: conf.getCredentials().username,
                password: conf.getCredentials().password
            }
        });
        wrapper.db = db;
        return log.addTo(of(wrapper));
    }

    /**
     * Keeps the documents of two databases in sync.
     * @param firstDB
     * @param secondDB
     * @param log
     */
    static syncDBs(firstDB: PouchDBWrapper, secondDB: PouchDBWrapper, log: Logger) {
        log.logMessage(this.getLogName(), "syncDBs initiating sync",
            { firstDB: firstDB.getDebugInfo({}), secondDB: secondDB.getDebugInfo({})});
        return PouchDB.sync(firstDB.getPouchDB(), secondDB.getPouchDB(), { live: true, retry: true })
            .on("change", change => {
                try {
                    this.onSyncChange(firstDB, secondDB, change);
                } catch (e) {
                    log.logError(this.getLogName(), "onSyncChange error", e + "", e);
                }
            })
            .on("error", error => {
                log.logError(this.getLogName(), "syncDBs error", error + "", error);
            });
    }

    private static onSyncChange(firstDB: PouchDBWrapper, secondDB: PouchDBWrapper,
                                info: PouchDB.  Replication.SyncResult<any>) {
        if (!info.change.docs) {
            return;
        }
        let targetDB: PouchDBWrapper;
        if (info.direction === "push") {
            targetDB = secondDB;
        } else if (info.direction === "pull") {
            targetDB = firstDB;
        }
        const log = Logger.getLoggerTrace().start(this.getLogName(), "onSyncChange received a sync change",
            {direction: info.direction, length: info.change.docs.length});
        const generator = targetDB.getGenerator();
        this.emitDocChanges(info.change.docs, targetDB, generator, log);
        log.complete();
    }

    private static emitDocChanges(docs: any[], db: PouchDBWrapper, generator: PouchDBDocumentGenerator<any>,
                                  log: Logger) {
        docs.forEach((doc: any) => {
            if (doc._deleted) {
                db.docDeleted$.next(log.addToValue({_id: doc._id}));
                return;
            }
            const document = generator.fromJSON(doc);
            db.docSaved$.next(log.addToValue(document));
        });
    }

    /**
     * Replicate all documents from the current pouchdb to a target pouchdb.
     * @param to the target pouchdb
     * @param log
     */
    replicateTo(to: PouchDBWrapper, log: Logger) {
        log = log.start(PouchDBWrapper.getLogName(), "replicateTo replicating data to another db",
            {from: this.getDebugInfo(), to: to.getDebugInfo()});
        return log.addTo(fromPromise(PouchDB.replicate(this.db, to.getPouchDB())
            .on("change", info => {
                console.log("change info", info);
                log.logMessage(PouchDBWrapper.getLogName(), "replicateTo replication change",
                    {from: this.getDebugInfo(), to: this.getDebugInfo(), length: info.docs.length});
                if (info.docs) {
                    PouchDBWrapper.emitDocChanges(info.docs, to, to.getGenerator(), log);
                }
                log.complete();
            })));
    }

    /**
     * Returns the underlying pouchdb object.
     */
    getPouchDB(): Database {
        return this.db;
    }

    getDebugInfo(params = {}) {
        const info = {
            db: this.url
        };
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                info[key] = params[key];
            }
        }
        return info;
    }

    protected logStart(dsc: string, log: Logger, doc: PouchDBDocument<any>): Logger {
        return log.start(PouchDBWrapper.getLogName(), dsc, this.getDebugInfo({doc: doc.getDebugInfo()}));
    }

    /**
     * Save a document to the pouchdb.
     * @param document the document to be saved
     * @param log
     */
    saveDocument(document: PouchDBDocument<any>, log: Logger): Observable<ValueWithLogger> {
        log = this.logStart("saveDocument", log, document);
        const json = document.toDocument();
        if (json._rev == null) {
            delete json._rev;
        }
        return log.addTo(fromPromise(this.db.put(json)).pipe(
            catchError(errorResult => {
                log.logMessage(PouchDBWrapper.getLogName(), "saveDocument failed to save document", errorResult);
                log.complete();
                return throwError(errorResult.message);
            }),
            concatMap((result: Response) => {
                if (result.ok) {
                    document.updateRev(result.rev);
                }
                this.docSaved$.next(log.addToValue(document));
                return of(document);
            })
        ));
    }

    private handleGetDocument404Error(result, id: string, log: Logger) {
        const errorMsg = `document with id ${id} was not found`;
        log.logError(PouchDBWrapper.getLogName(), "getDocument error",
            errorMsg, this.getDebugInfo({id: id, result: result}));
        return throwError(errorMsg);
    }

    private handleGetDocumentError(result, id: string, log: Logger) {
        log.complete();
        if (result.status === 404) {
            return this.handleGetDocument404Error(result, id, log);
        }
        const errorMsg = "unknown error occurred";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error",
            errorMsg, this.getDebugInfo({id: id, result: result}));
        return throwError(errorMsg);
    }

    /**
     * Returns the document with the given id or throws an error if it does not exist.
     * @param id the id of the document
     * @param log
     */
    getDocument(id: string, log: Logger): Observable<ValueWithLogger> {
        log = log.start(PouchDBWrapper.getLogName(), "getDocument getting document",
            this.getDebugInfo({id: id}));
        return log.addTo(fromPromise(this.db.get(id)).pipe(
            catchError(result => {
                return this.handleGetDocumentError(result, id, log);
            }),
            concatMap(result => {
                return of(this.generator.fromJSON(result));
            }),
        ));
    }

    /**
     * Return all documents inside the pouchdb.
     * @param log
     */
    getAllDocuments(log: Logger): Observable<ValueWithLogger> {
        log = log.start(PouchDBWrapper.getLogName(), "getAllDocuments " +
            "getting all documents of db", this.getDebugInfo({}));
        return log.addTo(fromPromise(this.db.allDocs({include_docs: true})).pipe(
            concatMap((response: AllDocsResponse<any>) => {
                return this.createDocumentListFromResponse(response, log);
            })
        ));
    }

    private createDocumentListFromResponse(response: AllDocsResponse<any>, log: Logger) {
        const list = [];
        response.rows.forEach(row => {
            list.push(this.generator.fromJSON(row.doc));
        });
        log.logMessage(PouchDBWrapper.getLogName(), "getAllDocuments created document" +
            "list", this.getDebugInfo({length: list.length}));
        return of(list);
    }

    /**
     * Deletes the document from the pouchdb. Returns the document with the updated delete revision.
     * @param document the document to be deleted
     * @param log
     */
    deleteDocument(document: PouchDBDocument<any>, log: Logger):
            Observable<ValueWithLogger> {
        log = log.start(PouchDBWrapper.getLogName(), "deleteDocument deleting a document",
            this.getDebugInfo({doc: document.getDebugInfo()}));
        return log.addTo(fromPromise(this.db.remove(document.toDocument())).pipe(
            concatMap((response: any) => {
                return this.markDocumentForDeletion(document, response, log);
            })
        ));
    }

    private markDocumentForDeletion(document: PouchDBDocument<any>, response: any, log: Logger) {
        this.docDeleted$.next(log.addToValue({_id: document.getId()}));
        document.updateRev(response.rev);
        log.logMessage(PouchDBWrapper.getLogName(), "deleteDocument new doc rev",
            this.getDebugInfo({rev: response.rev}));
        log.complete();
        return of(document);
    }

    getGenerator(): PouchDBDocumentGenerator<any> {
        return this.generator;
    }

    /**
     * Monitors all changes of the pouchdb by emitting saved documents. Useful for monitoring an external couchdb.
     * @param log
     */
    listenToChanges(log: Logger) {
        const silent = log.getSilent();
        log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges listening to changes start", this.getDebugInfo());
        return this.db.changes({
            since: "now",
            live: true,
            include_docs: true
        }).on("change", change => {
            log = Logger.getLoggerTrace();
            log.setSilent(silent);
            log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges on change", this.getDebugInfo({length: change.changes.length}));
            if (change.changes.length === 1) {
                PouchDBWrapper.emitDocChanges([change.doc], this, this.generator, log);
            }
        }).on("error", error => {
            log.logError(PouchDBWrapper.getLogName(), "listenToChanges error", error + "", error);
        });
    }
}
