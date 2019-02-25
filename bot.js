const fs = require('fs')
const https = require('https');
const parseString = require('xml2js').parseString;
const Discord = require('discord.js');
const prompts = require('./prompts.json');
const userDb = require('./users/users.json');
const sql = require("sqlite");
sql.open(".data/projects.sqlite");

const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(8080);
setInterval(() => {
  https.get('https://nanowrimo-bot.glitch.me/');
}, 270000);

const client = new Discord.Client();

// TODO: Create SQL table: projects
// columns: userId TEXT, project TEXT, wordcount INTEGER, isOpen INTEGER

const nanoWords = [1667, 3333, 5000, 6667, 8333, 10000, 11667, 13333, 15000, 16667, 18333, 20000, 21667, 23333, 25000, 26667, 28333, 30000, 31667, 33333, 35000, 36667, 38333, 40000, 41667, 43333, 45000, 46667, 48333, 50000];

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

if (process.env.LANGUAGE.endsWith(".json")) {
    language = language.substring(0, str.length - 5);
}

try {
    var lang = require('./languages/' + process.env.LANGUAGE.toLowerCase() + '.json');
}
catch (e) {
    try {
        var lang = require('./languages/english.json')
        console.error('ERROR: The language could not be detected. Ensure your json file name has the same name as your language declared in auth.json.\nLoading English language by default.')
    }
    catch (e) {
        console.error('ERROR: You have deleted the english.json file. Download it from https://github.com/Omlahid/NaNoWriMo-Discord-Bot, and ensure it is in the same folder as bot.js.')
    }
}

try {
    var commands = require('./languages/commands/' + process.env.LANGUAGE.toLowerCase() + '.json');
}
catch (e) {
    try {
        var commands = require('./languages/commands/english.json')
        console.error('ERROR: The command language could not be detected. Ensure your json file name has the same name as your language declared in auth.json.\nLoading English language by default.')
    }
    catch (e) {
        console.error('ERROR: You have deleted the command english.json file. Download it from https://github.com/Omlahid/NaNoWriMo-Discord-Bot, and ensure it is in the same folder as bot.js.')
    }
}

client.on('ready', () => {
    console.log(lang.consoleLanguage);
});

// The two following variables are used only for the 'Who da best?' function

var currentMessageAuthorTime = 0;

var currentMessageAuthor = 0;

var isSprintStarted = false;

// function to log a message in the console
function logMessage(msg, author) {
    var currentTime = new Date();
    var currentHour = currentTime.getHours();
    var currentMinutes = currentTime.getMinutes();
    var currentSeconds = currentTime.getSeconds();
    var currentDay = currentTime.getDate();
    var currentMonth = currentTime.getMonth() + 1;
    var currentYear = currentTime.getFullYear();
    if (currentDay < 10) {
        currentDay = "0" + currentDay;
    }
    if (currentMonth < 10) {
        currentMonth = "0" + currentMonth;
    }
    if (currentMinutes < 10) {
        currentMinutes = "0" + currentMinutes;
    }
    if (currentSeconds < 10) {
        currentSeconds = "0" + currentSeconds;
    }
    var timeNow = currentYear + "/" + currentMonth + "/" + currentDay + " : " + currentHour + ":" + currentMinutes + ":" + currentSeconds;
    console.log("[" + timeNow + "] " + author + " " + msg);
}

function addUserToDb(id, user, house) {
    let newUser = {
        "NaNoUser": user,
        "house": house
    }
    userDb[id] = newUser;
    var pushDb = JSON.stringify(userDb);
    try {
        fs.writeFile('users/users.json', pushDb)
    }
    catch (e) {
        console.log("An error occurred while trying to save the user in the JSON:");
        console.log(e);
    }
}

