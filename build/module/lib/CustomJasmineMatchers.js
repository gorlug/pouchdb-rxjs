export class CustomJasmineMatchers {
    static getMatchers() {
        return {
            toBeInThisOrder: function (util, customEqualityTesters) {
                return {
                    compare: function (actual, expected) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tSmFzbWluZU1hdGNoZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9DdXN0b21KYXNtaW5lTWF0Y2hlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBT0EsTUFBTSxPQUFPLHFCQUFxQjtJQUM5QixNQUFNLENBQUMsV0FBVztRQUNkLE9BQU87WUFDSCxlQUFlLEVBQUUsVUFBVSxJQUFrQixFQUFFLHFCQUFrRDtnQkFDN0YsT0FBTztvQkFDSCxPQUFPLEVBQUUsVUFBUyxNQUFtQyxFQUFFLFFBQXFDO3dCQUN4RixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7d0JBQ2hCLElBQUksT0FBTyxDQUFDO3dCQUNaLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFOzRCQUNuQyxJQUFJLEdBQUcsS0FBSyxDQUFDOzRCQUNiLE9BQU8sR0FBRyx1QkFBdUIsTUFBTSxDQUFDLE1BQU0sdUNBQXVDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt5QkFDMUc7d0JBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTs0QkFDNUIsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxFQUFFO2dDQUMxQyxJQUFJLEdBQUcsS0FBSyxDQUFDO2dDQUNiLE9BQU8sR0FBRyxpQkFBaUIsS0FBSyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7b0NBQzFELHVCQUF1QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7NkJBQzFEO3dCQUNMLENBQUMsQ0FBQyxDQUFDO3dCQUNILE9BQU87NEJBQ0gsSUFBSSxFQUFFLElBQUk7NEJBQ1YsT0FBTyxFQUFFLE9BQU87eUJBQ25CLENBQUM7b0JBQ04sQ0FBQztpQkFDSixDQUFDO1lBQ04sQ0FBQztTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0oifQ==