/// <reference path="../types/JasmineExtension.d.ts" />
import {DeletedItemWithIndexAndLogger, PouchDBDocumentList} from "./PouchDBDocumentList";
import {PouchDBDocument, PouchDBDocumentGenerator, PouchDBDocumentJSON} from "./PouchDBDocument";
import {CustomJasmineMatchers} from "./CustomJasmineMatchers";
import {DBValueWithLog, PouchDBWrapper} from "./PouchDBWrapper";
import {catchError, concatMap, tap} from "rxjs/operators";
import {Observable, of, OperatorFunction, throwError, zip} from "rxjs";
import {Logger, ValueWithLogger} from "./Logger";
import {CouchDBConf} from "./CouchDBWrapper";
import {TestUtil} from "./TestUtil";

const LOG_NAME = "PouchDBDocumentListTest";

interface ListItemImplementationJSON extends PouchDBDocumentJSON {
    name: string;
}

export class ListItemImplementation extends PouchDBDocument<ListItemImplementationJSON> {
    name: string;

    setNameTo(name: string) {
        return concatMap((result: ValueWithLogger) => {
            result.log.logMessage(LOG_NAME, "setting item name to", {name: name});
            this.name = name;
            return result.log.addTo(of(name));
        });
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

    protected getNameOfDoc(): string {
        return "ListItemImplementation";
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
            to: function (list: ListImplementation) {
                return {
                    atTheEnd: function () {
                        return concatMap((result: ValueWithLogger) => {
                            return list.addItem(item, result.log);
                        });
                    },
                    atIndex: function (index: number) {
                        return concatMap((result: ValueWithLogger) => {
                            return list.addItemAtIndex(index, item, result.log);
                        });
                    },
                    atTheBeginning: function () {
                        return concatMap((result: ValueWithLogger) => {
                            return list.addItemAtBeginning(item, result.log);
                        });
                    },
                    orUpdate: function () {
                        return concatMap((result: ValueWithLogger) => {
                            return list.addOrUpdateItem(item, result.log);
                        });
                    }
                };
            },
        };
    },
    deleteItem: function (item: ListItemImplementation) {
        return {
            fromList: function (list: ListImplementation) {
                return concatMap((result: ValueWithLogger) => {
                    return list.deleteItem(item, result.log);
                });
            }
        };
    },
    tryToAdd: function (item: ListItemImplementation) {
        return {
            againAsAUniqueItemTo: function (list: ListImplementation, log: Logger) {
                return this.asAUniqueItemTo(list, log);
            },
            asAUniqueItemTo: function (list: ListImplementation, log: Logger) {
                return list.addUniqueItem(item, log);
            }
        };
    },
    itemIn: function (list: ListImplementation) {
        return {
            atIndex: function (index: number) {
                return {
                    shouldHaveName: function (name: string, log: Logger) {
                        return list.getItemAtIndex(index, log).pipe(
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
    createNewItem: function (name?: string) {
        const item = new ListItemImplementation();
        if (name !== undefined) {
            item.name = name;
        }
        return item;
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
            },
            asDocument: function(item: ListItemImplementation) {
                return db.saveDocument(item, log);
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
            shouldHaveSize: function (size: number) {
                return concatMap((result: ValueWithLogger) => {
                    const actualSize = list.listContent$.getValue().value.length;
                    result.log.logMessage(LOG_NAME, "list content should have size", {expected: size, actual: actualSize});
                    expect(actualSize).toBe(size);
                    return result.log.addTo(of(actualSize));
                });
            },
            shouldHaveItemAtIndex: function (index: number) {
                return {
                    withName: function (name: string) {
                        return concatMap((result: ValueWithLogger) => {
                            const log = result.log;
                            log.logMessage(LOG_NAME, "list content should have item at index",
                                {expected_name: name, expected_index: index});
                            const item: ListItemImplementation = list.listContent$.getValue().value[index];
                            if (item === undefined) {
                                const errorMsg = "item in list content at index " + index + " is undefined";
                                log.logError(LOG_NAME, "list content should have item at index error", errorMsg);
                                fail(errorMsg);
                                return throwError(errorMsg);
                            }
                            item.shouldHaveName(name);
                            return log.addTo(of(name));
                        });
                    }
                };
            }
        };
    },
    theItem: function (item: ListItemImplementation) {
        return {
            inList: function (list: ListImplementation) {
                return {
                    shouldBeAtIndex: function (index: number) {
                        return [
                            concatMap((result: ValueWithLogger) => {
                                return list.getCurrentIndexOfItem(item, result.log);
                            }),
                            concatMap((result: ValueWithLogger) => {
                                const listIndex: number = result.value;
                                expect(listIndex).toBe(index);
                                return result.log.addTo(of(item));
                            })
                        ];
                    }
                };
            }
        };
    },
    theList: function (list: ListImplementation) {
        return {
            shouldHaveSize: function (size: number, log: Logger) {
                return [
                    concatMap((result: ValueWithLogger) => {
                        return list.getSize(result.log);
                    }),
                    concatMap((result: ValueWithLogger) => {
                        const listSize: number = result.value;
                        expect(listSize).toBe(size);
                        return result.log.addTo(of(listSize));
                    })
                ];
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
            upInList: function (list: ListImplementation) {
                return concatMap((result: ValueWithLogger) => {
                    return list.moveUp(item, result.log);
                });
            },
            downInList: function (list: ListImplementation) {
                return concatMap((result: ValueWithLogger) => {
                    return list.moveDown(item, result.log);
                });
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
    },
    getItemFromList(list: ListImplementation) {
        return {
            atIndex(index: number, log: Logger) {
                return list.getItemAtIndex(index, log);
            }
        };
    },
};

let logDB: PouchDBWrapper;
const LOG_DB_CONF = new CouchDBConf();
LOG_DB_CONF.setDBName("dev-log");
LOG_DB_CONF.setPort(5984);
LOG_DB_CONF.setHost("couchdb-test");
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

    class ListWithTwoItems {
        item1: ListItemImplementation;
        item2: ListItemImplementation;
        list: ListImplementation;
    }

    function createListWithTwoItems() {
        let logStart: Logger;
        let list, item1, item2;
        const log = test.getLogger();

        const steps = [
            concatMap((result: ValueWithLogger) => {
                logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
                list = new ListImplementation();
                item1 = createItem(100);
                item1.setDebug(true);
                item2 = createItem(0);
                item2.setDebug(true);
                return result.log.addTo(zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
            }),
            concatMap((result: ValueWithLogger) => {
                const values = new ListWithTwoItems();
                values.item1 = item1;
                values.item2 = item2;
                values.list = list;
                logStart.complete();
                return result.log.addTo(of(values));
            })
        ];
        return TestUtil.operatorsToObservable(steps, log);
    }

    const should_have_one_item_after_adding_an_item_to_an_empty_list = "should have one item after adding an item to an empty list";
    it(should_have_one_item_after_adding_an_item_to_an_empty_list, complete => {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_have_one_item_after_adding_an_item_to_an_empty_list);

        const list = test.createNewList();
        const item = test.createNewItem();

        const steps = [
            test.theList(list).shouldHaveSize(0),
            test.add(item).to(list).atTheBeginning(),
            test.theList(list).shouldHaveSize(1)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    const should_have_length_0_after_deleting_an_item = "should have length 0 after deleting an item";
    it(should_have_length_0_after_deleting_an_item, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();

        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_have_length_0_after_deleting_an_item);

        const steps = [
            test.add(item).to(list).atTheBeginning(),
            test.deleteItem(item).fromList(list),
            expectDeletedIndex_toBe(0),
            test.theList(list).shouldHaveSize(0)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

        function expectDeletedIndex_toBe(index: number) {
            return concatMap((result: DeletedItemWithIndexAndLogger<ListItemImplementation>) => {
                expect(result.value.index).toBe(index);
                return result.log.addTo(of(result.value));
            });
        }
    });
    const should_return_0_when_getting_the_index_of_the_only_item_in_the_list =
        "should return 0 when getting the index of the only item in the list";
    it(should_return_0_when_getting_the_index_of_the_only_item_in_the_list, complete => {
        const list = new ListImplementation();
        const item = new ListItemImplementation();

        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_return_0_when_getting_the_index_of_the_only_item_in_the_list);

        const steps = [
            test.add(item).to(list).atTheBeginning(),
            test.theItem(item).inList(list).shouldBeAtIndex(0)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    const should_add_the_item_at_index_0_before_the_existing_one = "should add the item at index 0 before the existing one";
    it(should_add_the_item_at_index_0_before_the_existing_one, complete => {
        const list = new ListImplementation();
        const item1 = new ListItemImplementation();
        item1.setId(item1.getId() + "0");
        const item2 = new ListItemImplementation();

        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_add_the_item_at_index_0_before_the_existing_one);

        const steps = [
            test.add(item1).to(list).atTheEnd(),
            test.add(item2).to(list).atIndex(0),
            test.theItem(item1).inList(list).shouldBeAtIndex(1),
            test.theItem(item2).inList(list).shouldBeAtIndex(0)
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });

    const should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, complete => {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_trigger_a_list_change_event_on_add_and_delete);

        const observable = createListWithTwoItems().pipe(
            concatMap((result: {value: ListWithTwoItems, log: Logger}) => {
                const values = result.value;
                const steps = [
                    test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1),
                    test.moveItem(values.item2).upInList(values.list),
                    test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0)
                ];
                return TestUtil.operatorsToObservable(steps, result.log);
            })
        );

        TestUtil.testComplete(startLog, observable, complete);
    });

    /*
    const should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 =
        "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, complete => {
        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);

        const observable = createListWithTwoItems().pipe(
            concatMap((result: {value: ListWithTwoItems, log: Logger}) => {
                const values = result.value;
                const steps = [];
                return TestUtil.operatorsToObservable(steps, result.log);
            })
        );
        TestUtil.testComplete(startLog, observable, complete);

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
                test.theList(values.list).shouldHaveSize(3, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.tryToAdd(item).againAsAUniqueItemTo(values.list, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(3, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    interface ListWithTwoItemNames {
        list: ListImplementation;
        name1: string;
        name2: string;
        db: PouchDBWrapper;
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
        let db: PouchDBWrapper;
        return test.createLocalDB().pipe(
            concatMap((result: DBValueWithLog) => {
                db = result.value;
                return test.addItemTo(result.value, result.log).withName(name1, 100);
            }),
            concatMap((result: ValueWithLogger) =>
                test.addItemTo(result.value, result.log).withName(name2)),
            concatMap((result: ValueWithLogger) =>
                test.make(list).subscribeTo(result)),
            concatMap((result: ValueWithLogger) => {
                startLog.complete();
                return result.log.addTo(of({list, name1, name2, db}));
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
                test.itemIn(list).atIndex(0).shouldHaveName(name2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(list).atIndex(1).shouldHaveName(name1, result.log)),
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    const should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_after_subscribe_delete_elements_from_the_list);
        let values: ListWithTwoItemNames;
        const observable = startObservable.pipe(
            concatMap((result: DBValueWithLog) =>
                createDBWithTwoItemsAndSubscribeWithList(result.log)),
            concatMap((result: DBWithTwoItemsSubscribeResult) => {
                values = result.value;
                return test.deleteItemFrom(values.db, result.log).withNameAndList(values.name1, values.list);
            }),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2, result.log))
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    */
    const should_trigger_a_list_change_event_on_add_and_delete = "should trigger a list change event on add and delete";
    it(should_trigger_a_list_change_event_on_add_and_delete, complete => {

        const log = test.getLogger();
        const startLog = log.start(LOG_NAME, should_trigger_a_list_change_event_on_add_and_delete);

        const list = test.createNewList();
        const name1 = "name1";
        const item1 = test.createNewItem();
        const name2 = "name2";
        const item2 = test.createNewItem();
        item1.setId(item1.getId() + "0");

        const steps = [
            test.listContentOf(list).shouldHaveSize(0),
            item1.setNameTo(name1),
            test.add(item1).to(list).atIndex(0),
            test.listContentOf(list).shouldHaveSize(1),
            item2.setNameTo(name2),
            test.add(item2).to(list).atTheBeginning(),
            test.listContentOf(list).shouldHaveSize(2),
            test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2),
            test.listContentOf(list).shouldHaveItemAtIndex(1).withName(name1),
            test.deleteItem(item2).fromList(list),
            test.listContentOf(list).shouldHaveSize(1),
            test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1),
        ];
        const observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);

    });
    /*
    const should_update_the_list_content_if_the_values_of_an_item_change = "should update the list content if the values of an item change";
    it(should_update_the_list_content_if_the_values_of_an_item_change, complete => {
        const list = test.createNewList();
        const name1 = "name1";
        const item = test.createNewItem(name1);
        const name2 = "name2";
        const {startObservable, startLog} = test.createStartObservable(
            should_trigger_a_list_change_event_on_add_and_delete);
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                test.add(item).to(list, result.log).atTheBeginning()),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1, result.log)),
            concatMap((result: ValueWithLogger) =>
                item.setNameTo(name2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.add(item).to(list, result.log).orUpdate()),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveSize(1, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2, result.log)),
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const should_on_database_value_change_update_the_list_with_the_new_contents =
        "should on database value change update the list with the new contents";
    it(should_on_database_value_change_update_the_list_with_the_new_contents, complete => {
        const {startObservable, startLog} = test.createStartObservable(
            should_after_subscribe_delete_elements_from_the_list);
        let values: ListWithTwoItemNames;
        const differentName = "some different name";
        let item;
        const observable = startObservable.pipe(
            concatMap((result: ValueWithLogger) =>
                createDBWithTwoItemsAndSubscribeWithList(result.log)),
            concatMap((result: DBWithTwoItemsSubscribeResult) => {
                values = result.value;
                return test.getItemFromList(values.list).atIndex(0, result.log);
            }),
            concatMap((result: {value: ListItemImplementation, log: Logger}) => {
                item = result.value;
                return result.value.setNameTo(differentName, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.addItemTo(values.db, result.log).asDocument(item)),
            concatMap((result: ValueWithLogger) =>
                test.theList(values.list).shouldHaveSize(2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(values.list).shouldHaveSize(2, result.log)),
            concatMap((result: ValueWithLogger) =>
                test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(differentName, result.log)),
        );
        test.subscribeToEnd(observable, complete, startLog);
    });

    const movingItems_shouldTrigger_listContentChange = "moving items should trigger list content change";
    it(movingItems_shouldTrigger_listContentChange, complete => {
        const {startObservable, startLog} = test.createStartObservable(movingItems_shouldTrigger_listContentChange);
        let values;
        const observable = createListWithTwoItems(startObservable).pipe(
            concatMap(result => {
                values = result.value;
                values.item1.name = "item1";
                values.item2.name = "item2";
                return test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1, result.log);
            }),
            concatMap((result: ValueWithLogger) => {
                return test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(values.item1.name, result.log);
            }),
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item2).upInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) => test.theItem(values.item2)
                .inList(values.list).shouldBeAtIndex(0, result.log)),
            concatMap((result: ValueWithLogger) => {
                return test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(values.item2.name, result.log);
            }),
            // move the item back down
            concatMap((result: ValueWithLogger) =>
                test.moveItem(values.item2).downInList(values.list, result.log)),
            concatMap((result: ValueWithLogger) => test.theItem(values.item2)
                .inList(values.list).shouldBeAtIndex(1, result.log)),
            concatMap((result: ValueWithLogger) => {
                return test.listContentOf(values.list).shouldHaveItemAtIndex(1).withName(values.item2.name, result.log);
            })
        );
        test.subscribeToEnd(observable, complete, startLog);
    });
    */
});

