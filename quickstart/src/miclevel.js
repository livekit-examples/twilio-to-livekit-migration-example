// @ts-check

'use strict';

const { createAudioAnalyser } = require('livekit-client');

/**
 * Calculate the root mean square (RMS) of the given array.
 * @param samples
 * @returns {number} the RMS value
 */
function rootMeanSquare(samples) {
  const sumSq = samples.reduce((sumSq, sample) => sumSq + sample * sample, 0);
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Poll the microphone's input level.
 * @param audioTrack - the AudioTrack representing the microphone
 * @param maxLevel - the calculated level should be in the range [0 - maxLevel]
 * @param onLevel - called when the input level changes
 */
module.exports = function micLevel(audioTrack, maxLevel, onLevel) {
  const { analyser } = createAudioAnalyser(audioTrack, {
    fftSize: 1024,
    smoothingTimeConstant: 0.5,
  });

  startAnimation(analyser, new Uint8Array(analyser.frequencyBinCount));
  let rafID = 0;

  let level = null;

  function startAnimation(analyser, samples) {
    window.cancelAnimationFrame(rafID);

    rafID = requestAnimationFrame(function checkLevel() {
      analyser.getByteFrequencyData(samples);
      const rms = rootMeanSquare(samples);
      const log2Rms = rms && Math.log2(rms);
      const newLevel = Math.ceil((maxLevel * log2Rms) / 8);

      if (level !== newLevel) {
        level = newLevel;
        onLevel(level);
      }

      rafID = requestAnimationFrame(
        audioTrack.mediaStreamTrack.readyState === 'ended'
          ? () => onLevel(0)
          : checkLevel
      );
    });
  }
};
