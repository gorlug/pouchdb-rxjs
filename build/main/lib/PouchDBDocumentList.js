"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Logger_1 = require("./Logger");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
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
        this.listContent$ = new rxjs_1.BehaviorSubject({ value: [], log: Logger_1.Logger.getLoggerTrace() });
        this.items = [];
        this.log = Logger_1.Logger.getLogger("PouchDBDocumentList");
    }
    PouchDBDocumentList.prototype.getCurrentIndexOfItem = function (item, log) {
        var _this = this;
        log = log.start(this.logName, "getCurrentIndexOfItem", item.getDebugInfo());
        return rxjs_1.Observable.create(function (emitter) {
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
        return this.getCurrentIndexOfItem(item, log).pipe(operators_1.concatMap(function (result) {
            result.log.complete();
            var currentIndex = result.value;
            if (currentIndex >= 0) {
                var newIndex = currentIndex - 1;
                _this.moveItem(currentIndex, newIndex, item, logStart);
            }
            logStart.complete();
            return logStart.addTo(rxjs_1.of(item));
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
        return this.getCurrentIndexOfItem(item, log).pipe(operators_1.concatMap(function (result) {
            result.log.complete();
            var currentIndex = result.value;
            if (currentIndex < _this.items.length - 1) {
                var newIndex = currentIndex + 1;
                _this.moveItem(currentIndex, newIndex, item, run);
            }
            run.complete();
            return run.addTo(rxjs_1.of(item));
        }));
    };
    PouchDBDocumentList.prototype.addItemAtIndex = function (index, item, log) {
        var _this = this;
        log = log.start(this.logName, "addItemAtIndex", { item: item.getDebugInfo(), index: index });
        return rxjs_1.Observable.create(function (emitter) {
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
        return rxjs_1.Observable.create(function (emitter) {
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
        return log.addTo(rxjs_1.of(items));
    };
    PouchDBDocumentList.prototype.addItem = function (item, log) {
        var _this = this;
        log = log.start(this.logName, "addItem", item.getDebugInfo());
        return rxjs_1.Observable.create(function (emitter) {
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
        return rxjs_1.Observable.create(function (emitter) {
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
        return rxjs_1.Observable.create(function (emitter) {
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
        return rxjs_1.Observable.create(function (emitter) {
            var size = _this.items.length;
            log.logMessage(_this.logName, "getSize", { size: size });
            log.addToSubscriberNextAndComplete(emitter, size);
        });
    };
    PouchDBDocumentList.prototype.getItemAtIndex = function (index, log) {
        var _this = this;
        log = log.start(this.logName, "getItemAtIndex", { index: index });
        return rxjs_1.Observable.create(function (emitter) {
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
        return db.getAllDocuments(log).pipe(operators_1.concatMap(function (result) { return _this.loadInitialItems(result); }), operators_1.concatMap(function (result) { return _this.initializeSubscriptions(result, db); }), operators_1.concatMap(function () {
            return logStart.addTo(rxjs_1.of(db));
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
        return rxjs_1.of(log);
    };
    PouchDBDocumentList.prototype.initializeSubscriptions = function (log, db) {
        this.subscribeToDocSaved(db, log);
        this.subscribeToDocDeleted(db, log);
        return rxjs_1.of(log);
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
            Logger_1.Logger.getLoggerTraceWithDB(log.getLogDB()).logError(_this.logName, "something went wrong while subscribing to new documents " +
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
        db.docDeleted$.pipe(operators_1.concatMap(function (next) {
            var deletedDoc = next.value;
            next.log.start(_this.logName, "subscribeToDocDeleted doc was deleted", deletedDoc);
            return _this.deleteDeletedItem(deletedDoc, next.log);
        })).subscribe(function (next) {
            next.log.complete();
        }, function (error) {
            Logger_1.Logger.getLoggerTraceWithDB(log.getLogDB()).logError(_this.logName, "something went wrong while deleting document from db", error + "", error);
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
        return rxjs_1.Observable.create(function (emitter) {
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
        return rxjs_1.Observable.create(function (emitter) {
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
exports.PouchDBDocumentList = PouchDBDocumentList;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvUG91Y2hEQkRvY3VtZW50TGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLG1DQUFpRDtBQUVqRCw2QkFBbUU7QUFDbkUsNENBQXlDO0FBZXpDOzs7R0FHRztBQUNIO0lBQUE7UUFFYyxZQUFPLEdBQUcscUJBQXFCLENBQUM7UUFFMUM7O1dBRUc7UUFDSCxpQkFBWSxHQUErQyxJQUFJLHNCQUFlLENBQzFFLEVBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsZUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFDLENBQUMsQ0FBQztRQUNyQyxVQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLFFBQUcsR0FBVyxlQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUE0WGxFLENBQUM7SUF6WFUsbURBQXFCLEdBQTVCLFVBQTZCLElBQU8sRUFBRSxHQUFXO1FBQWpELGlCQWNDO1FBYkcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUM1RSxPQUFPLGlCQUFVLENBQUMsTUFBTSxDQUFDLFVBQUEsT0FBTztZQUM1QixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN0QixLQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFDLFdBQVcsRUFBRSxTQUFTO2dCQUNuQyxJQUFJLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDdkMsWUFBWSxHQUFHLFNBQVMsQ0FBQztvQkFDekIsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDLENBQUM7WUFDSCxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUksQ0FBQyxP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