(() => {
	// overrides URL methods to be able to retrieve the original blobs later on
	const old_create = URL.createObjectURL;
	const old_revoke = URL.revokeObjectURL;
	Object.defineProperty(URL, 'createObjectURL', {
	  get: () => storeAndCreate
	});
	Object.defineProperty(URL, 'revokeObjectURL', {
	  get: () => forgetAndRevoke
	});
	Object.defineProperty(URL, 'getFromObjectURL', {
	  get: () => getBlob
	});
	const dict = {};
  
	function storeAndCreate(blob) {
	  const url = old_create(blob); // let it throw if it has to
	  dict[url] = blob;
	  return url
	}
  
	function forgetAndRevoke(url) {
	  old_revoke(url);
	  try {
		if(new URL(url).protocol === 'blob:') {
		  delete dict[url];
		}
	  } catch(e){}
	}
  
	function getBlob(url) {
	  return dict[url] || null;
	}
  })();