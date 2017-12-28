# homebridge-sonos-overall
[Homebridge](https://github.com/nfarina/homebridge) accessory to switch rooms via [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api).

## Usecase
*Simply* switch rooms with continuous playback.

## Limits
This plugin works only for 2 room sonos setups (just made it for myself).

## Prerequisites

[Homebridge](https://github.com/nfarina/homebridge) and [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) are installed.

## Installation

Clone this repository, change into that forlder and execute the following
```
npm install
npm link
```

## Configuration

Add accessory to `~/.homebridge/config.json` of [Homebridge](https://github.com/nfarina/homebridge) like this:

```
...
"accessories": [
    ...
    {
        "accessory": "SonosRoomSwitch",
        "name": "Musik Transfer",
        "apiBaseUrl": "http://localhost:5005"
    },
    ...
```

- `accessory` needs to be `SonosRoomSwitch`
- `name` is the name that HomeKit will use
- `apiBaseUrl` is the base URL where [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) lives

## Finally

Restart [Homebridge](https://github.com/nfarina/homebridge) and that's it. Tested with node 6 on a raspi.
