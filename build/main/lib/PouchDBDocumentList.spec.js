"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../types/JasmineExtension.d.ts" />
const PouchDBDocumentList_1 = require("./PouchDBDocumentList");
const PouchDBDocument_1 = require("./PouchDBDocument");
const CustomJasmineMatchers_1 = require("./CustomJasmineMatchers");
const PouchDBWrapper_1 = require("./PouchDBWrapper");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const Logger_1 = require("./Logger");
const CouchDBWrapper_1 = require("./CouchDBWrapper");
const LOG_NAME = "PouchDBDocumentListTest";
class ListItemImplementation extends PouchDBDocument_1.PouchDBDocument {
    setNameTo(name, log) {
        log.logMessage(LOG_NAME, "setting item name to", { name: name });
        this.name = name;
        return log.addTo(rxjs_1.of(name));
    }
    addOrUpdateOn(list, log) {
        return list.addOrUpdateItem(this, log);
    }
    shouldHaveName(name) {
        expect(this.name).toBe(name);
    }
    addValuesToJSONDocument(json) {
        json.name = this.name;
    }
    getNameOfDoc() {
        return "ListItemImplementation";
    }
}
exports.ListItemImplementation = ListItemImplementation;
function createItem(dateMinus) {
    const item = test.createNewItem();
    item.setId((new Date().valueOf() - dateMinus) + "");
    return item;
}
class ListItemImplementationGenerator extends PouchDBDocument_1.PouchDBDocumentGenerator {
    createDocument(json) {
        const item = new ListItemImplementation();
        item.name = json.name;
        return item;
    }
}
class ListImplementation extends PouchDBDocumentList_1.PouchDBDocumentList {
    getItemWithName(name) {
        const filterResult = this.items.filter((item) => {
            return item.name === name;
        });
        return filterResult[0];
    }
}
class AfterItemFunctions {
    constructor(observable) {
        this.observable = observable;
    }
    theList(list) {
        const self = this;
        return {
            shouldHaveSize: function (size) {
                let originalResult;
                return self.observable.pipe(operators_1.concatMap(result => {
                    originalResult = result;
                    return list.getSize(result.log);
                }), operators_1.concatMap(result => {
                    const listSize = result.value;
                    expect(listSize).toBe(size);
                    test.listContentOf(list).shouldHaveSizeSync(size);
                    return rxjs_1.of(originalResult);
                }));
            }
        };
    }
    theItemIn(list) {
        const self = this;
        return {
            atIndex: function (index) {
                return {
                    shouldHaveName: function (name, observable) {
                        return test.itemIn(list).atIndex(index).shouldHaveName(name, observable);
                    },
                    fromListContentShouldHaveName: function (name) {
                        let originalResult;
                        return self.observable.pipe(operators_1.concatMap(result => {
                            originalResult = result;
                            return list.listContent$;
                        }), operators_1.concatMap(result => {
                            const items = result.value;
                            items[index].shouldHaveName(name);
                            return rxjs_1.of(originalResult);
                        }));
                    }
                };
            }
        };
    }
}
const test = {
    afterItemWasAddedTo: function (observable) {
        return new AfterItemFunctions(observable);
    },
    afterItemWasDeletedFrom: function (observable) {
        return new AfterItemFunctions(observable);
    },
    add: function (item) {
        return {
            to: function (list, log) {
                return {
                    atTheEnd: function () {
                        return list.addItem(item, log);
                    },
                    atIndex: function (index) {
                        return list.addItemAtIndex(index, item, log);
                    },
                    atTheBeginning: function () {
                        return list.addItemAtBeginning(item, log);
                    },
                    orUpdate: function () {
                        return list.addOrUpdateItem(item, log);
                    }
                };
            }
        };
    },
    deleteItem: function (item) {
        return {
            fromList: function (list, log) {
                return list.deleteItem(item, log);
            }
        };
    },
    tryToAdd: function (item) {
        return {
            againAsAUniqueItemTo: function (list, log) {
                return this.asAUniqueItemTo(list, log);
            },
            asAUniqueItemTo: function (list, log) {
                list.addUniqueItem(item, log);
            }
        };
    },
    itemIn: function (list) {
        return {
            atIndex: function (index) {
                return {
                    shouldHaveName: function (name, log) {
                        list.getItemAtIndex(index, log).pipe(operators_1.concatMap(result => {
                            const item = result.value;
                            item.shouldHaveName(name);
                            return rxjs_1.of(result);
                        }));
                    }
                };
            },
        };
    },
    createNewList: function () {
        return new ListImplementation();
    },
    createNewItem: function () {
        return new ListItemImplementation();
    },
    createLocalDB: function (log = test.getLogger()) {
        const startLog = log.start(LOG_NAME, "createLocalDB");
        const dbName = "list_test";
        return PouchDBWrapper_1.PouchDBWrapper.destroyLocalDB(dbName, log).pipe(operators_1.concatMap(result => PouchDBWrapper_1.PouchDBWrapper.loadLocalDB(dbName, new ListItemImplementationGenerator(), result.log)), operators_1.tap(result => {
            result.log.complete();
            startLog.complete();
        }));
    },
    addItemTo: function (db, log) {
        return {
            withName: function (name, minus = 0) {
                const item = createItem(minus);
                return item.setNameTo(name, log).pipe(operators_1.concatMap((result) => {
                    return db.saveDocument(item, result.log);
                }), operators_1.concatMap((result) => {
                    return result.log.addTo(rxjs_1.of(db));
                }));
            }
        };
    },
    deleteItemFrom: function (db, log) {
        return {
            withNameAndList: function (name, list) {
                const item = list.getItemWithName(name);
                return db.deleteDocument(item, log);
            }
        };
    },
    make: function (list) {
        return {
            subscribeTo: function (dbResult) {
                return list.subscribeTo(dbResult.value, dbResult.log);
            }
        };
    },
    after: function (list) {
        return {
            subscriptionWasAddedTo: function (observable) {
                return {
                    listShouldHaveSize(size) {
                        let db;
                        let originalResult;
                        return observable.pipe(operators_1.concatMap(result => {
                            db = result.value;
                            originalResult = result;
                            return list.getSize(result.log);
                        }), operators_1.concatMap(result => {
                            const listSize = result.value;
                            console.log("list subscription result size", listSize, "db", db);
                            expect(listSize).toBe(size);
                            return rxjs_1.of(originalResult);
                        }));
                    }
                };
            }
        };
    },
    listContentOf: function (list) {
        return {
            shouldHaveSize: function (size, log) {
                const actualSize = list.listContent$.getValue().value.length;
                log.logMessage(LOG_NAME, "list content should have size", { expected: size, actual: actualSize });
                expect(actualSize).toBe(size);
                return log.addTo(rxjs_1.of(actualSize));
            },
            shouldHaveItemAtIndex: function (index) {
                return {
                    withName: function (name, log) {
                        log.logMessage(LOG_NAME, "list content should have item at index", { expected_name: name, expected_index: index });
                        const item = list.listContent$.getValue()[index];
                        if (item === undefined) {
                            const errorMsg = "item in list content at index " + index + " is undefined";
                            log.logError(LOG_NAME, "list content should have item at index error", errorMsg);
                            fail(errorMsg);
                            return rxjs_1.throwError(errorMsg);
                        }
                        item.shouldHaveName(name);
                        return log.addTo(rxjs_1.of(name));
                    }
                };
            }
        };
    },
    theItem: function (item) {
        return {
            inList: function (list) {
                return {
                    shouldBeAtIndex: function (index, log) {
                        return list.getCurrentIndexOfItem(item, log).pipe(operators_1.concatMap(result => {
                            const listIndex = result.value;
                            expect(listIndex).toBe(index);
                            return result.log.addTo(rxjs_1.of(item));
                        }));
                    }
                };
            }
        };
    },
    theList: function (list) {
        return {
            shouldHaveSize: function (size, log) {
                return list.getSize(log).pipe(operators_1.concatMap(result => {
                    const listSize = result.value;
                    expect(listSize).toBe(size);
                    return result.log.addTo(rxjs_1.of(listSize));
                }));
            },
            shouldBeInThisOrder: function (order, log) {
                return list.getItems(log).pipe(operators_1.concatMap(result => {
                    result.log.complete();
                    const items = result.value;
                    expect(items).toBeInThisOrder(order);
                    return log.addTo(rxjs_1.of(items));
                }));
            }
        };
    },
    concatMapPipe: function (observable, callFunctions) {
        const concatMaps = [];
        callFunctions.forEach(callFunction => {
            concatMaps.push(operators_1.concatMap((result) => callFunction(result)));
        });
        return observable.pipe.apply(observable, concatMaps);
    },
    moveItem: function (item) {
        return {
            upInList: function (list, log) {
                return list.moveUp(item, log);
            },
            downInList: function (list, log) {
                return list.moveDown(item, log);
            }
        };
    },
    subscribeToEnd: function (observable, complete, log) {
        observable.pipe(operators_1.catchError(error => {
            return log.logError(LOG_NAME, "subscribeToEnd", error + "", error).pipe(operators_1.concatMap(() => {
                return rxjs_1.throwError(error);
            }));
        }), operators_1.concatMap(() => log.complete())).subscribe(next => {
            complete();
        }, error => {
            fail(error);
            complete();
        });
    },
    getLogger: function () {
        const log = Logger_1.Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    },
    createStartObservable(testName) {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, testName);
        const startObservable = rxjs_1.of({ value: "", log: log });
        return { startObservable, startLog, log };
    }
};
let logDB;
const LOG_DB_CONF = new CouchDBWrapper_1.CouchDBConf();
LOG_DB_CONF.dbName = "dev-log";
LOG_DB_CONF.port = 5984;
LOG_DB_CONF.host = "couchdb-test";
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "loggingUser",
    password: "somepassword"
});
describe("PouchDBDocumentList tests", () => {
    beforeAll(complete => {
        PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger_1.Logger.getLoggerTrace()).subscribe(result => {
            logDB = result.value;
            complete();
        });
    });
    beforeEach(() => {
        jasmine.addMatchers(CustomJasmineMatchers_1.CustomJasmineMatchers.getMatchers());
    });
    const should_have_one_item_after_adding_an_item_to_an_empty_list = "should have one item after adding an item to an empty list";
    it(should_have_one_item_after_adding_an_item_to_an_empty_list, complete => {
        const list = test.createNewList();
        const item = test.createNewItem();
        const { startObservable, startLog } = test.createStartObservable(should_have_one_item_after_adding_an_item_to_an_empty_list);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)), operators_1.concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_have_length_0_after_deleting_an_item = "should have length 0 after deleting an item";
    it(should_have_length_0_after_deleting_an_item, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_have_length_0_after_deleting_an_item);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), operators_1.concatMap((result) => test.deleteItem(item).fromList(list, result.log)), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_return_0_when_getting_the_index_of_the_only_item_in_the_list = "should return 0 when getting the index of the only item in the list";
    it(should_return_0_when_getting_the_index_of_the_only_item_in_the_list, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_return_0_when_getting_the_index_of_the_only_item_in_the_list);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), operators_1.concatMap((result) => test.theItem(item).inList(list)
            .shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_the_item_at_index_0_before_the_existing_one = "should add the item at index 0 before the existing one";
    it(should_add_the_item_at_index_0_before_the_existing_one, complete => {
        const list = new ListImplementation();
        const item1 = new ListItemImplementation();
        item1.setId(item1.getId() + "0");
        const item2 = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_add_the_item_at_index_0_before_the_existing_one);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.add(item1).to(list, result.log).atTheEnd()), operators_1.concatMap((result) => test.add(item2).to(list, result.log).atIndex(0)), operators_1.concatMap((result) => test.theItem(item1).inList(list).shouldBeAtIndex(1, result.log)), operators_1.concatMap((result) => test.theItem(item2).inList(list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    function createListWithTwoItems(observable) {
        let list, item1, item2, logStart;
        return observable.pipe(operators_1.concatMap(result => {
            logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
            list = new ListImplementation();
            item1 = createItem(100);
            item2 = createItem(0);
            return result.log.addTo(rxjs_1.zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
        }), operators_1.concatMap(result => {
            logStart.complete();
            return result.log.addTo(rxjs_1.of({ list, item1, item2 }));
        }));
    }
    const should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1, result.log);
        }), operators_1.concatMap((result) => test.moveItem(values.item2).upInList(values.list, result.log)), operators_1.concatMap((result) => test.theItem(values.item2)
            .inList(values.list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 = "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.moveItem(values.item2).upInList(values.list, result.log);
        }), operators_1.concatMap((result) => test.moveItem(values.item2).upInList(values.list, result.log)), operators_1.concatMap((result) => test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    it("should move the item down from index 0 to index 1", complete => {
        const { startObservable, startLog } = test.createStartObservable(should_not_move_the_item_down_more_than_index_1);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
        }), operators_1.concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), operators_1.concatMap((result) => test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_not_move_the_item_down_more_than_index_1 = "should not move the item down more than index 1";
    it(should_not_move_the_item_down_more_than_index_1, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
        }), operators_1.concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), operators_1.concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), operators_1.concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), operators_1.concatMap((result) => test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_just_add_the_item_because_it_does_not_exist_yet = "should just add the item because it doesn't exist yet";
    it(should_just_add_the_item_because_it_does_not_exist_yet, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_just_add_the_item_because_it_does_not_exist_yet);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.add(item).to(list, result.log).orUpdate()), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_update_the_item_with_the_new_contents = "should update the item with the new contents";
    it(should_update_the_item_with_the_new_contents, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const firstName = "first name";
        const secondName = "second name";
        const { startObservable, startLog } = test.createStartObservable(should_update_the_item_with_the_new_contents);
        const observable = startObservable.pipe(operators_1.concatMap((result) => item.setNameTo(firstName, result.log)), operators_1.concatMap((result) => item.addOrUpdateOn(list, result.log)), operators_1.concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(firstName, result.log)), operators_1.concatMap((result) => item.setNameTo(secondName, result.log)), operators_1.concatMap((result) => item.addOrUpdateOn(list, result.log)), operators_1.concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(secondName, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_two_more_items_between_item1_and_item2 = "should add two more items between item1 and item2";
    it(should_add_two_more_items_between_item1_and_item2, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_add_two_more_items_between_item1_and_item2);
        const item3 = createItem(200);
        const item4 = createItem(300);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.add(item3).to(values.list, result.log).atIndex(1);
        }), operators_1.concatMap((result) => test.add(item4).to(values.list, result.log).atIndex(2)), operators_1.concatMap((result) => test.theList(values.list).shouldHaveSize(4, result.log)), operators_1.concatMap((result) => test.theList(values.list).shouldBeInThisOrder([
            values.item1,
            item3,
            item4,
            values.item2
        ], result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_the_item_at_the_beginning = "should add the item at the beginning";
    it(should_add_the_item_at_the_beginning, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_add_the_item_at_the_beginning);
        const item3 = createItem(200);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.add(item3).to(values.list, result.log).atTheBeginning();
        }), operators_1.concatMap((result) => test.theList(values.list).shouldBeInThisOrder([
            item3, values.item1, values.item2
        ], result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_not_add_the_same_unique_item = "should not add the same unique item";
    it(should_not_add_the_same_unique_item, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_not_add_the_same_unique_item);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.tryToAdd(values.item1).againAsAUniqueItemTo(values.list, result.log);
        }), operators_1.concatMap((result) => test.theList(values.list).shouldHaveSize(2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_the_new_unique_item_because_it_is_not_in_the_list_yet = "should add the new unique item because it is not in the list yet";
    it(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet);
        const item = createItem(200);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(operators_1.concatMap(result => {
            values = result.value;
            return test.tryToAdd(item).asAUniqueItemTo(values.list, result.log);
        }), operators_1.concatMap((result) => test.tryToAdd(item).againAsAUniqueItemTo(values.list, result.log)), operators_1.concatMap((result) => test.theList(values.list).shouldHaveSize(2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    function createDBWithTwoItemsAndSubscribeWithList(log) {
        const startLog = log.start(LOG_NAME, "createDBWithTwoItemsAndSubscribeWithList");
        const name1 = "name1";
        const name2 = "name2";
        const list = test.createNewList();
        return test.createLocalDB().pipe(operators_1.concatMap((result) => test.addItemTo(result.value, result.log).withName(name1, 100)), operators_1.concatMap((result) => test.addItemTo(result.value, result.log).withName(name2)), operators_1.concatMap((result) => test.make(list).subscribeTo(result)), operators_1.concatMap((result) => {
            startLog.complete();
            return result.log.addTo(rxjs_1.of({ list, name1, name2 }));
        }));
    }
    const should_initialize_the_list_from_PouchDBWrapper = "should initialize the list from PouchDBWrapper";
    it(should_initialize_the_list_from_PouchDBWrapper, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_initialize_the_list_from_PouchDBWrapper);
        const observable = startObservable.pipe(operators_1.concatMap((result) => createDBWithTwoItemsAndSubscribeWithList(result.log)), operators_1.concatMap((result) => {
            test.theList(result.value.list).shouldHaveSize(2, result.log);
            return rxjs_1.of(result);
        }));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list = "should after subscription automatically add a new item to the beginning of the list";
    it(should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list);
        const list = test.createNewList();
        const name1 = "name1";
        const name2 = "name2";
        let db;
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.createLocalDB()), operators_1.concatMap((result) => {
            db = result.value;
            return test.make(list).subscribeTo(result);
        }), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)), operators_1.concatMap((result) => test.addItemTo(db, result.log).withName(name1, 100)), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)), operators_1.concatMap((result) => test.addItemTo(db, result.log).withName(name2)), operators_1.concatMap((result) => test.theList(list).shouldHaveSize(2, result.log)), operators_1.concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(name1, result.log)), operators_1.concatMap((result) => test.itemIn(list).atIndex(1).shouldHaveName(name2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_after_subscribe_delete_elements_from_the_list);
        let values;
        let db;
        const observable = startObservable.pipe(operators_1.concatMap((result) => {
            db = result.value;
            return createDBWithTwoItemsAndSubscribeWithList(result.log);
        }), operators_1.concatMap((result) => {
            values = result.value;
            return test.deleteItemFrom(db).withNameAndList(values.name1, values.list);
        }), operators_1.concatMap((result) => test.theList(values.list).shouldHaveSize(1, result.log)), operators_1.concatMap((result) => test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_trigger_a_list_change_event_on_add_and_delete = "should trigger a list change event on add and delete";
    it(should_trigger_a_list_change_event_on_add_and_delete, complete => {
        const list = test.createNewList();
        const name1 = "name1";
        const item1 = test.createNewItem();
        const name2 = "name2";
        const item2 = test.createNewItem();
        item1.setId(item1.getId() + "0");
        const { startObservable, startLog } = test.createStartObservable(should_trigger_a_list_change_event_on_add_and_delete);
        const observable = startObservable.pipe(operators_1.concatMap((result) => test.listContentOf(list).shouldHaveSize(0, result.log)), operators_1.concatMap((result) => item1.setNameTo(name1, result.log)), operators_1.concatMap((result) => test.add(item1).to(list, result.log).atIndex(0)), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveSize(1, result.log)), operators_1.concatMap((result) => item2.setNameTo(name2, result.log)), operators_1.concatMap((result) => test.add(item2).to(list, result.log).atTheBeginning()), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveSize(2, result.log)), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2, result.log)), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(1).withName(name1, result.log)), operators_1.concatMap((result) => test.deleteItem(item2).fromList(list, result.log)), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveSize(1, result.log)), operators_1.concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnRMaXN0LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBdUQ7QUFDdkQsK0RBQTBEO0FBQzFELHVEQUFpRztBQUNqRyxtRUFBOEQ7QUFDOUQscURBQWdFO0FBQ2hFLDhDQUEwRDtBQUMxRCwrQkFJYztBQUNkLHFDQUFpRDtBQUNqRCxxREFBNkM7QUFFN0MsTUFBTSxRQUFRLEdBQUcseUJBQXlCLENBQUM7QUFNM0MsTUFBYSxzQkFBdUIsU0FBUSxpQ0FBMkM7SUFHbkYsU0FBUyxDQUFDLElBQVksRUFBRSxHQUFXO1FBQy9CLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLHNCQUFzQixFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBd0IsRUFBRSxHQUFXO1FBQy9DLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELGNBQWMsQ0FBQyxJQUFZO1FBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFUyx1QkFBdUIsQ0FBQyxJQUFnQztRQUM5RCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDMUIsQ0FBQztJQUVTLFlBQVk7UUFDbEIsT0FBTyx3QkFBd0IsQ0FBQztJQUNwQyxDQUFDO0NBQ0o7QUF4QkQsd0RBd0JDO0FBRUQsU0FBUyxVQUFV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MUQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FDbkMscUJBQVMsQ0FBQyxDQUFDLE1BQXVCLEVBQUUsRUFBRSxDQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQzNELHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ3ZDLHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEQscUJBQVMsQ0FBQyxDQUFDLE1BQXVCLEVBQUUsRUFBRSxDQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQzNELHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ3ZDLHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUMxRCxxQkFBUyxDQUFDLENBQUMsTUFBdUIsRUFBRSxFQUFFLENBQ2xDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDM0QscUJBQVMsQ0FBQyxDQUFDLE1BQXVCLEVBQUUsRUFBRSxDQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ2xGLHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNsRixxQkFBUyxDQUFDLENBQUMsTUFBdUIsRUFBRSxFQUFFLENBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDdEQscUJBQVMsQ0FBQyxDQUFDLE1BQXVCLEVBQUUsRUFBRSxDQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQzNELHFCQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNyRixDQUFDO1FBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMifQ==