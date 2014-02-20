/**
 * @dependencies
 */

var oop = require('iai-oop')
  , debug = require('debug')
  //, is = require('iai-is')
  , slice = Function.prototype.call.bind( Array.prototype.slice )
;

function assertFn( o, message ){
  if( 'function' !== typeof o ){
    throw TypeError( message );
  }
};

function assertIterable( o, message ){
  if( ! Array.isArray(o) && Object.prototype.toString.call(o) !== "[object Object]" ){
    throw TypeError( message );
  }
}


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
 */

var exports = module.exports = oop.callable(function( name ){

  flow.debug = debug( "iai-flow:" + name );
  flow.stack = [];

  flow.debug( "flow created" );
  return flow;

  function flow( ){
    flow.debug( "called", arguments );

    if( arguments.length < 1 ){
      throw Error( "flow must receive at least 1 argument" )
    }

    var context = this
      , callback = arguments[ arguments.length-1 ]
      , position = 0
      , calls = []
    ;

    assertFn( callback, "flow last argument must be a function" );
    callback = callback.bind( context )

    var next = function next( err ){
      flow.debug( 'step %s %s.', position+1, !err? 'done' : 'fail' );
      if( err ){
        return callback( err )
      }

      if( position == flow.stack.length-1 ){
        return callback.apply( context, arguments );
      }

      calls[ ++position ] = slice( arguments, 1 )
      exec()
    };

    next.repeat = function( ){
      flow.debug( "repeat step %s.", position+1 );
      return exec;
    };

    // start the flow
    calls[0] = slice(arguments, 0, -1);
    exec();

    function exec(){
      flow.debug( 'exec step %s of %s.', position+1, flow.stack.length );
      var args = slice( calls[position], 0 );
      args.push( next );
      flow.debug( "%j", args );
      var a = Function.prototype.call.bind(Function.prototype.apply, flow.stack[position], context, args);
      process.nextTick( a );
    }
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
  /**
   * @method stepping: Adds a serial iterator function to the flow sequence.
   *   @param fn (Function): The function to be used as iterator.
   */
  stepping: function( fn ){
    assertFn( fn, "first arg must be a function" );

    var flow = this;
    this.step( serialIterator );
    return this;

    function serialIterator( iterable, data1, dataN, callback ){
      callback = arguments[ arguments.length-1 ];
      var datas = slice( arguments, 1, -1 );

      assertIterable( iterable, "first arg must be an iterable" );
      assertFn( callback, "last arg must be a function" );

      // create a sequence of functions
      var context = this
        , sequence = []
        , errors = null
        , results = Array.isArray(iterable)? [] : {}
      ;
      for( var key in iterable ) {
        var args = slice( datas, 0 );
        args.push( next.bind(context, key) );
        args = [ context, key, iterable[key] ].concat( args );
        sequence.push( fn.bind.apply(fn, args) );
      }
      // start the sequence
      flow.debug("iterate serially over %j items.", sequence.length )
      process.nextTick( sequence[0] );

      function next( key, err, result1, resultN ){
        flow.debug( "'%s' %s.", key, err? 'fail':'done' );
        // remove completed step
        sequence.shift();

        // create error list if need
        if( err && !errors ){
          errors = Error("There are some errors");
          errors.length = 0;
        }

        // store error if exists
        if( err ){
          // non-errors aren't accepted
          if( ! (err instanceof Error) ){
            throw TypeError("received non-error as error: "+err);
          }
          flow.debug( "'%s' error: %j", key, err.message );
          errors[ key ] = err;
          errors.length++;
        } else {
          // store results
          results[ key ] = slice( arguments, 2 );
          if( results[key].length === 1 ){
            results[key] = results[key][0];
          }
          flow.debug( "'%s' results", key, results[key] );
        }

        // continue or complete
        flow.debug( "%j executions left to complete iteration.", sequence.length );
        sequence.length
          ? process.nextTick( sequence[0] )
          : callback.call( context, errors, results )
        ;
      }
    }
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
