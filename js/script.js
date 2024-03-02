// Server HOST Address (Change this to your server address)
let host = 'https://jio7-prombot.hf.space';
// host = 'http://127.0.0.1';
let key = null;

const example = '{"begprompt":"1girl, {{kirisame marisa}}, {{kakure eria, sangbob}}","including":"1girl, ~speech bubble, ~commentary, ~blood, ~gun, ~guro, ~bdsm, ~shibari, ~butt plug, ~object insertion, ~pregnant","removeArtist":true,"removeCharacter":true,"removeCharacteristic":true,"removeCopyright":true,"removeAttire":true,"nonsfw": true, "endprompt":"{{{volumetric lighting, depth of field, best quality, amazing quality, very aesthetic, highres, incredibly absurdres}}}","negativePrompt":"{{{worst quality, bad quality}}}, text, error, extra digit, fewer digits, jpeg artifacts, signature, watermark, username, reference, unfinished, unclear fingertips, twist, Squiggly, Grumpy, incomplete, {{Imperfect Fingers}}, Cheesy, very displeasing}}, {{mess}}, {{Approximate}}, {{Sloppiness}}, Glazed eyes, watermark, username, text, signature, fat, sagged breasts","width":"832","height":"1216","step":"28","promptGuidance":"5","promptGuidanceRescale":"0","seed":"","sampler":"Euler Ancestral","smea":true,"dyn":false,"delay":"8","infoextract":"1","refstrength":"0.6","automation":false,"autodownload":false,"ignorefail":false,"reorderTags":true}';

let scrolled = false;

let artistList;
let characterList;
let characteristicList;
let whitelist;
let censorList;
let copyrightList;
let numberList;
let qualityList;
let attireList;

let vibeImage = null;

let whitelistSeparated = [];
let tagDataLength = 0;

let generateProgress = 0;

let preventReload = false;

let tagSuggestElement = null;
let keys = [];
let progress = 0;

let previousPos = null;
let previousIncluding = '';

let mobile = false;
let worker = new Worker('js/worker.js');

let controller = new AbortController();

let wildcards = {};

// On page load
window.onload = async function () {
	// Check if huggingface is down
	// try {
	// 	let res = await fetch('https://huggingface.co/', { method: 'HEAD' });
	// 	if (!res.ok) {
	// 		console.log("HUGGINGFACE IS DOWN!!!!");
	// 		document.getElementById('maintenance').style.display = 'flex';
	// 		return;
	// 	}
	// } catch (e) {
	// 	console.log("HUGGINGFACE IS DOWN!!!!");
	// 	document.getElementById('maintenance').style.display = 'flex';
	// 	return;
	// }
	

	downloadLists();
	await loginWithAccessToken();

	checkMobile();
	resizeOptions();

	loadOptions();
	loadSettings();

	css();
	addEventListeners();
	checkDYN();

	// Remove Loading Screen
	document.getElementById('loading').style.display = 'none';
};


// Init css elements
function css() {
	// Get preset data
	let list = localStorage.getItem('preset_list');
	if (list == null) {
		list = 'default';
		localStorage.setItem('preset_list', list);
	}

	list = list.split('\n');
	for (let i = 0; i < list.length; i++) {
		addPresetItem(list[i]);
	}

	const image = document.getElementById('image');

	// Move maid
	let maid = document.getElementById('maid');
	setInterval(() => {
		if (maid.style.visibility == 'visible') {
			let maidPos = Number(maid.style.right.substring(0, maid.style.right.length - 2));
			maidPos += 1;
			maid.style.right = maidPos + 'px';

			if (maidPos > image.clientWidth + 200) {
				maid.style.right = '-100px';
			}
		}
	}, 10);

	//Set minimum height for textareas
	const textareas = document.getElementsByTagName('textarea');
	Array.from(textareas).forEach((textarea) => {
		let minHeight = textarea.rows * 25 + 24;
		textarea.style.minHeight = minHeight + 'px';

		new ResizeObserver(() => {
			localStorage.setItem('settings', JSON.stringify(getSettings()));
		}).observe(textarea);
	});

	// Disable dragging for h2 elements
	Array.from(document.getElementsByTagName('h2')).forEach((h2) => {
		h2.setAttribute('draggable', 'false');
	});
}

function addEventListeners() {
	// Init clicklistener
	document.querySelectorAll('[clicklistener]').forEach((element) => {
		element.addEventListener('click', (e) => {
			eval(element.getAttribute('clicklistener'));
		});

		element.addEventListener('touchstart', (e) => {
			scrolled = false;
		});

		element.addEventListener('touchend', (e) => {
			if (scrolled == false) {
				eval(element.getAttribute('clicklistener'));
				e.preventDefault();
			}
		});
	});

	document.getElementById('items').addEventListener('scroll', (e) => {
		scrolled = true;
	});

	window.addEventListener('beforeunload', (e) => {
		if (preventReload) {
			e.preventDefault();
			e.returnValue = true;
		}
	});

	// Vibe loader
	let vibe = document.getElementById('vibe');
	let vibeUpload = document.getElementById('vibeUpload');
	vibeUpload.addEventListener('change', (e) => {
		const file = vibeUpload.files[0];
		vibe.style.backgroundImage = 'url("' + URL.createObjectURL(file) + '")';

		document.getElementById('vibeUploader').style.display = 'none';
		document.getElementById('vibe').style.display = 'block';

		let reader = new FileReader();
		reader.onload = (e) => {
			vibeImage = btoa(reader.result);
		};

		reader.readAsBinaryString(file);

		vibeUpload.value = '';
	});

	document.getElementById('closeVibe').addEventListener('click', (e) => {
		document.getElementById('vibe').style.display = 'none';
		document.getElementById('vibeUploader').style.display = 'block';
		vibe.style.backgroundImage = 'none';

		vibeImage = null;
	});

	// Wildcard Loader
	let wildcard = document.getElementById('wildcards');
	wildcard.addEventListener('change', (e) => {
		const files = wildcard.files;

		for (let i = 0; i < files.length; i++) {
			const name = files[i].name.substring(0, files[i].name.length - 4);
			const reader = new FileReader();
			reader.onload = (e) => {
				let data = reader.result;
				data = data.replace(/\r/g, '');
				data = data.split('\n');

				for (let i = 0; i < data.length; i++) {
					data[i] = data[i].trim();

					if (data[i] == '' || data[i][0] == '#') {
						data.splice(i, 1);
						i--;
					}
				}

				localStorage.setItem('wildcard_' + name, data.join('\n'));
				wildcards[name] = data;
				whitelist.push('__' + name + '__');
				whitelistSeparated.push(('__' + name + '__').toLowerCase().split(' '));
			};

			reader.readAsText(files[i]);
		}

		wildcard.value = '';
	});

	// Image Uploader
	const imageUploader = document.getElementById('imageUploader');
	window.addEventListener('drop', (e) => {
		imageUploader.classList.remove('shown');

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (file.type.match('image/png')) {
				getExif(URL.createObjectURL(file)).then((data) => {
					let options = getOptions();
					options.begprompt = data.prompt;
					options.negativePrompt = data.uc;
					let optionsStr = JSON.stringify(options, null, 4);
					setOptions(optionsStr);
					localStorage.setItem('options', optionsStr);
				});
			}
		}

		e.preventDefault();
	});

	window.addEventListener('dragover', (e) => {
		if (e.dataTransfer.types.includes('Files')) {
			imageUploader.classList.add('shown');
			e.preventDefault();
		}
	});

	imageUploader.addEventListener('dragleave', (e) => {
		imageUploader.classList.remove('shown');
		e.preventDefault();
	});

	// Sidebar event listener for auto saving parameter changes
	const sidebarItems = document.getElementById('items');
	sidebarItems.addEventListener('change', (e) => {
		const options = getOptions();
		const optionsStr = JSON.stringify(options, null, 4);
		checkDYN();
		localStorage.setItem('options', optionsStr);
	});
	sidebarItems.addEventListener('click', (e) => {
		const options = getOptions();
		const optionsStr = JSON.stringify(options, null, 4);
		checkDYN();
		localStorage.setItem('options', optionsStr);
	});

	initDropdowns();

	// Init input fields
	const seedElement = document.getElementById('seed');

	// Select all text when clicked
	seedElement.addEventListener('click', (e) => {
		seedElement.select();
	});

	// Only allow numbers
	seedElement.addEventListener('input', (e) => {
		seedElement.value = seedElement.value.replace(/\D/g, '');
		if (seedElement.value.length > 10) {
			seedElement.value = seedElement.value.substring(0, 10);
		}
	});

	initSliders();

	initImageInfo();
	initLoginScreen();
	initTagAutoComplete();

	// Init download button
	const download = document.getElementById('download');
	download.addEventListener('click', (e) => {
		if (document.getElementById('result').src != '') {
			let a = document.createElement('a');
			a.href = document.getElementById('result').src;
			a.download = 'image.png';
			a.click();
		}
	});
}

