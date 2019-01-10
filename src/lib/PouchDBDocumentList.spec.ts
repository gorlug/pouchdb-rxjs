/// <reference path="../types/JasmineExtension.d.ts" />
import {PouchDBDocumentList} from "./PouchDBDocumentList";
import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "./PouchDBDocument";
import {CustomJasmineMatchers} from "./CustomJasmineMatchers";
import {DBValueWithLog, PouchDBWrapper} from "./PouchDBWrapper";
import {catchError, concatMap, tap} from "rxjs/operators";
import {
    Observable,
    of,
    zip, OperatorFunction, throwError
} from "rxjs";
import {Logger, ValueWithLogger} from "./Logger";
import {CouchDBConf} from "./CouchDBWrapper";

const LOG_NAME = "PouchDBDocumentListTest";

interface ListItemImplementationJSON extends PouchDBDocumentJSON {
    name: string;
}

export class ListItemImplementation extends PouchDBDocument<ListItemImplementationJSON> {
    name: string;

    setNameTo(name: string, log: Logger): Observable<ValueWithLogger> {
        log.logMessage(LOG_NAME, "setting item name to", {name: name});
        this.name = name;
        return log.addTo(of(name));
    }

    addOrUpdateOn(list: ListImplementation, log: Logger) {
        return list.addOrUpdateItem(this, log);
    }

    shouldHaveName(name: string) {
        expect(this.name).toBe(name);
    }

    protected addValuesToJSONDocument(json: ListItemImplementationJSON) {
        json.name = this.name;
    }
}

function createItem(dateMinus: number) {
    const item = test.createNewItem();
    item.setId((new Date().valueOf() - dateMinus) + "");
    return item;
}

class ListItemImplementationGenerator extends PouchDBDocumentGenerator<ListItemImplementation> {

    protected createDocument(json: ListItemImplementationJSON): ListItemImplementation {
        const item = new ListItemImplementation();
        item.name = json.name;
        return item;
    }

}

class ListImplementation extends PouchDBDocumentList<ListItemImplementation> {

    getItemWithName(name: string) {
        const filterResult = this.items.filter((item: ListItemImplementation) => {
            return item.name === name;
        });
        return filterResult[0];
    }
}


class AfterItemFunctions {

    private observable: Observable<ValueWithLogger>;

    constructor(observable: Observable<ValueWithLogger>) {
        this.observable = observable;
    }

    theList(list: ListImplementation) {
        const self = this;
        return {
            shouldHaveSize: function (size: number) {
                let originalResult;
                return self.observable.pipe(
                    concatMap(result => {
                        originalResult = result;
                        return list.getSize(result.log);
                    }),
                    concatMap(result => {
                        const listSize: number = result.value;
                        expect(listSize).toBe(size);
                        test.listContentOf(list).shouldHaveSizeSync(size);
                        return of(originalResult);
                    }),
                );
            }
        };
    }

    theItemIn(list: ListImplementation) {
        const self = this;
        return {
            atIndex: function (index: number) {
                return {
                    shouldHaveName: function (name: string, observable: Observable<any>) {
                        return test.itemIn(list).atIndex(index).shouldHaveName(name, observable);
                    },
                    fromListContentShouldHaveName: function (name: string) {
                        let originalResult;
                        return self.observable.pipe(
                            concatMap(result => {
                                originalResult = result;
                                return list.listContent$;
                            }),
                            concatMap(result => {
                                const items: ListItemImplementation[] = result.value;
                                items[index].shouldHaveName(name);
                                return of(originalResult);
                            })
                        );
                    }
                };
            }
        };
    }
}

