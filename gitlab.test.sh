#!/bin/bash
curl -X PUT http://admin:admin@couchdb-test:5984/_users
curl -X PUT http://admin:admin@couchdb-test:5984/dev-log
./node_modules/karma/bin/karma start gitlab-karma.conf.js
