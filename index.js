var rl, readline = require('readline');

var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}

/**
 * This is a basic prompt for yes/no confirmation.
 * @method confirm
 * @param {string} message 
 * @param {function} callBack
 * @returns {string}
 */
var confirm = exports.confirm = function(message, callback) {

  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  }

  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

/**
 * All Encompasing method to determine a reply from a user.
 * A list of questions can be passed in with default answers.
 * @method get
 * @namespace get
 * @param {dictionary<String, Object>} options
 * @param {function} callBack
 * @returns {string}
 */
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))
  
  //Variable declarations.
  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options); 
  
  /**
   * Function called when all questions have been done. Callback is called here.
   */
  var done = function() {
    close_prompt();
    callback(null, answers);
  }
  
  
  /**
   * Disengages the appropriate objects.
   */
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }
 
  /**
   * Function to get the default value for a key.
   * @param {string} key 
   * @param {string} partial_answers
   * @returns {string}
   */
  var get_default = function(key, partial_answers) {
    //If the key does have an object associated with it.
    if (typeof options[key] == 'object')
      //If the default value is a function then run the function with the parameter partial answer else return the properties default value.
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      //Return the value sitting there anyway ???
      return options[key];
  }
  
  
  /**
   * Determines if the user replied with a yes or no ???
   * @param {string} reply
   * @returns {string}
   */
  var guess_type = function(reply) {

    if (reply.trim() == '')
      return;
    else if (reply.match(/^(true|y(es)?)$/))
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }
  
  /** 
   * Validates the answer of the user.
   * @param {string} key
   * @param {string} answer
   * @returns {bool}
   */
  var validate = function(key, answer) {
      
    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  }
  
  
  /**
   * Generates an error message for the given key
   * @param {string} key
   */
  var show_error = function(key) {
      
    //Attempts to print out an error message if one is defined. Otherwise a default one will be provided.
    var str = options[key].error ? options[key].error : 'Invalid value.';
    
    //If the key has options defined than it will concatenate those options.
    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';
    
    stdout.write("\x1b[1,31m" + str + "\x1b[0,0m" + "\n");
  }
  
  
  /**
   * Generates a message for the given key
   * @param {string} key
   */
  var show_message = function(key) {
    var msg = '';
    
    //If the key has a message defined.
    if (text = options[key].message)
      msg += text.trim() + ' ';
      
    //If the key has options defined.
    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';
      
    //If some message has been generated, print. otherwise do nothing.
    if (msg != '') stdout.write("\x1b[1,30m" + msg + "\x1b[0,0m\n");
  }

  /**
   * taken from commander lib
   * Prompt for user to imput a password
   * @param {string} prompt
   * @param {function} callback
   */
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*';
        
    //Everytime a key or combination of keys are pressed.
    var keypress_callback = function(c, key) {
        
      //If the user hit enter or return. Prompt will end and callback will be called.
      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }
      
      //If the user hit ctrl and c, exit them out of the prompt without callback
      if (key && key.ctrl && key.name == 'c')
        close_prompt();
        
      //If the key is backspace, delete the last character.
      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\x1b[1,30m' + prompt + masked);
      
      //Otherwise append.
      } else {
        stdout.write(mask);
        buf += c;
      }

    };
    
    //recurse if we aren't closed.
    stdin.on('keypress', keypress_callback);
  }
  
  /**
   * Checks if the reply is valid.
   * @param {int} index
   * @param {string} curr_key
   * @param {string} fallback
   * @param {string} reply
   */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    
    //Sets a valuable to the answer if it is undefined otherwise default.
    var return_answer = (typeof answer != 'undefined') ? answer : fallback;
    
    
    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }
  
  /**
   * Checks to make sure the passed in options in proper formats.
   * @param {[string]} conds
   * @returns {bool}
   */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }

    return true;
  }

  /**
   * Calls next question to be asked. 
   * @param {int} index
   * @param {string} prev_key
   * @param {string} answer 
   */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout);
  next_question(0);

  rl.on('close', function() {
    close_prompt(); // just in case

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

}
