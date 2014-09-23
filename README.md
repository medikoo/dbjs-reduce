# dbjs-reduce
## Data reduction utility for [dbjs](https://github.com/medikoo/dbjs)

Reduces one _complete_ database into more _compact_ reduced version. In practice it usually means propagation of some computed property values into other database instance. It can be helpful when we want to process large overviews of data, but we're only interested in some summaries and not atomic values.

### API

#### create(sourceDb, propertyName) _(dbjs-reduce/create)_

Create reduced database instance.
It takes sourceDb, and copies also necessary model into result database. Which properties are copied is resolved on basis of existence of chosen property on property descriptor (name of that property is set via `propertyName` argument).

e.g.:

```javascript
var Database      = require('dbjs');
var createReduced = require('dbjs-reduce/create');

var db = new Database();

db.Object.extend('User', {
  firstName: { type: db.String },
  lastName: { type: db.String },
  fullName: {
    type: db.String,
    value: function () { return this.firstName + " " + this.lastName; },
    reduceBase: true
  }
});

var reducedDb = createReduced(db, 'reduceBase');
// Contains only definition for User.prototype.fullName, but with no getter defined
```

We can copy both computed and static properties.

#### sync(reducedDb, propertyName) _(dbjs-reduce/sync)_

Initializes sychronization setup between two database instances.

Continuation of first example:

```javascript
var syncReduced = require('dbjs-reduce/sync');
var propagate = syncReduced(reducedDb, 'reduceBase');

// Initialize propagation of all user instances
db.User.instances.forEach(propagate);
db.User.instances.on('change', function (event) {
  if (event.type === 'add') {
    propagate(event.value);
    return;
  }
  if (event.type !== 'batch') return;
  if (!event.added) return;
  event.added.forEach(propagate);
});

// Initialize example user instance on source database
var sUser = new db.User({ firstName: "John", lastName: "Smith" });

// Get sUser instance version from reduced database
var rUser = readucedDb.User.getById(sUser.__id__);
rUser.firstName; // undefined
rUser.lastName; // undefined
rUser.fullName; // "John Smith"

// Change atomic property value on source object
sUser.firstName = "Steven";

// Reduced version is updated accordingly
rUser.firstName; // undefined
rUser.lastName; // undefined
rUser.fullName; // "Steven Smith
```

### Installation

	$ npm install dbjs-reduce

## Tests [![Build Status](https://travis-ci.org/medikoo/dbjs-reduce.svg)](https://travis-ci.org/medikoo/dbjs-reduce)

	$ npm test
