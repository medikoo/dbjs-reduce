'use strict';

var Database   = require('dbjs')
  , db         = new Database()
  , DateType   = require('dbjs-ext/date-time/date')(db)
  , StringLine = require('dbjs-ext/string/string-line')(db)
  , UsDollar   = require('dbjs-ext/number/currency/us-dollar')(db)

  , defineTestProperties, TypeA, TypeB, TypeC, TypeD, user;

user = db.Object.extend('User').prototype;

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
			statsBase: null
		},
		statsRegularStatsValue: {
			type: db.String,
			statsBase: 'elo'
		},
		statsRegularValue: {
			type: db.String,
			value: 'foo',
			statsBase: null
		},
		statsRegularValueStatsValue: {
			type: StringLine,
			value: 'bar',
			statsBase: 'foo'
		},
		statsRegularComputed: {
			type: db.String,
			value: function () { return this.regularValue + 'lorem'; },
			statsBase: null
		},
		statsRegularComputedStatsValue: {
			type: db.String,
			value: function () { return this.regularValue + 'ipsum'; },
			statsBase: 'def'
		},
		multiple: {
			type: db.Number,
			multiple: true
		},
		statsMultiple: {
			type: db.Number,
			multiple: true,
			statsBase: 'bar'
		},
		statsMultipleComputed: {
			type: db.String,
			multiple: true,
			value: function () {
				return [this.regularValue, this.regularValue + 'raz', this.statsRegular];
			},
			statsBase: null
		}
	});
};

TypeA = db.Object.extend('TypeA');
defineTestProperties(TypeA.prototype);
TypeB = TypeA.extend('TypeB');

TypeC = db.Object.extend('TypeC');
TypeC.defineProperties({
	regularValue: {
		type: db.String,
		value: 'foo'
	},
	statsRegular: {
		type: db.String,
		statsBase: null
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
		value: function () {}
	}
});
TypeD = TypeC.extend('TypeD');

defineTestProperties(user);
user.defineProperties({
	multipleObj: {
		type: TypeB,
		multiple: true
	},
	statsMultipleObj: {
		type: TypeD,
		multiple: true,
		statsBase: 'foo'
	},
	nested: {
		type: db.Object,
		nested: true
	},
	nestedStatsBase: {
		type: db.Object,
		nested: true,
		statsBase: null
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
		statsBase: null
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
user.statsNestedEmpty.define('emptyStats', { statsBase: null });
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

user.nestedBridgeStats.$bridgeRegularValue.statsBase = null;
user.nestedBridgeStats.$bridgeRegularValue.type = UsDollar;

user.nestedBridgeStats.$bridgeRegularComputed.statsBase = false;

module.exports = db;
