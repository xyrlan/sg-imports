export function formatCNPJ(cnpj: string) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPhone(phone: string) {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function formatCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCEP(cep: string) {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatCurrency(value: number | string, locale = 'en-US', currency = 'USD') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(num);
}