import { getAllCurrencyExchangeBrokers } from '@/services/admin';
import { CurrencyExchangeBrokersSection } from '../components';

export async function CurrencyBrokersLoader() {
  const brokers = await getAllCurrencyExchangeBrokers();
  return <CurrencyExchangeBrokersSection brokers={brokers} />;
}
