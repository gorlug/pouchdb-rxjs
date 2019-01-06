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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQldyYXBwZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQWtCLGNBQWMsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxlQUFlLEVBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDdEUsT0FBTyxFQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUQsT0FBTyxFQUFDLFdBQVcsRUFBRSxjQUFjLEVBQWMsTUFBTSxrQkFBa0IsQ0FBQztBQUMxRSxPQUFPLEVBQUMsTUFBTSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUNqRCxPQUFPLEVBQUMsZUFBZSxFQUFFLHdCQUF3QixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFRNUUsTUFBTSxPQUFPLElBQUssU0FBUSxlQUE2QjtJQUluRCxZQUFZLElBQVk7UUFDcEIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTztRQUNILE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVk7UUFDaEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUdTLHVCQUF1QixDQUFDLElBQWtCO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMxQixDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU8sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU8saUJBQWlCO1FBQ3JCLElBQUks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