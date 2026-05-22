const PG_ERRORS = {
  '23505': { status: 409, message: 'Registro duplicado' },
  '23503': { status: 400, message: 'Violação de chave estrangeira' },
  '23502': { status: 400, message: 'Campo obrigatório ausente' },
  '42P01': { status: 500, message: 'Tabela não encontrada no banco' },
  '28P01': { status: 500, message: 'Credenciais do banco inválidas' },
  ECONNREFUSED: { status: 503, message: 'Banco de dados indisponível' },
};

function errorHandler(err, req, res, _next) {
  const pgErr = PG_ERRORS[err.code];
  if (pgErr) {
    console.error('❌ ERRO COMPLETO POSTGRESQL:');
    console.error(err);
    return res.status(pgErr.status).json({
      success: false,
      error: pgErr.message,
      ...(process.env.NODE_ENV === 'development' && { detail: err.detail }),
    });
  }

  const status = err.status || err.statusCode || 500;
  console.error(`❌ [${status}] ${err.message}`);

  res.status(status).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
