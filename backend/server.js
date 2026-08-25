const app = require('./app');

// CloudLinux/Phusion Passenger gerencia o servidor e exige que o startup file
// exporte a aplicação, sem chamar app.listen(). Em desenvolvimento/local,
// continuamos iniciando o servidor normalmente para testes.
if (typeof PhusionPassenger !== 'undefined') {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`\n🚀 Backend rodando em http://localhost:${PORT}`);
    console.log(`📋 Health:               http://localhost:${PORT}/api/health`);
    console.log(`👤 Users:                http://localhost:${PORT}/api/users`);
    console.log(`💰 Solicitações Desconto: http://localhost:${PORT}/api/solicitacoes-desconto`);
    console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}\n`);
  });
}