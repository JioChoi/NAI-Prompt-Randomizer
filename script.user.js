// ==UserScript==
// @name         Novel AI Diffusion Prompt Randomizer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Generates random prompt for NovelAI Diffusion.
// @author       Jio Choi
// @match        https://novelai.net/image
// @icon         https://novelai.net/icons/novelai-square.png

// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js

// @run-at       document-start
// ==/UserScript==

waitForKeyElements("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div.sc-3d6b2fa3-0.dMKbrR > div:nth-child(5)", init, true);

var tagData = null;
var artistList = null;
var characterList = null;
var whitelist = null;

function init() {
	downloadLists();
	editMobileUI();
}

function downloadLists() {
	let req = new XMLHttpRequest();
	req.open("GET", "https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/artist_list.txt", true);
	req.responseType = "text";

	req.onload = function (e) {
		artistList = req.response.split("\n");
		console.log("download complete");
		console.log(artistList.length);
	}

	req.send(null);

	let req2 = new XMLHttpRequest();
	req2.open("GET", "https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/character_list.txt", true);
	req2.responseType = "text";

	req2.onload = function (e) {
		characterList = req2.response.split("\n");
		console.log("download complete");
		console.log(characterList.length);
	}

	req2.send(null);

	let req3 = new XMLHttpRequest();
	req3.open("GET", "https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/whitelist.txt", true);
	req3.responseType = "text";

	req3.onload = function (e) {
		whitelist = req3.response.split("\n");
		console.log("download complete");
		console.log(whitelist.length);
	}

	req3.send(null);
}

function loadCSV() {
	// .csv file import
	let req = new XMLHttpRequest();
	req.open("GET", "https://huggingface.co/Jio7/NAI-RPG/resolve/main/tags.csv", true);
	req.responseType = "arraybuffer";

	req.onload = function (e) {
		tagData = new Uint8Array(req.response);
		console.log("download complete");
	}

	req.onprogress = function (e) {
		if(e.lengthComputable) {
			var percentComplete = (e.loaded / e.total * 100).toFixed(2);
			console.log(percentComplete + "%");
		}
	}
	req.send(null);
}

function removeNextLine(element) {
	element.value = element.value.replace(/(\r\n|\n|\r)/gm, "");
}

