import { of } from "rxjs";
import { concatMap } from "rxjs/operators";
import { RxjsUtil } from "./RxjsUtil";
var TestUtil = /** @class */ (function () {
    function TestUtil() {
    }
    TestUtil.operatorsToObservable = function (operators, log) {
        return RxjsUtil.pipeOperators(log.addTo(of("")), operators);
    };
    TestUtil.pipeOperators = function (observable, operators) {
        return RxjsUtil.pipeOperators(observable, operators);
    };
    TestUtil.testComplete = function (endLog, observable, complete) {
        observable.pipe(concatMap(function (result) {
            return result.log.complete();
        }), concatMap(function () {
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
export { TestUtil };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVzdFV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1Rlc3RVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBYSxFQUFFLEVBQW1CLE1BQU0sTUFBTSxDQUFDO0FBRXRELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6QyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBRXBDO0lBQUE7SUEyQ0EsQ0FBQztJQXpDVSw4QkFBcUIsR0FBNUIsVUFBNkIsU0FBc0UsRUFBRSxHQUFXO1FBQzVHLE9BQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTSxzQkFBYSxHQUFwQixVQUFxQixVQUEyQixFQUFFLFNBQ2E7UUFDM0QsT0FBTyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU0scUJBQVksR0FBbkIsVUFBb0IsTUFBYyxFQUFFLFVBQXVDLEVBQUUsUUFBa0I7UUFDM0YsVUFBVSxDQUFDLElBQUksQ0FDWCxTQUFTLENBQUMsVUFBQyxNQUF1QjtZQUM5QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakMsQ0FBQyxDQUFDLEVBQ0YsU0FBUyxDQUFDO1lBQ04sT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQ0wsQ0FBQyxTQUFTLENBQUM7WUFDUixJQUFJO2dCQUNBLFFBQVEsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELEtBQUssWUFBQyxLQUFLO2dCQUNQLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7Z0JBQ2pCLFFBQVEsRUFBRSxDQUFDO1lBQ2YsQ0FBQztZQUNELFFBQVE7Z0JBQ0osUUFBUSxFQUFFLENBQUM7WUFDZixDQUFDO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVNLGdCQUFPLEdBQWQsVUFBZSxJQUFZLEVBQUUsT0FBZSxFQUFFLFNBQW1CLEVBQUUsUUFBa0I7UUFDakYsRUFBRSxDQUFDLElBQUksRUFBRSxVQUFBLFFBQVE7WUFDYixJQUFNLEdBQUcsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUN4QixJQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFNLEtBQUssR0FBRyxRQUFRLEVBQUUsQ0FBQztZQUN6QixJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlELFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFDTCxlQUFDO0FBQUQsQ0FBQyxBQTNDRCxJQTJDQyJ9