function initImageInfo() {
	// Init image info
	const image = document.getElementById('image');
	const result = document.getElementById('result');
	const info = document.getElementById('info');
	const download = document.getElementById('download');

	result.addEventListener('mouseenter', (e) => {
		if (mobile) return;
		resizeInfo();
		info.classList.add('shown');
		download.classList.add('shown');
		image.classList.add('top');
	});
	info.addEventListener('mouseenter', (e) => {
		if (mobile) return;
		resizeInfo();
		info.classList.add('shown');
		download.classList.add('shown');
		image.classList.add('top');
	});
	download.addEventListener('mouseenter', (e) => {
		if (mobile) return;
		resizeInfo();
		info.classList.add('shown');
		download.classList.add('shown');
		image.classList.add('top');
	});

	result.addEventListener('click', (e) => {
		if (!mobile) return;
		if (!info.classList.contains('shown')) {
			resizeInfo();
			info.classList.add('shown');
			download.classList.add('shown');
			image.classList.add('top');
			result.classList.add('top');
			hideHistory();
			hidePreset();

			document.getElementById('sidebar').classList.remove('expanded');
			document.getElementById('upico').classList.remove('rotate');

			e.stopPropagation();
		}
	});
	document.addEventListener('click', (e) => {
		if (!document.getElementById('preset').contains(e.target) && !document.getElementById('history').contains(e.target) && e.target.id != 'presetBtn' && e.target.id != 'historyBtn') {
			hideHistory();
			hidePreset();
		}

		if (!mobile) return;
		if (e.target != info) {
			info.classList.remove('shown');
			download.classList.remove('shown');
			image.classList.remove('top');
		}
	});

	result.addEventListener('mouseleave', (e) => {
		if (mobile) return;
		info.classList.remove('shown');
		download.classList.remove('shown');
		image.classList.remove('top');
	});
	info.addEventListener('mouseleave', (e) => {
		if (mobile) return;
		info.classList.remove('shown');
		download.classList.remove('shown');
		image.classList.remove('top');
	});
	download.addEventListener('mouseleave', (e) => {
		if (mobile) return;
		info.classList.remove('shown');
		download.classList.remove('shown');
		image.classList.remove('top');
	});
}

function initLoginScreen() {
	document.getElementById('id').addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			button.click();
		}
	});
	document.getElementById('password').addEventListener('keyup', (e) => {
		if (e.key === 'Enter') {
			button.click();
		}
	});

	// Init login button
	let button = document.getElementById('loginBtn');
	button.addEventListener('click', async (e) => {
		let id = document.getElementById('id');
		let pw = document.getElementById('password');

		// Disable fields and button
		id.disabled = true;
		pw.disabled = true;
		button.disabled = true;

		// Check if ID and password are empty
		if (id.value == '' || pw.value == '' || id.value == null || pw.value == null) {
			id.disabled = false;
			pw.disabled = false;
			button.disabled = false;

			document.getElementById('text').innerHTML = 'Please enter your ID and password.';
			document.getElementById('text').classList.add('warning');
			document.getElementById('text').classList.add('shake');
			document.addEventListener('animationend', () => {
				document.getElementById('text').classList.remove('shake');
			});
			return;
		}

		// Login
		const res = await login(id.value, pw.value);
		if (!res) {
			// Failed to login
			id.disabled = false;
			pw.disabled = false;
			button.disabled = false;

			document.getElementById('text').innerHTML = 'Failed to login: please check your ID and password.';
			document.getElementById('text').classList.add('warning');
			document.getElementById('text').classList.add('shake');
			document.addEventListener('animationend', () => {
				document.getElementById('text').classList.remove('shake');
			});
		} else {
			// Successfully logged in
			document.getElementById('login').style.display = 'none';
			document.getElementById('login').style.visibility = 'hidden';

			document.getElementById('sidebar').classList.remove('hidden');
			setAnals();
		}
	});
}

function initTagAutoComplete() {
	// Init tag autocomplete
	const begprompt = document.getElementById('begprompt');
	const including = document.getElementById('including');
	const endprompt = document.getElementById('endprompt');
	const negprompt = document.getElementById('negprompt');

	begprompt.addEventListener('input', (e) => {
		if (e.data == '{') {
			hideTagSuggest();
			return;
		}
		if (e.data == '}') {
			hideTagSuggest();
			return;
		}

		suggestTags(begprompt.value.substring(0, begprompt.selectionStart), begprompt);
	});
	begprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	begprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	including.addEventListener('input', (e) => {
		suggestTags(including.value.substring(0, including.selectionStart), including);
	});
	including.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	including.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	endprompt.addEventListener('input', (e) => {
		suggestTags(endprompt.value.substring(0, endprompt.selectionStart), endprompt);
	});
	endprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	endprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});

	negprompt.addEventListener('input', (e) => {
		suggestTags(negprompt.value.substring(0, negprompt.selectionStart), negprompt);
	});
	negprompt.addEventListener('blur', (e) => {
		hideTagSuggest();
	});
	negprompt.addEventListener('click', (e) => {
		hideTagSuggest();
	});
}

function initSliders() {
	// Init slider input fields
	const promptGuidanceElement = document.getElementById('pg');
	const promptGuidanceTitleElement = document.getElementById('pgt');

	const stepElement = document.getElementById('step');
	const stepTitleElement = document.getElementById('stept');

	const promptGuidanceRescaleElement = document.getElementById('pgr');
	const promptGuidanceRescaleTitleElement = document.getElementById('pgrt');

	const delayElement = document.getElementById('delay');
	const delayTitleElement = document.getElementById('delayt');

	const infoExtractElement = document.getElementById('infoextract');
	const infoExtractTitleElement = document.getElementById('infoextractt');

	const refstrengthElement = document.getElementById('refstrength');
	const refstrengthTitleElement = document.getElementById('refstrengtht');

	// Show slider value on title when moved
	promptGuidanceElement.addEventListener('input', (e) => {
		promptGuidanceTitleElement.innerHTML = 'Prompt Guidance: ' + promptGuidanceElement.value;
	});

	stepElement.addEventListener('input', (e) => {
		stepTitleElement.innerHTML = 'Steps: ' + stepElement.value;
	});

	promptGuidanceRescaleElement.addEventListener('input', (e) => {
		promptGuidanceRescaleTitleElement.innerHTML = 'Prompt Guidance Rescale: ' + promptGuidanceRescaleElement.value;
	});

	delayElement.addEventListener('input', (e) => {
		delayTitleElement.innerHTML = 'Delay: ' + delayElement.value + ' seconds';
	});

	infoExtractElement.addEventListener('input', (e) => {
		infoExtractTitleElement.innerHTML = 'Information Extracted: ' + infoExtractElement.value;
	});

	refstrengthElement.addEventListener('input', (e) => {
		refstrengthTitleElement.innerHTML = 'Reference Strength: ' + refstrengthElement.value;
	});
}

function initSliderValues() {
	const promptGuidanceElement = document.getElementById('pg');
	const promptGuidanceTitleElement = document.getElementById('pgt');

	const stepElement = document.getElementById('step');
	const stepTitleElement = document.getElementById('stept');

	const promptGuidanceRescaleElement = document.getElementById('pgr');
	const promptGuidanceRescaleTitleElement = document.getElementById('pgrt');

	const delayElement = document.getElementById('delay');
	const delayTitleElement = document.getElementById('delayt');

	const infoExtractElement = document.getElementById('infoextract');
	const infoExtractTitleElement = document.getElementById('infoextractt');

	const refstrengthElement = document.getElementById('refstrength');
	const refstrengthTitleElement = document.getElementById('refstrengtht');

	promptGuidanceTitleElement.innerHTML = 'Prompt Guidance: ' + promptGuidanceElement.value;
	stepTitleElement.innerHTML = 'Steps: ' + stepElement.value;
	promptGuidanceRescaleTitleElement.innerHTML = 'Prompt Guidance Rescale: ' + promptGuidanceRescaleElement.value;
	delayTitleElement.innerHTML = 'Delay: ' + delayElement.value + ' seconds';
	infoExtractTitleElement.innerHTML = 'Information Extracted: ' + infoExtractElement.value;
	refstrengthTitleElement.innerHTML = 'Reference Strength: ' + refstrengthElement.value;
}

