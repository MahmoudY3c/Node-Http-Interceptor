const express = require('express');
const httpProxy = require('http-proxy');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const { delay } = require('./handlers');
const { getDeviceLocalIp } = require('./config');
const zlib = require('zlib');
const chalk = require('chalk');

const proxy = httpProxy.createProxyServer({
  followRedirects: true, // Enable following redirects
  selfHandleResponse: true, // Handle responses manually to manage headers and cookies
});

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    preflightContinue: true,
  })
);


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


// request interceptor
app.use((req, res, next) => {
  if (req.url === '/' || ['localhost', '127.0.0.1', getDeviceLocalIp()].includes(req.hostname)) {
    res.status(400).send('Invalid target URL.');
    return;
  }
  console.log('Request Headers:', req.headers);
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);
  console.log('Request Body:', req.body);

  let body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body).toString();
    if (body) console.log('Request Body:', body);
    next();
  });
});

const responseParser = (bodyBuffer, encoding) => {
  return new Promise((resolve, reject) => {
    if (encoding === 'gzip') {
      zlib.gunzip(bodyBuffer, (err, decoded) => {
        if (!err) {
          resolve(decoded.toString('utf8'));
        } else {
          console.error('Error decompressing gzip:', err);
        }
      });
    } else if (encoding === 'deflate') {
      zlib.inflate(bodyBuffer, (err, decoded) => {
        if (!err) {
          resolve(decoded.toString('utf8'));
        } else {
          console.error('Error decompressing deflate:', err);
        }
      });
    } else if (encoding === 'br') {
      zlib.brotliDecompress(bodyBuffer, (err, decoded) => {
        if (!err) {
          resolve(decoded.toString('utf8'));
        } else {
          console.error('Error decompressing brotli:', err);
        }
      });
    } else {
      resolve(bodyBuffer.toString('utf8'));
    }
  });
}

/**
 * 
 * @param {import('http').IncomingMessage} proxyRes 
 * @param {express.Response} res 
 */
const showResponseBody = (proxyRes, res) => {
  let encoding = proxyRes.headers['content-encoding'];
  console.log('Response Headers:', proxyRes.headers);
  console.log('Response encoding:', encoding);

  /**
   * @type {Buffer[]}
   */
  let responseBody = [];
  proxyRes.on('data', (chunk) => {
    responseBody.push(chunk);
  });

  proxyRes.on('end', async () => {
    const bodyBuffer = Buffer.concat(responseBody);
    console.log('Response Body:', await responseParser(bodyBuffer, encoding));
  });
}

proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(chalk.bgGreen('[Proxy Request]'), `${req.method} ${req.url}`);
});

// response interceptor
proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(chalk.green('[Proxy Response]'), `${proxyRes.statusCode} ${req.url}`);

  // Capture headers from the proxied response
  const headers = { ...proxyRes.headers };

  // Ensure cookies are properly passed to the client
  if (proxyRes.headers['set-cookie']) {
    headers['set-cookie'] = proxyRes.headers['set-cookie'].map((cookie) =>
      cookie.replace(/; secure/gi, '') // Remove `Secure` flag for compatibility with HTTP
    );
  }

  showResponseBody(proxyRes, res);
  // Copy status code and headers to the response
  res.writeHead(proxyRes.statusCode, headers);

  // Pipe the response body to the client
  proxyRes.pipe(res);
});

app.use(
  async (req, res) => {
    const target = req.url.startsWith('http')
      ? req.url
      : `http://${req.headers.host}${req.url}`;
    console.log(target, 'target');
    // await delay(2000);
    proxy.web(req, res, { target });
  }
);

// Proxy error handling
proxy.on('error', (err, req, res) => {
  console.error('Proxy encountered an error:', err.message);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
  }

  res.end('Proxy encountered an error.');
});

module.exports = app;