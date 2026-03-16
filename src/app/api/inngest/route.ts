import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { quoteContractSigned } from "@/inngest/functions/quote-contract-signed";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    quoteContractSigned,
  ],
});