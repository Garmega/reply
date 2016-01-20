var reply = require('./..');

//Asks whether or not the student is in this class
reply.confirm('You are a student in INFO498?', function(err, yes){

  if (!err && yes) {
      
    //If he/she is then query what their name is.
    console.log("Thats so cool! Coding is fun.");
    
    reply.get( {
        firstname: {
            message: 'What is your first name?'
        },
        lastname: {
            message: 'What is your last name?',
        }  
    },
  
    function(err, result){
        if (!err) {
            console.log("It's so nice to meet you! " + result.firstname + " " + result.lastname);
        } else {
            console.log("I didn't quite catch that. Oh well. See you around!");
        }
        
    })  
  }
  else
    console.log("Ahh well, maybe you should take it next quarter!");
});