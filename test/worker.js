onmessage = function(e) {
	if(e.data === 'start') {
		let i = 0;
		this.setInterval(() => {
			i++;
			postMessage(i);
		}, 100);
	}

	postMessage("interval");
}