const BITRIX_WEBHOOK_BASE = 'https://stark-guindastes.bitrix24.com.br/rest/180/tooge4ammavbkcld/';

const VENDEDOR_BITRIX_ID = {
  'CHRYSTIAN': 180,
  'MAGNUS JOSE ZALESKI': 426,
  'AIRTON': 20,
  'ALCEU BORGES PADILHA': 42,
  'ANDERSON DEMBOGURSKI': 424,
  'ANDRE ROCHA FERREIRA': 28,
  'ARNALDO NICHELLE': 30,
  'EDUARDO BUENO': 402,
  'CLAUDEMIR ALEXANDRE DE ALMEIDA DE ALMEIDA': 44,
  'DIRLEY DIAS': 654,
  'GERALDO GONTEK': 398,
  'DOUGLAS CLEOMAR RITTER': 38,
  'EDEMAR CAVAGNOLI': 404,
  'EVANDRO TAVARES': 22,
  'ELYSRAEL GOMES FONTENELE': 46,
  'PAULO GAMBOA': 26
};

const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const buildUrl = (method) => `${BITRIX_WEBHOOK_BASE}${method}`;

const SALES_CATEGORY_NAME = 'VENDAS';

let cachedSalesCategoryId = null;

const postBitrix = async (method, body) => {
  const response = await fetch(buildUrl(method), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitrix HTTP ${response.status}: ${text}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`Bitrix error: ${json.error_description || json.error}`);
  }

  return json.result;
};

const resolveSalesCategoryId = async () => {
  if (cachedSalesCategoryId) return cachedSalesCategoryId;

  const result = await postBitrix('crm.dealcategory.list', {
    select: ['ID', 'NAME']
  });

  const categories = Array.isArray(result) ? result : [];
  const match = categories.find((c) => normalizeName(c?.NAME) === SALES_CATEGORY_NAME)
    || categories.find((c) => normalizeName(c?.NAME).includes(SALES_CATEGORY_NAME));

  cachedSalesCategoryId = match?.ID ? Number(match.ID) : null;
  return cachedSalesCategoryId;
};

const findContactByPhone = async (phone) => {
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return null;

  const result = await postBitrix('crm.contact.list', {
    filter: {
      'PHONE': phoneNormalized
    },
    select: ['ID', 'NAME', 'LAST_NAME', 'PHONE', 'ASSIGNED_BY_ID']
  });

  return Array.isArray(result) && result.length > 0 ? result[0] : null;
};

const createContact = async ({ cliente, telefone, assignedId }) => {
  const fields = {
    NAME: cliente?.nome || '',
    PHONE: [{ VALUE: telefone, VALUE_TYPE: 'WORK' }],
    EMAIL: cliente?.email ? [{ VALUE: cliente.email, VALUE_TYPE: 'WORK' }] : [],
    ASSIGNED_BY_ID: assignedId
  };

  const contactId = await postBitrix('crm.contact.add', { fields });
  return contactId;
};

const findDealByContact = async ({ contactId, categoryId }) => {
  if (!contactId) return null;

  const filter = {
    CONTACT_ID: contactId
  };
  if (categoryId) filter.CATEGORY_ID = categoryId;

  const result = await postBitrix('crm.deal.list', {
    filter,
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'CATEGORY_ID'],
    order: { ID: 'DESC' },
    start: 0
  });

  return Array.isArray(result) && result.length > 0 ? result[0] : null;
};

const findLeadByPhone = async (phone) => {
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return null;

  const result = await postBitrix('crm.lead.list', {
    filter: {
      'PHONE': phoneNormalized
    },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID']
  });

  return Array.isArray(result) && result.length > 0 ? result[0] : null;
};

const resolveAssignedId = (vendedorNome) => {
  if (!vendedorNome) return null;
  const normalized = normalizeName(vendedorNome);
  return VENDEDOR_BITRIX_ID[normalized] || null;
};

