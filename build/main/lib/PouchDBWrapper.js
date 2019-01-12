"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// https://pouchdb.com/custom.html
// @ts-ignore
const pouchdb_core_1 = __importDefault(require("pouchdb-core"));
// @ts-ignore
const pouchdb_adapter_idb_1 = __importDefault(require("pouchdb-adapter-idb"));
// @ts-ignore
const pouchdb_adapter_http_1 = __importDefault(require("pouchdb-adapter-http"));
// @ts-ignore
const pouchdb_authentication_1 = __importDefault(require("pouchdb-authentication"));
// @ts-ignore
const pouchdb_mapreduce_1 = __importDefault(require("pouchdb-mapreduce"));
// @ts-ignore
const pouchdb_replication_1 = __importDefault(require("pouchdb-replication"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const internal_compatibility_1 = require("rxjs/internal-compatibility");
const Logger_1 = require("./Logger");
pouchdb_core_1.default.plugin(pouchdb_adapter_idb_1.default);
pouchdb_core_1.default.plugin(pouchdb_adapter_http_1.default);
pouchdb_core_1.default.plugin(pouchdb_mapreduce_1.default);
pouchdb_core_1.default.plugin(pouchdb_replication_1.default);
pouchdb_core_1.default.plugin(pouchdb_authentication_1.default);
exports.POUCHDB_WRAPPER_JSON_VERSION = "0.0.1";
class PouchDBWrapper {
    constructor() {
        this.docSaved$ = new rxjs_1.Subject();
        this.docDeleted$ = new rxjs_1.Subject();
    }
    static loadLocalDB(name, generator, log) {
        log = log.start(this.getLogName(), "loadLocalDB loading local db", { name: name });
        const wrapper = new PouchDBWrapper();
        wrapper.generator = generator;
        wrapper.db = new pouchdb_core_1.default(name);
        return log.addTo(rxjs_1.of(wrapper));
    }
    static destroyLocalDB(name, log) {
        log = log.start(this.getLogName(), "destroyLocalDB destroying local db", { name: name });
        const db = new pouchdb_core_1.default(name);
        return log.addTo(internal_compatibility_1.fromPromise(db.destroy())).pipe(operators_1.catchError(error => {
            log.logError(this.getLogName(), "destroyLocalDB error", "error during delete", { error: error });
            return rxjs_1.throwError(error);
        }), operators_1.concatMap(result => {
            log.logMessage(this.getLogName(), "destroyLocalDB response", { response: result.value });
            return rxjs_1.of(result);
        }));
    }
    static getLogName() {
        return "PouchDBWrapper";
    }
    static loadExternalDB(conf, log) {
        log = log.start(this.getLogName(), "loadExternalDB loading external db", conf.getDebugInfo());
        const wrapper = new PouchDBWrapper();
        wrapper.generator = conf.generator;
        wrapper.url = conf.toUrl();
        const db = new pouchdb_core_1.default(conf.toUrl(), {
            skip_setup: true,
            auth: {
                username: conf.credentials.username,
                password: conf.credentials.password
            }
        });
        wrapper.db = db;
        return log.addTo(rxjs_1.of(wrapper));
    }
    static syncDBs(firstDB, secondDB, log) {
        log.logMessage(this.getLogName(), "syncDBs initiating sync", { firstDB: firstDB.getDebugInfo({}), secondDB: secondDB.getDebugInfo({}) });
        return pouchdb_core_1.default.sync(firstDB.getPouchDB(), secondDB.getPouchDB(), { live: true, retry: true })
            .on("change", change => {
            try {
                this.onSyncChange(firstDB, secondDB, change);
            }
            catch (e) {
                log.logError(this.getLogName(), "onSyncChange error", e + "", e);
            }
        })
            .on("error", error => {
            log.logError(this.getLogName(), "syncDBs error", error + "", error);
        });
    }
    static onSyncChange(firstDB, secondDB, info) {
        if (!info.change.docs) {
            return;
        }
        let targetDB;
        if (info.direction === "push") {
            targetDB = secondDB;
        }
        else if (info.direction === "pull") {
            targetDB = firstDB;
        }
        const log = Logger_1.Logger.getLoggerTrace().start(this.getLogName(), "onSyncChange received a sync change", { direction: info.direction, length: info.change.docs.length });
        const generator = targetDB.getGenerator();
        this.emitDocChanges(info.change.docs, targetDB, generator, log);
        log.complete();
    }
    static emitDocChanges(docs, db, generator, log) {
        docs.forEach((doc) => {
            if (doc._deleted) {
                db.docDeleted$.next(log.addToValue({ _id: doc._id }));
                return;
            }
            const document = generator.fromJSON(doc);
            db.docSaved$.next(log.addToValue(document));
        });
    }
    replicateTo(to, log) {
        log = log.start(PouchDBWrapper.getLogName(), "replicateTo replicating data to another db", { from: this.getDebugInfo(), to: to.getDebugInfo() });
        return log.addTo(internal_compatibility_1.fromPromise(pouchdb_core_1.default.replicate(this.db, to.getPouchDB())
            .on("change", info => {
            console.log("change info", info);
            log.logMessage(PouchDBWrapper.getLogName(), "replicateTo replication change", { from: this.getDebugInfo(), to: this.getDebugInfo(), length: info.docs.length });
            if (info.docs) {
                PouchDBWrapper.emitDocChanges(info.docs, to, to.getGenerator(), log);
            }
            log.complete();
        })));
    }
    getPouchDB() {
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
    logStart(dsc, log, doc) {
        return log.start(PouchDBWrapper.getLogName(), dsc, this.getDebugInfo({ doc: doc.getDebugInfo() }));
    }
    saveDocument(document, log) {
        log = this.logStart("saveDocument", log, document);
        const json = document.toDocument();
        if (json._rev == null) {
            delete json._rev;
        }
        return log.addTo(internal_compatibility_1.fromPromise(this.db.put(json)).pipe(operators_1.catchError(errorResult => {
            log.logMessage(PouchDBWrapper.getLogName(), "saveDocument failed to save document", errorResult);
            log.complete();
            return rxjs_1.throwError(errorResult.message);
        }), operators_1.concatMap((result) => {
            if (result.ok) {
                document.updateRev(result.rev);
            }
            this.docSaved$.next(log.addToValue(document));
            return rxjs_1.of(document);
        })));
    }
    handleGetDocument404Error(result, id, log) {
        const errorMsg = `document with id ${id} was not found`;
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return rxjs_1.throwError(errorMsg);
    }
    handleGetDocumentError(result, id, log) {
        log.complete();
        if (result.status === 404) {
            return this.handleGetDocument404Error(result, id, log);
        }
        const errorMsg = "unknown error occurred";
        log.logError(PouchDBWrapper.getLogName(), "getDocument error", errorMsg, this.getDebugInfo({ id: id, result: result }));
        return rxjs_1.throwError(errorMsg);
    }
    getDocument(id, log) {
        log = log.start(PouchDBWrapper.getLogName(), "getDocument getting document", this.getDebugInfo({ id: id }));
        return log.addTo(internal_compatibility_1.fromPromise(this.db.get(id)).pipe(operators_1.catchError(result => {
            return this.handleGetDocumentError(result, id, log);
        }), operators_1.concatMap(result => {
            return rxjs_1.of(this.generator.fromJSON(result));
        })));
    }
    getAllDocuments(log) {
        log = log.start(PouchDBWrapper.getLogName(), "getAllDocuments " +
            "getting all documents of db", this.getDebugInfo({}));
        return log.addTo(internal_compatibility_1.fromPromise(this.db.allDocs({ include_docs: true })).pipe(operators_1.concatMap((response) => {
            return this.createDocumentListFromResponse(response, log);
        })));
    }
    createDocumentListFromResponse(response, log) {
        const list = [];
        response.rows.forEach(row => {
            list.push(this.generator.fromJSON(row.doc));
        });
        log.logMessage(PouchDBWrapper.getLogName(), "getAllDocuments created document" +
            "list", this.getDebugInfo({ length: list.length }));
        return rxjs_1.of(list);
    }
    deleteDocument(document, log) {
        log = log.start(PouchDBWrapper.getLogName(), "deleteDocument deleting a document", this.getDebugInfo({ doc: document.getDebugInfo() }));
        return log.addTo(internal_compatibility_1.fromPromise(this.db.remove(document.toDocument())).pipe(operators_1.concatMap((response) => {
            return this.markDocumentForDeletion(document, response, log);
        })));
    }
    markDocumentForDeletion(document, response, log) {
        this.docDeleted$.next(log.addToValue({ _id: document.getId() }));
        document.updateRev(response.rev);
        log.logMessage(PouchDBWrapper.getLogName(), "deleteDocument new doc rev", this.getDebugInfo({ rev: response.rev }));
        log.complete();
        return rxjs_1.of(document);
    }
    getGenerator() {
        return this.generator;
    }
    listenToChanges(log) {
        const silent = log.getSilent();
        log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges listening to changes start", this.getDebugInfo());
        return this.db.changes({
            since: "now",
            live: true,
            include_docs: true
        }).on("change", change => {
            log = Logger_1.Logger.getLoggerTrace();
            log.setSilent(silent);
            log.logMessage(PouchDBWrapper.getLogName(), "listenToChanges on change", this.getDebugInfo({ length: change.changes.length }));
            if (change.changes.length === 1) {
                PouchDBWrapper.emitDocChanges([change.doc], this, this.generator, log);
            }
        }).on("error", error => {
            log.logError(PouchDBWrapper.getLogName(), "listenToChanges error", error + "", error);
        });
    }
}
exports.PouchDBWrapper = PouchDBWrapper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1BvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLGFBQWE7QUFDYixnRUFBbUM7QUFDbkMsYUFBYTtBQUNiLDhFQUFzRDtBQUN0RCxhQUFhO0FBQ2IsZ0ZBQXdEO0FBQ3hELGFBQWE7QUFDYixvRkFBNEQ7QUFDNUQsYUFBYTtBQUNiLDBFQUFrRDtBQUNsRCxhQUFhO0FBQ2IsOEVBQXNEO0FBQ3RELCtCQUF5RDtBQUN6RCw4Q0FBcUQ7QUFDckQsd0VBQXdEO0FBT3hELHFDQUFpRDtBQUVqRCxzQkFBTyxDQUFDLE1BQU0sQ0FBQyw2QkFBbUIsQ0FBQyxDQUFDO0FBQ3BDLHNCQUFPLENBQUMsTUFBTSxDQUFDLDhCQUFvQixDQUFDLENBQUM7QUFDckMsc0JBQU8sQ0FBQyxNQUFNLENBQUMsMkJBQWlCLENBQUMsQ0FBQztBQUNsQyxzQkFBTyxDQUFDLE1BQU0sQ0FBQyw2QkFBbUIsQ0FBQyxDQUFDO0FBQ3BDLHNCQUFPLENBQUMsTUFBTSxDQUFDLGdDQUFzQixDQUFDLENBQUM7QUFFMUIsUUFBQSw0QkFBNEIsR0FBRyxPQUFPLENBQUM7QUFXcEQsTUFBYSxjQUFjO0lBQTNCO1FBTVcsY0FBUyxHQUE2QixJQUFJLGNBQU8sRUFBRSxDQUFDO1FBQ3BELGdCQUFXLEdBQW1ELElBQUksY0FBTyxFQUFFLENBQUM7SUFtUHZGLENBQUM7SUFqUEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFZLEVBQUUsU0FBd0MsRUFBRSxHQUFXO1FBRWxGLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSw4QkFBOEIsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFD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