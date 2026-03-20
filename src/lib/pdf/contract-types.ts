export interface ContractData {
  orderType: 'ORDER' | 'DIRECT_ORDER';
  companyName: string;           // razao social
  cnpj: string;                  // CNPJ
  fullAddress: string;           // endereco completo
  serviceFee: string;            // honorarios
  totalLandedCost?: string;      // totalLandedCost
  orderNumber?: string;          // numero do pedido (DIRECT_ORDER only)
  formattedDate: string;         // data formatada DD/MM/YYYY
}
