'use strict';

const gatewayClient = require('./gateway-client');
const auth = require('./auth-provider');
const datastore = require('./datastore');

datastore.open();

const DEBUG = false;

function registerAgent(app) {
  /**
   *
   * action: {
   *   initialTrigger: {
   *     intent: [
   *       "action.devices.SYNC",
   *       "action.devices.QUERY",
   *       "action.devices.EXECUTE"
   *     ]
   *   },
   *   httpExecution: "https://example.org/device/agent",
   *   accountLinking: {
   *     authenticationUrl: "https://example.org/device/auth"
   *   }
   * }
   */
  app.post('/smarthome', async function (request, response) {
    let reqdata = request.body;
    let authToken = auth.getAccessToken(request);

    DEBUG && console.log('smarthome', reqdata);

    const client = await datastore.getGatewayByToken(authToken);

    if (!client) {
      response.status(403).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({
        requestId: reqdata.requestId,
        payload  : {
          errorCode: 'authExpired'
        }
      });
      return;
    }

    if (!reqdata.inputs) {
      response.status(401).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }).json({ error: 'missing inputs' });
      return;
    }

    for (let i = 0; i < reqdata.inputs.length; i++) {
      let input = reqdata.inputs[i];
      let intent = input.intent;
      if (!intent) {
        response.status(401).set({
          'Access-Control-Allow-Origin' : '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }).json({ error: 'missing inputs' });
        continue;
      }
      switch (intent) {
      case 'action.devices.SYNC':
        DEBUG && console.log('post /smarthome SYNC');
        /**
             * request:
             * {
             *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *  "inputs": [{
             *      "intent": "action.devices.SYNC",
             *  }]
             * }
             */
        sync(client, {
          requestId: reqdata.requestId
        }, response);
        break;
      case 'action.devices.QUERY':
        DEBUG && console.log('post /smarthome QUERY');
        /**
             * request:
             * {
             *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *   "inputs": [{
             *       "intent": "action.devices.QUERY",
             *       "payload": {
             *          "devices": [{
             *            "id": "123",
             *            "customData": {
             *              "fooValue": 12,
             *              "barValue": true,
             *              "bazValue": "alpaca sauce"
             *            }
             *          }, {
             *            "id": "234",
             *            "customData": {
             *              "fooValue": 74,
             *              "barValue": false,
             *              "bazValue": "sheep dip"
             *            }
             *          }]
             *       }
             *   }]
             * }
             */
        query(client, {
          requestId: reqdata.requestId,
          devices  : reqdata.inputs[0].payload.devices
        }, response);

        break;
      case 'action.devices.EXECUTE':
        DEBUG && console.log('post /smarthome EXECUTE');
        /**
             * request:
             * {
             *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
             *   "inputs": [{
             *     "intent": "action.devices.EXECUTE",
             *     "payload": {
             *       "commands": [{
             *         "devices": [{
             *           "id": "123",
             *           "customData": {
             *             "fooValue": 12,
             *             "barValue": true,
             *             "bazValue": "alpaca sauce"
             *           }
             *         }, {
             *           "id": "234",
             *           "customData": {
             *              "fooValue": 74,
             *              "barValue": false,
             *              "bazValue": "sheep dip"
             *           }
             *         }],
             *         "execution": [{
             *           "command": "action.devices.commands.OnOff",
             *           "params": {
             *             "on": true
             *           }
             *         }]
             *       }]
             *     }
             *   }]
             * }
             */
        exec(client, {
          requestId: reqdata.requestId,
          commands : reqdata.inputs[0].payload.commands
        }, response);

        break;
      default:
        response.status(401).set({
          'Access-Control-Allow-Origin' : '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }).json({ error: 'missing intent' });
        break;
      }
    }

  });
  /**
   * Enables prelight (OPTIONS) requests made cross-domain.
   */
  app.options('/smarthome', function (request, response) {
    response.status(200).set({
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }).send('null');
  });

  /**
   *
   * @param client
   * @param data
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf"
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": [{
   *         "id": "123",
   *         "type": "action.devices.types.Outlet",
   *         "traits": [
   *            "action.devices.traits.OnOff"
   *         ],
   *         "name": {
   *             "defaultNames": ["TP-Link Outlet C110"],
   *             "name": "Homer Simpson Light",
   *             "nicknames": ["wall plug"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *         // None defined for these traits yet.
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "tplink",
   *           "model": "c110",
   *           "hwVersion": "3.2",
   *           "swVersion": "11.4"
   *         },
   *         "customData": {
   *           "fooValue": 74,
   *           "barValue": true,
   *           "bazValue": "sheepdip"
   *         }
   *       }, {
   *         "id": "456",
   *         "type": "action.devices.types.Light",
   *         "traits": [
   *           "action.devices.traits.OnOff",
   *           "action.devices.traits.Brightness",
   *           "action.devices.traits.ColorTemperature",
   *           "action.devices.traits.ColorSpectrum"
   *         ],
   *         "name": {
   *           "defaultNames": ["OSRAM bulb A19 color hyperglow"],
   *           "name": "lamp1",
   *           "nicknames": ["reading lamp"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *           "TemperatureMinK": 2000,
   *           "TemperatureMaxK": 6500
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "osram",
   *           "model": "hg11",
   *           "hwVersion": "1.2",
   *           "swVersion": "5.4"
   *         },
   *         "customData": {
   *           "fooValue": 12,
   *           "barValue": false,
   *           "bazValue": "dancing alpaca"
   *         }
   *       }, {
   *         "id": "234"
   *         // ...
   *     }]
   *   }
   * }
   */
  function sync(client, data, response) {
    return new Promise((resolve) => {
      gatewayClient.smartHomeGetDevices(client).then(devices => {
        if (!devices) {
          response.status(500).set({
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }).json({ error: 'failed' });
          resolve();
          return;
        }
        let deviceList = [];
        Object.keys(devices).forEach(function (key) {
          if (devices.hasOwnProperty(key) && devices[key]) {
            DEBUG && console.log('Getting device information for id \'' + key + '\'');
            let device = devices[key];
            device.id = key;
            deviceList.push(device);
          }
        });
        let deviceProps = {
          requestId: data.requestId,
          payload  : {
            agentUserId: auth.gatewayToId(client.gateway),
            devices    : deviceList
          }
        };
        DEBUG && console.log('sync response', JSON.stringify(deviceProps, undefined, 1));
        response.status(200).json(deviceProps);
        resolve(deviceProps);
      });
    });
  }

  /**
   *
   * @param client
   * @param data
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "devices": [{
   *     "id": "123",
   *       "customData": {
   *         "fooValue": 12,
   *         "barValue": true,
   *         "bazValue": "alpaca sauce"
   *       }
   *   }, {
   *     "id": "234"
   *   }]
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true ,
   *         "online": true
   *       },
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulian",
   *           "spectrumRGB": 31655
   *         }
   *       },
   *       ...
   *     }
   *   }
   * }
   */
  function query(client, data, response) {
    DEBUG && console.log('query', JSON.stringify(data));
    let deviceIds = getDeviceIds(data.devices);

    return new Promise((resolve) => {
      gatewayClient.smartHomeGetStates(client, deviceIds).then(devices => {
        if (!devices) {
          response.status(500).set({
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }).json({ error: 'failed' });
          resolve();
          return;
        }
        let deviceStates = {
          requestId: data.requestId,
          payload  : {
            devices: devices
          }
        };
        DEBUG && console.log('query response', JSON.stringify(deviceStates));
        response.status(200).json(deviceStates);
        resolve(deviceStates);
      });
    });
  }

  /**
   *
   * @param devices
   * [{
   *   "id": "123"
   * }, {
   *   "id": "234"
   * }]
   * @return {Array} ["123", "234"]
   */
  function getDeviceIds(devices) {
    return devices.map(function (device) {
      return device.id;
    });
  }

  /**
   * 
   * @param client
   * @param data:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *          "fooValue": 74,
   *          "barValue": false
   *       }
   *     }, {
   *       "id": "456",
   *       "customData": {
   *          "fooValue": 12,
   *          "barValue": true
   *       }
   *     }, {
   *       "id": "987",
   *       "customData": {
   *          "fooValue": 35,
   *          "barValue": false,
   *          "bazValue": "sheep dip"
   *       }
   *     }],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *           "on": true
   *       }
   *     }]
   *  }
   *
   * @param response
   * @return {{}}
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "commands": [{
   *       "ids": ["123"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["456"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["987"],
   *       "status": "OFFLINE",
   *       "states": {
   *         "online": false
   *       }
   *     }]
   *   }
   * }
   */
  function exec(client, data, response) {
    DEBUG && console.log('exec', JSON.stringify(data));

    return new Promise((resolve) => {
      let respCommands = [];

      let promises = data.commands.map(function (curCommand) {
        let deviceIds = getDeviceIds(curCommand.devices);
        let exec = curCommand.execution;

        return new Promise((resolve) => {
          gatewayClient.smartHomeExec(client, deviceIds, exec).then((states) => {

            respCommands.push({
              ids      : deviceIds,
              status   : 'SUCCESS',
              states   : states,
              errorCode: undefined
            });
            resolve();

          }).catch(error => {
            console.error(error);
            respCommands.push({
              ids   : deviceIds,
              status: 'OFFLINE',
              states: {
                online: false
              },
              errorCode: error
            });
            resolve();
          });
        });
      });

      Promise.all(promises).then(() => {
        let resBody = {
          requestId: data.requestId,
          payload  : {
            commands: respCommands
          }
        };
        DEBUG && console.log('exec response', JSON.stringify(resBody));
        response.status(200).json(resBody);
        resolve(resBody);
      });
    });
  }
}

exports.registerAgent = registerAgent;