function editMobileUI() {
	let query = null;

	/* Edit UI */
	/* edit generate button */
	document.querySelector("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) > div.sc-3d6b2fa3-31.EONfl > div > button")
		.style = "width: calc(100% - 48px);";

	/* create random button */
	let button = document.createElement('button');
	button.innerHTML = "";
	button.className = "sc-d72450af-1 sc-3d6b2fa3-20 kXFbYD rYFlR";
	button.style = "width: 44px; height: 44px; margin-left: 4px; padding: 0;";
	button.onclick = () => {generateRandomPrompt("mobile")};

	/* steal dice icon */
	let icon = document.createElement('div');
	icon.className = "sc-876067fe-0 sc-876067fe-128 flOuWA gTtUqd";
	icon.style = "width: 24px; height: 24px; margin: 12px; background: #13152c;";

	button.appendChild(icon);

	/* add random button */
	query = document.querySelector("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) > div.sc-3d6b2fa3-31.EONfl > div");
	query.appendChild(button);

	query.style = "display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%;";

	

	/* Change options */
	query = document.querySelector("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) > div.sc-3d6b2fa3-28.kjKUlz > div > div > div");

	// set maximum height
	document.querySelector("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) > div.sc-3d6b2fa3-28.kjKUlz > div > div")
		.style = "max-height: 70vh;";

	// div
	let div = document.createElement('div');
	div.style = "display: none;";

	// beginning prompt title
	let begtitle = document.createElement('div');
	begtitle.innerHTML = "Beginning Prompt";
	begtitle.className = "sc-3d6b2fa3-3 iaAGjm";
	begtitle.style = "padding-bottom: 5px; font-size: 1rem; font-weight: 600;";

	// beginning prompt
	let begprompt = document.createElement('textarea');
	begprompt.placeholder = "Prompt to put at the beginning.";
	begprompt.style = "width: 100%; font-size: 1rem; height: 62px !important;";
	begprompt.setAttribute("autocomplete", "off");
	begprompt.setAttribute("spellcheck", "true");
	begprompt.className = "sc-5db1afd3-45 fnzOi";
	begprompt.id = "mobile_begprompt";

	begprompt.addEventListener('input', () => {
		removeNextLine(begprompt)
	});

	// search options title
	let searchtitle = document.createElement('div');
	searchtitle.innerHTML = "Prompt Search Options";
	searchtitle.className = "sc-3d6b2fa3-3 iaAGjm";
	searchtitle.style = "padding-bottom: 5px; font-size: 1rem; font-weight: 600;";

	// search including
	let including = document.createElement('textarea');
	including.placeholder = "Search for prompts including... (~ for excluding)";
	including.style = "width: 100%; font-size: 16px; height: 62px !important;";
	including.className = "sc-5db1afd3-45 fnzOi";
	including.id = "mobile_including";

	including.addEventListener('input', () => {
		removeNextLine(including)
	});

	// remove options
	let removeOption = document.createElement('div');
	removeOption.style = "display: flex; flex-direction: row; justify-content: center; align-items: center; padding-bottom: 15px; padding-top: 5px; width: 100%; background-color: rgb(14, 15, 33)";

	// remove artist
	let removeArtist = document.createElement('input');
	removeArtist.type = 'checkbox';
	removeArtist.id = 'mobile_removeArtist';
	removeArtist.style = "margin-left: 10px; margin-right: 10px; width: 15px; height: 15px";
	let removeArtistLabel = document.createElement('label');
	removeArtistLabel.htmlFor = 'mobile_removeArtist';
	removeArtistLabel.innerHTML = 'Remove artist';
	removeArtistLabel.style = "font-size: 1rem; margin-right: 20px;";
	removeOption.appendChild(removeArtist);
	removeOption.appendChild(removeArtistLabel);

	// remove character
	let removeCharacter = document.createElement('input');
	removeCharacter.type = 'checkbox';
	removeCharacter.id = 'mobile_removeCharacter';
	removeCharacter.style = "margin-left: 10px; margin-right: 10px; width: 15px; height: 15px";
	let removeCharacterLabel = document.createElement('label');
	removeCharacterLabel.htmlFor = 'mobile_removeCharacter';
	removeCharacterLabel.innerHTML = 'Remove character';
	removeCharacterLabel.style = "font-size: 16px;";
	removeOption.appendChild(removeCharacter);
	removeOption.appendChild(removeCharacterLabel);

	// ending prompt title
	let endtitle = document.createElement('div');
	endtitle.innerHTML = "Ending Prompt";
	endtitle.className = "sc-3d6b2fa3-3 iaAGjm";
	endtitle.style = "padding-bottom: 5px; font-size: 1rem; font-weight: 600;";

	// ending prompt
	let endprompt = document.createElement('textarea');
	endprompt.placeholder = "Prompt to put at the end.";
	endprompt.style = "width: 100%; font-size: 1rem; height: 62px !important; margin-bottom: 40px;";
	endprompt.setAttribute("autocomplete", "off");
	endprompt.setAttribute("spellcheck", "true");
	endprompt.className = "sc-5db1afd3-45 fnzOi";
	endprompt.id = "mobile_endprompt";

	endprompt.addEventListener('input', () => {
		removeNextLine(endprompt)
	});

	// import button title
	let imptitle = document.createElement('div');
	imptitle.innerHTML = "Prompt Randomizer";
	imptitle.className = "sc-3d6b2fa3-3 iaAGjm";
	imptitle.style = "padding-bottom: 5px; font-size: 1rem; font-weight: 600;";

	// import button
	let file = document.createElement('input');
	file.type = 'file';
	file.accept = '.csv';
	file.className = "sc-5db1afd3-45 fnzOi";
	file.style = "display: block; padding-bottom: 15px;";

	file.addEventListener('change', () => {
		const reader = new FileReader();
		reader.onload = () => {
			file.style = "display: none;";
			imptitle.style = "display: none;";

			console.log("start");
			tagData = new Uint8Array(reader.result);
			console.log("done");

			div.style.display = "block";
		}

		reader.readAsArrayBuffer(file.files[0]);
	});

	// add elements
	div.appendChild(begtitle);
	div.appendChild(begprompt);
	div.appendChild(searchtitle);
	div.appendChild(including);
	div.appendChild(removeOption);
	div.appendChild(endtitle);
	div.appendChild(endprompt);

	query.insertBefore(div, query.firstChild);
	query.insertBefore(file, query.firstChild);
	query.insertBefore(imptitle, query.firstChild);
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

function generateRandomPrompt(device) {
	if (tagData == null) {
		console.log("tagData is null");
		return;
	}

	let deviceTitle = device += "_";

	let begprompt = strToList(document.getElementById(deviceTitle + "begprompt").value + "");
	let including = strToList(document.getElementById(deviceTitle + "including").value.replace("_", " ") + "");
	let removeArtist = document.getElementById(deviceTitle + "removeArtist").checked;
	let removeCharacter = document.getElementById(deviceTitle + "removeCharacter").checked;
	let endprompt = strToList(document.getElementById(deviceTitle + "endprompt").value + "");

	let negative = localStorage.getItem("imagegen-negativeprompt");
	negative = negative.substring(1, negative.length - 1);
	negative = strToList(negative);

	let prompt = findPrompt(including);

	if (prompt == null) {
		alert("No prompt found.");
		return;
	}

	prompt = strToList(prompt);

	prompt = removeEmptyElements(prompt);

	prompt = removeListFromList(negative, prompt);
	prompt = removeListFromList(begprompt, prompt);
	prompt = removeListFromList(endprompt, prompt);

	if (removeArtist) {
		prompt = removeListFromList(artistList, prompt);
	}

	if (removeCharacter) {
		prompt = removeListFromList(characterList, prompt);
	}

	prompt = onlyInLists(prompt, whitelist, artistList, characterList);
	prompt = combinePrompt(begprompt, prompt, endprompt);

	promptTextarea = document.querySelector("#__next > div.sc-5db1afd3-0.fgpNYC > div:nth-child(4) > div:nth-child(2) > div:nth-child(3) > div.sc-3d6b2fa3-28.kjKUlz > div > div > div > div:nth-child(5) > textarea");
	promptTextarea.value = prompt;
}

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

	for(var i = 0; i < 10000; i++) {
		let prompt = getRandomPrompt();
		if (including.length == 0 || listInList(including, strToList(prompt))) {
			if (excluding.length != 0 && listInList(excluding, strToList(prompt))) {
				continue;
			}

			console.log("found " + i);
			return prompt;
		}
	}

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
		if (!list2.includes(list1[i])) {
			return false;
		}
	}

	return true;
}

