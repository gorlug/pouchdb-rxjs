/// <reference path="../../../src/types/JasmineExtension.d.ts" />
import { PouchDBDocumentList } from "./PouchDBDocumentList";
import { PouchDBDocument, PouchDBDocumentJSON } from "./PouchDBDocument";
import { OperatorFunction } from "rxjs";
import { Logger, ValueWithLogger } from "./Logger";
interface ListItemImplementationJSON extends PouchDBDocumentJSON {
    name: string;
}
export declare class ListItemImplementation extends PouchDBDocument<ListItemImplementationJSON> {
    name: string;
    setNameTo(name: string): OperatorFunction<ValueWithLogger, ValueWithLogger>;
    addOrUpdateOn(list: ListImplementation): OperatorFunction<ValueWithLogger, {
        value: ListItemImplementation;
        log: Logger;
    }>;
    shouldHaveName(name: string): void;
    protected addValuesToJSONDocument(json: ListItemImplementationJSON): void;
    protected getNameOfDoc(): string;
}
declare class ListImplementation extends PouchDBDocumentList<ListItemImplementation> {
    getItemWithName(name: string): ListItemImplementation;
}
export {};
