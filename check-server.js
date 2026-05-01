const http = require('http');
http.get('http://127.0.0.1:3000', (res) => {
  console.log('Server is running:', res.statusCode);
  process.exit(0);
}).on('error', (e) => {
  console.log('Server not running:', e.message);
  process.exit(1);
});
