const { parse } = require("dotenv");
const fs = require("fs");
const os = require("os");
const path = require('path');

const delay = ms => new Promise((resolve) => setTimeout(resolve, ms));

const getDeviceIps = (family = 'IPv4') => {
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flatMap(e =>
      e.filter(alias => alias.family.toLowerCase() === family.toLowerCase() && !alias.internal)
    )
    .map(e => e.address);
  return addresses;
}

const updateEnvVar = (varName, value) => {
  const envPath = path.join(process.cwd(), '.env');
  const envConfig = parse(envPath);
  // Update the value in memory
  envConfig[varName] = value;

  // Prepare the updated content
  const updatedEnv = Object.entries(envConfig)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Write the updated content back to the .env file
  fs.writeFileSync(envPath, updatedEnv, 'utf8');
}

const requestInterceptor = (req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request URL:', req.url);
  console.log('Request Method:', req.method);

  let body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body).toString();
    if (body) console.log('Request Body:', body);
    next();
  });
};

const responseInterceptor = (proxyRes, req, res) => {
  console.log('Response Headers:', proxyRes.headers);

  let responseBody = [];
  proxyRes.on('data', (chunk) => responseBody.push(chunk));
  proxyRes.on('end', () => {
    responseBody = Buffer.concat(responseBody).toString();
    if (responseBody) console.log('Response Body:', responseBody);
  });
};


module.exports = {
  getDeviceIps,
  updateEnvVar,
  requestInterceptor,
  delay,
};

