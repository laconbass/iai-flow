var flow = require('..')
  , fs = require('fs')
  , assert = require('chai').assert
;

//
// assuming a constructor called MySchema...
//

function MySchema( ){}

MySchema.prototype.validate = flow( "example2 MySchema#validate" )
  .step(function(data, next){
    if ( !this.fields ){
      return next( Error("WTF?") );
    }
    next(null, this.fields, data);
  })
  .stepping(function (fieldName, field, data, next) {
    field.validate(data[fieldName], next);
  })
;

//
// and another called MyField...
//

function MyField( validator ){
  this.validator = validator;

  // extra assertion for exemplify
  assert.isDefined( validator, "expecting validator to be defined" );
  assert.isFunction( validator, "expecting validator to be a Function" );
  assert.deepEqual( this.validator, validator, "expecting this.validator to equal validator" );
}

MyField.prototype.validate = function( data, callback ){
  try {
    this.validator( data );
    callback( null, data );
  } catch( err ){
    callback( err );
  }
};


//
// --
//

module.exports = function( done ){
  // being api an instance of MyApi...
  var api = new MySchema(  );

  // let's define its "fields"
  api.fields = {
    id: new MyField( assert.isString ),
    something: new MyField( assert.isString ),
    somefunction: new MyField( assert.isFunction ),
    somearray: new MyField( assert.isArray )
  };

  // let's test MySchema#validate method failing
  api.validate( {
    something: "literal string"
  } , check1 );

  function check1( err, results ){
    if( ! err ){
      return done( Error("expecting an error") );
    } else if( ! err.length ){
      return done( err );
    }
    assert.equal( err.length, 3 );
    assert.instanceOf( err.id, Error, "err.id should exist" );
    assert.equal( err.id.message, "expected undefined to be a string" );
    assert.instanceOf( err.somefunction, Error, "err.somefunction should exist" );
    assert.equal( err.somefunction.message, "expected undefined to be a function" );
    assert.instanceOf( err.somearray, Error, "err.somearray should exist" );
    assert.equal( err.somearray.message, "expected undefined to be an array" );

    // test 2
    api.validate( input2 , check2 );
  }

  // let's test MySchema#validate method passing
  var input2 = {
    id: "some string",
    something: "literal string",
    somefunction: function(){},
    somearray: []
  };

  function check2( err, results ){
    if( err ){
      return done( err );
    }
    assert.deepEqual( results, input2 );
    done();
  }
}
