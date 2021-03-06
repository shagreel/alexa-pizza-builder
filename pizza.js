'use strict';

const express = require('express');
const alexa = require('alexa-app');
const Analytics = require('./analytics');
const AmazonSpeech = require('ssml-builder/amazon_speech');
const fileSystem = require('fs');
const crypto = require('crypto');
const curl = require('request');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const api = express();
const app = new alexa.app("pizza");

app.express({
    expressApp: api,
    checkCert: false,
    debug: true
});

app.track = function(request, response, type) {
}

app.pre = function(request, response, type) {
    request.analytics = new Analytics();
    app.track(request, response, type);
    if (request.type() == "IntentRequest") {
        console.log("*********** Request ***********");
        console.log(request.data.request.intent.name);
        console.log("  -- ", request.data.request.intent.slots);
    }
};

app.post = function(request, response, type) {
  console.log("*********** Session ***********");
  var session = request.getSession();
  if (session) {
    console.log("Crust - %s", session.get("crust"));
    console.log("Sauce - %s", session.get("sauce"));
    console.log("Cheese - %s", session.get("cheese"));
    console.log("Toppings - %s", session.get("toppings"));
    console.log("\n");
  }
  request.analytics.send(curl, "oocha");
};

app.launch(function(request, response) {
    var intro = new AmazonSpeech()
        .say("Ahh, a pizza. Great idea.")
        .pause("300ms")
        .say("Let's start with the crust.")
        .pause("300ms")
        .say("What kind would you like?");
   response.say(intro.ssml()).reprompt("What crust do you want?").shouldEndSession(false);
});

app.intent("AMAZON.HelpIntent", {
        "slots": {},
        "utterances": []
    },
    function(request, response) {
        var session = request.getSession();

        var helpOutput = "You can ask 'what are my options' or 'what kind of crust can I have on my pizza?'." +
            " You can also say stop or cancel to quit. ";
        var reprompt = getNextSaying(session);
        // AMAZON.HelpIntent must leave session open -> .shouldEndSession(false)
        response.say(helpOutput+reprompt).reprompt(reprompt).shouldEndSession(false);
    }
);

app.intent("AMAZON.StopIntent", {
        "slots": {},
        "utterances": []
    }, function(request, response) {
        var stopOutput = "No pizza tonight? Ok.";
        response.say(stopOutput);
        request.analytics.event(21);
    }
);

app.intent("AMAZON.CancelIntent", {
        "slots": {},
        "utterances": []
    }, function(request, response) {
        var cancelOutput = "Ok. Since you don't want it, I'll give it to some folks who are down on their luck.";
        response.say(cancelOutput);
        request.analytics.event(21);
    }
);

app.dictionary = {
    "crust": ["traditional","thin","thick","deep dish","focaccia","herb","stuffed"],
    "sauce": ["Marinara","Pesto","Barbecue","Hummus","Bechamel","Alfredo"],
    "cheese": ["Mozzarella","Cheddar","Colby","Provolone","Parmesan","Ricotta","Gruyere","Goat"],
    "toppings": ["Bell Pepper","Mushroom","Onion","Olive","Spinach","Artichoke","Tomato","Sun-dried Tomato","Pineapple","Basil", "Pepperoni","Sausage","Bacon","Ham","Chicken","Pastrami"]
};

app.intent("MakePizza", {
        "slots": {},
        "utterances": [
            "{Make|build|create} me a pizza",
            "{Make|build|create} a pizza for me",
            "{I'd|I would} like a pizza",
            "I need a pizza",
            "pizza time",
            "let's {create|build} a pizza",
            "{may|can} I {get|have|make|build} a pizza"
        ]
    },
    function(request, response) {
        var intro = new AmazonSpeech()
            .say("Great idea! Let's start with the crust.")
            .pause("500ms")
            .say("What kind would you like?");
        response.say(intro.ssml()).reprompt("What crust do you want?").shouldEndSession(false);
    }
);

app.intent("SelectCrust", {
        "slots": { "CRUST": "LITERAL" },
        "utterances": [
            "{crust|CRUST}",
            "{crust|CRUST} {crust|please|crust please}",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} {crust|CRUST} crust",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} {crust|CRUST} crust please",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} a {crust|CRUST} crust",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} a {crust|CRUST} crust please"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var old = session.get("crust");

        var crust = request.slot("CRUST");
        if (app.dictionary.crust.includes(crust)) {
            session.set("crust", crust);

            var speech = new AmazonSpeech();
            if (old && old != crust) {
                speech.say("Ok. I have changed your crust from " + old + " to " + crust + ".");
            } else {
                speech.say("Ok. I have created a beautiful " + crust + " crust for you.");
                request.analytics.event(9);
            }
            response
                .say(speech
                    .pause("300ms")
                    .say(getNextSaying(session))
                    .ssml())
                .reprompt(getNextSaying(session))
                .shouldEndSession(false);
        } else {
            response.say("Sorry, but I'm not sure what you are asking for. " + getNextSaying(session)).shouldEndSession(false);
        }
    }
);

