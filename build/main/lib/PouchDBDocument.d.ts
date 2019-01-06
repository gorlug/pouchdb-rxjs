export interface PouchDBDocumentJSON {
    _rev: string;
    _id: string;
}
export declare abstract class PouchDBDocument<JSONDocType extends PouchDBDocumentJSON> {
    protected _rev: string;
    protected _id: string;
    protected _deleted: boolean;
    protected samenessChecks: Array<SamenessChecker>;
    constructor();
    getId(): string;
    setId(id: string): void;
    updateRev(rev: string): void;
    getRev(): string;
    isTheSameDocumentAs(other: PouchDBDocument<JSONDocType>): boolean;
    isDeleted(): boolean;
    setDeleted(): void;
    isThisTheSame(other: PouchDBDocument<JSONDocType>): boolean;
    protected abstract addValuesToJSONDocument(json: JSONDocType): any;
    toDocument(): JSONDocType;
    getDebugInfo(): JSONDocType | {
        id: string;
        rev: string;
    };
}
/**
 * Implement this class to generate the specific document objects from the saved
 * PouchDB JSON.
 */
export declare abstract class PouchDBDocumentGenerator<T extends PouchDBDocument<any>> {
    protected abstract createDocument(json: any): T;
    fromJSON(json: any): T;
}
export declare type SamenessChecker = (other: any) => boolean;
