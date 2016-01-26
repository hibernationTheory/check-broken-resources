var require = patchRequire(require);

function main(configFile, outputFile) {

	var casper = require('casper').create();
	var fs = require('fs');
	var utils = require('utils');

	casper.on('error', function(msg, trace) {
		console.log(msg);
	});

	casper.on('remote.message', function(msg) {
		console.log(msg);
	});
	
	// global vars
	var brokenResourceExists = false;
	var eventListenerExists = false;
	var resources = [];
	var urlsWithBrokenResources = {}

	// read in the config file
	var configDataExists = fs.exists(configFile);
	if (!configDataExists) {
		return false;
	}
	var configDataStr = fs.read(configFile);
	configData = JSON.parse(configDataStr);

	var links = configData.links;
	var baseUrl = configData.baseUrl;
	var urls = [];
	if (baseUrl) {
		links.forEach(function(item) {
			var fullUrl = baseUrl + item.url;
			urls.push(fullUrl);
		});
	} else {
		urls = links;
	}
	
	function resourceListener(resource) {
		if (resource.stage === 'end' && resource.status > 400) {
			utils.dump(resource.url);
			resources.push(resource.url);
			brokenResourceExists = true;
		}
	}

	casper.start();

	casper.on('resource.received', function(resource) {
		resourceListener(resource);
	});

	casper.each(urls, function(self, url, index) {
		casper.thenOpen(url, function() {
			console.log('Current url: ' + url);
		});

		casper.then(function() {
			console.log('Broken resources exist: ' + brokenResourceExists);
			if (brokenResourceExists) {
				urlsWithBrokenResources[url] = resources;
			}
			// reset the global values for the next url.
			brokenResourceExists = false;
			resources = [];
		});

	});

	casper.run(function() {
		var jsonData = JSON.stringify(urlsWithBrokenResources, null, '\t');
		fs.write(outputFile, jsonData, 'w');
		casper.exit();
	});
}

module.exports = main;