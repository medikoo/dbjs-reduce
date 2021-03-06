'use strict';

var aFrom    = require('es5-ext/array/from')
  , Database = require('dbjs')
  , source   = require('./__playground/create');

module.exports = function (t, a) {
	var target = t(source, 'reduceBase'), targetUser = target.User.prototype, desc, testObject;

	t(new Database(), 'test'); // test empty database

	testObject = function (obj) {
		var desc;
		a.h3("Not imported");
		a.not(obj.$get('regular').object, obj);
		a.not(obj.$get('regularValue').object.__id__, obj.__id__, "Value");
		a.not(obj.$get('regularComputed').object, obj, "Computed");
		a.not(obj.$get('multiple').object, obj, "Computed");

		a.h3("Imported");
		a.h4("Regular");
		desc = obj.$get('statsRegular');
		a(desc.object.__id__, obj.__id__, "Owner");
		a(desc._value_, undefined, "Value");
		a.deep(desc, { type: target.String }, "Data");

		a.h4("Regular Stats Value");
		desc = obj.$get('statsRegularStatsValue');
		a(desc.object, obj, "Owner");
		a(desc._value_, undefined, "Value");
		a.deep(desc, { type: target.String }, "Data");

		a.h4("Regular Value");
		desc = obj.$get('statsRegularValue');
		a(desc.object, obj, "Owner");
		a(desc.hasOwnProperty('_value_') && desc._value_, 'foo', "Value");
		a.deep(desc, { type: target.String }, "Data");

		a.h4("Regular Value StatsValue");
		desc = obj.$get('statsRegularValueStatsValue');
		a(desc.object, obj, "Owner");
		a(desc.hasOwnProperty('_value_') && desc._value_, 'bar', "Value");
		a.deep(desc, { type: target.StringLine }, "Data");

		a.h4("Regular Computed");
		desc = obj.$get('statsRegularComputed');
		a(desc.object, obj, "Owner");
		a(desc._value_, 'foolorem', "Value");
		a.deep(desc, { type: target.String }, "Data");

		a.h4("Regular Computed Stats Value");
		desc = obj.$get('statsRegularComputedStatsValue');
		a(desc.object, obj, "Owner");
		a(desc.hasOwnProperty('_value_') && desc._value_, 'fooipsum', "Value");
		a.deep(desc, { type: target.String }, "Data");

		a.h4("Multiple");
		desc = obj.$get('statsMultiple');
		a(desc.object, obj, "Owner");
		a(desc.hasOwnProperty('_value_') && desc._value_, undefined, "Value");
		a.deep(desc, { type: target.Number, multiple: true }, "Data");

		a.h4("Multiple computed");
		desc = obj.$get('statsMultipleComputed');
		a(desc.object, obj, "Owner");
		a(desc.hasOwnProperty('_value_') && desc._value_, undefined, "Desc Value");
		a.deep(desc, { type: target.String, multiple: true }, "Data");
		a.deep(aFrom(obj.statsMultipleComputed), [], "Value");
	};

	a.h1("Direct properties");
	testObject(targetUser);

	a.h1("Multiple properties");
	a.h2("Not Imported");
	a.not(targetUser.$get('multipleObj').object, targetUser);

	a.h2("Imported");
	desc = targetUser.$get('statsMultipleObj');
	a(desc.object.__id__, targetUser.__id__, "Owner");
	a(desc._value_, undefined, "Value");
	a.deep(desc, { type: target.TypeD, multiple: true }, "Data");

	a.h1("Nested properties");
	a.h2("Not Imported");
	a.not(targetUser.$get('nested').object, targetUser);
	a.not(targetUser.$get('nestedRich').object, targetUser, "Rich");

	a.h2("Imported");
	a(targetUser.nestedStatsBase instanceof target.Object, true, "Marked");
	a(targetUser.statsNestedEmpty instanceof target.Object, true, "Nested empty");
	testObject(targetUser.statsNested);
	testObject(targetUser.statsNestedStatsBase);

	a.h1("Nested deep properties");
	a.h2("Not Imported");
	a.not(targetUser.statsNestedDeep.$get('nested').object, targetUser.statsNestedDeep, "Nested");
	a.not(targetUser.statsNestedDeep.$get('regular').object, targetUser.statsNestedDeep, "Regular");
	a.not(targetUser.statsNestedDeep.$get('regularValue').object, targetUser.statsNestedDeep,
		"Regular value");

	a.h2("Imported");
	testObject(targetUser.statsNestedDeep.statsNested);

	a.h1("Nested bridge");
	a.h2("Not Imported");
	a(targetUser.nestedBridge instanceof target.TypeB, true, "Type with stats base");
	a(targetUser.nestedBridgeStats.getDescriptor('statsRegular').required,
		true, "Parent");

	a.h2("Imported");
	desc = targetUser.nestedBridgeStats.$get('bridgeRegularValue');
	a(desc.object, targetUser.nestedBridgeStats, "Owner");
	a(!desc.hasOwnProperty('_value_') || desc._value_ === undefined, true, "Value");
	a.deep(desc, { type: target.UsDollar }, "Data");

	a.h3("Computed deep");
	desc = targetUser.nestedBridgeStats.$get('bridgeRegularComputed');
	a(desc.object, targetUser.nestedBridgeStats, "Owner");
	a(desc._value_, 'fooundefined', "Value");
	a.deep(desc, {}, "Data");

	a.h1("Types");
	a.h2("Not Imported");
	a(target.Date, undefined, "Date");

	a.h2("Imported");
	a(target.StringLine.__id__, 'StringLine', "StringLine");
	a(target.Currency.__id__, 'Currency', "Interim type");
	a(target.UsDollar.__id__, 'UsDollar', "Parent type");
	a(target.TypeD.__id__, 'TypeD', "TypeD");
	a(target.PTypeA.__id__, 'PTypeA', "PTypeA");
	a(target.PTypeCObj.__id__, 'PTypeCObj', "PTypeCObj");
	a(target.PTypeC.__id__, 'PTypeC', "PTypeC");
	a(target.PTypeB.meta.foobar.marko, 'zagalo');

	a.h2("Constructor properties");
	desc = target.TypeC.$get('regularValue');
	a(desc.object.__id__, target.TypeC.__id__, "Owner");
	a(desc._value_, 'foo', "Value");
	a.deep(desc, { type: target.String }, "Data");

	desc = target.TypeC.$get('statsRegular');
	a(desc.object, target.TypeC, "Owner");
	a(desc._value_, undefined, "Value");
	a.deep(desc, { type: target.String }, "Data");

	a.h3("Multiple");
	desc = target.TypeC.$get('multiple');
	a(desc.object.__id__, target.TypeC.__id__, "Owner");
	a.deep(desc, { type: target.PTypeB, multiple: true }, "Data");
	a.deep(aFrom(target.TypeC.multiple), ['foo', 'bar'], "Value");

	a.h2("Prototype properties");
	testObject(target.TypeC.prototype);
	a.h3("Demanded by extension");
	desc = target.TypeC.prototype.$get('bridgeRegularValue');
	a(desc.object, target.TypeC.prototype, "Owner");
	a(desc._value_, 20, "Value");
	a.deep(desc, { type: target.Number }, "Data");

	desc = target.TypeC.prototype.$get('bridgeRegularComputed');
	a(desc.object, target.TypeC.prototype, "Owner");
	a(desc._value_, undefined, "Value");
	a.deep(desc, { type: target.String }, "Data");

	a.h1("Nested map");
	a(target.NestedMapContainerChild.prototype.nestedMap.someMapNestedObj.constructor.__id__,
		target.NestedMapType.__id__);

	a(target.RealNestedMapContainer.prototype.nestedMap.map.get('whatever').constructor.__id__,
		target.CustomNestedType.__id__);
};
