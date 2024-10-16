const net = require('net');
const tls = require('tls');
const fs = require('fs');
const WebSocketServer = require('websocket').server;
const https = require('https');
const config = require("./config.json");

const options = {
  key: fs.readFileSync(config.key),
  cert: fs.readFileSync(config.cert),
};

var logs = {
  ascii:  fs.createWriteStream("logs/ascii.log", { flags: 'a' }),
  utf8:   fs.createWriteStream("logs/utf8.log", { flags: 'a' }),
  latin1: fs.createWriteStream("logs/latin1.log", { flags: 'a' })
}

function writeLog(log, data) {
  logs[log].write(`\n\n${data}`);
}

var tcpServer = tls.createServer(options, (clientSocket) => {
  const targetSocket = tls.connect({ host: config.targetHost, port: config.targetPort, rejectUnauthorized: false }, () => {
    console.log('Connected to the target server.');
  });

  clientSocket.on('data', (data) => {
    targetSocket.write(data);
    writeLog("ascii", `Client: ${data.toString("ascii")}`);
    writeLog("utf8", `Client: ${data.toString("utf8")}`);
    writeLog("latin1", `Client: ${data.toString("latin1")}`);
  });

  targetSocket.on('data', (data) => {
    clientSocket.write(data);
    writeLog("ascii", `Server: ${data.toString("ascii")}`);
    writeLog("utf8", `Server: ${data.toString("utf8")}`);
    writeLog("latin1", `Server: ${data.toString("latin1")}`);
  });

  clientSocket.on('end', () => {
    targetSocket.end();
  });

  targetSocket.on('end', () => {
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error('SSL Client error:', err.message);
  });
  targetSocket.on('error', (err) => {
    console.error('Target server error:', err.message);
  });
});

tcpServer.listen(config.telnetPort, () => {
  console.log(`SSL Proxy to ${config.targetHost}:${config.targetPort} listening on port ${config.telnetPort}`);
});
