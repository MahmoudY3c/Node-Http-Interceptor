
const { updateEnvVar } = require('../handlers');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
let DEVICE_LOCAL_IP = process.env.DEVICE_LOCAL_IP;

const getDeviceLocalIp = () => DEVICE_LOCAL_IP;
const updateDeviceLocalIp = (ip) => {
  DEVICE_LOCAL_IP = ip;
  updateEnvVar('DEVICE_LOCAL_IP', ip);
};

module.exports = { NODE_ENV, HTTP_PORT, HTTPS_PORT, updateDeviceLocalIp, getDeviceLocalIp };