'use strict';

var clear           = require('es5-ext/array/#/clear')
  , diff            = require('es5-ext/array/#/diff')
  , assign          = require('es5-ext/object/assign')
  , forEach         = require('es5-ext/object/for-each')
  , some            = require('es5-ext/object/some')
  , value           = require('es5-ext/object/valid-value')
  , isSet           = require('es6-set/is-set')
  , d               = require('d')
  , autoBind        = require('d/auto-bind')
  , validDbjs       = require('dbjs/valid-dbjs')
  , DbjsEvent       = require('dbjs/_setup/event')
  , validDbjsObject = require('dbjs/valid-dbjs-object')
  , serializeKey    = require('dbjs/_setup/serialize/key')

  , create = Object.create, getPrototypeOf = Object.getPrototypeOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , SyncRoot, SyncMaster, propagateComputedItem
  , resolveTargetValue, resolveTargetObject;

resolveTargetObject = function (db, objectId) {
	var object = db.objects.unserialize(objectId);
	if ((object._kind_ === 'descriptor') && object.nested) return object.object._get_(object._sKey_);
	return object;
};
resolveTargetValue = function (db, objectId, sKey) {
	return resolveTargetObject(db, objectId)._get_(sKey);
};
propagateComputedItem = function (stamp, baseId, value, key) {
	var item = this.base.db.objects.unserialize(baseId + '*' + serializeKey(key));
	if ((value === undefined) && getPrototypeOf(item)._value_) value = false;
	new DbjsEvent(item, value, stamp); //jslint: ignore
};

SyncRoot = function (db, propertyName) {
	this.db = db;
	this.map = create(null);
	this.masterMap = create(null);
	this.propertyName = propertyName;
};

Object.defineProperties(SyncRoot.prototype, {
	sync: d(function (object) {
		validDbjsObject(object);
		if (this.masterMap[object.__id__]) return;
		this.masterMap[object.__id__] = true;
		this._syncMaster(object);
	}),
	_syncMaster: d(function (object) {
		if (this.map[object.__id__]) return;
		this.map[object.__id__] = true;
		this.map[object.__id__] = new SyncMaster(object, this);
	}),
	_unsyncMaster: d(function (object) {
		if (this.masterMap[object.__id__]) return;
		if (some(this.map, function (sync) {
				if (sync === true) return;
				if (sync.object === object) return;
				if (sync.descendants[object.__id__]) return true;
			})) {
			return;
		}
		this.map[object.__id__].remove();
	})
});

