export interface PouchDBDocumentJSON {
    _rev: string;
    _id: string;
}

const IS_FULL_DEBUG = true;

export abstract class PouchDBDocument<JSONDocType extends PouchDBDocumentJSON> {

    protected _rev: string = null;
    protected _id: string;
    protected _deleted = false;

    protected samenessChecks: Array<SamenessChecker> = [];

    constructor() {
        this._id = new Date().valueOf() + "";
        // this._rev = "0-1";
    }

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

    isThisTheSame(other: PouchDBDocument<JSONDocType>): boolean {
        return this.samenessChecks.every((checker: SamenessChecker) => {
            return checker(other);
        });
    }

    protected abstract addValuesToJSONDocument(json: JSONDocType);

    toDocument(): JSONDocType {
        const json: any = {
            _id: this._id,
            _rev: this._rev
        };
        this.addValuesToJSONDocument(json);
        return json;
    }

    getDebugInfo() {
        if (IS_FULL_DEBUG) {
            return this.toDocument();
        }
        return {
            id: this.getId(),
            rev: this.getRev()
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
        return document;
    }
}

export type SamenessChecker = (other: any) => boolean;