app.intent("SelectSauce", {
        "slots": { "SAUCE": "LITERAL" },
        "utterances": [
            "{sauce|SAUCE}",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} {sauce|SAUCE}",
            "{I'd like|I would like|I would love|How about|let's have|let's try|can I have|may I have} {sauce|SAUCE} sauce"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var old = session.get("sauce");

        session.set("sauce", request.slot("SAUCE"));

        var speech = new AmazonSpeech();
        if (old && old != session.get("sauce")) {
            speech.say("Ok. I have changed your sauce to " + session.get("sauce") + ".");
        } else {
            var crust = session.get("crust");
            if (crust) {
                speech.say("I have slathered your " + crust + " crust with savory " + session.get("sauce") + " sauce.");
            } else {
                speech.say("I have slathered your crust with savory " + session.get("sauce") + " sauce.");
            }
            request.analytics.event(10);
        }
        response
            .say(speech
                .pause("300ms")
                .say(getNextSaying(session))
                .ssml())
            .reprompt("What cheese would you like?")
            .shouldEndSession(false);
    }
);

app.intent("SelectCheese", {
        "slots": { "CHEESE": "LITERAL" },
        "utterances": [
            "{cheese|CHEESE}",
            "{cheese|CHEESE} please",
            "{I'd like|I would like|I would love|How about|add|put on|let's try|let's have|can I have|may I have} {cheese|CHEESE}"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var old = session.get("cheese");

        session.set("cheese", request.slot("CHEESE"));

        var speech = new AmazonSpeech();
        if (old && old != session.get("cheese")) {
            speech.say("Ok. I have added " + session.get("cheese") + ".");
        } else {
            speech.say("I have piled some wonderful " + session.get("cheese") + " on your pizza.");
            request.analytics.event(11);
        }
        response
            .say(speech
                .pause("300ms")
                .say(getNextSaying(session))
                .ssml())
            .reprompt("What topping do you want?")
            .shouldEndSession(false);
    }
);

app.intent("AddTopping", {
        "slots": { "TOPPINGS": "LITERAL" },
        "utterances": [
            "{toppings|TOPPINGS}",
            "{I'd like|I would like|I would love|How about|add|put on|can I have|may I have} {toppings|TOPPINGS}"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var toppings = session.get("toppings") || [];
        if (toppings.length == 0) {
          request.analytics.event(12);
        }
        var topping = request.slot("TOPPINGS");
        toppings.push(topping);

        session.set("toppings", toppings);

        var speech = new AmazonSpeech();
        speech.say("I have added on " + topping);
        response
            .say(speech
                .pause("300ms")
                .say(getNextSaying(session))
                .ssml())
            .reprompt("What topping do you want?")
            .shouldEndSession(false);
    }
);

app.intent("RemoveTopping", {
        "slots": { "TOPPINGS": "LITERAL" },
        "utterances": [
            "{toppings|TOPPINGS}",
            "{take off|remove|get rid of|no} {toppings|TOPPINGS}"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var toppings = session.get("toppings") || [];
        var topping = request.slot("TOPPINGS");
        var index = toppings.indexOf(topping);

        var speech = new AmazonSpeech();
        if (index > -1) {
            toppings.splice(index, 1);
            session.set("toppings", toppings);
            speech.say("I have removed the " + topping);
        } else {
            speech.say("There is no " + topping + " on your pizza.");
        }

        response
            .say(speech
                .pause("300ms")
                .say(getNextSaying(session))
                .ssml())
            .reprompt("What topping do you want?")
            .shouldEndSession(false);
    }
);

app.intent("AvailableOptions", {
        "slots": {},
        "utterances": [
            "What are my {options|choices}",
            "What {kinds|types|options|choices} are there",
            "{choices|options|types|kinds}",
            "what can I {choose|have|get}",
            "what are there"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var state = getCurrentState(session);
        var options;
        switch (state) {
            case "crust":
                options = app.dictionary.crust;
                break;
            case "sauce":
                options = app.dictionary.sauce;
                break;
            case "cheese":
                options = app.dictionary.cheese;
                break;
            case "toppings":
                options = app.dictionary.toppings;
                break;
        }
        var speech = new AmazonSpeech();
        speech.say("Your choices are ");
        for (var i = 1; i < options.length; i++) {
            speech.say(options[i] + ", ");
        }
        speech.say(" and " + options[0]);

        response
            .say(speech.ssml())
            .reprompt("What topping do you want?")
            .shouldEndSession(false);
    }
);

app.intent("FinishPizza", {
        "utterances": [
            "I'm {finished|done}",
            "{order|purchase} {the pizza|it}",
            "{that's|that is} {enough|good|all}",
            "no more"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var speech = getDescription(session);
        if (isComplete(session)) {
            request.analytics.event(13);
          
            response
                .say(speech
                    .pause("300ms")
                    .say("If this had been a real app you would soon be tasting the heavenly bliss of your custom made pizza.")
                    .pause("300ms")
                    .say("Thank you for using summit pizza.")
                    .ssml())
                .shouldEndSession(true);
        } else {
            response
                .say(speech
                    .pause("300ms")
                    .say("It looks like you're not done with your pizza yet. You can say cancel to stop, or you can add another topping.")
                    .ssml())
                .shouldEndSession(false);
        }
    }
);


app.intent("DescribePizza", {
        "utterances": [
            "{describe|tell me about|what's on|what is on|repeat back} {the|my} pizza"
        ]
    },
    function(request, response) {
        var session = request.getSession();
        var speech = getDescription(session);
        response
            .say(speech.ssml())
            .shouldEndSession(false);
    }
);

function isComplete(session) {
    var crust = session.get("crust");
    var sauce = session.get("sauce");
    var cheese = session.get("cheese");
    var toppings = session.get("toppings");
    return crust && sauce && cheese && toppings;
}

function getDescription(session) {
    var speech = new AmazonSpeech()
        .say("You currently have");

    var crust = session.get("crust");
    var sauce = session.get("sauce");
    var cheese = session.get("cheese");
    if (crust) {
        speech.say(" a " + crust + " crust,");
    } else {
        speech.say("no crust,");
    }
    if (sauce) {
        speech.say(sauce + " sauce,");
    } else {
        speech.say("no sauce,");
    }
    if (cheese) {
        speech.say(" and piles of " + cheese + " cheese.");
    } else {
        speech.say(" and no cheese.");
    }
    speech.pause("200ms");
    var toppings = session.get("toppings");
    if (toppings) {
        switch(toppings.length) {
            case 0:
                speech.say("You have no other toppings.");
                break;
            case 1:
                speech.say("For toppings you have only " + toppings[0]);
                break;
            default:
                speech.say("For toppings you have ");
                for (var i = 1; i < toppings.length; i++) {
                    speech.say(toppings[i] + ", ");
                }
                speech.say(" and " + toppings[0]);
                break;
        }
    }
    return speech;
}

function getNextSaying(session) {
    if (!session.get("crust")) {
        return "What kind of crust do you want?";
    } else if (!session.get("sauce")) {
        return "What kind of sauce do you want?";
    } else if (!session.get("cheese")) {
        return "What kind of cheese do you want?";
    } else {
        return "What is the next topping you would like to add?";
    }
}

function getCurrentState(session) {
    if (!session.get("crust")) {
        return "crust";
    } else if (!session.get("sauce")) {
        return "sauce";
    } else if (!session.get("cheese")) {
        return "cheese";
    } else {
        return "toppings";
    }
}
api.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

// If you are using old interaction modeling
// console.log("\n");
// console.log("******************   Start of intent schema     ******************\n");
// console.log(app.schemas.intent(), "\n");
// console.log("******************    End of intent schema      ******************\n\n");
// console.log("****************** Start of sample utterances   ******************\n");
// console.log(app.utterances(), "\n");
// console.log("******************  End of sample utterances    ******************\n\n");
// console.log("******************************************************************");
// console.log("* Copy and paste the sections above into the 'Interaction Model' *");
// console.log("* tab of the alexa developer console.                            *");
// console.log("******************************************************************\n\n");
// If you are using the new (beta) skill builder uncomment the line below
//console.log(app.schemas.skillBuilder());

curl('http://localhost:4040/api/tunnels', { json: true }, (err, res, body) => {
  if (err) {
    console.log("******************************************************************");
    console.log("*");
    console.log("* [31mYou have no proxy running. Please start ngrok before starting[0m");
    console.log("* [31mthis app.[0m");
    console.log("*");
    console.log("******************************************************************");
  } else {
    var secure = (body.tunnels[0].proto == "https") ? 0 : 1;
    console.log("******************************************************************");
    console.log("* Your app endpoint is:");
    console.log("*");
    console.log("*     [31m", body.tunnels[secure].public_url+"/pizza[0m");
    console.log("*");
    console.log("******************************************************************");
  }
});
