var flow = require('..')
  , fs = require('fs')
  , assert = require('chai').assert
;

//
// assuming a constructor called MyApi...
//

function MyApi( filename ){
  this.filename = filename;

  // extra assertion for exemplify
  assert.isDefined( filename, "expecting filename to be defined" );
  assert.isString( filename, "expecting filename to be a String" );
  assert.equal( this.filename, filename, "expecting this.filename to equal filename" );
}

//
// let's define some methods for its instances
//

MyApi.prototype.open = flow( "example 1 #open" )
  .step(function( callback ){
    // extra assertion for exemplify
    assert.isFunction( callback, "expecting first argument to be a Function" );

    if( this.fd ){
      return callback( Error("already opened") );
    }
    fs.open( this.filename, 'w+', callback );
  })
  .step(function( fd, callback ){
    // extra assertion for exemplify
    assert.isFunction( callback, "expecting first argument to be a Function" );
    assert.isNumber( fd, "file descriptor should be a number" );

    this.fd = fd;
    callback.call( this, null, fd );
  })
;

MyApi.prototype.close = flow( "example 1 #close" )
  .step(function( callback ){
    // extra assertion for exemplify
    assert.isFunction( callback, "expecting first argument to be a Function" );

    if( ! this.fd ){
      return callback( Error("already closed") );
    }
    fs.close( this.fd, callback );
  })
  .step(function( callback ){
    // extra assertion for exemplify
    assert.isFunction( callback, "expecting first argument to be a Function" );

    delete this.fd;
    callback( null );
  })
;

MyApi.prototype.write = flow( "example 1 #write" )
  .step(function( data, callback ){
    // extra assertion for exemplify
    assert.isString( data, "data to be written should be a String" );
    assert.isFunction( callback, "expecting first argument to be a Function" );

    if( ! this.fd ){
      return this.open( callback.repeat() );
    }
    callback( null, data );
  })
  .step(function( data, callback ){
    // extra assertion for exemplify
    assert.isString( data, "data to be written should be a String" );
    assert.isFunction( callback, "expecting first argument to be a Function" );

    data = new Buffer(data);
    fs.write( this.fd, data, 0, data.length, null, callback );
  })
  .step(function( written, buffer, callback ){
    if( written === 0 || arguments.length < 3 ){
      return callback( Error("something went wrong.") )
    }
    this.close( callback );
  })
;

//
// --
//

module.exports = function( done ){
  var filename = __dirname + '/example-1-tmp-file';

  // being api an instance of MyApi...
  var api = new MyApi( filename );

  // let's test the write method
  api.write( "string to be written", cleanup );

  function cleanup( err ){
    if( err ){
      return done( err );
    }
    assert.equal( fs.readFileSync(filename)+"", "string to be written" );
    fs.unlink( filename, done );
  }
}
