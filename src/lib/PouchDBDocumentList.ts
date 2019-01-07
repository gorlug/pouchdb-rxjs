import {PouchDBDocument} from "./PouchDBDocument";
import {Logger, ValueWithLogger} from "./Logger";
import {DBValueWithLog, DeletedDocument, PouchDBWrapper} from "./PouchDBWrapper";
import {BehaviorSubject, concat, Observable, of, Subscriber} from "rxjs";
import {concatMap} from "rxjs/operators";

const LOG_NAME = "PouchDBDocumentList";

export interface ItemWithLogger<T> {
    value: T;
    log: Logger;
}

export abstract class PouchDBDocumentList<T extends PouchDBDocument<any>> {

    listContent$: BehaviorSubject<{value: T[], log: Logger}> = new BehaviorSubject(
        {value: [], log: Logger.getLoggerTrace()});
    protected items: T[] = [];
    private log: Logger = Logger.getLogger("PouchDBDocumentList");

    public getCurrentIndexOfItem(item: T, log: Logger): Observable<{value: number, log: Logger}> {
        log = log.start(LOG_NAME, "getCurrentIndexOfItem", item.getDebugInfo());
        return Observable.create(emitter => {
            const currentIndex = this.items.indexOf(item);
            log.logMessage(LOG_NAME, "getCurrentIndexOfItem item has index", {item: item.getDebugInfo(), index: currentIndex});
            log.addToSubscriberNextAndComplete(emitter, currentIndex);
        });
    }

    public moveUp(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        const logStart = log.start(LOG_NAME, "moveUp", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(
            concatMap(result => {
                result.log.complete();
                const currentIndex: number = result.value;
                if (currentIndex >= 0) {
                    const newIndex = currentIndex - 1;
                    console.log("newIndex", newIndex);
                    this.moveItem(currentIndex, newIndex, item);
                }
                logStart.complete();
                return logStart.addTo(of(item));
            })
        );
    }

    private moveItem(currentIndex: number, newIndex: number, item: T) {
        this.log.debug("move item", item.getDebugInfo(), "from", currentIndex, "to", newIndex);
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, item);
    }

    moveDown(item: T, log: Logger): Observable<ItemWithLogger<T>> {
        const run = log.start(LOG_NAME, "moveDown", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(
            concatMap(result => {
                result.log.complete();
                const currentIndex: number = result.value;
                if (currentIndex < this.items.length - 1) {
                    const newIndex = currentIndex + 1;
                    this.moveItem(currentIndex, newIndex, item);
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
        this.listContent$.next(log.addToValue(this.items));
        this.sort();
    }

    protected sort() {}

    addOrUpdateItem(item: T, log: Logger): Observable<T> {
        log = log.start(LOG_NAME, "addOrUpdateItem", item.getDebugInfo());
        return Observable.create(emitter => {
            let existingIndex = -1;
            let existingItem = null;
            this.items.filter((listItem, index) => {
                if (item.getId() === listItem.getId()) {
                    existingIndex = index;
                    existingItem = listItem;
                }
            });
            if (existingIndex !== -1) {
                return this.deleteItem(existingItem, log).pipe(
                    concatMap(result => this.addItemAtIndex(existingIndex, item, result.log) )
                ).subscribe(emitter);
            } else {
                log.logMessage(LOG_NAME, "addOrUpdateItem pushing as new item", item.getDebugInfo());
                this.pushItem(item, log);
                log.addToSubscriberNextAndComplete(emitter, item);
            }
        });
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
            this.items = this.items.filter(item => {
                return !this.isTheSameCheck(item, itemToDelete);
            });
            log.logMessage(LOG_NAME, "deleteItem remaining item length", { length: this.items.length});
            this.listContent$.next(log.addToValue(this.items));
            log.addToSubscriberNextAndComplete(emitter, itemToDelete);
        });
    }

    private isTheSameCheck(item: T, value: T) {
        return item.isTheSameDocumentAs(value);
    }

    public addUniqueItem(item: T, log: Logger): Observable<{value: boolean, log: Logger}> {
        log = log.start(LOG_NAME, "addUniqueItem", item.getDebugInfo());
        return Observable.create(emitter => {
            const filtered = this.items.filter( (value:  T) => {
                this.isTheSameCheck(item, value);
                log.logMessage(LOG_NAME, "addUniqueItem item is already added", item.getDebugInfo());
                log.addToSubscriberNextAndComplete(emitter, false);
            });
            if (filtered.length === 0) {
                this.addItem(item, log).subscribe(
                    (result) => result.log.addToSubscriberNextAndComplete(emitter, true),
                    error => emitter.error(error),
                    () => {}
                );
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
            this.log.debug("getting item at index", index, "is", item.getDebugInfo());
            log.logMessage(LOG_NAME, "getItemAtIndex item is",
                {item: item.getDebugInfo(), index: index});
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }

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
            this.addItemToListAtIndex(0, doc, log);
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

    deleteDeletedItem(deletedItem: DeletedDocument, log: Logger): Observable<ValueWithLogger> {
        log = log.start(LOG_NAME, "deleteDeletedItem", deletedItem);
        return Observable.create(emitter => {
            this.items = this.items.filter(item => {
                return item.getId() !== deletedItem._id;
            });
            this.listContent$.next(log.addToValue(this.items));
            log.addToSubscriberNextAndComplete(emitter, deletedItem);
        });
    }

}
