"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PouchDBWrapper_1 = require("./PouchDBWrapper");
const IS_FULL_DEBUG = true;
class PouchDBDocument {
    constructor() {
        this._rev = null;
        this._deleted = false;
        this.samenessChecks = [];
        this._id = new Date().valueOf() + "";
        this.docVersion = PouchDBWrapper_1.POUCHDB_WRAPPER_JSON_VERSION;
        this.docName = this.getNameOfDoc();
        // this._rev = "0-1";
    }
    getId() {
        return this._id;
    }
    setId(id) {
        this._id = id;
    }
    updateRev(rev) {
        this._rev = rev;
    }
    getRev() {
        return this._rev;
    }
    isTheSameDocumentAs(other) {
        return this._id === other._id;
    }
    isDeleted() {
        return this._deleted;
    }
    setDeleted() {
        this._deleted = true;
    }
    getDocVersion() {
        return this.docVersion;
    }
    setDocVersion(version) {
        this.docVersion = version;
    }
    getDocName() {
        return this.docName;
    }
    setDocName(name) {
        this.docName = name;
    }
    isThisTheSame(other) {
        return this.samenessChecks.every((checker) => {
            return checker(other);
        });
    }
    toDocument() {
        const json = {
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
exports.PouchDBDocument = PouchDBDocument;
/**
 * Implement this class to generate the specific document objects from the saved
 * PouchDB JSON.
 */
class PouchDBDocumentGenerator {
    fromJSON(json) {
        const document = this.createDocument(json);
        document.setId(json._id);
        document.updateRev(json._rev);
        document.setDocVersion(json.docVersion);
        document.setDocName(json.docName);
        return document;
    }
}
exports.PouchDBDocumentGenerator = PouchDBDocumentGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBOEQ7QUFTOUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBRTNCLE1BQXNCLGVBQWU7SUFVakM7UUFSVSxTQUFJLEdBQVcsSUFBSSxDQUFDO1FBRXBCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFJakIsbUJBQWMsR0FBMkIsRUFBRSxDQUFDO1FBR2xELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyw2Q0FBNEIsQ0FBQztRQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQyxxQkFBcUI7SUFDekIsQ0FBQztJQUlNLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDcEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxFQUFVO1FBQ25CLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFTSxTQUFTLENBQUMsR0FBVztRQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUNwQixDQUFDO0lBRU0sTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRU0sbUJBQW1CLENBQUMsS0FBbUM7UUFDMUQsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDbEMsQ0FBQztJQUVNLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDekIsQ0FBQztJQUVNLFVBQVU7UUFDYixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0lBRU0sYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDM0IsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUFlO1FBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO0lBQzlCLENBQUM7SUFFTSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFFTSxVQUFVLENBQUMsSUFBWTtRQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUN4QixDQUFDO0lBRUQsYUFBYSxDQUFDLEtBQW1DO1FBQzdDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUF3QixFQUFFLEVBQUU7WUFDMUQsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBSUQsVUFBVTtRQUNOLE1BQU0sSUFBSSxHQUFRO1lBQ2QsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztTQUN4QixDQUFDO1FBQ0YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxZQUFZO1FBQ1IsSUFBSSxhQUFhLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUM1QjtRQUNELE9BQU87WUFDSCxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuQixVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNoQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRTtTQUMvQixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBN0ZELDBDQTZGQztBQUVEOzs7R0FHRztBQUNILE1BQXNCLHdCQUF3QjtJQUkxQyxRQUFRLENBQUMsSUFBUztRQUNkLE1BQU0sUUFBUSxHQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekIsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsT0FBTyxRQUFRLENBQUM7SUFDcEIsQ0FBQztDQUNKO0FBWkQsNERBWUMifQ==