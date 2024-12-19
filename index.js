const { getCert } = require("./cert");
const http = require('http');
const https = require('https');
const { HTTPS_PORT, HTTP_PORT } = require('./config');
const { onSeverListening, onSeverConnect } = require('./events/server');
const app = require("./app");

getCert()
  .then(cert => {
    const httpsConfig = {
      key: cert.key,
      cert: cert.cert,        // Use the certificate
      ca: cert.fullchain,     // Use the full chain as the CA
    };

    //handle https server
    const httpsServer = https.createServer(httpsConfig, app);
    httpsServer.listen(HTTPS_PORT, '0.0.0.0');
    httpsServer.on("error", (err) => onServernError(err, HTTPS_PORT));
    httpsServer.on('listening', () => onSeverListening(httpsServer));
    httpsServer.on('connect', onSeverConnect);

    const httpServer = http.createServer(app);
    httpServer.listen(HTTP_PORT, '0.0.0.0');
    httpServer.on("error", (err) => onServernError(err, HTTP_PORT))
    httpServer.on('listening', () => onSeverListening(httpServer));
    httpServer.on('connect', onSeverConnect);

    process.on('SIGINT', () => {
      console.log('Shutting down servers...');
      httpsServer.close(() => console.log('HTTPS server closed'));
      httpServer.close(() => console.log('HTTP server closed'));
      process.exit(0);
    });
  });
