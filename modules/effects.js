import { throwInvariant, flatten } from './utils';

const isEffectSymbol = Symbol('isEffect');

const effectTypes = {
  BUILd: 'BUILD',
  PROMISE: 'PROMISE',
  CALL: 'CALL',
  BATCH: 'BATCH',
  CONSTANT: 'CONSTANT',
  NONE: 'NONE',
  LIFT: 'LIFT',
};


/**
* Runs an effect and returns the Promise for its completion.
* @param {Object} effect The effect to convert to a Promise.
* @param {Object} store The store entity, for the case we have to build an effect depending on store state 
* @returns {Promise} The converted effect Promise.
*/
export function effectToPromise(effect, store) {
  if(process.env.NODE_ENV === 'development') {
    throwInvariant(
      isEffect(effect),
      'Given effect is not an effect instance.'
    );
  }

  switch (effect.type) {
    case effectTypes.BUILD:
      return effectToPromise(effect.factory(store));
    case effectTypes.PROMISE:
      return effect.factory(...effect.args).then((action) => [action]);
    case effectTypes.CALL:
      return Promise.resolve([effect.factory(...effect.args)]);
    case effectTypes.BATCH:
      return Promise.all(effect.effects.map(effectToPromise)).then(flatten);
    case effectTypes.CONSTANT:
      return Promise.resolve([effect.action]);
    case effectTypes.NONE:
      return Promise.resolve([]);
    case effectTypes.LIFT:
      return effectToPromise(effect.effect).then((actions) =>
        actions.map((action) => effect.factory(...effect.args, action))
      );
  }
}

/**
 * Determines if the object was created with an effect creator.
 * @param {Object} object The object to inspect.
 * @returns {Boolean} Whether the object is an effect.
 */
export function isEffect(object) {
  return object ? object[isEffectSymbol] : false;
}

export function isNone(object) {
  return isEffect(object) && object.type === effectTypes.NONE;
}

/**
 * Creates a noop effect.
 * @returns {Object} An effect of type NONE, essentially a no-op.
 */
export function none() {
  return {
    type: effectTypes.NONE,
    [isEffectSymbol]: true
  };
}

/**
 * Creates an effect for a function that returns another effect.
 * @param {Function} factory The function to invoke with the store entity that returns a another effect.
 * @returns {Object} The wrapped effect of type BUILD.
 */
export function build(factory) {
  return {
    factory,
    type: effectTypes.BUILD,
    [isEffectSymbol]: true
  };
}

/**
 * Creates an effect for a function that returns a Promise.
 * @param {Function} factory The function to invoke with the given args that returns a Promise for an action.
 * @returns {Object} The wrapped effect of type PROMISE.
 */
export function promise(factory, ...args) {
  return {
    factory,
    args,
    type: effectTypes.PROMISE,
    [isEffectSymbol]: true
  };
}

/**
 * Creates an effect for a function that returns an action.
 * @param {Function} factory The function to invoke with the given args that returns an action.
 * @returns {Object} The wrapped effect of type CALL.
 */
export function call(factory, ...args) {
  return {
    factory,
    args,
    type: effectTypes.CALL,
    [isEffectSymbol]: true
  };
}

/**
 * Composes an array of effects together.
 */
export function batch(effects) {
  return {
    effects,
    type: effectTypes.BATCH,
    [isEffectSymbol]: true
  };
}

/**
 * Creates an effect for an already-available action.
 */
export function constant(action) {
  return {
    action,
    type: effectTypes.CONSTANT,
    [isEffectSymbol]: true
  };
}

/**
 * Transform the return type of a bunch of `Effects`. This is primarily useful for adding tags to route `Actions` to the right place
 */
export function lift(effect, factory, ...args) {
  return {
    effect,
    factory,
    args,
    type: effectTypes.LIFT,
    [isEffectSymbol]: true
  };
}
