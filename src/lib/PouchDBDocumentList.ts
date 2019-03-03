import {PouchDBDocument} from "./PouchDBDocument";
import {Logger, ValueWithLogger} from "./Logger";
import {DBValueWithLog, DeletedDocument, PouchDBWrapper} from "./PouchDBWrapper";
import {BehaviorSubject, Observable, of} from "rxjs";
import {concatMap} from "rxjs/operators";

const LOG_NAME = "PouchDBDocumentList";

export interface ItemWithLogger<T> {
    value: T;
    log: Logger;
}

/**
 * List representation of pouchdb documents. This allows for example the custom sorting
 * of these documents.
 */
export abstract class PouchDBDocumentList<T extends PouchDBDocument<any>> {

    /**
     * This observable holds the current view of the list.
     */
    listContent$: BehaviorSubject<{value: T[], log: Logger}> = new BehaviorSubject(
        {value: [], log: Logger.getLoggerTrace()});
    protected items: T[] = [];
    private log: Logger = Logger.getLogger("PouchDBDocumentList");

    public getCurrentIndexOfItem(item: T, log: Logger): Observable<{value: number, log: Logger}> {
        log = log.start(LOG_NAME, "getCurrentIndexOfItem", item.getDebugInfo());
        return Observable.create(emitter => {
            let currentIndex = -1;
            this.items.some((itemInArray, itemIndex) => {
                if (itemInArray.isTheSameDocumentAs(item)) {
                    currentIndex = itemIndex;
                    return true;
                }
                return false;
            });
            log.logMessage(LOG_NAME, "getCurrentIndexOfItem item has index", {item: item.getDebugInfo(), index: currentIndex});
            log.addToSubscriberNextAndComplete(emitter, currentIndex);
        });
    }

    /**
     * Moves the given item document up one index in the list.
     * @param item
     * @param log
     */
    public moveUp(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        const logStart = log.start(LOG_NAME, "moveUp", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(
            concatMap(result => {
                result.log.complete();
                const currentIndex: number = result.value;
                if (currentIndex >= 0) {
                    const newIndex = currentIndex - 1;
                    this.moveItem(currentIndex, newIndex, item, logStart);
                }
                logStart.complete();
                return logStart.addTo(of(item));
            })
        );
    }

    private moveItem(currentIndex: number, newIndex: number, item: T, log: Logger) {
        log.logMessage(LOG_NAME, "move item", {
            currentIndex: currentIndex,
            newIndex: newIndex,
            item: item.getDebugInfo()
        });
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, item);
        this.listContent$.next(log.addToValue(this.cloneItemsArray()));
    }

