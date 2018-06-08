'use strict';

const gatewayClient = require('./gateway-client');
const auth = require('./auth-provider');
const datastore = require('./datastore');
const {requestSync, reportState} = require('./home-graph');

datastore.open();

const DEBUG = true;

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
  app.post('/smarthome', async function(request, response) {
    const reqdata = request.body;
    const authToken = auth.getAccessToken(request);

    DEBUG && console.log('smarthome', reqdata);

    const client = await datastore.getGatewayByToken(authToken);

    if (!client) {
      response.status(403).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({
        requestId: reqdata.requestId,
        payload  : {
          errorCode: 'authExpired',
        },
      });
      return;
    }

    if (!reqdata.inputs) {
      response.status(401).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'missing inputs'});
      return;
    }

    for (let i = 0; i < reqdata.inputs.length; i++) {
      const input = reqdata.inputs[i];
      const intent = input.intent;
      if (!intent) {
        response.status(401).set({
          'Access-Control-Allow-Origin' : '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }).json({error: 'missing inputs'});
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
          requestId: reqdata.requestId,
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
          devices  : reqdata.inputs[0].payload.devices,
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
          commands : reqdata.inputs[0].payload.commands,
        }, response);

        break;
      default:
        response.status(401).set({
          'Access-Control-Allow-Origin' : '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }).json({error: 'missing intent'});
        break;
      }
    }
  });
  /**
   * Enables prelight (OPTIONS) requests made cross-domain.
   */
  app.options('/smarthome', function(request, response) {
    response.status(200).set({
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  async function sync(client, data, response) {
    const devices = await gatewayClient.smartHomeGetDevices(client);

    if (!devices) {
      response.status(500).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'failed'});
      return;
    }

    const deviceList = [];

    Object.keys(devices).forEach(function(key) {
      if (devices.hasOwnProperty(key) && devices[key]) {
        DEBUG && console.log('Getting device information for id \'' + key + '\'');

        const device = devices[key];
        device.id = key;
        deviceList.push(device);
      }
    });

    const deviceProps = {
      requestId: data.requestId,
      payload  : {
        agentUserId: auth.gatewayToId(client.gateway),
        devices    : deviceList,
      },
    };

    DEBUG && console.log('sync response', JSON.stringify(deviceProps, undefined, 1));

    response.status(200).json(deviceProps);
    return;
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
  async function query(client, data, response) {
    DEBUG && console.log('query', JSON.stringify(data));

    const deviceIds = getDeviceIds(data.devices);

    const devices = await gatewayClient.smartHomeGetStates(client, deviceIds);
    if (!devices) {
      response.status(500).set({
        'Access-Control-Allow-Origin' : '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }).json({error: 'failed'});
      return;
    }

    const deviceStates = {
      requestId: data.requestId,
      payload  : {
        devices: devices,
      },
    };

    DEBUG && console.log('query response', JSON.stringify(deviceStates));
    response.status(200).json(deviceStates);
    return;
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
    return devices.map(function(device) {
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
  async function exec(client, data, response) {
    DEBUG && console.log('exec', JSON.stringify(data));

    const promises = data.commands.map(function(curCommand) {
      const deviceIds = getDeviceIds(curCommand.devices);
      const exec = curCommand.execution;

      return new Promise(async (resolve) => {
        try {
          const {devices, query} = await gatewayClient.smartHomeExec(client, deviceIds, exec);

          reportState(auth.gatewayToId(client.gateway), data.requestId, devices);
          resolve({
            ids      : deviceIds,
            status   : 'SUCCESS',
            states   : query,
            errorCode: undefined,
          });
        } catch (error) {
          console.error(error);

          resolve({
            ids   : deviceIds,
            status: 'OFFLINE',
            states: {
              online: false,
            },
            errorCode: error,
          });
        }
      });
    });

    const respCommands = await Promise.all(promises);

    const resBody = {
      requestId: data.requestId,
      payload  : {
        commands: respCommands,
      },
    };

    DEBUG && console.log('exec response', JSON.stringify(resBody));
    // setTimeout(requestSync, 2000, auth.gatewayToId(client.gateway));
    response.status(200).json(resBody);
    return;
  }
}

exports.registerAgent = registerAgent;
