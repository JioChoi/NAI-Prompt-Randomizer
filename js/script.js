let api = '/api';
let key = null;

window.onload = async function() {
	await init();
	css();
}

function css() {
	const textareas = document.getElementsByTagName('textarea');
	Array.from(textareas).forEach((textarea) => {
		textarea.style.minHeight = textarea.rows * 25 + 24 + 'px';
	});

	const sidebarItems = document.getElementById("items");

	changeImageSize(document.getElementById('dropdown_imgsize').children[0].innerHTML);

	const dropdowns = document.getElementsByClassName('dropdown');
	Array.from(dropdowns).forEach((dropdown) => {
		const id = dropdown.id.substring(9);
		const option = document.getElementById("option_" + id);

		moveDropdown(dropdown, option);

		dropdown.addEventListener('click', (e) => {
			if (option.style.visibility == 'visible') {
				option.style.visibility = 'hidden';
			}
			else {
				option.style.visibility = 'visible';
				option.scrollTop = 0;
				Array.from(option.children).forEach((child) => {
					if(child.innerHTML === dropdown.children[0].innerHTML) {
						child.classList.add('selected');
					}
					else {
						child.classList.remove('selected');
					}
				});
			}

			e.stopPropagation();
		});

		sidebarItems.addEventListener('scroll', (e) => {
			moveDropdown(dropdown, option);
		});

		Array.from(option.children).forEach((child) => {
			if(!child.classList.contains('title')) {
				child.addEventListener('click', (e) => {
					const prv = dropdown.children[0].innerHTML;

					dropdown.children[0].innerHTML = child.innerHTML;
					option.style.visibility = 'hidden';


					if(id === 'imgsize') {
						if(child.innerHTML === 'Custom') {
							dropdown.children[0].innerHTML = prv;
						}
						else {
							changeImageSize(child.innerHTML);
						}
					}
				});
			}
		});

		option.addEventListener('click', (e) => {
			e.stopPropagation();
		});

		window.addEventListener('click', (e) => {
			option.style.visibility = 'hidden';
		});
	});

	const widthElement = document.getElementById('width');
	widthElement.addEventListener('click', (e) => {
		widthElement.select();
	});

	widthElement.addEventListener('input', (e) => {
		widthElement.value = widthElement.value.replace(/\D/g, '');
		if(widthElement.value.length > 4) {
			widthElement.value = widthElement.value.substring(0, 4);
		}

		document.getElementById('dropdown_imgsize').children[0].innerHTML = "Custom";
	});

	widthElement.addEventListener('blur', (e) => {
		if(widthElement.value < 64) {
			widthElement.value = 64;
		}
		else{
			widthElement.value = Math.round(widthElement.value / 64) * 64;
		}
	});

	const heightElement = document.getElementById('height');
	heightElement.addEventListener('click', (e) => {
		heightElement.select();
	});

	heightElement.addEventListener('input', (e) => {
		heightElement.value = heightElement.value.replace(/\D/g, '');
		if(heightElement.value.length > 4) {
			heightElement.value = heightElement.value.substring(0, 4);
		}

		document.getElementById('dropdown_imgsize').children[0].innerHTML = "Custom";
	});

	heightElement.addEventListener('blur', (e) => {
		if(heightElement.value < 64) {
			heightElement.value = 64;
		}
		else{
			heightElement.value = Math.round(heightElement.value / 64) * 64;
		}
	});

	const promptGuidanceElement = document.getElementById('pg');
	const promptGuidanceTitleElement = document.getElementById('pgt');
	promptGuidanceElement.addEventListener('input', (e) => {
		promptGuidanceTitleElement.innerHTML = "Prompt Guidance: " + promptGuidanceElement.value;
	});

	const stepElement = document.getElementById('step');
	const stepTitleElement = document.getElementById('stept');
	stepElement.addEventListener('input', (e) => {
		stepTitleElement.innerHTML = "Steps: " + stepElement.value;
	});

	const promptGuidanceRescaleElement = document.getElementById('pgr');
	const promptGuidanceRescaleTitleElement = document.getElementById('pgrt');
	promptGuidanceRescaleElement.addEventListener('input', (e) => {
		promptGuidanceRescaleTitleElement.innerHTML = "Prompt Guidance Rescale: " + promptGuidanceRescaleElement.value;
	});

	const delayElement = document.getElementById('delay');
	const delayTitleElement = document.getElementById('delayt');
	delayElement.addEventListener('input', (e) => {
		delayTitleElement.innerHTML = "Delay: " + delayElement.value + " seconds";
	});

	const seedElement = document.getElementById('seed');
	seedElement.addEventListener('click', (e) => {
		seedElement.select();
	});

	seedElement.addEventListener('input', (e) => {
		seedElement.value = seedElement.value.replace(/\D/g, '');
		if(seedElement.value.length > 10) {
			seedElement.value = seedElement.value.substring(0, 10);
		}
	});

}

function changeImageSize(str) {
	const size = /\(([^)]+)\)/.exec(str)[1].split('x');
	document.getElementById('width').value = size[0];
	document.getElementById('height').value = size[1];
}

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

// Initialize
async function init() {
	// Auto login.
	let accessToken = localStorage.getItem("key");
	if (accessToken == null) {
		// Not logged in.
	}
	else {
		key = accessToken;
		try {
			await testAccessToken(accessToken);
			// Successfully auto logged in.
			console.log("Logged in");
		} catch (err) {
			// Failed to auto login.
			console.log("Failed to login");
		}
	}
}

