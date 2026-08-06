const { TOTP } = require('otpauth');
const secret = 'UYJTG7GJPC4AWGXE5R36AOC6ZPLU2QO6';
const totp = new TOTP({ secret, window: 1 });
const token = totp.generate();
console.log('otpauth thinks token is:', token);
console.log('IsValid for itself:', totp.validate({ token, window: 1 }) !== null);
