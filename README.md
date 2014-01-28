# The async code flow

## Introduction

Writing asynchronous code logic means writing callbacks, and APIs that
expect callbacks to be passed as arguments. 

Often asynchronous operations are combined into APIs, producing
reusable async code flows. There are two common patterns to write
calls for async operations, specially its callbacks, as described
below under *writing callbacks*.

These patterns, specially the *out-line* pattern, are enough to
avoid *"the callback hell"* when working within functional programming
contexts, but on OOP contexts this patterns can turn against us, as
described below under *motivation*.

That's the main reason why this utility exists: to help programmers on
writing those methods that effectively are asynchronous code flows,
keeping the code clean and tidy. In a nutshell, keeping the code readable.

## Intents of this paper

* Describing the current existing conventions on writing javascript
  asynchronous code logic. (see *writing callbacks*)

* Arguing the reasons that give meaning to an utility that eases
  writing asynchronous code in OOP contexts. (see *motivation*)

* Being the roadmap for the development of this utility through
  the definition of its objectives. (see *objectives*)

* Being the presentation of this utility to possible users.


## Writing callbacks

Let's assume the current convention, standardized by the node.js
development team, is:

  * Reserving the first parameter of any callback for an `Error`
    instance, or `null` value.
  * Reserving the last argument of any asynchronous operation call for
    a callback function.

There are 2 recommended patterns - and widely used into javascript
open source projects - to write callbacks: **in-line** or **out-line**.

### In-line

*Inlined* callbacks are simply defined within the operation call:

    asyncOperation(requiredData, function callback(error, resultData){
      if (error) {
        // handle the error
      }
      // handle the result
    });

### Out-line

*Outlined* callbacks are defined outside the operation call. It's
preferred to take advantage of the javascript variable hoisting feature
and write them after, although they could be written before.

    asyncOperation(requiredData, callback);
    function callback(error, resultData){
      if (error) {
        // handle the error
      }
      // handle the result
    });

### Use cases

To write a single async operation call is perfectly ok to use the
in-line pattern, but often asynchronous operations must be combined to
implement a feature. On this cases the out-line pattern produces cleaner
and tidier code because it requires less indentation than the in-line
pattern. This fact forces the use of the out-line pattern when at
least three async operations are combined.

**This is NOT acceptable**
    
    operation1(someData, function (err, results1) {
      if (err) {
        throw err;
      }
      var moreData = doSomethingWith(results1);
      operation2(moreData, function (err, results2) {
        if (err) {
          throw err;
        }
        doSomethingWith(results2);
        operation3(function (err) {
          if (err) {
            throw err;
          }
          // success!
        });
      });
    });

**While this is acceptable**
    
    operation1(someData, callback1);
    
    function callback1 (err, results1) {
      if (err) {
        throw err;
      }
      var moreData = doSomethingWith(results1);
      operation2(moreData, callback2);
    }
    
    function callback2 (err, results2) {
      if (err) {
        throw err;
      }
      doSomethingWith(results2);
      operation3(callback3);
    }
    
    function callback3 (err) {
      if (err) {
        throw err;
      }
      // success!
    }

## Motivation

When defining methods for an object's prototype (bad said, methods for
a class instance), the programmer defines routines to be repeated on a
variety of data contexts (aka object instances or, bad said, class
instances). When this methods perform multiple async operations the
code grows in complexity, and performing more than two async operations
produces unreadable code.

Nesting *in-line* callbacks becomes a mess always, writting those
*out-line* callbacks that js ninjas love into the method declarations
would be an unnecesary memory waste, and writting them outside is not
an option cause the need of sharing some variables in the scope,
specially the method callback, within all operations.

**This is definitely a mess**, although it's seen too many times.

    MyApi.prototype.operation = function(someData, callback){
      operation1(someData, function (err, results1) {
        if (err) {
          return callback(err);
        }
        var moreData = doSomethingWith(results1);
        operation2(moreData, function (err, results2) {
          if (err) {
            return callback(err);
          }
          doSomethingWith(results2);
          operation3(function (err) {
            if (err) {
              return callback(err);
            }
            // success!
            var maybeSomeResults = "are retrieved here";
            callback(null, maybeSomeResults);
          });
        });
      });
      return this;
    };

**This is unnecessarily wasting memory** because it's redefining all
callbacks on each `operation` call instead reusing them.

    MyApi.prototype.operation = function(someData, callback){
      operation1(someData, callback1);
      
      function callback1 (err, results1) {
        if (err) {
          return callback(err);
        }
        var moreData = doSomethingWith(results1);
        operation2(moreData, callback2);
      }
      
      function callback2 (err, results2) {
        if (err) {
          return callback(err);
        }
        doSomethingWith(results2);
        operation3(callback3);
      }
      
      function callback3 (err) {
        if (err) {
          return callback(err);
        }
        // success!
        var maybeSomeResults = "are retrieved here";
        callback(null, maybeSomeResults);
      }
      return this;
    };

Within this context makes sense the use of some functional utility
to *define those methods that effectively are asynchronous code flows*.
Sometimes code must be complex, but never should be unreadable.

## Objectives

The utility function should:

* Produce a flow, a function that executes multiple async operations.
* Provide a simple API to define legibly the operations performed by
  the flow (hereafter, *steps*, for brevity).
* Reduce the amount of written callbacks needed to execute a flow.
  Ideally, it should reduce them from 1 callback per step to 1 callback
  per entire flow.
* Ease the error handling. Any flow is successfully executed when
  there are no errors notified on any async operation that it performs.
  When an error is notified the flow fails, stoping inmediately.
* Ensure each step is executed within the context of the flow call.
* Provide a channel to communicate data to the first step, from each
  step to the next one and from the last step to the flow callback.

## API Examples

### Simple 3-operation example taken from *writing callbacks*

    MyApi.prototype.operation = flow()
      .step(operation1)
      .step(function (results1, next) {
        var moreData = doSomethingWith(results1);
        next( null, moreData );
      })
      .step(operation2)
      .step(function (results2, next) {
        doSomethingWith(results2);
        next();
      })
      .step(operation3)
      .step(function (next) {
        var maybeSomeResults = "are retrieved here";
        next(null, maybeSomeResults);
      })
    ;

    // being api an instance of MyApi...
    api.operation(someData, function (err) {
      if (err) {
        // handle it and return
      }
      // success
    });

### Sequentially iteration example

    MySchema.prototype.validate = flow()
      .step(function(data, next){
        if ( !this.fields ){
          return next( Error("WTF?" );
        }
        next(null, this.fields, data);
      })
      .iterate(function (fieldName, field, data, next) {
        field.validate(data[fieldName], next);
      })
    ;

    // being schema an instance of MySchema...
    schema.validate(inputData, function (err) {
      if (err) {
        // handle it and return
      }
      // validation succeed!
    });

### Parallel iteration example

    MySchema.prototype.validate = flow()
      .step(function(data, fieldNames, next){
        if ( !fields ){
          fields = this.fields
        } else {
          var names = fields;
          fields = {};
          Object
            .keys(this.fields)
            .filter(function (fieldName) {
              return fieldName in fields;
            })
            .forEach(function (fieldName) {
              fields[ fieldName ] = this.fields[ fieldName ];
            }, this)
          ;
        }
        next(null, fields, data);
      })
      .together(function (fieldName, field, data, work) {
        field.validate(data[fieldName], work());
      })
    ;

    // being schema an instance of MySchema...
    schema.validate(inputData, function (err) {
      if (err) {
        // handle it and return
      }
      // validation succeed!
    });