    /**
     * Moves the given item document up down index in the list.
     * @param item
     * @param log
     */
    moveDown(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        const run = log.start(LOG_NAME, "moveDown", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(
            concatMap(result => {
                result.log.complete();
                const currentIndex: number = result.value;
                if (currentIndex < this.items.length - 1) {
                    const newIndex = currentIndex + 1;
                    this.moveItem(currentIndex, newIndex, item, run);
                }
                run.complete();
                return run.addTo(of(item));
            })
        );
    }

    addItemAtIndex(index: number, item: T, log: Logger): Observable<ItemWithLogger<T>> {
        log = log.start(LOG_NAME, "addItemAtIndex", {item: item.getDebugInfo(), index: index});
        return Observable.create(emitter => {
            this.addItemToListAtIndex(index, item, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }

    protected addItemToListAtIndex(index: number, item: T, log: Logger) {
        this.items.splice(index, 0, item);
        this.itemAddedEvent(log);
    }

    protected pushItem(item: T, log: Logger) {
        this.items.push(item);
        this.itemAddedEvent(log);
    }

    private itemAddedEvent(log: Logger) {
        log.logMessage(LOG_NAME, "itemAddedEvent", {length: this.items.length});
        this.listContent$.next(log.addToValue(this.cloneItemsArray()));
        this.sort();
    }

    private cloneItemsArray() {
        const clone = [];
        this.items.forEach(item => {
            clone.push(item);
        })
        return clone;
    }

    protected sort() {}

    /**
     * If the item with the same id already exists this will replace that item with the new version
     * of that item. Otherwise it will simply add the item.
     * @param item
     * @param log
     */
    addOrUpdateItem(item: T, log: Logger): Observable<{value: T, log: Logger}> {
        log.logMessage(LOG_NAME, "addOrUpdateItem", item.getDebugInfo());
        return this.addOrUpdateItemAtIndex(item, -1, log);
    }

    /**
     * Like [[addOrUpdateItem]] but it lets you specify at which index to put the item if it is not
     * in the list yet.
     * @param item
     * @param log
     */
    addOrUpdateItemAtIndex(item: T, index: number, log: Logger): Observable<{value: T, log: Logger}> {
        log = log.start(LOG_NAME, "addOrUpdateItemAtIndex", {index: index, item: item.getDebugInfo()});
        return Observable.create(emitter => {
            this.addOrUpdateItemAtIndexSync(item, index, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }

    private addOrUpdateItemAtIndexSync(item: T, index: number, log: Logger) {
        const {existingIndex, existingItem, isItemFound} = this.lookForItemWithTheSameId(item, log);
        if (isItemFound) {
            this.replaceItemAtIndex(existingItem, existingIndex, item, log);
        } else {
            this.addNewItemAtIndex(log, item, index);
        }
    }

    private addNewItemAtIndex(log: Logger, item: T, index: number) {
        log.logMessage(LOG_NAME, "addNewItemAtIndex", item.getDebugInfo());
        if (index === -1) {
            this.pushItem(item, log);
        } else {
            this.addItemToListAtIndex(index, item, log);
        }
    }

    private replaceItemAtIndex(existingItem: T, existingIndex: number, replacementItem: T, log: Logger) {
        log.logMessage(LOG_NAME, "replaceItemAtIndex", {existingItem: existingItem.getDebugInfo(),
            existingIndex: existingIndex, replacementItem: replacementItem.getDebugInfo()});
        this.deleteItemFromList(existingItem, log);
        this.addItemToListAtIndex(existingIndex, replacementItem, log);
    }

    private lookForItemWithTheSameId(item: T, log: Logger) {
        let existingIndex = -1;
        let existingItem: T = null;
        let isItemFound = false;
        this.items.filter((listItem, itemIndex) => {
            if (item.getId() === listItem.getId()) {
                existingIndex = itemIndex;
                existingItem = listItem;
                isItemFound = true;
            }
        });
        log.logMessage(LOG_NAME, "lookForItemWithTheSameId", {item: item.getDebugInfo(), existingIndex: existingIndex,
            isItemFound: isItemFound, existingItem: existingItem !== null ? existingItem.getDebugInfo() : undefined});
        return {existingIndex, existingItem, isItemFound};
    }

    public getItems(log: Logger): Observable<{value: Array<T>, log: Logger}> {
        const items: T[] = this.items;
        log = log.start(LOG_NAME, "getItems", {length: items.length});
        return log.addTo(of(items));
    }

    public addItem(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        log = log.start(LOG_NAME, "addItem", item.getDebugInfo());
        return Observable.create(emitter => {
            this.addItemToList(item, log);
            log.addToSubscriberNextAndComplete(emitter, log);
        });
    }

    private addItemToList(item: T, log: Logger) {
        log.logMessage(LOG_NAME, "addItemToList", item.getDebugInfo());
        this.pushItem(item, log);
    }

    public addItemAtBeginning(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        log.logMessage(LOG_NAME, "addItemAtBeginning", item.getDebugInfo());
        return this.addItemAtIndex(0, item, log);
    }

    public deleteItem(itemToDelete: T, log: Logger): Observable<ItemWithLogger<T>> {
        log = log.start(LOG_NAME, "deleteItem", itemToDelete.getDebugInfo());
        return Observable.create(emitter => {
            this.deleteItemFromList(itemToDelete, log);
            this.listContent$.next(log.addToValue(this.cloneItemsArray()));
            log.addToSubscriberNextAndComplete(emitter, itemToDelete);
        });
    }

    private deleteItemFromList(itemToDelete: T, log: Logger) {
        this.items = this.items.filter(item => {
            return !this.isTheSameCheck(item, itemToDelete);
        });
        log.logMessage(LOG_NAME, "deleteItem remaining item length", {length: this.items.length});
    }

    private isTheSameCheck(item: T, value: T) {
        return item.isTheSameDocumentAs(value);
    }

    /**
     * Works similar to [[addOrUpdateItem]] but will check if the an item with the same
     * values already exists. If it does it will not add this item.
     * @param item
     * @param log
     */
    public addUniqueItem(item: T, log: Logger): Observable<{value: boolean, log: Logger}> {
        log = log.start(LOG_NAME, "addUniqueItem", item.getDebugInfo());
        return Observable.create(emitter => {
            const filtered = this.items.filter( (value:  T) => {
                if (this.isTheSameCheck(item, value)) {
                    log.logMessage(LOG_NAME, "addUniqueItem item is already added", item.getDebugInfo());
                    return true;
                }
                return false;
            });
            if (filtered.length === 0) {
                this.addItem(item, log).subscribe(
                    (result) => result.log.addToSubscriberNextAndComplete(emitter, true),
                    error => emitter.error(error),
                    () => {}
                );
            } else {
                log.addToSubscriberNextAndComplete(emitter, false);
            }
        });
    }

    public getSize(log: Logger): Observable<{ value: number, log: Logger}> {
        log = log.start(LOG_NAME, "getSize");
        return Observable.create(emitter => {
            const size = this.items.length;
            log.logMessage(LOG_NAME, "getSize", {size: size});
            log.addToSubscriberNextAndComplete(emitter, size);
        });
    }

    public getItemAtIndex(index: number, log: Logger): Observable<ItemWithLogger<T>> {
        log = log.start(LOG_NAME, "getItemAtIndex", {index: index});
        return Observable.create(emitter => {
            if (index >= this.items.length) {
                const errorMessage = `index ${index} is greater than the available number of items ${this.items.length}`;
                log.logErrorAndSendSubscriberErrorComplete(emitter, LOG_NAME, "getItemAtIndex",
                    errorMessage, {index: index, length: this.items.length});
            }
            const item = this.items[index];
            this.log.logMessage(LOG_NAME, "getting item at index", {item: item.getDebugInfo(), index: index});
            log.logMessage(LOG_NAME, "getItemAtIndex item is",
                {item: item.getDebugInfo(), index: index});
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }

    /**
     * By subscribing to a [[PouchDBWrapper]] all changes to that pouchdb are reflected
     * in this list.
     * @param db
     * @param log
     */
    public subscribeTo(db: PouchDBWrapper, log: Logger): Observable<DBValueWithLog> {
        const logStart = log.start(LOG_NAME, "subscribeTo", db.getDebugInfo());
        return db.getAllDocuments(log).pipe(
            concatMap(result => this.loadInitialItems(result)),
            concatMap(result => this.initializeSubscriptions(result, db)),
            concatMap(() => {
                return logStart.addTo(of(db));
            })
        );
    }

    private loadInitialItems(result: ValueWithLogger) {
        const items: T[] = result.value;
        const log = result.log.start(LOG_NAME, "loadInitialItems", {length: items.length});
        items.forEach((item: T) => {
            this.addItemToList(item, result.log);
        });
        log.complete();
        return of(log);
    }

    private initializeSubscriptions(log: Logger, db: PouchDBWrapper) {
        this.subscribeToDocSaved(db, log);
        this.subscribeToDocDeleted(db, log);
        return of(log);
    }

    private subscribeToDocSaved(db: PouchDBWrapper, log: Logger) {
        log.logMessage(LOG_NAME, "subscribeToDocSaved", db.getDebugInfo());
        db.docSaved$.subscribe((next: ValueWithLogger) => {
            const doc: T = next.value;
            const logStart = next.log.start(LOG_NAME, "subscribeToDocSaved adding new saved document " +
                "at beginning", doc.getDebugInfo());
            this.addOrUpdateItemAtIndexSync(doc, 0, log);
            logStart.complete();
        }, error => {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(LOG_NAME, "something went wrong while subscribing to new documents " +
                "being added", error + "", {error: error});
        });
    }

    private subscribeToDocDeleted(db: PouchDBWrapper, log: Logger) {
        log.logMessage(LOG_NAME, "subscribeToDocDeleted");
        db.docDeleted$.pipe(
            concatMap(next => {
                const deletedDoc: DeletedDocument = next.value;
                next.log.start(LOG_NAME, "subscribeToDocDeleted doc was deleted",
                    deletedDoc);
                return this.deleteDeletedItem(deletedDoc, next.log);
            })
        ).subscribe(next => {
            next.log.complete();
        }, error => {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(
                LOG_NAME, "something went wrong while deleting document from db",
                error + "", error);
        });
    }

    /**
     * Removes a deleted item from the list.
     * @param deletedItem
     * @param log
     */
    deleteDeletedItem(deletedItem: DeletedDocument, log: Logger): Observable<ValueWithLogger> {
        log = log.start(LOG_NAME, "deleteDeletedItem", deletedItem);
        return Observable.create(emitter => {
            this.items = this.items.filter(item => {
                return item.getId() !== deletedItem._id;
            });
            this.listContent$.next(log.addToValue(this.cloneItemsArray()));
            log.addToSubscriberNextAndComplete(emitter, deletedItem);
        });
    }

}
