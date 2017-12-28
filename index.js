var inherits = require('util').inherits;
var Service, Characteristic, VolumeCharacteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-sonos-room-switch", "SonosRoomSwitch", SonosAccessory);
}

const httpRequest = function(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject({url:url, err:err}))
    })
};

function SonosAccessory(log, config) {
	this.log = log;
	this.config = config;
	this.name = config["name"];
	this.apiBaseUrl = config["apiBaseUrl"];

	if (!this.apiBaseUrl) throw new Error("You must provide a config value for 'apiBaseUrl'.");

	this.service = new Service.Switch(this.name);

	this.service
		.getCharacteristic(Characteristic.On)
		.on('get', this.getOn.bind(this))
		.on('set', this.setOnOff.bind(this));
}

SonosAccessory.prototype.getServices = function() {
	return [this.service];
}


// 
// On, if no room is available for joining
//
SonosAccessory.prototype.getOn = function(callback) {
	this.log("get");
	httpRequest(this.apiBaseUrl + "/zones")
		.then((data) => {
			const zones = JSON.parse(data);
			var numberOfZonesAvailable = 0;
			// scan zones
			zones.forEach((zone) => {
				this.log(">  " + zone.coordinator.roomName + ": " + zone.coordinator.state.playbackState + " @ " + zone.coordinator.state.volume );
				if(zone.coordinator.state.playbackState !== "PLAYING") {
					numberOfZonesAvailable++;
				}
			});			
			// build result
			const result = numberOfZonesAvailable === 0;
			this.log(">  " + numberOfZonesAvailable+ " zones availalbe, reporting " + result);
			callback(null, result);
		})
		.catch((err) => {
	  		this.log("fail", err);
	  		callback(err);
		});
}

// Setting On: Adjust volume of new zone and join
// Setting Off: Split joined rooms
//
SonosAccessory.prototype.setOnOff = function(on, callback) {
	if (on) {
		this.setOn(callback);
	} else {
		this.setOff(callback);
	}
}

SonosAccessory.prototype.setOn = function(callback) {
	this.log("setting on...");
	const state = {};
	httpRequest(this.apiBaseUrl + "/zones")
		.then((data) => {
			const zones = JSON.parse(data);
			// scan zones
			zones.forEach((zone) => {
				this.log(">  " + zone.coordinator.roomName + ": " + zone.coordinator.state.playbackState + " @ " + zone.coordinator.state.volume );
				if(zone.coordinator.state.playbackState === "PLAYING") {
					state.activeVolume = zone.coordinator.state.volume;
					state.roomToJoinTo = zone.coordinator.roomName;
				} else {
					state.roomToJoin = zone.coordinator.roomName;
				}
			});			
			// check state
			if(!state.roomToJoin || !state.roomToJoinTo) {
				throw "state not joinable: " + JSON.stringify(state);
			}
			return httpRequest(this.apiBaseUrl + "/" + state.roomToJoin + "/volume/" + this.harmonizeVolume(state));
		})
		.then((data) => {
			this.log(">  set volume for " + state.roomToJoin + " to " + this.harmonizeVolume(state));
			return httpRequest(this.apiBaseUrl + "/" + state.roomToJoin + "/join/" + state.roomToJoinTo);
		})
		.then((data) => {
			this.log(">  joined to " + state.roomToJoinTo);
			return httpRequest(this.apiBaseUrl + "/" + state.roomToJoinTo + "/leave");
		})
		.then((data) => {
			this.log(">  and " + state.roomToJoinTo + " left" );
			callback(null);
		})
		.catch((err) => {
  			this.log("fail", err);
  			callback(err);
		});
}


// Harmony volumes based on different room setups
SonosAccessory.prototype.harmonizeVolume = function(state) {
	const factor = 1.2;
	if(state.roomToJoin === "Wohnzimmer") {
		return state.activeVolume * factor;
	} else if (state.roomToJoin === "Küche") {
		return state.activeVolume / factor;
    }
	return state.activeVolume;
}

SonosAccessory.prototype.setOff = function(callback) {
	this.log("setting off...");
	const state = {};
	httpRequest(this.apiBaseUrl + "/zones")
		.then((data) => {
			// get state from zones
			const zones = JSON.parse(data);
			if(zones.length !== 1) {
				throw "Can't leave from " + zones.length + " zones";
			}
			const coordinatorName = zones[0].coordinator.roomName;
			const members = zones[0].members;
			if(members.length < 2) {
				throw "Can't leave from zone with " + members.length + " members";
			}

			// leave from zone
			const memberToLeave = members.filter((member) => member.roomName !== coordinatorName)[0];
			this.log("   " + memberToLeave.roomName + " is about to leave");
			return httpRequest(this.apiBaseUrl + "/" + memberToLeave.roomName + "/leave");
		})
		.then((data) => {
			this.log("left");
			callback(null);
		})
		.catch((err) => {
  			this.log("fail", err);
  			callback(err);
		});
}
