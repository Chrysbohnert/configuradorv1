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

const {
  isAdminFull,
  isAdminConcessionarias,
  isAdminConcessionaria,
  isAdminCanalRepresentantes,
  isAdminCanalInterno,
  isAdminComercioExterior,
  canalDoUsuario,
  CANAIS,
} = require('../utils/permissions');

const ADMIN_TIPO_CANAL = {
  admin_representantes: CANAIS.REPRESENTANTES,
  admin_canal_interno: CANAIS.INTERNO,
  admin_concessionarias: CANAIS.CONCESSIONARIAS,
  admin_comercio_exterior: CANAIS.COMERCIO_EXTERIOR,
  admin_concessionaria: CANAIS.CONCESSIONARIAS,
};

const getUsers = asyncHandler(async (req, res) => {
  const { ativo } = req.query;
  const filter = {};
  if (typeof ativo !== 'undefined') filter.ativo = ativo === 'true';

  // Admin Concessionária vê apenas usuários da própria concessionária
  if (isAdminConcessionaria(req.user)) {
    filter.concessionaria_id = req.user.concessionaria_id;
  } else if (isAdminCanalRepresentantes(req.user)) {
    filter.canal = CANAIS.REPRESENTANTES;
  } else if (isAdminCanalInterno(req.user)) {
    filter.canal = CANAIS.INTERNO;
  } else if (isAdminComercioExterior(req.user)) {
    filter.canal = CANAIS.COMERCIO_EXTERIOR;
  } else if (isAdminConcessionarias(req.user)) {
    filter.canal = CANAIS.CONCESSIONARIAS;
  }

  const users = await svc.findAll(filter);
  return res_.ok(res, users, { count: users.length });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await svc.findById(req.params.id);
  if (!user) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, user);
});

const createUser = asyncHandler(async (req, res) => {
  const { nome, email, senha, tipo, regiao, regioes_operacao, concessionaria_id, telefone, cpf, canal } = req.body;

  if (!nome || !email || !senha) {
    return res_.badRequest(res, 'nome, email e senha são obrigatórios');
  }

  // Validação de permissão para criação de usuários por canal/perfil
  const targetCanal = ADMIN_TIPO_CANAL[tipo] || canal || canalDoUsuario({ tipo });
  const concessionariaIdEfetiva = tipo === 'admin_concessionaria'
    ? concessionaria_id
    : ADMIN_TIPO_CANAL[tipo]
    ? null
    : concessionaria_id;
  if (tipo === 'admin_concessionaria' && !concessionariaIdEfetiva) {
    return res_.badRequest(res, 'concessionaria_id obrigatório para admin_concessionaria');
  }
  if (!isAdminFull(req.user)) {
    if (tipo === 'admin_full') {
      return res_.forbidden(res, 'Acesso negado: apenas admin_full cria admin_full');
    }
    if (isAdminConcessionarias(req.user)) {
      if (tipo !== 'admin_concessionaria' && targetCanal !== CANAIS.CONCESSIONARIAS) {
        return res_.forbidden(res, 'Acesso negado: apenas usuários do canal concessionárias');
      }
      if (tipo === 'admin_concessionaria' && !concessionaria_id) {
        return res_.badRequest(res, 'concessionaria_id obrigatório para admin_concessionaria');
      }
    } else if (isAdminCanalRepresentantes(req.user) && targetCanal !== CANAIS.REPRESENTANTES) {
      return res_.forbidden(res, 'Acesso negado: apenas usuários do canal representantes');
    } else if (isAdminCanalInterno(req.user) && targetCanal !== CANAIS.INTERNO) {
      return res_.forbidden(res, 'Acesso negado: apenas usuários do canal interno');
    } else if (isAdminComercioExterior(req.user) && targetCanal !== CANAIS.COMERCIO_EXTERIOR) {
      return res_.forbidden(res, 'Acesso negado: apenas usuários do canal comércio exterior');
    } else if (isAdminConcessionaria(req.user)) {
      // admin_concessionaria pode criar apenas vendedores da própria concessionária
      if (targetCanal !== CANAIS.CONCESSIONARIAS) {
        return res_.forbidden(res, 'Acesso negado: apenas usuários do canal concessionárias');
      }
      if (String(concessionaria_id) !== String(req.user.concessionaria_id)) {
        return res_.forbidden(res, 'Acesso negado: concessionária inválida');
      }
    }
  }

  const existe = await svc.findByEmail(email);
  if (existe) return res_.conflict(res, 'E-mail já cadastrado');

  const senhaHash = sha256Hex(senha);
  const user = await svc.create({ nome, email, senhaHash, tipo, regiao, concessionaria_id: concessionariaIdEfetiva, regioes_operacao, telefone, cpf, canal: targetCanal });
  return res_.created(res, user);
});

