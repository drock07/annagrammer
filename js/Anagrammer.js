//////////////////////////////
///// Application Code ///////
//////////////////////////////

function Anagrammer() {

  /////////////////////////////////
  //        Member fields        //
  /////////////////////////////////
  var obj = this,
      word, 
      wrd_arr, 
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
      countdownTimer;

  /////////////////////////////////
  //      Private functions      //
  /////////////////////////////////

  var init = function() {

      //goToPage("gamePage");
      goToPage("testPage");
      //goToPage("startPage");

      // initialize the sortable wordList
      $("#wordList").sortable({
          update: function(event, ui) {
            var result_word = "";
            $("#wordList .angrm-letter-box").each(function() {
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
          resetGame();
        }
      });
    },

     goToPage = function(pageTitle){
        $(".angrm-app-page").hide();
        $("#" + pageTitle).show();
      },

      resetGame = function() {
        $("#wordList").hide();
        $("#controlsBox").hide();

        $("#wordBox").append($("<button />").addClass("angrm-start-button").html("start"));

        currentTime = (TIMER_DURATION_IN_SECS - 1) * 100;

        $stopwatch = $('#timerDisplay').css("color", "black");
        $stopwatch.html(__formatTime(TIMER_DURATION_IN_SECS * 100));
        timer = $.timer(updateTimer, incrementTime, false);
      },

      startGame = function() {
        $(".angrm-start-button").remove();

        $("#wordList").show();
        $("#controlsBox").show();

        $("#faderWhite").css({
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
        wordnik.words.getRandomWords({minCorpusCount:100000, minLength: 4, maxLength: 6, includePartOfSpeech: "noun, verb, adjective, adverb", excludePartOfSpeech: "proper-noun, proper-noun-plural, noun-posessive, proper-noun-posessive", limit: 10}, function(data) {
          for (var i = 0; i < 10; i++) {
            $("#testPage").append("<p>" + data[i].word + "</p>");
          }      
          //word = data.word.toLowerCase();
          //wrd_arr = word.split('');
          if(typeof cb === "function")
            cb();
        });
      },

      resetWord = function() {
        fetchNewWord(function() {

          console.log(word);

          $(".angrm-letter-box").remove();

          for(var i = 0; i < word.length; i++){
            $("#wordList").append($("<li />").addClass("angrm-letter-box").html(wrd_arr[i]));
          }

          $("#faderWhite").hide();

          var result_word = "";
          while(true) {
            $("#wordList .angrm-letter-box").each(function() {
              result_word += $(this).html();
            });

            if(result_word === word)
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
        $("#faderWhite").html("<div>" + (countdownTime / 100) + "</div>").show();
        if (countdownTime == 0) {
            countdownTimer.stop();
            $("#faderWhite").html("<div>Go!</div>").show();
            setTimeout(function() {
              resetWord();
              timer.play();
            }, 500);
            return;
        }
        countdownTime -= 1000 / 10;
        if (countdownTime < 0) countdownTime = 0;
      },

  /////////////////////////////////
  //       Helper functions      //
  /////////////////////////////////

      __shuffleLetters = function() {
        
        var allElems = $(".angrm-letter-box").get(),
            getRandom = function(max) {
                return Math.floor(Math.random() * max);
            },
            shuffled = $.map(allElems, function(index, domElement){
                var random = getRandom(allElems.length),
                    randEl = $(allElems[random]).clone(true)[0];
                allElems.splice(random, 1);
                return randEl;
           });
 
        $(".angrm-letter-box").each(function(i){
            $(this).replaceWith($(shuffled[i]));
        });

        $("#wordList").sortable("refresh");
      },

      __countdown = function(count) {
        $("#faderWhite").html("<div>" + count + "</div>").show();
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
        $("#userScoreDisplay").html("Score: " + myDoc.score);
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

  this.Test = function() {
    fetchNewWord();
  }

  /////////////////////////////////
  //       Event listeners       //
  /////////////////////////////////

  $(".angrm-start-button").live("click", function() {
    startGame();
  });

  $(".angrm-skip-button").live("click", function() {
    __addToScore(-10);
    resetWord();
  });

  $(".angrm-shuffle-button").live("click", __shuffleLetters);

  /////////////////////////////////
  //         Initialize          //
  /////////////////////////////////

  init();
};

$("document").ready(function(){
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

    

    anagrammer = new Anagrammer();

    //initDocument();
    // if (hasDocument()) {
    //   console.log("has document");
    //   initDocument();
    // }
  });
});


