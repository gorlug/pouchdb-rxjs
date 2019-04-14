import {DeletedDocument, PouchDBWrapper} from "./PouchDBWrapper";
import {BehaviorSubject, Observable, of, throwError, zip} from "rxjs";
import {catchError, concatMap, tap} from "rxjs/operators";
import {CouchDBConf, CouchDBWrapper, Credentials} from "./CouchDBWrapper";
import {Logger, ValueWithLogger} from "./Logger";
import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "./PouchDBDocument";
import {TestUtil} from "./TestUtil";

export interface TodoDocument extends PouchDBDocumentJSON {
    name: string;
}

export class Todo extends PouchDBDocument<TodoDocument> {

    name: string;

    constructor(name: string) {
        super();
        this.setSamenessChecks();
        this.name = name;
    }

    getName(): string {
        return this.name;
    }

    setName(name: string) {
        this.name = name;
    }


    protected addValuesToJSONDocument(json: TodoDocument) {
        json.name = this.name;
    }

    toString(): string {
        return "Todo: " + this.getName();
    }

    private setSamenessChecks() {
        this.samenessChecks = [
            (other: Todo)  => {
                return this.name === other.name;
            }
        ];
    }

    protected getNameOfDoc(): string {
        return "Todo";
    }
}

export class TodoGenerator extends PouchDBDocumentGenerator<Todo> {

    protected createDocument(json: TodoDocument): Todo {
        const todo = new Todo(json.name);
        todo.setId(json._id);
        todo.updateRev(json._rev);
        return todo;
    }

}


const LOCAL_COUCHDB_CREDENTIALS: Credentials = {
    username: "admin",
    password: "admin"
};
const COUCHDB_CONF = new CouchDBConf();
COUCHDB_CONF.setHost("couchdb-test");
COUCHDB_CONF.setHttp();
COUCHDB_CONF.setPort(5984);
COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
const dbName = "test";

const credentials1: Credentials = {
    username: "testuser",
    password: "testpassword"
};
const credentials2: Credentials = {
    username: "testuser2",
    password: "testpassword2"
};

const LOG_NAME = "PouchDBWrapperTests";

const LOG_DB_CONF = new CouchDBConf();
LOG_DB_CONF.setDBName("dev-log");
LOG_DB_CONF.setPort(5984);
LOG_DB_CONF.setHost("couchdb-test");
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "admin",
    password: "admin"
});
let logDB: PouchDBWrapper;


