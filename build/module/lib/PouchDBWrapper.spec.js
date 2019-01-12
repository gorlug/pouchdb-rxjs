import { PouchDBWrapper } from "./PouchDBWrapper";
import { BehaviorSubject, of, throwError, zip } from "rxjs";
import { catchError, concatMap, tap } from "rxjs/operators";
import { CouchDBConf, CouchDBWrapper } from "./CouchDBWrapper";
import { Logger } from "./Logger";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
export class Todo extends PouchDBDocument {
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
export class TodoGenerator extends PouchDBDocumentGenerator {
    createDocument(json) {
        const todo = new Todo(json.name);
        todo.setId(json._id);
        todo.updateRev(json._rev);
        return todo;
    }
}
const LOCAL_COUCHDB_CREDENTIALS = {
    username: "admin",
    password: "admin"
};
const COUCHDB_CONF = new CouchDBConf();
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
const LOG_DB_CONF = new CouchDBConf();
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
        PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger.getLoggerTrace()).subscribe(result => {
            logDB = result.value;
            complete();
        });
    });
    function getLogger() {
        const log = Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    }
    beforeEach((complete) => {
        COUCHDB_CONF.dbName = dbName;
        COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
        const log = getLogger();
        const startLog = log.start(LOG_NAME, "beforeEach delete CouchDB " + dbName);
        CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(result => {
            log.logMessage(LOG_NAME, "destroy local db " + dbName, {});
            return PouchDBWrapper.destroyLocalDB(dbName, result.log);
        }), catchError(error => of(error)), 
        // cleanup users
        concatMap((result) => {
            log.logMessage(LOG_NAME, "delete user" + credentials1.username, {});
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials1.username, log);
        }), catchError(error => of(error)), concatMap((result) => {
            log.logMessage(LOG_NAME, "delete user" + credentials2.username, {});
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials2.username, log);
        }), catchError(error => of(error)))
            .subscribe({
            next(response) {
                COUCHDB_CONF.dbName = dbName;
                startLog.complete().pipe(tap(() => log.logMessage(LOG_NAME, "beforeEach end", { run: "end", response: response })))
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
        const conf = new CouchDBConf();
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
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).subscribe({
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
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(concatMap(result => {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            dbWrapper = result.value;
            return dbWrapper.saveDocument(doc, result.log);
        }), concatMap(result => {
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
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(result => {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            dbWrapper = result.value;
            const save1$ = dbWrapper.saveDocument(doc1, result.log);
            const save2$ = dbWrapper.saveDocument(doc2, result.log);
            return zip(save1$, save2$);
        }), concatMap(result => {
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
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(result => {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }));
    }
    const throw_error_on_a_non_exisating_document_string = "should throw an error on a non existing document";
    it(throw_error_on_a_non_exisating_document_string, (complete) => {
        const log = getLogger();
        const startLog = log.start(LOG_NAME, throw_error_on_a_non_exisating_document_string);
        getPouchDBWrapperForTest(log).pipe(concatMap(result => {
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
        getPouchDBWrapperForTest().pipe(concatMap(result => {
            pouchdbWrapper = result.value;
            return result.value.saveDocument(doc, result.log);
        }), concatMap(result => {
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        }), concatMap(result => {
            const todo = result.value;
            expect(doc.isThisTheSame(todo)).toBeTruthy();
            savedRev = doc.getRev();
            return pouchdbWrapper.deleteDocument(doc, result.log);
        }), concatMap(result => {
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
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(catchError(error => {
            if (error.status === 412) {
                // that's ok
                return of("ok");
            }
            else {
                throw error;
            }
        }), concatMap(result => {
            COUCHDB_CONF.dbName = dbName;
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials, log);
        }), concatMap(result => {
            createResult = result.value;
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials.username, result.log);
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
        getPouchDBWrapperForTest().pipe(concatMap(result => {
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials1, result.log);
        }), concatMap(result => {
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials2, result.log);
        }), concatMap(result => {
            COUCHDB_CONF.dbName = "test";
            return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [credentials1.username], result.log);
        }), 
        // save with authorized user should work
        concatMap(result => {
            result.log.complete();
            COUCHDB_CONF.setCredentials(credentials1);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            return result.value.saveDocument(todo, result.log);
        }), concatMap((result) => {
            const todoResult = result.value;
            expect(todoResult.isThisTheSame(todo)).toBeTruthy();
            // save with second unauthorized user should not work
            COUCHDB_CONF.setCredentials(credentials2);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
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
        getPouchDBWrapperForTest().pipe(concatMap(result => {
            return result.value.saveDocument(todo, result.log).pipe(concatMap(saveResult => {
                return of(result);
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
            return CouchDBWrapper.deleteCouchDBDatabase(otherDBConf, log).pipe(concatMap(result => {
                log.logMessage(logName, "creating other db again");
                return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log);
            }));
        }
        log.logMessage(logName, "trying to create other db", {});
        return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log)
            .pipe(catchError(error => {
            if (error.exists) {
                log.logMessage(logName, "other db already exists", {});
                return deleteAndCreateDB();
            }
            return throwError(error);
        }), concatMap(result => {
            result.log.complete();
            log.logMessage(logName, "create db test", {});
            return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            result.log.complete();
            log.logMessage(logName, "loading test db", {});
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            db1 = result.value;
            result.log.complete();
            log.logMessage(logName, "loading other db", {});
            return PouchDBWrapper.loadExternalDB(otherDBConf, result.log);
        }), concatMap(result => {
            db2 = result.value;
            return of({ db1: db1, db2: db2, log: result.log });
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
            .pipe(concatMap((result) => {
            const { db1, db2, log } = result;
            log.complete();
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(concatMap((result) => {
            const { db1, db2, log } = result;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
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
        const waitingForDocAdded$ = new BehaviorSubject(0);
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
            .pipe(concatMap((result) => {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Add();
            return db1.saveDocument(todo, result.log);
        }), concatMap(result => {
            return db1.saveDocument(todo2, result.log);
        }), concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), concatMap(result => {
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
        const deletedDocSubscribe$ = new BehaviorSubject(false);
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
            .pipe(concatMap((result) => {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Delete();
            return db1.saveDocument(todo, result.log);
        }), concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), concatMap(result => {
            return db1.deleteDocument(todo, result.log);
        }), concatMap(result => {
            return db1.replicateTo(db2, result.log);
        }), concatMap(result => {
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
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(concatMap(result => PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log)), concatMap(result => {
            externalDB = result.value;
            return PouchDBWrapper.loadLocalDB(dbName, new TodoGenerator(), result.log);
        }), concatMap(result => {
            localDB = result.value;
            sync = PouchDBWrapper.syncDBs(localDB, externalDB, result.log);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(result => {
            externalDBChanges = result.value;
            return of({ externalDB, localDB, externalDBChanges, sync, log: result.log });
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
        createListenToChangesDatabses().pipe(concatMap(result => {
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
        createListenToChangesDatabses().pipe(concatMap(result => {
            dbValues = result;
            return result.localDB.saveDocument(todo, dbValues.log);
        }), concatMap(result => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQldyYXBwZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWtCLGNBQWMsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxlQUFlLEVBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDdEUsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUQsT0FBTyxFQUFDLFdBQVcsRUFBRSxjQUFjLEVBQWMsTUFBTSxrQkFBa0IsQ0FBQztBQUMxRSxPQUFPLEVBQUMsTUFBTSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsZUFBZSxFQUFFLHdCQUF3QixFQUFzQixNQUFNLG1CQUFtQixDQUFDO0FBTWpHLE1BQU0sT0FBTyxJQUFLLFNBQVEsZUFBNkI7SUFJbkQsWUFBWSxJQUFZO1FBQ3BCLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVELE9BQU87UUFDSCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFZO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFHUyx1QkFBdUIsQ0FBQyxJQUFrQjtRQUNoRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDMUIsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUVPLGlCQUFpQjtRQUNyQixJQUFJ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