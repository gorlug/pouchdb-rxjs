"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CustomJasmineMatchers = /** @class */ (function () {
    function CustomJasmineMatchers() {
    }
    CustomJasmineMatchers.getMatchers = function () {
        return {
            toBeInThisOrder: function (util, customEqualityTesters) {
                return {
                    compare: function (actual, expected) {
                        var pass = true;
                        var message;
                        if (actual.length !== expected.length) {
                            pass = false;
                            message = "actual array length " + actual.length + " is not the same as expected length " + expected.length;
                        }
                        actual.forEach(function (value, index) {
                            var expectedItem = expected[index];
                            if (!value.isTheSameDocumentAs(expectedItem)) {
                                pass = false;
                                message = "item at index " + index + " " + JSON.stringify(value) +
                                    (" is not the same as " + JSON.stringify(expectedItem));
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
    };
    return CustomJasmineMatchers;
}());
exports.CustomJasmineMatchers = CustomJasmineMatchers;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tSmFzbWluZU1hdGNoZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DdXN0b21KYXNtaW5lTWF0Y2hlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFPQTtJQUFBO0lBNkJBLENBQUM7SUE1QlUsaUNBQVcsR0FBbEI7UUFDSSxPQUFPO1lBQ0gsZUFBZSxFQUFFLFVBQVUsSUFBa0IsRUFBRSxxQkFBa0Q7Z0JBQzdGLE9BQU87b0JBQ0gsT0FBTyxFQUFFLFVBQVMsTUFBbUMsRUFBRSxRQUFxQzt3QkFDeEYsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO3dCQUNoQixJQUFJLE9BQU8sQ0FBQzt3QkFDWixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBRTs0QkFDbkMsSUFBSSxHQUFHLEtBQUssQ0FBQzs0QkFDYixPQUFPLEdBQUcseUJBQXVCLE1BQU0sQ0FBQyxNQUFNLDRDQUF1QyxRQUFRLENBQUMsTUFBUSxDQUFDO3lCQUMxRzt3QkFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLEtBQUs7NEJBQ3hCLElBQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQ0FDMUMsSUFBSSxHQUFHLEtBQUssQ0FBQztnQ0FDYixPQUFPLEdBQUcsbUJBQWlCLEtBQUssU0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBRztxQ0FDMUQseUJBQXVCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFHLENBQUEsQ0FBQzs2QkFDMUQ7d0JBQ0wsQ0FBQyxDQUFDLENBQUM7d0JBQ0gsT0FBTzs0QkFDSCxJQUFJLEVBQUUsSUFBSTs0QkFDVixPQUFPLEVBQUUsT0FBTzt5QkFDbkIsQ0FBQztvQkFDTixDQUFDO2lCQUNKLENBQUM7WUFDTixDQUFDO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFDTCw0QkFBQztBQUFELENBQUMsQUE3QkQsSUE2QkM7QUE3Qlksc0RBQXFCIn0=