SyncMaster = function (object, base) {
	this.object = object;
	this.base = base;
	this.namesToSync = create(null);
	this.observed = [];
	this.descendants = create(null);
	this.extValuesMap = create(null);
	object.on('turn', this.onTurn);
	this.onTurn(object._lastOwnEvent_);
};
Object.defineProperties(SyncMaster.prototype, assign({
	initialized: d(false),
	initialize: d(function () {
		this.initialized = true;
		this.syncProperties(this.object);
		this.object.on('update', this.onDbEvent);
	}),
	syncProperties: d(function (object) {
		var sKey, desc, observable, event;

		for (sKey in object.__descriptors__) {
			desc = object.__descriptors__[sKey];
			if (desc.reverse != null) continue;
			if (desc.nested) {
				if (object.hasOwnProperty('__objects__') && object.__objects__[desc._sKey_]) {
					this.syncProperties(object.__objects__[desc._sKey_]);
				}
				continue;
			}
			if (!desc[this.base.propertyName]) continue;

			// Export!
			if (!desc._resolveValueGetter_()) {

				// Static
				this.namesToSync[object.__id__ + '/' + sKey] = true;
				if (desc.multiple) {
					if (!object.hasOwnProperty('__multiples__')) continue;
					if (!hasOwnProperty.call(object.__multiples__, sKey)) continue;
					forEach(object.__multiples__[sKey], this.syncObjectDirectly, this);
					continue;
				}
				if (desc.object !== object) continue;
				this.syncObjectDirectly(desc);
				continue;
			}

			// Computable
			if (desc.multiple) {
				this.observed.push(observable = object._get_(sKey));
				event = object._getPropertyLastEvent_(sKey);
				this.groundComputedSet(observable, event);
				this.syncComputedSet(observable, resolveTargetValue(this.base.db, object.__id__, sKey),
					event);
				observable.on('change', this.onSetChangeEvent);
				continue;
			}
			this.observed.push(observable = object._getObservable_(sKey));
			this.syncComputedValue(observable, object._getPropertyLastEvent_(sKey));
			observable.on('change', this.onChangeEvent);
		}
	}),
	syncObjectDirectly: d(function (object) {
		var event = object._lastOwnEvent_;
		if (!event) return;
		this.syncEventDirectly(event);
	}),
	syncExternal: d(function (path, object, isMultiple, multipleValue) {
		var id, prevId;
		object = object.master;
		if (object === this.object) return;
		if (typeof object === 'function') return;
		if (object._kind_ !== 'object') return;
		if (object.constructor.prototype === object) return;
		id = object.__id__;
		if (isMultiple) {
			if (multipleValue) {
				if (!this.extValuesMap[path]) this.extValuesMap[path] = create(null);
				if (this.extValuesMap[path][id]) return;
				this.extValuesMap[path][id] = true;
				if (!this.descendants[id]) {
					this.descendants[id] = 0;
					this.base._syncMaster(object);
				}
				++this.descendants[id];
				return;
			}
			if (!this.extValuesMap[path]) return;
			if (!this.extValuesMap[path][id]) return;
			delete this.extValuesMap[path][id];
			if (!--this.descendants[id]) this.base._unsyncMaster(object);
			return;
		}
		prevId = this.extValuesMap[path];
		if (prevId && (!--this.descendants[prevId])) {
			this.base._unsyncMaster(object.database.objects.getById(prevId));
		}
		this.extValuesMap[path] = id;
		if (!this.descendants[id]) {
			this.descendants[id] = 0;
			this.base._syncMaster(object);
		}
		++this.descendants[id];
	}),
	syncEventDirectly: d(function (event) {
		var value = event.value, object = event.object, targetEvent, constructor;
		if (object._kind_ === 'descriptor') {
			if (value && value.hasOwnProperty('__id__')) {
				this.syncExternal(object.__valueId__, value);
				value = this.base.db.objects.getById(value.__id__);
			}
		} else if (object._kind_ === 'item') {
			if (object.key.hasOwnProperty('__id__')) {
				this.syncExternal(object.object.__id__ + '/' + object._pSKey_, object.key, true, value);
			}
		} else if (object._kind_ === 'object') {
			if (value && value.hasOwnProperty('__id__')) {
				value = this.base.db.objects.getById(value.__id__);
				if (value.constructor.prototype === value) constructor = value.constructor;
			}
		}
		object = this.base.db.objects.unserialize(event.object.__valueId__, constructor);
		targetEvent = object._lastOwnEvent_;
		if (targetEvent && (targetEvent.stamp >= event.stamp)) return;
		new DbjsEvent(object, value, event.stamp, event.sourceId, event.index); //jslint: ignore
	}),
	syncComputedValue: d(function (observable, event) {
		var source = observable.value
		  , targetObject = resolveTargetObject(this.base.db, observable.object.__id__)
		  , target = targetObject._get_(observable.__sKey__)
		  , stamp, targetLastEvent;
		if (source === target) return;
		if (source && source.hasOwnProperty('__id__')) this.syncExternal(observable.dbId, source);
		stamp = (event && event.stamp) || 0;
		targetLastEvent = targetObject._getOwnDescriptor_(observable.__sKey__)._lastOwnEvent_;
		if (targetLastEvent && (targetLastEvent.stamp >= stamp)) stamp = targetLastEvent.stamp + 1;
		new DbjsEvent(targetObject._getOwnDescriptor_(observable.__sKey__),
			source, stamp, event && event.sourceId); //jslint: ignore
		target = targetObject._get_(observable.__sKey__);
		if (source == null) {
			if (target == null) return;
		} else if (typeof source === typeof target) {
			return;
		}
		throw new Error("Database reduction error:\n" +
			"\tComputed value (" + observable.dbId + ") in result database after propagation didn't " +
			"match one in source\n" +
			"\tMost likely it's caused by model not being completely tagged for propagation\n" +
			"\t(type of propagated value doesn't match defined type)");
	}),
	groundComputedSet: d(function (observable, event) {
		var targetObject = resolveTargetObject(this.base.db, observable.object.__id__)
		  , stamp, targetLastEvent, desc;
		stamp = (event && event.stamp) || 0;
		desc = targetObject._getOwnDescriptor_(observable.__sKey__);
		targetLastEvent = desc._lastOwnEvent_;
		if (targetLastEvent && (targetLastEvent.stamp >= stamp)) stamp = targetLastEvent.stamp + 1;
		new DbjsEvent(desc, null, stamp, event && event.sourceId); //jslint: ignore
	}),
	syncComputedSet: d(function (source, target, event) {
		var sourceIterator, targetIterator, item, isDifferent, stamp, sourceKeys, targetKeys;

		if (source.size === target.size) {
			if (!source.size) return;
			sourceIterator = source.values();
			targetIterator = target.values();
			item = sourceIterator.next();
			while (!item.done) {
				if (item.value !== targetIterator.next().value) {
					isDifferent = true;
					break;
				}
				item = sourceIterator.next();
			}
			if (sourceIterator._destroy) sourceIterator._destroy();
			if (targetIterator._destroy) targetIterator._destroy();
			if (!isDifferent) return;
		}
		stamp = (event && event.stamp) || 0;
		forEach(target.__setData__, function (item) {
			var event = item._lastOwnEvent_;
			if (!event) return;
			if (event.stamp >= stamp) stamp = event.stamp + 1;
		});
		target.forEach(function (item) {
			var sObj;
			if (!source.has(item)) {
				if (item.hasOwnProperty('__id__')) {
					sObj = source.object.database.objects.getById(item.__id__);
					if (!sObj) {
						throw new TypeError("Could not find '" + item.__id__ + "' object in source database");
					}
					this.syncExternal(target.dbId, sObj, true, undefined);
				}
				propagateComputedItem.call(this, stamp++, target.dbId, undefined, item);
			}
		}, this);
		source.forEach(function (item) {
			if (item.hasOwnProperty('__id__')) this.syncExternal(target.dbId, item, true, true);
			propagateComputedItem.call(this, stamp++, target.dbId, true, item);
		}, this);
		if (source.size !== target.size) {
			sourceKeys = [];
			targetKeys = [];
			source.forEach(function (item) { sourceKeys.push(serializeKey(item)); });
			target.forEach(function (item) { targetKeys.push(serializeKey(item)); });
			throw new Error("Database reduction error:\n" +
				"\tComputed set (" + source.dbId + ") of size \"" + target.size +
				"\" in result database after propagation didn't match one in source (size: \"" +
				source.size + "\"\n" +
				"\tKeys not found in target: " + diff.call(sourceKeys, targetKeys) + "\n" +
				"\tMost likely it's caused by model not being completely tagged for propagation\n" +
				"\t(type of propagated set values doesn't match defined type)");
		}
	}),
	destroy: d(function () {
		this.object.off('update', this.onDbEvent);
		this.observed.forEach(function (observable) {
			observable.off('change', isSet(observable) ? this.onSetChangeEvent : this.onChangeEvent);
		}, this);
		clear.call(this.observed);
		this.initialized = false;
	}),
	remove: d(function () {
		this.destroy();
		delete this.base.map[this.object.__id__];
		delete this.base.masterMap[this.object.__id__];
		this.object.off('turn', this.onTurn);
	})
}, autoBind({
	onTurn: d(function (event) {
		this.syncEventDirectly(event);
		if (this.object.constructor.__id__ === 'Base') {
			if (!this.initialized) return;
			this.destroy();
			return;
		}
		if (this.initialized) return;
		this.initialize();
	}),
	onDbEvent: d(function (event) {
		var object = event.object;
		switch (object._kind_) {
		case 'descriptor':
			if (!this.namesToSync[object.__valueId__]) return;
			break;
		case 'item':
			if (!this.namesToSync[object.object.__id__ + '/' + object._pSKey_]) return;
			break;
		case 'object':
			return;
		case 'sub-descriptor':
			return;
		}
		this.syncEventDirectly(event);
	}),
	onChangeEvent: d(function (event) { this.syncComputedValue(event.target, event.dbjs); }),
	onSetChangeEvent: d(function (event) {
		this.syncComputedSet(event.target, resolveTargetValue(this.base.db,
			event.target.object.__id__, event.target.__sKey__), event.dbjs);
	})
})));

module.exports = function (targetDb, propertyName) {
	var sync = new SyncRoot(validDbjs(targetDb), value(propertyName));
	return sync.sync.bind(sync);
};
