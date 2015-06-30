'use strict';

var Database   = require('dbjs')
  , db         = new Database()
  , DateType   = require('dbjs-ext/date-time/date')(db)
  , StringLine = require('dbjs-ext/string/string-line')(db)
  , UsDollar   = require('dbjs-ext/number/currency/us-dollar')(db)

  , defineTestProperties, TypeA, TypeB, TypeC, TypeD, PTypeA, PTypeB, PTypeAObj, PTypeC, PTypeCObj
  , user;

user = db.Object.extend('User').prototype;

TypeA = db.Object.extend('TypeA');
TypeB = TypeA.extend('TypeB');
TypeC = db.Object.extend('TypeC');
TypeD = TypeC.extend('TypeD');
PTypeA = db.String.extend('PTypeA');
PTypeAObj = db.Object.extend('PTypeAObj', {
	category: { type: PTypeA }
});
PTypeB = db.String.extend('PTypeB');
PTypeC = db.String.extend('PTypeC');
PTypeCObj = db.Object.extend('PTypeCObj', {
	marko: { type: PTypeC }
});

PTypeB.defineProperties({
	someNested: {
		nested: true,
		type: PTypeAObj
	},
	meta: {
		nested: true,
		type: db.Object
	}
});
PTypeB.meta._descriptorPrototype_.setProperties({
	type: PTypeCObj,
	nested: true
});
PTypeB.meta.get('foobar').setProperties({
	marko: 'zagalo'
});

defineTestProperties = function (obj) {
	return obj.defineProperties({
		regular: {
			type: DateType
		},
		regularValue: {
			type: db.String,
			value: 'foo'
		},
		regularComputed: {
			type: db.String,
			value: function () { return this.regularValue + 'bar'; }
		},
		statsRegular: {
			type: db.String,
			reduceBase: true
		},
		statsRegularStatsValue: {
			type: db.String,
			reduceBase: 'elo'
		},
		statsRegularValue: {
			type: db.String,
			value: 'foo',
			reduceBase: true
		},
		statsRegularValueStatsValue: {
			type: StringLine,
			value: 'bar',
			reduceBase: 'foo'
		},
		statsRegularComputed: {
			type: db.String,
			value: function () { return this.regularValue + 'lorem'; },
			reduceBase: true
		},
		statsRegularComputedStatsValue: {
			type: db.String,
			value: function () { return this.regularValue + 'ipsum'; },
			reduceBase: 'def'
		},
		multiple: {
			type: db.Number,
			multiple: true
		},
		statsMultiple: {
			type: db.Number,
			multiple: true,
			reduceBase: 'bar'
		},
		statsMultipleComputed: {
			type: db.String,
			multiple: true,
			value: function () {
				return [this.regularValue, this.regularValue + 'raz', this.statsRegular];
			},
			reduceBase: true
		},
		multipleObj: {
			type: TypeB,
			multiple: true
		},
		statsMultipleObj: {
			type: TypeD,
			multiple: true,
			reduceBase: 'foo'
		},
		statsMultipleObjComputed: {
			type: TypeD,
			multiple: true,
			reduceBase: 'foo',
			value: function () { return this.statsMultipleObj; }
		}
	});
};

defineTestProperties(TypeA.prototype);
TypeA.prototype.defineProperties({
	selfNested: {
		type: TypeA,
		nested: true
	},
	selfNested2: {
		type: TypeB,
		nested: true
	},
	openNested: {
		type: db.Object,
		nested: true
	}
});
db.Object.extend('NestedMapType');
db.Object.extend('NestedMapContainerChild', {
	nestedMap: {
		type: db.Object,
		nested: true
	}
});
db.NestedMapContainerChild.prototype.nestedMap._descriptorPrototype_.type = db.NestedMapType;
db.NestedMapContainerChild.prototype.nestedMap.define('someMapNestedObj',
	{ nested: true, reduceBase: true });

db.Object.extend('CustomNestedType');
db.Object.extend('RealNestedMapContainer');
db.Object.extend('RealNestedMap', {
	map: {
		type: db.Object,
		nested: true
	}
});
db.RealNestedMapContainer.prototype.defineProperties({
	nestedMap: { type: db.RealNestedMap, nested: true }
});
db.RealNestedMap.prototype.map._descriptorPrototype_.setProperties({
	type: db.Object,
	nested: true
});
db.RealNestedMapContainer.prototype.nestedMap.map._descriptorPrototype_.setProperties({
	type: db.CustomNestedType,
	reduceBase: true
});

TypeA.prototype.openNested.define('deepSelfNested', {
	type: TypeA,
	nested: true
});

TypeC.defineProperties({
	regularValue: {
		type: db.String,
		value: 'foo'
	},
	statsRegular: {
		type: db.String,
		reduceBase: true
	},
	multiple: {
		type: PTypeB,
		multiple: true,
		value: ['foo', 'bar']
	}
});
defineTestProperties(TypeC.prototype);
TypeC.prototype.defineProperties({
	bridgeRegularValue: {
		type: db.Number,
		value: 20
	},
	bridgeRegularComputed: {
		type: db.String,
		value: function () { return this.regularValue + this.statsRegular; }
	}
});

defineTestProperties(user);
user.defineProperties({
	nested: {
		type: db.Object,
		nested: true
	},
	nestedStatsBase: {
		type: db.Object,
		nested: true,
		reduceBase: true
	},
	nestedRich: {
		type: db.Object,
		nested: true
	},
	statsNested: {
		type: db.Object,
		nested: true
	},
	statsNestedEmpty: {
		type: db.Object,
		nested: true
	},
	statsNestedStatsBase: {
		type: db.Object,
		nested: true,
		reduceBase: true
	},
	statsNestedDeep: {
		type: db.Object,
		nested: true
	},
	nestedBridge: {
		type: TypeB,
		nested: true
	},
	nestedBridgeStats: {
		type: TypeD,
		nested: true
	}
});

defineTestProperties(user.statsNested);
defineTestProperties(user.statsNestedStatsBase);
user.statsNestedEmpty.define('emptyStats', { reduceBase: true });
user.nestedRich.defineProperties({
	regular: {
		type: db.String
	},
	regularValue: {
		type: db.String,
		value: 'foo'
	},
	regularComputed: {
		type: db.String,
		value: function () {}
	}
});
user.statsNestedDeep.defineProperties({
	statsNested: {
		type: db.Object,
		nested: true
	},
	nested: {
		type: db.Object,
		nested: true
	},
	regular: {
		type: db.String
	},
	regularValue: {
		type: db.String,
		value: 'foo'
	}
});
defineTestProperties(user.statsNestedDeep.statsNested);

user.nestedBridge.$statsRegular.required = true;
user.nestedBridgeStats.$statsRegular.required = true;

user.nestedBridgeStats.$bridgeRegularValue.reduceBase = true;
user.nestedBridgeStats.$bridgeRegularValue.type = UsDollar;

user.nestedBridgeStats.$bridgeRegularComputed.reduceBase = 'bla';

module.exports = db;
