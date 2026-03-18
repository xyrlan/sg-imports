/** Typed Inngest event definitions for the shipment management state machine. */

export type ShipmentEvents = {
  /** Evaluate step conditions and auto-advance if met */
  'shipment/step.evaluate': {
    data: { shipmentId: string };
  };

  /** Payment confirmed (Asaas webhook or manual registration) */
  'shipment/payment.received': {
    data: { transactionId: string; shipmentId: string };
  };

  /** ZapSign amendment signed by client (Phase 2: items.changed flow) */
  'shipment/amendment.signed': {
    data: { shipmentId: string; docToken: string };
  };

  /** ShipsGo tracking update received */
  'shipment/shipsgo.updated': {
    data: { shipmentId: string; shipsGoId: string; payload: Record<string, unknown> };
  };

  /** Admin registered DUIMP number — triggers Siscomex API fetch */
  'shipment/duimp.registered': {
    data: { shipmentId: string; duimpNumber: string };
  };

  /** Existing quote contract signed event */
  'quote/contract.signed': {
    data: { quoteId: string };
  };
};
