import {Observable, OperatorFunction, of} from "rxjs";
import {Logger, ValueWithLogger} from "./Logger";
import {concatMap} from "rxjs/operators";

export class RxjsUtil {

    static operatorsToObservable(operators: (OperatorFunction<any, any>|OperatorFunction<any, any>[])[], log: Logger): Observable<any> {
        return RxjsUtil.pipeOperators(log.addTo(of("")), operators);
    }

    static operatorsToObservableAndEndStartLog(operators: (OperatorFunction<any, any>|OperatorFunction<any, any>[])[],
                                               log: Logger, startLog: Logger): Observable<any> {
        return RxjsUtil.operatorsToObservable(operators, log).pipe(
            concatMap((result: ValueWithLogger) => {
                startLog.complete();
                return result.log.addTo(of(result.value));
            })
        );
    }

    static pipeOperators(observable: Observable<any>, operators:
        (OperatorFunction<any, any>|OperatorFunction<any, any>[])[]): Observable<any> {
        operators.forEach((object: any) => {
            if (object.forEach === undefined) {
                const singleOperator = object as OperatorFunction<any, any>;
                observable = observable.pipe(singleOperator);
            } else {
                const operatorArray = object as OperatorFunction<any, any>[];
                observable = RxjsUtil.pipeOperators(observable, operatorArray);
            }
        });
        return observable;
    }

    static emptyOperator() {
        return concatMap((result: ValueWithLogger) => {
            return result.log.addTo(of(result.value));
        });
    }
}
