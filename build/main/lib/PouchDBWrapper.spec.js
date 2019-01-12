"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PouchDBWrapper_1 = require("./PouchDBWrapper");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const CouchDBWrapper_1 = require("./CouchDBWrapper");
const Logger_1 = require("./Logger");
const PouchDBDocument_1 = require("./PouchDBDocument");
class Todo extends PouchDBDocument_1.PouchDBDocument {
    constructor(name) {
        super();
        this.setSamenessChecks();
        this.name = name;
    }
    getName() {
        return this.name;
    }
    setName(name) {
        this.name = name;
    }
    addValuesToJSONDocument(json) {
        json.name = this.name;
    }
    toString() {
        return "Todo: " + this.getName();
    }
    setSamenessChecks() {
        this.samenessChecks = [
            (other) => {
                return this.name === other.name;
            }
        ];
    }
    getNameOfDoc() {
        return "Todo";
    }
}
exports.Todo = Todo;
class TodoGenerator extends PouchDBDocument_1.PouchDBDocumentGenerator {
    createDocument(json) {
        const todo = new Todo(json.name);
        todo.setId(json._id);
        todo.updateRev(json._rev);
        return todo;
    }
}
exports.TodoGenerator = TodoGenerator;
const LOCAL_COUCHDB_CREDENTIALS = {
    username: "admin",
    password: "admin"
};
const COUCHDB_CONF = new CouchDBWrapper_1.CouchDBConf();
COUCHDB_CONF.host = "couchdb-test";
COUCHDB_CONF.setHttp();
COUCHDB_CONF.port = 5984;
COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
const dbName = "test";
const credentials1 = {
    username: "testuser",
    password: "testpassword"
};
const credentials2 = {
    username: "testuser2",
    password: "testpassword2"
};
const LOG_NAME = "PouchDBWrapperTests";
const LOG_DB_CONF = new CouchDBWrapper_1.CouchDBConf();
LOG_DB_CONF.dbName = "dev-log";
LOG_DB_CONF.port = 5984;
LOG_DB_CONF.host = "couchdb-test";
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "loggingUser",
    password: "somepassword"
});
let logDB;
describe("PouchDBWrapper tests", () => {
    const test = {
        completeLog(log, complete) {
            log.complete().subscribe({
                complete() {
                    complete();
                }
            });
        }
    };
    beforeAll(complete => {
        PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger_1.Logger.getLoggerTrace()).subscribe(result => {
            logDB = result.value;
            complete();
        });
    });
    function getLogger() {
        const log = Logger_1.Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    }
    beforeEach((complete) => {
        COUCHDB_CONF.dbName = dbName;
        COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
        const log = getLogger();
        const startLog = log.start(LOG_NAME, "beforeEach delete CouchDB " + dbName);
        CouchDBWrapper_1.CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(result => {
            log.logMessage(LOG_NAME, "destroy local db " + dbName, {});
            return PouchDBWrapper_1.PouchDBWrapper.destroyLocalDB(dbName, result.log);
        }), operators_1.catchError(error => rxjs_1.of(error)), 
        // cleanup users
        operators_1.concatMap((result) => {
            log.logMessage(LOG_NAME, "delete user" + credentials1.username, {});
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials1.username, log);
        }), operators_1.catchError(error => rxjs_1.of(error)), operators_1.concatMap((result) => {
            log.logMessage(LOG_NAME, "delete user" + credentials2.username, {});
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials2.username, log);
        }), operators_1.catchError(error => rxjs_1.of(error)))
            .subscribe({
            next(response) {
                COUCHDB_CONF.dbName = dbName;
                startLog.complete().pipe(operators_1.tap(() => log.logMessage(LOG_NAME, "beforeEach end", { run: "end", response: response })))
                    .subscribe({
                    error(error) {
                        console.log("some error", error);
                        complete();
                    },
                    complete() {
                        complete();
                    }
                });
            },
            error(error) {
                COUCHDB_CONF.dbName = dbName;
                startLog.logError(LOG_NAME, "beforeEach error", "something went wrong", { error: error }).subscribe({
                    error(innerError) {
                        console.log("some error", innerError);
                        complete();
                    },
                    complete() {
                        complete();
                    }
                });
            }
        });
    });
    it("should construct a couchdb AjaxRequest with authentication", () => {
        const log = getLogger();
        const conf = new CouchDBWrapper_1.CouchDBConf();
        conf.host = "localhost";
        conf.setHttp();
        conf.port = 5984;
        const credentials = {
            username: "admin",
            password: "admin"
        };
        conf.setCredentials(credentials);
        conf.dbName = "test";
        const request = conf.toRequest(log);
        expect(request.url).toBe("http://localhost:5984/test");
        expect(request.crossDomain).toBeTruthy();
        const headers = request.headers;
        expect(headers.Authorization).toBe("Basic YWRtaW46YWRtaW4=");
    });
    it("should create a new database", (complete) => {
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).subscribe({
            next(result) {
                result.log.complete();
                expect(result.value.status).toBe(201);
                complete();
            },
            error(error) {
                fail(`database could not be created: ${error.status}, ${JSON.stringify(error.response)}`);
                complete();
            }
        });
    });
    it("should save and get a document", (complete) => {
        const doc = new Todo("some name");
        let dbWrapper;
        let savedTodo;
        console.log("doc rev", doc.getRev());
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(operators_1.concatMap(result => {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            dbWrapper = result.value;
            return dbWrapper.saveDocument(doc, result.log);
        }), operators_1.concatMap(result => {
            savedTodo = result.value;
            expect(savedTodo.getRev()).toMatch("1-.+");
            return dbWrapper.getDocument(savedTodo.getId(), result.log);
        })).subscribe({
            next(result) {
                result.log.complete();
                const todo = result.value;
                expect(todo.isThisTheSame(doc)).toBeTruthy();
                expect(todo.getRev()).toBe(savedTodo.getRev());
                complete();
            },
            error(error) {
                console.log("error happened", error);
                fail("arrr there should not be an error yet here it is: " + JSON.stringify(error));
                complete();
            }
        });
        /* const pouchdbWrapper = PouchDBWrapper.loadExternalDB(COUCHDB_CONF);
        setTimeout(() => {
            complete();
        }, 2000);*/
    });
    it("should get all documents", (complete) => {
        const doc1 = new Todo("some name");
        doc1.setId((new Date().getTime() - 100) + "");
        const doc2 = new Todo("some other name");
        let dbWrapper;
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        const log = getLogger();
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(result => {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            dbWrapper = result.value;
            const save1$ = dbWrapper.saveDocument(doc1, result.log);
            const save2$ = dbWrapper.saveDocument(doc2, result.log);
            return rxjs_1.zip(save1$, save2$);
        }), operators_1.concatMap(result => {
            result[0].log.complete();
            result[1].log.complete();
            expect(result.length).toBe(2);
            return dbWrapper.getAllDocuments(result[0].log);
        })).subscribe({
            next(result) {
                result.log.complete();
                const todos = result.value;
                expect(todos.length).toBe(2);
                console.log("todo index 0 name ", todos[0].getName(), "second", todos[1].getName());
                expect(todos[0].isThisTheSame(doc1)).toBeTruthy();
                expect(todos[1].isThisTheSame(doc2)).toBeTruthy();
                complete();
            },
            error(error) {
                console.log("error happened", error);
                fail("arrr there should not be an error yet here it is: " + JSON.stringify(error));
                complete();
            }
        });
    });
    function getPouchDBWrapperForTest(log = getLogger()) {
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(result => {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }));
    }
    const throw_error_on_a_non_exisating_document_string = "should throw an error on a non existing document";
    it(throw_error_on_a_non_exisating_document_string, (complete) => {
        const log = getLogger();
        const startLog = log.start(LOG_NAME, throw_error_on_a_non_exisating_document_string);
        getPouchDBWrapperForTest(log).pipe(operators_1.concatMap(result => {
            return result.value.getDocument("1337", result.log);
        })).subscribe({
            next(result) {
                const failMsg = "should not be called since an error should be thrown";
                fail(failMsg);
                startLog.logError(LOG_NAME, throw_error_on_a_non_exisating_document_string, failMsg);
                complete();
            },
            error(error) {
                expect(error).toBe("document with id 1337 was not found");
                test.completeLog(startLog, complete);
            }
        });
    });
    it("should delete a document", complete => {
        const doc = new Todo("some name");
        let savedRev;
        let pouchdbWrapper;
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(result => {
            pouchdbWrapper = result.value;
            return result.value.saveDocument(doc, result.log);
        }), operators_1.concatMap(result => {
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        }), operators_1.concatMap(result => {
            const todo = result.value;
            expect(doc.isThisTheSame(todo)).toBeTruthy();
            savedRev = doc.getRev();
            return pouchdbWrapper.deleteDocument(doc, result.log);
        }), operators_1.concatMap(result => {
            const todo = result.value;
            // todo should have a different rev as a deleted document
            expect(todo.getRev() !== savedRev).toBeTruthy();
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        })).subscribe({
            next(result) {
                fail("should not be called since an error should be thrown");
                complete();
            },
            error(error) {
                expect(error).toBe(`document with id ${doc.getId()} was not found`);
                complete();
            }
        });
    });
    it("should create a user and delete it", complete => {
        const credentials = {
            username: "testuser",
            password: "testpassword"
        };
        let createResult;
        COUCHDB_CONF.dbName = dbName;
        const log = getLogger();
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.catchError(error => {
            if (error.status === 412) {
                // that's ok
                return rxjs_1.of("ok");
            }
            else {
                throw error;
            }
        }), operators_1.concatMap(result => {
            COUCHDB_CONF.dbName = dbName;
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials, log);
        }), operators_1.concatMap(result => {
            createResult = result.value;
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials.username, result.log);
        }))
            .subscribe({
            next(resultObject) {
                const result = resultObject.value;
                expect(result.ok).toBeTruthy();
                expect(result.id).toBe(`org.couchdb.user:${credentials.username}`);
                expect(createResult.ok).toBeTruthy();
                expect(createResult.id).toBe(`org.couchdb.user:${credentials.username}`);
                complete();
            },
            error(error) {
                console.log("some error", error.message);
                fail("there should not be an error here");
                complete();
            }
        });
    });
    it("should set the database authorization to allow only one user", complete => {
        const todo = new Todo("some todo");
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(result => {
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials1, result.log);
        }), operators_1.concatMap(result => {
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials2, result.log);
        }), operators_1.concatMap(result => {
            COUCHDB_CONF.dbName = "test";
            return CouchDBWrapper_1.CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [credentials1.username], result.log);
        }), 
        // save with authorized user should work
        operators_1.concatMap(result => {
            result.log.complete();
            COUCHDB_CONF.setCredentials(credentials1);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            return result.value.saveDocument(todo, result.log);
        }), operators_1.concatMap((result) => {
            const todoResult = result.value;
            expect(todoResult.isThisTheSame(todo)).toBeTruthy();
            // save with second unauthorized user should not work
            COUCHDB_CONF.setCredentials(credentials2);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            return result.value.saveDocument(todo, result.log);
        }))
            .subscribe({
            next(result) {
                fail("There should be an access not allowed error");
                complete();
            },
            error(error) {
                console.log("some error", error);
                expect(error).toBe("You are not allowed to access this db.");
                complete();
            }
        });
    });
    it("should emit an observable event if a new document is added", complete => {
        const todo = new Todo("some todo");
        function subscribeToAddDocumentObservable(db) {
            db.docSaved$.subscribe({
                next(result) {
                    const doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy();
                    complete();
                },
                error(error) {
                    fail("there should not be an error");
                    complete();
                }
            });
        }
        getPouchDBWrapperForTest()
            .subscribe({
            next(result) {
                const db = result.value;
                subscribeToAddDocumentObservable(db);
                db.saveDocument(todo, result.log).subscribe({
                    error(error) {
                        fail("there should not be an error");
                        complete();
                    }
                });
            },
            error(error) {
                fail("there should not be an error");
                complete();
            }
        });
    });
    it("should emit an observable event if a document is deleted", complete => {
        const todo = new Todo("some todo");
        function subscribeToDeleteDocumentObservable(db) {
            db.docDeleted$.subscribe({
                next(result) {
                    const deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id);
                    complete();
                },
                error(error) {
                    fail("there should not be an error when subscribing to docDeleted$");
                    complete();
                }
            });
        }
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(result => {
            return result.value.saveDocument(todo, result.log).pipe(operators_1.concatMap(saveResult => {
                return rxjs_1.of(result);
            }));
        }))
            .subscribe({
            next(result) {
                const db = result.value;
                subscribeToDeleteDocumentObservable(db);
                db.deleteDocument(todo, result.log).subscribe({
                    error(error) {
                        console.log("error", error);
                        fail("there should not be a delete document error");
                        complete();
                    }
                });
            },
            error(error) {
                fail("there should not be a get database error");
                complete();
            }
        });
    });
    function createSyncDatabases() {
        const logName = LOG_NAME + "_createSyncDatabases";
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        const otherDBConf = COUCHDB_CONF.clone();
        otherDBConf.dbName = "anothertest";
        let db1;
        let db2;
        const log = getLogger();
        function deleteAndCreateDB() {
            log.logMessage(logName, "deleting other db");
            return CouchDBWrapper_1.CouchDBWrapper.deleteCouchDBDatabase(otherDBConf, log).pipe(operators_1.concatMap(result => {
                log.logMessage(logName, "creating other db again");
                return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(otherDBConf, log);
            }));
        }
        log.logMessage(logName, "trying to create other db", {});
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(otherDBConf, log)
            .pipe(operators_1.catchError(error => {
            if (error.exists) {
                log.logMessage(logName, "other db already exists", {});
                return deleteAndCreateDB();
            }
            return rxjs_1.throwError(error);
        }), operators_1.concatMap(result => {
            result.log.complete();
            log.logMessage(logName, "create db test", {});
            return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            result.log.complete();
            log.logMessage(logName, "loading test db", {});
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            db1 = result.value;
            result.log.complete();
            log.logMessage(logName, "loading other db", {});
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(otherDBConf, result.log);
        }), operators_1.concatMap(result => {
            db2 = result.value;
            return rxjs_1.of({ db1: db1, db2: db2, log: result.log });
        }));
    }
    it("should push document from db1 to db2 in database sync", complete => {
        const logName = LOG_NAME + "_shouldPushDocument";
        const todo = new Todo("some todo");
        let sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsForPresenceOfDoc(db, log) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs = result.value;
                    expect(docs.length).toBe(1);
                    expect(docs[0].isThisTheSame(todo)).toBeTruthy();
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB2(db, log) {
            log.complete();
            log.logMessage(logName, "subscribing to add on db2");
            db.docSaved$.subscribe({
                next(result) {
                    result.log.complete();
                    const doc = result.value;
                    result.log.logMessage(logName, "received todo", doc.getDebugInfo());
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db2 truthy check");
                    checkGetAllDocumentsForPresenceOfDoc(db, result.log);
                },
                error(error) {
                    fail("db2 docadded error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            const { db1, db2, log } = result;
            log.complete();
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB2(db2, log);
            return db1.saveDocument(todo, log);
        }))
            .subscribe({
            next(result) {
                result.log.complete();
                console.log("some result", result);
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should pull document from db2 to db1 in database sync", complete => {
        const todo = new Todo("some todo");
        let sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsForPresenceOfDoc(db, log) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs = result.value;
                    expect(docs.length).toBe(1);
                    expect(docs[0].isThisTheSame(todo)).toBeTruthy();
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db1 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB1(db) {
            db.docSaved$.subscribe({
                next(result) {
                    const doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db1 truthy check");
                    checkGetAllDocumentsForPresenceOfDoc(db, result.log);
                },
                error(error) {
                    fail("db2 doc added error should not be here " + error);
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB1(db1);
            return db2.saveDocument(todo, log);
        }))
            .subscribe({
            next(result) {
                console.log("some result", result.response, result);
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should push document deletion from db1 to db2 in database sync", complete => {
        const todo = new Todo("some todo");
        let sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db, log) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB2(db1, db2) {
            db2.docSaved$.subscribe({
                next(result) {
                    const doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db2 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error(error) {
                    fail("db2 doc added error should not be here");
                    syncComplete();
                }
            });
        }
        function deleteDocument(db1, db2, log) {
            subscribeToDeleteOnDB2(db2);
            db1.deleteDocument(todo, log);
        }
        function subscribeToDeleteOnDB2(db) {
            db.docDeleted$.subscribe({
                next(result) {
                    const deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id, "db2 delete truthy check");
                    checkGetAllDocumentsReturnsAnEmptyArray(db, result.log);
                },
                error(error) {
                    fail("db2 doc deleted error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB2(db1, db2);
            return db1.saveDocument(todo, log);
        }))
            .subscribe({
            next(result) {
                console.log("some result", result.response, result);
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should pull document deletion from db2 to db1 in database sync", complete => {
        const todo = new Todo("some todo");
        let sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db, log) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB1(db1, db2) {
            db1.docSaved$.subscribe({
                next(result) {
                    const doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db1 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error(error) {
                    fail("db1 doc added error should not be here");
                    syncComplete();
                }
            });
        }
        function deleteDocument(db1, db2, log) {
            subscribeToDeleteOnDB1(db1);
            db2.deleteDocument(todo, log);
        }
        function subscribeToDeleteOnDB1(db) {
            db.docDeleted$.subscribe({
                next(result) {
                    const deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id, "db1 delete truthy check");
                    checkGetAllDocumentsReturnsAnEmptyArray(db, result.log);
                },
                error(error) {
                    fail("db1 doc deleted error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB1(db1, db2);
            return db2.saveDocument(todo, log);
        }))
            .subscribe({
            next(result) {
                console.log("some result", result.response, result);
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should replicate documents from db1 to db2", complete => {
        const todo = new Todo("some todo");
        todo.setId((new Date().getTime() - 100) + "");
        const todo2 = new Todo("another todo");
        let db1;
        let db2;
        let numberOfTodosAdded = 0;
        const waitingForDocAdded$ = new rxjs_1.BehaviorSubject(0);
        function waitForDocsAddedToComplete() {
            waitingForDocAdded$.subscribe({
                next(addedNumber) {
                    if (addedNumber === 2) {
                        complete();
                    }
                },
                error(error) {
                    fail("there should not be a waiting for doc added error " + error);
                    complete();
                }
            });
        }
        function subscribeToDB2Add() {
            db2.docSaved$.subscribe({
                next(result) {
                    const addedTodo = result.value;
                    console.log("todo added", addedTodo);
                    if (numberOfTodosAdded === 0) {
                        expect(todo.isThisTheSame(addedTodo) || todo2.isThisTheSame(addedTodo)).toBeTruthy();
                        numberOfTodosAdded++;
                        return;
                    }
                    expect(todo2.isThisTheSame(addedTodo) || todo.isThisTheSame(addedTodo)).toBeTruthy();
                    numberOfTodosAdded++;
                    console.log("numberOfTodosAdded", numberOfTodosAdded);
                    waitingForDocAdded$.next(numberOfTodosAdded);
                },
                error(error) {
                    fail("there should not be a doc added error " + error);
                    complete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Add();
            return db1.saveDocument(todo, result.log);
        }), operators_1.concatMap(result => {
            return db1.saveDocument(todo2, result.log);
        }), operators_1.concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(result => {
            return db2.getAllDocuments(result.log);
        }))
            .subscribe({
            next(result) {
                const todos = result.value;
                console.log("subscribe now in effect");
                expect(todos.length).toBe(2);
                waitForDocsAddedToComplete();
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                complete();
            }
        });
    });
    it("should correctly handle deletes on replicate", complete => {
        const todo = new Todo("some todo");
        let db1;
        let db2;
        const deletedDocSubscribe$ = new rxjs_1.BehaviorSubject(false);
        function subscribeToDB2Delete() {
            db2.docDeleted$.subscribe({
                next(result) {
                    const deletedDoc = result.value;
                    expect(deletedDoc._id).toBe(todo.getId());
                    deletedDocSubscribe$.next(true);
                },
                error(error) {
                    fail("there should be no docDeleted error " + error);
                    complete();
                }
            });
        }
        function waitForDeletedDocSubscribe() {
            deletedDocSubscribe$.subscribe({
                next(deleted) {
                    if (deleted) {
                        complete();
                    }
                },
                error(error) {
                    fail("there sould be no waitForDeletedDocSubscribe error " + error);
                    complete();
                }
            });
        }
        createSyncDatabases()
            .pipe(operators_1.concatMap((result) => {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Delete();
            return db1.saveDocument(todo, result.log);
        }), operators_1.concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(result => {
            return db1.deleteDocument(todo, result.log);
        }), operators_1.concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(result => {
            return db2.getAllDocuments(result.log);
        }))
            .subscribe({
            next(result) {
                const todos = result.value;
                console.log("subscribe now in effect");
                expect(todos.length).toBe(0);
                waitForDeletedDocSubscribe();
            },
            error(error) {
                console.log("some error", error.message);
                fail(error + "");
                complete();
            }
        });
    });
    function createListenToChangesDatabses() {
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        let externalDB;
        let localDB;
        let externalDBChanges;
        let sync;
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(operators_1.concatMap(result => PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log)), operators_1.concatMap(result => {
            externalDB = result.value;
            return PouchDBWrapper_1.PouchDBWrapper.loadLocalDB(dbName, new TodoGenerator(), result.log);
        }), operators_1.concatMap(result => {
            localDB = result.value;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(localDB, externalDB, result.log);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(result => {
            externalDBChanges = result.value;
            return rxjs_1.of({ externalDB, localDB, externalDBChanges, sync, log: result.log });
        }));
    }
    it("should emit documents when using listenToChanges", complete => {
        const todo = new Todo("some todo");
        let dbValues;
        let listenToChange;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(operators_1.concatMap(result => {
            dbValues = result;
            subscribeToSavedDocument(dbValues.externalDBChanges, dbValues.log);
            return result.localDB.saveDocument(todo, dbValues.log);
        })).subscribe(result => {
            result.log.complete();
        }, error => {
            fail(error + "");
            syncComplete();
        });
        function subscribeToSavedDocument(db, log) {
            listenToChange = db.listenToChanges(log);
            db.docSaved$.subscribe(next => {
                const doc = next.value;
                expect(doc.isTheSameDocumentAs(todo)).toBeTruthy();
                syncComplete();
            }, error => {
                fail(error + "");
                syncComplete();
            });
        }
    });
    it("should emit delete document when using listenToChanges", complete => {
        const todo = new Todo("some todo");
        let dbValues;
        let listenToChange;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(operators_1.concatMap(result => {
            dbValues = result;
            return result.localDB.saveDocument(todo, dbValues.log);
        }), operators_1.concatMap(result => {
            subscribeToDeletedDocument(dbValues.externalDBChanges, dbValues.log);
            return dbValues.localDB.deleteDocument(todo, result.log);
        })).subscribe(result => {
            console.log("result", result);
        }, error => {
            fail(error + "");
            syncComplete();
        });
        function subscribeToDeletedDocument(db, log) {
            listenToChange = db.listenToChanges(log);
            db.docDeleted$.subscribe(next => {
                const doc = next.value;
                expect(doc._id).toBe(todo.getId());
                syncComplete();
            }, error => {
                fail(error + "");
                syncComplete();
            });
        }
    });
    /* it("what happens on sync conflict?", complete => {
        const todo = new Todo("some todo");
        let sync: any;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        let db1: PouchDBWrapper;
        let db2: PouchDBWrapper;
        createSyncDatabases()
            .pipe(
                concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper}) => {
                    db1 = result.db1;
                    db2 = result.db2;
                    return db1.saveDocument(todo);
                }),
                concatMap(result => {
                    return db1.replicateTo(db2);
                }),
                concatMap(result => {
                    return db2.getDocument(todo.getId());
                }),
                concatMap((db2Todo: Todo) => {
                    db2Todo.setName("db2 name";
                    return db2.saveDocument(db2Todo);
                }),
                concatMap(result => {
                    todo.setName("db1 name");
                    return db1.saveDocument(todo);
                }),
                concatMap(result => {
                    sync = PouchDBWrapper.syncDBs(db1, db2);
                    return of("a");
                })
            )
            .subscribe({
                next(result: any) {
                    // PouchDBWrapper.syncDBs(db1, db2);
                    console.log("some result", result.response, result);
                },
                error(error) {
                    console.log("some error", error.message, error);
                    syncComplete();
                }
            });
    });
    */
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQldyYXBwZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFEQUFpRTtBQUNqRSwrQkFBc0U7QUFDdEUsOENBQTBEO0FBQzFELHFEQUEwRTtBQUMxRSxxQ0FBaUQ7QUFDakQsdURBQWlHO0FBTWpHLE1BQWEsSUFBSyxTQUFRLGlDQUE2QjtJQUluRCxZQUFZLElBQVk7UUFDcEIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTztRQUNILE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVk7UUFDaEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUdTLHVCQUF1QixDQUFDLElBQWtCO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU8saUJBQWlCO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUc7WUFDbEIsQ0FBQyxLQUFXLEVBQUcsRUFBRTtnQkFDYixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQztZQUNwQyxDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFUyxZQUFZO1FBQ2xCLE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7Q0FDSjtBQXRDRCxvQkFzQ0M7QUFFRCxNQUFhLGFBQWMsU0FBUSwwQ0FBOEI7SUFFbkQsY0FBYyxDQUFDLElBQWtCO1FBQ3ZDLE1BQU0sSUFBSSxHQUFH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