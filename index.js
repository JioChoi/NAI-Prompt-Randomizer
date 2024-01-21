const express = require('express');
const cors = require('cors');
const request = require('request');
const fs = require('fs');
const os = require('os');
const { randomBytes } = require('crypto');

var app = express();
let tagData = null;
let posDict = null;
let tagPosDict = null;

app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

app.use('/js', express.static(__dirname + '/js'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/dataset', express.static(__dirname + '/dataset'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/node_modules/argon2-browser/dist', express.static(__dirname + '/node_modules/argon2-browser/dist'));
app.use('/node_modules/unzipit/dist', express.static(__dirname + '/node_modules/unzipit/dist'));

app.use(cors({
	origin: '*',
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
	credentials: true,
	optionsSuccessStatus: 200
}));

async function loadCSV() {
	console.log("Loading CSV");
	tagData = new Uint8Array(fs.readFileSync("../tags.csv"));
	console.log("Loaded tags.csv");

	posDict = new Uint8Array(fs.readFileSync("../posdict.csv"));
	console.log("Loaded posdict.csv");

	tagPosDict = new Uint8Array(fs.readFileSync("../tagdict.csv"));
	tagPosDict = new TextDecoder("utf-8").decode(tagPosDict).split("\n");

	for(var i = 0; i < tagPosDict.length; i++) {
		tagPosDict[i] = tagPosDict[i].split("|");
	}
	tagPosDict = tagPosDict.reverse();

	console.log("Loaded tagdict.csv");

	console.log("Loaded CSV");
	// Log memory usage out of total in GB
	const used = process.memoryUsage().heapUsed;
	const total = os.totalmem();
	const free = os.freemem();

	console.log(`Memory usage: ${Math.round(used / 1024 / 1024 * 100) / 100} MB out of ${Math.round(total / 1024 / 1024 * 100) / 100} MB`);
	console.log(`Free memory: ${Math.round(free / 1024 / 1024 * 100) / 100} MB`);
}

function getTagPos(including) {
	let pos = -1;

	for (var i = 0; i < tagPosDict.length; i++) {
		let temp = tagPosDict[i];

		for (var tag of including) {
			if (temp[0] === tag || temp[0] === tag.replace(/_/g, " ")) {
				pos = i;
				break;
			}
		}

		if (pos != -1) {
			break;
		}
	}

	if (pos == -1) {
		console.log("pos not found");
		return null;
	}

	return pos;
}

function getRandomTagDataPos(pos) {
	let startPos = parseInt(tagPosDict[pos][1]);
	let endPos = posDict.length - 1;

	if (pos != 0) {
		endPos = parseInt(tagPosDict[pos - 1][1]);
	}

	let randomIndex;
	do {
		randomIndex = Math.floor(Math.random() * (endPos - startPos) + startPos);
	} while(posDict[randomIndex] == 0x2C);

	return randomIndex;
}

function getPromptFromIndex(index) {
	let endIndex = index;
	while(tagData[endIndex] != 0x0A) {
		endIndex++;
	}

	let prompt = new TextDecoder("utf-8").decode(tagData.slice(index, endIndex));

	return prompt;
}

function getRandomPrompt(including, excluding) {
	let pos = getTagPos(including);

	if (pos == null) {
		return null;
	}

	let randomIndex = getRandomTagDataPos(pos);
	let index = findBetween(randomIndex);
	let prompt = getPromptFromIndex(index);

	return prompt;
}

function findBetween(pos) {
	let startPos = pos;
	let endPos = pos;

	while(!(posDict[startPos] == 0x2C || startPos == -1 || posDict[startPos] == 0x0A)) {
		startPos--;
	}

	while(!(posDict[endPos] == 0x2C || endPos == posDict.length - 1 || posDict[endPos] == 0x0A)) {
		endPos++;
	}

	let position = new TextDecoder("utf-8").decode(posDict.slice(startPos + 1, endPos));
	return position;
}

app.post('/tags', function (req, res, next) {
	if (tagData == null) {
		console.log("tagData is null");
		res.send("tagData is null");
		return;
	}

	let including = req.body.including;
	let prompt = findPrompt(including);
	res.send(prompt);
});

function findPrompt(including) {
	let excluding = [];
	for (var i = 0; i < including.length; i++) {
		if (including[i].startsWith("~")) {
			excluding.push(including[i].substring(1));
			including.splice(i, 1);
			i--;
		}
	}

	including = removeEmptyElements(including);
	excluding = removeEmptyElements(excluding);

	let minScore = -1;

	for (item of including) {
		if (item.substring(0, 6) === 'score>') {
			let score = parseInt(item.substring(6));
			including.splice(including.indexOf(item), 1);
			minScore = score;
		}
	}

	for(var i = 0; i < 1000; i++) {
		let prompt = getRandomPrompt(including);
		if(prompt == null) {
			return null;
		}

		const data = prompt.split("|");
		const score = data[0];
		const rating = data[1];
		const prom = data[2];

		if (score <= minScore) {
			continue;
		}

		if (including.length == 0 || allInList(including, strToList(prom))) {
			if (excluding.length != 0 && listInList(excluding, strToList(prom))) {
				continue;
			}

			console.log("found " + i);
			return prom;
		}
	}

	console.log("not found");

	return null;
}

function removeEmptyElements(list) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].trim() == "") {
			list.splice(i, 1);
			i--;
		}
	}

	return list;
}

function listInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			return true;
		}
	}

	return false;
}

function allInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		if (!list2.includes(list1[i])) {
			return false;
		}
	}

	return true;
}

function strToList(str) {
	str = str.trim();
	if(str == "") return [];

	let list = str.split(",");
	for (let i = 0; i < list.length; i++) {
		list[i] = list[i].trim();
	}

	return list;
}

// function getRandomPrompt() {
// 	let prompt = "";

// 	let randomIndex = Math.floor(Math.random() * tagData.length);
// 	let value = tagData[randomIndex];
// 	let startPoint = randomIndex;
// 	let endPoint = randomIndex;

// 	// Unlucky indexing
// 	if(value == 13 || value == 10) {
// 		return getRandomPrompt();
// 	}

// 	// Find start point
// 	while (tagData[startPoint] != 13 && tagData[startPoint] != 10) {
// 		startPoint--;
// 	}
// 	startPoint += 2;

// 	// Find end point
// 	while (tagData[endPoint] != 13 && tagData[endPoint] != 10) {
// 		endPoint++;
// 	}
// 	endPoint--;

// 	// Get prompt
// 	prompt = new TextDecoder("utf-8").decode(tagData.slice(startPoint, endPoint));

// 	return prompt;
// }

app.post('/api*', function(req, res, next) {
	request('https://api.novelai.net' + req.url.substring(4), {
		method: 'POST',
		json: req.body,
		headers: {
			'Authorization': req.headers.authorization,
			'Content-Type': 'application/json',
		}

	})
	.on('error', function(err) {
		console.log(err);
	})
	.pipe(res);
});

app.get('/api*', function(req, res, next) {
	request({
		url: 'https://api.novelai.net' + req.url.substring(4),
		headers: {
			'Authorization': req.headers.authorization
		}
	}).pipe(res);
});

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/index.html');
});

app.listen(80, function() {
	console.log('Listening on port 80!');
	loadCSV();
});