import { Logger } from "./Logger";
import { BehaviorSubject, Observable, of } from "rxjs";
import { concatMap } from "rxjs/operators";
const LOG_NAME = "PouchDBDocumentList";
export class PouchDBDocumentList {
    constructor() {
        this.listContent$ = new BehaviorSubject({ value: [], log: Logger.getLoggerTrace() });
        this.items = [];
        this.log = Logger.getLogger("PouchDBDocumentList");
    }
    getCurrentIndexOfItem(item, log) {
        log = log.start(LOG_NAME, "getCurrentIndexOfItem", item.getDebugInfo());
        return Observable.create(emitter => {
            const currentIndex = this.items.indexOf(item);
            log.logMessage(LOG_NAME, "getCurrentIndexOfItem item has index", { item: item.getDebugInfo(), index: currentIndex });
            log.addToSubscriberNextAndComplete(emitter, currentIndex);
        });
    }
    moveUp(item, log) {
        const logStart = log.start(LOG_NAME, "moveUp", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(concatMap(result => {
            result.log.complete();
            const currentIndex = result.value;
            if (currentIndex >= 0) {
                const newIndex = currentIndex - 1;
                console.log("newIndex", newIndex);
                this.moveItem(currentIndex, newIndex, item, logStart);
            }
            logStart.complete();
            return logStart.addTo(of(item));
        }));
    }
    moveItem(currentIndex, newIndex, item, log) {
        log.logMessage(LOG_NAME, "move item", {
            currentIndex: currentIndex,
            newIndex: newIndex,
            item: item.getDebugInfo()
        });
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, item);
    }
    moveDown(item, log) {
        const run = log.start(LOG_NAME, "moveDown", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(concatMap(result => {
            result.log.complete();
            const currentIndex = result.value;
            if (currentIndex < this.items.length - 1) {
                const newIndex = currentIndex + 1;
                this.moveItem(currentIndex, newIndex, item, run);
            }
            run.complete();
            return run.addTo(of(item));
        }));
    }
    addItemAtIndex(index, item, log) {
        log = log.start(LOG_NAME, "addItemAtIndex", { item: item.getDebugInfo(), index: index });
        return Observable.create(emitter => {
            this.addItemToListAtIndex(index, item, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }
    addItemToListAtIndex(index, item, log) {
        this.items.splice(index, 0, item);
        this.itemAddedEvent(log);
    }
    pushItem(item, log) {
        this.items.push(item);
        this.itemAddedEvent(log);
    }
    itemAddedEvent(log) {
        this.listContent$.next(log.addToValue(this.items));
        this.sort();
    }
    sort() { }
    addOrUpdateItem(item, log) {
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
                this.deleteItem(existingItem, log).pipe(concatMap(result => this.addItemAtIndex(existingIndex, item, result.log))).subscribe(emitter);
            }
            else {
                log.logMessage(LOG_NAME, "addOrUpdateItem pushing as new item", item.getDebugInfo());
                this.pushItem(item, log);
                log.addToSubscriberNextAndComplete(emitter, item);
            }
        });
    }
    getItems(log) {
        const items = this.items;
        log = log.start(LOG_NAME, "getItems", { length: items.length });
        return log.addTo(of(items));
    }
    addItem(item, log) {
        log = log.start(LOG_NAME, "addItem", item.getDebugInfo());
        return Observable.create(emitter => {
            this.addItemToList(item, log);
            log.addToSubscriberNextAndComplete(emitter, log);
        });
    }
    addItemToList(item, log) {
        log.logMessage(LOG_NAME, "addItemToList", item.getDebugInfo());
        this.pushItem(item, log);
    }
    addItemAtBeginning(item, log) {
        log.logMessage(LOG_NAME, "addItemAtBeginning", item.getDebugInfo());
        return this.addItemAtIndex(0, item, log);
    }
    deleteItem(itemToDelete, log) {
        log = log.start(LOG_NAME, "deleteItem", itemToDelete.getDebugInfo());
        return Observable.create(emitter => {
            this.items = this.items.filter(item => {
                return !this.isTheSameCheck(item, itemToDelete);
            });
            log.logMessage(LOG_NAME, "deleteItem remaining item length", { length: this.items.length });
            this.listContent$.next(log.addToValue(this.items));
            log.addToSubscriberNextAndComplete(emitter, itemToDelete);
        });
    }
    isTheSameCheck(item, value) {
        return item.isTheSameDocumentAs(value);
    }
    addUniqueItem(item, log) {
        log = log.start(LOG_NAME, "addUniqueItem", item.getDebugInfo());
        return Observable.create(emitter => {
            const filtered = this.items.filter((value) => {
                this.isTheSameCheck(item, value);
                log.logMessage(LOG_NAME, "addUniqueItem item is already added", item.getDebugInfo());
                log.addToSubscriberNextAndComplete(emitter, false);
            });
            if (filtered.length === 0) {
                this.addItem(item, log).subscribe((result) => result.log.addToSubscriberNextAndComplete(emitter, true), error => emitter.error(error), () => { });
            }
        });
    }
    getSize(log) {
        log = log.start(LOG_NAME, "getSize");
        return Observable.create(emitter => {
            const size = this.items.length;
            log.logMessage(LOG_NAME, "getSize", { size: size });
            log.addToSubscriberNextAndComplete(emitter, size);
        });
    }
    getItemAtIndex(index, log) {
        log = log.start(LOG_NAME, "getItemAtIndex", { index: index });
        return Observable.create(emitter => {
            if (index >= this.items.length) {
                const errorMessage = `index ${index} is greater than the available number of items ${this.items.length}`;
                log.logErrorAndSendSubscriberErrorComplete(emitter, LOG_NAME, "getItemAtIndex", errorMessage, { index: index, length: this.items.length });
            }
            const item = this.items[index];
            this.log.logMessage(LOG_NAME, "getting item at index", { item: item.getDebugInfo(), index: index });
            log.logMessage(LOG_NAME, "getItemAtIndex item is", { item: item.getDebugInfo(), index: index });
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    }
    subscribeTo(db, log) {
        const logStart = log.start(LOG_NAME, "subscribeTo", db.getDebugInfo());
        return db.getAllDocuments(log).pipe(concatMap(result => this.loadInitialItems(result)), concatMap(result => this.initializeSubscriptions(result, db)), concatMap(() => {
            return logStart.addTo(of(db));
        }));
    }
    loadInitialItems(result) {
        const items = result.value;
        const log = result.log.start(LOG_NAME, "loadInitialItems", { length: items.length });
        items.forEach((item) => {
            this.addItemToList(item, result.log);
        });
        log.complete();
        return of(log);
    }
    initializeSubscriptions(log, db) {
        this.subscribeToDocSaved(db, log);
        this.subscribeToDocDeleted(db, log);
        return of(log);
    }
    subscribeToDocSaved(db, log) {
        log.logMessage(LOG_NAME, "subscribeToDocSaved", db.getDebugInfo());
        db.docSaved$.subscribe((next) => {
            const doc = next.value;
            const logStart = next.log.start(LOG_NAME, "subscribeToDocSaved adding new saved document " +
                "at beginning", doc.getDebugInfo());
            this.addItemToListAtIndex(0, doc, log);
            logStart.complete();
        }, error => {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(LOG_NAME, "something went wrong while subscribing to new documents " +
                "being added", error + "", { error: error });
        });
    }
    subscribeToDocDeleted(db, log) {
        log.logMessage(LOG_NAME, "subscribeToDocDeleted");
        db.docDeleted$.pipe(concatMap(next => {
            const deletedDoc = next.value;
            next.log.start(LOG_NAME, "subscribeToDocDeleted doc was deleted", deletedDoc);
            return this.deleteDeletedItem(deletedDoc, next.log);
        })).subscribe(next => {
            next.log.complete();
        }, error => {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(LOG_NAME, "something went wrong while deleting document from db", error + "", error);
        });
    }
    deleteDeletedItem(deletedItem, log) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQkRvY3VtZW50TGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsTUFBTSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUVqRCxPQUFPLEVBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDckQsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBRXpDLE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDO0FBT3ZDLE1BQU0sT0FBZ0IsbUJBQW1CO0lBQXpDO1FBRUksaUJBQVksR0FBK0MsSUFBSSxlQUFlLENBQzFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUNyQyxVQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLFFBQUcsR0FBVyxNQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUErUGxFLENBQUM7SUE3UFUscUJBQXFCLENBQUMsSUFBTyxFQUFFLEdBQVc7UUFDN0MsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMvQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxzQ0FBc0MsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBQyxDQUFDLENBQUM7WUFDbkgsR0FB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