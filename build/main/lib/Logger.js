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
var uuid_1 = require("uuid");
var PouchDBDocument_1 = require("./PouchDBDocument");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var PouchDBWrapper_1 = require("./PouchDBWrapper");
var LogDocument = /** @class */ (function (_super) {
    __extends(LogDocument, _super);
    function LogDocument(name, msg) {
        var _this = _super.call(this) || this;
        _this.version = PouchDBWrapper_1.POUCHDB_WRAPPER_JSON_VERSION;
        _this._duration = -1;
        _this._id = uuid_1.v4();
        _this._timestamp = new Date().toISOString();
        _this._logName = name;
        _this._msg = msg;
        return _this;
    }
    Object.defineProperty(LogDocument.prototype, "error", {
        get: function () {
            return this._error;
        },
        set: function (value) {
            this._error = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "msg", {
        get: function () {
            return this._msg;
        },
        set: function (value) {
            this._msg = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "name", {
        get: function () {
            return this._logName;
        },
        set: function (value) {
            this._logName = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "trace", {
        get: function () {
            return this._trace;
        },
        set: function (value) {
            this._trace = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "params", {
        get: function () {
            return this._params;
        },
        set: function (value) {
            this.modifyPouchDBDocumentDebugOutput(value);
            this._params = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "duration", {
        get: function () {
            return this._duration;
        },
        set: function (value) {
            this._duration = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "run", {
        get: function () {
            return this._run;
        },
        set: function (value) {
            this._run = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LogDocument.prototype, "timestamp", {
        get: function () {
            return this._timestamp;
        },
        set: function (value) {
            this._timestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    LogDocument.prototype.setVersion = function (version) {
        this.version = version;
    };
    LogDocument.prototype.modifyPouchDBDocumentDebugOutput = function (params) {
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                var param = params[key];
                if (param instanceof PouchDBDocument_1.PouchDBDocument) {
                    var doc = param;
                    params[key] = doc.getDebugInfo();
                }
            }
        }
    };
    LogDocument.prototype.addValuesToJSONDocument = function (json) {
        json.msg = this._msg;
        json.name = this._logName;
        json.trace = this._trace;
        json.params = this._params;
        json.duration = this._duration;
        json.run = this._run;
        json.timestamp = this._timestamp;
        json.error = this._error;
        json.version = this.version;
    };
    LogDocument.prototype.toLogMessage = function () {
        var json = {};
        this.addValuesToJSONDocument(json);
        if (this._params === undefined) {
            delete json.params;
        }
        if (this._duration === -1) {
            delete json.duration;
        }
        if (this._run === undefined) {
            delete json.run;
        }
        if (this._error === undefined) {
            delete json.error;
        }
        return json;
    };
    LogDocument.prototype.getNameOfDoc = function () {
        return "LogDocument";
    };
    return LogDocument;
}(PouchDBDocument_1.PouchDBDocument));
exports.LogDocument = LogDocument;
var LogDocumentGenerator = /** @class */ (function (_super) {
    __extends(LogDocumentGenerator, _super);
    function LogDocumentGenerator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LogDocumentGenerator.prototype.createDocument = function (json) {
        var doc = new LogDocument(json.name, json.msg);
        doc.trace = json.trace;
        doc.params = json.params;
        doc.duration = json.duration;
        doc.run = json.run;
        doc.error = json.error;
        doc.timestamp = json.timestamp;
        doc.setVersion(json.version);
        return doc;
    };
    return LogDocumentGenerator;
}(PouchDBDocument_1.PouchDBDocumentGenerator));
exports.LogDocumentGenerator = LogDocumentGenerator;
/**
 * Logger used for tracing function calls. This can be achieved by using a trace id.
 */
var Logger = /** @class */ (function () {
    function Logger(name) {
        if (name === void 0) { name = ""; }
        this.startTime = -1;
        this.silent = false;
        this.name = name;
    }
    Logger.getLogger = function (name) {
        return new Logger(name);
    };
    /**
     * Creates a logger with a trace id.
     * @param name
     */
    Logger.getLoggerTrace = function (name) {
        if (name === void 0) { name = ""; }
        var logger = new Logger(name);
        logger.setTrace(Logger.generateTrace());
        return logger;
    };
    /**
     * Gets a logger with a trace id that will write logs to the given pouchdb.
     * @param db
     * @param name
     */
    Logger.getLoggerTraceWithDB = function (db, name) {
        if (name === void 0) { name = ""; }
        var logger = this.getLoggerTrace(name);
        logger.setLogDB(db);
        return logger;
    };
    Logger.generateTrace = function () {
        return uuid_1.v4();
    };
    Logger.prototype.setLogDB = function (logDB) {
        this.logDB = logDB;
    };
    Logger.prototype.getLogDB = function () {
        return this.logDB;
    };
    Logger.prototype.setSilent = function (silent) {
        this.silent = silent;
    };
    Logger.prototype.getSilent = function () {
        return this.silent;
    };
    Logger.prototype.setTrace = function (trace) {
        this.trace = trace;
    };
    Logger.prototype.getTrace = function () {
        return this.trace;
    };
    Logger.prototype.getName = function () {
        return this.name;
    };
    /**
     * Completes a previous [[start]] call by writing out the duration since the start
     * date.
     * @param error
     */
    Logger.prototype.complete = function (error) {
        if (this.startTime !== -1) {
            var observable = this.logEnd(this.name, this.dsc, this.params, this.startTime, error);
            this.startTime = -1;
            return observable;
        }
        return rxjs_1.of(this);
    };
    Logger.prototype.createLogDocument = function (name, dsc, params) {
        var message = new LogDocument(name, dsc);
        message.params = params;
        message.trace = this.trace;
        return message;
    };
    Logger.prototype.logMessage = function (name, dsc, params) {
        if (params === void 0) { params = {}; }
        return this.log(this.createLogDocument(name, dsc, params));
    };
    Logger.prototype.logError = function (name, dsc, error, params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        var message = this.createLogDocument(name, dsc, params);
        message.error = error;
        return this.log(message).pipe(operators_1.concatMap(function () { return _this.complete(error); }));
    };
    Logger.prototype.logErrorAndSendSubscriberErrorComplete = function (subscriber, name, dsc, error, params) {
        if (params === void 0) { params = {}; }
        this.logError(name, dsc, error, params);
        subscriber.error(error);
        subscriber.complete();
    };
    Logger.prototype.log = function (message) {
        if (this.silent) {
            return rxjs_1.of(this);
        }
        if (message.name === undefined) {
            message.name = this.name;
        }
        if (this.trace !== undefined) {
            message.trace = this.trace;
        }
        var logMessage = message.toLogMessage();
        console.log(logMessage);
        return this.logToDB(message);
    };
    Logger.prototype.logStart = function (name, dsc, params, trace, newTrace) {
        var start = new Date().getTime();
        var message = new LogDocument(name, dsc);
        message.params = params;
        message.run = "start";
        message.msg = dsc + " start";
        this.log(message);
        return start;
    };
    Logger.prototype.logEnd = function (name, dsc, params, start, error) {
        var duration = new Date().getTime() - start;
        var message = new LogDocument(name, dsc);
        message.params = params;
        message.duration = duration;
        message.run = "end";
        message.msg = dsc + " end";
        if (error !== undefined) {
            message.error = error;
        }
        return this.log(message);
    };
    /**
     * Log a message and also save the start date of the call.
     * @param name
     * @param dsc
     * @param params
     */
    Logger.prototype.start = function (name, dsc, params) {
        if (params === void 0) { params = {}; }
        this.complete();
        var log = new Logger(name);
        log.dsc = dsc;
        log.params = params;
        log.trace = this.trace;
        log.startTime = this.logStart(name, dsc, params, this.trace, log.trace);
        log.silent = this.silent;
        log.logDB = this.logDB;
        return log;
    };
    Logger.prototype.addTo = function (observable) {
        var _this = this;
        return observable.pipe(operators_1.concatMap(function (result) { return rxjs_1.of({ value: result, log: _this }); }));
    };
    Logger.prototype.addToValue = function (value) {
        return {
            value: value,
            log: this
        };
    };
    Logger.prototype.addToSubscriberNextAndComplete = function (subscriber, value) {
        this.complete();
        subscriber.next({ value: value, log: this });
        subscriber.complete();
    };
    Logger.prototype.logToDB = function (logMessage) {
        var _this = this;
        if (this.logDB !== undefined) {
            var log = new Logger("");
            log.setSilent(true);
            var saveRequest$ = this.logDB.saveDocument(logMessage, log).pipe(operators_1.share());
            saveRequest$.subscribe(function () {
            }, function (error) {
                console.log(error);
            });
            return saveRequest$.pipe(operators_1.concatMap(function () { return rxjs_1.of(_this); }));
        }
        return rxjs_1.of(this);
    };
    Logger.prototype.getDsc = function () {
        return this.dsc;
    };
    return Logger;
}());
exports.Logger = Logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Mb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQWdDO0FBQ2hDLHFEQUFpRztBQUNqRyw2QkFBZ0Q7QUFDaEQsNENBQWdEO0FBQ2hELG1EQUE4RTtBQW1COUU7SUFBaUMsK0JBQWdDO0lBNkU3RCxxQkFBWSxJQUFZLEVBQUUsR0FBVztRQUFyQyxZQUNJLGlCQUFPLFNBS1Y7UUFqRlMsYUFBTyxHQUFHLDZDQUE0QixDQUFDO1FBc0V6QyxlQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFPbkIsS0FBSSxDQUFDLEdBQUcsR0FBRyxTQUFJLEVBQUUsQ0FBQztRQUNsQixLQUFJLENBQUMsVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0MsS0FBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsS0FBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7O0lBQ3BCLENBQUM7SUEvRUQsc0JBQUksOEJBQUs7YUFBVDtZQUNJLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN2QixDQUFDO2FBRUQsVUFBVSxLQUFhO1lBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLENBQUM7OztPQUpBO0lBS0Qsc0JBQUksNEJBQUc7YUFBUDtZQUNJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyQixDQUFDO2FBRUQsVUFBUSxLQUFhO1lBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLENBQUM7OztPQUpBO0lBTUQsc0JBQUksNkJBQUk7YUFBUjtZQUNJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN6QixDQUFDO2FBRUQsVUFBUyxLQUFhO1lBQ2xCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQzFCLENBQUM7OztP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