function getNaNoWordcount(user) {
    return new Promise(function (resolve, reject) {
        urlToCall = "https://nanowrimo.org/wordcount_api/wc/" + user
        let req = https.request(urlToCall, res => {
            if (process.env.DEBUG == 1) {
                console.log('statusCode:', res.statusCode);
            }
            res.on('data', (d) => {
                parseString(d, function (err, result) {
                    if (result.wc.user_wordcount != null) {
                        resolve(result.wc.user_wordcount);
                    } else if (result.wc.error == "user does not exist") {
                        resolve("userNoExist");
                    } else if (result.wc.error == "user does not have a current novel") {
                        resolve("userNoNovel");
                    }
                })
            });
        });
        req.on('error', (e) => {
            console.error("Error while fetching the user wordcount :" + e);
            reject("somethingWentWrong");
        });
        req.end();
    });
}

function isEven(n) {
   return n % 2 == 0;
}

function isOdd(n) {
   return Math.abs(n % 2) == 1;
}

// register users
client.on('message', message => {
  
    const args = message.content.trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
  
    if (message.author.bot) return; // ignore bots
    if (message.channel.type === "dm") return; // ignore DM channels

    function sprintEnded() {
        message.channel.send(lang.sprintEnd);
        isSprintStarted = !isSprintStarted;
        logMessage("Sprint finished", "");
    }

    function sendRemainingSprintTime(x, min) {
        var minutesRemainingInTotal = min - ((x - 1) * 5) // A bit of math to calculate the right amount of time left
        setTimeout(function () {
            message.channel.send(lang.remainingSprintTime + minutesRemainingInTotal + lang.remainingSprintTime2);
        }, x * 5000 * process.env.DEBUG); // 5000 for seconds (testing purposes), 300000 for minutes
    }

    function startSprintDelay(length) {
        logMessage("asked for a " + length + " minute sprint", message.author.username);
        message.channel.send(lang.startSprintDelay + sprintTimeDemanded + lang.startSprintDelay2);
        isSprintStarted = !isSprintStarted;
        setTimeout(function () {
            startSprint(length)
        }, 15000);
    }

    function startSprint(length) {
        message.channel.send(lang.startSprint + sprintTimeDemanded + lang.startSprint2);
        setTimeout(sprintEnded, length * 1000 * process.env.DEBUG) // 60000 is for minutes, 1000 is for seconds (testing purposes)
        var minutesLeftToSprint = sprintTimeDemanded - 5;
        for (var x = 1, ln = length / 5; x < ln; x++ , minutesLeftToSprint - 5) {
            sendRemainingSprintTime(x, minutesLeftToSprint);
        }
    }

    // Register users
    if (message.content.toLowerCase().replaceAll(" ", "").startsWith(commands.mynameis)) {
        let id = message.author.id;
        let usermsg = message.content.replaceAll(" ", "");
        let properUser = usermsg.substring(commands.mynameis.length);
        let user = properUser.toLowerCase().replaceAll(" ", "-");
        let house = "none";
        console.log("That person's name is " + user);
        try {
            addUserToDb(id, user, house);
            console.log("user added successfully");
            message.channel.send(lang.userAdded + properUser + " :)");
        }
        catch (e) {
            console.log("Could not add user.");
            message.channel.send(lang.somethingWentWrong);
        }
    }

    // Give users their own current words
    if (message.content.toLowerCase().replaceAll(" ", "") == commands.mywords) {
        id = message.author.id;
        try {
            username = userDb[id].NaNoUser;
            getNaNoWordcount(username).then(e => {
                if (e == "0") {
                    message.channel.send(lang.noWordsYet);
                    logMessage("looked up their own words", message.author.username);
                } else if (e == "userNoExist") {
                    message.channel.send(lang.userNotFound);
                    logMessage("tried to look up their own words, but their username is wrong", message.author.username);
                } else if (e == "userNoNovel") {
                    message.channel.send(lang.userNotStarted);
                    logMessage("tried to look up their own words, but they haven't started yet", message.author.username);
                } else {
                    message.channel.send(lang.userWordcount + e);
                    logMessage("looked up their own words", message.author.username);
                }
            }).catch(function () {
                console.log("Promise Rejected");
                message.channel.send(lang.somethingWentWrong);
            })
        }
        catch (e) {
            message.channel.send(lang.usernameInvalid);
        }
    }

    // Give users someone else's wordcount
    if (message.content.toLowerCase().startsWith(commands.words)) {
        let properUser = message.content.substring(commands.words.length + 1);
        let username = properUser.toLowerCase().replaceAll(" ", "-");
        getNaNoWordcount(username).then(e => {
            if (e == "0") {
                message.channel.send(properUser + lang.noWordsYetOtherUser);
                logMessage("looked up their own words", message.author.username);
            } else if (e == "userNoExist") {
                message.channel.send(lang.userNotFound);
                logMessage("tried to look up " + properUser + ", but their username is wrong", message.author.username);
            } else if (e == "userNoNovel") {
                message.channel.send(properUser + lang.otherUserNotStarted);
                logMessage("tried to look up " + properUser + ", but they haven't started yet", message.author.username);
            } else {
                message.channel.send(properUser + lang.otherUserWordcount + e);
                logMessage("looked up the words of " + properUser, message.author.username);
            }
        }).catch(function () {
            console.log("Promise Rejected");
            message.channel.send(lang.somethingWentWrong);
        })
    }

    // Sprints
    if (message.content.startsWith(commands.sprint)) {
        if (isSprintStarted) {
            message.channel.send(lang.sprintAlreadyStarted);
        } else {
            var sprintTimeDemanded = message.content.substring(commands.sprint.length + 1);
            if (sprintTimeDemanded % 5 == 0) {
                if (sprintTimeDemanded > 60) {
                    message.channel.send(lang.sprintTooLong);
                } else {
                    startSprintDelay(sprintTimeDemanded);
                }
            } else {
                message.channel.send(lang.sprintIntervalLength)
            }
        }
    }

    // Get wordcount during NaNoWriMo
    if (message.content == commands.wordcount) {
        let today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth() + 1;
        if (mm < 11) {
            message.channel.send(lang.NanoNotStartedYet);
        } else if (mm > 11) {
            message.channel.send(lang.NanoOver);
        } else {
            let todayWords = nanoWords[dd - 1]
            message.channel.send(lang.todayWordcount + todayWords + ".");
        }
    }

    // Who da best?
    if (message.content.toLowerCase() == 'who da best?') {
        let whoDaBestRand = Math.floor(Math.random() * 100)

        if (whoDaBestRand == 1) {
            message.channel.send("Omlahid is da best!");
        } else if (whoDaBestRand == 2) {
            message.channel.send("I am. I am the best.");
        } else {
            var newMessageAuthor = 0;
            newMessageAuthor = message.author.id;
            if (currentMessageAuthor != newMessageAuthor) {
                currentMessageAuthor = newMessageAuthor;
                currentMessageAuthorTime *= 0;
            } else {
                currentMessageAuthorTime++;
            }
            if (currentMessageAuthorTime > 1) {
                message.reply(lang.stopWhoDaBest);
            } else {
                message.reply(lang.whoDaBest)
            }
        }
    }
  
    function rndCheer() {
      // var int = Math.floor(Math.random() * (0 - 10)) + 10;
      // if(isEven(int)) {
        message.channel.send(lang.cheering1);
      // }
      // else {
      //   message.channel.send(lang.cheering2);
      // }
    }

    // Cheer! :cheer:
    if (message.content == commands.cheer) {
        rndCheer();
    }
  
    // Ganbatte!
    if (message.content == commands.ganbatte) {
       message.channel.send(lang.ganbatte1); 
    }

    // Prompts
    if (message.content == commands.prompt) {
        var themes = prompts.writingPrompts;
        var randomNumberRaw = Math.floor(Math.random() * (themes.length) - 1);
        var thisPrompt = themes[randomNumberRaw];
        message.channel.send(lang.showPrompt + thisPrompt);
        logMessage("received prompt number " + randomNumberRaw, message.author.username)
    }

    // !help
    if (message.content == commands.help || message.content == "!help") {
        message.channel.send(lang.helpMessage);
    }

    // Pokemon
    if (message.content.includes("pokemon")) {
        logMessage(" mentionned pokemon", message.author.username);
    }

    // Glow Cloud
    if (message.content.includes("glow cloud")) {
        message.channel.send("All Hail the Glow Cloud");
        logMessage("All Hail the Glow Cloud", "");
    }
  
    // kamikorosu
    if (message.content.includes("kamikorosu")) {
        message.channel.send(lang.kamikorosu);
        logMessage("bit someone to death.", message.author.username);
    }
  
    function zoidberg() {
      var int = Math.floor(Math.random() * (0 - 10)) + 10;
      if(isEven(int)) {
        message.channel.send(lang.zoidberg1);
      }
      else {
        message.channel.send(lang.zoidberg2);
      }
    }
  
    if (message.content.includes("why not zoidberg")) {
        zoidberg();
    }
  
    function addUpdateProj(act, userid, proj, wdc) {
		if(act == 1) {  // add project
			sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}').then(row => {
				if (!row) { // can't find the row
					sql.run("INSERT INTO projects (userId, project, wordcount, isOpen) VALUES (?, ?, ?, ?)", [userid, proj, wdc, 1]);
				} else { // can find row
					message.channel.send(message.author.username + ", a project named '" + proj + "' already exists. Try updating it instead.");
				}
			}).catch(() => {
			console.error; // log error
				sql.run("CREATE TABLE IF NOT EXISTS projects (userId TEXT, project TEXT, wordcount INTEGER, isOpen INTEGER)").then(() => {
					sql.run("INSERT INTO projects (userId, project, wordcount, isOpen) VALUES (?, ?, ?, ?)", [userid, proj, wdc, 1]);
				});
			});
		} else if(act == 2) {  // update project
			var oldwc = -1;
			sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}"').then(row => {
				if (!row) { // can't find the row
					message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found. Try creating it instead.");
				} else { // can find row
					if(row.isOpen == 1) {
						oldwc = row.wordcount;
						sql.run('UPDATE projects SET wordcount = ${wdc} WHERE userId = ${userid} AND project = ${proj}');
						return oldwc;
					} else {
						return -2;
					}
				}
				}).catch(() => {
					console.error; // log error
					message.channel.send("An error occurred. Unable to fulfill request.");
					return oldwc;
				});
		} else if(act == 3) {  // check project
			sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}"').then(row => {
				if (!row) { // can't find row
					message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found. Try creating it instead.");
					return -1;
				} else { // found row
					var result = [row.project, row.wordcount, row.isOpen];
					return result;
				}
			});
		} else if(act == 4) { // close project
			sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}').then(row => {
				if (!row) { // can't find row
					message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found.");
				} else { // found row
					sql.run('UPDATE projects SET isOpen = 0 WHERE userId = ${userid}');
					message.channel.send(message.author.username + ", project named '" + proj + "' has been closed. No further updates can be made to it.");
				}
			});
		} else {
			message.channel.send("An error occurred. Unable to fulfill request.");
			return -1;
		}
    }
	
	function addProject(userid, proj, wdc) {
		sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}').then(row => {
			if (!row) { // can't find the row
				sql.run("INSERT INTO projects (userId, project, wordcount, isOpen) VALUES (?, ?, ?, ?)", [userid, proj, wdc, 1]);
				var msg = message.author.username + " added project '" + args[0] + "' with a wordcount of " + args[1] + ".";
				message.channel.send(msg);
			} else { // row found
				message.channel.send(message.author.username + ", a project named '" + proj + "' already exists. Try updating it instead.");
			}
		}).catch(() => {
		console.error; // log error
			// TODO:  will be created earlier in code.  need to determine what to do in this catch. probably just throw an exception and let user know
			sql.run("CREATE TABLE IF NOT EXISTS projects (userId TEXT, project TEXT, wordcount INTEGER, isOpen INTEGER)").then(() => {
				sql.run("INSERT INTO projects (userId, project, wordcount, isOpen) VALUES (?, ?, ?, ?)", [userid, proj, wdc, 1]);
			});
		});
	}
	
    if(cmd == commands.addproject) {
		addProject(message.author.id, args[0], args[1]);
		//if(er != -1) {
		//	var msg = message.author.username + " added project '" + args[0] + "' with a wordcount of " + args[1] + ".";
		//	message.channel.send(msg);
		//}
    }
	
	function updateProject(userid, proj, wdc) {
		var oldwc = -1;
		var msg = "";
		sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}"').then(row => {
			if (!row) { // can't find the row
				message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found. Try creating it instead.");
			} else { // can find row
				if(row.isOpen == 1) {
					oldwc = row.wordcount;
					sql.run('UPDATE projects SET wordcount = ${wdc} WHERE userId = ${userid} AND project = ${proj}');
					msg = message.author.username + "updated their project!\nProject: " + proj + "\nOld Wordcount: " + oldwc + "\nNew Wordcount: " + wdc;
				} else {
					var msg = message.author.username + ", project '" + proj + "' is already closed and cannot be updated.";
				}
				message.channel.send(msg);
			}
		}).catch(() => {
			console.error; // log error
			message.channel.send("An error occurred. Unable to fulfill request.");
		});
	}
	
	if(cmd == commands.updateproject) {
		updateProject(message.author.id, args[0], args[1]);
		/*if(oldwc >= 0) {
			var msg = message.author.username + "updated their project!\nProject: " + args[0] + "\nOld Wordcount: " + oldwc + "\nNew Wordcount: " + args[1];
			message.channel.send(msg);
		} else if (oldwc == -2) {
			var msg = message.author.username + ", project '" + args[0] + "' is already closed and cannot be updated.";
			message.channel.send(msg);
		} */
	}
	
	function checkProject(userid, proj) {
		sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}"').then(row => {
			if (!row) { // can't find row
				message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found. Try creating it instead.");
			} else { // found row
				//var result = [${row.project}, ${row.wordcount}, ${row.isOpen}];  // TODO: find proper way to retrieve value from row
				var state = (row.isOpen == 0) ? "closed" : "open";
				var msg = "User: " + message.author.username + "\nProject: " + row.project + "\nWordcount: " + row.wordcount + "\nState: " + state;
				message.channel.send(msg);
			}
		});
	}
	
	if(cmd == commands.checkproject) {
		checkProject(message.author.id, args[0], 0);
		/*if(result != -1) {
			var state = (result[2] == 0) ? "closed" : "open";
			var msg = "User: " + message.author.username + "\nProject: " + result[0] + "\nWordcount: " + result[1] + "\nState: " + state;
			message.channel.send(msg);
		} */
	}
	
	function closeProject(userid, proj) {
		sql.get('SELECT * FROM projects WHERE userId = "${userid}" AND project = "${proj}').then(row => {
			if (!row) { // can't find row
				message.channel.send("Sorry, " + message.author.username + ", no project named '" + proj + "' was found.");
			} else { // found row
				sql.run('UPDATE projects SET isOpen = 0 WHERE userId = ${userid}');
				message.channel.send(message.author.username + ", project named '" + proj + "' has been closed. No further updates can be made to it.");
			}
		});
	}
	
	if(cmd == commands.closeproject) {
		closeProject(message.author.id, args[0]);
	}
});

// Client token, required for the bot to work
try {
    client.login(process.env.TOKEN);
}
catch (e) {
    console.log("ERROR: No account was linked to your bot. Please provide a valid authentication token. You can change it in the auth.json file.")
}