"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var PouchDBWrapper_1 = require("./PouchDBWrapper");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var CouchDBWrapper_1 = require("./CouchDBWrapper");
var Logger_1 = require("./Logger");
var PouchDBDocument_1 = require("./PouchDBDocument");
var TestUtil_1 = require("./TestUtil");
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
}(PouchDBDocument_1.PouchDBDocument));
exports.Todo = Todo;
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
}(PouchDBDocument_1.PouchDBDocumentGenerator));
exports.TodoGenerator = TodoGenerator;
var LOCAL_COUCHDB_CREDENTIALS = {
    username: "admin",
    password: "admin"
};
var COUCHDB_CONF = new CouchDBWrapper_1.CouchDBConf();
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
var LOG_DB_CONF = new CouchDBWrapper_1.CouchDBConf();
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
        PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger_1.Logger.getLoggerTrace()).subscribe(function (result) {
            logDB = result.value;
            complete();
        });
    });
    function getLogger() {
        var log = Logger_1.Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    }
    beforeEach(function (complete) {
        COUCHDB_CONF.setDBName(dbName);
        COUCHDB_CONF.setCredentials(LOCAL_COUCHDB_CREDENTIALS);
        var log = getLogger();
        var startLog = log.start(LOG_NAME, "beforeEach delete CouchDB " + dbName);
        CouchDBWrapper_1.CouchDBWrapper.deleteCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(function (result) {
            log.logMessage(LOG_NAME, "destroy local db " + dbName, {});
            return PouchDBWrapper_1.PouchDBWrapper.destroyLocalDB(dbName, result.log);
        }), operators_1.catchError(function (error) { return rxjs_1.of(error); }), 
        // cleanup users
        operators_1.concatMap(function (result) {
            log.logMessage(LOG_NAME, "delete user" + credentials1.username, {});
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials1.username, log);
        }), operators_1.catchError(function (error) { return rxjs_1.of(error); }), operators_1.concatMap(function (result) {
            log.logMessage(LOG_NAME, "delete user" + credentials2.username, {});
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials2.username, log);
        }), operators_1.catchError(function (error) { return rxjs_1.of(error); }))
            .subscribe({
            next: function (response) {
                COUCHDB_CONF.setDBName(dbName);
                startLog.complete().pipe(operators_1.tap(function () { return log.logMessage(LOG_NAME, "beforeEach end", { run: "end", response: response }); }))
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
        var conf = new CouchDBWrapper_1.CouchDBConf();
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
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).subscribe({
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
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(operators_1.concatMap(function (result) {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            dbWrapper = result.value;
            return dbWrapper.saveDocument(doc, result.log);
        }), operators_1.concatMap(function (result) {
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
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(function (result) {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            dbWrapper = result.value;
            var save1$ = dbWrapper.saveDocument(doc1, result.log);
            var save2$ = dbWrapper.saveDocument(doc2, result.log);
            return rxjs_1.zip(save1$, save2$);
        }), operators_1.concatMap(function (result) {
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
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.concatMap(function (result) {
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }));
    }
    var throw_error_on_a_non_exisating_document_string = "should throw an error on a non existing document";
    it(throw_error_on_a_non_exisating_document_string, function (complete) {
        var log = getLogger();
        var startLog = log.start(LOG_NAME, throw_error_on_a_non_exisating_document_string);
        getPouchDBWrapperForTest(log).pipe(operators_1.concatMap(function (result) {
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
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(function (result) {
            pouchdbWrapper = result.value;
            return result.value.saveDocument(doc, result.log);
        }), operators_1.concatMap(function (result) {
            return pouchdbWrapper.getDocument(doc.getId(), result.log);
        }), operators_1.concatMap(function (result) {
            var todo = result.value;
            expect(doc.isThisTheSame(todo)).toBeTruthy();
            savedRev = doc.getRev();
            return pouchdbWrapper.deleteDocument(doc, result.log);
        }), operators_1.concatMap(function (result) {
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
        CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, log).pipe(operators_1.catchError(function (error) {
            if (error.status === 412) {
                // that's ok
                return rxjs_1.of("ok");
            }
            else {
                throw error;
            }
        }), operators_1.concatMap(function (result) {
            COUCHDB_CONF.setDBName(dbName);
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials, log);
        }), operators_1.concatMap(function (result) {
            createResult = result.value;
            return CouchDBWrapper_1.CouchDBWrapper.deleteUser(COUCHDB_CONF, credentials.username, result.log);
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
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(function (result) {
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials1, result.log);
        }), operators_1.concatMap(function (result) {
            return CouchDBWrapper_1.CouchDBWrapper.createUser(COUCHDB_CONF, credentials2, result.log);
        }), operators_1.concatMap(function (result) {
            COUCHDB_CONF.setDBName("test");
            return CouchDBWrapper_1.CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [credentials1.username], result.log);
        }), 
        // save with authorized user should work
        operators_1.concatMap(function (result) {
            result.log.complete();
            COUCHDB_CONF.setCredentials(credentials1);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            return result.value.saveDocument(todo, result.log);
        }), operators_1.concatMap(function (result) {
            var todoResult = result.value;
            expect(todoResult.isThisTheSame(todo)).toBeTruthy();
            // save with second unauthorized user should not work
            COUCHDB_CONF.setCredentials(credentials2);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
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
        return operators_1.concatMap(function (result) {
            return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        });
    }
    function getAuthorizedUsers() {
        return operators_1.concatMap(function (result) {
            return CouchDBWrapper_1.CouchDBWrapper.getDBAuthorization(COUCHDB_CONF, result.log);
        });
    }
    TestUtil_1.TestUtil.runTest("should return all authorized users of a db", LOG_NAME, getLogger, function () {
        var user = "testUser";
        var steps = [
            createDB(),
            authorizeUser(user),
            getAuthorizedUsers(),
            authorizedUser_shouldInclude(user)
        ];
        return steps;
        function authorizeUser(username) {
            return operators_1.concatMap(function (result) {
                return CouchDBWrapper_1.CouchDBWrapper.setDBAuthorization(COUCHDB_CONF, [username], result.log);
            });
        }
        function authorizedUser_shouldInclude(username) {
            return operators_1.concatMap(function (result) {
                var authorized = result.value;
                expect(authorized.length).toBe(1);
                expect(authorized[0]).toBe(username);
                return result.log.addTo(rxjs_1.of(result.value));
            });
        }
    });
    TestUtil_1.TestUtil.runTest("get authorized users of freshly created table should return an empty array", LOG_NAME, getLogger, function () {
        var steps = [
            createDB(),
            getAuthorizedUsers(),
            authorizedUsersArray_shouldBe_empty()
        ];
        return steps;
        function authorizedUsersArray_shouldBe_empty() {
            return operators_1.concatMap(function (result) {
                expect(result.value.length).toBe(0);
                return rxjs_1.of(result);
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
        getPouchDBWrapperForTest().pipe(operators_1.concatMap(function (result) {
            return result.value.saveDocument(todo, result.log).pipe(operators_1.concatMap(function (saveResult) {
                return rxjs_1.of(result);
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
            return CouchDBWrapper_1.CouchDBWrapper.deleteCouchDBDatabase(otherDBConf, log).pipe(operators_1.concatMap(function (result) {
                log.logMessage(logName, "creating other db again");
                return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(otherDBConf, log);
            }));
        }
        log.logMessage(logName, "trying to create other db", {});
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(otherDBConf, log)
            .pipe(operators_1.catchError(function (error) {
            if (error.exists) {
                log.logMessage(logName, "other db already exists", {});
                return deleteAndCreateDB();
            }
            return rxjs_1.throwError(error);
        }), operators_1.concatMap(function (result) {
            result.log.complete();
            log.logMessage(logName, "create db test", {});
            return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            result.log.complete();
            log.logMessage(logName, "loading test db", {});
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            db1 = result.value;
            result.log.complete();
            log.logMessage(logName, "loading other db", {});
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(otherDBConf, result.log);
        }), operators_1.concatMap(function (result) {
            db2 = result.value;
            return rxjs_1.of({ db1: db1, db2: db2, log: result.log });
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
            .pipe(operators_1.concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            log.complete();
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(operators_1.concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(operators_1.concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
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
            .pipe(operators_1.concatMap(function (result) {
            var db1 = result.db1, db2 = result.db2, log = result.log;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(db1, db2, log);
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
        var waitingForDocAdded$ = new rxjs_1.BehaviorSubject(0);
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
            .pipe(operators_1.concatMap(function (result) {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Add();
            return db1.saveDocument(todo, result.log);
        }), operators_1.concatMap(function (result) {
            return db1.saveDocument(todo2, result.log);
        }), operators_1.concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(function (result) {
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
        var deletedDocSubscribe$ = new rxjs_1.BehaviorSubject(false);
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
            .pipe(operators_1.concatMap(function (result) {
            db1 = result.db1;
            db2 = result.db2;
            subscribeToDB2Delete();
            return db1.saveDocument(todo, result.log);
        }), operators_1.concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(function (result) {
            return db1.deleteDocument(todo, result.log);
        }), operators_1.concatMap(function (result) {
            return db1.replicateTo(db2, result.log);
        }), operators_1.concatMap(function (result) {
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
        return CouchDBWrapper_1.CouchDBWrapper.createCouchDBDatabase(COUCHDB_CONF, getLogger()).pipe(operators_1.concatMap(function (result) { return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log); }), operators_1.concatMap(function (result) {
            externalDB = result.value;
            return PouchDBWrapper_1.PouchDBWrapper.loadLocalDB(dbName, new TodoGenerator(), result.log);
        }), operators_1.concatMap(function (result) {
            localDB = result.value;
            sync = PouchDBWrapper_1.PouchDBWrapper.syncDBs(localDB, externalDB, result.log);
            return PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(COUCHDB_CONF, result.log);
        }), operators_1.concatMap(function (result) {
            externalDBChanges = result.value;
            return rxjs_1.of({ externalDB: externalDB, localDB: localDB, externalDBChanges: externalDBChanges, sync: sync, log: result.log });
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
        createListenToChangesDatabses().pipe(operators_1.concatMap(function (result) {
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
        createListenToChangesDatabses().pipe(operators_1.concatMap(function (result) {
            dbValues = result;
            return result.localDB.saveDocument(todo, dbValues.log);
        }), operators_1.concatMap(function (result) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQldyYXBwZXIuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQldyYXBwZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtREFBaUU7QUFDakUsNkJBQXNFO0FBQ3RFLDRDQUEwRDtBQUMxRCxtREFBMEU7QUFDMUUsbUNBQWlEO0FBQ2pELHFEQUFpRztBQUNqRyx1Q0FBb0M7QUFNcEM7SUFBMEIsd0JBQTZCO0lBSW5ELGNBQVksSUFBWTtRQUF4QixZQUNJLGlCQUFPLFNBR1Y7UUFGRyxLQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzs7SUFDckIsQ0FBQztJQUVELHNCQUFPLEdBQVA7UUFDSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVELHNCQUFPLEdBQVAsVUFBUSxJQUFZO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFHUyxzQ0FBdUIsR0FBakMsVUFBa0MsSUFBa0I7UUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQzFCLENBQUM7SUFFRCx1QkFBUSxHQUFSO1FBQ0ksT0FBTyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFFTyxnQ0FBaUIsR0FBekI7UUFBQSxpQkFNQztRQUxHLElBQUksQ0FBQyxjQUFjLEdBQUc7WUFDbEIsVUFBQyxLQUFXO2dCQUNSLE9BQU8sS0FBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ3BDLENBQUM7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVTLDJCQUFZLEdBQXRCO1FBQ0ksT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUNMLFdBQUM7QUFBRCxDQUFDLEFBdENELENBQTBC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