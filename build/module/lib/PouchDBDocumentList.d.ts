import { PouchDBDocument } from "./PouchDBDocument";
import { Logger, ValueWithLogger } from "./Logger";
import { DBValueWithLog, DeletedDocument, PouchDBWrapper } from "./PouchDBWrapper";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
export interface ItemWithLogger<T> {
    value: T;
    log: Logger;
}
export interface DeletedItemWithIndexAndLogger<T> {
    value: {
        item: T;
        index: number;
    };
    log: Logger;
}
/**
 * List representation of pouchdb documents. This allows for example the custom sorting
 * of these documents.
 */
export declare abstract class PouchDBDocumentList<T extends PouchDBDocument<any>> {
    protected logName: string;
    /**
     * This observable holds the current view of the list.
     */
    listContent$: BehaviorSubject<{
        value: T[];
        log: Logger;
    }>;
    protected items: T[];
    private log;
    protected docSavedSubscription: Subscription;
    getCurrentIndexOfItem(item: T, log: Logger): Observable<{
        value: number;
        log: Logger;
    }>;
    /**
     * Moves the given item document up one index in the list.
     * @param item
     * @param log
     */
    moveUp(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    private moveItem;
    protected updateListContent(log: Logger): void;
    /**
     * Moves the given item document up down index in the list.
     * @param item
     * @param log
     */
    moveDown(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    addItemAtIndex(index: number, item: T, log: Logger): Observable<ItemWithLogger<T>>;
    protected addItemToListAtIndex(index: number, item: T, log: Logger): void;
    protected pushItem(item: T, log: Logger): void;
    private itemAddedEvent;
    private cloneItemsArray;
    protected sort(): void;
    /**
     * If the item with the same id already exists this will replace that item with the new version
     * of that item. Otherwise it will simply add the item.
     * @param item
     * @param log
     */
    addOrUpdateItem(item: T, log: Logger): Observable<{
        value: T;
        log: Logger;
    }>;
    /**
     * Like [[addOrUpdateItem]] but it lets you specify at which index to put the item if it is not
     * in the list yet.
     * @param item
     * @param log
     */
    addOrUpdateItemAtIndex(item: T, index: number, log: Logger): Observable<{
        value: T;
        log: Logger;
    }>;
    protected addOrUpdateItemAtIndexSync(item: T, index: number, log: Logger): void;
    private addNewItemAtIndex;
    protected replaceItemAtIndex(existingItem: T, existingIndex: number, replacementItem: T, log: Logger): void;
    protected lookForItemWithTheSameId(item: T, log: Logger): {
        existingIndex: number;
        existingItem: T;
        isItemFound: boolean;
    };
    getItems(log: Logger): Observable<{
        value: Array<T>;
        log: Logger;
    }>;
    addItem(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    private addItemToList;
    addItemAtBeginning(item: T, log: Logger): Observable<ItemWithLogger<T>>;
    deleteItem(itemToDelete: T, log: Logger): Observable<DeletedItemWithIndexAndLogger<T>>;
    protected deleteItemFromList(itemToDelete: T, log: Logger): number;
    private isTheSameCheck;
    /**
     * Works similar to [[addOrUpdateItem]] but will check if the an item with the same
     * values already exists. If it does it will not add this item.
     * @param item
     * @param log
     */
    addUniqueItem(item: T, log: Logger): Observable<{
        value: boolean;
        log: Logger;
    }>;
    getSize(log: Logger): Observable<{
        value: number;
        log: Logger;
    }>;
    getItemAtIndex(index: number, log: Logger): Observable<ItemWithLogger<T>>;
    /**
     * By subscribing to a [[PouchDBWrapper]] all changes to that pouchdb are reflected
     * in this list.
     * @param db
     * @param log
     */
    subscribeTo(db: PouchDBWrapper, log: Logger): Observable<DBValueWithLog>;
    private loadInitialItems;
    private initializeSubscriptions;
    subscribeToDocSaved(db: PouchDBWrapper, log: Logger): void;
    unsubscribeFromDocSaved(): void;
    subscribeToDocDeleted(db: PouchDBWrapper, log: Logger): void;
    /**
     * Removes a deleted item from the list.
     * @param deletedItem
     * @param log
     */
    deleteDeletedItem(deletedItem: DeletedDocument, log: Logger): Observable<ValueWithLogger>;
    changePositionOfItem(currentIndex: number, newIndex: number, log: Logger): Observable<ValueWithLogger>;
    protected changePositionOfItemSync(currentIndex: number, newIndex: number, log: Logger): T;
}
