// 纯邮件模板函数（无 Node 依赖，客户端安全）

export function generateBusinessEmail(params: {
  companyName: string;
  contactName: string;
  ourCompany: string;
  products: string;
  language?: string;
}): { subject: string; body: string } {
  const { companyName, contactName, ourCompany, products, language = "en" } = params;
  const ourFull = "海盐良友科技创业有限公司";
  const ourShort = ourCompany || "良友科技";
  const addr = "浙江省嘉兴市海盐县百步镇横港集镇";

  const templates: Record<string, { subject: string; body: string }> = {
    en: {
      subject: `Partnership Opportunity - ${ourShort} Supply Chain Solutions`,
      body: `Dear ${contactName || "Sir/Madam"},

I am reaching out from ${ourFull} (${ourShort}), a technology company specializing in R&D and manufacturing of ${products}. We are based in Jiaxing, Zhejiang, China.

We have been following ${companyName}'s presence in the industry and believe there could be significant synergies.

Key advantages of working with us:
- Over 15 years of manufacturing experience
- Competitive pricing with flexible MOQ
- ISO-certified quality management
- Licensed for foreign trade import/export
- Dedicated account management

Would you be available for a brief call next week to discuss cooperation?

Best regards,
${ourFull}
${addr}`,
    },

    zh: {
      subject: `商业合作机会 - ${ourShort} 外贸供应链`,
      body: `${contactName || "尊敬的客户"} 您好，

我是${ourShort}（${ourFull}）的代表。我们专业从事${products}的研发生产，位于${addr}，具备外贸进出口资质。

一直关注${companyName}在行业内的发展，相信双方有很大的合作空间。

我们的优势：
- 15年以上制造经验，稳定供应链
- 有竞争力的价格，支持灵活起订量
- ISO质量管理体系认证
- 自营进出口权，外贸经验丰富
- 专属客户经理一对一服务

期待与您安排一次简短的沟通，探讨合作可能。

此致
敬礼
${ourFull}
${addr}`,
    },

    es: {
      subject: `Oportunidad de Colaboración - ${ourShort}`,
      body: `Estimado/a ${contactName || "Señor/Señora"},

Le escribo desde ${ourFull} (${ourShort}), una empresa tecnológica especializada en I+D y fabricación de ${products}. Estamos ubicados en Jiaxing, Zhejiang, China.

Ventajas clave:
- Más de 15 años de experiencia en fabricación
- Precios competitivos con MOQ flexible
- Gestión de calidad con certificación ISO
- Licencia de importación/exportación
- Gestión de cuentas dedicada

¿Estaría disponible la próxima semana para una breve llamada?

Saludos cordiales,
${ourFull}
${addr}`,
    },
  };

  return templates[language] || templates.en;
}
