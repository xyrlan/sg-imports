/**
 * Busca a cotação de compra do dólar PTAX do Banco Central do Brasil.
 * A função busca a cotação do dia atual. Se não houver (fins de semana, feriados),
 * ela busca recursivamente os dias anteriores até encontrar a última cotação válida.
 *
 * @param daysToTry - O número máximo de dias para tentar retroceder. Padrão é 7.
 * @returns Uma promessa que resolve com o valor da cotação de compra acrescido de um spread.
 */
export async function getDolarPTAX(daysToTry = 7): Promise<number> {
  const SPREAD = 1.008; // Representa uma margem de 0.8%

  const date = new Date();

  for (let i = 0; i < daysToTry; i++) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = `${month}-${day}-${year}`;

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formattedDate}'&$format=json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`API do BCB falhou para a data ${formattedDate} com status: ${response.status}`);
        date.setDate(date.getDate() - 1);
        continue;
      }

      const data = (await response.json()) as { value?: Array<{ cotacaoCompra: number }> };

      if (data.value && data.value.length > 0) {
        const cotacaoCompra = data.value[0].cotacaoCompra;
        return cotacaoCompra * SPREAD;
      }
    } catch (error) {
      console.error(`Erro ao processar a data ${formattedDate}:`, error);
    }

    date.setDate(date.getDate() - 1);
  }

  throw new Error(`Não foi possível obter a cotação do dólar nos últimos ${daysToTry} dias.`);
}
