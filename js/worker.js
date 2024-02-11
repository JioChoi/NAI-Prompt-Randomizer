self.addEventListener('message', function (e) {
	switch(e.data.type) {
		case 'requestGenerate':
			self.postMessage({ type: 'generate' });
			break;
		case 'automation':
			addAutomationInterval();
			break;
	}
});

function waitMessage(msg) {
	self.postMessage(msg);

	return new Promise((resolve) => {
		self.onmessage = function (e) {
			if(e.data.type === msg.type + '_result') {
				resolve(e.data);
			}
		}
	});
}

function addAutomationInterval() {
	let time = 0;

	console.log("Automation started")
	const interval = setInterval(async () => {
		options = (await waitMessage({ type: 'getOptions' })).options;
		time += 100;

		self.postMessage({type: "setButtonText", text: time / 1000 + "s / " + options.delay + "s"});

		if (!options.automation) {
			self.postMessage({type: "setButtonText", text: "Generate"});
			self.postMessage({type: "setButtonDisabled", disabled: false});
			clearInterval(interval);
			return;
		}

		if (time >= options.delay * 1000) {
			self.postMessage({type: "generate"});
			self.postMessage({type: "setButtonText", text: "Generate"});
			clearInterval(interval);
			return;
		}
	}, 100);
}