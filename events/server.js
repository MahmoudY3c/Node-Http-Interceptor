const debug = require('debug')('chatgptarms');

const dns = require("dns");
const { Server: httpsServer } = require('https');
const os = require("os");
const net = require("net");
const chalk = require('chalk');

const events = {
  onServerError: function (error, port) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  },
  onSeverListening: function (server) {
    const protocol = server instanceof httpsServer ? 'https' : 'http';
    const addr = server.address();
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
    console.log('Listening on ' + bind);

    const look = dns.lookup(
      os.hostname(),
      {
        family: 4,
        all: true
      },
      function (err, addresses) {
        console.log(addresses)
        if (err) throw err
        // console.log(addresses)
        let localAddress = addresses.at(-1).address
        console.log(`Vist ${protocol}://${localAddress}:${addr.port}/`);
      }
    )
  },
  onSeverConnect: (req, clientSocket, head) => {
    try {
      console.log('someone trying to connect:', req.url)
      const [hostname, port] = req.url.split(':');
      const serverSocket = net.connect(port, hostname, () => {
        clientSocket.write(
          'HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n\r\n'
        );
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      serverSocket.on('error', (err) => {
        console.error(chalk.red('Server socket error:'), err.message);
        clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      });

      clientSocket.on('error', (err) => {
        console.error(chalk.red('Client socket error:'), err.message);
        serverSocket.end();
      });
    } catch (err) {
      console.error(chalk.red('CONNECT handler error:'), err.message);
      clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    }
  }
}



module.exports = events