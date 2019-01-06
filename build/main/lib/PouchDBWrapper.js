"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const pouchdb_1 = __importDefault(require("pouchdb"));
// @ts-ignore
const pouchdb_authentication_1 = __importDefault(require("pouchdb-authentication"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const internal_compatibility_1 = require("rxjs/internal-compatibility");
const Logger_1 = require("./Logger");
pouchdb_1.default.plugin(pouchdb_authentication_1.default);
class PouchDBWrapper {
    constructor() {
        this.docSaved$ = new rxjs_1.Subject();
        this.docDeleted$ = new rxjs_1.Subject();
    }
    static loadLocalDB(name, generator, log) {
        log = log.start(this.getLogName(), "loadLocalDB loading local db", { name: name });
        const wrapper = new PouchDBWrapper();
        wrapper.generator = generator;
        wrapper.db = new pouchdb_1.default(name);
        return log.addTo(rxjs_1.of(wrapper));
    }
    static destroyLocalDB(name, log) {
        log = log.start(this.getLogName(), "destroyLocalDB destroying local db", { name: name });
        const db = new pouchdb_1.default(name);
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
        const db = new pouchdb_1.default(conf.toUrl(), {
            skip_setup: true,
            fetch(url, opts) {
                opts.credentials = "include";
                return pouchdb_1.default.fetch(url, opts);
            },
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
        return pouchdb_1.default.sync(firstDB.getPouchDB(), secondDB.getPouchDB(), { live: true, retry: true })
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
        return log.addTo(internal_compatibility_1.fromPromise(pouchdb_1.default.replicate(this.db, to.getPouchDB())
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1BvdWNoREJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsYUFBYTtBQUNiLHNEQUE4QjtBQUM5QixhQUFhO0FBQ2Isb0ZBQTREO0FBQzVELCtCQUF5RDtBQUN6RCw4Q0FBcUQ7QUFDckQsd0VBQXdEO0FBT3hELHFDQUFpRDtBQUVqRCxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxnQ0FBc0IsQ0FBQyxDQUFDO0FBV3ZDLE1BQWEsY0FBYztJQUEzQjtRQU1XLGNBQVMsR0FBNkIsSUFBSSxjQUFPLEVBQUUsQ0FBQztRQUNwRCxnQkFBVyxHQUFtRCxJQUFJLGNBQU8sRUFBRSxDQUFDO0lBdVB2RixDQUFDO0lBclBHLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBWSxFQUFFLFNBQXdDLEVBQUUsR0FBVztRQUVsRixHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsOEJBQThCLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUNqRixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFZLEVBQUUsR0FBVztRQUMzQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsb0NBQW9DLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN2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