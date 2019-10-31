import {POUCHDB_WRAPPER_JSON_VERSION} from "./PouchDBWrapper";

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
export abstract class PouchDBDocument<JSONDocType extends PouchDBDocumentJSON> {

    protected _rev: string = null;
    protected _id: string;
    protected _deleted = false;
    protected docVersion: string;
    protected docName: string;
    protected debug = false;

    protected samenessChecks: Array<SamenessChecker> = [];

    constructor() {
        this._id = new Date().valueOf() + "";
        this.docVersion = POUCHDB_WRAPPER_JSON_VERSION;
        this.docName = this.getNameOfDoc();
    }

    protected abstract getNameOfDoc(): string;

    public getId(): string {
        return this._id;
    }

    public setId(id: string) {
        this._id = id;
    }

    public updateRev(rev: string): void {
        this._rev = rev;
    }

    public getRev(): string {
        return this._rev;
    }

    /**
     * Check if the given document is the same exact document with the same id.
     * @param other the given document
     * @returns whether the other document has the same id
     */
    public isTheSameDocumentAs(other: PouchDBDocument<JSONDocType>): boolean {
        return this._id === other._id;
    }

    public isDeleted(): boolean {
        return this._deleted;
    }

    public setDeleted() {
        this._deleted = true;
    }

    public getDocVersion() {
        return this.docVersion;
    }

    public setDocVersion(version: string) {
        this.docVersion = version;
    }

    public getDocName() {
        return this.docName;
    }

    public setDocName(name: string) {
        this.docName = name;
    }

    /**
     * In contrast to [[isTheSameDocumentAs]] this function checks all the values of the
     * document to see if those are the same.
     * @param other the other given document
     * @returns whether all values of both documents are equal
     */
    isThisTheSame(other: PouchDBDocument<JSONDocType>): boolean {
        return this.samenessChecks.every((checker: SamenessChecker) => {
            return checker(other);
        });
    }

    /**
     * In this method all JSON values that are inherent to that document are added.
     * @param json
     */
    protected abstract addValuesToJSONDocument(json: JSONDocType);

    /**
     * Creates a JSON document that can be saved to pouchdb.
     */
    toDocument(): JSONDocType {
        const json: any = {
            _id: this._id,
            _rev: this._rev,
            docVersion: this.docVersion,
            docName: this.docName
        };
        this.addValuesToJSONDocument(json);
        return json;
    }

    /**
     * If set to true all properties are returned when calling [[getDebugInfo]].
     * @param debug
     */
    setDebug(debug: boolean) {
        this.debug = debug;
    }

    isDebug() {
        return this.debug;
    }

    /**
     * Returns debug information of that document. By
     * default this is just the id, rev, version and name of
     * the document.
     */
    getDebugInfo() {
        if (this.debug) {
            return this.toDocument();
        }
        return {
            _id: this.getId(),
            _rev: this.getRev(),
            docVersion: this.getDocVersion(),
            docName: this.getNameOfDoc()
        };
    }
}

/**
 * Implement this class to generate the specific document objects from the saved
 * PouchDB JSON.
 */
export abstract class PouchDBDocumentGenerator<T extends PouchDBDocument<any>> {

    /**
     * Needs to be implemented to load all values inherent to the document.
     * @param json
     */
    protected abstract createDocument(json): T;

    fromJSON(json: any): T {
        const document: T = this.createDocument(json);
        document.setId(json._id);
        document.updateRev(json._rev);
        document.setDocVersion(json.docVersion);
        document.setDocName(json.docName);
        return document;
    }
}

export type SamenessChecker = (other: any) => boolean;

