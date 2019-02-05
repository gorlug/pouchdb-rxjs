import {Observable, of, OperatorFunction} from "rxjs";
import {ValueWithLogger, Logger} from "./Logger";
import {concatMap} from "rxjs/operators";

export class TestUtil {

    static operatorsToObservable(operators: (OperatorFunction<any, any>|OperatorFunction<any, any>[])[], log: Logger): Observable<any> {
        return TestUtil.pipeOperators(log.addTo(of("")), operators);
    }

    static pipeOperators(observable: Observable<any>, operators:
        (OperatorFunction<any, any>|OperatorFunction<any, any>[])[]): Observable<any> {
        operators.forEach((object: any) => {
            if (object.forEach === undefined) {
                const singleOperator = object as OperatorFunction<any, any>;
                observable = observable.pipe(singleOperator);
            } else {
                const operatorArray = object as OperatorFunction<any, any>[];
                observable = TestUtil.pipeOperators(observable, operatorArray);
            }
        });
        return observable;
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
