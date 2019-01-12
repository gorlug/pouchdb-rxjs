import {POUCHDB_WRAPPER_JSON_VERSION} from "./PouchDBWrapper";

export interface PouchDBDocumentJSON {
    _rev: string;
    _id: string;
    docVersion: string;
    docName: string;
}

const IS_FULL_DEBUG = true;

export abstract class PouchDBDocument<JSONDocType extends PouchDBDocumentJSON> {

    protected _rev: string = null;
    protected _id: string;
    protected _deleted = false;
    protected docVersion: string;
    protected docName: string;

    protected samenessChecks: Array<SamenessChecker> = [];

    constructor() {
        this._id = new Date().valueOf() + "";
        this.docVersion = POUCHDB_WRAPPER_JSON_VERSION;
        this.docName = this.getNameOfDoc();
        // this._rev = "0-1";
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

    isThisTheSame(other: PouchDBDocument<JSONDocType>): boolean {
        return this.samenessChecks.every((checker: SamenessChecker) => {
            return checker(other);
        });
    }

    protected abstract addValuesToJSONDocument(json: JSONDocType);

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

    getDebugInfo() {
        if (IS_FULL_DEBUG) {
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

