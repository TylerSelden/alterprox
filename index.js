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

var tcpServer = tls.createServer(options, (clientSocket) => {
  const targetSocket = net.createConnection({ host: config.targetHost, port: config.targetPort }, () => {
    console.log('Connected to the target server.');
  });

  clientSocket.on('data', (data) => {
    targetSocket.write(data);
  });

  targetSocket.on('data', (data) => {
    clientSocket.write(data);
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

tcpServer.listen(() => {
  console.log(`SSL Proxy to ${config.targetHost}:${config.targetPort} listening on port ${config.telnetPort}`);
});





const httpServer = https.createServer(options);

const wsServer = new WebSocketServer({
  httpServer: httpServer
});

wsServer.on('request', (request) => {
  const connection = request.accept(null, request.origin);

  const targetSocket = net.createConnection({ host: config.targetHost, port: config.targetPort }, () => {
  });

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      targetSocket.write(message.utf8Data);
    }
  });

  targetSocket.on('data', (data) => {
    var decoded = data.toString("latin1", 0, data.length);
    connection.sendUTF(decoded);
  });

  connection.on('close', () => {
    targetSocket.end(); // close target socket
  });

  targetSocket.on('end', () => {
    connection.close();
  });

  connection.on('error', (err) => {
    console.error('WebSocket Client error:', err.message);
  });
  targetSocket.on('error', (err) => {
    console.error('Target server error:', err.message);
  });
});

httpServer.listen(config.socketPort, () => {
  console.log(`WebSocket server listening on port ${config.socketPort}`);
});
