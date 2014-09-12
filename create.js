'use strict';

var value     = require('es5-ext/object/valid-value')
  , Database  = require('dbjs')
  , DbjsEvent = require('dbjs/_setup/event')
  , validDbjs = require('dbjs/valid-dbjs')
  , isGetter  = require('dbjs/_setup/utils/is-getter')

  , create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , migrateType, migrateObject, migrateProperty, migrateProperties;

migrateType = function (type, targetDatabase, propertyName) {
	var targetType = targetDatabase.objects.getById(type.__id__);
	if (targetType) return targetType;
	migrateType(getPrototypeOf(type), targetDatabase, propertyName);
	targetType = migrateObject(type, targetDatabase, propertyName);
	migrateProperties(type.prototype, targetDatabase, propertyName);
	return targetType;
};

migrateObject = function (obj, targetDatabase, propertyName) {
	var prototype, sourceEvent, targetObj;
	targetObj = targetDatabase.objects.getById(obj.__id__);
	if (targetObj) return targetObj;
	prototype = migrateObject(getPrototypeOf(obj), targetDatabase, propertyName);
	if (typeof obj !== 'function') migrateType(obj.constructor, targetDatabase, propertyName);
	if (obj.object !== obj) {
		if (typeof obj.object === 'function') migrateType(obj.object, targetDatabase, propertyName);
		else migrateObject(obj.object, targetDatabase, propertyName);
	}
	sourceEvent = obj._lastOwnEvent_;
	if ((obj.master === obj) && (obj.constructor.prototype !== obj)) {
		new DbjsEvent(targetObj = targetDatabase.objects.unserialize(obj.__id__, prototype),
			prototype, (sourceEvent && sourceEvent.stamp) || 0); //jslint: ignore
	}
	migrateProperties(obj, targetDatabase, propertyName);
	return targetObj;
};

migrateProperty = function (sourceDesc, targetDatabase, propertyName) {
	var id = sourceDesc.__id__, hasInformation = false, value, sourceEvent;
	if (targetDatabase._done_[id]) return hasInformation;
	targetDatabase._done_[id] = true;
	if (targetDatabase.objects.getById(id)) return hasInformation;
	if (migrateProperty(getPrototypeOf(sourceDesc), targetDatabase, propertyName)) {
		hasInformation = true;
	}
	if (typeof sourceDesc.object === 'function') {
		migrateType(sourceDesc.object, targetDatabase, propertyName);
	} else {
		migrateObject(sourceDesc.object, targetDatabase, propertyName);
	}
	sourceDesc._forEachOwnDescriptor_(function (subDesc) {
		var key = subDesc.key, sourceEvent, value;
		hasInformation = true;
		if (key === propertyName) return;
		if (key === 'type') migrateType(sourceDesc.type, targetDatabase, propertyName);
		sourceEvent = subDesc._lastOwnEvent_;
		value = sourceDesc[key];
		if (value instanceof sourceDesc.database.Base) {
			value = targetDatabase.objects.getById(value.__id__);
			if (!value) {
				throw new TypeError("Could not migrate object of id: ", sourceDesc[key].__id__);
			}
		}
		new DbjsEvent(targetDatabase.objects.unserialize(subDesc.__id__), value,
			(sourceEvent && sourceEvent.stamp) || 0); //jslint: ignore
	});
	value = sourceDesc._value_;
	if ((sourceDesc.master instanceof sourceDesc.database.Object) && isGetter(value)) {
		if (!sourceDesc.hasOwnProperty(propertyName)) return hasInformation;
		value = sourceDesc.statsBase;
		if (value == null) return hasInformation;
	} else if (!sourceDesc.hasOwnProperty('_value_') || (value === undefined)) {
		return hasInformation;
	}
	sourceEvent = sourceDesc._lastOwnEvent_;
	new DbjsEvent(targetDatabase.objects.unserialize(sourceDesc.__valueId__), value,
		(sourceEvent && sourceEvent.stamp) || 0); //jslint: ignore
	return true;
};

migrateProperties = function (source, targetDatabase, propertyName) {
	var isFullCopy = !(source.master instanceof source.database.Object), sKey, desc, anyDefined;

	for (sKey in source.__descriptors__) {
		desc = source.__descriptors__[sKey];
		if (desc.nested) {
			if (migrateProperties(source.get(desc.key), targetDatabase, propertyName)) {
				anyDefined = true;
				migrateProperty(desc, targetDatabase, propertyName);
			}
			if (!isFullCopy) continue;
		}
		if (desc.object !== source) continue;
		if (!isFullCopy && !desc.hasOwnProperty(propertyName)) continue;
		if (migrateProperty(desc, targetDatabase, propertyName)) anyDefined = true;
	}
	return anyDefined;
};

module.exports = function (mainDb, propertyName) {
	var statsDb;
	validDbjs(mainDb);
	propertyName = String(value(propertyName));
	statsDb = new Database();
	statsDb._done_ = create(null);
	mainDb.Object.extensions.forEach(function (Type) { migrateType(Type, statsDb, propertyName); });
	delete statsDb._done_;
	return statsDb;
};
