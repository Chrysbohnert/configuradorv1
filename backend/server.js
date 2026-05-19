const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📋 Health:  http://localhost:${PORT}/api/health`);
  console.log(`👤 Users:   http://localhost:${PORT}/api/users`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
});