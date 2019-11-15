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
export { CustomJasmineMatchers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tSmFzbWluZU1hdGNoZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DdXN0b21KYXNtaW5lTWF0Y2hlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0E7SUFBQTtJQTZCQSxDQUFDO0lBNUJVLGlDQUFXLEdBQWxCO1FBQ0ksT0FBTztZQUNILGVBQWUsRUFBRSxVQUFVLElBQWtCLEVBQUUscUJBQWtEO2dCQUM3RixPQUFPO29CQUNILE9BQU8sRUFBRSxVQUFTLE1BQW1DLEVBQUUsUUFBcUM7d0JBQ3hGLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQzt3QkFDaEIsSUFBSSxPQUFPLENBQUM7d0JBQ1osSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQUU7NEJBQ25DLElBQUksR0FBRyxLQUFLLENBQUM7NEJBQ2IsT0FBTyxHQUFHLHlCQUF1QixNQUFNLENBQUMsTUFBTSw0Q0FBdUMsUUFBUSxDQUFDLE1BQVEsQ0FBQzt5QkFDMUc7d0JBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxLQUFLOzRCQUN4QixJQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7NEJBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0NBQzFDLElBQUksR0FBRyxLQUFLLENBQUM7Z0NBQ2IsT0FBTyxHQUFHLG1CQUFpQixLQUFLLFNBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUc7cUNBQzFELHlCQUF1QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBRyxDQUFBLENBQUM7NkJBQzFEO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUNILE9BQU87NEJBQ0gsSUFBSSxFQUFFLElBQUk7NEJBQ1YsT0FBTyxFQUFFLE9BQU87eUJBQ25CLENBQUM7b0JBQ04sQ0FBQztpQkFDSixDQUFDO1lBQ04sQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDO0lBQ0wsNEJBQUM7QUFBRCxDQUFDLEFBN0JELElBNkJDIn0=