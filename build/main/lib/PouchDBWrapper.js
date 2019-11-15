"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// https://pouchdb.com/custom.html
var uuid_1 = require("uuid");
// @ts-ignore
var pouchdb_core_1 = __importDefault(require("pouchdb-core"));
// @ts-ignore
var pouchdb_adapter_idb_1 = __importDefault(require("pouchdb-adapter-idb"));
// @ts-ignore
var pouchdb_adapter_http_1 = __importDefault(require("pouchdb-adapter-http"));
// @ts-ignore
var pouchdb_authentication_1 = __importDefault(require("pouchdb-authentication"));
// @ts-ignore
var pouchdb_mapreduce_1 = __importDefault(require("pouchdb-mapreduce"));
// @ts-ignore
var pouchdb_replication_1 = __importDefault(require("pouchdb-replication"));
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var internal_compatibility_1 = require("rxjs/internal-compatibility");
var Logger_1 = require("./Logger");
pouchdb_core_1.default.plugin(pouchdb_adapter_idb_1.default);
pouchdb_core_1.default.plugin(pouchdb_adapter_http_1.default);
pouchdb_core_1.default.plugin(pouchdb_mapreduce_1.default);
pouchdb_core_1.default.plugin(pouchdb_replication_1.default);
pouchdb_core_1.default.plugin(pouchdb_authentication_1.default);
exports.POUCHDB_WRAPPER_JSON_VERSION = "0.2.0";
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
        this.docSaved$ = new rxjs_1.Subject();
        /**
         * Observable for deleted documents.
         */
        this.docDeleted$ = new rxjs_1.Subject();
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
        wrapper.db = new pouchdb_core_1.default(name);
        return log.addTo(rxjs_1.of(wrapper));
    };
    /**
     * Destroys a local db in the browser.
     * @param name name of the database to be destroyed
     * @param log
     */
    PouchDBWrapper.destroyLocalDB = function (name, log) {
        var _this = this;
        log = log.start(this.getLogName(), "destroyLocalDB destroying local db", { name: name });
        var db = new pouchdb_core_1.default(name);
        return log.addTo(internal_compatibility_1.fromPromise(db.destroy())).pipe(operators_1.catchError(function (error) {
            log.logError(_this.getLogName(), "destroyLocalDB error", "error during delete", { error: error });
            return rxjs_1.throwError(error);
        }), operators_1.concatMap(function (result) {
            log.logMessage(_this.getLogName(), "destroyLocalDB response", { response: result.value });
            return rxjs_1.of(result);
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
        var db = new pouchdb_core_1.default(conf.toUrl(), {
            skip_setup: true,
            auth: {
                username: conf.getCredentials().username,
                password: conf.getCredentials().password
            }
        });
        wrapper.db = db;
        return log.addTo(rxjs_1.of(wrapper));
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
        return pouchdb_core_1.default.sync(firstDB.getPouchDB(), secondDB.getPouchDB(), { live: true, retry: true })
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
        var log = Logger_1.Logger.getLoggerTrace().start(this.getLogName(), "onSyncChange received a sync change", { direction: info.direction, length: info.change.docs.length });
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
        return log.addTo(internal_compatibility_1.fromPromise(pouchdb_core_1.default.replicate(this.db, to.getPouchDB())
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
        var saveId = uuid_1.v4();
        log = this.logStart("saveDocument", log, document, saveId);
        var json = document.toDocument();
        if (json._rev == null) {
            delete json._rev;
        }
        return log.addTo(internal_compatibility_1.fromPromise(this.db.put(json)).pipe(operators_1.catchError(function (errorResult) {
            log.logError(PouchDBWrapper.getLogName(), "saveDocument failed to save document", "" + errorResult.message, { error: errorResult, doc: document.getDebugInfo(), id: saveId });
            log.complete();
            return rxjs_1.throwError(errorResult.message);
        }), operators_1.concatMap(function (result) {
            log.logMessage(PouchDBWrapper.getLogName(), "saveDocument response", { response: result, saveTrace: saveId });
            if (result.ok) {
                document.updateRev(result.rev);
            }
            _this.docSaved$.next(log.addToValue(document));
            return rxjs_1.of(document);
        })));
    };
    PouchDBWrapper.prototype.handleGetDocument404Error = function (result, id, log) {
        var errorMsg = "document with id " + id + " was not found";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return rxjs_1.throwError(errorMsg);
    };
    PouchDBWrapper.prototype.handleGetDocumentError = function (result, id, log) {
        log.complete();
        if (result.status === 404) {
            return this.handleGetDocument404Error(result, id, log);
        }
        var errorMsg = "unknown error occurred";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return rxjs_1.throwError(errorMsg);
    };
    /**
     * Returns the document with the given id or throws an error if it does not exist.
     * @param id the id of the document
     * @param log
     */
    PouchDBWrapper.prototype.getDocument = function (id, log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "getDocument getting document", this.getDebugInfo({ id: id }));
        return log.addTo(internal_compatibility_1.fromPromise(this.db.get(id)).pipe(operators_1.catchError(function (result) {
            return _this.handleGetDocumentError(result, id, log);
        }), operators_1.concatMap(function (result) {
            if (_this.generator === undefined) {
                return rxjs_1.throwError("the PouchDBDocument generator is not defined");
            }
            return rxjs_1.of(_this.generator.fromJSON(result));
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
        return log.addTo(internal_compatibility_1.fromPromise(this.db.allDocs({ include_docs: true })).pipe(operators_1.concatMap(function (response) {
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
        return rxjs_1.of(list);
    };
    /**
     * Deletes the document from the pouchdb. Returns the document with the updated delete revision.
     * @param document the document to be deleted
     * @param log
     */
    PouchDBWrapper.prototype.deleteDocument = function (document, log) {
        var _this = this;
        log = log.start(PouchDBWrapper.getLogName(), "deleteDocument deleting a document", this.getDebugInfo({ doc: document.getDebugInfo() }));
        return log.addTo(internal_compatibility_1.fromPromise(this.db.remove(document.toDocument())).pipe(operators_1.concatMap(function (response) {
            return _this.markDocumentForDeletion(document, response, log);
        })));
    };
    PouchDBWrapper.prototype.markDocumentForDeletion = function (document, response, log) {
        this.docDeleted$.next(log.addToValue({ _id: document.getId() }));
        document.updateRev(response.rev);
        log.logMessage(PouchDBWrapper.getLogName(), "deleteDocument new doc rev", this.getDebugInfo({ rev: response.rev }));
        log.complete();
        return rxjs_1.of(document);
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
            log = Logger_1.Logger.getLoggerTrace();
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
exports.PouchDBWrapper = PouchDBWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1BvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDZCQUFnQztBQUNoQyxhQUFhO0FBQ2IsOERBQW1DO0FBQ25DLGFBQWE7QUFDYiw0RUFBc0Q7QUFDdEQsYUFBYTtBQUNiLDhFQUF3RDtBQUN4RCxhQUFhO0FBQ2Isa0ZBQTREO0FBQzVELGFBQWE7QUFDYix3RUFBa0Q7QUFDbEQsYUFBYTtBQUNiLDRFQUFzRDtBQUN0RCw2QkFBeUQ7QUFDekQsNENBQXFEO0FBQ3JELHNFQUF3RDtBQUd4RCxtQ0FBaUQ7QUFLakQsc0JBQU8sQ0FBQyxNQUFNLENBQUMsNkJBQW1CLENBQUMsQ0FBQztBQUNwQyxzQkFBTyxDQUFDLE1BQU0sQ0FBQyw4QkFBb0IsQ0FBQyxDQUFDO0FBQ3JDLHNCQUFPLENBQUMsTUFBTSxDQUFDLDJCQUFpQixDQUFDLENBQUM7QUFDbEMsc0JBQU8sQ0FBQyxNQUFNLENBQUMsNkJBQW1CLENBQUMsQ0FBQztBQUNwQyxzQkFBTyxDQUFDLE1BQU0sQ0FBQyxnQ0FBc0IsQ0FBQyxDQUFDO0FBRTFCLFFBQUEsNEJBQTRCLEdBQUcsT0FBTyxDQUFDO0FBV3BEOzs7OztHQUtHO0FBQ0g7SUFBQTtRQU1JOztXQUVHO1FBQ0ksY0FBUyxHQUE2QixJQUFJLGNBQU8sRUFBRSxDQUFDO1FBQzNEOztXQUVHO1FBQ0ksZ0JBQVcsR0FBbUQsSUFBSSxjQUFPLEVBQUUsQ0FBQztJQXlUdkYsQ0FBQztJQXZURzs7Ozs7T0FLRztJQUNJLDBCQUFXLEdBQWxCLFVBQW1CLElBQVksRUFBRSxTQUF3QyxFQUFFLEdBQVc7UUFFbEYsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLDhCQUE4QixFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFD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