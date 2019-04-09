# Version 0.2.0

##### Add setBaseUrl function to CouchDBWrapper

##### Add RxjsUtil

Its main function is to pipe several operators in an array to an observable. This also allows converting an array of operators to an observable. This arrays can themselves again consist of more arrays with operators.

##### PouchDBDocumentList

* Use the actual item id to dertmine the index of an item
* Use a clone of the items array for listContent$ 
  * Otherwise the content of the observable changes when the items array changes even without firing a next event. Now that event is also fired when an item is moved.
* On calling deleteItem also return the index of the deleted item 
* Sort items before emitting listContent$

# Version 0.1.3

##### Update items inside the list that change on pouchdb subscribe

When just the content of an item changes while listening to save
subscribe then it won't get added again but instead replace the existing
item.


