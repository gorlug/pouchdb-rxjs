import { Logger } from "./Logger";
import { BehaviorSubject, Observable, of } from "rxjs";
import { concatMap } from "rxjs/operators";
/**
 * List representation of pouchdb documents. This allows for example the custom sorting
 * of these documents.
 */
var PouchDBDocumentList = /** @class */ (function () {
    function PouchDBDocumentList() {
        this.logName = "PouchDBDocumentList";
        /**
         * This observable holds the current view of the list.
         */
        this.listContent$ = new BehaviorSubject({ value: [], log: Logger.getLoggerTrace() });
        this.items = [];
        this.log = Logger.getLogger("PouchDBDocumentList");
    }
    PouchDBDocumentList.prototype.getCurrentIndexOfItem = function (item, log) {
        var _this = this;
        log = log.start(this.logName, "getCurrentIndexOfItem", item.getDebugInfo());
        return Observable.create(function (emitter) {
            var currentIndex = -1;
            _this.items.some(function (itemInArray, itemIndex) {
                if (itemInArray.isTheSameDocumentAs(item)) {
                    currentIndex = itemIndex;
                    return true;
                }
                return false;
            });
            log.logMessage(_this.logName, "getCurrentIndexOfItem item has index", { item: item.getDebugInfo(), index: currentIndex });
            log.addToSubscriberNextAndComplete(emitter, currentIndex);
        });
    };
    /**
     * Moves the given item document up one index in the list.
     * @param item
     * @param log
     */
    PouchDBDocumentList.prototype.moveUp = function (item, log) {
        var _this = this;
        var logStart = log.start(this.logName, "moveUp", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(concatMap(function (result) {
            result.log.complete();
            var currentIndex = result.value;
            if (currentIndex >= 0) {
                var newIndex = currentIndex - 1;
                _this.moveItem(currentIndex, newIndex, item, logStart);
            }
            logStart.complete();
            return logStart.addTo(of(item));
        }));
    };
    PouchDBDocumentList.prototype.moveItem = function (currentIndex, newIndex, item, log) {
        log.logMessage(this.logName, "move item", {
            currentIndex: currentIndex,
            newIndex: newIndex,
            item: item.getDebugInfo()
        });
        this.items.splice(currentIndex, 1);
        this.items.splice(newIndex, 0, item);
        this.updateListContent(log);
    };
    PouchDBDocumentList.prototype.updateListContent = function (log) {
        this.listContent$.next(log.addToValue(this.cloneItemsArray()));
    };
    /**
     * Moves the given item document up down index in the list.
     * @param item
     * @param log
     */
    PouchDBDocumentList.prototype.moveDown = function (item, log) {
        var _this = this;
        var run = log.start(this.logName, "moveDown", item.getDebugInfo());
        return this.getCurrentIndexOfItem(item, log).pipe(concatMap(function (result) {
            result.log.complete();
            var currentIndex = result.value;
            if (currentIndex < _this.items.length - 1) {
                var newIndex = currentIndex + 1;
                _this.moveItem(currentIndex, newIndex, item, run);
            }
            run.complete();
            return run.addTo(of(item));
        }));
    };
    PouchDBDocumentList.prototype.addItemAtIndex = function (index, item, log) {
        var _this = this;
        log = log.start(this.logName, "addItemAtIndex", { item: item.getDebugInfo(), index: index });
        return Observable.create(function (emitter) {
            _this.addItemToListAtIndex(index, item, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    };
    PouchDBDocumentList.prototype.addItemToListAtIndex = function (index, item, log) {
        this.items.splice(index, 0, item);
        this.itemAddedEvent(log);
    };
    PouchDBDocumentList.prototype.pushItem = function (item, log) {
        this.items.push(item);
        this.itemAddedEvent(log);
    };
    PouchDBDocumentList.prototype.itemAddedEvent = function (log) {
        log.logMessage(this.logName, "itemAddedEvent", { length: this.items.length });
        this.sort();
        this.updateListContent(log);
    };
    PouchDBDocumentList.prototype.cloneItemsArray = function () {
        var clone = [];
        this.items.forEach(function (item) {
            clone.push(item);
        });
        return clone;
    };
    PouchDBDocumentList.prototype.sort = function () { };
    /**
     * If the item with the same id already exists this will replace that item with the new version
     * of that item. Otherwise it will simply add the item.
     * @param item
     * @param log
     */
    PouchDBDocumentList.prototype.addOrUpdateItem = function (item, log) {
        log.logMessage(this.logName, "addOrUpdateItem", item.getDebugInfo());
        return this.addOrUpdateItemAtIndex(item, -1, log);
    };
    /**
     * Like [[addOrUpdateItem]] but it lets you specify at which index to put the item if it is not
     * in the list yet.
     * @param item
     * @param log
     */
    PouchDBDocumentList.prototype.addOrUpdateItemAtIndex = function (item, index, log) {
        var _this = this;
        log = log.start(this.logName, "addOrUpdateItemAtIndex", { index: index, item: item.getDebugInfo() });
        return Observable.create(function (emitter) {
            _this.addOrUpdateItemAtIndexSync(item, index, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    };
    PouchDBDocumentList.prototype.addOrUpdateItemAtIndexSync = function (item, index, log) {
        var _a = this.lookForItemWithTheSameId(item, log), existingIndex = _a.existingIndex, existingItem = _a.existingItem, isItemFound = _a.isItemFound;
        if (isItemFound) {
            this.replaceItemAtIndex(existingItem, existingIndex, item, log);
        }
        else {
            this.addNewItemAtIndex(log, item, index);
        }
    };
    PouchDBDocumentList.prototype.addNewItemAtIndex = function (log, item, index) {
        log.logMessage(this.logName, "addNewItemAtIndex", item.getDebugInfo());
        if (index === -1) {
            this.pushItem(item, log);
        }
        else {
            this.addItemToListAtIndex(index, item, log);
        }
    };
    PouchDBDocumentList.prototype.replaceItemAtIndex = function (existingItem, existingIndex, replacementItem, log) {
        log.logMessage(this.logName, "replaceItemAtIndex", { existingItem: existingItem.getDebugInfo(),
            existingIndex: existingIndex, replacementItem: replacementItem.getDebugInfo() });
        this.deleteItemFromList(existingItem, log);
        this.addItemToListAtIndex(existingIndex, replacementItem, log);
    };
    PouchDBDocumentList.prototype.lookForItemWithTheSameId = function (item, log) {
        var existingIndex = -1;
        var existingItem = null;
        var isItemFound = false;
        this.items.filter(function (listItem, itemIndex) {
            if (item.getId() === listItem.getId()) {
                existingIndex = itemIndex;
                existingItem = listItem;
                isItemFound = true;
            }
        });
        log.logMessage(this.logName, "lookForItemWithTheSameId", { item: item.getDebugInfo(), existingIndex: existingIndex,
            isItemFound: isItemFound, existingItem: existingItem !== null ? existingItem.getDebugInfo() : undefined });
        return { existingIndex: existingIndex, existingItem: existingItem, isItemFound: isItemFound };
    };
    PouchDBDocumentList.prototype.getItems = function (log) {
        var items = this.items;
        log = log.start(this.logName, "getItems", { length: items.length });
        return log.addTo(of(items));
    };
    PouchDBDocumentList.prototype.addItem = function (item, log) {
        var _this = this;
        log = log.start(this.logName, "addItem", item.getDebugInfo());
        return Observable.create(function (emitter) {
            _this.addItemToList(item, log);
            log.addToSubscriberNextAndComplete(emitter, log);
        });
    };
    PouchDBDocumentList.prototype.addItemToList = function (item, log) {
        log.logMessage(this.logName, "addItemToList", item.getDebugInfo());
        this.pushItem(item, log);
    };
    PouchDBDocumentList.prototype.addItemAtBeginning = function (item, log) {
        log.logMessage(this.logName, "addItemAtBeginning", item.getDebugInfo());
        return this.addItemAtIndex(0, item, log);
    };
    PouchDBDocumentList.prototype.deleteItem = function (itemToDelete, log) {
        var _this = this;
        log = log.start(this.logName, "deleteItem", itemToDelete.getDebugInfo());
        return Observable.create(function (emitter) {
            var itemIndex = _this.deleteItemFromList(itemToDelete, log);
            _this.updateListContent(log);
            log.addToSubscriberNextAndComplete(emitter, { item: itemToDelete, index: itemIndex });
        });
    };
    PouchDBDocumentList.prototype.deleteItemFromList = function (itemToDelete, log) {
        var _this = this;
        var itemIndex = -1;
        this.items = this.items.filter(function (item, index) {
            if (_this.isTheSameCheck(item, itemToDelete)) {
                itemIndex = index;
                return false;
            }
            return true;
        });
        log.logMessage(this.logName, "deleteItem remaining item length", { length: this.items.length });
        return itemIndex;
    };
    PouchDBDocumentList.prototype.isTheSameCheck = function (item, value) {
        return item.isTheSameDocumentAs(value);
    };
    /**
     * Works similar to [[addOrUpdateItem]] but will check if the an item with the same
     * values already exists. If it does it will not add this item.
     * @param item
     * @param log
     */
    PouchDBDocumentList.prototype.addUniqueItem = function (item, log) {
        var _this = this;
        log = log.start(this.logName, "addUniqueItem", item.getDebugInfo());
        return Observable.create(function (emitter) {
            var filtered = _this.items.filter(function (value) {
                if (_this.isTheSameCheck(item, value)) {
                    log.logMessage(_this.logName, "addUniqueItem item is already added", item.getDebugInfo());
                    return true;
                }
                return false;
            });
            if (filtered.length === 0) {
                _this.addItem(item, log).subscribe(function (result) { return result.log.addToSubscriberNextAndComplete(emitter, true); }, function (error) { return emitter.error(error); }, function () { });
            }
            else {
                log.addToSubscriberNextAndComplete(emitter, false);
            }
        });
    };
    PouchDBDocumentList.prototype.getSize = function (log) {
        var _this = this;
        log = log.start(this.logName, "getSize");
        return Observable.create(function (emitter) {
            var size = _this.items.length;
            log.logMessage(_this.logName, "getSize", { size: size });
            log.addToSubscriberNextAndComplete(emitter, size);
        });
    };
    PouchDBDocumentList.prototype.getItemAtIndex = function (index, log) {
        var _this = this;
        log = log.start(this.logName, "getItemAtIndex", { index: index });
        return Observable.create(function (emitter) {
            if (index >= _this.items.length) {
                var errorMessage = "index " + index + " is greater than the available number of items " + _this.items.length;
                log.logErrorAndSendSubscriberErrorComplete(emitter, _this.logName, "getItemAtIndex", errorMessage, { index: index, length: _this.items.length });
            }
            var item = _this.items[index];
            _this.log.logMessage(_this.logName, "getting item at index", { item: item.getDebugInfo(), index: index });
            log.logMessage(_this.logName, "getItemAtIndex item is", { item: item.getDebugInfo(), index: index });
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    };
    /**
     * By subscribing to a [[PouchDBWrapper]] all changes to that pouchdb are reflected
     * in this list.
     * @param db
     * @param log
     */
    PouchDBDocumentList.prototype.subscribeTo = function (db, log) {
        var _this = this;
        var logStart = log.start(this.logName, "subscribeTo", db.getDebugInfo());
        return db.getAllDocuments(log).pipe(concatMap(function (result) { return _this.loadInitialItems(result); }), concatMap(function (result) { return _this.initializeSubscriptions(result, db); }), concatMap(function () {
            return logStart.addTo(of(db));
        }));
    };
    PouchDBDocumentList.prototype.loadInitialItems = function (result) {
        var _this = this;
        var items = result.value;
        var log = result.log.start(this.logName, "loadInitialItems", { length: items.length });
        items.forEach(function (item) {
            _this.addItemToList(item, result.log);
        });
        log.complete();
        return of(log);
    };
    PouchDBDocumentList.prototype.initializeSubscriptions = function (log, db) {
        this.subscribeToDocSaved(db, log);
        this.subscribeToDocDeleted(db, log);
        return of(log);
    };
    PouchDBDocumentList.prototype.subscribeToDocSaved = function (db, log) {
        var _this = this;
        log.logMessage(this.logName, "subscribeToDocSaved", db.getDebugInfo());
        this.docSavedSubscription = db.docSaved$.subscribe(function (next) {
            var doc = next.value;
            var logStart = next.log.start(_this.logName, "subscribeToDocSaved adding new saved document " +
                "at beginning", doc.getDebugInfo());
            _this.addOrUpdateItemAtIndexSync(doc, 0, log);
            logStart.complete();
        }, function (error) {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(_this.logName, "something went wrong while subscribing to new documents " +
                "being added", error + "", { error: error });
        });
    };
    PouchDBDocumentList.prototype.unsubscribeFromDocSaved = function () {
        if (this.docSavedSubscription !== undefined) {
            this.docSavedSubscription.unsubscribe();
        }
    };
    PouchDBDocumentList.prototype.subscribeToDocDeleted = function (db, log) {
        var _this = this;
        log.logMessage(this.logName, "subscribeToDocDeleted");
        db.docDeleted$.pipe(concatMap(function (next) {
            var deletedDoc = next.value;
            next.log.start(_this.logName, "subscribeToDocDeleted doc was deleted", deletedDoc);
            return _this.deleteDeletedItem(deletedDoc, next.log);
        })).subscribe(function (next) {
            next.log.complete();
        }, function (error) {
            Logger.getLoggerTraceWithDB(log.getLogDB()).logError(_this.logName, "something went wrong while deleting document from db", error + "", error);
        });
    };
    /**
     * Removes a deleted item from the list.
     * @param deletedItem
     * @param log
     */
    PouchDBDocumentList.prototype.deleteDeletedItem = function (deletedItem, log) {
        var _this = this;
        log = log.start(this.logName, "deleteDeletedItem", deletedItem);
        return Observable.create(function (emitter) {
            _this.items = _this.items.filter(function (item) {
                return item.getId() !== deletedItem._id;
            });
            _this.updateListContent(log);
            log.addToSubscriberNextAndComplete(emitter, deletedItem);
        });
    };
    PouchDBDocumentList.prototype.changePositionOfItem = function (currentIndex, newIndex, log) {
        var _this = this;
        log = log.start(this.logName, "changePositionOfItem", { currentIndex: currentIndex, newIndex: newIndex });
        return Observable.create(function (emitter) {
            var item = _this.changePositionOfItemSync(currentIndex, newIndex, log);
            log.addToSubscriberNextAndComplete(emitter, item);
        });
    };
    PouchDBDocumentList.prototype.changePositionOfItemSync = function (currentIndex, newIndex, log) {
        var item = this.items[currentIndex];
        this.deleteItemFromList(item, log);
        this.addOrUpdateItemAtIndexSync(item, newIndex, log);
        return item;
    };
    return PouchDBDocumentList;
}());
export { PouchDBDocumentList };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQkRvY3VtZW50TGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsTUFBTSxFQUFrQixNQUFNLFVBQVUsQ0FBQztBQUVqRCxPQUFPLEVBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQWUsTUFBTSxNQUFNLENBQUM7QUFDbkUsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBZXpDOzs7R0FHRztBQUNIO0lBQUE7UUFFYyxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFFMUM7O1dBRUc7UUFDSCxpQkFBWSxHQUErQyxJQUFJLGVBQWUsQ0FDMUUsRUFBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLEVBQUMsQ0FBQyxDQUFDO1FBQ3JDLFVBQUssR0FBUSxFQUFFLENBQUM7UUFDbEIsUUFBRyxHQUFXLE1BQU0sQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQTRYbEUsQ0FBQztJQXpYVSxtREFBcUIsR0FBNUIsVUFBNkIsSUFBTyxFQUFFLEdBQVc7UUFBakQsaUJBY0M7UUFiRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLE9BQU87WUFDNUIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDdEIsS0FBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQyxXQUFXLEVBQUUsU0FBUztnQkFDbkMsSUFBSSxXQUFXLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3ZDLFlBQVksR0FBRyxTQUFTLENBQUM7b0JB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