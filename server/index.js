// @ts-check

"use strict";

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.LIVEKIT_URL
 * process.env.LIVEKIT_KEY
 * process.env.LIVEKIT_SECRET
 */
require("dotenv").load();

const express = require("express");
const http = require("http");
const path = require("path");
const { AccessToken } = require("livekit-server-sdk");

// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;

// Create Express webapp.
const app = express();

// Set up the paths for the examples.
[
  "bandwidthconstraints",
  "codecpreferences",
  "dominantspeaker",
  "localvideofilter",
  "localvideosnapshot",
  "mediadevices",
  "networkquality",
  "reconnection",
  "screenshare",
  "localmediacontrols",
  "remotereconnection",
  "datatracks",
  "manualrenderhint",
  "autorenderhint",
].forEach((example) => {
  const examplePath = path.join(__dirname, `../examples/${example}/public`);
  app.use(`/${example}`, express.static(examplePath));
});

// Set up the path for the quickstart.
const quickstartPath = path.join(__dirname, "../quickstart/public");
app.use("/quickstart", express.static(quickstartPath));

// Set up the path for the examples page.
const examplesPath = path.join(__dirname, "../examples");
app.use("/examples", express.static(examplesPath));

/**
 * Default to the Quick Start application.
 */
app.get("/", (request, response) => {
  response.redirect("/quickstart");
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */
app.get("/token", function (request, response) {
  const { identity } = request.query;
  if (typeof identity !== "string") {
    return response.status(400);
  }

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const token = new AccessToken(
    process.env.LIVEKIT_KEY,
    process.env.LIVEKIT_SECRET,
    { ttl: MAX_ALLOWED_SESSION_DURATION, identity }
  );

  // Grant the access token Twilio Video capabilities.
  /**
   * @type {import('livekit-server-sdk').VideoGrant}
   */
  const grant = {
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomJoin: true,
    roomCreate: true,
  };
  token.addGrant(grant);
  response.json({
    // Serialize the token to a JWT string.
    token: token.toJwt(),
    livekitUrl: process.env.LIVEKIT_URL,
  });
});

// Create http server and run it.
const server = http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Express server running on *:" + port);
});
