module.exports = function(io) {

  var loadedAnswer = [];
  var participants = {};

  var Game = require('../models/game/game.js');
  var Question = require('../models/question/question.js');
  var Answer = require('../models/answer/answer.js');
  var helper = require('./helpers/nextQuestion.js');

  io.on('connection', function(socket) {

    socket.on('disconnect', function() {
      console.log("Removing '" + socket.id + "' from room '" + socket.room + "'...");
      participants[socket.room]--;
      console.log("Remaining participants: ");
      console.log(participants);
    });

    //Join Room
    socket.on('join_room', function(code, cb) {
      socket.join(code);
      socket.room = code;
      console.log("User '" + socket.id + "' joined...");
      console.log("user is now in : " + socket.room);

      if (participants[code] == undefined) {
        participants[code] = 1;
      } else {
          participants[code]++;
      }

      console.log("Participants: ");
      console.log(participants);

      cb();

      // INCREMENT THE # OF PARTICIPANTS
    });

    //Answer logic
    socket.on('answer_chosen', function(data, cb) {
        // console.log("Data: " + data.questionId);
        //Later, use game object to compare answerChosen with
        Question.findById(data.questionId).exec(function(error, question) {
          //   console.log("Question: " + question + " | Error: " + error);
            if (error) { return error };
            // console.log('Question Object: ' + question);
            var answerCorrect = question.answer;
            var answerChosen = data.answerChosen;
            console.log('Correct: ' + answerCorrect + " | Chosen: " + answerChosen);
            if (answerChosen == answerCorrect) {
                cb({ isCorrect: true, answer: answerCorrect }); // object containing true or false the answer selected
            } else {
                cb({ isCorrect: false, answer: answerCorrect });
            }
        })
    });

    socket.on('answer_created', function(data, cb) {

      Answer.create(data.answer, function(error, answer) { // Create answer object from user
        if (error) { return error }
        console.log('Fake Answer created: ' + answer);
        console.log("---------------------------------");
        // console.log("Loaded Answers: ");
        // console.log(loadedAnswer);
        Answer.find({ question: answer.question }, function(err, answers) { // find all user generated answers for this question
          console.log("Number of answers for this question: " + answers.length);

          if (answers.length == participants[data.code]) {
            console.log("All fake answers have been submitted")

            Question.findById(answer.question, function(er, question) { // Find the current question for teh correct answer
              var response = {
                ready: true,
                answers: answers.map(function(a) {
                 return a.body;
                })
              }
              response.answers.push(question.answer);
              cb(response)
            });
          } else {
            console.log("'" + socket.id + "' has entered their answer...")
            console.log("Awaiting " + (participants[data.code] - answers.length));
            var response = {
              ready: false
            }
            cb(response)
          }

        })
      });

    }); // End of socket.on('answer_created')

    socket.on('update_clients', function(data) {
      io.in(socket.room).emit('update_clients', data)
    });

  });
};
