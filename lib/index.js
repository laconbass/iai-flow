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
    if( ! flow.stack.length ){
      throw Error( "flow has 0 steps." )
    }

    flow.debug( "called", arguments );

    if( arguments.length < 1 ){
      throw Error( "flow must receive at least 1 argument" )
    }

    var context = this
      , callback = arguments[ arguments.length-1 ]
    ;

    assertFn( callback, "flow last argument must be a function" );
    callback = callback.bind( context )

    function next( err ){
      flow.debug( 'step %s %s.', next.position+1, !err? 'done' : 'fail' );
      if( err && !(err instanceof Error) ){
        return callback( Error('received non-error as error: '+err) );
      }
      else if( err ){
        return callback( err );
      }

      if( next.position == flow.stack.length-1 ){
        return callback.apply( context, arguments );
      }

      next.calls[ ++next.position ] = slice( arguments, 1 );
      exec();
    }

    next.position = 0;
    next.calls = [];

    next.debug = debug( name );

    next.repeat = function( ){
      flow.debug( "repeat step %s.", next.position+1 );
      return exec;
    };

    next.splits = [];
    next.split = function( ){
      if( ! (next.position in next.splits) ){
        flow.debug( "spliting callback for step %s.", next.position+1 )
        next.splits[ next.position ] = [];
      }

      next.splits[ next.position ].push( false );
      flow.debug( "splited %s time(s).", next.splits[ next.position ].length );

      var callback = this;
      return function( err ){
        flow.debug( "completed a split." );
        next.splits[ next.position ].shift()
        if( ! next.splits[ next.position ].length ){
          callback();
        }
      }
    }

    // start the flow
    next.calls[0] = slice(arguments, 0, -1);
    exec();

    function exec(){
      flow.debug( 'exec step %s of %s.', next.position+1, flow.stack.length );
      var args = slice( next.calls[next.position], 0 );
      args.push( next );
      //flow.debug( "%j", args );
      var fnProto = Function.prototype;
      process.nextTick(
        fnProto.call.bind( fnProto.apply, flow.stack[next.position], context, args )
      );
    }
  };
}, {
  /**
   * @method step: Adds a function to the flow sequence.
   *   @param fn (Function): The function to be used as step.
   */
  step: function( fn ){
    assertFn( fn, "flow#step first arg must be a function" );
    this.stack.push(fn);
    return this;
  },
  /**
   * @method stepping: Adds a serial iterator function to the flow sequence.
   *   @param fn (Function): The function to be used as iterator.
   *
   * Call stepping with `(iterable [, data1 ... dataN], callback)` and each iterator
   * call will receive `(key, value [, data1 ... dataN], callback)`.
   */
  stepping: function( fn ){
    assertFn( fn, "flow#stepping first arg must be a function" );

    var flow = this;
    this.step( serialIterator );
    return this;

    function serialIterator( iterable, data1, dataN, callback ){
      callback = arguments[ arguments.length-1 ];
      var datas = slice( arguments, 1, -1 );

      assertIterable( iterable, "flow#serialIterator first arg must be an iterable" );
      assertFn( callback, "flow#serialIterator last arg must be a function" );

      // create a sequence of functions
      var context = this
        , sequence = []
        , errors = null
        , results = Array.isArray(iterable)? [] : {}
      ;

      for( var key in iterable ) {
        var args = slice( datas, 0 );
        args = [ context, key, iterable[key] ].concat( args );

        var cb = next.bind(context, key);
        cb.debug = callback.debug;
        cb.split = callback.split;
        args.push( cb );

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
  /**
   * @method together: Adds a parallel iterator function to the flow sequence.
   *   @param fn (Function): The function to be used as iterator.
   */
  together: function( fn ){
    assertFn( fn, "flow#together first arg must be a function" );

    var flow = this;
    this.step( parallelIterator );
    return this;

    function parallelIterator( iterable, data1, dataN, callback ){
      callback = arguments[ arguments.length-1 ];
      var datas = slice( arguments, 1, -1 );

      assertIterable( iterable, "flow#together first arg must be an iterable" );
      assertFn( callback, "flow#together last arg must be a function" );

      flow.debug("iterate in parallel over %j.", iterable )

      // build a function sequence
      var context = this
        , completed = []
        , errors = null
        , results = Array.isArray(iterable)? [] : {}
      ;
      for( var key in iterable ) {
        var args = slice( datas, 0 );
        args.push( complete.bind(context, key) );
        args = [ context, key, iterable[key] ].concat( args );
        completed.push( key )
        process.nextTick( fn.bind.apply(fn, args) );
      }

      function complete( key, err, result1, resultN ){
        flow.debug( "'%s' %s.", key, err? 'fail':'done' );
        // complete this step
        completed.shift();

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

        // check if the sequence is completed
        flow.debug( "%j executions left to complete iteration.", completed.length );
        completed.length
          ? null
          : callback.call( context, errors, results )
        ;
      }
    }
  }
});

exports.version = '1';
exports.stability = 2;
