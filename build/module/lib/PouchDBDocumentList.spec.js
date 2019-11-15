var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/// <reference path="../types/JasmineExtension.d.ts" />
import { PouchDBDocumentList } from "./PouchDBDocumentList";
import { PouchDBDocument, PouchDBDocumentGenerator } from "./PouchDBDocument";
import { CustomJasmineMatchers } from "./CustomJasmineMatchers";
import { PouchDBWrapper } from "./PouchDBWrapper";
import { catchError, concatMap, tap } from "rxjs/operators";
import { of, throwError, zip } from "rxjs";
import { Logger } from "./Logger";
import { CouchDBConf } from "./CouchDBWrapper";
import { TestUtil } from "./TestUtil";
var LOG_NAME = "PouchDBDocumentListTest";
var ListItemImplementation = /** @class */ (function (_super) {
    __extends(ListItemImplementation, _super);
    function ListItemImplementation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListItemImplementation.prototype.setNameTo = function (name) {
        var _this = this;
        return concatMap(function (result) {
            result.log.logMessage(LOG_NAME, "setting item name to", { name: name });
            _this.name = name;
            return result.log.addTo(of(name));
        });
    };
    ListItemImplementation.prototype.addOrUpdateOn = function (list) {
        var _this = this;
        return concatMap(function (result) {
            return list.addOrUpdateItem(_this, result.log);
        });
    };
    ListItemImplementation.prototype.shouldHaveName = function (name) {
        expect(this.name).toBe(name);
    };
    ListItemImplementation.prototype.addValuesToJSONDocument = function (json) {
        json.name = this.name;
    };
    ListItemImplementation.prototype.getNameOfDoc = function () {
        return "ListItemImplementation";
    };
    return ListItemImplementation;
}(PouchDBDocument));
export { ListItemImplementation };
function createItem(dateMinus) {
    var item = test.createNewItem();
    item.setId((new Date().valueOf() - dateMinus) + "");
    return item;
}
var ListItemImplementationGenerator = /** @class */ (function (_super) {
    __extends(ListItemImplementationGenerator, _super);
    function ListItemImplementationGenerator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListItemImplementationGenerator.prototype.createDocument = function (json) {
        var item = new ListItemImplementation();
        item.name = json.name;
        return item;
    };
    return ListItemImplementationGenerator;
}(PouchDBDocumentGenerator));
var ListImplementation = /** @class */ (function (_super) {
    __extends(ListImplementation, _super);
    function ListImplementation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListImplementation.prototype.getItemWithName = function (name) {
        var filterResult = this.items.filter(function (item) {
            return item.name === name;
        });
        return filterResult[0];
    };
    return ListImplementation;
}(PouchDBDocumentList));
var test = {
    add: function (item) {
        return {
            to: function (list) {
                return {
                    atTheEnd: function () {
                        return concatMap(function (result) {
                            return list.addItem(item, result.log);
                        });
                    },
                    atIndex: function (index) {
                        return concatMap(function (result) {
                            return list.addItemAtIndex(index, item, result.log);
                        });
                    },
                    atTheBeginning: function () {
                        return concatMap(function (result) {
                            return list.addItemAtBeginning(item, result.log);
                        });
                    },
                    orUpdate: function () {
                        return concatMap(function (result) {
                            return list.addOrUpdateItem(item, result.log);
                        });
                    }
                };
            },
        };
    },
    deleteItem: function (item) {
        return {
            fromList: function (list) {
                return concatMap(function (result) {
                    return list.deleteItem(item, result.log);
                });
            }
        };
    },
    tryToAdd: function (item) {
        return {
            againAsAUniqueItemTo: function (list) {
                return this.asAUniqueItemTo(list);
            },
            asAUniqueItemTo: function (list) {
                return concatMap(function (result) {
                    return list.addUniqueItem(item, result.log);
                });
            }
        };
    },
    itemIn: function (list) {
        return {
            atIndex: function (index) {
                return {
                    shouldHaveName: function (name) {
                        return [
                            concatMap(function (result) {
                                return list.getItemAtIndex(index, result.log);
                            }),
                            concatMap(function (result) {
                                var item = result.value;
                                item.shouldHaveName(name);
                                return result.log.addTo(of(result.value));
                            })
                        ];
                    }
                };
            },
        };
    },
    createNewList: function () {
        return new ListImplementation();
    },
    createNewItem: function (name) {
        var item = new ListItemImplementation();
        if (name !== undefined) {
            item.name = name;
        }
        return item;
    },
    createLocalDB: function (log) {
        var startLog;
        var dbName = "list_test";
        var steps = [
            concatMap(function (result) {
                startLog = result.log.start(LOG_NAME, "createLocalDB");
                return PouchDBWrapper.destroyLocalDB(dbName, result.log);
            }),
            concatMap(function (result) {
                return PouchDBWrapper.loadLocalDB(dbName, new ListItemImplementationGenerator(), result.log);
            }),
            tap(function (result) {
                result.log.complete();
                startLog.complete();
            })
        ];
        return TestUtil.operatorsToObservable(steps, log);
    },
    addItemTo: function (db) {
        return {
            withName: function (name, minus) {
                if (minus === void 0) { minus = 0; }
                var item = createItem(minus);
                return [
                    item.setNameTo(name),
                    concatMap(function (result) {
                        return db.saveDocument(item, result.log);
                    })
                ];
            },
            asDocument: function (item) {
                return concatMap(function (result) {
                    return db.saveDocument(item, result.log);
                });
            }
        };
    },
    deleteItemFrom: function (db) {
        return {
            withNameAndList: function (name, list) {
                var item = list.getItemWithName(name);
                return concatMap(function (result) {
                    return db.deleteDocument(item, result.log);
                });
            }
        };
    },
    make: function (list) {
        return {
            subscribeTo: function (db) {
                return concatMap(function (result) {
                    return list.subscribeTo(db, result.log);
                });
            }
        };
    },
    after: function (list) {
        return {
            subscriptionWasAddedTo: function (observable) {
                return {
                    listShouldHaveSize: function (size) {
                        var db;
                        var originalResult;
                        return observable.pipe(concatMap(function (result) {
                            db = result.value;
                            originalResult = result;
                            return list.getSize(result.log);
                        }), concatMap(function (result) {
                            var listSize = result.value;
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
            shouldHaveSize: function (size) {
                return concatMap(function (result) {
                    var actualSize = list.listContent$.getValue().value.length;
                    result.log.logMessage(LOG_NAME, "list content should have size", { expected: size, actual: actualSize });
                    expect(actualSize).toBe(size);
                    return result.log.addTo(of(actualSize));
                });
            },
            shouldHaveItemAtIndex: function (index) {
                return {
                    withName: function (name) {
                        return concatMap(function (result) {
                            var log = result.log;
                            log.logMessage(LOG_NAME, "list content should have item at index", { expected_name: name, expected_index: index });
                            var item = list.listContent$.getValue().value[index];
                            if (item === undefined) {
                                var errorMsg = "item in list content at index " + index + " is undefined";
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
    theItem: function (item) {
        return {
            inList: function (list) {
                return {
                    shouldBeAtIndex: function (index) {
                        return [
                            concatMap(function (result) {
                                return list.getCurrentIndexOfItem(item, result.log);
                            }),
                            concatMap(function (result) {
                                var listIndex = result.value;
                                expect(listIndex).toBe(index);
                                return result.log.addTo(of(item));
                            })
                        ];
                    }
                };
            }
        };
    },
    theList: function (list) {
        return {
            shouldHaveSize: function (size) {
                return [
                    concatMap(function (result) {
                        return list.getSize(result.log);
                    }),
                    concatMap(function (result) {
                        var listSize = result.value;
                        expect(listSize).toBe(size);
                        return result.log.addTo(of(listSize));
                    })
                ];
            },
            shouldBeInThisOrder: function (order) {
                return [
                    concatMap(function (result) {
                        return list.getItems(result.log);
                    }),
                    concatMap(function (result) {
                        result.log.complete();
                        var items = result.value;
                        expect(items).toBeInThisOrder(order);
                        return result.log.addTo(of(items));
                    })
                ];
            }
        };
    },
    concatMapPipe: function (observable, callFunctions) {
        var concatMaps = [];
        callFunctions.forEach(function (callFunction) {
            concatMaps.push(concatMap(function (result) { return callFunction(result); }));
        });
        return observable.pipe.apply(observable, concatMaps);
    },
    moveItem: function (item) {
        return {
            upInList: function (list) {
                return concatMap(function (result) {
                    return list.moveUp(item, result.log);
                });
            },
            downInList: function (list) {
                return concatMap(function (result) {
                    return list.moveDown(item, result.log);
                });
            }
        };
    },
    subscribeToEnd: function (observable, complete, log) {
        observable.pipe(catchError(function (error) {
            return log.logError(LOG_NAME, "subscribeToEnd", error + "", error).pipe(concatMap(function () {
                return throwError(error);
            }));
        }), concatMap(function () { return log.complete(); })).subscribe(function (next) {
            complete();
        }, function (error) {
            fail(error);
            complete();
        });
    },
    getLogger: function () {
        var log = Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    },
    createStartObservable: function (testName) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, testName);
        var startObservable = of({ value: "", log: log });
        return { startObservable: startObservable, startLog: startLog, log: log };
    },
    getItemFromList: function (list) {
        return {
            atIndex: function (index) {
                return concatMap(function (result) {
                    return list.getItemAtIndex(index, result.log);
                });
            }
        };
    },
};
var logDB;
var LOG_DB_CONF = new CouchDBConf();
LOG_DB_CONF.setDBName("dev-log");
LOG_DB_CONF.setPort(5984);
LOG_DB_CONF.setHost("couchdb-test");
LOG_DB_CONF.setHttp();
LOG_DB_CONF.setCredentials({
    username: "admin",
    password: "admin"
});
describe("PouchDBDocumentList tests", function () {
    beforeAll(function (complete) {
        PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger.getLoggerTrace()).subscribe(function (result) {
            logDB = result.value;
            complete();
        });
    });
    beforeEach(function () {
        jasmine.addMatchers(CustomJasmineMatchers.getMatchers());
    });
    var ListWithTwoItems = /** @class */ (function () {
        function ListWithTwoItems() {
        }
        return ListWithTwoItems;
    }());
    function createListWithTwoItems() {
        var logStart;
        var list, item1, item2;
        var log = test.getLogger();
        var steps = [
            concatMap(function (result) {
                logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
                list = new ListImplementation();
                item1 = createItem(100);
                item1.setDebug(true);
                item2 = createItem(0);
                item2.setDebug(true);
                return result.log.addTo(zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
            }),
            concatMap(function (result) {
                var values = new ListWithTwoItems();
                values.item1 = item1;
                values.item2 = item2;
                values.list = list;
                logStart.complete();
                return result.log.addTo(of(values));
            })
        ];
        return TestUtil.operatorsToObservable(steps, log);
    }
    var should_have_one_item_after_adding_an_item_to_an_empty_list = "should have one item after adding an item to an empty list";
    it(should_have_one_item_after_adding_an_item_to_an_empty_list, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_have_one_item_after_adding_an_item_to_an_empty_list);
        var list = test.createNewList();
        var item = test.createNewItem();
        var steps = [
            test.theList(list).shouldHaveSize(0),
            test.add(item).to(list).atTheBeginning(),
            test.theList(list).shouldHaveSize(1)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_have_length_0_after_deleting_an_item = "should have length 0 after deleting an item";
    it(should_have_length_0_after_deleting_an_item, function (complete) {
        var list = new ListImplementation();
        var item = new ListItemImplementation();
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_have_length_0_after_deleting_an_item);
        var steps = [
            test.add(item).to(list).atTheBeginning(),
            test.deleteItem(item).fromList(list),
            expectDeletedIndex_toBe(0),
            test.theList(list).shouldHaveSize(0)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
        function expectDeletedIndex_toBe(index) {
            return concatMap(function (result) {
                expect(result.value.index).toBe(index);
                return result.log.addTo(of(result.value));
            });
        }
    });
    var should_return_0_when_getting_the_index_of_the_only_item_in_the_list = "should return 0 when getting the index of the only item in the list";
    it(should_return_0_when_getting_the_index_of_the_only_item_in_the_list, function (complete) {
        var list = new ListImplementation();
        var item = new ListItemImplementation();
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_return_0_when_getting_the_index_of_the_only_item_in_the_list);
        var steps = [
            test.add(item).to(list).atTheBeginning(),
            test.theItem(item).inList(list).shouldBeAtIndex(0)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_the_item_at_index_0_before_the_existing_one = "should add the item at index 0 before the existing one";
    it(should_add_the_item_at_index_0_before_the_existing_one, function (complete) {
        var list = new ListImplementation();
        var item1 = new ListItemImplementation();
        item1.setId(item1.getId() + "0");
        var item2 = new ListItemImplementation();
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_the_item_at_index_0_before_the_existing_one);
        var steps = [
            test.add(item1).to(list).atTheEnd(),
            test.add(item2).to(list).atIndex(0),
            test.theItem(item1).inList(list).shouldBeAtIndex(1),
            test.theItem(item2).inList(list).shouldBeAtIndex(0)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_trigger_a_list_change_event_on_add_and_delete);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1),
                test.moveItem(values.item2).upInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 = "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.moveItem(values.item2).upInList(values.list),
                test.moveItem(values.item2).upInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_move_the_item_down_from_index_0_to_index_1 = "should move the item down from index 0 to index 1";
    it(should_move_the_item_down_from_index_0_to_index_1, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_move_the_item_down_from_index_0_to_index_1);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0),
                test.moveItem(values.item1).downInList(values.list),
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_not_move_the_item_down_more_than_index_1 = "should not move the item down more than index 1";
    it(should_not_move_the_item_down_more_than_index_1, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_not_move_the_item_down_more_than_index_1);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0),
                test.moveItem(values.item1).downInList(values.list),
                test.moveItem(values.item1).downInList(values.list),
                test.moveItem(values.item1).downInList(values.list),
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_just_add_the_item_because_it_does_not_exist_yet = "should just add the item because it doesn't exist yet";
    it(should_just_add_the_item_because_it_does_not_exist_yet, function (complete) {
        var list = new ListImplementation();
        var item = new ListItemImplementation();
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_just_add_the_item_because_it_does_not_exist_yet);
        var steps = [
            test.add(item).to(list).orUpdate(),
            test.theList(list).shouldHaveSize(1)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_update_the_item_with_the_new_contents = "should update the item with the new contents";
    it(should_update_the_item_with_the_new_contents, function (complete) {
        var list = new ListImplementation();
        var item = new ListItemImplementation();
        var firstName = "first name";
        var secondName = "second name";
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_update_the_item_with_the_new_contents);
        var steps = [
            item.setNameTo(firstName),
            item.addOrUpdateOn(list),
            test.itemIn(list).atIndex(0).shouldHaveName(firstName),
            item.setNameTo(secondName),
            item.addOrUpdateOn(list),
            test.itemIn(list).atIndex(0).shouldHaveName(secondName)
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_two_more_items_between_item1_and_item2 = "should add two more items between item1 and item2";
    it(should_add_two_more_items_between_item1_and_item2, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_two_more_items_between_item1_and_item2);
        var item3 = createItem(200);
        var item4 = createItem(300);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.add(item3).to(values.list).atIndex(1),
                test.add(item4).to(values.list).atIndex(2),
                test.theList(values.list).shouldHaveSize(4),
                test.theList(values.list).shouldBeInThisOrder([
                    values.item1,
                    item3,
                    item4,
                    values.item2
                ])
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_the_item_at_the_beginning = "should add the item at the beginning";
    it(should_add_the_item_at_the_beginning, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_the_item_at_the_beginning);
        var item3 = createItem(200);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.add(item3).to(values.list).atTheBeginning(),
                test.theList(values.list).shouldBeInThisOrder([
                    item3, values.item1, values.item2
                ])
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_not_add_the_same_unique_item = "should not add the same unique item";
    it(should_not_add_the_same_unique_item, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_not_add_the_same_unique_item);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.tryToAdd(values.item1).againAsAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(2)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_the_new_unique_item_because_it_is_not_in_the_list_yet = "should add the new unique item because it is not in the list yet";
    it(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_the_new_unique_item_because_it_is_not_in_the_list_yet);
        var item = createItem(200);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.tryToAdd(item).asAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(3),
                test.tryToAdd(item).againAsAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(3)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    function createDBWithTwoItemsAndSubscribeWithList(log) {
        var name1 = "name1";
        var name2 = "name2";
        var list = test.createNewList();
        var observable = test.createLocalDB(log).pipe(concatMap(function (result) {
            var startLog = log.start(LOG_NAME, "createDBWithTwoItemsAndSubscribeWithList");
            var db = result.value;
            var steps = [
                test.addItemTo(db).withName(name1, 100),
                test.addItemTo(db).withName(name2),
                test.make(list).subscribeTo(db),
                returnValues()
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
            function returnValues() {
                return concatMap(function (innerResult) {
                    startLog.complete();
                    return innerResult.log.addTo(of({ list: list, name1: name1, name2: name2, db: db }));
                });
            }
        }));
        return observable;
    }
    var should_initialize_the_list_from_PouchDBWrapper = "should initialize the list from PouchDBWrapper";
    it(should_initialize_the_list_from_PouchDBWrapper, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_initialize_the_list_from_PouchDBWrapper);
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theList(values.list).shouldHaveSize(2)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list = "should after subscription automatically add a new item to the beginning of the list";
    it(should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list);
        var list = test.createNewList();
        var name1 = "name1";
        var name2 = "name2";
        var observable = test.createLocalDB(log).pipe(concatMap(function (result) {
            var db = result.value;
            var steps = [
                test.make(list).subscribeTo(db),
                test.theList(list).shouldHaveSize(0),
                test.addItemTo(db).withName(name1, 100),
                test.theList(list).shouldHaveSize(1),
                test.addItemTo(db).withName(name2),
                test.theList(list).shouldHaveSize(2),
                test.itemIn(list).atIndex(0).shouldHaveName(name2),
                test.itemIn(list).atIndex(1).shouldHaveName(name1),
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_after_subscribe_delete_elements_from_the_list);
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.deleteItemFrom(values.db).withNameAndList(values.name1, values.list),
                test.theList(values.list).shouldHaveSize(1),
                test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_trigger_a_list_change_event_on_add_and_delete = "should trigger a list change event on add and delete";
    it(should_trigger_a_list_change_event_on_add_and_delete, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_trigger_a_list_change_event_on_add_and_delete);
        var list = test.createNewList();
        var name1 = "name1";
        var item1 = test.createNewItem();
        var name2 = "name2";
        var item2 = test.createNewItem();
        item1.setId(item1.getId() + "0");
        var steps = [
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
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_update_the_list_content_if_the_values_of_an_item_change = "should update the list content if the values of an item change";
    it(should_update_the_list_content_if_the_values_of_an_item_change, function (complete) {
        var list = test.createNewList();
        var name1 = "name1";
        var item = test.createNewItem(name1);
        var name2 = "name2";
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_update_the_list_content_if_the_values_of_an_item_change);
        var steps = [
            test.add(item).to(list).atTheBeginning(),
            test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name1),
            item.setNameTo(name2),
            test.add(item).to(list).orUpdate(),
            test.listContentOf(list).shouldHaveSize(1),
            test.listContentOf(list).shouldHaveItemAtIndex(0).withName(name2),
        ];
        var observable = TestUtil.operatorsToObservable(steps, log);
        TestUtil.testComplete(startLog, observable, complete);
    });
    var should_on_database_value_change_update_the_list_with_the_new_contents = "should on database value change update the list with the new contents";
    it(should_on_database_value_change_update_the_list_with_the_new_contents, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_on_database_value_change_update_the_list_with_the_new_contents);
        var differentName = "some different name";
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.getItemFromList(values.list).atIndex(0),
                setName_onItem_andAdd_toDB(differentName),
                test.theList(values.list).shouldHaveSize(2),
                test.listContentOf(values.list).shouldHaveSize(2),
                test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(differentName),
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
            function setName_onItem_andAdd_toDB(name) {
                return concatMap(function (innerResult) {
                    var item = innerResult.value;
                    item.name = name;
                    return values.db.saveDocument(item, result.log);
                });
            }
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
    var movingItems_shouldTrigger_listContentChange = "moving items should trigger list content change";
    it(movingItems_shouldTrigger_listContentChange, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, movingItems_shouldTrigger_listContentChange);
        var observable = createListWithTwoItems().pipe(concatMap(function (result) {
            var values = result.value;
            values.item1.name = "item1";
            values.item2.name = "item2";
            var steps = [
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1),
                test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(values.item1.name),
                test.moveItem(values.item2).upInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0),
                test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(values.item2.name),
                // move the item back down
                test.moveItem(values.item2).downInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1),
                test.listContentOf(values.list).shouldHaveItemAtIndex(1).withName(values.item2.name)
            ];
            return TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil.testComplete(startLog, observable, complete);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnRMaXN0LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLHVEQUF1RDtBQUN2RCxPQUFPLEVBQWdDLG1CQUFtQixFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFDekYsT0FBTyxFQUFDLGVBQWUsRUFBRSx3QkFBd0IsRUFBc0IsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRyxPQUFPLEVBQUMscUJBQXFCLEVBQUMsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQWlCLGNBQWMsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQ2hFLE9BQU8sRUFBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQzFELE9BQU8sRUFBYSxFQUFFLEVBQW9CLFVBQVUsRUFBRSxHQUFHLEVBQUMsTUFBTSxNQUFNLENBQUM7QUFDdkUsT0FBTyxFQUFDLE1BQU0sRUFBa0IsTUFBTSxVQUFVLENBQUM7QUFDakQsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBQzdDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFFcEMsSUFBTSxRQUFRLEdBQUcseUJBQXlCLENBQUM7QUFNM0M7SUFBNEMsMENBQTJDO0lBQXZGOztJQTRCQSxDQUFDO0lBekJHLDBDQUFTLEdBQVQsVUFBVSxJQUFZO1FBQXRCLGlCQU1DO1FBTEcsT0FBTyxTQUFTLENBQUMsVUFBQyxNQUF1QjtZQUNyQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUN0RSxLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNqQixPQUFPLE1BQU0s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