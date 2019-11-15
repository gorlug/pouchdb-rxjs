"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../types/JasmineExtension.d.ts" />
var PouchDBDocumentList_1 = require("./PouchDBDocumentList");
var PouchDBDocument_1 = require("./PouchDBDocument");
var CustomJasmineMatchers_1 = require("./CustomJasmineMatchers");
var PouchDBWrapper_1 = require("./PouchDBWrapper");
var operators_1 = require("rxjs/operators");
var rxjs_1 = require("rxjs");
var Logger_1 = require("./Logger");
var CouchDBWrapper_1 = require("./CouchDBWrapper");
var TestUtil_1 = require("./TestUtil");
var LOG_NAME = "PouchDBDocumentListTest";
var ListItemImplementation = /** @class */ (function (_super) {
    __extends(ListItemImplementation, _super);
    function ListItemImplementation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListItemImplementation.prototype.setNameTo = function (name) {
        var _this = this;
        return operators_1.concatMap(function (result) {
            result.log.logMessage(LOG_NAME, "setting item name to", { name: name });
            _this.name = name;
            return result.log.addTo(rxjs_1.of(name));
        });
    };
    ListItemImplementation.prototype.addOrUpdateOn = function (list) {
        var _this = this;
        return operators_1.concatMap(function (result) {
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
}(PouchDBDocument_1.PouchDBDocument));
exports.ListItemImplementation = ListItemImplementation;
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
}(PouchDBDocument_1.PouchDBDocumentGenerator));
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
}(PouchDBDocumentList_1.PouchDBDocumentList));
var test = {
    add: function (item) {
        return {
            to: function (list) {
                return {
                    atTheEnd: function () {
                        return operators_1.concatMap(function (result) {
                            return list.addItem(item, result.log);
                        });
                    },
                    atIndex: function (index) {
                        return operators_1.concatMap(function (result) {
                            return list.addItemAtIndex(index, item, result.log);
                        });
                    },
                    atTheBeginning: function () {
                        return operators_1.concatMap(function (result) {
                            return list.addItemAtBeginning(item, result.log);
                        });
                    },
                    orUpdate: function () {
                        return operators_1.concatMap(function (result) {
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
                return operators_1.concatMap(function (result) {
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
                return operators_1.concatMap(function (result) {
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
                            operators_1.concatMap(function (result) {
                                return list.getItemAtIndex(index, result.log);
                            }),
                            operators_1.concatMap(function (result) {
                                var item = result.value;
                                item.shouldHaveName(name);
                                return result.log.addTo(rxjs_1.of(result.value));
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
            operators_1.concatMap(function (result) {
                startLog = result.log.start(LOG_NAME, "createLocalDB");
                return PouchDBWrapper_1.PouchDBWrapper.destroyLocalDB(dbName, result.log);
            }),
            operators_1.concatMap(function (result) {
                return PouchDBWrapper_1.PouchDBWrapper.loadLocalDB(dbName, new ListItemImplementationGenerator(), result.log);
            }),
            operators_1.tap(function (result) {
                result.log.complete();
                startLog.complete();
            })
        ];
        return TestUtil_1.TestUtil.operatorsToObservable(steps, log);
    },
    addItemTo: function (db) {
        return {
            withName: function (name, minus) {
                if (minus === void 0) { minus = 0; }
                var item = createItem(minus);
                return [
                    item.setNameTo(name),
                    operators_1.concatMap(function (result) {
                        return db.saveDocument(item, result.log);
                    })
                ];
            },
            asDocument: function (item) {
                return operators_1.concatMap(function (result) {
                    return db.saveDocument(item, result.log);
                });
            }
        };
    },
    deleteItemFrom: function (db) {
        return {
            withNameAndList: function (name, list) {
                var item = list.getItemWithName(name);
                return operators_1.concatMap(function (result) {
                    return db.deleteDocument(item, result.log);
                });
            }
        };
    },
    make: function (list) {
        return {
            subscribeTo: function (db) {
                return operators_1.concatMap(function (result) {
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
                        return observable.pipe(operators_1.concatMap(function (result) {
                            db = result.value;
                            originalResult = result;
                            return list.getSize(result.log);
                        }), operators_1.concatMap(function (result) {
                            var listSize = result.value;
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
            shouldHaveSize: function (size) {
                return operators_1.concatMap(function (result) {
                    var actualSize = list.listContent$.getValue().value.length;
                    result.log.logMessage(LOG_NAME, "list content should have size", { expected: size, actual: actualSize });
                    expect(actualSize).toBe(size);
                    return result.log.addTo(rxjs_1.of(actualSize));
                });
            },
            shouldHaveItemAtIndex: function (index) {
                return {
                    withName: function (name) {
                        return operators_1.concatMap(function (result) {
                            var log = result.log;
                            log.logMessage(LOG_NAME, "list content should have item at index", { expected_name: name, expected_index: index });
                            var item = list.listContent$.getValue().value[index];
                            if (item === undefined) {
                                var errorMsg = "item in list content at index " + index + " is undefined";
                                log.logError(LOG_NAME, "list content should have item at index error", errorMsg);
                                fail(errorMsg);
                                return rxjs_1.throwError(errorMsg);
                            }
                            item.shouldHaveName(name);
                            return log.addTo(rxjs_1.of(name));
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
                            operators_1.concatMap(function (result) {
                                return list.getCurrentIndexOfItem(item, result.log);
                            }),
                            operators_1.concatMap(function (result) {
                                var listIndex = result.value;
                                expect(listIndex).toBe(index);
                                return result.log.addTo(rxjs_1.of(item));
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
                    operators_1.concatMap(function (result) {
                        return list.getSize(result.log);
                    }),
                    operators_1.concatMap(function (result) {
                        var listSize = result.value;
                        expect(listSize).toBe(size);
                        return result.log.addTo(rxjs_1.of(listSize));
                    })
                ];
            },
            shouldBeInThisOrder: function (order) {
                return [
                    operators_1.concatMap(function (result) {
                        return list.getItems(result.log);
                    }),
                    operators_1.concatMap(function (result) {
                        result.log.complete();
                        var items = result.value;
                        expect(items).toBeInThisOrder(order);
                        return result.log.addTo(rxjs_1.of(items));
                    })
                ];
            }
        };
    },
    concatMapPipe: function (observable, callFunctions) {
        var concatMaps = [];
        callFunctions.forEach(function (callFunction) {
            concatMaps.push(operators_1.concatMap(function (result) { return callFunction(result); }));
        });
        return observable.pipe.apply(observable, concatMaps);
    },
    moveItem: function (item) {
        return {
            upInList: function (list) {
                return operators_1.concatMap(function (result) {
                    return list.moveUp(item, result.log);
                });
            },
            downInList: function (list) {
                return operators_1.concatMap(function (result) {
                    return list.moveDown(item, result.log);
                });
            }
        };
    },
    subscribeToEnd: function (observable, complete, log) {
        observable.pipe(operators_1.catchError(function (error) {
            return log.logError(LOG_NAME, "subscribeToEnd", error + "", error).pipe(operators_1.concatMap(function () {
                return rxjs_1.throwError(error);
            }));
        }), operators_1.concatMap(function () { return log.complete(); })).subscribe(function (next) {
            complete();
        }, function (error) {
            fail(error);
            complete();
        });
    },
    getLogger: function () {
        var log = Logger_1.Logger.getLoggerTrace();
        log.setLogDB(logDB);
        return log;
    },
    createStartObservable: function (testName) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, testName);
        var startObservable = rxjs_1.of({ value: "", log: log });
        return { startObservable: startObservable, startLog: startLog, log: log };
    },
    getItemFromList: function (list) {
        return {
            atIndex: function (index) {
                return operators_1.concatMap(function (result) {
                    return list.getItemAtIndex(index, result.log);
                });
            }
        };
    },
};
var logDB;
var LOG_DB_CONF = new CouchDBWrapper_1.CouchDBConf();
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
        PouchDBWrapper_1.PouchDBWrapper.loadExternalDB(LOG_DB_CONF, Logger_1.Logger.getLoggerTrace()).subscribe(function (result) {
            logDB = result.value;
            complete();
        });
    });
    beforeEach(function () {
        jasmine.addMatchers(CustomJasmineMatchers_1.CustomJasmineMatchers.getMatchers());
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
            operators_1.concatMap(function (result) {
                logStart = result.log.start(LOG_NAME, "createListWithTwoItems");
                list = new ListImplementation();
                item1 = createItem(100);
                item1.setDebug(true);
                item2 = createItem(0);
                item2.setDebug(true);
                return result.log.addTo(rxjs_1.zip(list.addItem(item1, result.log), list.addItem(item2, result.log)));
            }),
            operators_1.concatMap(function (result) {
                var values = new ListWithTwoItems();
                values.item1 = item1;
                values.item2 = item2;
                values.list = list;
                logStart.complete();
                return result.log.addTo(rxjs_1.of(values));
            })
        ];
        return TestUtil_1.TestUtil.operatorsToObservable(steps, log);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
        function expectDeletedIndex_toBe(index) {
            return operators_1.concatMap(function (result) {
                expect(result.value.index).toBe(index);
                return result.log.addTo(rxjs_1.of(result.value));
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_move_the_item_up_from_index_1_to_index_0 = "should move the item up from index 1 to index 0";
    it(should_move_the_item_up_from_index_1_to_index_0, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_trigger_a_list_change_event_on_add_and_delete);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(1),
                test.moveItem(values.item2).upInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0 = "should stay at index 0 if the item being moved up is already at index 0";
    it(should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_stay_at_index_0_if_the_item_being_moved_up_is_already_at_index_0);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.moveItem(values.item2).upInList(values.list),
                test.moveItem(values.item2).upInList(values.list),
                test.theItem(values.item2).inList(values.list).shouldBeAtIndex(0)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_move_the_item_down_from_index_0_to_index_1 = "should move the item down from index 0 to index 1";
    it(should_move_the_item_down_from_index_0_to_index_1, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_move_the_item_down_from_index_0_to_index_1);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0),
                test.moveItem(values.item1).downInList(values.list),
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_not_move_the_item_down_more_than_index_1 = "should not move the item down more than index 1";
    it(should_not_move_the_item_down_more_than_index_1, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_not_move_the_item_down_more_than_index_1);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(0),
                test.moveItem(values.item1).downInList(values.list),
                test.moveItem(values.item1).downInList(values.list),
                test.moveItem(values.item1).downInList(values.list),
                test.theItem(values.item1).inList(values.list).shouldBeAtIndex(1)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_two_more_items_between_item1_and_item2 = "should add two more items between item1 and item2";
    it(should_add_two_more_items_between_item1_and_item2, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_two_more_items_between_item1_and_item2);
        var item3 = createItem(200);
        var item4 = createItem(300);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
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
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_the_item_at_the_beginning = "should add the item at the beginning";
    it(should_add_the_item_at_the_beginning, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_the_item_at_the_beginning);
        var item3 = createItem(200);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.add(item3).to(values.list).atTheBeginning(),
                test.theList(values.list).shouldBeInThisOrder([
                    item3, values.item1, values.item2
                ])
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_not_add_the_same_unique_item = "should not add the same unique item";
    it(should_not_add_the_same_unique_item, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_not_add_the_same_unique_item);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.tryToAdd(values.item1).againAsAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(2)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_add_the_new_unique_item_because_it_is_not_in_the_list_yet = "should add the new unique item because it is not in the list yet";
    it(should_add_the_new_unique_item_because_it_is_not_in_the_list_yet, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_add_the_new_unique_item_because_it_is_not_in_the_list_yet);
        var item = createItem(200);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.tryToAdd(item).asAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(3),
                test.tryToAdd(item).againAsAUniqueItemTo(values.list),
                test.theList(values.list).shouldHaveSize(3)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    function createDBWithTwoItemsAndSubscribeWithList(log) {
        var name1 = "name1";
        var name2 = "name2";
        var list = test.createNewList();
        var observable = test.createLocalDB(log).pipe(operators_1.concatMap(function (result) {
            var startLog = log.start(LOG_NAME, "createDBWithTwoItemsAndSubscribeWithList");
            var db = result.value;
            var steps = [
                test.addItemTo(db).withName(name1, 100),
                test.addItemTo(db).withName(name2),
                test.make(list).subscribeTo(db),
                returnValues()
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
            function returnValues() {
                return operators_1.concatMap(function (innerResult) {
                    startLog.complete();
                    return innerResult.log.addTo(rxjs_1.of({ list: list, name1: name1, name2: name2, db: db }));
                });
            }
        }));
        return observable;
    }
    var should_initialize_the_list_from_PouchDBWrapper = "should initialize the list from PouchDBWrapper";
    it(should_initialize_the_list_from_PouchDBWrapper, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_initialize_the_list_from_PouchDBWrapper);
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.theList(values.list).shouldHaveSize(2)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list = "should after subscription automatically add a new item to the beginning of the list";
    it(should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_after_subscription_automatically_add_a_new_item_to_the_beginning_of_the_list);
        var list = test.createNewList();
        var name1 = "name1";
        var name2 = "name2";
        var observable = test.createLocalDB(log).pipe(operators_1.concatMap(function (result) {
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
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_after_subscribe_delete_elements_from_the_list = "should after subscribe delete elements from the list";
    it(should_after_subscribe_delete_elements_from_the_list, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_after_subscribe_delete_elements_from_the_list);
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.deleteItemFrom(values.db).withNameAndList(values.name1, values.list),
                test.theList(values.list).shouldHaveSize(1),
                test.itemIn(values.list).atIndex(0).shouldHaveName(values.name2)
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
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
        var observable = TestUtil_1.TestUtil.operatorsToObservable(steps, log);
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var should_on_database_value_change_update_the_list_with_the_new_contents = "should on database value change update the list with the new contents";
    it(should_on_database_value_change_update_the_list_with_the_new_contents, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, should_on_database_value_change_update_the_list_with_the_new_contents);
        var differentName = "some different name";
        var observable = createDBWithTwoItemsAndSubscribeWithList(log).pipe(operators_1.concatMap(function (result) {
            var values = result.value;
            var steps = [
                test.getItemFromList(values.list).atIndex(0),
                setName_onItem_andAdd_toDB(differentName),
                test.theList(values.list).shouldHaveSize(2),
                test.listContentOf(values.list).shouldHaveSize(2),
                test.listContentOf(values.list).shouldHaveItemAtIndex(0).withName(differentName),
            ];
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
            function setName_onItem_andAdd_toDB(name) {
                return operators_1.concatMap(function (innerResult) {
                    var item = innerResult.value;
                    item.name = name;
                    return values.db.saveDocument(item, result.log);
                });
            }
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
    var movingItems_shouldTrigger_listContentChange = "moving items should trigger list content change";
    it(movingItems_shouldTrigger_listContentChange, function (complete) {
        var log = test.getLogger();
        var startLog = log.start(LOG_NAME, movingItems_shouldTrigger_listContentChange);
        var observable = createListWithTwoItems().pipe(operators_1.concatMap(function (result) {
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
            return TestUtil_1.TestUtil.operatorsToObservable(steps, result.log);
        }));
        TestUtil_1.TestUtil.testComplete(startLog, observable, complete);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUG91Y2hEQkRvY3VtZW50TGlzdC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9Qb3VjaERCRG9jdW1lbnRMaXN0LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdURBQXVEO0FBQ3ZELDZEQUF5RjtBQUN6RixxREFBaUc7QUFDakcsaUVBQThEO0FBQzlELG1EQUFnRTtBQUNoRSw0Q0FBMEQ7QUFDMUQsNkJBQXVFO0FBQ3ZFLG1DQUFpRDtBQUNqRCxtREFBNkM7QUFDN0MsdUNBQW9DO0FBRXBDLElBQU0sUUFBUSxHQUFHLHlCQUF5QixDQUFDO0FBTTNDO0lBQTRDLDBDQUEyQztJQUF2Rjs7SUE0QkEsQ0FBQztJQXpCRywwQ0FBUyxHQUFULFVBQVUsSUFBWTtRQUF0QixpQkFNQztRQUxHLE9BQU8scUJBQVMsQ0FBQyxVQUFDLE1BQXVCO1lBQ3JDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1lBQ3RFLEtBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsOENBQWEsR0FBYixVQUFjLElBQXdCO1FBQXRDLGlCQUlDO1FBSEcsT0FBTyxxQkFBUyxDQUFDLFVBQUMsTUFBdUI7WUFDckMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsK0NBQWMsR0FBZCxVQUFlLElBQVk7UUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJ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