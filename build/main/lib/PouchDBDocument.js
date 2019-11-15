"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PouchDBWrapper_1 = require("./PouchDBWrapper");
/**
 * Base class for pouchdb documents. Handles the export to the JSON document format
 * required by pouchdb. It also creates the id for each document.
 */
var PouchDBDocument = /** @class */ (function () {
    function PouchDBDocument() {
        this._rev = null;
        this._deleted = false;
        this.debug = false;
        this.samenessChecks = [];
        this._id = new Date().valueOf() + "";
        this.docVersion = PouchDBWrapper_1.POUCHDB_WRAPPER_JSON_VERSION;
        this.docName = this.getNameOfDoc();
    }
    PouchDBDocument.prototype.getId = function () {
        return this._id;
    };
    PouchDBDocument.prototype.setId = function (id) {
        this._id = id;
    };
    PouchDBDocument.prototype.updateRev = function (rev) {
        this._rev = rev;
    };
    PouchDBDocument.prototype.getRev = function () {
        return this._rev;
    };
    /**
     * Check if the given document is the same exact document with the same id.
     * @param other the given document
     * @returns whether the other document has the same id
     */
    PouchDBDocument.prototype.isTheSameDocumentAs = function (other) {
        return this._id === other._id;
    };
    PouchDBDocument.prototype.isDeleted = function () {
        return this._deleted;
    };
    PouchDBDocument.prototype.setDeleted = function () {
        this._deleted = true;
    };
    PouchDBDocument.prototype.getDocVersion = function () {
        return this.docVersion;
    };
    PouchDBDocument.prototype.setDocVersion = function (version) {
        this.docVersion = version;
    };
    PouchDBDocument.prototype.getDocName = function () {
        return this.docName;
    };
    PouchDBDocument.prototype.setDocName = function (name) {
        this.docName = name;
    };
    /**
     * In contrast to [[isTheSameDocumentAs]] this function checks all the values of the
     * document to see if those are the same.
     * @param other the other given document
     * @returns whether all values of both documents are equal
     */
    PouchDBDocument.prototype.isThisTheSame = function (other) {
        return this.samenessChecks.every(function (checker) {
            return checker(other);
        });
    };
    /**
     * Creates a JSON document that can be saved to pouchdb.
     */
    PouchDBDocument.prototype.toDocument = function () {
        var json = {
            _id: this._id,
            _rev: this._rev,
            docVersion: this.docVersion,
            docName: this.docName
        };
        this.addValuesToJSONDocument(json);
        return json;
    };
    /**
     * If set to true all properties are returned when calling [[getDebugInfo]].
     * @param debug
     */
    PouchDBDocument.prototype.setDebug = function (debug) {
        this.debug = debug;
    };
    PouchDBDocument.prototype.isDebug = function () {
        return this.debug;
    };
    /**
     * Returns debug information of that document. By
     * default this is just the id, rev, version and name of
     * the document.
     */
    PouchDBDocument.prototype.getDebugInfo = function () {
        if (this.debug) {
            return this.toDocument();
        }
        return {
            _id: this.getId(),
            _rev: this.getRev(),
            docVersion: this.getDocVersion(),
            docName: this.getNameOfDoc()
        };
    };
    return PouchDBDocument;
}());
exports.PouchDBDocument = PouchDBDocument;
/**
 * Implement this class to generate the specific document objects from the saved
 * PouchDB JSON.
 */
var PouchDBDocumentGenerator = /** @class */ (function () {
    function PouchDBDocumentGenerator() {
    }
    PouchDBDocumentGenerator.prototype.fromJSON = function (json) {
        var document = this.createDocument(json);
        document.setId(json._id);
        document.updateRev(json._rev);
        document.setDocVersion(json.docVersion);
        document.setDocName(json.docName);
        return document;
    };
    return PouchDBDocumentGenerator;
}());
exports.PouchDBDocumentGenerator = PouchDBDocumentGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtREFBOEQ7QUFhOUQ7OztHQUdHO0FBQ0g7SUFXSTtRQVRVLFNBQUksR0FBVyxJQUFJLENBQUM7UUFFcEIsYUFBUSxHQUFHLEtBQUssQ0FBQztRQUdqQixVQUFLLEdBQUcsS0FBSyxDQUFDO1FBRWQsbUJBQWMsR0FBMkIsRUFBRSxDQUFDO1FBR2xELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyw2Q0FBNEIsQ0FBQztRQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBSU0sK0JBQUssR0FBWjtRQUNJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNwQixDQUFDO0lBRU0sK0JBQUssR0FBWixVQUFhLEVBQVU7UUFDbkIsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVNLG1DQUFTLEdBQWhCLFVBQWlCLEdBQVc7UUFDeEIsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDcEIsQ0FBQztJQUVNLGdDQUFNLEdBQWI7UUFDSSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSw2Q0FBbUIsR0FBMUIsVUFBMkIsS0FBbUM7UUFDMUQsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDbEMsQ0FBQztJQUVNLG1DQUFTLEdBQWhCO1FBQ0ksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3pCLENBQUM7SUFFTSxvQ0FBVSxHQUFqQjtRQUNJLElBQUksQ0FBQyxR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