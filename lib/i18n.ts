export type Lang = 'es' | 'en'

export const t = (lang: Lang) => ({
  // Nav tabs
  dashboard: lang === 'es' ? 'Dashboard' : 'Dashboard',
  myInvestments: lang === 'es' ? 'Mis Inversiones' : 'My Investments',
  marketplace: lang === 'es' ? 'Marketplace' : 'Marketplace',
  transactions: lang === 'es' ? 'Transacciones' : 'Transactions',
  messages: lang === 'es' ? 'Mensajes' : 'Messages',
  referrals: lang === 'es' ? 'Referidos' : 'Referrals',
  profile: lang === 'es' ? 'Perfil' : 'Profile',

  // Greeting
  goodDay: lang === 'es' ? 'buen día' : 'good day',
  portfolioSummary: lang === 'es' ? 'Aquí tienes el resumen de tu portafolio en tiempo real.' : 'Here is your real-time portfolio summary.',
  referralCode: lang === 'es' ? 'Código referido' : 'Referral code',

  // KPIs
  totalPortfolio: lang === 'es' ? 'Mi Portafolio Total' : 'My Total Portfolio',
  avgReturn: lang === 'es' ? 'Rentabilidad Promedio' : 'Avg. Return',
  activeInvestments: lang === 'es' ? 'Inversiones Activas' : 'Active Investments',
  upcomingPayments: lang === 'es' ? 'Próximos Cobros' : 'Upcoming Payments',

  // Chart
  grossReturn: lang === 'es' ? 'Rentabilidad Bruta' : 'Gross Return',
  chartSub: lang === 'es' ? 'Precio de venta − precio de compra · últimos 6 meses' : 'Sale price − purchase price · last 6 months',
  months6: lang === 'es' ? '6 meses' : '6 months',

  // Active investments panel
  activeInvestmentsTitle: lang === 'es' ? 'Mis Inversiones Activas' : 'My Active Investments',
  viewAll: lang === 'es' ? 'Ver todas →' : 'View all →',
  noActiveInvestments: lang === 'es' ? 'Sin inversiones activas aún.' : 'No active investments yet.',
  viewDetails: lang === 'es' ? 'Ver detalles' : 'View details',

  // Operations
  studiedOperations: lang === 'es' ? 'Operaciones Estudiadas' : 'Reviewed Operations',
  viewReport: lang === 'es' ? 'Ver informe PDF' : 'View PDF report',

  // Participaciones
  myParticipations: lang === 'es' ? 'Mis participaciones' : 'My participations',
  participationsTotal: (n: number) => lang === 'es' ? `${n} participaciones en total` : `${n} participations total`,
  noParticipations: lang === 'es' ? 'Aún no tienes participaciones registradas.' : 'No participations registered yet.',
  capital: lang === 'es' ? 'Capital' : 'Capital',
  annual: lang === 'es' ? 'Anual' : 'Annual',
  cumulative: lang === 'es' ? 'Bruta acum.' : 'Cum. gross',

  // Movimientos table
  date: lang === 'es' ? 'Fecha' : 'Date',
  type: lang === 'es' ? 'Tipo' : 'Type',
  amount: lang === 'es' ? 'Importe' : 'Amount',
  description: lang === 'es' ? 'Descripción' : 'Description',

  // Transactions
  transactionHistory: lang === 'es' ? 'Historial de transacciones' : 'Transaction history',
  transactionsTotal: (n: number) => lang === 'es' ? `${n} movimientos registrados` : `${n} registered movements`,
  noTransactions: lang === 'es' ? 'No hay movimientos registrados aún.' : 'No movements registered yet.',
  operation: lang === 'es' ? 'Operación' : 'Operation',

  // Referidos
  inviteAndEarn: lang === 'es' ? 'Invita y Gana' : 'Invite & Earn',
  inviteSubtitle: lang === 'es' ? 'Comparte tu código. Gana una compensación por cada operación que cierre tu referido.' : 'Share your code. Earn a reward for every deal your referral closes.',
  yourCode: lang === 'es' ? 'Tu código' : 'Your code',
  copy: lang === 'es' ? 'Copiar' : 'Copy',
  copied: lang === 'es' ? '¡Copiado!' : 'Copied!',
  referralShareDesc: lang === 'es'
    ? 'Comparte este código con tu red. Cuando uno de tus referidos cierre una operación, recibirás una compensación aprobada por el equipo.'
    : 'Share this code with your network. When one of your referrals closes a deal, you will receive a team-approved reward.',
  referralsTotalLabel: lang === 'es' ? 'Referidos' : 'Referrals',
  commissionsGenerated: lang === 'es' ? 'Comisiones generadas' : 'Commissions generated',
  referredInvestor: lang === 'es' ? 'Inversor referido' : 'Referred investor',
  commPct: lang === 'es' ? 'Comisión %' : 'Commission %',
  commAmount: lang === 'es' ? 'Importe' : 'Amount',
  status: lang === 'es' ? 'Estado' : 'Status',
  paid: lang === 'es' ? 'Pagada' : 'Paid',
  pending: lang === 'es' ? 'Pendiente' : 'Pending',
  noReferralCode: lang === 'es' ? 'Cuando el equipo te asigne un código de referido, aparecerá aquí.' : 'Once the team assigns you a referral code, it will appear here.',
  referralProgram: lang === 'es' ? 'Programa de referidos' : 'Referral program',

  // Messages / Chat
  myConversations: lang === 'es' ? 'Mis conversaciones' : 'My conversations',
  chatWithAdvisor: lang === 'es' ? 'Chat privado con el equipo' : 'Private chat with the team',
  noConversations: lang === 'es' ? 'Aún no tienes conversaciones activas.' : 'No active conversations yet.',
  selectConversation: lang === 'es' ? 'Selecciona una conversación' : 'Select a conversation',
  privateChatWith: lang === 'es' ? 'Chat privado con tu asesor' : 'Private chat with your advisor',
  noMessages: lang === 'es' ? 'Aún no hay mensajes. ¡Escribe al equipo!' : 'No messages yet. Write to the team!',
  writePlaceholder: lang === 'es' ? 'Escribe un mensaje…' : 'Write a message…',
  broadcastLabel: lang === 'es' ? 'Comunicado' : 'Broadcast',
  requiresReview: lang === 'es' ? 'Requiere tu revisión' : 'Requires your review',

  // Profile
  myProfile: lang === 'es' ? 'Mi perfil' : 'My profile',
  name: lang === 'es' ? 'Nombre' : 'Name',
  email: lang === 'es' ? 'Email' : 'Email',
  investorType: lang === 'es' ? 'Tipo de inversor' : 'Investor type',
  accountStatus: lang === 'es' ? 'Estado de cuenta' : 'Account status',
  initialCapital: lang === 'es' ? 'Capital inicial' : 'Initial capital',
  accountPrefs: lang === 'es' ? '⚙ Preferencias de cuenta' : '⚙ Account preferences',

  // Contact
  anyQuestions: lang === 'es' ? '¿Tienes alguna consulta?' : 'Any questions?',
  advisorAvailable: lang === 'es' ? 'Tu asesor personal de GrupoSkyLine está disponible para atenderte.' : 'Your personal GrupoSkyLine advisor is available.',
  contact: lang === 'es' ? 'Contactar →' : 'Contact →',

  // Export
  exportCSV: lang === 'es' ? 'Exportar CSV' : 'Export CSV',
  exportExcel: lang === 'es' ? 'Exportar Excel' : 'Export Excel',

  // Months
  months: lang === 'es'
    ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
})
