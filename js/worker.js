onmessage = function (e) {
	if (e.data.type == 'generate') {
		self.postMessage({ type: 'generate' });
	}
}