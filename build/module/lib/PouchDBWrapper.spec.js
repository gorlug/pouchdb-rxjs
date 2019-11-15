var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { PouchDBWrapper } from "./PouchDBWrapper";
import { BehaviorSubject, of, throwError, zip } from "rxjs";
import { catchError, concatMap, tap } from "rxjs/operators";
import { CouchDBConf, CouchDBWrapper } from "./CouchDBWrapper";
import { Logger } from "./Logger";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { TestUtil } from "./TestUtil";
var Todo = /** @class */ (function (_super) {
    __extends(Todo, _super);
    function Todo(name) {
        var _this = _super.call(this) || this;
        _this.setSamenessChecks();
        _this.name = name;
        return _this;
    }
    Todo.prototype.getName = function () {
        return this.name;
    };
    Todo.prototype.setName = function (name) {
        this.name = name;
    };
    Todo.prototype.addValuesToJSONDocument = function (json) {
        json.name = this.name;
    };
    Todo.prototype.toString = function () {
        return "Todo: " + this.getName();
    };
    Todo.prototype.setSamenessChecks = function () {
        var _this = this;
        this.samenessChecks = [
            function (other) {
                return _this.name === other.name;
            }
        ];
    };
    Todo.prototype.getNameOfDoc = function () {
        return "Todo";
    };
    return Todo;
}(PouchDBDocument));
export { Todo };
var TodoGenerator = /** @class */ (function (_super) {
    __extends(TodoGenerator, _super);
    function TodoGenerator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TodoGenerator.prototype.createDocument = function (json) {
        var todo = new Todo(json.name);
        todo.setId(json._id);
        todo.updateRev(json._rev);
        return todo;
    };
    return TodoGenerator;
}(PouchDBDocumentGenerator));
export { TodoGenerator };
var LOCAL_COUCHDB_CREDENTIALS = {
    username: "admin",
    password: "admin"
};
var COUCHDB_CONF = new CouchDBConf();
COUCHDB_CONF.setHost("couchdb-test");
COUCHDB_CONF.setHttp();
COUCHDB_CONF.setPort(5984);
COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
var dbName = "test";
var credentials1 = {
    username: "testuser",
    password: "testpassword"
};
var credentials2 = {
    username: "testuser2",
    password: "testpassword2"
};
var LOG_NAME = "PouchDBWrapperTests";
var LOG_DB_CONF = new CouchDBConf();
LOG_DB_CONF.setDBName("dev-log");
LOG_DB_CONF.setPort(5984);
LOG_DB_CONF.setHost("couchdb-test");
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "admin",
    password: "admin"
});
var logDB;
describe("PouchDBWrapper tests", function () {
    var test = {
        completeLog: function (log, complete) {
            log.complete().subscribe({
                complete: function () {
                    complete();
                }
            });
        }
    };
    beforeAll(function (complete) {
        PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger.getLoggerTrace()).subscribe(function (result) {
            logDB = result.value;
            complete();
        });
    });
    function getLogger() {
        var log = Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    }
    beforeEach(function (complete) {
        COUCHDB_CONF.setDBName(dbName);
        COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
        var log = getLogger();
        var startLog = log.start(LOG_NAME, "beforeEach delete CouchDB " + dbName);
        CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(function (result) {
            log.logMessage(LOG_NAME, "destroy local db " + dbName, {});
            return PouchDBWrapper.destroyLocalDB(dbName, result.log);
        }), catchError(function (error) { return of(error); }), 
        // cleanup users
        concatMap(function (result) {
            log.logMessage(LOG_NAME, "delete user" + credentials1.username, {});
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials1.username, log);
        }), catchError(function (error) { return of(error); }), concatMap(function (result) {
            log.logMessage(LOG_NAME, "delete user" + credentials2.username, {});
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials2.username, log);
        }), catchError(function (error) { return of(error); }))
            .subscribe({
            next: function (response) {
                COUCHDB_CONF.setDBName(dbName);
                startLog.complete().pipe(tap(function () { return log.logMessage(LOG_NAME, "beforeEach end", { run: "end", response: response }); }))
                    .subscribe({
                    error: function (error) {
                        console.log("some error", error);
                        complete();
                    },
                    complete: function () {
                        complete();
                    }
                });
            },
            error: function (error) {
                COUCHDB_CONF.setDBName(dbName);
                startLog.logError(LOG_NAME, "beforeEach error", "something went wrong", { error: error }).subscribe({
                    error: function (innerError) {
                        console.log("some error", innerError);
                        complete();
                    },
                    complete: function () {
                        complete();
                    }
                });
            }
        });
    });
    it("should construct a couchdb AjaxRequest with authentication", function () {
        var log = getLogger();
        var conf = new CouchDBConf();
        conf.setHost("localhost");
        conf.setHttp();
        conf.setPort(5984);
        var credentials = {
            username: "admin",
            password: "admin"
        };
        conf.setCredentials(credentials);
        conf.setDBName("test");
        var request = conf.toRequest(log);
        expect(request.url).toBe("http://localhost:5984/test");
        expect(request.crossDomain).toBeTruthy();
        var headers = request.headers;
        expect(headers.Authorization).toBe("Basic YWRtaW46YWRtaW4=");
    });
    it("should create a new database", function (complete) {
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).subscribe({
            next: function (result) {
                result.log.complete();
                expect(result.value.status).toBe(201);
                complete();
            },
            error: function (error) {
                fail("database could not be created: " + error.status + ", " + JSON.stringify(error.response));
                complete();
            }
        });
    });
    it("should save and get a document", function (complete) {
        var doc = new Todo("some name");
        var dbWrapper;
        var savedTodo;
        console.log("doc rev", doc.getRev());
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(concatMap(function (result) {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            dbWrapper = result.value;
            return dbWrapper.saveDocument(doc, result.log);
        }), concatMap(function (result) {
            savedTodo = result.value;
            expect(savedTodo.getRev()).toMatch("1-.+");
            return dbWrapper.getDocument(savedTodo.getId(), result.log);
        })).subscribe({
            next: function (result) {
                result.log.complete();
                var todo = result.value;
                expect(todo.isThisTheSame(doc)).toBeTruthy();
                expect(todo.getRev()).toBe(savedTodo.getRev());
                complete();
            },
            error: function (error) {
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
    it("should get all documents", function (complete) {
        var doc1 = new Todo("some name");
        doc1.setId((new Date().getTime() - 100) + "");
        var doc2 = new Todo("some other name");
        var dbWrapper;
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        var log = getLogger();
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(function (result) {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            dbWrapper = result.value;
            var save1$ = dbWrapper.saveDocument(doc1, result.log);
            var save2$ = dbWrapper.saveDocument(doc2, result.log);
            return zip(save1$, save2$);
        }), concatMap(function (result) {
            result[0].log.complete();
            result[1].log.complete();
            expect(result.length).toBe(2);
            return dbWrapper.getAllDocuments(result[0].log);
        })).subscribe({
            next: function (result) {
                result.log.complete();
                var todos = result.value;
                expect(todos.length).toBe(2);
                console.log("todo index 0 name ", todos[0].getName(), "second", todos[1].getName());
                expect(todos[0].isThisTheSame(doc1)).toBeTruthy();
                expect(todos[1].isThisTheSame(doc2)).toBeTruthy();
                complete();
            },
            error: function (error) {
                console.log("error happened", error);
                fail("arrr there should not be an error yet here it is: " + JSON.stringify(error));
                complete();
            }
        });
    });
    function getPouchDBWrapperForTest(log) {
        if (log === void 0) { log = getLogger(); }
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(concatMap(function (result) {
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }));
    }
    var throw_error_on_a_non_exisating_document_string = "should throw an error on a non existing document";
    it(throw_error_on_a_non_exisating_document_string, function (complete) {
        var log = getLogger();
        var startLog = log.start(LOG_NAME, throw_error_on_a_non_exisating_document_string);
        getPouchDBWrapperForTest(log).pipe(concatMap(function (result) {
            return result.value.getDocument("1337", result.log);
        })).subscribe({
            next: function (result) {
                var failMsg = "should not be called since an error should be thrown";
                fail(failMsg);
                startLog.logError(LOG_NAME, throw_error_on_a_non_exisating_document_string, failMsg);
                complete();
            },
            error: function (error) {
                expect(error).toBe("document with id 1337 was not found");
                test.completeLog(startLog, complete);
            }
        });
    });
    it("should delete a document", function (complete) {
        var doc = new Todo("some name");
        var savedRev;
        var pouchdbWrapper;
        getPouchDBWrapperForTest().pipe(concatMap(function (result) {
            pouchdbWrapper = result.value;
            return result.value.saveDocument(doc, result.log);
        }), concatMap(function (result) {
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        }), concatMap(function (result) {
            var todo = result.value;
            expect(doc.isThisTheSame(todo)).toBeTruthy();
            savedRev = doc.getRev();
            return pouchdbWrapper.deleteDocument(doc, result.log);
        }), concatMap(function (result) {
            var todo = result.value;
            // todo should have a different rev as a deleted document
            expect(todo.getRev() !== savedRev).toBeTruthy();
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        })).subscribe({
            next: function (result) {
                fail("should not be called since an error should be thrown");
                complete();
            },
            error: function (error) {
                expect(error).toBe("document with id " + doc.getId() + " was not found");
                complete();
            }
        });
    });
    it("should create a user and delete it", function (complete) {
        var credentials = {
            username: "testuser",
            password: "testpassword"
        };
        var createResult;
        COUCHDB_CONF.setDBName(dbName);
        var log = getLogger();
        CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(catchError(function (error) {
            if (error.status === 412) {
                // that's ok
                return of("ok");
            }
            else {
                throw error;
            }
        }), concatMap(function (result) {
            COUCHDB_CONF.setDBName(dbName);
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials, log);
        }), concatMap(function (result) {
            createResult = result.value;
            return CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials.username, result.log);
        }))
            .subscribe({
            next: function (resultObject) {
                var result = resultObject.value;
                expect(result.ok).toBeTruthy();
                expect(result.id).toBe("org.couchdb.user:" + credentials.username);
                expect(createResult.ok).toBeTruthy();
                expect(createResult.id).toBe("org.couchdb.user:" + credentials.username);
                complete();
            },
            error: function (error) {
                console.log("some error", error.message);
                fail("there should not be an error here");
                complete();
            }
        });
    });
    it("should set the database authorization to allow only one user", function (complete) {
        var todo = new Todo("some todo");
        getPouchDBWrapperForTest().pipe(concatMap(function (result) {
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials1, result.log);
        }), concatMap(function (result) {
            return CouchDBWrapper.createUser(COUCHDB_CONF, credentials2, result.log);
        }), concatMap(function (result) {
            COUCHDB_CONF.setDBName("test");
            return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [credentials1.username], result.log);
        }), 
        // save with authorized user should work
        concatMap(function (result) {
            result.log.complete();
            COUCHDB_CONF.setCredentials(credentials1);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            return result.value.saveDocument(todo, result.log);
        }), concatMap(function (result) {
            var todoResult = result.value;
            expect(todoResult.isThisTheSame(todo)).toBeTruthy();
            // save with second unauthorized user should not work
            COUCHDB_CONF.setCredentials(credentials2);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            return result.value.saveDocument(todo, result.log);
        }))
            .subscribe({
            next: function (result) {
                fail("There should be an access not allowed error");
                complete();
            },
            error: function (error) {
                console.log("some error", error);
                expect(error).toBe("You are not allowed to access this db.");
                complete();
            }
        });
    });
    function createDB() {
        return concatMap(function (result) {
            return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        });
    }
    function getAuthorizedUsers() {
        return concatMap(function (result) {
            return CouchDBWrapper.getDBAuthorization(COUCHDB_CONF, result.log);
        });
    }
    TestUtil.runTest("should return all authorized users of a db", LOG_NAME, getLogger, function () {
        var user = "testUser";
        var steps = [
            createDB(),
            authorizeUser(user),
            getAuthorizedUsers(),
            authorizedUser_shouldInclude(user)
        ];
        return steps;
        function authorizeUser(username) {
            return concatMap(function (result) {
                return CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [username], result.log);
            });
        }
        function authorizedUser_shouldInclude(username) {
            return concatMap(function (result) {
                var authorized = result.value;
                expect(authorized.length).toBe(1);
                expect(authorized[0]).toBe(username);
                return result.log.addTo(of(result.value));
            });
        }
    });
    TestUtil.runTest("get authorized users of freshly created table should return an empty array", LOG_NAME, getLogger, function () {
        var steps = [
            createDB(),
            getAuthorizedUsers(),
            authorizedUsersArray_shouldBe_empty()
        ];
        return steps;
        function authorizedUsersArray_shouldBe_empty() {
            return concatMap(function (result) {
                expect(result.value.length).toBe(0);
                return of(result);
            });
        }
    });
    it("should emit an observable event if a new document is added", function (complete) {
        var todo = new Todo("some todo");
        function subscribeToAddDocumentObservable(db) {
            db.docSaved$.subscribe({
                next: function (result) {
                    var doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy();
                    complete();
                },
                error: function (error) {
                    fail("there should not be an error");
                    complete();
                }
            });
        }
        getPouchDBWrapperForTest()
            .subscribe({
            next: function (result) {
                var db = result.value;
                subscribeToAddDocumentObservable(db);
                db.saveDocument(todo, result.log).subscribe({
                    error: function (error) {
                        fail("there should not be an error");
                        complete();
                    }
                });
            },
            error: function (error) {
                fail("there should not be an error");
                complete();
            }
        });
    });
    it("should emit an observable event if a document is deleted", function (complete) {
        var todo = new Todo("some todo");
        function subscribeToDeleteDocumentObservable(db) {
            db.docDeleted$.subscribe({
                next: function (result) {
                    var deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id);
                    complete();
                },
                error: function (error) {
                    fail("there should not be an error when subscribing to docDeleted$");
                    complete();
                }
            });
        }
        getPouchDBWrapperForTest().pipe(concatMap(function (result) {
            return result.value.saveDocument(todo, result.log).pipe(concatMap(function (saveResult) {
                return of(result);
            }));
        }))
            .subscribe({
            next: function (result) {
                var db = result.value;
                subscribeToDeleteDocumentObservable(db);
                db.deleteDocument(todo, result.log).subscribe({
                    error: function (error) {
                        console.log("error", error);
                        fail("there should not be a delete document error");
                        complete();
                    }
                });
            },
            error: function (error) {
                fail("there should not be a get database error");
                complete();
            }
        });
    });
    function createSyncDatabases() {
        var logName = LOG_NAME + "_createSyncDatabases";
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        var otherDBConf = COUCHDB_CONF.clone();
        otherDBConf.setDBName("anothertest");
        var db1;
        var db2;
        var log = getLogger();
        function deleteAndCreateDB() {
            log.logMessage(logName, "deleting other db");
            return CouchDBWrapper.deleteCouchDBDatabase(otherDBConf, log).pipe(concatMap(function (result) {
                log.logMessage(logName, "creating other db again");
                return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log);
            }));
        }
        log.logMessage(logName, "trying to create other db", {});
        return CouchDBWrapper.createCouchDBDatabase(otherDBConf, log)
            .pipe(catchError(function (error) {
            if (error.exists) {
                log.logMessage(logName, "other db already exists", {});
                return deleteAndCreateDB();
            }
            return throwError(error);
        }), concatMap(function (result) {
            result.log.complete();
            log.logMessage(logName, "create db test", {});
            return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            result.log.complete();
            log.logMessage(logName, "loading test db", {});
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            db1 = result.value;
            result.log.complete();
            log.logMessage(logName, "loading other db", {});
            return PouchDBWrapper.loadExternalDB(otherDBConf, result.log);
        }), concatMap(function (result) {
            db2 = result.value;
            return of({ db1: db1, db2: db2, log: result.log });
        }));
    }
    it("should push document from db1 to db2 in database sync", function (complete) {
        var logName = LOG_NAME + "_shouldPushDocument";
        var todo = new Todo("some todo");
        var sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsForPresenceOfDoc(db, log) {
            db.getAllDocuments(log).subscribe({
                next: function (result) {
                    var docs = result.value;
                    expect(docs.length).toBe(1);
                    expect(docs[0].isThisTheSame(todo)).toBeTruthy();
                    syncComplete();
                },
                error: function (error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB2(db, log) {
            log.complete();
            log.logMessage(logName, "subscribing to add on db2");
            db.docSaved$.subscribe({
                next: function (result) {
                    result.log.complete();
                    var doc = result.value;
                    result.log.logMessage(logName, "received todo", doc.getDebugInfo());
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db2 truthy check");
                    checkGetAllDocumentsForPresenceOfDoc(db, result.log);
                },
                error: function (error) {
                    fail("db2 docadded error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            log.complete();
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB2(db2, log);
            return db1.saveDocument(todo, log);
        }))
            .subscribe({
            next: function (result) {
                result.log.complete();
                console.log("some result", result);
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should pull document from db2 to db1 in database sync", function (complete) {
        var todo = new Todo("some todo");
        var sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsForPresenceOfDoc(db, log) {
            db.getAllDocuments(log).subscribe({
                next: function (result) {
                    var docs = result.value;
                    expect(docs.length).toBe(1);
                    expect(docs[0].isThisTheSame(todo)).toBeTruthy();
                    syncComplete();
                },
                error: function (error) {
                    fail("there should not be an error when getting all documents of db1 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB1(db) {
            db.docSaved$.subscribe({
                next: function (result) {
                    var doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db1 truthy check");
                    checkGetAllDocumentsForPresenceOfDoc(db, result.log);
                },
                error: function (error) {
                    fail("db2 doc added error should not be here " + error);
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB1(db1);
            return db2.saveDocument(todo, log);
        }))
            .subscribe({
            next: function (result) {
                console.log("some result", result.response, result);
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should push document deletion from db1 to db2 in database sync", function (complete) {
        var todo = new Todo("some todo");
        var sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db, log) {
            db.getAllDocuments(log).subscribe({
                next: function (result) {
                    var docs = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error: function (error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB2(db1, db2) {
            db2.docSaved$.subscribe({
                next: function (result) {
                    var doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db2 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error: function (error) {
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
                next: function (result) {
                    var deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id, "db2 delete truthy check");
                    checkGetAllDocumentsReturnsAnEmptyArray(db, result.log);
                },
                error: function (error) {
                    fail("db2 doc deleted error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB2(db1, db2);
            return db1.saveDocument(todo, log);
        }))
            .subscribe({
            next: function (result) {
                console.log("some result", result.response, result);
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should pull document deletion from db2 to db1 in database sync", function (complete) {
        var todo = new Todo("some todo");
        var sync;
        function syncComplete() {
            if (sync) {
                console.log("canceling sync");
                sync.cancel();
            }
            complete();
        }
        function checkGetAllDocumentsReturnsAnEmptyArray(db, log) {
            db.getAllDocuments(log).subscribe({
                next: function (result) {
                    var docs = result.value;
                    expect(docs.length).toBe(0);
                    syncComplete();
                },
                error: function (error) {
                    fail("there should not be an error when getting all documents of db2 " + error);
                    syncComplete();
                }
            });
        }
        function subscribeToAddOnDB1(db1, db2) {
            db1.docSaved$.subscribe({
                next: function (result) {
                    var doc = result.value;
                    expect(todo.isThisTheSame(doc)).toBeTruthy("db1 docAdded truthy check");
                    deleteDocument(db1, db2, result.log);
                },
                error: function (error) {
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
                next: function (result) {
                    var deletedDoc = result.value;
                    expect(todo.getId()).toBe(deletedDoc._id, "db1 delete truthy check");
                    checkGetAllDocumentsReturnsAnEmptyArray(db, result.log);
                },
                error: function (error) {
                    fail("db1 doc deleted error should not be here");
                    syncComplete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper.syncDBs(db1, db2, log);
            subscribeToAddOnDB1(db1, db2);
            return db2.saveDocument(todo, log);
        }))
            .subscribe({
            next: function (result) {
                console.log("some result", result.response, result);
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                syncComplete();
            }
        });
    });
    it("should replicate documents from db1 to db2", function (complete) {
        var todo = new Todo("some todo");
        todo.setId((new Date().getTime() - 100) + "");
        var todo2 = new Todo("another todo");
        var db1;
        var db2;
        var numberOfTodosAdded = 0;
        var waitingForDocAdded$ = new BehaviorSubject(0);
        function waitForDocsAddedToComplete() {
            waitingForDocAdded$.subscribe({
                next: function (addedNumber) {
                    if (addedNumber === 2) {
                        complete();
                    }
                },
                error: function (error) {
                    fail("there should not be a waiting for doc added error " + error);
                    complete();
                }
            });
        }
        function subscribeToDB2Add() {
            db2.docSaved$.subscribe({
                next: function (result) {
                    var addedTodo = result.value;
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
                error: function (error) {
                    fail("there should not be a doc added error " + error);
                    complete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Add();
            return db1.saveDocument(todo, result.log);
        }), concatMap(function (result) {
            return db1.saveDocument(todo2, result.log);
        }), concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), concatMap(function (result) {
            return db2.getAllDocuments(result.log);
        }))
            .subscribe({
            next: function (result) {
                var todos = result.value;
                console.log("subscribe now in effect");
                expect(todos.length).toBe(2);
                waitForDocsAddedToComplete();
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                complete();
            }
        });
    });
    it("should correctly handle deletes on replicate", function (complete) {
        var todo = new Todo("some todo");
        var db1;
        var db2;
        var deletedDocSubscribe$ = new BehaviorSubject(false);
        function subscribeToDB2Delete() {
            db2.docDeleted$.subscribe({
                next: function (result) {
                    var deletedDoc = result.value;
                    expect(deletedDoc._id).toBe(todo.getId());
                    deletedDocSubscribe$.next(true);
                },
                error: function (error) {
                    fail("there should be no docDeleted error " + error);
                    complete();
                }
            });
        }
        function waitForDeletedDocSubscribe() {
            deletedDocSubscribe$.subscribe({
                next: function (deleted) {
                    if (deleted) {
                        complete();
                    }
                },
                error: function (error) {
                    fail("there sould be no waitForDeletedDocSubscribe error " + error);
                    complete();
                }
            });
        }
        createSyncDatabases()
            .pipe(concatMap(function (result) {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Delete();
            return db1.saveDocument(todo, result.log);
        }), concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), concatMap(function (result) {
            return db1.deleteDocument(todo, result.log);
        }), concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), concatMap(function (result) {
            return db2.getAllDocuments(result.log);
        }))
            .subscribe({
            next: function (result) {
                var todos = result.value;
                console.log("subscribe now in effect");
                expect(todos.length).toBe(0);
                waitForDeletedDocSubscribe();
            },
            error: function (error) {
                console.log("some error", error.message);
                fail(error + "");
                complete();
            }
        });
    });
    function createListenToChangesDatabses() {
        COUCHDB_CONF.setGenerator(new TodoGenerator());
        var externalDB;
        var localDB;
        var externalDBChanges;
        var sync;
        return CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(concatMap(function (result) { return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log); }), concatMap(function (result) {
            externalDB = result.value;
            return PouchDBWrapper.loadLocalDB(dbName, new TodoGenerator(), result.log);
        }), concatMap(function (result) {
            localDB = result.value;
            sync = PouchDBWrapper.syncDBs(localDB, externalDB, result.log);
            return PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), concatMap(function (result) {
            externalDBChanges = result.value;
            return of({ externalDB: externalDB, localDB: localDB, externalDBChanges: externalDBChanges, sync: sync, log: result.log });
        }));
    }
    it("should emit documents when using listenToChanges", function (complete) {
        var todo = new Todo("some todo");
        var dbValues;
        var listenToChange;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(concatMap(function (result) {
            dbValues = result;
            subscribeToSavedDocument(dbValues.externalDBChanges, dbValues.log);
            return result.localDB.saveDocument(todo, dbValues.log);
        })).subscribe(function (result) {
            result.log.complete();
        }, function (error) {
            fail(error + "");
            syncComplete();
        });
        function subscribeToSavedDocument(db, log) {
            listenToChange = db.listenToChanges(log);
            db.docSaved$.subscribe(function (next) {
                var doc = next.value;
                expect(doc.isTheSameDocumentAs(todo)).toBeTruthy();
                syncComplete();
            }, function (error) {
                fail(error + "");
                syncComplete();
            });
        }
    });
    it("should emit delete document when using listenToChanges", function (complete) {
        var todo = new Todo("some todo");
        var dbValues;
        var listenToChange;
        function syncComplete() {
            if (dbValues.sync) {
                console.log("canceling sync");
                dbValues.sync.cancel();
                listenToChange.cancel();
            }
            complete();
        }
        createListenToChangesDatabses().pipe(concatMap(function (result) {
            dbValues = result;
            return result.localDB.saveDocument(todo, dbValues.log);
        }), concatMap(function (result) {
            subscribeToDeletedDocument(dbValues.externalDBChanges, dbValues.log);
            return dbValues.localDB.deleteDocument(todo, result.log);
        })).subscribe(function (result) {
            console.log("result", result);
        }, function (error) {
            fail(error + "");
            syncComplete();
        });
        function subscribeToDeletedDocument(db, log) {
            listenToChange = db.listenToChanges(log);
            db.docDeleted$.subscribe(function (next) {
                var doc = next.value;
                expect(doc._id).toBe(todo.getId());
                syncComplete();
            }, function (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQldyYXBwZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFrQixjQUFjLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRSxPQUFPLEVBQUMsZUFBZSxFQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ3RFLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQzFELE9BQU8sRUFBQyxXQUFXLEVBQUUsY0FBYyxFQUFjLE1BQU0sa0JBQWtCLENBQUM7QUFDMUUsT0FBTyxFQUFDLE1BQU0sRUFBa0IsTUFBTSxVQUFVLENBQUM7QUFDakQsT0FBTyxFQUFDLGVBQWUsRUFBRSx3QkFBd0IsRUFBc0IsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBTXBDO0lBQTBCLHdCQUE2QjtJQUluRCxjQUFZLElBQVk7UUFBeEIsWUFDSSxpQkFBTyxTQUdWO1FBRkcsS0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsS0FBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7O0lBQ3JCLENBQUM7SUFFRCxzQkFBTyxHQUFQO1FBQ0ksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxzQkFBTyxHQUFQLFVBQVEsSUFBWTtRQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBR1Msc0NBQXVCLEdBQWpDLFVBQWtDLElBQWtCO1FBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMxQixDQUFDO0lBRUQsdUJBQVEsR0FBUjtRQUNJLE9BQU8s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