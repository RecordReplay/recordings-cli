const ProtocolClient = require("./client");
const { defer } = require("./utils");

let gClient;

async function initConnection(server, accessToken) {
  if (!gClient) {
    const { promise, resolve } = defer();
    gClient = new ProtocolClient(server, {
      async onOpen() {
        try {
          await gClient.setAccessToken(accessToken);
          resolve(true);
        } catch (err) {
          console.log(`Error authenticating with server: ${err}`);
          resolve(false);
        }
      },
      onClose() {
        console.log(`Server connection closed.`);
        resolve(false);
      },
      onError(e) {
        console.log(`Error connecting to server: ${e}`);
        resolve(false);
      },
    });
    return promise;
  }
  return true;
}

async function connectionCreateRecording(buildId) {
  const { recordingId } = await gClient.sendCommand(
    "Internal.createRecording",
    { buildId }
  );
  return recordingId;
}

// Granularity for splitting up a recording into chunks for uploading.
const ChunkGranularity = 1024 * 1024;

async function connectionUploadRecording(recordingId, contents) {
  const promises = [];
  for (let i = 0; i < contents.length; i += ChunkGranularity) {
    const buf = contents.subarray(i, i + ChunkGranularity);
    promises.push(
      gClient.sendCommand(
        "Internal.addRecordingData",
        { recordingId, offset: i, length: buf.length },
        buf
      )
    );
  }
  return Promise.all(promises);
}

function closeConnection() {
  if (gClient) {
    gClient.close();
    gClient = undefined;
  }
}

module.exports = {
  initConnection,
  connectionCreateRecording,
  connectionUploadRecording,
  closeConnection,
};
