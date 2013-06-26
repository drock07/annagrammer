//////////////////////////////
///// Application Code ///////
//////////////////////////////

var Anagrammer = (function() {

  /////////////////////////////////
  //        Member fields        //
  /////////////////////////////////
  var obj = this,
      word, 
      wrd_arr, 
      curScore = 0,
       wordnik,
      myDoc = {},

      // constants
      TIMER_DURATION_IN_SECS = 60,


      // timer variables
      timer,
      $stopwatch, // Stopwatch element on the page
      incrementTime = 1000, // Timer speed in milliseconds
      currentTime, // Current time in hundredths of a second
      countdownTime,
      countdownTimer,

  /////////////////////////////////
  //       Helper functions      //
  /////////////////////////////////

      __shuffleLetters = function() {
        
        var allElems = $(".letter-box").get(),
            getRandom = function(max) {
                return Math.floor(Math.random() * max);
            },
            shuffled = $.map(allElems, function(index, domElement){
                var random = getRandom(allElems.length),
                    randEl = $(allElems[random]).clone(true)[0];
                allElems.splice(random, 1);
                return randEl;
           });
 
        $(".letter-box").each(function(i){
            $(this).replaceWith($(shuffled[i]));
        });

        $("#word_list").sortable("refresh");
      },

      __countdown = function(count) {
        $("#fader-white").html("<div>" + count + "</div>").show();
        countdownTime = (count - 1) * 100;
        countdownTimer = $.timer(countdownUpdate, 1000, true);
            
      },

      __addToScore = function(points) {
        if(myDoc.score == null) myDoc.score = 0;
        myDoc.score += points;
        //documentApi.update(myDocId, anagrammer.Replace, myDoc, anagrammer.ReceiveUpdate);
        __updateScore();
      },

      __updateScore = function() {
        $("#user_score_display").html("Score: " + myDoc.score);
      },

      __pad = function(number, length) {
        var str = '' + number;
        while (str.length < length) {str = '0' + str;}
        return str;
      },

      __formatTime = function(time) {
        var min = parseInt(time / 6000),
            sec = parseInt(time / 100) - (min * 60);
        return (min > 0 ? __pad(min, 2) : "0") + ":" + __pad(sec, 2);
      },

  /////////////////////////////////
  //      Private functions      //
  /////////////////////////////////

      init = function() {
        
        curScore = 0;

        $("#word_list").sortable({
            update: function(event, ui) {
              var result_word = "";
              $("#word_list .letter-box").each(function() {
                result_word += $(this).html();
              });
              if(result_word == word) {
                __addToScore(word.length * 10);
                resetWord();
              }
            }
          }).disableSelection();

        wordnik = new SwaggerApi({
          discoveryUrl: "http://api.wordnik.com/v4/resources.json",
          apiKey: "997661624d1be0cf7a00d0f07d80132279409825d52cadc0f",
          success: function() {
            console.log("successfully retrieved wordnik API");
            resetGame();
          }
        });
      },

      resetGame = function() {
        $("#word_list").hide();
        $("#controls-box").hide();

        $("#word-box").append($("<button />").addClass("start-button").html("start"));

        currentTime = (TIMER_DURATION_IN_SECS - 1) * 100;

        $stopwatch = $('#timer_display').css("color", "black");
        $stopwatch.html(__formatTime(TIMER_DURATION_IN_SECS * 100));
        timer = $.timer(updateTimer, incrementTime, false);
      },

      startGame = function() {
        $(".start-button").remove();

        $("#word_list").show();
        $("#controls-box").show();

        $("#fader-white").css({
          "width" : "106px",
          "height" : "59px"
        });
        
        __countdown(3);
      },

      endRound = function() {
        currentTime = 900;
        resetGame();
      },

      fetchNewWord = function(cb) {
        wordnik.words.getRandomWord({minCorpusCount:100000, minLength: 4, maxLength: 6}, function(data) {
          word = data.word;
          wrd_arr = word.split('');
          cb();
        });
      },

      resetWord = function() {
        fetchNewWord(function() {

          console.log(word);

          $(".letter-box").remove();

          for(var i = 0; i < word.length; i++){
            $("#word_list").append($("<li />").addClass("letter-box").html(wrd_arr[i]));
          }

          $("#fader-white").hide();//.css({
          //   "width" : $("#word-box").outerWidth(),
          //   "height" : $("#word-box").outerHeight()
          // }).hide();

          var result_word = "";
          while(true) {
            $("#word_list .letter-box").each(function() {
              result_word += $(this).html();
            });

            if(result_word == word.toLowerCase())
              __shuffleLetters();
            else
              break;
          }


        });
      },

      updateTimer = function() {
        $stopwatch.html(__formatTime(currentTime));
        if(currentTime <= 500) {
          $stopwatch.css("color", "red");
        } else {
          $stopwatch.css("color", "black");
        }
        if (currentTime == 0) {
            timer.stop();
            endRound();
            return;
        }
        currentTime -= incrementTime / 10;
        if (currentTime < 0) currentTime = 0;
      },

      countdownUpdate = function() {
        $("#fader-white").html("<div>" + (countdownTime / 100) + "</div>").show();
        if (countdownTime == 0) {
            countdownTimer.stop();
            $("#fader-white").html("<div>Go!</div>").show();
            setTimeout(function() {
              resetWord();
              timer.play();
            }, 500);
            return;
        }
        countdownTime -= 1000 / 10;
        if (countdownTime < 0) countdownTime = 0;
      };

  /////////////////////////////////
  //        Public methods       //
  /////////////////////////////////

  this.Error = function(e) {
    console.log(e);
  };

  this.Replace = function(old, params) { return params; }

  this.InitialDocument = function() {
    
    return {
      score: 0
    };
  }

  this.DocumentCreated = function(doc) {
    if (TwoPlus.isInstalled()) {
      var rdl = TwoPlus.createRDL({
        "noun": "Anagrammer Game",
        "displayTitle": "Anagrammer",
        //"displayThumbnailUrl": "http://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg",
        "displayText": "Click to join the Anagrammer!",
        "callback": window.location.href
      });
      TwoPlus.setPasteboard(rdl);
      TwoPlus.exit();
    } else {
      anagrammer.ReceiveUpdate(doc);
    }
  }

  this.ReceiveUpdate = function(doc) {
    myDoc = doc;
    anagrammer.Render(doc);
  }

  this.Render = function(state) {
    __updateScore();
    //$("body").append($("<p />").html(state.score));
    //console.log("Identity: " + TwoPlus.getIdentity());
    //$("#results").html(state.score);
    // var html = "<div class='player'>";
    // for (i = 0; i < state.life.length; i++) {
    //   var cname = "tile_" + i;
    //   html += "<input class='player' id='"+cname+"' type='text' value='" + state.life[i] + "'/>";
    //   html += "<button onclick='IncrementCounter(" + i + ",-1)'>-</button>";
    //   html += "<button onclick='IncrementCounter(" + i + ",+1)'>+</button>";
    //   html += "<br/>";
    // }
    // html += "</div>";
    // $("#app").html(html);
  }

  // this.StartGame = function(players) {
  //   numPlayers = players;
  //   initDocument();
  // }

  // this.IncrementCounter = function(player, amount) {
  //   myDoc.life[player] += amount;
  //   documentApi.update(myDocId, Replace, myDoc, ReceiveUpdate);
  // }

  /////////////////////////////////
  //       Event listeners       //
  /////////////////////////////////

  $(".next-button").live("click", function() {
    resetWord();
  });

  $(".start-button").live("click", function() {
    startGame();
  });

  $(".skip-button").live("click", function() {
    __addToScore(-10);
    resetWord();
  });

  $(".shuffle-button").live("click", __shuffleLetters);

  /////////////////////////////////
  //         Initialize          //
  /////////////////////////////////

  init();
})();


TwoPlus.ready(function() {

  
  // YeouijuClient.getInstance().ensureRegistration(function() {
  //   var link = { "Identity" : "email:drockwood@mobisocial.us"};
  //   YeouijuClient.getInstance().post("/a/api/0/link?f=sif", link,
  //     function() {
  //       alert("Yay! we sent an email to get this account linked");
  //     }, function() {
  //       alert("Booo! We failed to link the account.");
  //   });
  // }, function() {
  //   alert("It's still not working!");
  // });

  

  //anagrammer = new Anagrammer();

  //initDocument();
  // if (hasDocument()) {
  //   console.log("has document");
  //   initDocument();
  // }
});

