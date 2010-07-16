/*
Distributed under both the W3C Test Suite License [1] and the W3C
3-clause BSD License [2]. To contribute to a W3C Test Suite, see the
policies and contribution forms [3].

[1] http://www.w3.org/Consortium/Legal/2008/04-testsuite-license
[2] http://www.w3.org/Consortium/Legal/2008/03-bsd-license
[3] http://www.w3.org/2004/10/27-testcases
*/

(function ()
{
    // default timeout is 5 seconds, test can override if needed
    var default_timeout = 5000;

    // tests either pass, fail or timeout
    var status =
    {
        PASS: 0,
        FAIL: 1,
        TIMEOUT: 2,
        NOT_IMPLEMENTED:3
    };
    expose(status, 'status');

    /*
    * API functions
    */

    var name_counter = 0;
    function next_default_name()
    {
      var prefix = document.title ? document.title : "Untitled";
      var suffix = name_counter > 0 ? " " + name_counter : "";
      name_counter++;
      return prefix + suffix;
    }

  function test(func, name, properties)
    {
        var test_name = name ? name : next_default_name();
        properties = properties ? properties : {};
        var test_obj = new Test(test_name, properties);
        test_obj.step(func);
	if (test_obj.status === null) {
	    test_obj.done();
	}
    }

    function async_test(name, properties)
    {
        var test_name = name ? name : next_default_name();
        properties = properties ? properties : {};
        var test_obj = new Test(test_name, properties);
        return test_obj;
    }

    function on_event(object, event, callback)
    {
      object.addEventListener(event, callback, false);
    }

    expose(test, 'test');
    expose(async_test, 'async_test');
    expose(on_event, 'on_event');

    /*
    * Assertions
    */

    function assert_true(actual, description)
    {
	var message = make_message("assert.true", description,
	format("expected true got %s", actual));
	assert(actual === true, message);
    };
    expose(assert_true, "assert_true");

    function assert_false(actual, description)
    {
	var message = make_message("assert.false", description,
			  format("expected false got %s", actual));
	assert(actual === false, message);
    };
    expose(assert_false, "assert_false");

    function assert_equals(actual, expected, description)
    {
	 /*
	  * Test if two primitives are equal or two objects
	  * are the same object
	  */
	 var message = make_message("assert.equals", description,
				    format("expected %s got %s", expected,
					   actual));

	 if (expected !== expected)
	 {
	     //NaN case
	     assert(actual !== actual, message);
	 }
	 else
	 {
	     //typical case
	     assert(actual === expected, message);
	 }
    };
    expose(assert_equals, "assert_equals");

    function assert_object_equals(actual, expected, description)
    {
	 //This needs to be improved a great deal
	 function check_equal(expected, actual, stack)
	 {
	     stack.push(actual);

	     for (p in actual)
	     {
		 var message = make_message(
		     "assert.object_equals", description,
		     format("unexpected property %s", p));

		 assert(expected.hasOwnProperty(p), message);

		 if (typeof actual[p] === "object" && actual[p] !== null)
		 {
		     if (stack.indexOf(actual[p]) === -1)
		     {
			 check_equal(actual[p], expected[p], stack);
		     }
		 }
		 else
		 {
		     message = make_message(
			 "assert.object_equals", description,
			 format("property %s expected %s got %s",
				p, expected, actual));

		     assert(actual[p] === expected[p], message);
		 }
	     }
	     for (p in expected)
	     {
		 var message = make_message(
		     "assert.object_equals", description,
		     format("expected property %s missing", p));

		 assert(actual.hasOwnProperty(p), message);
	     }
	     stack.pop();
	 }
	 check_equal(actual, expected, []);
    };
    expose(assert_object_equals, "assert_object_equals");

    function assert_exists(object, property_name, description)
    {
	 var message = make_message(
	     "assert.exists", description,
	     format("expected property %s missing", property_name));

	 assert(object.hasOwnProperty(property_name, message));
    };
    expose(assert_exists, "assert_exists");

    function assert_not_exists(object, property_name, description)
    {
	 var message = make_message(
	     "assert.not_exists", description,
	     format("unexpected property %s found", property_name));

	 assert(!object.hasOwnProperty(property_name, message));
    };
    expose(assert_not_exists, "assert_not_exists");

    function assert_readonly(object, property_name, description)
    {
	 var initial_value = object[property_name];
	 try {
	     var message = make_message(
		 "assert.readonly", description,
		 format("deleting property %s succeeded", property_name));
	     assert(delete object[property_name] === false, message);
	     assert(object[property_name] === initial_value, message);
	     //Note that this can have side effects in the case where
	     //the property has PutForwards
	     object[property_name] = initial_value + "a"; //XXX use some other value here?
	     message = make_message("assert.readonly", description,
				    format("changing property %s succeeded",
					   property_name));
	     assert(object[property_name] === initial_value, message);
	 } finally {
	     object[property_name] = initial_value;
	 }
    };
    expose(assert_readonly, "assert_readonly");

    function assert_unreached(description) {
	 var message = make_message("assert.unreached", description,
				    "Reached unreachable code");

	 assert(false, message);
    }
    expose(assert_unreached, "assert_unreached");

    function Test(name, properties)
    {
       this.name = name;
       this.status = null;
       var timeout = default_timeout;
       this.is_done = false;

       if (properties.timeout)
       {
           timeout = properties.timeout;
       }

       this.message = null;

       var this_obj = this;
       this.steps = [];
       this.timeout_id = setTimeout(function() { this_obj.timeout(); }, timeout);

       tests.push(this);
   }

    Test.prototype.step = function(func, this_obj)
    {
        //In case the test has already failed
        if (this.status !== null)
        {
            return;
        }

        this.steps.push(func);

        try
        {
            func.apply(this_obj);
        }
        catch(e)
        {
            this.status = status.FAIL;
            this.message = e.message;
            this.done();
        }
    };

    Test.prototype.timeout = function()
    {
        this.status = status.TIMEOUT;
        this.timeout_id = null;
        this.message = "test timed out";
        this.done();
    };

    Test.prototype.done = function()
    {
	if (this.is_done) {
	    //Using alert here is bad
	    alert("done called multiple times for test " + this.name);
	    return;
	}
        clearTimeout(this.timeout_id);
        if (this.status == null)
        {
            this.status = status.PASS;
        }
	this.is_done = true;
        tests.done(this);
    };


   /*
    * Harness
    */
    var tests = new Tests();

    function Tests()
    {
        this.tests = [];
	this.num_pending = 0;

        this.test_done_callbacks = [];
        this.all_done_callbacks = [];

        var this_obj = this;

        //All tests can't be done until the load event fires
        this.all_loaded = false;

        on_event(window, "load",
		 function()
		 {
                     this_obj.all_loaded = true;
                     if (this_obj.all_done())
                     {
                         this_obj.notify_results();
                     }
                 });
   }

    Tests.prototype.push = function(test)
    {
	this.num_pending++;
        this.tests.push(test);
    };

    Tests.prototype.all_done = function() {
	return this.all_loaded && this.num_pending == 0;
    };

    Tests.prototype.done = function(test)
    {
        this.num_pending--;

        forEach(this.test_done_callbacks,
                function(callback)
                {
                    callback(test);
                });

        if (this.all_done())
        {
            this.notify_results();
        }

    };

    Tests.prototype.notify_results = function()
    {
        var test_objects = this.tests;
        var this_obj = this;

        forEach (this.all_done_callbacks,
		 function(callback)
                 {
                     callback(this_obj.tests);
                 });
    };

    function add_result_callback(callback)
    {
        tests.test_done_callbacks.push(callback);
    }

    function add_completion_callback(callback)
    {
       tests.all_done_callbacks.push(callback);
    }

    expose(add_result_callback, 'add_result_callback');
    expose(add_completion_callback, 'add_completion_callback');

    /*
     * Output listener
    */
    function output_results(tests)
    {
        var status_text = {};
        status_text[status.PASS] = "PASS";
        status_text[status.FAIL] = "FAIL";
        status_text[status.TIMEOUT] = "TIMEOUT";
        status_text[status.NOT_IMPLEMENTED] = "NOT IMPLEMENTED";

        forEach (tests,
		 function(test)
                 {
		     var testtable = document.getElementById('testtable');
                     var row = testtable.insertRow(testtable.rows.length);

                     var testresult = table= row.insertCell(0);
                     var text_node = document.createTextNode(status_text[test.status]);

                     testresult.style.color = test.status === status.PASS ? "green" : "red";
                     testresult.appendChild(text_node);

                     var testassertion = table= row.insertCell(1);
                     var text = test.name;

                     if (test.status !== status.PASS && test.message)
                     {
                         text += format(" message: " + test.message);
                     }

                     text_node = document.createTextNode(text);
                     testassertion.appendChild(text_node);
		 });
   }

   add_completion_callback(output_results);


    /*
     * Utility funcions
     */
    function assert(expected_true, message)
    {
        if (expected_true !== true)
        {
            throw new AssertionError(message);
        }
    }

    function AssertionError(message)
    {
        this.message = message;
    }

    function make_message(function_name, description, error)
    {
        var message;

        if (description)
        {
            message = format("%s (%s): %s", function_name, description, error);
        }
        else
        {
            message = format("%s: %s", function_name, error);
        }

        return message;
    }

    function forEach (array, callback, thisObj)
    {
        for (var i=0; i<array.length; i++)
        {
            if (array.hasOwnProperty(i))
            {
                callback.call(thisObj, array[i], i, array);
            }
        }
   }

    function format(template)
    {
        var args = Array.prototype.slice.call(arguments, 1);
        var parts = template.split("%s");
        var full_string_parts = [];

        for (var i=0; i<parts.length-1; i++)
        {
            full_string_parts.push('' + parts[i]);
            full_string_parts.push('' + args[i]);
        }

        full_string_parts.push(parts[parts.length - 1]);

       return full_string_parts.join("");
    }

    function expose(object, name)
    {
        window[name] = object;
    }

})();
