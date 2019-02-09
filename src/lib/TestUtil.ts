import {Observable, of, OperatorFunction} from "rxjs";
import {ValueWithLogger, Logger} from "./Logger";
import {concatMap} from "rxjs/operators";
import {RxjsUtil} from "./RxjsUtil";

export class TestUtil {

    static operatorsToObservable(operators: (OperatorFunction<any, any>|OperatorFunction<any, any>[])[], log: Logger): Observable<any> {
        return RxjsUtil.pipeOperators(log.addTo(of("")), operators);
    }

    static pipeOperators(observable: Observable<any>, operators:
        (OperatorFunction<any, any>|OperatorFunction<any, any>[])[]): Observable<any> {
        return RxjsUtil.pipeOperators(observable, operators);
    }

    static testComplete(endLog: Logger, observable: Observable<ValueWithLogger>, complete: Function) {
        observable.pipe(
            concatMap((result: ValueWithLogger) => {
                return result.log.complete();
            }),
            concatMap(() => {
                return endLog.complete();
            })
        ).subscribe({
            next() {
                complete();
            },
            error(error) {
                endLog.logError(endLog.getName(), "complete fail", error + "");
                fail("" + error);
                complete();
            },
            complete() {
                complete();
            }
        });
    }
}
