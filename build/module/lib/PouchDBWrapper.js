// https://pouchdb.com/custom.html
import { v4 as uuid } from "uuid";
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
import { of, Subject, throwError } from "rxjs";
import { catchError, concatMap } from "rxjs/operators";
import { fromPromise } from "rxjs/internal-compatibility";
import { Logger } from "./Logger";
PouchDB.plugin(pouchdb_adapter_idb);
PouchDB.plugin(pouchdb_adapter_http);
PouchDB.plugin(pouchdb_mapreduce);
PouchDB.plugin(pouchdb_replication);
PouchDB.plugin(pouchdb_authentication);
export var POUCHDB_WRAPPER_JSON_VERSION = "0.2.0";
/**
 * Wrapper around the pouchdb API that returns an observable for every call.
 * Every method also need to be provided with a [[Logger]] instance. The return values
 * also all contain a reference to a Logger instance. The Logger enables tracing method
 * calls initiated by a single action using a trace id.
 */
var PouchDBWrapper = /** @class */ (function () {
    function PouchDBWrapper() {
        /**
         * Observable for saved documents.
         */
        this.docSaved$ = new Subject();
        /**
         * Observable for deleted documents.
         */
        this.docDeleted$ = new Subject();
    }
    /**
     * Load a local pouchdb inside the browser.
     * @param name the name of the database
     * @param generator the generator for the documents of the database
     * @param log
     */
    PouchDBWrapper.loadLocalDB = function (name, generator, log) {
        log = log.start(this.getLogName(), "loadLocalDB loading local db", { name: name });
        var wrapper = new PouchDBWrapper();
        wrapper.generator = generator;
        wrapper.db = new PouchDB(name);
        return log.addTo(of(wrapper));
    };
    /**
     * Destroys a local db in the browser.
     * @param name name of the database to be destroyed
     * @param log
     */
    PouchDBWrapper.destroyLocalDB = function (name, log) {
        var _this = this;
        log = log.start(this.getLogName(), "destroyLocalDB destroying local db", { name: name });
        var db = new PouchDB(name);
        return log.addTo(fromPromise(db.destroy())).pipe(catchError(function (error) {
            log.logError(_this.getLogName(), "destroyLocalDB error", "error during delete", { error: error });
            return throwError(error);
        }), concatMap(function (result) {
            log.logMessage(_this.getLogName(), "destroyLocalDB response", { response: result.value });
            return of(result);
        }));
    };
    PouchDBWrapper.getLogName = function () {
        return "PouchDBWrapper";
    };
    /**
     * Loads an external couchdb database.
     * @param conf configuration object of the couchdb
     * @param log
     */
    PouchDBWrapper.loadExternalDB = function (conf, log) {
        log = log.start(this.getLogName(), "loadExternalDB loading external db", conf.getDebugInfo());
        var wrapper = new PouchDBWrapper();
        wrapper.generator = conf.getGenerator();
        wrapper.url = conf.toUrl();
        var db = new PouchDB(conf.toUrl(), {
            skip_setup: true,
            auth: {
                username: conf.getCredentials().username,
                password: conf.getCredentials().password
            }
        });
        wrapper.db = db;
        return log.addTo(of(wrapper));
    };
    /**
     * Keeps the documents of two databases in sync.
     * @param firstDB
     * @param secondDB
     * @param log
     */
    PouchDBWrapper.syncDBs = function (firstDB, secondDB, log) {
        var _this = this;
        log.logMessage(this.getLogName(), "syncDBs initiating sync", { firstDB: firstDB.getDebugInfo({}), secondDB: secondDB.getDebugInfo({}) });
        return PouchDB.sync(firstDB.getPouchDB(), secondDB.getPouchDB(), { live: true, retry: true })
            .on("change", function (change) {
            try {
                _this.onSyncChange(firstDB, secondDB, change);
            }
            catch (e) {
                log.logError(_this.getLogName(), "onSyncChange error", e + "", e);
            }
        })
            .on("error", function (error) {
            log.logError(_this.getLogName(), "syncDBs error", error + "", error);
        });
    };
    PouchDBWrapper.onSyncChange = function (firstDB, secondDB, info) {
        if (!info.change.docs) {
            return;
        }
        var targetDB;
        if (info.direction === "push") {
            targetDB = secondDB;
        }
        else if (info.direction === "pull") {
            targetDB = firstDB;
        }
        var log = Logger.getLoggerTrace().start(this.getLogName(), "onSyncChange received a sync change", { direction: info.direction, length: info.change.docs.length });
        var generator = targetDB.getGenerator();
        this.emitDocChanges(info.change.docs, targetDB, generator, log);
        log.complete();
    };
    PouchDBWrapper.emitDocChanges = function (docs, db, generator, log) {
        var _this = this;
        docs.forEach(function (doc) {
            if (_this.filterOutId(doc._id)) {
                return;
            }
            if (doc._deleted) {
                db.docDeleted$.next(log.addToValue({ _id: doc._id }));
                return;
            }
            var document = generator.fromJSON(doc);
            db.docSaved$.next(log.addToValue(document));
        });
    };
    PouchDBWrapper.filterOutId = function (id) {
        return id.toString().startsWith("_");
    };
    /**
     * Replicate all documents from the current pouchdb to a target pouchdb.
     * @param to the target pouchdb
     * @param log
     */
    PouchDBWrapper.prototype.replicateTo = function (to, log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "replicateTo replicating data to another db", { from: this.getDebugInfo(), to: to.getDebugInfo() });
        return log.addTo(fromPromise(PouchDB.replicate(this.db, to.getPouchDB())
            .on("change", function (info) {
            console.log("change info", info);
            log.logMessage(PouchDBWrapper.getLogName(), "replicateTo replication change", { from: _this.getDebugInfo(), to: _this.getDebugInfo(), length: info.docs.length });
            if (info.docs) {
                PouchDBWrapper.emitDocChanges(info.docs, to, to.getGenerator(), log);
            }
            log.complete();
        })));
    };
    /**
     * Returns the underlying pouchdb object.
     */
    PouchDBWrapper.prototype.getPouchDB = function () {
        return this.db;
    };
    PouchDBWrapper.prototype.getDebugInfo = function (params) {
        if (params === void 0) { params = {}; }
        var info = {
            db: this.url
        };
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                info[key] = params[key];
            }
        }
        return info;
    };
    PouchDBWrapper.prototype.logStart = function (dsc, log, doc, id) {
        return log.start(PouchDBWrapper.getLogName(), dsc, this.getDebugInfo({ doc: doc.getDebugInfo(), saveTrace: id }));
    };
    /**
     * Save a document to the pouchdb.
     * @param document the document to be saved
     * @param log
     */
    PouchDBWrapper.prototype.saveDocument = function (document, log) {
        var _this = this;
        var saveId = uuid();
        log = this.logStart("saveDocument", log, document, saveId);
        var json = document.toDocument();
        if (json._rev == null) {
            delete json._rev;
        }
        return log.addTo(fromPromise(this.db.put(json)).pipe(catchError(function (errorResult) {
            log.logError(PouchDBWrapper.getLogName(), "saveDocument failed to save document", "" + errorResult.message, { error: errorResult, doc: document.getDebugInfo(), id: saveId });
            log.complete();
            return throwError(errorResult.message);
        }), concatMap(function (result) {
            log.logMessage(PouchDBWrapper.getLogName(), "saveDocument response", { response: result, saveTrace: saveId });
            if (result.ok) {
                document.updateRev(result.rev);
            }
            _this.docSaved$.next(log.addToValue(document));
            return of(document);
        })));
    };
    PouchDBWrapper.prototype.handleGetDocument404Error = function (result, id, log) {
        var errorMsg = "document with id " + id + " was not found";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return throwError(errorMsg);
    };
    PouchDBWrapper.prototype.handleGetDocumentError = function (result, id, log) {
        log.complete();
        if (result.status === 404) {
            return this.handleGetDocument404Error(result, id, log);
        }
        var errorMsg = "unknown error occurred";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return throwError(errorMsg);
    };
    /**
     * Returns the document with the given id or throws an error if it does not exist.
     * @param id the id of the document
     * @param log
     */
    PouchDBWrapper.prototype.getDocument = function (id, log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "getDocument getting document", this.getDebugInfo({ id: id }));
        return log.addTo(fromPromise(this.db.get(id)).pipe(catchError(function (result) {
            return _this.handleGetDocumentError(result, id, log);
        }), concatMap(function (result) {
            if (_this.generator === undefined) {
                return throwError("the PouchDBDocument generator is not defined");
            }
            return of(_this.generator.fromJSON(result));
        })));
    };
    /**
     * Return all documents inside the pouchdb.
     * @param log
     */
    PouchDBWrapper.prototype.getAllDocuments = function (log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "getAllDocuments " +
            "getting all documents of db", this.getDebugInfo({}));
        return log.addTo(fromPromise(this.db.allDocs({ include_docs: true })).pipe(concatMap(function (response) {
            return _this.createDocumentListFromResponse(response, log);
        })));
    };
    PouchDBWrapper.prototype.createDocumentListFromResponse = function (response, log) {
        var _this = this;
        var list = [];
        response.rows.forEach(function (row) {
            if (PouchDBWrapper.filterOutId(row.doc._id)) {
                return;
            }
            list.push(_this.generator.fromJSON(row.doc));
        });
        log.logMessage(PouchDBWrapper.getLogName(), "getAllDocuments created document" +
            "list", this.getDebugInfo({ length: list.length }));
        return of(list);
    };
    /**
     * Deletes the document from the pouchdb. Returns the document with the updated delete revision.
     * @param document the document to be deleted
     * @param log
     */
    PouchDBWrapper.prototype.deleteDocument = function (document, log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "deleteDocument deleting a document", this.getDebugInfo({ doc: document.getDebugInfo() }));
        return log.addTo(fromPromise(this.db.remove(document.toDocument())).pipe(concatMap(function (response) {
            return _this.markDocumentForDeletion(document, response, log);
        })));
    };
    PouchDBWrapper.prototype.markDocumentForDeletion = function (document, response, log) {
        this.docDeleted$.next(log.addToValue({ _id: document.getId() }));
        document.updateRev(response.rev);
        log.logMessage(PouchDBWrapper.getLogName(), "deleteDocument new doc rev", this.getDebugInfo({ rev: response.rev }));
        log.complete();
        return of(document);
    };
    PouchDBWrapper.prototype.getGenerator = function () {
        return this.generator;
    };
    /**
     * Monitors all changes of the pouchdb by emitting saved documents. Useful for monitoring an external couchdb.
     * @param log
     */
    PouchDBWrapper.prototype.listenToChanges = function (log) {
        var _this = this;
        var silent = log.getSilent();
        log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges listening to changes start", this.getDebugInfo());
        return this.db.changes({
            since: "now",
            live: true,
            include_docs: true
        }).on("change", function (change) {
            log = Logger.getLoggerTrace();
            log.setSilent(silent);
            log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges on change", _this.getDebugInfo({ length: change.changes.length }));
            if (change.changes.length === 1) {
                PouchDBWrapper.emitDocChanges([change.doc], _this, _this.generator, log);
            }
        }).on("error", function (error) {
            log.logError(PouchDBWrapper.getLogName(), "listenToChanges error", error + "", error);
        });
    };
    return PouchDBWrapper;
}());
export { PouchDBWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1BvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQyxPQUFPLEVBQUMsRUFBRSxJQUFJLElBQUksRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUNoQyxhQUFhO0FBQ2IsT0FBTyxPQUFPLE1BQU0sY0FBYyxDQUFDO0FBQ25DLGFBQWE7QUFDYixPQUFPLG1CQUFtQixNQUFNLHFCQUFxQixDQUFDO0FBQ3RELGFBQWE7QUFDYixPQUFPLG9CQUFvQixNQUFNLHNCQUFzQixDQUFDO0FBQ3hELGFBQWE7QUFDYixPQUFPLHNCQUFzQixNQUFNLHdCQUF3QixDQUFDO0FBQzVELGFBQWE7QUFDYixPQUFPLGlCQUFpQixNQUFNLG1CQUFtQixDQUFDO0FBQ2xELGFBQWE7QUFDYixPQUFPLG1CQUFtQixNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBQyxNQUFNLE1BQU0sQ0FBQztBQUN6RCxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3JELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSw2QkFBNkIsQ0FBQztBQUd4RCxPQUFPLEVBQUMsTUFBTSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUtqRCxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDcEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3JDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNsQyxPQUFPLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDcEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBRXZDLE1BQU0sQ0FBQyxJQUFNLDRCQUE0QixHQUFHLE9BQU8sQ0FBQztBQVdwRDs7Ozs7R0FLRztBQUNIO0lBQUE7UUFNSTs7V0FFRztRQUNJLGNBQVMsR0FBNkIsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMzRDs7V0FFRztRQUNJLGdCQUFXLEdBQW1ELElBQUksT0FBTyxFQUFFLENBQUM7SUF5VHZGLENBQUM7SUF2VEc7Ozs7O09BS0c7SUFDSSwwQkFBVyxHQUFsQixVQUFtQixJQUFZLEVBQUUsU0FBd0MsRUFBRSxHQUFXO1FBRWxGLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSw4QkFBOEIsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ2pGLElBQU0sT0FBTyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDckMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDOUIsT0FBTyxDQUFDLEVBQUUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSw2QkFBYyxHQUFyQixVQUFzQixJQUFZLEVBQUUsR0FBVztRQUEvQyxpQkFjQztRQWJHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxvQ0FBb0MsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZGLElBQU0sRUFBRSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzVDLFVBQVUsQ0FBQyxVQUFBLEtBQUs7WUFDWixHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFDekUsRUFBQyxLQUFLLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztZQUNwQixPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsRUFDRixTQUFTLENBQUMsVUFBQSxNQUFNO1lBQ1osR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUseUJBQXlCLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDdkYsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNOLENBQUM7SUFFTSx5QkFBVSxHQUFqQjtRQUNJLE9BQU8sZ0JBQWdCLENBQUM7SUFDNUIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSw2QkFBYyxHQUFyQixVQUFzQixJQUFpQixFQUFFLEdBQVc7UUFDaEQsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLG9DQUFvQyxFQUNuRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUN6QixJQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLElBQU0sRUFBRSxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNqQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUU7Z0JBQ0YsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRO2dCQUN4QyxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVE7YUFDM0M7U0FDSixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNoQixPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksc0JBQU8sR0FBZCxVQUFlLE9BQXVCLEVBQUUsUUFBd0IsRUFBRSxHQUFXO1FBQTdFLGlCQWNDO1FBYkcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUseUJBQXlCLEVBQ3ZELEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDeEYsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFBLE1BQU07WUFDaEIsSUFBSTtnQkFDQSxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDaEQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDUixHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3BFO1FBQ0wsQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7WUFDZCxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxlQUFlLEVBQUUsS0FBSyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxDQUFDLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFYywyQkFBWSxHQUEzQixVQUE0QixPQUF1QixFQUFFLFFBQXdCLEVBQ2pELElBQTJDO1FBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRTtZQUNuQixPQUFPO1NBQ1Y7UUFDRCxJQUFJLFFBQXdCLENBQUM7UUFDN0IsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRTtZQUMzQixRQUFRLEdBQUcsUUFBUSxDQUFDO1NBQ3ZCO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLE1BQU0sRUFBRTtZQUNsQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1NBQ3RCO1FBQ0QsSUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUscUNBQXFDLEVBQzlGLEVBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFDbEUsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVjLDZCQUFjLEdBQTdCLFVBQThCLElBQVcsRUFBRSxFQUFrQixFQUFFLFNBQXdDLEVBQ3pFLEdBQVc7UUFEekMsaUJBYUM7UUFYRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQUMsR0FBUTtZQUNsQixJQUFJLEtBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMzQixPQUFPO2FBQ1Y7WUFDRCxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxPQUFPO2FBQ1Y7WUFDRCxJQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFYywwQkFBVyxHQUExQixVQUEyQixFQUEwQztRQUNqRSxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxvQ0FBVyxHQUFYLFVBQVksRUFBa0IsRUFBRSxHQUFXO1FBQTNDLGlCQWFDO1FBWkcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLDRDQUE0QyxFQUNyRixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxZQUFZLEVBQUUsRUFBQyxDQUFDLENBQUM7UUFDeEQsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDO2FBQ25FLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBQSxJQUFJO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsZ0NBQWdDLEVBQ3hFLEVBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSSxDQUFDLFlBQVksRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7WUFDcEYsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNYLGNBQWMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQ3hFO1lBQ0QsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNILG1DQUFVLEdBQVY7UUFDSSxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELHFDQUFZLEdBQVosVUFBYSxNQUFXO1FBQVgsdUJBQUEsRUFBQSxXQUFXO1FBQ3BCLElBQU0sSUFBSSxHQUFHO1lBQ1QsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHO1NBQ2YsQ0FBQztRQUNGLEtBQUssSUFBTSxHQUFHLElBQUksTUFBTSxFQUFFO1lBQ3RCLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMzQjtTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVTLGlDQUFRLEdBQWxCLFVBQW1CLEdBQVcsRUFBRSxHQUFXLEVBQUUsR0FBeUIsRUFBRSxFQUFXO1FBQy9FLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEgsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxxQ0FBWSxHQUFaLFVBQWEsUUFBOEIsRUFBRSxHQUFXO1FBQXhELGlCQXVCQztRQXRCRyxJQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUN0QixHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMzRCxJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbkMsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7U0FDcEI7UUFDRCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNoRCxVQUFVLENBQUMsVUFBQSxXQUFXO1lBQ2xCLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLHNDQUFzQyxFQUFFLEVBQUUsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUN0RyxFQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztZQUNwRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLEVBQ0YsU0FBUyxDQUFDLFVBQUMsTUFBZ0I7WUFDdkIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1lBQzVHLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRTtnQkFDWCxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNsQztZQUNELEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM5QyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FDTCxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sa0RBQXlCLEdBQWpDLFVBQWtDLE1BQU0sRUFBRSxFQUFVLEVBQUUsR0FBVztRQUM3RCxJQUFNLFFBQVEsR0FBRyxzQkFBb0IsRUFBRSxtQkFBZ0IsQ0FBQztRQUN4RCxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxtQkFBbUIsRUFDekQsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsT0FBTyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVPLCtDQUFzQixHQUE5QixVQUErQixNQUFNLEVBQUUsRUFBVSxFQUFFLEdBQVc7UUFDMUQsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtZQUN2QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsSUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUM7UUFDMUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEVBQUUsbUJBQW1CLEVBQ3pELFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsb0NBQVcsR0FBWCxVQUFZLEVBQVUsRUFBRSxHQUFXO1FBQW5DLGlCQWNDO1FBYkcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLDhCQUE4QixFQUN2RSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUMsRUFBRSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUM5QyxVQUFVLENBQUMsVUFBQSxNQUFNO1lBQ2IsT0FBTyxLQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsRUFDRixTQUFTLENBQUMsVUFBQSxNQUFNO1lBQ1osSUFBSSxLQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsT0FBTyxVQUFVLENBQUMsOENBQThDLENBQUMsQ0FBQzthQUNyRTtZQUNELE9BQU8sRUFBRSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQyxDQUFDLENBQ0wsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7T0FHRztJQUNILHdDQUFlLEdBQWYsVUFBZ0IsR0FBVztRQUEzQixpQkFRQztRQVBHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxrQkFBa0I7WUFDM0QsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBQyxZQUFZLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDcEUsU0FBUyxDQUFDLFVBQUMsUUFBOEI7WUFDckMsT0FBTyxLQUFJLENBQUMsOEJBQThCLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUNMLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyx1REFBOEIsR0FBdEMsVUFBdUMsUUFBOEIsRUFBRSxHQUFXO1FBQWxGLGlCQVdDO1FBVkcsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztZQUNyQixJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDekMsT0FBTzthQUNWO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLGtDQUFrQztZQUMxRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsdUNBQWMsR0FBZCxVQUFlLFFBQThCLEVBQUUsR0FBVztRQUExRCxpQkFTQztRQVBHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxvQ0FBb0MsRUFDN0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDcEUsU0FBUyxDQUFDLFVBQUMsUUFBYTtZQUNwQixPQUFPLEtBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUNMLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxnREFBdUIsR0FBL0IsVUFBZ0MsUUFBOEIsRUFBRSxRQUFhLEVBQUUsR0FBVztRQUN0RixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxHQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSw0QkFBNEIsRUFDcEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxxQ0FBWSxHQUFaO1FBQ0ksT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQzFCLENBQUM7SUFFRDs7O09BR0c7SUFDSCx3Q0FBZSxHQUFmLFVBQWdCLEdBQVc7UUFBM0IsaUJBaUJDO1FBaEJHLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMvQixHQUFHLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSw0Q0FBNEMsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUMvRyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQ25CLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixZQUFZLEVBQUUsSUFBSTtTQUNyQixDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFBLE1BQU07WUFDbEIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM5QixHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLEdBQUcsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxFQUFFLDJCQUEyQixFQUFFLEtBQUksQ0FBQyxZQUFZLENBQUMsRUFBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0gsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzdCLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSSxFQUFFLEtBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDMUU7UUFDTCxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQUEsS0FBSztZQUNoQixHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNMLHFCQUFDO0FBQUQsQ0FBQyxBQXRVRCxJQXNVQyJ9