function initDropdowns() {
	// Init dropdown menus
	const widthElement = document.getElementById('width');
	const heightElement = document.getElementById('height');

	const sidebarItems = document.getElementById('items');
	const dropdowns = document.getElementsByClassName('dropdown');
	Array.from(dropdowns).forEach((dropdown) => {
		const id = dropdown.id.substring(9);
		const option = document.getElementById('option_' + id);

		moveDropdown(dropdown, option);

		// When dropdown menu is clicked
		dropdown.addEventListener('click', (e) => {
			if (option.style.visibility == 'visible') {
				option.style.visibility = 'hidden';
			} else {
				option.style.visibility = 'visible';
				option.scrollTop = 0;
				Array.from(option.children).forEach((child) => {
					if (child.innerHTML === dropdown.children[0].innerHTML) {
						child.classList.add('selected');
					} else {
						child.classList.remove('selected');
					}

					if (id === 'imgsize') {
						const imgSize = findImageSize(widthElement.value, heightElement.value);
						const imgSizeStr = imgSize[1] + ' ' + imgSize[2];

						if (child.innerHTML === imgSizeStr) {
							child.classList.add('selected');
						}
					}
				});
			}

			e.stopPropagation();
		});

		// Move dropdown menu when scrolling
		sidebarItems.addEventListener('scroll', (e) => {
			moveDropdown(dropdown, option);
			moveTagSuggest();

			if (tagSuggestElement != null) {
				if (sidebarItems.getBoundingClientRect().top + window.pageYOffset > tagSuggestElement.getBoundingClientRect().bottom + window.pageYOffset) {
					hideTagSuggest();
				}
			}
		});

		window.addEventListener('resize', (e) => {
			// Move dropdown menu when resizing
			moveDropdown(dropdown, option);
			resizeInfo();
			moveTagSuggest();
			checkMobile();
			setProgressbar();
			resizeOptions();
		});

		// When dropdown menu options are clicked
		Array.from(option.children).forEach((child) => {
			if (!child.classList.contains('title')) {
				child.addEventListener('click', (e) => {
					const prv = dropdown.children[0].innerHTML;

					dropdown.children[0].innerHTML = child.innerHTML;
					option.style.visibility = 'hidden';

					// Image size dropdown menu
					if (id === 'imgsize') {
						if (child.innerHTML === 'Custom') {
							dropdown.children[0].innerHTML = prv;
						} else {
							changeImageSize(child.innerHTML);
							const imgSize = findImageSize(widthElement.value, heightElement.value);
							dropdown.children[0].innerHTML = imgSize[0] + ' ' + imgSize[1];
						}
					}

					// Preset dropdown menu -- Deprecated
					if (id === 'preset') {
						const example = '{"begprompt":"1girl, {{kirisame marisa}}, {{}}","including":"1girl, ~speech bubble, ~commentary, ~blood, ~gun, ~guro, ~bdsm, ~shibari, ~butt plug, ~object insertion, ~pregnant","removeArtist":true,"removeCharacter":true,"endprompt":"{{{volumetric lighting, depth of field, best quality, amazing quality, very aesthetic, highres, incredibly absurdres}}}","negativePrompt":"{{{{{worst quality, bad quality}}}}}}, {{{{bad hands}}}}, {{{bad eyes, bad pupils, bad glabella}}},{{{undetailed eyes}}}},{{abs,rib,abdominal,rib line,muscle definition,muscle separation,sharp body line}},{{wide hips,narrow waist}}, text, error, extra digit, fewer digits, jpeg artifacts, signature, watermark, username, reference, {{unfinished}},{{unclear fingertips}}, {{twist}}, {{Squiggly}}, {{Grumpy}} , {{incomplete}}, {{Imperfect Fingers}}, Disorganized colors ,Cheesy, {{very displeasing}}, {{mess}}, {{Approximate}}, {{Sloppiness}},{{{{{futanari, dickgirl}}}}}","width":"832","height":"1216","step":"28","promptGuidance":"5","promptGuidanceRescale":"0","seed":"","sampler":"Euler Ancestral","smea":true,"dyn":false,"delay":"8","automation":false,"autodownload":false}';

						if (child.id === 'ex') {
							setOptions(example);
						} else if (child.id === 'add') {
							dropdown.children[0].innerHTML = prv;
							const name = window.prompt('Please enter the name of the preset.', '');
							if (name != null && name != '') {
								dropdown.children[0].innerHTML = name;

								let li = document.createElement('li');
								li.innerHTML = name;

								option.insertBefore(li, option.firstChild);
							}
						}
					}

					// Fire change event to trigger auto saving
					sidebarItems.dispatchEvent(new Event('change'));
				});
			}
		});

		// Prevent dropdown options from hiding when clicked
		option.addEventListener('click', (e) => {
			e.stopPropagation();
		});

		// Hide dropdown menus when clicked outside
		window.addEventListener('click', (e) => {
			option.style.visibility = 'hidden';
		});
	});


	// Select all text when clicked
	widthElement.addEventListener('click', (e) => {
		widthElement.select();
	});
	heightElement.addEventListener('click', (e) => {
		heightElement.select();
	});

	// Only allow numbers
	widthElement.addEventListener('input', (e) => {
		widthElement.value = widthElement.value.replace(/\D/g, '');
		if (widthElement.value.length > 4) {
			widthElement.value = widthElement.value.substring(0, 4);
		}

		const imgSize = findImageSize(widthElement.value, heightElement.value);
		document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + ' ' + imgSize[1];
	});
	heightElement.addEventListener('input', (e) => {
		heightElement.value = heightElement.value.replace(/\D/g, '');
		if (heightElement.value.length > 4) {
			heightElement.value = heightElement.value.substring(0, 4);
		}

		const imgSize = findImageSize(widthElement.value, heightElement.value);
		document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + ' ' + imgSize[1];
	});

	// Round to nearest multiple of 64
	widthElement.addEventListener('blur', (e) => {
		if (widthElement.value < 64) {
			widthElement.value = 64;
		} else {
			widthElement.value = Math.round(widthElement.value / 64) * 64;
		}
	});
	heightElement.addEventListener('blur', (e) => {
		if (heightElement.value < 64) {
			heightElement.value = 64;
		} else {
			heightElement.value = Math.round(heightElement.value / 64) * 64;
		}
	});

	document.getElementById("optionsLock").addEventListener("click", function (e) {
		document.getElementById("optionsLock").classList.toggle("locked");
		localStorage.setItem('settings', JSON.stringify(getSettings()));

		lockOptions();
	});
}

function lockOptions() {
	if (document.getElementById("optionsLock").classList.contains("locked")) {
		document.getElementById("options").style.pointerEvents = "none";
		document.getElementById("options").style.opacity = "0.4";
	}
	else {
		document.getElementById("options").style.pointerEvents = "auto";
		document.getElementById("options").style.opacity = "1";
	}
}

