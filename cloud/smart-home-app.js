'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const morgan = require('morgan');
const ngrok = require('ngrok');
const session = require('express-session');

// internal app deps
const google_ha = require('./smart-home-provider');
const auth = require('./auth-provider');
const homeGraph = require('./home-graph');
const config = require('./config-provider');

process.on('unhandledRejection', console.dir);

function createApp(config) {
  let app = express();
  app.use(morgan('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.set('trust proxy', 1);
  app.use(session({
    name: '__session',
    secret: 'xyzsecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

  // !firebase functions
  if (!process.env.GCLOUD_PROJECT) {
    app.listen(config.devPortSmartHome, function () {
      /*
      ngrok.connect(config.devPortSmartHome, function (err, url) {
        if (err) {
          console.log('ngrok err', err);
          process.exit();
        }

        console.log("|###################################################|");
        console.log("|                                                   |");
        console.log("|        COPY & PASTE NGROK URL BELOW:              |");
        console.log("|                                                   |");
        console.log("|          " + url + "                |");
        console.log("|                                                   |");
        console.log("|###################################################|");

        console.log("=====");
        console.log("Visit the Actions on Google console at http://console.actions.google.com")
        console.log("Replace the webhook URL in the Actions section with:");
        console.log("    " + url + "/smarthome");
        console.log("");

        console.log("Finally press the 'TEST DRAFT' button");
      });
      */
    });
  }

  return app;
}


// Check that the API key was changed from the default
if (config.api_key === '<API_KEY>') {
  errorCallback(name, 'You need to set the API key in config.\n' +
    'Visit the Google Cloud Console to generate an API key for your project.\n' +
    'https://console.cloud.google.com\n' +
    'Exiting...');
  return;
}

let app = createApp(config);

google_ha.registerAgent(app);
auth.registerAuth(app);

module.exports = app;