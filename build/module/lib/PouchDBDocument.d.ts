/**
 * Base JSON interface for all JSON representations of pouchdb documents. Contains
 * _rev and _id needed by pouchdb.
 */
export interface PouchDBDocumentJSON {
    _rev: string;
    _id: string;
    docVersion: string;
    docName: string;
}
/**
 * Base class for pouchdb documents. Handles the export to the JSON document format
 * required by pouchdb. It also creates the id for each document.
 */
export declare abstract class PouchDBDocument<JSONDocType extends PouchDBDocumentJSON> {
    protected _rev: string;
    protected _id: string;
    protected _deleted: boolean;
    protected docVersion: string;
    protected docName: string;
    protected debug: boolean;
    protected samenessChecks: Array<SamenessChecker>;
    constructor();
    protected abstract getNameOfDoc(): string;
    getId(): string;
    setId(id: string): void;
    updateRev(rev: string): void;
    getRev(): string;
    /**
     * Check if the given document is the same exact document with the same id.
     * @param other the given document
     * @returns whether the other document has the same id
     */
    isTheSameDocumentAs(other: PouchDBDocument<JSONDocType>): boolean;
    isDeleted(): boolean;
    setDeleted(): void;
    getDocVersion(): string;
    setDocVersion(version: string): void;
    getDocName(): string;
    setDocName(name: string): void;
    /**
     * In contrast to [[isTheSameDocumentAs]] this function checks all the values of the
     * document to see if those are the same.
     * @param other the other given document
     * @returns whether all values of both documents are equal
     */
    isThisTheSame(other: PouchDBDocument<JSONDocType>): boolean;
    /**
     * In this method all JSON values that are inherent to that document are added.
     * @param json
     */
    protected abstract addValuesToJSONDocument(json: JSONDocType): any;
    /**
     * Creates a JSON document that can be saved to pouchdb.
     */
    toDocument(): JSONDocType;
    /**
     * If set to true all properties are returned when calling [[getDebugInfo]].
     * @param debug
     */
    setDebug(debug: boolean): void;
    isDebug(): boolean;
    /**
     * Returns debug information of that document. By
     * default this is just the id, rev, version and name of
     * the document.
     */
    getDebugInfo(): {
        _id: string;
        _rev: string;
        docVersion: string;
        docName: string;
    };
}
/**
 * Implement this class to generate the specific document objects from the saved
 * PouchDB JSON.
 */
export declare abstract class PouchDBDocumentGenerator<T extends PouchDBDocument<any>> {
    /**
     * Needs to be implemented to load all values inherent to the document.
     * @param json
     */
    protected abstract createDocument(json: any): T;
    fromJSON(json: any): T;
}
export declare type SamenessChecker = (other: any) => boolean;
