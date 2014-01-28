/**
 * @dependencies
 */

var oop = require('iai-oop')
  //, is = require('iai-is')
;

function assertFn( o, message ){
  if( 'function' !== typeof o ){
    throw TypeError( message );
  }
};


/**
 * @function flow: Creates an async flow control helper (aka flow sequence).
 *
 * Returns a function that begins the flow sequence once called. This
 * function has an api to define the steps on the flow sequence.
 *
 * A flow sequence is a chain that flows down through multiple asynchronous
 * operations once it begins.
 *
 * The context is preserved for the entire chain, being the context of the
 * flow when called.
 *
 * Arguments are strong typed. If the next step on the chain expects more or
 * less arguments, an error will be thrown.
 *
 * Each function (aka step) on the sequence has the hability to stop the flow,
 * passing an error as the first argument to its callback.
 *
 * Each step on the sequence receives argument 2 and onwards passed to the previous
 * callback call, or the arguments passed to the flow on the case of the 1st
 * step.
 */

var exports = module.exports = oop.callable(function(){
  var stack = flow.stack = [];
  return flow;
  function flow(){
  };
}, {
  /**
   * @method step: Adds a function to the flow sequence.
   *   @param fn (Function): The function to be used as step.
   */
  step: function( fn ){
    assertFn( fn, "first arg must be a function" );
    this.stack.push(fn);
    return this;
  },
  stepping: function( fn ){
    assertFn( fn, "first arg must be a function" );
    this.step( function serialIterator(){} );
    return this;
  },
  together: function( fn ){
    assertFn( fn, "first arg must be a function" );
    this.step( function parallelIterator(){} );
    return this;
  }
});

exports.version = '1';
exports.stability = 2;

function sequence(iterable, step, complete, context) {
  if( !isFn(step) || !isFn(complete) ){
    throw TypeError("please provide step and complete callbacks as functions");
  }
  var sequence = [], context = context || null;

  // push steps on sequence
  for( var key in iterable ) {
    sequence.push( step.bind( context, key, iterable[key], next) );
  }
  // start sequence
  process.nextTick( sequence[0] );

  // "next" function for steps
  function next(err){
    // remove completed step
    sequence.shift();
    // force complete if error
    if( err && err instanceof Error ){
      sequence.length = 0;
    } else if( err ){
      err = TypeError("sequence#next received non-error as error: "+err);
    }
    // continue or complete
    sequence.length? sequence[0]() : complete.call( context, err || null );
  }
};
