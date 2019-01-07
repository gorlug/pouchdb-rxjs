declare namespace jasmine {
    interface Matchers<T> {
        toBeTheSameDocument(expected: any);
        toBeInThisOrder(expected: any);
        toBeTheSameListItem(expected: any);
        sizeToBe(expected: number);
    }
}
