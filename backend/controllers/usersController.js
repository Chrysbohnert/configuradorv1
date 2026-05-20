/**
 * usersController.js
 * Recebe req/res, chama o service, formata a resposta.
 * Sem SQL aqui — toda query fica em usersService.js.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/usersService');

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verificarSenha(senhaInput, senhaArmazenada) {
  if (!senhaInput || !senhaArmazenada) return false;
  if (sha256Hex(senhaInput) === senhaArmazenada) return true;
  if (senhaInput === senhaArmazenada) return true;
  return false;
}

const getUsers = asyncHandler(async (req, res) => {
  const { ativo } = req.query;
  const filter = {};
  if (typeof ativo !== 'undefined') filter.ativo = ativo === 'true';

  const users = await svc.findAll(filter);
  return res_.ok(res, users, { count: users.length });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await svc.findById(req.params.id);
  if (!user) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, user);
});

const createUser = asyncHandler(async (req, res) => {
  const { nome, email, senha, role, regiao, regioes_operacao } = req.body;

  if (!nome || !email || !senha) {
    return res_.badRequest(res, 'nome, email e senha são obrigatórios');
  }

  const existe = await svc.findByEmail(email);
  if (existe) return res_.conflict(res, 'E-mail já cadastrado');

  const senhaHash = await bcrypt.hash(senha, 10);
  const user = await svc.create({ nome, email, senhaHash, role, regiao, regioes_operacao });
  return res_.created(res, user);
});

const updateUser = asyncHandler(async (req, res) => {
  const updated = await svc.update(req.params.id, req.body);
  if (!updated) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, updated);
});

const deleteUser = asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, { message: 'Usuário removido com sucesso' });
});

const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ success: false, error: 'email e senha são obrigatórios' });
    }

    const user = await svc.findByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }

    if (!verificarSenha(senha, user.senha)) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }

    const secret = process.env.JWT_SECRET || 'stark-dev-secret-fallback';
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo, nome: user.nome },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { senha: _s, ...userSemSenha } = user;
    return res.status(200).json({ success: true, data: { token, user: userSemSenha } });

  } catch (err) {
    console.error('❌ [login] Erro interno:', err);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
};

const getMe = asyncHandler(async (req, res) => {
  const user = await svc.findById(req.user.id);
  if (!user) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, user);
});

const updateMe = asyncHandler(async (req, res) => {
  const { nome, email, telefone, cpf, foto_perfil } = req.body;
  const updated = await svc.updateProfile(req.user.id, { nome, email, telefone, cpf, foto_perfil });
  if (!updated) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, updated);
});

const changePassword = asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res_.badRequest(res, 'senhaAtual e novaSenha são obrigatórios');
  }
  if (novaSenha.length < 6) {
    return res_.badRequest(res, 'Nova senha deve ter pelo menos 6 caracteres');
  }

  const fullUser = await svc.findByEmail(
    (await svc.findById(req.user.id))?.email || ''
  );
  if (!fullUser) return res_.notFound(res, 'Usuário não encontrado');

  if (!verificarSenha(senhaAtual, fullUser.senha)) {
    return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
  }

  const novaHash = sha256Hex(novaSenha);
  await svc.updatePassword(req.user.id, novaHash);
  return res_.ok(res, { message: 'Senha alterada com sucesso' });
});

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser, login, getMe, updateMe, changePassword };
