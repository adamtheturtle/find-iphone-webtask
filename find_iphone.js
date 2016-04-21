var request = require("request");
var util = require("util");

var findmyphone = {
	init: function(callback) {

		if (!findmyphone.hasOwnProperty("apple_id") || !findmyphone.hasOwnProperty("password")) {
			return callback("Please define apple_id / password");
		}

		if (findmyphone.apple_id == null || findmyphone.password == null) {
			return callback("Please define apple_id / password");
		}

		var newLogin = !findmyphone.hasOwnProperty("jar");
		if (newLogin) {
			findmyphone.jar = request.jar();
		}

		findmyphone.iRequest = request.defaults({
			jar: findmyphone.jar,
			headers: {
				"Origin": "https://www.icloud.com"
			}
		});

		if (newLogin) {
			findmyphone.login(function(err, res, body) {
				return callback(err, res, body);
			});
		} else {

			findmyphone.checkSession(function(err, res, body) {
				if (err) {
					//session is dead, start new
					findmyphone.jar = null;
					findmyphone.jar = request.jar();

					findmyphone.login(function(err, res, body) {
						return callback(err, res, body);
					});
				} else {
					console.log("reusing session");
					return callback(err, res, body);
				}
			});
		}
	},
	login: function(callback) {

		var options = {
			url: "https://setup.icloud.com/setup/ws/1/login",
			json: {
				"apple_id": findmyphone.apple_id,
				"password": findmyphone.password,
				"extended_login": true
			}
		};

		findmyphone.iRequest.post(options, function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback("Login Error");
			}

			findmyphone.onLogin(body, function(err, resp, body) {
				return callback(err, resp, body);
			});

		});
	},
	checkSession: function(callback) {

		var options = {
			url: "https://setup.icloud.com/setup/ws/1/validate",
		};

		findmyphone.iRequest.post(options, function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback("Could not refresh session");
			}

			findmyphone.onLogin(body, function(err, resp, body) {
				return callback(err, resp, body);
			});

		});
	},
	onLogin: function(body, callback) {

		if (body.hasOwnProperty("webservices") && body.webservices.hasOwnProperty("findme")) {
			findmyphone.base_path = body.webservices.findme.url;

			options = {
				url: findmyphone.base_path + "/fmipservice/client/web/initClient",
				json: {
					"clientContext": {
						"appName": "iCloud Find (Web)",
						"appVersion": "2.0",
						"timezone": "US/Eastern",
						"inactiveTime": 3571,
						"apiVersion": "3.0",
						"fmly": true
					}
				}
			};

			findmyphone.iRequest.post(options, callback);
		} else {
			return callback("cannot parse webservice findme url");
		}
	},
	getDevices: function(callback) {

		findmyphone.init(function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback(error);
			}

			var devices = [];

			// Retrieve each device on the account
			body.content.forEach(function(device) {
				devices.push({
					id: device.id,
					name: device.name,
					deviceModel: device.deviceModel,
					modelDisplayName: device.modelDisplayName,
					deviceDisplayName: device.deviceDisplayName,
					batteryLevel: device.batteryLevel,
					isLocating: device.isLocating,
					lostModeCapable: device.lostModeCapable,
					location: device.location
				});
			});

			callback(error, devices);
		});
	},
	alertDevice: function(deviceId, callback) {
		var options = {
			url: findmyphone.base_path + "/fmipservice/client/web/playSound",
			json: {
				"subject": "Webtask Find My iPhone Alert",
				"device": deviceId
			}
		};
		findmyphone.iRequest.post(options, callback);
	},
};


module.exports = function (ctx, done) {
  var icloud = findmyphone;

	icloud.apple_id = ctx.data.APPLE_ID;
	icloud.password = ctx.data.APPLE_PASSWORD; 

	icloud.getDevices(function(error, devices) {
		var device;

		if (error) {
			throw error;
		}

		devices.forEach(function(d) {
			if (device == undefined && d.location && d.lostModeCapable) {
				device = d;
  			icloud.alertDevice(device.id, function(err) {
  				console.log("Beep Beep!");
  			});
			}
		});

	});

  done(null, 'All devices alerted');
}