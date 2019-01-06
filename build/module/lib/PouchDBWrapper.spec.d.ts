import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
export interface TodoDocument {
    _id: string;
    _rev: string;
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
}
export declare class TodoGenerator extends PouchDBDocumentGenerator<Todo> {
    protected createDocument(json: TodoDocument): Todo;
}