export const createLeadIfNotExists = async ({
  cliente,
  vendedorNome,
  origem = 'Proposta PDF'
}) => {
  const telefone = normalizePhone(cliente?.telefone);
  if (!telefone) {
    console.warn('Bitrix: telefone inválido, lead não criado.');
    return { created: false, reason: 'missing_phone' };
  }

  const existing = await findLeadByPhone(telefone);
  if (existing) {
    return { created: false, reason: 'already_exists', lead: existing };
  }

  const vendedorNomeNormalizado = normalizeName(vendedorNome);
  const assignedId = VENDEDOR_BITRIX_ID[vendedorNomeNormalizado] || null;
  if (!assignedId) {
    console.warn('Bitrix: vendedor sem ID mapeado, lead não criado.', {
      vendedorNomeOriginal: vendedorNome,
      vendedorNomeNormalizado,
      chavesMapeadas: Object.keys(VENDEDOR_BITRIX_ID)
    });
    return { created: false, reason: 'missing_assigned_id' };
  }

  const leadFields = {
    TITLE: `Proposta PDF - ${cliente?.nome || 'Cliente'}`,
    NAME: cliente?.nome || '',
    PHONE: [{ VALUE: telefone, VALUE_TYPE: 'WORK' }],
    EMAIL: cliente?.email ? [{ VALUE: cliente.email, VALUE_TYPE: 'WORK' }] : [],
    ASSIGNED_BY_ID: assignedId,
    SOURCE_DESCRIPTION: origem,
    COMMENTS: `Lead criado automaticamente ao gerar PDF. Documento: ${cliente?.documento || 'N/A'}`
  };

  const leadId = await postBitrix('crm.lead.add', { fields: leadFields });
  return { created: true, leadId };
};

export const createDealInSalesIfNotExists = async ({
  cliente,
  vendedorNome,
  origem = 'Proposta PDF'
}) => {
  const vendedorNomeNormalizado = normalizeName(vendedorNome);
  const assignedId = VENDEDOR_BITRIX_ID[vendedorNomeNormalizado] || null;
  if (!assignedId) {
    console.warn('Bitrix: vendedor sem ID mapeado, negócio não atribuído.', {
      vendedorNomeOriginal: vendedorNome,
      vendedorNomeNormalizado,
      chavesMapeadas: Object.keys(VENDEDOR_BITRIX_ID)
    });
    return { created: false, dealCreated: false, reason: 'missing_assigned_id' };
  }

  const telefone = normalizePhone(cliente?.telefone);
  if (!telefone) {
    console.warn('Bitrix: telefone inválido, negócio não criado.');
    return { created: false, dealCreated: false, reason: 'missing_phone' };
  }

  let categoryId = null;
  try {
    categoryId = await resolveSalesCategoryId();
  } catch (e) {
    categoryId = null;
  }

  if (!categoryId) {
    console.warn('Bitrix: CATEGORY_ID do funil VENDAS não encontrado. O negócio pode cair no funil padrão.', {
      categoriaEsperada: SALES_CATEGORY_NAME
    });
  }

  try {
    let contact = await findContactByPhone(telefone);
    let contactId = contact?.ID ? Number(contact.ID) : null;

    if (!contactId) {
      const createdContactId = await createContact({ cliente, telefone, assignedId });
      contactId = createdContactId ? Number(createdContactId) : null;
    }

    const existingDeal = await findDealByContact({ contactId, categoryId });
    if (existingDeal?.ID) {
      return {
        created: false,
        reason: 'already_exists',
        dealCreated: false,
        deal: existingDeal,
        contactId
      };
    }

    const dealFields = {
      TITLE: `Proposta PDF - ${cliente?.nome || 'Cliente'}`,
      ASSIGNED_BY_ID: assignedId,
      CONTACT_ID: contactId,
      COMMENTS: `Negócio criado automaticamente ao gerar PDF. Documento: ${cliente?.documento || 'N/A'}`
    };

    if (categoryId) dealFields.CATEGORY_ID = categoryId;

    const dealId = await postBitrix('crm.deal.add', { fields: dealFields });

    return {
      created: true,
      dealCreated: true,
      dealId,
      contactId,
      categoryId
    };
  } catch (error) {
    console.warn('Bitrix: falha ao criar negócio.', error);
    return { created: false, dealCreated: false, error };
  }
};

export { normalizePhone, resolveAssignedId };