function removeListFromList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			list2.splice(list2.indexOf(list1[i]), 1);
		}
	}

	return list2;
}

function onlyInLists(list1, list2, list3, list4) {
	let list = [];

	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			list.push(list1[i]);
		}
		else if (list3.includes(list1[i])) {
			list.push(list1[i]);
		}
		else if (list4.includes(list1[i])) {
			list.push(list1[i]);
		}
	}

	return list;
}

function getRandomPrompt() {
	if (tagData == null) {
		console.log("tagData is null");
		return;
	}

	let prompt = "";

	let randomIndex = Math.floor(Math.random() * tagData.length);
	let value = tagData[randomIndex];
	let startPoint = randomIndex;
	let endPoint = randomIndex;

	// Unlucky indexing
	if(value == 13 || value == 10) {
		return getRandomPrompt();
	}

	// Find start point
	while (tagData[startPoint] != 13 && tagData[startPoint] != 10) {
		startPoint--;
	}
	startPoint += 2;

	// Find end point
	while (tagData[endPoint] != 13 && tagData[endPoint] != 10) {
		endPoint++;
	}
	endPoint--;

	// Get prompt
	prompt = new TextDecoder("utf-8").decode(tagData.slice(startPoint, endPoint));

	return prompt;
}

function combinePrompt(beg, mid, end) {
	let prompt = beg.concat(mid).concat(end).join(", ");

	while (prompt.length > 225 && mid.length > 0) {
		mid.pop();
		prompt = beg.concat(mid).concat(end).join(", ");
	}

	if(prompt.length > 225) {
		return beg.concat(end).join(", ").substring(0, 225);
	}

	return prompt;
}