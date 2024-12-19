
- use the next function to generate certificate automatically
``` js
const fs = require('fs');
const path = require('path');
const { getDeviceLocalIp, updateDeviceLocalIp } = require('../config');
const { getDeviceIps } = require('../handlers');
const chalk = require('chalk');
const { createCA, createCert } = require('mkcert');
const { exec } = require('child_process');

const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');
const fullchainPath = path.join(__dirname, 'fullchain.pem');
const caCertPath = path.join(__dirname, 'ca-cert.pem'); // Save the CA certificate

const generateCert = async () => {
  const localIp = getDeviceLocalIp();
  const ips = getDeviceIps();
  const isCertGenerated = fs.existsSync(certPath);
  const isLocalIpNotChanged = typeof ips.find(e => e === localIp) !== 'undefined';
  const deviceIp = isLocalIpNotChanged ? localIp : ips.find(e => e.includes('192.168'));
  const certData = { key: '', cert: '', fullchain: '', caCert: '' };

  console.log(ips);

  if (!isLocalIpNotChanged) {
    console.log(chalk.red('DEVICE IP CHANGED:'), deviceIp);
    updateDeviceLocalIp(deviceIp);
  }

  if (!isCertGenerated || !isLocalIpNotChanged) {
    const ca = await createCA({
      organization: "Node Proxy",
      countryCode: "EG",
      state: "Cairo",
      locality: "Giza",
      validity: 365
    });

    const cert = await createCert({
      ca: { key: ca.key, cert: ca.cert },
      organization: 'Node Proxy',
      domains: ["127.0.0.1", "localhost", deviceIp],
      validity: 365
    });

    certData.cert = cert.cert;
    certData.key = cert.key;
    certData.fullchain = `${cert.cert}${ca.cert}`;
    certData.caCert = ca.cert;

    fs.writeFileSync(certPath, certData.cert);
    fs.writeFileSync(keyPath, certData.key);
    fs.writeFileSync(fullchainPath, certData.fullchain);
    fs.writeFileSync(caCertPath, certData.caCert); // Save the CA certificate for trust installation

    console.log(chalk.green('Certificates generated successfully!'));
    console.log(chalk.yellow(`CA certificate saved to ${caCertPath}`));
  } else {
    certData.cert = fs.readFileSync(certPath, 'utf-8');
    certData.key = fs.readFileSync(keyPath, 'utf-8');
    certData.fullchain = fs.readFileSync(fullchainPath, 'utf-8');
    certData.caCert = fs.readFileSync(caCertPath, 'utf-8');
  }

  return certData;
};

```

- after generate the certificate make it trusted by windows 
  - Press `Win` + `R` 
  - Write `certmgr.msc` then Enter
  - Import `ca-cert.cert` file into Trusted Root Certification Authorities and follow steps `Certificates > Trusted Root Certification Authorities > Certificates > All Tasks > Import`. Make sure to import `ca-cert.cert` not `cert.pem`
  - Now You Are Ready

- Use `key.pem` and `fullchain.pem` for configuring the Node.js HTTPS server.
``` js
generateCert()
  .then(cert => {
    const httpsConfig = {
      key: cert.key,
      cert: cert.fullchain,
    };

    console.log('cert generated');
    //handle https server
    const httpsServer = https.createServer(httpsConfig, app);
    httpsServer.listen(8443, '0.0.0.0');
    httpsServer.on("error", (err) => onServernError(err, HTTPS_PORT));
    httpsServer.on('listening', () => onSeverListening(httpsServer));
  });
```