const test = {
    afterItemWasAddedTo: function (observable: Observable<any>) {
        return new AfterItemFunctions(observable);
    },
    afterItemWasDeletedFrom: function (observable: Observable<any>) {
        return new AfterItemFunctions(observable);
    },
    add: function (item: ListItemImplementation) {
        return {
            to: function (list: ListImplementation, log: Logger) {
                return {
                    atTheEnd: function () {
                        return list.addItem(item, log);
                    },
                    atIndex: function (index: number) {
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
    deleteItem: function (item: ListItemImplementation) {
        return {
            fromList: function (list: ListImplementation, log: Logger) {
                return list.deleteItem(item, log);
            }
        };
    },
    tryToAdd: function (item: ListItemImplementation) {
        return {
            againAsAUniqueItemTo: function (list: ListImplementation, log: Logger) {
                return this.asAUniqueItemTo(list, log);
            },
            asAUniqueItemTo: function (list: ListImplementation, log: Logger) {
                list.addUniqueItem(item, log);
            }
        };
    },
    itemIn: function (list: ListImplementation) {
        return {
            atIndex: function (index: number) {
                return {
                    shouldHaveName: function (name: string, log: Logger) {
                        list.getItemAtIndex(index, log).pipe(
                            concatMap(result => {
                                const item: ListItemImplementation = result.value;
                                item.shouldHaveName(name);
                                return of(result);
                            }),
                        );
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

    createLocalDB: function (log = test.getLogger()):
        Observable<{ value: PouchDBWrapper, log: Logger }> {
        const startLog = log.start(LOG_NAME, "createLocalDB");
        const dbName = "list_test";
        return PouchDBWrapper.destroyLocalDB(dbName, log).pipe(
            concatMap(result => PouchDBWrapper.loadLocalDB(dbName, new ListItemImplementationGenerator(), result.log)),
            tap(result => {
                result.log.complete();
                startLog.complete();
            })
        );
    },

    addItemTo: function (db: PouchDBWrapper, log: Logger) {
        return {
            withName: function (name: string, minus: number = 0): Observable<{ value: PouchDBWrapper, log: Logger }> {
                const item = createItem(minus);
                return item.setNameTo(name, log).pipe(
                    concatMap((result: ValueWithLogger) => {
                        return db.saveDocument(item, result.log);
                    }),
                    concatMap((result: ValueWithLogger) => {
                        return result.log.addTo(of(db));
                    })
                );
            }
        };
    },

    deleteItemFrom: function (db: PouchDBWrapper, log: Logger) {
        return {
            withNameAndList: function (name: string, list: ListImplementation) {
                const item = list.getItemWithName(name);
                return db.deleteDocument(item, log);
            }
        };
    },

    make: function (list: ListImplementation) {
        return {
            subscribeTo: function (dbResult: DBValueWithLog) {
                return list.subscribeTo(dbResult.value, dbResult.log);
            }
        };
    },

    after: function (list: ListImplementation) {
        return {
            subscriptionWasAddedTo: function (observable: Observable<ValueWithLogger>) {
                return {
                    listShouldHaveSize(size: number) {
                        let db;
                        let originalResult;
                        return observable.pipe(
                            concatMap(result => {
                                db = result.value;
                                originalResult = result;
                                return list.getSize(result.log);
                            }),
                            concatMap(result => {
                                const listSize: number = result.value;
                                console.log("list subscription result size", listSize, "db", db);
                                expect(listSize).toBe(size);
                                return of(originalResult);
                            })
                        );
                    }
                };
            }
        };
    },
    listContentOf: function (list: ListImplementation) {
        return {
            shouldHaveSize: function (size: number, log: Logger) {
                const actualSize = list.listContent$.getValue().value.length;
                log.logMessage(LOG_NAME, "list content should have size", {expected: size, actual: actualSize});
                expect(actualSize).toBe(size);
                return log.addTo(of(actualSize));
            },
            shouldHaveItemAtIndex: function (index: number) {
                return {
                    withName: function (name: string, log: Logger) {
                        log.logMessage(LOG_NAME, "list content should have item at index",
                            {expected_name: name, expected_index: index});
                        const item: ListItemImplementation = list.listContent$.getValue()[index];
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
    theItem: function (item: ListItemImplementation) {
        return {
            inList: function (list: ListImplementation) {
                return {
                    shouldBeAtIndex: function (index: number, log: Logger): Observable<ValueWithLogger> {
                        return list.getCurrentIndexOfItem(item, log).pipe(
                            concatMap(result => {
                                const listIndex: number = result.value;
                                expect(listIndex).toBe(index);
                                return result.log.addTo(of(item));
                            })
                        );
                    }
                };
            }
        };
    },
    theList: function (list: ListImplementation) {
        return {
            shouldHaveSize: function (size: number, log: Logger) {
                return list.getSize(log).pipe(
                    concatMap(result => {
                        const listSize: number = result.value;
                        expect(listSize).toBe(size);
                        return result.log.addTo(of(listSize));
                    })
                );
            },
            shouldBeInThisOrder: function (order: ListItemImplementation[], log: Logger) {
                return list.getItems(log).pipe(
                    concatMap(result => {
                        result.log.complete();
                        const items: ListItemImplementation[] = result.value;
                        expect(items).toBeInThisOrder(order);
                        return log.addTo(of(items));
                    })
                );
            }
        };
    },

    concatMapPipe: function (observable: Observable<ValueWithLogger>,
                             callFunctions: ((result: ValueWithLogger) => Observable<ValueWithLogger>)[]) {
        const concatMaps: OperatorFunction<any, any>[] = [];
        callFunctions.forEach(callFunction => {
            concatMaps.push(concatMap((result: ValueWithLogger) => callFunction(result)));
        });
        return observable.pipe.apply(observable, concatMaps);
    },

    moveItem: function (item: ListItemImplementation) {
        return {
            upInList: function (list: ListImplementation, log: Logger) {
                return list.moveUp(item, log);
            },
            downInList: function (list: ListImplementation, log: Logger) {
                return list.moveDown(item, log);
            }
        };
    },

    subscribeToEnd: function (observable: Observable<any>, complete, log: Logger) {
        observable.pipe(
            catchError(error => {
                return log.logError(LOG_NAME, "subscribeToEnd", error + "", error).pipe(
                    concatMap(() => {
                        return throwError(error);
                    })
                );
            }),
            concatMap(() => log.complete())
        ).subscribe(next => {
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
    createStartObservable(testName: string): { startObservable: Observable<ValueWithLogger>, startLog: Logger, log: Logger } {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, testName);
        const startObservable: Observable<ValueWithLogger> = of({value: "", log: log});
        return {startObservable, startLog, log};
    }
};

let logDB: PouchDBWrapper;
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
        const {startObservable, startLog} = test.createStartObservable(should_have_one_item_after_adding_an_item_to_an_empty_list);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(0, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.add(item).to(list, result.log).atTheBeginning()),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(1, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_have_length_0_after_deleting_an_item = "should have length 0 after deleting an item";
    it(should_have_length_0_after_deleting_an_item, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const {startObservable, startLog} = test.createStartObservable(should_have_length_0_after_deleting_an_item);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.add(item).to(list, result.log).atTheBeginning()),
            concatMap((result: ValueWithLogger) =>
                test.deleteItem(item).fromList(list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(0, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_return_0_when_getting_the_index_of_the_only_item_in_the_list =
        "should return 0 when getting the index of the only item in the list";
    it(should_return_0_when_getting_the_index_of_the_only_item_in_the_list, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const {startObservable, startLog} = test.createStartObservable(should_return_0_when_getting_the_index_of_the_only_item_in_the_list);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) => test.add(item).to(list, result.log).atTheBeginning()),
            concatMap((result: ValueWithLogger) => test.theItem(item).inList(list)
                .shouldBeAtIndex(0, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_add_the_item_at_index_0_before_the_existing_one = "should add the item at index 0 before the existing one";
    it(should_add_the_item_at_index_0_before_the_existing_one, complete => {
        const list = new ListImplementation();
        const item1 = new ListItemImplementation();
        item1.setId(item1.getId() + "0");
        const item2 = new ListItemImplementation();
        const {startObservable, startLog} = test.createStartObservable(should_add_the_item_at_index_0_before_the_existing_one);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.add(item1).to(list, result.log).atTheEnd()),
            concatMap((result: ValueWithLogger) =>
                test.add(item2).to(list, result.log).atIndex(0)),
            concatMap((result: ValueWithLogger) =>
                test.theItem(item1).inList(list).shouldBeAtIndex(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theItem(item2).inList(list).shouldBeAtIndex(0, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });


    function createListWithTwoItems(observable: Observable<ValueWithLogger>): Observable<{
        value: {
            item1: ListItemImplementation,
            item2: ListItemImplementation,
            list: ListImplementation
        }, log: Logger
    }> {
        let list, item1, item2, logStart;
        return observable.pipe(
            concatMap(result => {
                logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
                list = new ListImplementation();
                item1 = createItem(100);
                item2 = createItem(0);
                return result.log.addTo(zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
            }),
            concatMap(result => {
                logStart.complete();
                return result.log.addTo(of({list, item1, item2}));
            })
        );
    }

    const should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item2).upInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) => test.theItem(values.item2)
                .inList(values.list).shouldBeAtIndex(0, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 =
        "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.moveItem(values.item2).upInList(values.list, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item2).upInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    it("should move the item down from index 0 to index 1", complete => {
        const {startObservable, startLog} = test.createStartObservable(should_not_move_the_item_down_more_than_index_1);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item1).downInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_not_move_the_item_down_more_than_index_1 = "should not move the item down more than index 1";
    it(should_not_move_the_item_down_more_than_index_1, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_move_the_item_up_from_index_1_to_index_0);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item1).downInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item1).downInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item1).downInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_just_add_the_item_because_it_does_not_exist_yet = "should just add the item because it doesn't exist yet";
    it(should_just_add_the_item_because_it_does_not_exist_yet, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const {startObservable, startLog} = test.createStartObservable(should_just_add_the_item_because_it_does_not_exist_yet);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.add(item).to(list, result.log).orUpdate()),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(1, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_update_the_item_with_the_new_contents = "should update the item with the new contents";
    it(should_update_the_item_with_the_new_contents, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();
        const firstName = "first name";
        const secondName = "second name";
        const {startObservable, startLog} = test.createStartObservable(should_update_the_item_with_the_new_contents);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                item.setNameTo(firstName, result.log)),
            concatMap((result: ValueWithLogger) =>
                item.addOrUpdateOn(list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(list).atIndex(0).shouldHaveName(firstName, result.log)),
            concatMap((result: ValueWithLogger) =>
                item.setNameTo(secondName, result.log)),
            concatMap((result: ValueWithLogger) =>
                item.addOrUpdateOn(list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(list).atIndex(0).shouldHaveName(secondName, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_add_two_more_items_between_item1_and_item2 = "should add two more items between item1 and item2";
    it(should_add_two_more_items_between_item1_and_item2, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_add_two_more_items_between_item1_and_item2);
        const item3 = createItem(200);
        const item4 = createItem(300);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.add(item3).to(values.list, result.log).atIndex(1);
            }),
            concatMap((result: ValueWithLogger) =>
                test.add(item4).to(values.list, result.log).atIndex(2)),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(4, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldBeInThisOrder([
                    values.item1,
                    item3,
                    item4,
                    values.item2
                ], result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_add_the_item_at_the_beginning = "should add the item at the beginning";
    it(should_add_the_item_at_the_beginning, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_add_the_item_at_the_beginning);
        const item3 = createItem(200);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.add(item3).to(values.list, result.log).atTheBeginning();
            }),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldBeInThisOrder([
                    item3, values.item1, values.item2
                ], result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_not_add_the_same_unique_item = "should not add the same unique item";
    it(should_not_add_the_same_unique_item, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_not_add_the_same_unique_item);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.tryToAdd(values.item1).againAsAUniqueItemTo(values.list, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(2, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_add_the_new_unique_item_because_it_is_not_in_the_list_yet =
        "should add the new unique item because it is not in the list yet";
    it(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet, complete => {
        const {startObservable, startLog} = test.createStartObservable(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet);
        const item = createItem(200);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                return test.tryToAdd(item).asAUniqueItemTo(values.list, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.tryToAdd(item).againAsAUniqueItemTo(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(2, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    interface ListWithTwoItemNames {
        list: ListImplementation;
        name1: string;
        name2: string;
    }

    interface DBWithTwoItemsSubscribeResult {
        value: ListWithTwoItemNames;
        log: Logger;
    }

    function createDBWithTwoItemsAndSubscribeWithList(log: Logger):
            Observable<DBWithTwoItemsSubscribeResult> {
        const startLog = log.start(LOG_NAME, "createDBWithTwoItemsAndSubscribeWithList");
        const name1 = "name1";
        const name2 = "name2";
        const list: ListImplementation = test.createNewList();
        return test.createLocalDB().pipe(
            concatMap((result: DBValueWithLog) =>
                test.addItemTo(result.value, result.log).withName(name1, 100)),
            concatMap((result: ValueWithLogger) =>
                test.addItemTo(result.value, result.log).withName(name2)),
            concatMap((result: ValueWithLogger) =>
                test.make(list).subscribeTo(result)),
            concatMap((result: ValueWithLogger) => {
                startLog.complete();
                return result.log.addTo(of({list, name1, name2}));
            })
        );
    }

    const should_initialize_the_list_from_PouchDBWrapper = "should initialize the list from PouchDBWrapper";
    it(should_initialize_the_list_from_PouchDBWrapper, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_initialize_the_list_from_PouchDBWrapper);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                createDBWithTwoItemsAndSubscribeWithList(result.log)),
            concatMap((result: DBWithTwoItemsSubscribeResult) => {
                test.theList(result.value.list).shouldHaveSize(2, result.log);
                return of(result);
            })
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list =
        "should after subscription automatically add a new item to the beginning of the list";
    it(should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list);
        const list = test.createNewList();
        const name1 = "name1";
        const name2 = "name2";
        let db: PouchDBWrapper;
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.createLocalDB()),
            concatMap((result: DBValueWithLog) => {
                db = result.value;
                return test.make(list).subscribeTo(result);
            }),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(0, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.addItemTo(db, result.log).withName(name1, 100)),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.addItemTo(db, result.log).withName(name2)),
            concatMap((result: ValueWithLogger) =>
                test.theList(list).shouldHaveSize(2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(list).atIndex(0).shouldHaveName(name1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(list).atIndex(1).shouldHaveName(name2, result.log)),
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_after_subscribe_delete_elements_from_the_list);
        let values: ListWithTwoItemNames;
        let db: PouchDBWrapper;
        const observable = startObservable.pipe(
            concatMap((result: DBValueWithLog) => {
                db = result.value;
                return createDBWithTwoItemsAndSubscribeWithList(result.log);
            }),
            concatMap((result: DBWithTwoItemsSubscribeResult) => {
                values = result.value;
                return test.deleteItemFrom(db).withNameAndList(values.name1, values.list);
            }),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2, result.log))
        );
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
        const {startObservable, startLog} = test.createStartObservable(
            should_trigger_a_list_change_event_on_add_and_delete);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveSize(0, result.log)),
            concatMap((result: ValueWithLogger) =>
                item1.setNameTo(name1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.add(item1).to(list, result.log).atIndex(0)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                item2.setNameTo(name2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.add(item2).to(list, result.log).atTheBeginning()),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveSize(2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveItemAtIndex(1).withName(name1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.deleteItem(item2).fromList(list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1, result.log)),
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    /*
    it("some test", testComplete => {
       class CustomObserver<T> implements Observer<T> {

           private original: PartialObserver<T>;
           closed: boolean;

           constructor(original: PartialObserver<T>) {
              this.original = original;
              this.closed = original.closed;
           }
           complete() {
               console.log("go complete");
               if (this.original.complete) {
                   this.original.complete();
               }
           }
           error(err: any) {
               console.log("go error");
               if (this.original.error) {
                   this.original.error(err);
               }
           }
           next(value: T) {
               console.log("go next", value);
               if (this.original.next) {
                   this.original.next(value);
               }
           }
       }
       class CustomObservable<T> extends Observable<T> {

           static create: Function = <T>(subscribe?: (subscriber: Subscriber<T>) => TeardownLogic) => {
               console.log("wohoo create");
               return new CustomObservable<T>(subscribe);
           }

           subscribe(observerOrNext?: PartialObserver<T> | CustomObserver<T> | ((value: T) => void) | ((value: T, log: Logger) => void),
                     error?: (error: any) => void,
                     complete?: () => void): Subscription {
               console.log("weeee subscribe", typeof observerOrNext);
               if (observerOrNext instanceof Function) {
                   console.log("is function");
                   const next = function(value: T) {
                       observerOrNext.call(observerOrNext, value, Logger.getLogger("something test"));
                   };
                   return super.subscribe(next, error, complete);
               }
               return super.subscribe(new CustomObserver(observerOrNext));
           }
           pipe<R>(...operations: OperatorFunction<any, any>[]): CustomObservable<R> {
               return super.pipe(...operations);
           }
       }
       let observable: CustomObservable<string> = CustomObservable.create(emitter => {
           emitter.next("blubb");
           emitter.complete();
       });
       function concatMapCustom<T>(project: (value: T, log: Logger) => CustomObservable<T>) {
            return concatMap((value: T) => {
                return project.call(project, value, Logger.getLogger("woah concatMap"));
            });
       }
       observable = observable.pipe(
           concatMapCustom((next, log: Logger) => {
               return CustomObservable.create(emitter => {
                   log.debug("nom nom", next);
                   emitter.next("jo ho concatMapCustom");
               });
           })
       );
       /* observable.subscribe({
           next(value) {
               console.log("bbq", value);
               testComplete();
           },
           error(err) {
               console.log("wah error", err);
           }
       });
       observable.subscribe((next, log: Logger) => {
           log.debug("jo log");
           console.log(observable);
           console.log("oh hai next", next);
           testComplete();
       });*/
    /* const item = new Todo("lolcopter");
    const testLog = Logger.getLogger("run stuff");
    testLog.setTrace(Logger.generateTrace());
    observable.subscribe(next => {
         testLog.runAsync("some name", "trying out this run thing for the first time",
             { something: "somewhere", item: item}, complete => {
             console.log("stuff happens here");
             setTimeout(() => {
                 console.log("waited a second");
                 complete();
                 testComplete();
             }, 1000);
         });
    });
 }); */
});
