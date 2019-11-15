"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var RxjsUtil_1 = require("./RxjsUtil");
var TestUtil = /** @class */ (function () {
    function TestUtil() {
    }
    TestUtil.operatorsToObservable = function (operators, log) {
        return RxjsUtil_1.RxjsUtil.pipeOperators(log.addTo(rxjs_1.of("")), operators);
    };
    TestUtil.pipeOperators = function (observable, operators) {
        return RxjsUtil_1.RxjsUtil.pipeOperators(observable, operators);
    };
    TestUtil.testComplete = function (endLog, observable, complete) {
        observable.pipe(operators_1.concatMap(function (result) {
            return result.log.complete();
        }), operators_1.concatMap(function () {
            return endLog.complete();
        })).subscribe({
            next: function () {
                complete();
            },
            error: function (error) {
                endLog.logError(endLog.getName(), "complete fail", error + "");
                fail("" + error);
                complete();
            },
            complete: function () {
                complete();
            }
        });
    };
    TestUtil.runTest = function (name, logName, getLogger, callback) {
        it(name, function (complete) {
            var log = getLogger();
            var startLog = log.start(logName, name);
            var steps = callback();
            var observable = TestUtil.operatorsToObservable(steps, log);
            TestUtil.testComplete(startLog, observable, complete);
        });
    };
    return TestUtil;
}());
exports.TestUtil = TestUtil;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVzdFV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1Rlc3RVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQXNEO0FBRXRELDRDQUF5QztBQUN6Qyx1Q0FBb0M7QUFFcEM7SUFBQTtJQTJDQSxDQUFDO0lBekNVLDhCQUFxQixHQUE1QixVQUE2QixTQUFzRSxFQUFFLEdBQVc7UUFDNUcsT0FBTyxtQkFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTSxzQkFBYSxHQUFwQixVQUFxQixVQUEyQixFQUFFLFNBQ2E7UUFDM0QsT0FBTyxtQkFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVNLHFCQUFZLEdBQW5CLFVBQW9CLE1BQWMsRUFBRSxVQUF1QyxFQUFFLFFBQWtCO1FBQzNGLFVBQVUsQ0FBQyxJQUFJLENBQ1gscUJBQVMsQ0FBQyxVQUFDLE1BQXVCO1lBQzlCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUMsRUFDRixxQkFBUyxDQUFDO1lBQ04sT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQ0wsQ0FBQyxTQUFTLENBQUM7WUFDUixJQUFJO2dCQUNBLFFBQVEsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELEtBQUssWUFBQyxLQUFLO2dCQUNQLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7Z0JBQ2pCLFFBQVEsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELFFBQVE7Z0JBQ0osUUFBUSxFQUFFLENBQUM7WUFDZixDQUFDO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLGdCQUFPLEdBQWQsVUFBZSxJQUFZLEVBQUUsT0FBZSxFQUFFLFNBQW1CLEVBQUUsUUFBa0I7UUFDakYsRUFBRSxDQUFDLElBQUksRUFBRSxVQUFBLFFBQVE7WUFDYixJQUFNLEdBQUcsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUN4QixJQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFNLEtBQUssR0FBRyxRQUFRLEVBQUUsQ0FBQztZQUN6QixJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlELFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFDTCxlQUFDO0FBQUQsQ0FBQyxBQTNDRCxJQTJDQztBQTNDWSw0QkFBUSJ9