async function downloadLists() {
	const fileNum = 10;

	let downloaded = 0;
	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/artist_list.txt', null, 'text').then((data) => {
		artistList = data.split('\n');
		console.log('downloaded artist_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/character_list.txt', null, 'text').then((data) => {
		characterList = data.split('\n');
		console.log('downloaded character_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/whitelist.txt', null, 'text').then((data) => {
		whitelist = data.split('\n');
		console.log('downloaded whitelist.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/censor_list.txt', null, 'text').then((data) => {
		censorList = data.split('\n');
		console.log('downloaded censor_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/characteristic_list.txt', null, 'text').then((data) => {
		characteristicList = data.split('\n');
		console.log('downloaded characteristic_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/number.txt', null, 'text').then((data) => {
		numberList = data.split('\n');
		console.log('downloaded number.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/copyright_list.txt', null, 'text').then((data) => {
		copyrightList = data.split('\n');
		console.log('downloaded copyright_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/quality_list.txt', null, 'text').then((data) => {
		qualityList = data.split('\n');
		console.log('downloaded quality_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/raw/main/clothes_list.txt', null, 'text').then((data) => {
		attireList = data.split('\n');
		console.log('downloaded clothes_list.txt');
		downloaded++;
	});

	downloadFile('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/key.csv', null, 'text').then((data) => {
		keys = data.split('\n');
		for (let i = 0; i < keys.length; i++) {
			keys[i] = keys[i].split('|');
			keys[i][1] = parseInt(keys[i][1]);
		}
		console.log('downloaded key.csv');
		downloaded++;
	});

	tagDataLength = 2057298521;

	let interval = setInterval(() => {
		document.getElementById('generate').innerHTML = 'Downloading Data... ' + Math.round((downloaded / fileNum) * 100) + '%';

		// Downloaded
		if (downloaded == fileNum) {
			clearInterval(interval);
			console.log('downloaded all lists');

			// Load whitelist
			whitelist.push('rating: general');
			whitelist.push('rating: sensitive');
			whitelist.push('rating: questionable');
			whitelist.push('rating: explicit');

			// Load wildcards
			loadWildcards();

			for (let temp of whitelist) {
				whitelistSeparated.push(temp.toLowerCase().split(' '));
			}

			document.getElementById('generate').innerHTML = 'Generate';
			document.getElementById('generate').disabled = false;
		}
	}, 100);
}

function toggle(element) {
	document.getElementById(element).checked = !document.getElementById(element).checked;
}

function loadWildcards() {
	for (let i = 0; i < localStorage.length; i++) {
		let key = localStorage.key(i);
		if (key.startsWith('wildcard_')) {
			let data = localStorage.getItem(key);
			data = data.split('\n');

			const name = key.substring(9);
			wildcards[name] = data;

			whitelist.push('__' + name + '__');
		}
	}
}

function checkOptions(option) {
	option = JSON.parse(option);
	let temp = JSON.parse(example);

	for (let key in temp) {
		if (!(key in option)) {
			option[key] = temp[key];
		}
	}

	return JSON.stringify(option);
}

function loadOptions() {
	const options = localStorage.getItem('options');
	if (options == null) {
		setOptions(example);
	} else {
		localStorage.setItem('options', checkOptions(localStorage.getItem('options')));
		setOptions(localStorage.getItem('options'));
	}
}

function setOptions(options) {
	options = JSON.parse(options);

	document.getElementById('begprompt').value = options.begprompt;
	document.getElementById('including').value = options.including;
	document.getElementById('removeArtist').checked = options.removeArtist;
	document.getElementById('removeCharacter').checked = options.removeCharacter;
	document.getElementById('removeCharacteristic').checked = options.removeCharacteristic;
	document.getElementById('removeCopyright').checked = options.removeCopyright;
	document.getElementById('removeAttire').checked = options.removeAttire;
	document.getElementById('nonsfw').checked = options.nonsfw;
	document.getElementById('endprompt').value = options.endprompt;
	document.getElementById('negprompt').value = options.negativePrompt;

	document.getElementById('width').value = options.width;
	document.getElementById('height').value = options.height;
	document.getElementById('step').value = options.step;
	document.getElementById('pg').value = options.promptGuidance;
	document.getElementById('pgr').value = options.promptGuidanceRescale;
	document.getElementById('seed').value = options.seed;
	document.getElementById('dropdown_sampler').children[0].innerHTML = options.sampler;
	document.getElementById('SMEA').checked = options.smea;
	document.getElementById('DYN').checked = options.dyn;

	document.getElementById('infoextract').value = options.infoextract;
	document.getElementById('refstrength').value = options.refstrength;

	document.getElementById('delay').value = options.delay;
	document.getElementById('automation').checked = options.automation;
	document.getElementById('autodown').checked = options.autodownload;
	document.getElementById('ignorefail').checked = options.ignorefail;
	document.getElementById('reorderTags').checked = options.reorderTags;

	const imgSize = findImageSize(options.width, options.height);
	document.getElementById('dropdown_imgsize').children[0].innerHTML = imgSize[0] + ' ' + imgSize[1];

	initSliderValues();
}

// Get user options
function getOptions() {
	var options = {};
	options.begprompt = document.getElementById('begprompt').value;
	options.including = document.getElementById('including').value;
	options.removeArtist = document.getElementById('removeArtist').checked;
	options.removeCharacter = document.getElementById('removeCharacter').checked;
	options.removeCharacteristic = document.getElementById('removeCharacteristic').checked;
	options.removeCopyright = document.getElementById('removeCopyright').checked;
	options.removeAttire = document.getElementById('removeAttire').checked;
	options.nonsfw = document.getElementById('nonsfw').checked;
	options.endprompt = document.getElementById('endprompt').value;
	options.negativePrompt = document.getElementById('negprompt').value;

	options.width = document.getElementById('width').value;
	options.height = document.getElementById('height').value;
	options.step = document.getElementById('step').value;
	options.promptGuidance = document.getElementById('pg').value;
	options.promptGuidanceRescale = document.getElementById('pgr').value;
	options.seed = document.getElementById('seed').value;
	options.sampler = document.getElementById('dropdown_sampler').children[0].innerHTML;
	options.smea = document.getElementById('SMEA').checked;
	options.dyn = document.getElementById('DYN').checked;

	options.infoextract = document.getElementById('infoextract').value;
	options.refstrength = document.getElementById('refstrength').value;

	options.delay = document.getElementById('delay').value;
	options.automation = document.getElementById('automation').checked;
	options.autodownload = document.getElementById('autodown').checked;
	options.ignorefail = document.getElementById('ignorefail').checked;
	options.reorderTags = document.getElementById('reorderTags').checked;

	return options;
}

function loadSettings() {
	const settings = localStorage.getItem('settings');
	if (settings != null) {
		setSettings(settings);
		lockOptions();
	}
}

function setSettings(settings) {
	settings = JSON.parse(settings);

	document.getElementById('begprompt').style.height = settings.begpromheight;
	document.getElementById('including').style.height = settings.includingheight;
	document.getElementById('endprompt').style.height = settings.endpromptheight;
	document.getElementById('negprompt').style.height = settings.negpromptheight;
	document.getElementById('optionsLock').classList = settings.locked ? 'locked' : '';
}

function getSettings() {
	const settings = {};
	settings.begpromheight = document.getElementById('begprompt').style.height;
	settings.includingheight = document.getElementById('including').style.height;
	settings.endpromptheight = document.getElementById('endprompt').style.height;
	settings.negpromptheight = document.getElementById('negprompt').style.height;
	settings.locked = document.getElementById('optionsLock').classList.contains('locked');

	return settings;
}

function checkMobile() {
	if (window.innerWidth <= 1023) {
		mobile = true;
	} else {
		mobile = false;
	}
}

async function getStealthExif(src) {
	let canvas = document.createElement('canvas');
	let ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
	let img = new Image();
	img.src = src;

	await img.decode();

	canvas.width = img.width;
	canvas.height = img.height;
	ctx.drawImage(img, 0, 0);

	let binary = '';
	const signature = 'stealth_pngcomp';
	let index = 0;
	let reading = 'signature';
	let length = 0;

	for (let x = 0; x < img.width; x++) {
		for (let y = 0; y < img.height; y++) {
			let data = ctx.getImageData(x, y, 1, 1).data;
			let a = data[3];
			binary += String(a & 1);
			index++;

			if (reading == 'signature') {
				if (index == signature.length * 8) {
					let str = '';
					for (let i = 0; i < binary.length / 8; i++) {
						str += String.fromCharCode(parseInt(binary.substring(i * 8, i * 8 + 8), 2));
					}

					if (str == signature) {
						reading = 'length';
						binary = '';
						index = 0;
					} else {
						return null;
					}
				}
			} else if (reading == 'length') {
				if (index == 32) {
					length = parseInt(binary, 2);
					reading = 'data';
					binary = '';
					index = 0;
				}
			} else if (reading == 'data') {
				if (index == length) {
					let array = new Uint8Array(length);
					for (let i = 0; i < binary.length / 8; i++) {
						array[i] = parseInt(binary.substring(i * 8, i * 8 + 8), 2);
					}

					let temp = pako.ungzip(array);
					let prompt = new TextDecoder('utf-8').decode(temp);
					return JSON.parse(prompt);
				}
			}
		}
	}

	return null;
}

function addPreset() {
	let name = window.prompt('Please enter the name of the preset.', '');
	name = name.trim();

	if (name != null && name != '') {
		let list = localStorage.getItem('preset_list');

		if (!list.split('\n').includes(name)) {
			list += '\n' + name;
			localStorage.setItem('preset_list', list);
			addPresetItem(name);
		}

		let options = getOptions();
		localStorage.setItem('preset_' + name, JSON.stringify(options, null, 4));
	}
}

function addPresetItem(name) {
	const preset = document.getElementById('presetItem');

	let item = document.createElement('div');
	item.classList.add('item');

	let text = document.createElement('span');
	text.innerHTML = name;
	text.classList.add('text');
	item.appendChild(text);

	if (name != 'default') {
		let remove = document.createElement('span');
		remove.classList.add('delete');

		remove.addEventListener('click', (e) => {
			let yes = window.confirm('Delete preset "' + name + '"?');

			if (!yes) {
				return;
			}

			let list = localStorage.getItem('preset_list');
			list = list.split('\n');
			list.splice(list.indexOf(name), 1);
			list = list.join('\n');
			localStorage.setItem('preset_list', list);

			localStorage.removeItem('preset_' + name);

			preset.removeChild(item);
		});
		item.appendChild(remove);
	}

	text.addEventListener('click', (e) => {
		let options = localStorage.getItem('preset_' + name);
		if (options == null) {
			options = example;
		}

		setOptions(checkOptions(options));
		hidePreset();

		document.getElementById('sidebar').classList.add('expanded');
		document.getElementById('upico').classList.add('rotate');
	});

	preset.appendChild(item);
}

function resizeInfo() {
	const result = document.getElementById('result');
	const info = document.getElementById('info');
	const download = document.getElementById('download');

	const rect = result.getBoundingClientRect();

	info.style.top = rect.bottom - info.getBoundingClientRect().height + window.pageYOffset + 'px';
	info.style.left = rect.left + window.pageXOffset + 'px';

	info.style.width = rect.width - window.pageXOffset + 'px';

	download.style.top = rect.top  + window.pageYOffset + 5 + 'px';
	download.style.left = rect.right + window.pageXOffset - 30 - 5 +  'px';
}

function resizeOptions() {
	// Resize size input fields
	let width = document.getElementById('items').getBoundingClientRect().width - 40;
	let dropdownWidth = document.getElementById('dropdown_imgsize').getBoundingClientRect().width;
	let etcWidth = 5 * 2 + 15;
	document.getElementById('width').style.width = (width - dropdownWidth - 5) / 2 - etcWidth + 'px';
	document.getElementById('height').style.width = (width - dropdownWidth - 5) / 2 - etcWidth + 'px';

	// Resize seed input field
	dropdownWidth = document.getElementById('dropdown_sampler').getBoundingClientRect().width;
	etcWidth = 5 * 2;
	document.getElementById('seed').style.width = width - dropdownWidth - etcWidth - 15 + 'px';
}

function initInfo(url) {
	getExif(url).then((data) => {
		document.getElementById('info').innerHTML = data.prompt;
	});

	document.getElementById('info').scrollTop = 0;
}

temp = '1girl, [fu-ta], {{gsusart}}, anya (spy x family), damian desmond, spy x family, 1boy, ^^^, black hair, blush, brown eyes, buttons, child, crossed arms, eden academy school uniform, full body, green background, green eyes, long sleeves, medium hair, pink hair, school uniform, shaded face, shoes, short hair, shorts, simple background, socks, standing, volumetric lighting, depth of field, best quality, amazing quality, very aesthetic, highres, incredibly absurdres';

function logout() {
	const yes = window.confirm('Logout from your Novel AI account?');

	if (yes) {
		localStorage.removeItem('key');
		location.reload();
	}
}

function reorderPrompt(prompt) {
	prompt = prompt.replace(/_/g, ' ');

	let data = [];
	let weight = 0;
	let buffer = '';
	for (let i = 0; i <= prompt.length; i++) {
		if (i == prompt.length || prompt[i] == '{' || prompt[i] == '[' || prompt[i] == '}' || prompt[i] == ']' || prompt[i] == ',') {
			buffer = buffer.trim();

			if (buffer != '') {
				data.push([weight, buffer]);
			}
			buffer = '';
		} else {
			buffer += prompt[i];
		}

		if (i < prompt.length) {
			if (prompt[i] == '{') {
				weight++;
			} else if (prompt[i] == '}') {
				weight--;
			} else if (prompt[i] == '[') {
				weight--;
			} else if (prompt[i] == ']') {
				weight++;
			}
		}
	}

	let front = [];
	front = front.concat(extractListFromList(numberList, data));
	front = front.concat(extractListFromList(characterList, data));
	front = front.concat(extractListFromList(copyrightList, data));
	front = front.concat(extractListFromList(artistList, data));

	let back = [];
	back = back.concat(extractListFromList(qualityList, data));

	let result = [];
	result = result.concat(front);
	result = result.concat(data);
	result = result.concat(back);
	result.push([0, '']);

	let str = '';
	weight = 0;
	for (let i = 0; i < result.length; i++) {
		if (weight != result[i][0]) {
			str = str.substring(0, str.length - 2);

			if (weight < result[i][0]) {
				for (let j = weight; j < result[i][0]; j++) {
					if (j < 0) {
						str += ']';
						if (j == result[i][0] - 1 && i != result.length - 1) str += ', ';
					} else {
						if (str.at(-1) != '{') str += ', ';
						str += '{';
					}
				}
			} else {
				for (let j = weight; j > result[i][0]; j--) {
					if (j <= 0) {
						if (str.at(-1) != '[') str += ', ';
						str += '[';
					} else {
						str += '}';
						if (j == result[i][0] + 1 && i != result.length - 1) str += ', ';
					}
				}
			}

			weight = result[i][0];
		}

		str += result[i][1];
		if (i < result.length - 1) {
			str += ', ';
		}
	}

	if (str.substring(str.length - 2) == ', ') {
		str = str.substring(0, str.length - 2);
	}

	return str;
}

function extractListFromList(list2, list1) {
	let result = [];

	for (let i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i][1])) {
			result.push(list1[i]);
			list1.splice(i, 1);
			i--;
		}
	}

	return result;
}

// Change image size field based on string
function changeImageSize(str) {
	const size = /\(([^)]+)\)/.exec(str)[1].split('x');
	document.getElementById('width').value = size[0];
	document.getElementById('height').value = size[1];
}

// Find image size based on width and height
function findImageSize(width, height) {
	const dict = {
		'832x1216': ['Normal', 'Portrait', '(832x1216)'],
		'1216x832': ['Normal', 'Landscape', '(1216x832)'],
		'1024x1024': ['Normal', 'Square', '(1024x1024)'],

		'1024x1536': ['Large', 'Portrait', '(1024x1536)'],
		'1536x1024': ['Large', 'Landscape', '(1536x1024)'],
		'1472x1472': ['Large', 'Square', '(1472x1472)'],

		'1088x1920': ['Wallpaper', 'Portrait', '(1088x1920)'],
		'1920x1088': ['Wallpaper', 'Landscape', '(1920x1088)'],

		'512x768': ['Small', 'Portrait', '(512x768)'],
		'768x512': ['Small', 'Landscape', '(768x512)'],
		'640x640': ['Small', 'Square', '(640x640)'],
	};

	const key = width + 'x' + height;
	if (key in dict) {
		return dict[key];
	} else {
		return ['Custom', '', ''];
	}
}

// Move dropdown menu
function moveDropdown(dropdown, option) {
	const rect = dropdown.getClientRects()[0];
	const optionRect = option.getClientRects()[0];

	let top = rect.top - optionRect.height;

	if (top < 0) {
		top = rect.top + rect.height;
	}

	option.style.top = top + 'px';
	option.style.left = rect.left + 'px';
}

function showHistory() {
	hidePreset();

	document.getElementById('history').classList.add('shown');
	const ele = document.getElementById('image');
	ele.style.transition = 'width 0.3s ease-in-out';
	ele.classList.add('shown');

	setTimeout(() => {
		ele.style.transition = 'none';
	}, 300);
}

function showPreset() {
	hideHistory();

	document.getElementById('preset').classList.add('shown');
}

function hidePreset() {
	document.getElementById('preset').classList.remove('shown');
}

function hideHistory() {
	document.getElementById('history').classList.remove('shown');
	const ele = document.getElementById('image');
	ele.style.transition = 'width 0.3s ease-in-out';
	ele.classList.remove('shown');

	setTimeout(() => {
		ele.style.transition = 'none';
	}, 300);
}

async function getUserData() {
	let data = get(host + '/api/user/data', key);
	return data;
}

async function setAnals() {
	let anals = document.querySelector('#anals > span');
	let amt = (await getUserData()).subscription;
	amt = amt.trainingStepsLeft.fixedTrainingStepsLeft + amt.trainingStepsLeft.purchasedTrainingSteps;

	anals.innerHTML = amt;
}

async function loginWithAccessToken() {
	// Auto login.
	let accessToken = localStorage.getItem('key');
	if (accessToken == null) {
		// Not logged in.
		document.getElementById('id').disabled = false;
		document.getElementById('password').disabled = false;
	} else {
		key = accessToken;
		try {
			await testAccessToken(accessToken);
			// Successfully auto logged in.
			console.log('Logged in');
			document.getElementById('login').style.display = 'none';
			document.getElementById('login').style.visibility = 'hidden';
			document.getElementById('background').style.display = 'none';

			document.getElementById('sidebar').classList.remove('hidden');
			setAnals();
		} catch (err) {
			// Failed to auto login.
			console.log('Failed to login');
			document.getElementById('id').disabled = false;
			document.getElementById('password').disabled = false;
		}
	}
}

function applyDynamicPrompt(prompt) {
	let buffer = '';
	let indexStart = 0;
	for (let i = 0; i < prompt.length; i++) {
		if (prompt[i] == '<') {
			buffer = '';
			indexStart = i;
		} else if (prompt[i] == '>') {
			let tags = buffer.split('|');
			let index = Math.floor(Math.random() * tags.length);
			prompt = prompt.substring(0, indexStart) + tags[index] + prompt.substring(i + 1);
		} else {
			buffer += prompt[i];
		}
	}

	return prompt;
}

function applyWildcards(prompt) {
	let regex = /__\w+__/g;
	let match = prompt.match(regex);

	if (match == null) {
		return prompt;
	}

	for (let i = 0; i < match.length; i++) {
		let name = match[i].substring(2, match[i].length - 2);
		let data = wildcards[name];
		if (data != null) {
			let index = Math.floor(Math.random() * data.length);
			prompt = prompt.replace(match[i], data[index]);
		}
	}

	return prompt;
}

async function randomizePrompt() {
	options = getOptions();

	// Dynamic prompt #1
	options.including = applyDynamicPrompt(options.including);
	options.begprompt = applyDynamicPrompt(options.begprompt);
	options.endprompt = applyDynamicPrompt(options.endprompt);

	// Wildcards
	options.begprompt = applyWildcards(options.begprompt);
	options.including = applyWildcards(options.including);
	options.endprompt = applyWildcards(options.endprompt);

	// Dynamic prompt #2
	options.including = applyDynamicPrompt(options.including);
	options.begprompt = applyDynamicPrompt(options.begprompt);
	options.endprompt = applyDynamicPrompt(options.endprompt);

	let nonsfw = options.nonsfw;
	if (nonsfw) {
		options.including += ', rating:g';
	}

	// replace ratings
	options.including = options.including.replace(/rating:general/g, 'rating:g');
	options.including = options.including.replace(/rating:questionable/g, 'rating:q');
	options.including = options.including.replace(/rating:explicit/g, 'rating:e');
	options.including = options.including.replace(/rating:sensitive/g, 'rating:s');

	options.including = options.including.replace(/rating: general/g, 'rating:g');
	options.including = options.including.replace(/rating: questionable/g, 'rating:q');
	options.including = options.including.replace(/rating: explicit/g, 'rating:e');
	options.including = options.including.replace(/rating: sensitive/g, 'rating:s');

	let begprompt = removeEmptyElements(strToList(options.begprompt.replace(/\n/g, ',')));
	let including = removeEmptyElements(strToList(options.including.replace(/\n/g, ',')));
	let excluding = [];
	for (var i = 0; i < including.length; i++) {
		if (including[i].startsWith('~')) {
			excluding.push(including[i].substring(1));
			including.splice(i, 1);
			i--;
		}
	}

	including = removeEmptyElements(including);
	excluding = removeEmptyElements(excluding);

	let removeArtist = options.removeArtist;
	let removeCharacter = options.removeCharacter;
	let removeCharacteristic = options.removeCharacteristic;
	let removeCopyright = options.removeCopyright;
	let removeAttire = options.removeAttire;

	let endprompt = removeEmptyElements(strToList(options.endprompt.replace(/\n/g, ',')));
	let negative = removeEmptyElements(strToList(options.negativePrompt.replace(/\n/g, ',')));

	if (including.length == 0) {
		if (excluding.length == 0) {
			return begprompt.concat(endprompt).join(', ');
		} else {
			including.push('1girl');
		}
	}

	let prompt = await getRandomPrompt(including, excluding, options.including);

	if (prompt == null || prompt === '') {
		return null;
	} else if (prompt === 'DNE') {
		return 'DNE';
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

	if (removeCharacteristic) {
		prompt = removeListFromList(characteristicList, prompt);
	}
	
	if (removeCopyright) {
		prompt = removeListFromList(copyrightList, prompt);
	}

	if (removeAttire) {
		prompt = removeListFromList(attireList, prompt);
	}

	if (options.begprompt.includes('uncensored') || options.endprompt.includes('uncensored')) {
		prompt = removeListFromList(censorList, prompt);
	}

	prompt = onlyInLists(prompt, whitelist, artistList, characterList);
	prompt = combinePrompt(begprompt, prompt, endprompt);

	return prompt;
}

async function getRandomPrompt(including, excluding, searchString) {
	process = 0;

	if (including.length == 0) {
		return '';
	}

	for (var i = 0; i < including.length; i++) {
		let index = keys.findIndex(function (element) {
			return element[0] == including[i];
		}, including[i]);

		if (index == -1) {
			return 'DNE';
		}
	}

	let pos;

	let inc = searchString;
	if (previousIncluding === inc) {
		pos = previousPos;
	} else {
		for (i = 0; i < including.length; i++) {
			if (i == 0) {
				pos = new Set(await getPositions(including[i]));
			} else {
				var temp = new Set(await getPositions(including[i]));
				pos = new Set([...pos].filter((x) => temp.has(x)));
				delete temp;
			}

			process = i / (including.length + excluding.length);
			document.getElementById('generate').innerHTML = 'Searching... ' + Math.round(process * 100) + '%';
		}

		for (i = 0; i < excluding.length; i++) {
			temp = new Set(await getPositions(excluding[i]));
			pos = new Set([...pos].filter((x) => !temp.has(x)));
			delete temp;

			process = (i + including.length) / (including.length + excluding.length);
			document.getElementById('generate').innerHTML = 'Searching... ' + Math.round(process * 100) + '%';
		}

		pos = Array.from(pos);
	}

	document.getElementById('generate').innerHTML = 'Generate';

	if (pos.length === 0) {
		return 'DNE';
	}

	previousIncluding = inc;
	previousPos = pos;

	pos = pos[Math.floor(Math.random() * pos.length)];

	return await getPromptFromPos(pos);
}

async function getPromptFromPos(pos) {
	return await post(host + '/readTags', { pos: pos }, null, 'text');
}

async function readTagData(start, end) {
	let data = await fetch('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/tags.csv', { headers: { Range: `bytes=${start}-${end - 1}` } });
	data = await data.arrayBuffer();
	data = new Uint8Array(data);

	return data;
}

async function getPositions(tag) {
	let index = keys.findIndex(function (element) {
		return element[0] == tag;
	}, tag);

	if (index == -1) {
		return [];
	}

	let start = keys[index][1];
	let end = 0;

	if (index == keys.length - 1) {
		end = tagDataLength;
	} else {
		end = keys[index + 1][1];
	}

	let data = await fetch('https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/pos.csv', { headers: { Range: `bytes=${start * 4}-${end * 4 - 1}` } });
	data = await data.arrayBuffer();

	let pos = [];
	var view = new DataView(data, 0);

	for (let i = 0; i < data.byteLength / 4; i++) {
		pos.push(view.getUint32(i * 4));
	}

	return pos;
}

function combinePrompt(beg, mid, end) {
	let prompt = beg.concat(mid).concat(end).join(', ');
	return prompt;
}

function onlyInLists(list1, list2, list3, list4) {
	let list = [];

	for (var i = 0; i < list1.length; i++) {
		if (list2.includes(list1[i])) {
			list.push(list1[i]);
		} else if (list3.includes(list1[i])) {
			list.push(list1[i]);
		} else if (list4.includes(list1[i])) {
			list.push(list1[i]);
		}
	}

	return list;
}

function allInList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		let found = false;
		for (var j = 0; j < list2.length; j++) {
			if (list2[j].substring(0, list1[i].length) === list1[i]) {
				found = true;
				break;
			}
		}

		if (!found) {
			return false;
		}
	}

	return true;
}

function removeEmptyElements(list) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].trim() == '') {
			list.splice(i, 1);
			i--;
		}
	}

	return list;
}

function strToList(str) {
	str = str.trim();
	if (str == '') return [];

	let list = str.split(',');
	for (let i = 0; i < list.length; i++) {
		list[i] = list[i].trim();
	}

	return list;
}

function removeListFromList(list1, list2) {
	for (var i = 0; i < list1.length; i++) {
		while (list2.includes(list1[i].replace(/{/g, '').replace(/}/g, '').replace(/\[/g, '').replace(/]/g, ''))) {
			list2.splice(list2.indexOf(list1[i].replace(/{/g, '').replace(/}/g, '').replace(/\[/g, '').replace(/]/g, '')), 1);
		}
	}

	return list2;
}

function getCost() {
	let options = getOptions();

	let width = options.width;
	let height = options.height;
	let resolution = Math.max(width * height, 65536);

	let steps = options.step;
	let sema = options.smea;
	let dyn = options.dyn;

	let semaFactor = 1.0;
	if (sema) {
		semaFactor = 1.2;
	}
	if (dyn) {
		semaFactor = 1.4;
	}

	// TODO: FIGURE OUT THIS
	return Math.ceil(2951823174884865e-21 * resolution + 5.753298233447344e-7 * resolution * steps) * semaFactor;
}

async function startGenerate() {
	worker.postMessage({ type: 'requestGenerate' });
}

worker.onmessage = function (e) {
	switch (e.data.type) {
		case 'generate':
			generate();
			break;
		case 'getOptions':
			worker.postMessage({ type: 'getOptions_result', options: getOptions() });
			break;
		case 'setButtonText':
			document.getElementById('generate').innerHTML = e.data.text;
			break;
		case 'setButtonDisabled':
			document.getElementById('generate').disabled = e.data.disabled;
			break;
	}
};

function setProgressbar() {
	let progressBar = document.getElementById('progressBar');
	let image = document.getElementById('image');

	let rect = image.getBoundingClientRect();

	progressBar.style.width = rect.width + 'px';
	progressBar.style.background = 'linear-gradient(90deg, #0078d4 ' + generateProgress * 100 + '%, #131313 ' + generateProgress * 100 + '%)';
	progressBar.style.left = rect.left + 'px';
}

// Generate button click
async function generate() {
	gtag('event', 'Generate', {});

	preventReload = true;
	generateProgress = 0;

	document.getElementById('generate').disabled = true;
	document.getElementById('generate').innerHTML = 'Searching... 0%';

	let options = getOptions();

	let prompt = null;
	try {
		prompt = await randomizePrompt();
	} catch {
		console.log('Failed to get prompt');
		prompt = null;

		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('generate').disabled = false;
		document.getElementById('image').classList.remove('generating');
		document.getElementById('generate').innerHTML = 'Generate';
		document.getElementById('progressBar').style.visibility = 'hidden';
		
		if (getOptions().automation) {
			document.getElementById('generate').disabled = true;
			worker.postMessage({ type: 'automation' });
		}
		return;
	}

	if (prompt == null && !options.ignorefail) {
		alert('Failed to get prompt');
		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('generate').disabled = false;
		document.getElementById('image').classList.remove('generating');
		return;
	}
	
	if (prompt === 'DNE') {
		alert('Cannot find any matching prompt');
		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('generate').disabled = false;
		document.getElementById('image').classList.remove('generating');
		return;
	}

	if (options.reorderTags) {
		prompt = reorderPrompt(prompt);
	}

	document.getElementById('maid').style.visibility = 'visible';
	document.getElementById('maid').style.right = '-100px';
	document.getElementById('image').classList.add('generating');
	document.getElementById('generate').innerHTML = 'Generate';

	setAnals();

	let negativePrompt = options.negativePrompt;
	if (options.nonsfw) {
		negativePrompt += ', {{uncensored, nsfw, pussy, nipples}}';
	}

	let width = Number(options.width);
	let height = Number(options.height);

	let promptGuidance = Number(options.promptGuidance);
	let promptGuidanceRescale = Number(options.promptGuidanceRescale);

	let sampler;

	switch (options.sampler) {
		case 'Euler':
			sampler = 'k_euler';
			break;
		case 'Euler Ancestral':
			sampler = 'k_euler_ancestral';
			break;
		case 'DPM++ 2S Ancestral':
			sampler = 'k_dpmpp_2s_ancestral';
			break;
		case 'DPM++ SDE':
			sampler = 'k_dpmpp_sde';
			break;
	}

	let SMEA = options.smea;
	let DYN = options.dyn;

	let seed = 0;

	if (options.seed === '') {
		seed = Math.floor(Math.random() * 9999999999);
	} else {
		seed = Number(options.seed);
	}

	let noiseSeed = Math.floor(Math.random() * 9999999999);
	let steps = Number(options.step);

	let params = {
		legacy: false,
		legacy_v3_extend: false,
		quality_toggle: false,
		width: width,
		height: height,
		n_samples: 1,
		seed: seed,
		extra_noise_seed: noiseSeed,
		sampler: sampler,
		steps: steps,
		scale: promptGuidance,
		uncond_scale: 1.0,
		negative_prompt: negativePrompt,
		sm: SMEA,
		sm_dyn: DYN,
		dynamic_thresholding: false,
		controlnet_strength: 1,
		add_original_image: false,
		cfg_rescale: promptGuidanceRescale,
		noise_schedule: 'native',
		ucPreset: 3,
		params_version: 1,
	};

	if (vibeImage != null) {
		params.reference_image = vibeImage;
		params.reference_information_extracted = Number(options.infoextract);
		params.reference_strength = Number(options.refstrength);
	}

	let result = null;

	generateTime = new Date().getTime();
	let eta = (await get(host + '/stat')).avgTime + 2000;

	const interval = setInterval(async () => {
		let time = new Date().getTime() - generateTime;

		generateProgress = time / eta;
		setProgressbar();
	}, 1000);

	document.getElementById('progressBar').style.width = '0px';
	document.getElementById('progressBar').style.visibility = 'visible';

	let time = new Date().getTime();
	try {
		result = await generateImage(key, prompt, 'nai-diffusion-3', 'generate', params);
	} catch {
		console.log('Failed to generate image');
		result = null;

		clearInterval(interval);

		document.getElementById('maid').style.visibility = 'hidden';
		document.getElementById('image').classList.remove('generating');
		document.getElementById('generate').disabled = false;
		document.getElementById('generate').innerHTML = 'Generate';
		document.getElementById('progressBar').style.visibility = 'hidden';
		if (!options.ignorefail && result == null) {
			alert('NovelAI server error: please try again later.');
			return;
		}
	}
	
	clearInterval(interval);

	if (result === '429') {
		await sleep(30000);
		result = null;
	}

	setAnals();
	document.getElementById('maid').style.visibility = 'hidden';
	document.getElementById('image').classList.remove('generating');
	document.getElementById('progressBar').style.visibility = 'hidden';
	document.getElementById('generate').disabled = false;

	if (result != null) {
		document.getElementById('generate').innerHTML = 'Generate';
		document.getElementById('result').src = result;
		document.getElementById('support').style.display = 'none';
		initInfo(result);

		await post(host + '/time', { time: new Date().getTime() - time, settings: params }, null, 'text');

		if (options.autodownload) {
			download(result, prompt.substring(0, 80) + '_' + seed + '.png');
		}

		// Add to history
		let ele = document.createElement('img');
		ele.src = result;
		ele.addEventListener('click', (e) => {
			document.getElementById('result').src = ele.src;
			initInfo(ele.src);

			const child = document.getElementById('historyItem').children;
			Array.from(child).forEach((child) => {
				child.classList.remove('selected');
			});

			ele.classList.add('selected');
		});

		const child = document.getElementById('historyItem').children;
		Array.from(child).forEach((child) => {
			child.classList.remove('selected');
		});
		ele.classList.add('selected');

		const history = document.getElementById('historyItem');
		history.insertBefore(ele, history.firstChild);
	}

	if (getOptions().automation) {
		document.getElementById('generate').disabled = true;
		worker.postMessage({ type: 'automation' });
	} else {
		document.getElementById('generate').disabled = false;
	}

	return result;
}

function download(dataurl, filename) {
	const link = document.createElement('a');
	link.href = dataurl;
	link.download = filename;
	link.click();
}

function expand() {
	document.getElementById('sidebar').classList.toggle('expanded');
	document.getElementById('upico').classList.toggle('rotate');
}

function hideTagSuggest() {
	document.getElementById('tagSuggest').style.visibility = 'hidden';
	controller.abort();

	controller = new AbortController();
}

function suggestTags(str, element) {
	tagSuggestElement = element;
	const tags = findTags(str);

	if (tags.length == 0) {
		hideTagSuggest();
		return;
	}

	if (tags.length == 1) {
		if (tags[0] == str.substring(Math.max(str.lastIndexOf(',') + 1, str.lastIndexOf(', ') + 2))) {
			hideTagSuggest();
			return;
		}
	}

	const suggest = document.getElementById('tagSuggest');
	suggest.innerHTML = '';

	suggest.addEventListener(
		'mousedown',
		(e) => {
			e.stopPropagation();
			e.preventDefault();
		},
		{ signal: controller.signal },
	);

	let selected = 0;
	window.addEventListener(
		'keydown',
		(e) => {
			if (e.key == 'ArrowUp') {
				selected--;
				if (selected < 0) {
					selected = 0;
				}
				e.preventDefault();
			} else if (e.key == 'ArrowDown') {
				selected++;
				if (selected >= tags.length) {
					selected = tags.length - 1;
				}
				e.preventDefault();
			} else if (e.key == 'ArrowLeft') {
				hideTagSuggest();
				return;
			} else if (e.key == 'ArrowRight') {
				hideTagSuggest();
				return;
			} else if (e.key == 'Enter' || e.key == 'Tab') {
				suggest.children[selected].dispatchEvent(new Event('mouseup'));
				e.preventDefault();
				return;
			}

			const items = document.getElementById('tagSuggest').children;
			for (let i = 0; i < items.length; i++) {
				items[i].classList.remove('selected');

				if (i == selected) {
					items[i].classList.add('selected');
				}
			}
		},
		{ signal: controller.signal },
	);

	for (let i = 0; i < tags.length; i++) {
		const item = document.createElement('div');
		item.classList.add('item');
		item.innerHTML = tags[i];

		if (i == 0) {
			item.classList.add('selected');
		}

		item.addEventListener(
			'mouseup',
			(e) => {
				const tag = tags[i];
				const str = tagSuggestElement.value;
				const cursorStr = str.substring(0, tagSuggestElement.selectionStart);
				let start = 0;
				let end = tagSuggestElement.selectionStart;

				if (cursorStr.includes(',') || cursorStr.includes('{') || cursorStr.includes('~') || cursorStr.includes('[') || cursorStr.includes('<') || cursorStr.includes('|')) {
					start = Math.max(cursorStr.lastIndexOf(',') + 1, cursorStr.lastIndexOf(', ') + 2, cursorStr.lastIndexOf('{') + 1, cursorStr.lastIndexOf('~') + 1, cursorStr.lastIndexOf('[') + 1, cursorStr.lastIndexOf('<') + 1, cursorStr.lastIndexOf('|') + 1);
				} else {
					start = 0;
				}

				tagSuggestElement.value = str.substring(0, start) + tag + str.substring(end);
				tagSuggestElement.selectionStart = start + tag.length;
				tagSuggestElement.selectionEnd = start + tag.length;

				hideTagSuggest();

				e.preventDefault();
			},
			{ signal: controller.signal },
		);

		suggest.appendChild(item);
	}

	moveTagSuggest();

	suggest.style.visibility = 'visible';
}

function moveTagSuggest() {
	if (tagSuggestElement != null) {
		const suggest = document.getElementById('tagSuggest');
		const rect = tagSuggestElement.getBoundingClientRect();

		suggest.style.top = rect.bottom - 2 + window.pageYOffset + 'px';
		suggest.style.left = rect.left + window.pageXOffset + 'px';
	}
}

function findTags(str) {
	str = str.replace(/\|/g, ',');
	if (str.includes(',')) {
		str = str.substring(Math.max(str.lastIndexOf(',') + 1, str.lastIndexOf(', ') + 2));
	}
	str = str.toLowerCase().replace(/{/g, '').replace(/\[/g, '').replace(/~/g, '').replace(/</g, '');

	if (str == '') return [];

	tags = [];
	strSeparated = str.split(' ');

	let spacenum = 0;
	for (let i = 0; i < strSeparated.length; i++) {
		if (strSeparated[i] == '') {
			spacenum++;
		}

		if (spacenum >= 2) {
			return [];
		}
	}

	strSeparated = removeEmptyElements(strSeparated);

	for (let i = 0; i < whitelistSeparated.length; i++) {
		if (allInList(strSeparated, whitelistSeparated[i])) {
			tags.push(whitelist[i]);
		}

		if (tags.length >= 5) {
			return tags;
		}
	}

	return tags;
}

function checkDYN() {
	const SMEA = document.getElementById('SMEA');
	const DYN = document.getElementById('DYN');

	if (SMEA.checked) {
		DYN.disabled = false;
	} else {
		DYN.disabled = true;
	}
}

function downloadHistory() {
	const child = document.getElementById('historyItem').children;

	if (child.length == 0) {
		alert('History is empty.');
		return;
	}

	let zip = new JSZip();
	JSZip.support.nodebuffer = false;

	for (let i = 0; i < child.length; i++) {
		let data = URL.getFromObjectURL(child[i].src);
		zip.file(String(i) + '.png', data);
	}

	zip.generateAsync({ type: 'blob' }).then(function (content) {
		let date = new Date();
		let fileName = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '.zip';

		let url = URL.createObjectURL(content);
		content.type = 'application/zip';
		//download(url, fileName);
		saveAs(url, fileName);
	});
}

// Generate image
async function generateImage(accessToken, prompt, model, action, parameters) {
	let data = {
		input: prompt,
		model: model,
		action: action,
		parameters: parameters,
	};

	let result = await post(host + '/generate-image', data, accessToken, 'blob');

	if (result == '429') {
		return '429';
	}

	const { entries } = await unzipit.unzip(result);

	let blob = null;
	const imgName = Object.keys(entries)[0];
	await entries[imgName].blob('image/png').then((data) => {
		blob = data;
	});

	return window.URL.createObjectURL(blob);
}

async function getExif(url) {
	const response = await fetch(url);
	const data = await response.blob();
	let pnginfo = UPNG.decode(await data.arrayBuffer());
	let text = pnginfo.tabs.tEXt;

	try {
		if (text == undefined) {
			return JSON.parse((await getStealthExif(url)).Comment);
		} else {
			if (text.Comment == undefined) {
				return JSON.parse((await getStealthExif(url)).Comment);
			} else {
				return JSON.parse(text.Comment);
			}
		}
	} catch {
		return null;
	}
}

// Login to server
async function login(id, pw) {
	key = await connect(id, pw);

	if (key == null) {
		// Failed to login.
		console.log('Failed to login');
		return false;
	} else {
		// Successfully logged in.
		localStorage.setItem('key', key);
		console.log('Logged in');
		document.getElementById('background').style.display = 'none';
		return true;
	}
}

// Directly connect to server
async function connect(id, pw) {
	try {
		let accessToken = await getAccessToken(id, pw);
		let result = await testAccessToken(accessToken);
		return accessToken;
	} catch (err) {
		return null;
	}
}

// Test access token validity
async function testAccessToken(accessToken) {
	let url = host + '/api/user/information';
	let result = await get(url, accessToken);
	return result;
}

// Reformat access token
function reformatAccessToken(accessToken) {
	return 'Bearer ' + accessToken;
}

// Get access token
async function getAccessToken(id, pw) {
	let key = await getAccessKey(id, pw);
	let url = host + '/api/user/login';
	var accessToken = await post(url, { key: key }).then((data) => {
		return data.accessToken;
	});
	return reformatAccessToken(accessToken);
}

// Get access key
async function getAccessKey(id, pw) {
	let key = await argon_hash(id, pw, 64, 'novelai_data_access_key');
	return key.substring(0, 64);
}

// Hash for login information
async function argon_hash(email, password, size, domain) {
	var pre_salt = password.slice(0, 6) + email + domain;
	var salt = blake2b.blake2b(pre_salt, null, 16);

	var raw = await argon2.hash({
		pass: password,
		salt: salt,
		time: 2,
		mem: Math.floor(2000000 / 1024),
		hashLen: size,
		type: 2,
	});

	var b64 = Buffer.Buffer.from(raw.hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

	return b64;
}

// Post request
async function post(url, data, authorization = null, resultType = 'json') {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'POST',
			headers: {
				Authorization: authorization,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
			.then((response) => {
				if (response.status == 429) {
					resolve('429');
				}

				if (resultType == 'json') {
					resolve(response.json());
				} else if (resultType == 'blob') {
					resolve(response.blob());
				} else {
					resolve(response.text());
				}
			})
			.catch((err) => {
				reject(err);
			});
	});
}

// Get request
async function get(url, authorization = null) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'GET',
			beforeSend: function (request) {
				request.setRequestHeader('Authorization', authorization);
			},
			success: function (data) {
				resolve(data);
			},
			error: function (err) {
				reject(err);
			},
		});
	});
}

// Download file
async function downloadFile(url) {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'GET',
		})
			.then((response) => {
				resolve(response.text());
			})
			.catch((err) => {
				reject(err);
			});
	});
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
