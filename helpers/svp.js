// this contains the helper functions, events and signalling for the SVP
// (Smart Vibration Platform) experiment

// Experiment data
let mrValue = 0;
let smaValue = 0;
let motorSpeed = 0;
let temp = 25;
let acc = 0;

let interval = 10;

// Function to return actual data received from the raspberry pi
function getActualData() {
  return {
    status: temp > 80 ? (temp > 90 ? "overheat" : "warning") : "healthy",
    mrValue: mrValue,
    smaValue: smaValue,
    motorSpeed: motorSpeed,
    temp: temp,
    acc: acc,
  };
}

// webRTC related variables
const users = {};
const socketToExperiment = {};

// SVP Socket logic
function svpSocket(io) {
  // Websocket connection
  io.on("connection", (socket) => {
    console.log(
      "A client connected to SVP Local Websocket server : ",
      socket.id,
      socket.handshake.auth
    );

    // Periodically send data to the frontend client
    const dataInterval = setInterval(() => {
      const responseData = getActualData();
      socket.emit("svpDataUpdate", responseData);
    }, interval);

    // Handle messages from the client i.e. the frontend (SVP)
    socket.on("svpClientMessage", (message) => {
      console.log("Received message from frontend client:", message);

      mrValue = message.mrValue;
      smaValue = message.smaValue;
      motorSpeed = message.motorSpeed;
    });

    // Handle messages from the raspberry pi (SVP)
    socket.on("svpRaspPiMessage", (message) => {
      // console.log("Received message from Rasp Pi:", message.acc);
      temp = message.temp;
      acc = message.acc;
      if (
        message.mrValue !== mrValue ||
        message.smaValue !== smaValue ||
        message.motorSpeed !== motorSpeed
      ) {
        socket.emit("svpServerResponse", {
          mrValue: mrValue,
          smaValue: smaValue,
          motorSpeed: motorSpeed,
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      // remove the disconnected user from the users[experiment] array
      const experiment = socketToExperiment[socket.id];
      let room = users[experiment];
      if (room) {
        room = room.filter((id) => id !== socket.id);
        users[experiment] = room;
      }
      console.log("A client disconnected", socket.id);
      clearInterval(dataInterval);
      mrValue = 0;
      smaValue = 0;
      motorSpeed = 0;
    });
  });
}

// export the function
module.exports = { svpSocket };
