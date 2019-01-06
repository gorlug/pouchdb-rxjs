"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IS_FULL_DEBUG = true;
class PouchDBDocument {
    constructor() {
        this._rev = null;
        this._deleted = false;
        this.samenessChecks = [];
        this._id = new Date().valueOf() + "";
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
    isThisTheSame(other) {
        return this.samenessChecks.every((checker) => {
            return checker(other);
        });
    }
    toDocument() {
        const json = {
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
        return document;
    }
}
exports.PouchDBDocumentGenerator = PouchDBDocumentGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFLQSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFFM0IsTUFBc0IsZUFBZTtJQVFqQztRQU5VLFNBQUksR0FBVyxJQUFJLENBQUM7UUFFcEIsYUFBUSxHQUFHLEtBQUssQ0FBQztRQUVqQixtQkFBYyxHQUEyQixFQUFFLENBQUM7UUFHbEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUNyQyxxQkFBcUI7SUFDekIsQ0FBQztJQUVNLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDcEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxFQUFVO1FBQ25CLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFTSxTQUFTLENBQUMsR0FBVztRQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztJQUNwQixDQUFDO0lBRU0sTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRU0sbUJBQW1CLENBQUMsS0FBbUM7UUFDMUQsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDbEMsQ0FBQztJQUVNLFNBQVM7UUFDWixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDekIsQ0FBQztJQUVNLFVBQVU7UUFDYixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0lBRUQsYUFBYSxDQUFDLEtBQW1DO1FBQzdDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUF3QixFQUFFLEVBQUU7WUFDMUQsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBSUQsVUFBVTtRQUNOLE1BQU0sSUFBSSxHQUFRO1lBQ2QsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ2xCLENBQUM7UUFDRixJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELFlBQVk7UUFDUixJQUFJLGFBQWEsRUFBRTtZQUNmLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1NBQzVCO1FBQ0QsT0FBTztZQUNILEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hCLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO1NBQ3JCLENBQUM7SUFDTixDQUFDO0NBQ0o7QUFuRUQsMENBbUVDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBc0Isd0JBQXdCO0lBSTFDLFFBQVEsQ0FBQyxJQUFTO1FBQ2QsTUFBTSxRQUFRLEdBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6QixRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0NBQ0o7QUFWRCw0REFVQyJ9