import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { quoteContractSigned } from "@/inngest/functions/quote-contract-signed";
import { shipmentStepEvaluator } from "@/inngest/functions/shipment-step-evaluator";
import { shipmentPaymentReceived } from "@/inngest/functions/shipment-payment-received";
import { shipmentDuimpRegistered } from "@/inngest/functions/shipment-duimp-registered";
import { shipmentShipsgoUpdated } from "@/inngest/functions/shipment-shipsgo-updated";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    quoteContractSigned,
    shipmentStepEvaluator,
    shipmentPaymentReceived,
    shipmentDuimpRegistered,
    shipmentShipsgoUpdated,
  ],
});