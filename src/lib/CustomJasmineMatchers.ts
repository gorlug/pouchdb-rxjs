/// <reference path="../../node_modules/@types/jasmine/index.d.ts" />
import CustomMatcherFactories = jasmine.CustomMatcherFactories;
import MatchersUtil = jasmine.MatchersUtil;
import CustomEqualityTester = jasmine.CustomEqualityTester;
import CustomMatcher = jasmine.CustomMatcher;
import {PouchDBDocument} from "./PouchDBDocument";

export class CustomJasmineMatchers {
    static getMatchers(): CustomMatcherFactories {
        return {
            toBeInThisOrder: function (util: MatchersUtil, customEqualityTesters: Array<CustomEqualityTester>): CustomMatcher {
                return {
                    compare: function(actual: Array<PouchDBDocument<any>>, expected: Array<PouchDBDocument<any>>) {
                        let pass = true;
                        let message;
                        if (actual.length !== expected.length) {
                            pass = false;
                            message = `actual array length ${actual.length} is not the same as expected length ${expected.length}`;
                        }
                        actual.forEach((value, index) => {
                            const expectedItem = expected[index];
                            if (!value.isTheSameDocumentAs(expectedItem)) {
                                pass = false;
                                message = `item at index ${index} ${JSON.stringify(value)}` +
                                 ` is not the same as ${JSON.stringify(expectedItem)}`;
                            }
                        });
                        return {
                            pass: pass,
                            message: message
                        };
                    }
                };
            },
        };
    }
}
