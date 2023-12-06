'use strict';

const { VideoPresets } = require('livekit-client');
const { isMobile } = require('./browser');
const joinRoom = require('./joinroom');
const micLevel = require('./miclevel');
const selectMedia = require('./selectmedia');
const selectRoom = require('./selectroom');
const showError = require('./showerror');

const $modals = $('#modals');
const $selectMicModal = $('#select-mic', $modals);
const $selectCameraModal = $('#select-camera', $modals);
const $showErrorModal = $('#show-error', $modals);
const $joinRoomModal = $('#join-room', $modals);

/**
 * @type {import('livekit-client').RoomOptions}
 */
const options = {
  publishDefaults: {
    videoEncoding: VideoPresets.h720.encoding
  }
};

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
if (isMobile && options.publishDefaults) {
  options.publishDefaults.videoEncoding = VideoPresets.h540.encoding;
}

// On mobile browsers, there is the possibility of not getting any media even
// after the user has given permission, most likely due to some other app reserving
// the media device. So, we make sure users always test their media devices before
// joining the Room. For more best practices, please refer to the following guide:
// https://www.twilio.com/docs/video/build-js-video-application-recommendations-and-best-practices
const deviceIds = {
  audio: isMobile
    ? undefined
    : localStorage.getItem('audioDeviceId') ?? undefined,
  video: isMobile
    ? undefined
    : localStorage.getItem('videoDeviceId') ?? undefined
};

/**
 * Select your Room name, your screen name and join.
 * @param [error=null] - Error from the previous Room session, if any
 */
async function selectAndJoinRoom(error = null) {
  const formData = await selectRoom($joinRoomModal, error);
  if (!formData) {
    // User wants to change the camera and microphone.
    // So, show them the microphone selection modal.
    deviceIds.audio = undefined;
    deviceIds.video = undefined;
    return selectMicrophone();
  }
  const { identity, roomName } = formData;

  try {
    // Fetch an AccessToken to join the Room.
    const response = await fetch(
      `/token?identity=${identity}&room=${roomName}`
    );

    // Extract the AccessToken from the Response.
    const { livekitUrl, token } = await response.json();

    // Add the specified audio device ID to ConnectOptions.
    options.audioCaptureDefaults = { deviceId: deviceIds.audio };

    // Add the specified video device ID to ConnectOptions.
    options.videoCaptureDefaults = { deviceId: deviceIds.video };

    // Join the Room.
    await joinRoom(livekitUrl, token, options);

    // After the video session, display the room selection modal.
    return selectAndJoinRoom();
  } catch (error) {
    return selectAndJoinRoom(error);
  }
}

/**
 * Select your camera.
 */
async function selectCamera() {
  if (deviceIds.video === null) {
    try {
      deviceIds.video = await selectMedia('video', $selectCameraModal, videoTrack => {
          const $video = $('video', $selectCameraModal);
          videoTrack.attach($video.get(0));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectAndJoinRoom();
}

/**
 * Select your microphone.
 */
async function selectMicrophone() {
  if (deviceIds.audio === null) {
    try {
      deviceIds.audio = await selectMedia('audio', $selectMicModal, audioTrack => {
          const $levelIndicator = $('svg rect', $selectMicModal);
          const maxLevel = Number($levelIndicator.attr('height'));
          micLevel(audioTrack, maxLevel, level => $levelIndicator.attr('y', maxLevel - level));
      });
    } catch (error) {
      showError($showErrorModal, error);
      return;
    }
  }
  return selectCamera();
}

window.addEventListener('load', () => selectMicrophone());
