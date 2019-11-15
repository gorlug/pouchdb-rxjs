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
import { v4 as uuid } from "uuid";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { of } from "rxjs";
import { concatMap, share } from "rxjs/operators";
import { POUCHDB_WRAPPER_JSON_VERSION } from "./PouchDBWrapper";
var LogDocument = /** @class */ (function (_super) {
    __extends(LogDocument, _super);
    function LogDocument(name, msg) {
        var _this = _super.call(this) || this;
        _this.version = POUCHDB_WRAPPER_JSON_VERSION;
        _this._duration = -1;
        _this._id = uuid();
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
                if (param instanceof PouchDBDocument) {
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
}(PouchDBDocument));
export { LogDocument };
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
}(PouchDBDocumentGenerator));
export { LogDocumentGenerator };
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
        return uuid();
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
        return of(this);
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
        return this.log(message).pipe(concatMap(function () { return _this.complete(error); }));
    };
    Logger.prototype.logErrorAndSendSubscriberErrorComplete = function (subscriber, name, dsc, error, params) {
        if (params === void 0) { params = {}; }
        this.logError(name, dsc, error, params);
        subscriber.error(error);
        subscriber.complete();
    };
    Logger.prototype.log = function (message) {
        if (this.silent) {
            return of(this);
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
        return observable.pipe(concatMap(function (result) { return of({ value: result, log: _this }); }));
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
            var saveRequest$ = this.logDB.saveDocument(logMessage, log).pipe(share());
            saveRequest$.subscribe(function () {
            }, function (error) {
                console.log(error);
            });
            return saveRequest$.pipe(concatMap(function () { return of(_this); }));
        }
        return of(this);
    };
    Logger.prototype.getDsc = function () {
        return this.dsc;
    };
    return Logger;
}());
export { Logger };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Mb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBQyxFQUFFLElBQUksSUFBSSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBQ2hDLE9BQU8sRUFBQyxlQUFlLEVBQUUsd0JBQXdCLEVBQXNCLE1BQU0sbUJBQW1CLENBQUM7QUFDakcsT0FBTyxFQUFhLEVBQUUsRUFBYSxNQUFNLE1BQU0sQ0FBQztBQUNoRCxPQUFPLEVBQUMsU0FBUyxFQUFFLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ2hELE9BQU8sRUFBQyw0QkFBNEIsRUFBaUIsTUFBTSxrQkFBa0IsQ0FBQztBQW1COUU7SUFBaUMsK0JBQWdDO0lBNkU3RCxxQkFBWSxJQUFZLEVBQUUsR0FBVztRQUFyQyxZQUNJLGlCQUFPLFNBS1Y7UUFqRlMsYUFBTyxHQUFHLDRCQUE0QixDQUFDO1FBc0V6QyxlQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFPbkIsS0FBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztRQUNsQixLQUFJLENBQUMsVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0MsS0FBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsS0FBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7O0lBQ3BCLENBQUM7SUEvRUQsc0JBQUksOEJBQUs7YUFBVDtZQUNJLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN2QixDQUFDO2FBRUQsVUFBVSxLQUFhO1lBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLENBQUM7OztPQUpBO0lBS0Qsc0JBQUksNEJBQUc7YUFBUDtZQUNJLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyQixDQUFDO2FBRUQsVUFBUSxLQUFhO1lB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