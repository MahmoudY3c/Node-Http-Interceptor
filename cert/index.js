
const fs = require('fs');
const path = require('path');
const { getDeviceLocalIp, updateDeviceLocalIp } = require('../config');
const { getDeviceIps } = require('../handlers');
const chalk = require('chalk');
const { createCA, createCert } = require('mkcert');
const { execSync } = require('child_process');

const certificateFolder = path.join(__dirname, 'certificate');
if (!fs.existsSync(certificateFolder)) {
  fs.mkdirSync(certificateFolder);
}

const certPath = path.join(certificateFolder, 'cert.pem');
const keyPath = path.join(certificateFolder, 'key.pem');
const fullchainPath = path.join(certificateFolder, 'fullchain.pem');
const caCertPath = path.join(certificateFolder, 'ca-cert.pem'); // Save the CA certificate


// Helper function to run system commands and handle errors
const runCommand = (command, successMessage) => {
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(successMessage));
  } catch (error) {
    console.error(chalk.red(`Error running command: ${command}`));
    console.error(error);
  }
};

// ! requires admin privlages so use scripts instead
// Function to automatically trust the CA certificate based on the OS
const trustCaCert = (caCertPath) => {
  console.log(chalk.blue('Attempting to add CA certificate to system trust store...'));

  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS
    runCommand(
      `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${caCertPath}"`,
      'CA certificate added to macOS system trust store.'
    );
  } else if (platform === 'win32') {
    // Windows
    runCommand(
      `certutil -addstore -f "Root" "${caCertPath}"`,
      'CA certificate added to Windows Trusted Root Certification Authorities.'
    );
  } else if (platform === 'linux') {
    // Linux (Debian/Ubuntu)
    runCommand(
      `sudo cp "${caCertPath}" /usr/local/share/ca-certificates/ && sudo update-ca-certificates`,
      'CA certificate added to Linux system trust store.'
    );
  } else {
    console.warn(chalk.yellow('Unsupported OS for automatic trust installation. Please add the CA certificate manually.'));
  }
};

const runInstallScript = (certPath) => {
  const platform = process.platform;
  const batScript = path.join(__dirname, 'installer/install_cert.bat');
  const bashScript = path.join(__dirname, 'installer/install_cert.sh');

  try {
    if (platform === 'win32') {
      console.log('Running Windows .bat script to install the certificate...');
      // Properly escape and wrap paths in quotes
      const command = `cmd.exe /c ""${batScript}" "${certPath}""`;
      execSync(command, { stdio: 'inherit' });
    } else if (platform === 'linux' || platform === 'darwin') {
      console.log('Running Linux/macOS .bash script to install the certificate...');
      execSync(`bash "${bashScript}" "${certPath}"`, { stdio: 'inherit' });
    } else {
      console.error('Unsupported platform for certificate installation.');
    }
  } catch (error) {
    console.error('Error running the install script:', error);
  }
};


const getCert = async () => {
  try {
    const localIp = getDeviceLocalIp();
    const ips = getDeviceIps();
    const isCertGenerated = fs.existsSync(certPath);
    const isLocalIpNotChanged = typeof ips.find(e => e === localIp) !== 'undefined';
    const deviceIp = isLocalIpNotChanged ? localIp : ips.find(e => e.includes('192.168'));
    const certData = { key: '', cert: '', fullchain: '', caCert: '' };

    console.log(chalk.blue(`Detected IPs: ${ips.join(', ')}`));

    if (!isLocalIpNotChanged) {
      // console.log(chalk.red('DEVICE IP CHANGED:'), deviceIp);
      console.log(chalk.yellow(`Device IP changed to: ${deviceIp}`));
      updateDeviceLocalIp(deviceIp);
    }

    if (!isCertGenerated || !isLocalIpNotChanged) {
      // Create the CA certificate
      console.log(chalk.blue('Generating CA certificate...'));
      const ca = await createCA({
        organization: "Node Proxy",
        countryCode: "EG",
        state: "Cairo",
        locality: "Giza",
        validity: 365
      });

      // Create the end-entity certificate signed by the CA
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

      // Auto-trust the CA certificate
      runInstallScript(caCertPath);
    } else {
      certData.cert = fs.readFileSync(certPath, 'utf-8');
      certData.key = fs.readFileSync(keyPath, 'utf-8');
      certData.fullchain = fs.readFileSync(fullchainPath, 'utf-8');
      certData.caCert = fs.readFileSync(caCertPath, 'utf-8');
    }

    return certData;
  } catch (error) {
    console.error(chalk.red('Error generating certificates:'), error);
    process.exit(1);
  }
};

module.exports = { getCert };
