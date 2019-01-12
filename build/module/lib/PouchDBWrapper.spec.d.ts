import { PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON } from "./PouchDBDocument";
export interface TodoDocument extends PouchDBDocumentJSON {
    name: string;
}
export declare class Todo extends PouchDBDocument<TodoDocument> {
    name: string;
    constructor(name: string);
    getName(): string;
    setName(name: string): void;
    protected addValuesToJSONDocument(json: TodoDocument): void;
    toString(): string;
    private setSamenessChecks;
    protected getNameOfDoc(): string;
}
export declare class TodoGenerator extends PouchDBDocumentGenerator<Todo> {
    protected createDocument(json: TodoDocument): Todo;
}
