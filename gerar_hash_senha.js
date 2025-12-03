const CryptoJS = require('crypto-js');

console.log('Hash para "admin123":', CryptoJS.SHA256('admin123').toString());
console.log('Hash para "Rodrigo@123":', CryptoJS.SHA256('Rodrigo@123').toString());
