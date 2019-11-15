import { Observable, OperatorFunction } from "rxjs";
import { ValueWithLogger, Logger } from "./Logger";
export declare class TestUtil {
    static operatorsToObservable(operators: (OperatorFunction<any, any> | OperatorFunction<any, any>[])[], log: Logger): Observable<any>;
    static pipeOperators(observable: Observable<any>, operators: (OperatorFunction<any, any> | OperatorFunction<any, any>[])[]): Observable<any>;
    static testComplete(endLog: Logger, observable: Observable<ValueWithLogger>, complete: Function): void;
    static runTest(name: string, logName: string, getLogger: Function, callback: Function): void;
}