describe("PouchDBWrapper tests", () => {

    const test = {
        completeLog(log: Logger, complete: Function) {
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
        COUCHDB_CONF.setDBName(dbName);
        COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
        const log = getLogger();
        const startLog = log.start(LOG_NAME, "beforeEach delete CouchDB " + dbName);
        CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log).pipe(
            concatMap(result => {
                log.logMessage(LOG_NAME, "destroy local db " + dbName, {});
                return PouchDBWrapper.destroyLocalDB(dbName, result.log);
            }),
            catchError(error => of(error)),
            // cleanup users
            concatMap((result: any) => {
                log.logMessage(LOG_NAME, "delete user" + credentials1.username, {});
                return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials1.username, log);
            }),
            catchError(error => of(error)),
            concatMap((result: any) => {
                log.logMessage(LOG_NAME, "delete user" + credentials2.username, {});
                return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials2.username, log);
            }),
            catchError(error => of(error))
        )
        .subscribe({
            next(response) {
                COUCHDB_CONF.setDBName(dbName);
                startLog.complete().pipe(
                    tap(() => log.logMessage(LOG_NAME, "beforeEach end",
                        {run: "end", response: response})))
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
                COUCHDB_CONF.setDBName(dbName);
                startLog.logError(LOG_NAME, "beforeEach error", "something went wrong",
                    { error: error}).subscribe({
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
        conf.setHost("localhost");
        conf.setHttp();
        conf.setPort(5984);
        const credentials = {
            username: "admin",
            password: "admin"
        };
        conf.setCredentials(credentials);
        conf.setDBName("test");
        const request = conf.toRequest(log);
        expect(request.url).toBe("http://localhost:5984/test");
        expect(request.crossDomain).toBeTruthy();
        const headers: any = request.headers;
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
        let dbWrapper: PouchDBWrapper;
        let savedTodo: Todo;
        console.log("doc rev", doc.getRev());
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(
            concatMap( result => {
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            }),
            concatMap(result => {
                dbWrapper = result.value;
                return dbWrapper.saveDocument(doc, result.log);
            }),
            concatMap(result => {
                savedTodo = result.value;
                expect(savedTodo.getRev()).toMatch("1-.+");
                return dbWrapper.getDocument(savedTodo.getId(), result.log);
            }),
        ).subscribe({
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

        let dbWrapper: PouchDBWrapper;
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        const log = getLogger();
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(
            concatMap(result => {
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            }),
            concatMap(result => {
                dbWrapper = result.value;
                const save1$ = dbWrapper.saveDocument(doc1, result.log);
                const save2$ = dbWrapper.saveDocument(doc2, result.log);
                return zip(save1$, save2$);
            }),
            concatMap(result => {
                result[0].log.complete();
                result[1].log.complete();
                expect(result.length).toBe(2);
                return dbWrapper.getAllDocuments(result[0].log);
            })
        ).subscribe({
            next(result) {
                result.log.complete();
                const todos: Todo[] = result.value;
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
    function getPouchDBWrapperForTest(log = getLogger()): Observable<{value: PouchDBWrapper, log: Logger}> {
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(
            concatMap(result => {
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            })
        );
    }
    const throw_error_on_a_non_exisating_document_string = "should throw an error on a non existing document";
    it(throw_error_on_a_non_exisating_document_string, (complete) => {
        const log = getLogger();
        const startLog = log.start(LOG_NAME, throw_error_on_a_non_exisating_document_string);
        getPouchDBWrapperForTest(log).pipe(
            concatMap(result => {
                return result.value.getDocument("1337", result.log);
            }),
        ).subscribe({
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
        let pouchdbWrapper: PouchDBWrapper;
        getPouchDBWrapperForTest().pipe(
            concatMap(result => {
                pouchdbWrapper = result.value;
                return result.value.saveDocument(doc, result.log);
            }),
            concatMap(result => {
                return pouchdbWrapper.getDocument(doc.getId(), result.log);
            }),
            concatMap(result => {
                const todo: Todo = result.value;
                expect(doc.isThisTheSame(todo)).toBeTruthy();
                savedRev = doc.getRev();
                return pouchdbWrapper.deleteDocument(doc, result.log);
            }),
            concatMap( result => {
                const todo: Todo = result.value;
                // todo should have a different rev as a deleted document
                expect(todo.getRev() !== savedRev).toBeTruthy();
                return pouchdbWrapper.getDocument(doc.getId(), result.log);
            }),
        ).subscribe({
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
        const credentials: Credentials = {
            username: "testuser",
            password: "testpassword"
        };
        let createResult;
        COUCHDB_CONF.setDBName(dbName);
        const log = getLogger();
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(
            catchError(error => {
                if (error.status === 412) {
                    // that's ok
                    return of("ok");
                } else {
                    throw error;
                }
            }),
            concatMap(result => {
                COUCHDB_CONF.setDBName(dbName);
                return CouchDBWrapper.createUser(COUCHDB_CONF, credentials, log);
            }),
            concatMap(result => {
                createResult = result.value;
                return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials.username, result.log);
            })
        )
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
        getPouchDBWrapperForTest().pipe(
           concatMap(result => {
               return CouchDBWrapper.createUser(COUCHDB_CONF, credentials1, result.log);
           }),
            concatMap(result => {
                return CouchDBWrapper.createUser(COUCHDB_CONF, credentials2, result.log);
            }),
            concatMap(result => {
                COUCHDB_CONF.setDBName("test");
                return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [credentials1.username], result.log);
            }),
            // save with authorized user should work
            concatMap(result => {
                result.log.complete();
                COUCHDB_CONF.setCredentials(credentials1);
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            }),
            concatMap(result => {
                return result.value.saveDocument(todo, result.log);
            }),
            concatMap((result: ValueWithLogger) => {
                const todoResult: Todo = result.value;
                expect(todoResult.isThisTheSame(todo)).toBeTruthy();
            // save with second unauthorized user should not work
                COUCHDB_CONF.setCredentials(credentials2);
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            }),
            concatMap(result => {
                return result.value.saveDocument(todo, result.log);
            }),
        )
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

    function createDB() {
        return concatMap((result: ValueWithLogger) => {
            return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        });
    }

    function getAuthorizedUsers() {
        return concatMap((result: ValueWithLogger) => {
            return CouchDBWrapper.getDBAuthorization(COUCHDB_CONF, result.log);
        });
    }

    TestUtil.runTest("should return all authorized users of a db", LOG_NAME, getLogger, () => {
        const user = "testUser";
        const steps = [
            createDB(),
            authorizeUser(user),
            getAuthorizedUsers(),
            authorizedUser_shouldInclude(user)
        ];
        return steps;


        function authorizeUser(username: string) {
            return concatMap((result: ValueWithLogger) => {
                return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [username], result.log);
            });
        }

        function authorizedUser_shouldInclude(username: string) {
            return concatMap((result: ValueWithLogger) => {
                const authorized: string[] = result.value;
                expect(authorized.length).toBe(1);
                expect(authorized[0]).toBe(username);
                return result.log.addTo(of(result.value));
            });
        }
    });

    TestUtil.runTest("get authorized users of freshly created table should return an empty array", LOG_NAME, getLogger, () => {
        const steps = [
            createDB(),
            getAuthorizedUsers(),
            authorizedUsersArray_shouldBe_empty()
        ];
        return steps;

        function authorizedUsersArray_shouldBe_empty() {
            return concatMap((result: ValueWithLogger) => {
                expect(result.value.length).toBe(0);
                return of(result);
            });
        }
    });

    it("should emit an observable event if a new document is added", complete => {
        const todo = new Todo("some todo");
        function subscribeToAddDocumentObservable(db: PouchDBWrapper) {
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
        function subscribeToDeleteDocumentObservable(db: PouchDBWrapper) {
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

        getPouchDBWrapperForTest().pipe(
            concatMap(result => {
                return result.value.saveDocument(todo, result.log).pipe(
                    concatMap(saveResult => {
                        return of(result);
                    })
                );
            }),
        )
            .subscribe({
                next(result) {
                    const db: PouchDBWrapper = result.value;
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
    function createSyncDatabases(): Observable<{db1: PouchDBWrapper, db2: PouchDBWrapper}> {
        const logName = LOG_NAME + "_createSyncDatabases";
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        const otherDBConf = COUCHDB_CONF.clone();
        otherDBConf.setDBName("anothertest");
        let db1: PouchDBWrapper;
        let db2: PouchDBWrapper;
        const log = getLogger();
        function deleteAndCreateDB() {
            log.logMessage(logName, "deleting other db");
            return CouchDBWrapper.deleteCouchDBDatabase(otherDBConf, log).pipe(
                concatMap(result => {
                    log.logMessage(logName, "creating other db again");
                    return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log);
                })
            );
        }
        log.logMessage(logName, "trying to create other db", {});
        return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log)
            .pipe(
                catchError(error => {
                    if (error.exists) {
                        log.logMessage(logName, "other db already exists", {});
                        return deleteAndCreateDB();
                    }
                    return throwError(error);
                }),
                concatMap(result => {
                    result.log.complete();
                    log.logMessage(logName, "create db test", {});
                    return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
                }),
                concatMap(result => {
                    result.log.complete();
                    log.logMessage(logName, "loading test db", {});
                    return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
                }),
                concatMap( result => {
                    db1 = result.value;
                    result.log.complete();
                    log.logMessage(logName, "loading other db", {});
                    return PouchDBWrapper.loadExternalDB(otherDBConf, result.log);
                }),
                concatMap(result => {
                    db2 = result.value;
                    return of({db1: db1, db2: db2, log: result.log});
                })
            );
    }
    it("should push document from db1 to db2 in database sync", complete => {
        const logName = LOG_NAME + "_shouldPushDocument";
        const todo = new Todo("some todo");
        let sync: any;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }

        function checkGetAllDocumentsForPresenceOfDoc(db: PouchDBWrapper, log: Logger) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs: Todo[] = result.value;
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

        function subscribeToAddOnDB2(db: PouchDBWrapper, log: Logger) {
            log.complete();
            log.logMessage(logName, "subscribing to add on db2");
            db.docSaved$.subscribe({
                next(result) {
                    result.log.complete();
                    const doc: Todo = result.value;
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
        .pipe(
            concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                const {db1, db2, log} = result;
                log.complete();
                sync = PouchDBWrapper.syncDBs(db1, db2, log);
                subscribeToAddOnDB2(db2, log);
                return db1.saveDocument(todo, log);
            })
        )
        .subscribe({
            next(result: any) {
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

        let sync: any;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsForPresenceOfDoc(db: PouchDBWrapper, log: Logger) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs: Todo[] = result.value;
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

        function subscribeToAddOnDB1(db: PouchDBWrapper) {
            db.docSaved$.subscribe({
                next(result: ValueWithLogger) {
                    const doc: Todo = result.value;
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
            .pipe(
                concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                    const {db1, db2, log} = result;
                    sync = PouchDBWrapper.syncDBs(db1, db2, log);
                    subscribeToAddOnDB1(db1);
                    return db2.saveDocument(todo, log);
                })
            )
            .subscribe({
                next(result: any) {
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

        let sync: any;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db: PouchDBWrapper, log: Logger) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs: Todo[] = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }

        function subscribeToAddOnDB2(db1: PouchDBWrapper, db2: PouchDBWrapper) {
            db2.docSaved$.subscribe({
                next(result) {
                    const doc: Todo = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db2 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error(error) {
                    fail("db2 doc added error should not be here");
                    syncComplete();
                }
            });
        }
        function deleteDocument(db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger) {
            subscribeToDeleteOnDB2(db2);
            db1.deleteDocument(todo, log);
        }
        function subscribeToDeleteOnDB2(db: PouchDBWrapper) {
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
        .pipe(
            concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                const {db1, db2, log} = result;
                sync = PouchDBWrapper.syncDBs(db1, db2, log);
                subscribeToAddOnDB2(db1, db2);
                return db1.saveDocument(todo, log);
            })
        )
        .subscribe({
            next(result: any) {
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

        let sync: any;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db: PouchDBWrapper, log: Logger) {
            db.getAllDocuments(log).subscribe({
                next(result) {
                    const docs: Todo[] = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error(error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }

        function subscribeToAddOnDB1(db1: PouchDBWrapper, db2: PouchDBWrapper) {
            db1.docSaved$.subscribe({
                next(result) {
                    const doc: Todo = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db1 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error(error) {
                    fail("db1 doc added error should not be here");
                    syncComplete();
                }
            });
        }
        function deleteDocument(db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger) {
            subscribeToDeleteOnDB1(db1);
            db2.deleteDocument(todo, log);
        }
        function subscribeToDeleteOnDB1(db: PouchDBWrapper) {
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
            .pipe(
                concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                    const {db1, db2, log} = result;
                    sync = PouchDBWrapper.syncDBs(db1, db2, log);
                    subscribeToAddOnDB1(db1, db2);
                    return db2.saveDocument(todo, log);
                })
            )
            .subscribe({
                next(result: any) {
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
        let db1: PouchDBWrapper;
        let db2: PouchDBWrapper;
        let numberOfTodosAdded = 0;
        const waitingForDocAdded$ = new BehaviorSubject(0);

        function waitForDocsAddedToComplete() {
            waitingForDocAdded$.subscribe({
                next(addedNumber: number) {
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
                    const addedTodo: Todo = result.value;
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
        .pipe(
            concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                db1 = result.db1;
                db2 = result.db2;
                subscribeToDB2Add();
                return db1.saveDocument(todo, result.log);
            }),
            concatMap(result => {
                return db1.saveDocument(todo2, result.log);
            }),
            concatMap(result => {
                return db1.replicateTo(db2, result.log);
            }),
            concatMap(result => {
                return db2.getAllDocuments(result.log);
            })
        )
        .subscribe({
            next(result) {
                const todos: Todo[] = result.value;
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
        let db1: PouchDBWrapper;
        let db2: PouchDBWrapper;
        const deletedDocSubscribe$ = new BehaviorSubject(false);

        function subscribeToDB2Delete() {
            db2.docDeleted$.subscribe({
                next(result) {
                    const deletedDoc: DeletedDocument = result.value;
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
                next(deleted: boolean) {
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
            .pipe(
                concatMap((result: {db1: PouchDBWrapper, db2: PouchDBWrapper, log: Logger}) => {
                    db1 = result.db1;
                    db2 = result.db2;
                    subscribeToDB2Delete();
                    return db1.saveDocument(todo, result.log);
                }),
                concatMap(result => {
                    return db1.replicateTo(db2, result.log);
                }),
                concatMap(result => {
                    return db1.deleteDocument(todo, result.log);
                }),
                concatMap(result => {
                    return db1.replicateTo(db2, result.log);
                }),
                concatMap(result => {
                    return db2.getAllDocuments(result.log);
                })
            )
            .subscribe({
                next(result) {
                    const todos: Todo[] = result.value;
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
        let externalDB: PouchDBWrapper;
        let localDB: PouchDBWrapper;
        let externalDBChanges: PouchDBWrapper;
        let sync: any;
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(
            concatMap(result => PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log)),
            concatMap(result => {
                externalDB = result.value;
                return PouchDBWrapper.loadLocalDB(dbName, new TodoGenerator(), result.log);
            }),
            concatMap(result => {
                localDB = result.value;
                sync = PouchDBWrapper.syncDBs(localDB, externalDB, result.log);
                return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
            }),
            concatMap(result => {
                externalDBChanges = result.value;
                return of({externalDB, localDB, externalDBChanges, sync, log: result.log});
            })
        );
    }
    it("should emit documents when using listenToChanges", complete => {
        const todo = new Todo("some todo");
        let dbValues;
        let listenToChange: any;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(
            concatMap(result => {
                dbValues = result;
                subscribeToSavedDocument(dbValues.externalDBChanges, dbValues.log);
                return result.localDB.saveDocument(todo, dbValues.log);
            })
        ).subscribe(result => {
            result.log.complete();
        }, error => {
            fail(error + "");
            syncComplete();
        });
        function subscribeToSavedDocument(db: PouchDBWrapper, log: Logger) {
            listenToChange = db.listenToChanges(log);
            db.docSaved$.subscribe(next => {
                const doc: Todo = next.value;
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
        let listenToChange: any;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(
            concatMap(result => {
                dbValues = result;
                return result.localDB.saveDocument(todo, dbValues.log);
            }),
            concatMap(result => {
                subscribeToDeletedDocument(dbValues.externalDBChanges, dbValues.log);
                return dbValues.localDB.deleteDocument(todo, result.log);
            })
        ).subscribe(result => {
            console.log("result", result);
        }, error => {
            fail(error + "");
            syncComplete();
        });
        function subscribeToDeletedDocument(db: PouchDBWrapper, log: Logger) {
            listenToChange = db.listenToChanges(log);
            db.docDeleted$.subscribe(next => {
                const doc: DeletedDocument = next.value;
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
