/// <reference path="../types/JasmineExtension.d.ts" />
import { PouchDBDocumentList } from "./PouchDBDocumentList";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { CustomJasmineMatchers } from "./CustomJasmineMatchers";
import { PouchDBWrapper } from "./PouchDBWrapper";
import { catchError, concatMap, tap } from "rxjs/operators";
import { of, zip, throwError } from "rxjs";
import { Logger } from "./Logger";
import { CouchDBConf } from "./CouchDBWrapper";
const LOG_NAME = "PouchDBDocumentListTest";
export class ListItemImplementation extends PouchDBDocument {
    setNameTo(name, log) {
        log.logMessage(LOG_NAME, "setting item name to", { name: name });
        this.name = name;
        return log.addTo(of(name));
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
function createItem(dateMinus) {
    const item = test.createNewItem();
    item.setId((new Date().valueOf() - dateMinus) + "");
    return item;
}
class ListItemImplementationGenerator extends PouchDBDocumentGenerator {
    createDocument(json) {
        const item = new ListItemImplementation();
        item.name = json.name;
        return item;
    }
}
class ListImplementation extends PouchDBDocumentList {
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
                return self.observable.pipe(concatMap(result => {
                    originalResult = result;
                    return list.getSize(result.log);
                }), concatMap(result => {
                    const listSize = result.value;
                    expect(listSize).toBe(size);
                    test.listContentOf(list).shouldHaveSizeSync(size);
                    return of(originalResult);
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
                        return self.observable.pipe(concatMap(result => {
                            originalResult = result;
                            return list.listContent$;
                        }), concatMap(result => {
                            const items = result.value;
                            items[index].shouldHaveName(name);
                            return of(originalResult);
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
                        list.getItemAtIndex(index, log).pipe(concatMap(result => {
                            const item = result.value;
                            item.shouldHaveName(name);
                            return of(result);
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
        return PouchDBWrapper.destroyLocalDB(dbName, log).pipe(concatMap(result => PouchDBWrapper.loadLocalDB(dbName, new ListItemImplementationGenerator(), result.log)), tap(result => {
            result.log.complete();
            startLog.complete();
        }));
    },
    addItemTo: function (db, log) {
        return {
            withName: function (name, minus = 0) {
                const item = createItem(minus);
                return item.setNameTo(name, log).pipe(concatMap((result) => {
                    return db.saveDocument(item, result.log);
                }), concatMap((result) => {
                    return result.log.addTo(of(db));
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
                        return observable.pipe(concatMap(result => {
                            db = result.value;
                            originalResult = result;
                            return list.getSize(result.log);
                        }), concatMap(result => {
                            const listSize = result.value;
                            console.log("list subscription result size", listSize, "db", db);
                            expect(listSize).toBe(size);
                            return of(originalResult);
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
                return log.addTo(of(actualSize));
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
                            return throwError(errorMsg);
                        }
                        item.shouldHaveName(name);
                        return log.addTo(of(name));
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
                        return list.getCurrentIndexOfItem(item, log).pipe(concatMap(result => {
                            const listIndex = result.value;
                            expect(listIndex).toBe(index);
                            return result.log.addTo(of(item));
                        }));
                    }
                };
            }
        };
    },
    theList: function (list) {
        return {
            shouldHaveSize: function (size, log) {
                return list.getSize(log).pipe(concatMap(result => {
                    const listSize = result.value;
                    expect(listSize).toBe(size);
                    return result.log.addTo(of(listSize));
                }));
            },
            shouldBeInThisOrder: function (order, log) {
                return list.getItems(log).pipe(concatMap(result => {
                    result.log.complete();
                    const items = result.value;
                    expect(items).toBeInThisOrder(order);
                    return log.addTo(of(items));
                }));
            }
        };
    },
    concatMapPipe: function (observable, callFunctions) {
        const concatMaps = [];
        callFunctions.forEach(callFunction => {
            concatMaps.push(concatMap((result) => callFunction(result)));
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
        observable.pipe(catchError(error => {
            return log.logError(LOG_NAME, "subscribeToEnd", error + "", error).pipe(concatMap(() => {
                return throwError(error);
            }));
        }), concatMap(() => log.complete())).subscribe(next => {
            complete();
        }, error => {
            fail(error);
            complete();
        });
    },
    getLogger: function () {
        const log = Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    },
    createStartObservable(testName) {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, testName);
        const startObservable = of({ value: "", log: log });
        return { startObservable, startLog, log };
    }
};
let logDB;
const LOG_DB_CONF = new CouchDBConf();
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
        PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger.getLoggerTrace()).subscribe(result => {
            logDB = result.value;
            complete();
        });
    });
    beforeEach(() => {
        jasmine.addMatchers(CustomJasmineMatchers.getMatchers());
    });
    const should_have_one_item_after_adding_an_item_to_an_empty_list = "should have one item after adding an item to an empty list";
    it(should_have_one_item_after_adding_an_item_to_an_empty_list, complete => {
        const list = test.createNewList();
        const item = test.createNewItem();
        const { startObservable, startLog } = test.createStartObservable(should_have_one_item_after_adding_an_item_to_an_empty_list);
        const observable = startObservable.pipe(concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)), concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_have_length_0_after_deleting_an_item = "should have length 0 after deleting an item";
    it(should_have_length_0_after_deleting_an_item, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_have_length_0_after_deleting_an_item);
        const observable = startObservable.pipe(concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), concatMap((result) => test.deleteItem(item).fromList(list, result.log)), concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_return_0_when_getting_the_index_of_the_only_item_in_the_list = "should return 0 when getting the index of the only item in the list";
    it(should_return_0_when_getting_the_index_of_the_only_item_in_the_list, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_return_0_when_getting_the_index_of_the_only_item_in_the_list);
        const observable = startObservable.pipe(concatMap((result) => test.add(item).to(list, result.log).atTheBeginning()), concatMap((result) => test.theItem(item).inList(list)
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
        const observable = startObservable.pipe(concatMap((result) => test.add(item1).to(list, result.log).atTheEnd()), concatMap((result) => test.add(item2).to(list, result.log).atIndex(0)), concatMap((result) => test.theItem(item1).inList(list).shouldBeAtIndex(1, result.log)), concatMap((result) => test.theItem(item2).inList(list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    function createListWithTwoItems(observable) {
        let list, item1, item2, logStart;
        return observable.pipe(concatMap(result => {
            logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
            list = new ListImplementation();
            item1 = createItem(100);
            item2 = createItem(0);
            return result.log.addTo(zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
        }), concatMap(result => {
            logStart.complete();
            return result.log.addTo(of({ list, item1, item2 }));
        }));
    }
    const should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1, result.log);
        }), concatMap((result) => test.moveItem(values.item2).upInList(values.list, result.log)), concatMap((result) => test.theItem(values.item2)
            .inList(values.list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 = "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.moveItem(values.item2).upInList(values.list, result.log);
        }), concatMap((result) => test.moveItem(values.item2).upInList(values.list, result.log)), concatMap((result) => test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    it("should move the item down from index 0 to index 1", complete => {
        const { startObservable, startLog } = test.createStartObservable(should_not_move_the_item_down_more_than_index_1);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
        }), concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), concatMap((result) => test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_not_move_the_item_down_more_than_index_1 = "should not move the item down more than index 1";
    it(should_not_move_the_item_down_more_than_index_1, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
        }), concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), concatMap((result) => test.moveItem(values.item1).downInList(values.list, result.log)), concatMap((result) => test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_just_add_the_item_because_it_does_not_exist_yet = "should just add the item because it doesn't exist yet";
    it(should_just_add_the_item_because_it_does_not_exist_yet, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const { startObservable, startLog } = test.createStartObservable(should_just_add_the_item_because_it_does_not_exist_yet);
        const observable = startObservable.pipe(concatMap((result) => test.add(item).to(list, result.log).orUpdate()), concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_update_the_item_with_the_new_contents = "should update the item with the new contents";
    it(should_update_the_item_with_the_new_contents, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const firstName = "first name";
        const secondName = "second name";
        const { startObservable, startLog } = test.createStartObservable(should_update_the_item_with_the_new_contents);
        const observable = startObservable.pipe(concatMap((result) => item.setNameTo(firstName, result.log)), concatMap((result) => item.addOrUpdateOn(list, result.log)), concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(firstName, result.log)), concatMap((result) => item.setNameTo(secondName, result.log)), concatMap((result) => item.addOrUpdateOn(list, result.log)), concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(secondName, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_two_more_items_between_item1_and_item2 = "should add two more items between item1 and item2";
    it(should_add_two_more_items_between_item1_and_item2, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_add_two_more_items_between_item1_and_item2);
        const item3 = createItem(200);
        const item4 = createItem(300);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.add(item3).to(values.list, result.log).atIndex(1);
        }), concatMap((result) => test.add(item4).to(values.list, result.log).atIndex(2)), concatMap((result) => test.theList(values.list).shouldHaveSize(4, result.log)), concatMap((result) => test.theList(values.list).shouldBeInThisOrder([
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
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.add(item3).to(values.list, result.log).atTheBeginning();
        }), concatMap((result) => test.theList(values.list).shouldBeInThisOrder([
            item3, values.item1, values.item2
        ], result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_not_add_the_same_unique_item = "should not add the same unique item";
    it(should_not_add_the_same_unique_item, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_not_add_the_same_unique_item);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.tryToAdd(values.item1).againAsAUniqueItemTo(values.list, result.log);
        }), concatMap((result) => test.theList(values.list).shouldHaveSize(2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_the_new_unique_item_because_it_is_not_in_the_list_yet = "should add the new unique item because it is not in the list yet";
    it(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet);
        const item = createItem(200);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(concatMap(result => {
            values = result.value;
            return test.tryToAdd(item).asAUniqueItemTo(values.list, result.log);
        }), concatMap((result) => test.tryToAdd(item).againAsAUniqueItemTo(values.list, result.log)), concatMap((result) => test.theList(values.list).shouldHaveSize(2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    function createDBWithTwoItemsAndSubscribeWithList(log) {
        const startLog = log.start(LOG_NAME, "createDBWithTwoItemsAndSubscribeWithList");
        const name1 = "name1";
        const name2 = "name2";
        const list = test.createNewList();
        return test.createLocalDB().pipe(concatMap((result) => test.addItemTo(result.value, result.log).withName(name1, 100)), concatMap((result) => test.addItemTo(result.value, result.log).withName(name2)), concatMap((result) => test.make(list).subscribeTo(result)), concatMap((result) => {
            startLog.complete();
            return result.log.addTo(of({ list, name1, name2 }));
        }));
    }
    const should_initialize_the_list_from_PouchDBWrapper = "should initialize the list from PouchDBWrapper";
    it(should_initialize_the_list_from_PouchDBWrapper, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_initialize_the_list_from_PouchDBWrapper);
        const observable = startObservable.pipe(concatMap((result) => createDBWithTwoItemsAndSubscribeWithList(result.log)), concatMap((result) => {
            test.theList(result.value.list).shouldHaveSize(2, result.log);
            return of(result);
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
        const observable = startObservable.pipe(concatMap((result) => test.createLocalDB()), concatMap((result) => {
            db = result.value;
            return test.make(list).subscribeTo(result);
        }), concatMap((result) => test.theList(list).shouldHaveSize(0, result.log)), concatMap((result) => test.addItemTo(db, result.log).withName(name1, 100)), concatMap((result) => test.theList(list).shouldHaveSize(1, result.log)), concatMap((result) => test.addItemTo(db, result.log).withName(name2)), concatMap((result) => test.theList(list).shouldHaveSize(2, result.log)), concatMap((result) => test.itemIn(list).atIndex(0).shouldHaveName(name1, result.log)), concatMap((result) => test.itemIn(list).atIndex(1).shouldHaveName(name2, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, complete => {
        const { startObservable, startLog } = test.createStartObservable(should_after_subscribe_delete_elements_from_the_list);
        let values;
        let db;
        const observable = startObservable.pipe(concatMap((result) => {
            db = result.value;
            return createDBWithTwoItemsAndSubscribeWithList(result.log);
        }), concatMap((result) => {
            values = result.value;
            return test.deleteItemFrom(db).withNameAndList(values.name1, values.list);
        }), concatMap((result) => test.theList(values.list).shouldHaveSize(1, result.log)), concatMap((result) => test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2, result.log)));
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
        const observable = startObservable.pipe(concatMap((result) => test.listContentOf(list).shouldHaveSize(0, result.log)), concatMap((result) => item1.setNameTo(name1, result.log)), concatMap((result) => test.add(item1).to(list, result.log).atIndex(0)), concatMap((result) => test.listContentOf(list).shouldHaveSize(1, result.log)), concatMap((result) => item2.setNameTo(name2, result.log)), concatMap((result) => test.add(item2).to(list, result.log).atTheBeginning()), concatMap((result) => test.listContentOf(list).shouldHaveSize(2, result.log)), concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2, result.log)), concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(1).withName(name1, result.log)), concatMap((result) => test.deleteItem(item2).fromList(list, result.log)), concatMap((result) => test.listContentOf(list).shouldHaveSize(1, result.log)), concatMap((result) => test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1, result.log)));
        test.subscribeToEnd(observable, complete, startLog);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnRMaXN0LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsdURBQXVEO0FBQ3ZELE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQzFELE9BQU8sRUFBQyxlQUFlLEVBQUUsd0JBQXdCLEVBQXNCLE1BQU0sbUJBQW1CLENBQUM7QUFDakcsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFpQixjQUFjLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRSxPQUFPLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUMxRCxPQUFPLEVBRUgsRUFBRSxFQUNGLEdBQUcsRUFBb0IsVUFBVSxFQUNwQyxNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFBQyxNQUFNLEVBQWtCLE1BQU0sVUFBVSxDQUFDO0FBQ2pELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxrQkFBa0IsQ0FBQztBQUU3QyxNQUFNLFFBQVEsR0FBRyx5QkFBeUIsQ0FBQztBQU0zQyxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsZUFBMkM7SUFHbkYsU0FBUyxDQUFDLElBQVksRUFBRSxHQUFXO1FBQy9CLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLHNCQUFzQixFQUFFLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBd0IsRUFBRSxHQUFXO1FBQy9DLE9BQU8sSUFBSSxDQUFD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QUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUMxRCxTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUMzRCxTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNsRixTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNsRixTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUN0RCxTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUMzRCxTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUUsQ0FDbEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUNyRixDQUFDO1FBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMifQ==