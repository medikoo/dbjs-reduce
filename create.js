'use strict';

var forEach   = require('es5-ext/object/for-each')
  , value     = require('es5-ext/object/valid-value')
  , Database  = require('dbjs')
  , DbjsEvent = require('dbjs/_setup/event')
  , validDbjs = require('dbjs/valid-dbjs')
  , isGetter  = require('dbjs/_setup/utils/is-getter')

  , create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , bareDatabase = new Database()
  , migrateType, migrateObject, migrateProperty, migrateProperties;

var createType = function (type, targetDatabase) {
	var targetType = targetDatabase.objects.getById(type.__id__);
	if (targetType) return targetType;
	return createType(getPrototypeOf(type), targetDatabase)._extend_(type.__id__);
};

migrateType = function (type, targetDatabase, propertyName) {
	var id = type.__id__, targetType;
	if (targetDatabase._done_['@' + id]) return targetDatabase.objects.getById(id);
	targetDatabase._done_['@' + id] = true;
	if (bareDatabase.objects.getById(id)) return targetDatabase.objects.getById(id);
	createType(type, targetDatabase);
	migrateType(getPrototypeOf(type), targetDatabase, propertyName);
	targetType = migrateObject(type, targetDatabase, propertyName, true);
	migrateProperties(type.prototype, targetDatabase, propertyName);
	return targetType;
};

migrateObject = function (obj, targetDatabase, propertyName) {
	var id = obj.__id__, prototype, sourceEvent, targetObj;
	if (targetDatabase._done_[id]) return targetDatabase.objects.getById(id);
	targetDatabase._done_[id] = true;
	if (bareDatabase.objects.getById(id)) return targetDatabase.objects.getById(id);
	prototype = migrateObject(getPrototypeOf(obj), targetDatabase, propertyName);
	if (typeof obj !== 'function') migrateType(obj.constructor, targetDatabase, propertyName);
	if (obj.object !== obj) {
		if (typeof obj.object === 'function') migrateType(obj.object, targetDatabase, propertyName);
		else migrateObject(obj.object, targetDatabase, propertyName);
	}
	sourceEvent = obj._lastOwnEvent_;
	if ((obj.master === obj) && (obj.constructor.prototype !== obj)) {
		new DbjsEvent(targetObj = targetDatabase.objects.unserialize(obj.__id__, prototype),
			prototype, (sourceEvent && sourceEvent.stamp) || 0,
			sourceEvent && sourceEvent.sourceId, sourceEvent && sourceEvent.stamp); //jslint: ignore
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
				throw new TypeError("Could not migrate object of id: " + sourceDesc[key].__id__);
			}
		}
		new DbjsEvent(targetDatabase.objects.unserialize(subDesc.__id__), value,
			(sourceEvent && sourceEvent.stamp) || 0,
			sourceEvent && sourceEvent.sourceId, sourceEvent && sourceEvent.stamp); //jslint: ignore
	});
	if (sourceDesc._reverse_ || sourceDesc.nested || !sourceDesc._sKey_) return hasInformation;
	value = sourceDesc._resolveValueValue_();
	if (isGetter(value)) {
		if (sourceDesc.master instanceof sourceDesc.database.Object) {
			if (!sourceDesc[propertyName]) return hasInformation;
			value = sourceDesc.object._get_(sourceDesc._sKey_);
			if (sourceDesc.multiple) return hasInformation;
			sourceEvent = sourceDesc._lastOwnEvent_;
			new DbjsEvent(targetDatabase.objects.unserialize(sourceDesc.__valueId__), value,
				(sourceEvent && sourceEvent.stamp) || 0,
				sourceEvent && sourceEvent.sourceId, sourceEvent && sourceEvent.stamp); //jslint: ignore
			return true;
		}
	} else if (sourceDesc.multiple) {
		if (!sourceDesc.object.hasOwnProperty('__multiples__')) return hasInformation;
		if (!hasOwnProperty.call(sourceDesc.object.__multiples__, sourceDesc._sKey_)) {
			return hasInformation;
		}
		forEach(sourceDesc.object.__multiples__[sourceDesc._sKey_], function (item) {
			var sourceEvent;
			if (!item.hasOwnProperty('_value_')) return;
			if (item._value_ === undefined) return;
			hasInformation = true;
			sourceEvent = item._lastOwnEvent_;
			new DbjsEvent(targetDatabase.objects.unserialize(item.__id__), item._value_,
				(sourceEvent && sourceEvent.stamp) || 0,
				sourceEvent && sourceEvent.sourceId, sourceEvent && sourceEvent.stamp); //jslint: ignore
		}, this);
		return hasInformation;
	}
	if (!sourceDesc.hasOwnProperty('_value_') || (value === undefined)) return hasInformation;
	sourceEvent = sourceDesc._lastOwnEvent_;
	new DbjsEvent(targetDatabase.objects.unserialize(sourceDesc.__valueId__), value,
		(sourceEvent && sourceEvent.stamp) || 0,
		sourceEvent && sourceEvent.sourceId, sourceEvent && sourceEvent.stamp); //jslint: ignore
	return true;
};

migrateProperties = function (source, targetDatabase, propertyName, realSource) {
	var sKey, desc, anyDefined, any, hasMigrated, isFullCopy;
	if (!realSource) realSource = source;
	isFullCopy = !(realSource.master instanceof source.database.Object);
	desc = source.__descriptorPrototype__;
	if (desc.nested) {
		if (source.hasOwnProperty('__objects__')) {
			forEach(source.__objects__, function (obj) {
				any = true;
				if (migrateProperties(obj, targetDatabase, propertyName)) anyDefined = true;
			});
		}
		if (!any && migrateProperties(desc.type.prototype, targetDatabase, propertyName, realSource)) {
			anyDefined = true;
		}
		if (anyDefined || desc[propertyName]) {
			migrateProperty(desc, targetDatabase, propertyName);
			anyDefined = true;
		}
	}
	for (sKey in source.__descriptors__) {
		desc = source.__descriptors__[sKey];
		if (desc.nested) {
			hasMigrated = false;
			if (source.hasOwnProperty('__objects__') && source.__objects__[desc._sKey_]) {
				hasMigrated = migrateProperties(source.__objects__[desc._sKey_],
					targetDatabase, propertyName);
			} else if ((source.master !== desc.type.prototype) &&
					!desc.type.prototype.isPrototypeOf(source.master)) {
				hasMigrated = migrateProperties(desc.type.prototype, targetDatabase,
					propertyName, realSource);
			}
			if (hasMigrated || desc[propertyName]) {
				anyDefined = true;
				migrateProperty(desc, targetDatabase, propertyName);
			}
			if (!isFullCopy) continue;
		}
		if (!isFullCopy) {
			if (desc.object !== realSource) continue;
			if (!desc[propertyName]) continue;
		}
		if (migrateProperty(desc, targetDatabase, propertyName)) anyDefined = true;
	}
	return anyDefined;
};

module.exports = function (mainDb, propertyName) {
	var reducedDb;
	validDbjs(mainDb);
	propertyName = String(value(propertyName));
	reducedDb = new Database();
	reducedDb._done_ = create(null);
	mainDb.Object.extensions.forEach(function (Type) { migrateType(Type, reducedDb, propertyName); });
	delete reducedDb._done_;
	return reducedDb;
};
