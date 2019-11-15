"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var RxjsUtil = /** @class */ (function () {
    function RxjsUtil() {
    }
    RxjsUtil.operatorsToObservable = function (operators, log) {
        return RxjsUtil.pipeOperators(log.addTo(rxjs_1.of("")), operators);
    };
    RxjsUtil.operatorsToObservableAndEndStartLog = function (operators, log, startLog) {
        return RxjsUtil.operatorsToObservable(operators, log).pipe(operators_1.concatMap(function (result) {
            startLog.complete();
            return result.log.addTo(rxjs_1.of(result.value));
        }));
    };
    RxjsUtil.pipeOperators = function (observable, operators) {
        operators.forEach(function (object) {
            if (object.forEach === undefined) {
                var singleOperator = object;
                observable = observable.pipe(singleOperator);
            }
            else {
                var operatorArray = object;
                observable = RxjsUtil.pipeOperators(observable, operatorArray);
            }
        });
        return observable;
    };
    RxjsUtil.emptyOperator = function () {
        return operators_1.concatMap(function (result) {
            return result.log.addTo(rxjs_1.of(result.value));
        });
    };
    return RxjsUtil;
}());
exports.RxjsUtil = RxjsUtil;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUnhqc1V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1J4anNVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkJBQXNEO0FBRXRELDRDQUF5QztBQUV6QztJQUFBO0lBbUNBLENBQUM7SUFqQ1UsOEJBQXFCLEdBQTVCLFVBQTZCLFNBQXNFLEVBQUUsR0FBVztRQUM1RyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRU0sNENBQW1DLEdBQTFDLFVBQTJDLFNBQXNFLEVBQ3RFLEdBQVcsRUFBRSxRQUFnQjtRQUNwRSxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUN0RCxxQkFBUyxDQUFDLFVBQUMsTUFBdUI7WUFDOUIsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUNMLENBQUM7SUFDTixDQUFDO0lBRU0sc0JBQWEsR0FBcEIsVUFBcUIsVUFBMkIsRUFBRSxTQUNhO1FBQzNELFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBQyxNQUFXO1lBQzFCLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLElBQU0sY0FBYyxHQUFHLE1BQW9DLENBQUM7Z0JBQzVELFVBQVUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQ2hEO2lCQUFNO2dCQUNILElBQU0sYUFBYSxHQUFHLE1BQXNDLENBQUM7Z0JBQzdELFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQzthQUNsRTtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxVQUFVLENBQUM7SUFDdEIsQ0FBQztJQUVNLHNCQUFhLEdBQXBCO1FBQ0ksT0FBTyxxQkFBUyxDQUFDLFVBQUMsTUFBdUI7WUFDckMsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQ0wsZUFBQztBQUFELENBQUMsQUFuQ0QsSUFtQ0M7QUFuQ1ksNEJBQVEifQ==