const updateUser = asyncHandler(async (req, res) => {
  const target = await svc.findById(req.params.id);
  if (!target) return res_.notFound(res, 'Usuário não encontrado');

  const updates = { ...req.body };
  const tipoEfetivo = updates.tipo || target.tipo;
  if (isAdminFull(req.user) && ADMIN_TIPO_CANAL[tipoEfetivo]) {
    updates.canal = ADMIN_TIPO_CANAL[tipoEfetivo];
    if (tipoEfetivo === 'admin_concessionaria') {
      const concessionariaIdEfetiva = updates.concessionaria_id !== undefined
        ? updates.concessionaria_id
        : target.concessionaria_id;
      if (!concessionariaIdEfetiva) {
        return res_.badRequest(res, 'concessionaria_id obrigatório para admin_concessionaria');
      }
      updates.concessionaria_id = concessionariaIdEfetiva;
    } else {
      updates.concessionaria_id = null;
    }
  }

  if (!isAdminFull(req.user)) {
    const targetCanal = target.canal || canalDoUsuario(target);
    if (isAdminConcessionaria(req.user) && String(target.concessionaria_id) !== String(req.user.concessionaria_id)) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminConcessionarias(req.user) && targetCanal !== CANAIS.CONCESSIONARIAS) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminCanalRepresentantes(req.user) && targetCanal !== CANAIS.REPRESENTANTES) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminCanalInterno(req.user) && targetCanal !== CANAIS.INTERNO) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminComercioExterior(req.user) && targetCanal !== CANAIS.COMERCIO_EXTERIOR) {
      return res_.forbidden(res, 'Acesso negado');
    }
    // Impedir que admins de canal alterem perfis para admin_full
    if (req.body.tipo === 'admin_full') {
      return res_.forbidden(res, 'Acesso negado');
    }
  }

  const updated = await svc.update(req.params.id, updates);
  if (!updated) return res_.notFound(res, 'Usuário não encontrado');
  return res_.ok(res, updated);
});

const deleteUser = asyncHandler(async (req, res) => {
  const target = await svc.findById(req.params.id);
  if (!target) return res_.notFound(res, 'Usuário não encontrado');

  if (!isAdminFull(req.user)) {
    const targetCanal = target.canal || canalDoUsuario(target);
    if (isAdminConcessionaria(req.user) && String(target.concessionaria_id) !== String(req.user.concessionaria_id)) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminConcessionarias(req.user) && targetCanal !== CANAIS.CONCESSIONARIAS) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminCanalRepresentantes(req.user) && targetCanal !== CANAIS.REPRESENTANTES) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminCanalInterno(req.user) && targetCanal !== CANAIS.INTERNO) {
      return res_.forbidden(res, 'Acesso negado');
    }
    if (isAdminComercioExterior(req.user) && targetCanal !== CANAIS.COMERCIO_EXTERIOR) {
      return res_.forbidden(res, 'Acesso negado');
    }
    // Proteger contra exclusão de admin_full
    if (target.tipo === 'admin_full') {
      return res_.forbidden(res, 'Acesso negado');
    }
  }

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

    //if (user.ativo === false) {
      //console.warn('[AUTH LOGIN] Usuário inativo tentou logar:', { email });
      //return res.status(403).json({ success: false, error: 'Usuário inativo. Contate o administrador.' });
    //}

    if (!verificarSenha(senha, user.senha)) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }

    console.log('[AUTH LOGIN]', { email, userId: user?.id, tipo: user?.tipo, ativo: user?.ativo });

    const secret = process.env.JWT_SECRET || 'stark-dev-secret-fallback';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
        nome: user.nome,
        concessionaria_id: user.concessionaria_id,
        canal: user.canal || canalDoUsuario(user),
      },
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
