var assert = require( 'chai' ).assert
  , flow = require( '..' )
;

describe( 'the flow module', function(){
  it('should export a function', function(){
    assert.isFunction( flow );
  });
})

describe('flow api', function(){
  var subject;

  beforeEach(function(){
    subject = flow( 'testing flow return value' );
  })

  it('should be functions', function(){
    assert.isFunction( subject );
  });

  describe('#stack', function(){
    it('should be an array', function(){
      assert.isArray( subject.stack );
    })
  })

  describe('#step', function(){
    it('should be a function', function(){
      assert.isFunction( subject.step );
    })
    it('should throw TypeError if first arg is not a function', function(){
      assert.throws(function(){
        subject.step();
      }, TypeError, /first arg must be a function/)
    })
    it('should return the flow instance', function(){
      assert.deepEqual( subject.step(function(){}), subject );
    })
    it('should push the given function on the stack', function(){
      function foo(){}
      subject.step( foo );
      assert.equal( subject.stack.length, 1, "stack length should equal 1" );
      assert.deepEqual( subject.stack[0], foo, "function does not match" );
    })
  });

  describe('#stepping', function(){
    it('should be a function', function(){
      assert.isFunction( subject.stepping );
    })
    it('should throw a TypeError if first arg is not a function', function(){
      assert.throws(function(){
        subject.stepping();
      }, TypeError, /first arg must be a function/i)
    })
    it('should return the flow instance', function(){
      assert.deepEqual( subject.stepping(function(){}), subject );
    })
    it('should push a new function on the stack', function(){
      subject.stepping(function foo(){});
      assert.equal( subject.stack.length, 1, "stack length should equal 1" );
      assert.isFunction( subject.stack[0], "stack[0] should be a function")
    })
  })

  describe('#together', function(){
    it('should be a function', function(){
      assert.isFunction( subject.together );
    })
    it('should throw a TypeError if first arg is not a function', function(){
      assert.throws(function(){
        subject.together();
      }, TypeError, /first arg must be a function/i)
    })
    it('should return the flow instance', function(){
      assert.deepEqual( subject.together(function(){}), subject );
    })
    it('should push a new function on the stack', function(){
      subject.together(function foo(){});
      assert.equal( subject.stack.length, 1, "stack length should equal 1" );
      assert.isFunction( subject.stack[0], "stack[0] should be a function")
    })
  })
});

// api examples

var resolve = require('path').resolve
  , fs = require('fs')
  , exampledir = resolve( process.cwd(), 'example' )
;

describe( "api examples", function(){
  console.log( fs.readdirSync( exampledir ) )
  fs.readdirSync( exampledir ).forEach(function( filename ){
    it( "example " + filename, function( done ){
      var example = require( resolve( exampledir, filename ) );
      assert.isFunction( example, "example should export a function" );
      assert.equal( example.length, 1, "example function should expect 1 argument" );
      example( done );
    });
  })
})
