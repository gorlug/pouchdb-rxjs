import { of } from "rxjs";
import { concatMap } from "rxjs/operators";
var RxjsUtil = /** @class */ (function () {
    function RxjsUtil() {
    }
    RxjsUtil.operatorsToObservable = function (operators, log) {
        return RxjsUtil.pipeOperators(log.addTo(of("")), operators);
    };
    RxjsUtil.operatorsToObservableAndEndStartLog = function (operators, log, startLog) {
        return RxjsUtil.operatorsToObservable(operators, log).pipe(concatMap(function (result) {
            startLog.complete();
            return result.log.addTo(of(result.value));
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
        return concatMap(function (result) {
            return result.log.addTo(of(result.value));
        });
    };
    return RxjsUtil;
}());
export { RxjsUtil };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUnhqc1V0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL1J4anNVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBK0IsRUFBRSxFQUFDLE1BQU0sTUFBTSxDQUFDO0FBRXRELE9BQU8sRUFBQyxTQUFTLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUV6QztJQUFBO0lBbUNBLENBQUM7SUFqQ1UsOEJBQXFCLEdBQTVCLFVBQTZCLFNBQXNFLEVBQUUsR0FBVztRQUM1RyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRU0sNENBQW1DLEdBQTFDLFVBQTJDLFNBQXNFLEVBQ3RFLEdBQVcsRUFBRSxRQUFnQjtRQUNwRSxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUN0RCxTQUFTLENBQUMsVUFBQyxNQUF1QjtZQUM5QixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQ0wsQ0FBQztJQUNOLENBQUM7SUFFTSxzQkFBYSxHQUFwQixVQUFxQixVQUEyQixFQUFFLFNBQ2E7UUFDM0QsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFDLE1BQVc7WUFDMUIsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRTtnQkFDOUIsSUFBTSxjQUFjLEdBQUcsTUFBb0MsQ0FBQztnQkFDNUQsVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDaEQ7aUJBQU07Z0JBQ0gsSUFBTSxhQUFhLEdBQUcsTUFBc0MsQ0FBQztnQkFDN0QsVUFBVSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2FBQ2xFO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLFVBQVUsQ0FBQztJQUN0QixDQUFDO0lBRU0sc0JBQWEsR0FBcEI7UUFDSSxPQUFPLFNBQVMsQ0FBQyxVQUFDLE1BQXVCO1lBQ3JDLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNMLGVBQUM7QUFBRCxDQUFDLEFBbkNELElBbUNDIn0=