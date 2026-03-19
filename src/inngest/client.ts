import { EventSchemas, Inngest } from 'inngest';
import type { ShipmentEvents } from './events';

export const inngest = new Inngest({
  id: 'sg-imports',
  schemas: new EventSchemas().fromRecord<ShipmentEvents>(),
});