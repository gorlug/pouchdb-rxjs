# @gorlug/pouchdb-rxjs

Wrapper around the pouchdb API that returns an observable for every call. Every method also need to be provided with a Logger instance. The return values also all contain a reference to a Logger instance. The Logger enables tracing method calls initiated by a single action using a trace id.
