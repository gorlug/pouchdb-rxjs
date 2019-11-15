import { Observable, OperatorFunction } from "rxjs";
import { Logger, ValueWithLogger } from "./Logger";
export declare class RxjsUtil {
    static operatorsToObservable(operators: (OperatorFunction<any, any> | OperatorFunction<any, any>[])[], log: Logger): Observable<any>;
    static operatorsToObservableAndEndStartLog(operators: (OperatorFunction<any, any> | OperatorFunction<any, any>[])[], log: Logger, startLog: Logger): Observable<any>;
    static pipeOperators(observable: Observable<any>, operators: (OperatorFunction<any, any> | OperatorFunction<any, any>[])[]): Observable<any>;
    static emptyOperator(): OperatorFunction<ValueWithLogger, ValueWithLogger>;
}