async function generate() {
	let prompt = "1girl, {{kirisame_marisa, touhou_project}}, kahlua, clothing, {{{volumetric lighting, depth of field, shiny skin, humid skin,oiled,skindentation,best quality,amazing quality,very aesthetic,highres,incredibly absurdres}}}";
	let negativePrompt = "NSFW, bad quality, low quality, worst quality, lowres, displeasing, very displeasing, bad anatomy, bad perspective, bad proportions, bad aspect ratio, bad face, long face, bad teeth, bad neck, long neck, bad arm, bad hands, bad ass, bad leg, bad feet, bad reflection, bad shadow, bad link, bad source, wrong hand, wrong feet, missing limb, missing eye, missing tooth, missing ear, missing finger, extra faces, extra eyes, extra eyebrows, extra mouth, extra tongue, extra teeth, extra ears, extra breasts, extra arms, extra hands, extra legs, extra digits, fewer digits, cropped head, cropped torso, cropped shoulders, cropped arms, cropped legs, mutation, deformed, disfigured, unfinished, chromatic aberration";

	let width = 832;
	let height = 1216;
	
	let promptGuidance = 5;
	let promptGuidanceRescale = 0;

	let sampler = "k_dpmpp_2s_ancestral";

	let SMEA = true;
	let DYN = false;

	let seed = Math.floor(Math.random() * 9999999999);
	let noiseSeed = Math.floor(Math.random() * 9999999999);

	let params = {
		"legacy": false,
		"legacy_v3_extend": false,
		"quality_toggle": false,
		"width": width,
		"height": height,
		"n_samples": 1,
		"seed": seed,
		"extra_noise_seed": noiseSeed,
		"sampler": sampler,
		"steps": 28,
		"scale": promptGuidance,
		"uncond_scale": 1.0,
		"negative_prompt": negativePrompt,
		"sm" : SMEA,
		"sm_dyn" : DYN,
		"dynamic_thresholding": false,
		"controlnet_strength": 1.0,
		"add_original_image": false,
		"cfg_rescale": promptGuidanceRescale,
		"noise_schedule": "native",
	};

	let result = await generateImage(key, prompt, "nai-diffusion-3", "generate", params);
	return result;
}

async function generateImage(accessToken, prompt, model, action, parameters) {
	let url = api + "/ai/generate-image";

	let data = {
		"input": prompt,
		"model": model,
		"action": action,
		"parameters": parameters,
	}

	let result = await post(url, data, accessToken, 'blob');

	const { entries } = await unzipit.unzip(result);

	let blob = null;
	const imgName = Object.keys(entries)[0];
	await entries[imgName].blob('image/png').then((data) => { blob = data });

	const img = document.createElement('img');
	img.src = window.URL.createObjectURL(blob);

	document.body.appendChild(img);

	return window.URL.createObjectURL(blob);
}

// Login function
async function login(id, pw) {
	key = await connect(id, pw);
	localStorage.setItem("key", key);

	if (key == null) {
		// Failed to login.
		console.log("Failed to login");
	}
	else {
		// Successfully logged in.
		console.log("Logged in");
	}
}

async function connect(id, pw) {
	try {
		let accessToken = await getAccessToken(id, pw);
		let result = await testAccessToken(accessToken);
		return accessToken;
	} catch (err) {
		return null;
	}
}

async function testAccessToken(accessToken) {
	let url = api + "/user/information";
	let result = await get(url, accessToken);
	return result;
}

function reformatAccessToken(accessToken) {
	return "Bearer " + accessToken;
}

async function getAccessToken(id, pw) {
	let key = await getAccessKey(id, pw);
	let url = api + "/user/login";
	var accessToken = await post(url, {"key": key}).then((data) => { return data.accessToken; });
	return reformatAccessToken(accessToken);
}

async function getAccessKey(id, pw) {
	let key = await argon_hash(id, pw, 64, "novelai_data_access_key");
	return key.substring(0, 64);
}

async function argon_hash(email, password, size, domain) {
	var pre_salt = password.slice(0, 6) + email + domain;
	var salt = blake2b.blake2b(pre_salt, null, 16);

	var raw = await argon2.hash({
		pass: password,
		salt: salt,
		time: 2,
		mem: Math.floor(2000000 / 1024),
		hashLen: size,
		type: 2
	});

	var b64 = Buffer.Buffer.from(raw.hash).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

	return b64;
}

async function post(url, data, authorization = null, resultType = 'json') {
	return new Promise((resolve, reject) => {
		fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': authorization,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data)
		})
		.then((response) => {
			if(resultType == 'json') {
				resolve(response.json());
			}
			else {
				resolve(response.blob());
			}
		})
		.catch((err) => {
			reject(err);
		});
	});

	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'POST',
			dataType: dataType,
			data: JSON.stringify(data),
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
				request.setRequestHeader("Content-Type", "application/json");
			},
			success: function(data) {
				console.log("Success");
				resolve(data);
			},
			error: function(err) {
				console.log("Error");
				reject(err);
			}
		});
	});
}

async function get(url, authorization = null) {
	return new Promise((resolve, reject) => {
		$.ajax({
			url: url,
			type: 'GET',
			beforeSend: function(request) {
				request.setRequestHeader("Authorization", authorization);
			},
			success: function(data) {
				resolve(data);
			},
			error: function(err) {
				reject(err);
			}
		});
	});
}