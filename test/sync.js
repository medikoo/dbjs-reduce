'use strict';

var aFrom    = require('es5-ext/array/from')
  , source   = require('./__playground/create')
  , createDb = require('../create');

module.exports = function (t, a) {
	var target = createDb(source, 'statsBase'), User = source.User
	  , sUserA, tUserA, dObj1, dObj2, dObj3, handler, toPlainEvent, setProps, testProps, stamp;

	toPlainEvent = function (event, value, id) {
		if (!value) value = event.value;
		if (value && value.hasOwnProperty('__id__')) value = value.__id__;
		return {
			object: id || event.object.__id__,
			value: value,
			stamp: event.stamp
		};
	};

	dObj1 = new source.TypeD();
	dObj2 = new source.TypeD();
	dObj3 = new source.TypeD();

	setProps = function (obj) {
		obj.setProperties({
			regular: new Date(2012, 9, 20),
			regularValue: 'marko',
			statsRegular: 'mienio',
			statsRegularValueStatsValue: 'miszka',
			multiple: [3, 2, 1],
			statsMultiple: [1, 3, 5],
			multipleObj: [new source.TypeB(), new source.TypeB()],
			statsMultipleObj: [dObj1, dObj2]
		});
	};
	sUserA = new User();
	setProps(sUserA);
	sUserA.nested.set('foo', 'bar');
	setProps(sUserA.statsNested);
	setProps(sUserA.nestedBridgeStats);
	sUserA.nestedBridgeStats.statsRegularValue = 'elo';
	sUserA.nestedBridgeStats.bridgeRegularValue = 40;

	setProps(dObj1);
	handler = t(target, 'statsBase');
	handler(sUserA);

	testProps = function (tObj, sObj) {
		a(tObj.regular, undefined);
		a(tObj.regularValue, undefined);
		a(tObj.statsRegularValueStatsValue, 'miszka');
		a.deep(toPlainEvent(tObj.$statsRegularValueStatsValue._lastOwnEvent_),
			toPlainEvent(sObj.$statsRegularValueStatsValue._lastOwnEvent_));

		a(tObj.statsRegularComputed, 'markolorem');
		a.deep(toPlainEvent(tObj.$statsRegularComputed._lastOwnEvent_),
			toPlainEvent(sObj._getPropertyLastEvent_('statsRegularComputed'), 'markolorem',
				sObj.$statsRegularComputed.__id__));

		a(tObj.multiple, undefined);
		a.deep(aFrom(tObj.statsMultiple), [1, 3, 5]);
		a.deep(toPlainEvent(tObj.statsMultiple.$get(1)._lastOwnEvent_),
			toPlainEvent(sObj.statsMultiple.$get(1)._lastOwnEvent_));
		a.deep(toPlainEvent(tObj.statsMultiple.$get(3)._lastOwnEvent_),
			toPlainEvent(sObj.statsMultiple.$get(3)._lastOwnEvent_));
		a.deep(toPlainEvent(tObj.statsMultiple.$get(5)._lastOwnEvent_),
			toPlainEvent(sObj.statsMultiple.$get(5)._lastOwnEvent_));

		a.deep(aFrom(tObj.statsMultipleComputed), ['marko', 'markoraz', 'mienio']);
		a.deep(toPlainEvent(tObj.statsMultipleComputed.$get('marko')._lastOwnEvent_), {
			object: tObj.statsMultipleComputed.$get('marko').__id__,
			stamp: sObj.$statsRegular._lastOwnEvent_.stamp,
			value: true
		});
		a.deep(toPlainEvent(tObj.statsMultipleComputed.$get('markoraz')._lastOwnEvent_), {
			object: tObj.statsMultipleComputed.$get('markoraz').__id__,
			stamp: sObj.$statsRegular._lastOwnEvent_.stamp + 1,
			value: true
		});
		a.deep(toPlainEvent(tObj.statsMultipleComputed.$get('mienio')._lastOwnEvent_), {
			object: tObj.statsMultipleComputed.$get('mienio').__id__,
			stamp: sObj.$statsRegular._lastOwnEvent_.stamp + 2,
			value: true
		});
	};

	tUserA = target.User.getById(sUserA.__id__);
	a.deep(toPlainEvent(tUserA._lastOwnEvent_), toPlainEvent(sUserA._lastOwnEvent_));

	a.h1("Self");
	testProps(tUserA, sUserA);

	a.h1("Nested");
	a(tUserA.nested, undefined);
	testProps(tUserA.statsNested, sUserA.statsNested);

	a.h1("Related");
	a(target.objects.getById(dObj3.__id__), null);
	testProps(target.objects.getById(dObj1.__id__), dObj1);

	a.h1("Bridge");
	a(tUserA.nestedBridge, undefined);
	a(tUserA.nestedBridgeStats.statsRegularValue, 'foo');
	a(tUserA.nestedBridgeStats.bridgeRegularValue, 40);
	a(tUserA.nestedBridgeStats.bridgeRegularComputed, 'markomienio');

	a.h1("Computed changes");
	sUserA.regularValue = 'ilo';
	a(tUserA.statsRegularComputed, 'ilolorem');
	a.deep(toPlainEvent(tUserA.$statsRegularComputed._lastOwnEvent_),
		toPlainEvent(sUserA._getPropertyLastEvent_('statsRegularComputed'), 'ilolorem',
			sUserA.$statsRegularComputed.__id__));
	a.deep(aFrom(tUserA.statsMultipleComputed), ['ilo', 'iloraz', 'mienio']);
	stamp = sUserA._getPropertyLastEvent_('statsRegularComputed').stamp;

	a.deep(toPlainEvent(tUserA.statsMultipleComputed.$get('marko')._lastOwnEvent_), {
		object: tUserA.statsMultipleComputed.$get('marko').__id__,
		stamp: stamp++,
		value: undefined
	});
	a.deep(toPlainEvent(tUserA.statsMultipleComputed.$get('markoraz')._lastOwnEvent_), {
		object: tUserA.statsMultipleComputed.$get('markoraz').__id__,
		stamp: stamp++,
		value: undefined
	});
	a.deep(toPlainEvent(tUserA.statsMultipleComputed.$get('ilo')._lastOwnEvent_), {
		object: tUserA.statsMultipleComputed.$get('ilo').__id__,
		stamp: stamp++,
		value: true
	});
	a.deep(toPlainEvent(tUserA.statsMultipleComputed.$get('iloraz')._lastOwnEvent_), {
		object: tUserA.statsMultipleComputed.$get('iloraz').__id__,
		stamp: stamp++,
		value: true
	});
	a.deep(toPlainEvent(tUserA.statsMultipleComputed.$get('mienio')._lastOwnEvent_), {
		object: tUserA.statsMultipleComputed.$get('mienio').__id__,
		stamp: stamp++,
		value: true
	});
};
