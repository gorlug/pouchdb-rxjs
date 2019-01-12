import { PouchDBDocument } from "./PouchDBDocument";
import { Logger, ValueWithLogger } from "./Logger";
import { DBValueWithLog, DeletedDocument, PouchDBWrapper } from "./PouchDBWrapper";
import { BehaviorSubject, Observable } from "rxjs";
export interface ItemWithLogger<T> {
    value: T;
    log: Logger;
}
export declare abstract class PouchDBDocumentList<T extends PouchDBDocument<any>> {
    listContent$: BehaviorSubject<{
        value: T[];
        log: Logger;
    }>;
    protected items: T[];
    private log;
    getCurrentIndexOfItem(item: T, log: Logger): Observable<{
        value: number;
        log: Logger;
    }>;
    moveUp(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    private moveItem;
    moveDown(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    addItemAtIndex(index: number, item: T, log: Logger): Observable<ItemWithLogger<T>>;
    protected addItemToListAtIndex(index: number, item: T, log: Logger): void;
    protected pushItem(item: T, log: Logger): void;
    private itemAddedEvent;
    protected sort(): void;
    addOrUpdateItem(item: T, log: Logger): Observable<T>;
    getItems(log: Logger): Observable<{
        value: Array<T>;
        log: Logger;
    }>;
    addItem(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    private addItemToList;
    addItemAtBeginning(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    deleteItem(itemToDelete: T, log: Logger): Observable<ItemWithLogger<T>>;
    private isTheSameCheck;
    addUniqueItem(item: T, log: Logger): Observable<{
        value: boolean;
        log: Logger;
    }>;
    getSize(log: Logger): Observable<{
        value: number;
        log: Logger;
    }>;
    getItemAtIndex(index: number, log: Logger): Observable<ItemWithLogger<T>>;
    subscribeTo(db: PouchDBWrapper, log: Logger): Observable<DBValueWithLog>;
    private loadInitialItems;
    private initializeSubscriptions;
    private subscribeToDocSaved;
    private subscribeToDocDeleted;
    deleteDeletedItem(deletedItem: DeletedDocument, log: Logger): Observable<ValueWithLogger>;
}
