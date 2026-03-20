/**
 * Legal contract templates for Brazilian import operations.
 * Text is intentionally hardcoded in Portuguese (pt-BR) as these are
 * jurisdiction-specific legal documents.
 */
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ContractData } from './contract-types';

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  clauseTitle: {
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 4,
  },
  bullet: {
    marginBottom: 4,
    paddingLeft: 16,
    textAlign: 'justify',
  },
  signatureBlock: {
    marginTop: 40,
    textAlign: 'center',
  },
  // Keeps clause title together with at least the first paragraph
  section: {
    marginBottom: 0,
  },
});

function OrderContractDocument({ data }: { data: ContractData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>
          CONTRATO DE COMPRA E VENDA DE BENS IMPORTADOS POR ENCOMENDA
        </Text>

        <Text style={styles.paragraph}>
          Pelo presente instrumento particular e na melhor forma de direito, as partes:
        </Text>

        <Text style={styles.paragraph}>
          BR IMPORTACAO EXPORTACAO CONSULTORIA E ASSESSORIA LTDA, pessoa juridica de direito privado inscrita no CNPJ sob n. 46.388.683/0001-05, estabelecida na Rua Doutor Pedro Ferreira n. 155, sala 1402 A31, Centro, CEP: 88.301-901, Itajai - SC, representada por seu diretor, na forma do seu Estatuto Social, doravante denominada simplesmente IMPORTADORA-VENDEDORA; e
        </Text>

        <Text style={styles.paragraph}>
          {data.companyName}, pessoa juridica de direito privado, inscrita no CNPJ sob n. {data.cnpj}, com sede em {data.fullAddress}, neste ato representada por seu representante legal na forma do seu Estatuto Social, doravante denominada simplesmente ENCOMENDANTE-COMPRADORA,
        </Text>

        <Text style={styles.paragraph}>
          Tem, entre si, justo e contratado o presente instrumento particular de Contrato de Compra e Venda de Bens importados do exterior por encomenda, que mutuamente outorgam e aceitam, de acordo com os artigos 481 a 504 do Novo Codigo Civil e clausulas e condicoes a seguir estipuladas.
        </Text>

        <Text style={styles.paragraph}>
          Considerando que: A IMPORTADORA-VENDEDORA possui o know-how, estrutura e beneficios fiscais que viabilizam a operacao e a ENCOMENDANTE-COMPRADORA objetivo de importar mercadorias do exterior,
        </Text>

        {/* DO OBJETO */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DO OBJETO</Text>
          <Text style={styles.paragraph}>
            Clausula 1a. Pelo presente contrato a IMPORTADORA-VENDEDORA prestara o servico de importacao de mercadorias para a ENCOMENDANTE-COMPRADORA, sendo o servico limitado a despacho, contrato de cambio e logistica internacional.
          </Text>
        </View>
        <Text style={styles.bullet}>
          Paragrafo primeiro. A IMPORTADORA-VENDEDORA nao esta incumbida da prospeccao de fornecedores, negociacao de precos, qualidade e quantidade dos produtos, escolha do produto, inspecao da carga, compliance da transacao, limitando sua prestacao de servico ao que esta disposto no caput desta clausula e ao topico relativo as suas responsabilidades.
        </Text>

        {/* DOS HONORARIOS */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DOS HONORARIOS DE IMPORTACAO</Text>
          <Text style={styles.paragraph}>
            Clausula 2a. Em remuneracao ao servico de importacao objeto deste contrato a ENCOMENDANTE-COMPRADORA pagara a IMPORTADORA-VENDEDORA o valor de {data.serviceFee}.
          </Text>
        </View>
        <Text style={styles.bullet}>
          Paragrafo primeiro. O valor descrito no caput devera ser pago na data da chegada da mercadoria em territorio nacional.
        </Text>

        {/* DO PRECO CONTRATADO */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DO PRECO CONTRATADO E FORMA DE PAGAMENTO</Text>
          <Text style={styles.paragraph}>
            Clausula 3a. A ENCOMENDANTE-COMPRADORA compromete-se a pagar a IMPORTADORA-VENDEDORA o valor da mercadoria em moeda nacional, apos a conversao da moeda internacional que sera determinada pelo contrato de cambio firmado pela IMPORTADORA-VENDEDORA.
          </Text>
        </View>
        <Text style={styles.bullet}>
          Paragrafo primeiro. A ENCOMENDANTE-COMPRADORA devera pagar todas as outras despesas para a nacionalizacao da mercadoria importada: frete internacional, frete nacional, armazenagem, encargos portuarios, tributos de nacionalizacao e da nota fiscal de saida emitida.
        </Text>
        <Text style={styles.bullet}>
          Paragrafo segundo. A ENCOMENDANTE-COMPRADORA devera arcar com todos os custos, taxas e despesas que vierem a surgir no decorrer da operacao.
        </Text>
        <Text style={styles.bullet}>
          Paragrafo terceiro. Todos os pagamentos deverao ocorrer anteriormente a cobranca da despesa, depositados na conta corrente da IMPORTADORA-VENDEDORA, que sera informado em tempo habil pela IMPORTADORA-VENDEDORA.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 4a. O valor de referencia da mercadoria importada nacionalizada, sem considerar o frete nacional, e de {data.totalLandedCost ?? 'N/A'}.
        </Text>
        <Text style={styles.bullet}>
          Paragrafo primeiro. O valor de referencia sofrera alteracoes sem aviso previo, como, a titulo exemplificativo, relativos ao cambio, armazenagem e frete.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 5a. Tudo aquilo que for pago pela ENCOMENDANTE-COMPRADORA sera comprovado por documento habil (notas fiscais, faturas e comprovantes federais).
        </Text>

        {/* RESPONSABILIDADES DA ENCOMENDANTE-COMPRADORA */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DAS RESPONSABILIDADES DA ENCOMENDANTE-COMPRADORA</Text>
          <Text style={styles.paragraph}>
            Clausula 6a. Sao responsabilidades da ENCOMENDANTE-COMPRADORA:
          </Text>
        </View>
        <Text style={styles.bullet}>
          {'\u2022'} Efetuar o pagamento a IMPORTADORA-VENDEDORA da quantia devida pela aquisicao dos produtos/mercadorias importados do exterior por encomenda, bem como de todas aquelas previstas neste contrato;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Uma vez importados os produtos/mercadorias e efetuados os desembaracos aduaneiros, obriga-se a ENCOMENDANTE-COMPRADORA a recebe-las da IMPORTADORA-VENDEDORA, que por sua vez a ele se obriga entrega-las, sob as condicoes pactuadas neste instrumento;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Estar habilitada para operar no Sistema Integrado de Comercio Exterior (Siscomex), nos termos da IN SRF n. 634, de 2006 c/c a IN SRF n. 455, de 2004 e possuir limite de RADAR disponivel para a operacao;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Vincular-se ao protocolo fornecido pela IMPORTADORA-VENDEDORA no Siscomex pelo prazo ou operacoes previstas no Contrato a fim de que a empresa IMPORTADORA-VENDEDORA possa realizar o desembaraco aduaneiro, em conformidade com a IN n. 634, de 2006;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Manter em boa guarda e ordem, e apresentar a fiscalizacao aduaneira, quando exigidos, os documentos e registros relativos as transacoes que promover dentro do prazo;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Estar apta a apresentar garantia que comprove que seu capital social ou patrimonio liquido sao compativeis com o valor de aquisicao do produto/mercadoria importado do exterior;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Negociar junto ao fornecedor as mercadorias a serem importadas, sendo de sua inteira responsabilidade o objeto, o preco, a qualidade, a quantidade e todas as outras caracteristicas da mercadoria;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Verificar a integridade e existencia do fornecedor;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Nao realizar pagamentos fora de contrato de cambio, ou seja, fora de contrato de cambio estabelecido pela IMPORTADORA-VENDEDORA, a fim de garantir que nao havera evasao de divisas, visto que, neste contrato a ENCOMENDANTE-COMPRADORA e quem trata com o fornecedor e as consequencias desta conduta serao imputadas a ENCOMENDANTE-COMPRADORA;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Responsabilizar-se integralmente pelas multas de que trata o art. 1o, da Lei 10.755 de 03/11/03, decorrente de: contratar operacao de cambio fora dos prazos e exigencias legais estabelecidas pelo BACEN; realizar o pagamento em moeda estrangeira diversa da estipulada nos documentos de importacao;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Promover e viabilizar o carregamento da mercadoria no exterior junto ao fornecedor. Em caso de calote ou nao carregamento pelo fornecedor, a ENCOMENDANTE-COMPRADORA devera arcar com todos os custos administrativos, com advogado e quaisquer outras que sobrevenham do ocorrido para regularizacao da IMPORTADORA-VENDEDORA junto a Receita Federal, Banco Central e demais orgaos intervenientes;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Responder, na pessoa de seus representantes legais, como unicos e exclusivos responsaveis pelo nao pagamento de tributos e/ou pelas falsas declaracoes que fizeram em decorrencia e na execucao do presente Contrato;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Garantir que nao havera o transporte de produtos ilicitos ou proibidos na importacao;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Responder por todas as despesas que vierem incidir, inclusive liquidez cambial, impostos, taxas, contribuicoes, eventuais multas e sancoes administrativas, em decorrencia da execucao do presente contrato;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Garantir que a quantidade e descricao dos produtos correspondam exatamente com o disposto na Fatura Comercial (Invoice);
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Optar pela contratacao de seguro de transporte internacional da mercadoria. Caso opte pela nao contratacao, a ENCOMENDANTE-COMPRADORA se responsabiliza pelo eventual prejuizo em caso de danos ou perda da mercadoria;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Arcar com as multas, sancoes, processos administrativos, juridicos, custas, despesas e honorarios advocaticios, estes no importe de 20% do valor da mercadoria na Invoice, em caso de descumprimento de qualquer uma das responsabilidades, bem como multa a IMPORTADORA-VENDEDORA no percentual de 30% do valor da mercadoria na Invoice, sem prejuizo de acao civil danos morais e penal;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Arcar com custas judiciais bem como honorarios de advogados, o qual devera ser escolhido pela IMPORTADORA-VENDEDORA em caso de necessidade de acao judicial em que a responsabilidade direta e objetiva nao advenha da IMPORTADORA-VENDEDORA;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Serao de responsabilidade da IMPORTADORA-VENDEDORA todas as modificacoes ou contingencias de ordem juridicas, comerciais e/ou tributarias que vierem a afetar o presente contrato, ou em decorrencia dele, acarretando qualquer onus e/ou prejuizo financeiro a ENCOMENDANTE-COMPRADORA;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Responsabilizar-se integralmente pela CLASSIFICACAO FISCAL extraida pelo codigo da Tarifa Externa Comum - TEC, pelo VALOR DE AQUISICAO no mercado externo dos produtos/mercadorias estrangeiros, pela autenticidade dos documentos, pela veracidade de informacoes que deverao instruir o REGISTRO DA DECLARACAO DE IMPORTACAO perante o SISCOMEX, conforme o art. 17 da IN/SRF n. 206 de 25/09/02 e art. 3o da Portaria Interministerial n. 291/MF/MICT de 12/12/96, bem como os procedimentos especiais de que trata a IN/SRF 52 de 08/05/2001;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Prestar garantia para autorizacao da entrega ou desembaraco aduaneiro de mercadorias, se o valor dos produtos/mercadorias importados for incompativel com o seu capital social ou patrimonio liquido;
        </Text>

        {/* RESPONSABILIDADES DA IMPORTADORA-VENDEDORA */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DAS RESPONSABILIDADES DA IMPORTADORA-VENDEDORA</Text>
          <Text style={styles.paragraph}>
            Clausula 7a. Sao responsabilidades da IMPORTADORA-VENDEDORA:
          </Text>
        </View>
        <Text style={styles.bullet}>
          {'\u2022'} Viabilizar a operacao de venda dos produtos/mercadorias importados por encomenda nas condicoes estabelecidas entre a IMPORTADORA-VENDEDORA e a ENCOMENDANTE-COMPRADORA, em observancia ao objeto deste contrato;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Emitir a nota fiscal de venda da mercadoria, sendo seu valor a soma de todas as despesas do processo de importacao mais os tributos da sua emissao acompanhadas de comprovacao de pagamento e dar quitacao aos pagamentos efetuados nos termos da clausula 3;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Estar habilitada para operar no Sistema Integrado de Comercio Exterior (Siscomex), nos termos da IN SRF n. 455, de 2004;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Registrar este Contrato na unidade de fiscalizacao aduaneira da Receita Federal do Brasil com jurisdicao sobre o estabelecimento matriz da ENCOMENDANTE-COMPRADORA, em conformidade com a IN n. 634, de 2006, a fim de que a empresa IMPORTADORA-VENDEDORA seja vinculada a ENCOMENDANTE-COMPRADORA no Siscomex, pelo prazo ou operacoes previstas neste Contrato;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Providenciar perante as pessoas juridicas responsaveis, tempestivamente, o envio de todos os documentos pertinentes a importacao dos produtos/mercadorias estrangeiros que lhes forem instruidos e encomendados pela ENCOMENDANTE-COMPRADORA face as exigencias normativas brasileira;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Manter em boa guarda e ordem, e apresentar a fiscalizacao aduaneira, quando exigidos, os documentos e registros relativos as transacoes que promover, pelo prazo decadencial;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Providenciar e acompanhar todo o processo logistico internacional desde a saida da mercadoria da fabrica do fornecedor internacional ate a chegada e desembaraco aduaneiro em territorio nacional;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Promover e organizar a documentacao necessaria para o registro de Declaracao de Importacao;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Elaborar e registrar a Declaracao de Importacao junto a Receita Federal do Brasil de forma fidedigna aos documentos fornecidos pela ENCOMENDANTE-COMPRADORA;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Realizar o contrato de cambio junto ao fornecedor para viabilizar pagamento da mercadoria;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Prestar esclarecimentos e fornecer atualizacao do andamento do processo de importacao a ENCOMENDANTE-COMPRADORA;
        </Text>

        {/* OBSERVACOES */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>OBSERVACOES</Text>
          <Text style={styles.paragraph}>
            Clausula 8a. Nao sao responsabilidades da IMPORTADORA-VENDEDORA:
          </Text>
        </View>
        <Text style={styles.bullet}>
          {'\u2022'} Prestar assistencia tecnica pelos produtos importados;
        </Text>
        <Text style={styles.bullet}>
          {'\u2022'} Garantir a qualidade dos bens e produtos importados;
        </Text>

        {/* CLAUSULA PENAL */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DA CLAUSULA PENAL</Text>
          <Text style={styles.paragraph}>
            Clausula 9a. Fica ajustado que o atraso no pagamento de qualquer duplicata emitida na forma deste Contrato, implicara na incidencia de multa de 10% (dez por cento) sem prejuizo de juros mensais, calculados pro-rata dia, a razao de 1% a.m., alem de correcao monetaria pelo INPC.
          </Text>
        </View>

        {/* RESCISAO */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DA RESCISAO DO CONTRATO</Text>
          <Text style={styles.paragraph}>
            Clausula 10a. A rescisao deste contrato podera ser solicitada formalmente por qualquer das partes, desde que ainda nao tenha sido aprovado pelo SECEX ou ORGAOS ANUENTES a solicitacao do Pedido de Licenca de Importacao nao-automatica correspondente, ou ainda caso nao tenham sido embarcados os produtos/mercadorias estrangeiros objeto deste contrato, no porto ou aeroporto do Pais de origem da Importacao, respondendo, neste caso, a ENCOMENDANTE-COMPRADORA pelas despesas ja incorridas.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          Clausula 11. Apos o pagamento mesmo que de apenas alguma parte do valor total ou embarque dos produtos/mercadorias estrangeiros, este contrato passara a ser irrevogavel e irretratavel, obrigando ambas as partes em todos os seus termos, atribuindo ao presente contrato a forca executiva, ficando todos os custos adicionais de armazenagem dos produtos/mercadorias importados, sob inteira responsabilidade da ENCOMENDANTE-COMPRADORA.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 12. Caso o exportador nao venha a embarcar no exterior as mercadorias, total ou parcialmente, dentro do prazo de validade da Licenca de Importacao nao-automatica, e caso nao se tenha procedido a prorrogacao de validade da Licenca de Importacao nao-automatica atraves de aditivo, todas as despesas ocorridas ate o momento do cancelamento ficarao por conta da ENCOMENDANTE-COMPRADORA.
        </Text>

        {/* VALIDADE */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DA VALIDADE DO CONTRATO</Text>
          <Text style={styles.paragraph}>
            Clausula 13. Este contrato tem validade ate a efetiva entrega da mercadoria importada e o cumprimento das responsabilidades de cada uma das partes.
          </Text>
        </View>

        {/* DISPOSICOES FINAIS */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>DAS DISPOSICOES FINAIS</Text>
          <Text style={styles.paragraph}>
            Clausula 14. A IMPORTADORA-VENDEDORA responde por todos os debitos que gravem os bens importados e compromete-se a entrega-los a ENCOMENDANTE-COMPRADORA livres de quaisquer gravames, dividas e/ou duvidas.
          </Text>
        </View>
        <Text style={styles.bullet}>
          Paragrafo primeiro. Quaisquer tributos cobrados apos o termino do processo de importacao como DIFAL, Substituicao Tributaria, ICMS Antecipado serao de responsabilidade unica e exclusiva da ENCOMENDANTE-COMPRADORA, bem como tributos que venham surgir devido a jurisprudencias do STF.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 15. A tolerancia, por qualquer das partes, com relacao ao descumprimento de qualquer obrigacao ora ajustada, nao sera considerada novacao, moratoria ou renuncia a qualquer direito, constituindo mera liberalidade que nao impedira a parte tolerante de exigir da outra o fiel e cabal cumprimento deste contrato, a qualquer tempo.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 16. Este Contrato nao podera ser cedido por qualquer uma das partes a quaisquer terceiros, ainda que pessoas ligadas, ate o seu integral cumprimento, sem o previo consentimento por escrito da outra parte.
        </Text>
        <Text style={styles.paragraph}>
          Clausula 17. Fica eleito o foro da comarca de Aguas Claras - DF para dirimir quaisquer controversias oriundas deste contrato.
        </Text>
        <Text style={styles.paragraph}>
          Por estarem assim justos e contratados, as partes assinam o presente instrumento juntamente com as testemunhas abaixo arroladas, sendo todos capazes, que a tudo presenciaram.
        </Text>

        <View style={styles.signatureBlock}>
          <Text>Brasilia - DF, {data.formattedDate}.</Text>
        </View>
      </Page>
    </Document>
  );
}

function DirectOrderContractDocument({ data }: { data: ContractData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>
          CONTRATO DE PRESTACAO DE SERVICOS DE ASSESSORIA EM COMERCIO EXTERIOR
        </Text>

        <Text style={styles.paragraph}>
          Pelo presente instrumento particular, as partes abaixo identificadas:
        </Text>

        <Text style={styles.paragraph}>
          CONTRATADA (TRADING): BR IMPORTACAO EXPORTACAO CONSULTORIA E ASSESSORIA LTDA, pessoa juridica de direito privado, inscrita no CNPJ sob n. 46.388.683/0001-05, com sede na Rua Doutor Pedro Ferreira n. 155, sala 1402 A31, Centro, CEP: 88.301-901, Itajai - SC, neste ato representada por seu representante legal;
        </Text>

        <Text style={styles.paragraph}>
          CONTRATANTE (IMPORTADORA): {data.companyName}, pessoa juridica de direito privado, inscrita no CNPJ sob n. {data.cnpj}, com sede em {data.fullAddress}, neste ato representada por seu representante legal;
        </Text>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 1 - DO OBJETO</Text>
          <Text style={styles.paragraph}>
            O presente contrato tem por objeto a prestacao, pela CONTRATADA, de servicos de assessoria e consultoria em operacoes de importacao, incluindo suporte tecnico, documental e estrategico.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 2 - DA NATUREZA DOS SERVICOS</Text>
          <Text style={styles.paragraph}>
            Os servicos prestados possuem carater estritamente consultivo e auxiliar.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 3 - DAS RESPONSABILIDADES DA CONTRATANTE</Text>
          <Text style={styles.paragraph}>
            A CONTRATANTE assume integral responsabilidade pela operacao de importacao, incluindo classificacao fiscal, obrigacoes tributarias, licencas, pagamentos e cumprimento da legislacao.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 4 - DA LIMITACAO DE RESPONSABILIDADE DA CONTRATADA</Text>
          <Text style={styles.paragraph}>
            A CONTRATADA nao se responsabiliza por classificacao fiscal, veracidade documental, qualidade dos produtos, atuacao de terceiros ou quaisquer penalidades causadas por atos da CONTRATANTE.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 5 - DA DEFINICAO DO TERMINAL E DA VEDACAO DE REDESTINACAO</Text>
          <Text style={styles.paragraph}>
            O terminal portuario, recinto alfandegado ou local de descarga das mercadorias sera definido exclusivamente pela CONTRATANTE, cabendo a esta indicar expressamente, por escrito, o local de atracacao e/ou destino da carga.
          </Text>
        </View>
        <Text style={styles.paragraph}>
          A CONTRATADA nao tera qualquer ingerencia ou responsabilidade na escolha, alteracao ou adequacao do terminal indicado, limitando-se a observar as informacoes fornecidas pela CONTRATANTE.
        </Text>
        <Text style={styles.paragraph}>
          Fica expressamente estabelecido que a CONTRATADA nao realizara qualquer redestinacao, alteracao de rota, transferencia de terminal ou mudanca de recinto alfandegado, salvo se houver autorizacao previa, expressa e inequivoca da CONTRATANTE, formalizada por escrito.
        </Text>
        <Text style={styles.paragraph}>
          Na ausencia de manifestacao expressa da CONTRATANTE, a CONTRATADA devera considerar como definitivo o terminal originalmente indicado, isentando-se de qualquer responsabilidade por custos, atrasos, armazenagens, sobrestadias ou penalidades decorrentes da escolha do terminal.
        </Text>
        <Text style={styles.paragraph}>
          Toda e qualquer responsabilidade decorrente da escolha do terminal, inclusive quanto a viabilidade logistica, custos operacionais, restricoes alfandegarias ou exigencias legais, sera integral e exclusiva da CONTRATANTE.
        </Text>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 6 - DA REMUNERACAO</Text>
          <Text style={styles.paragraph}>
            Pelos servicos prestados, a CONTRATANTE pagara a CONTRATADA o valor de {data.serviceFee}, conforme acordado entre as partes.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 7 - DA VIGENCIA</Text>
          <Text style={styles.paragraph}>
            O presente contrato tera vigencia durante o processo de importacao {data.orderNumber ?? ''}, situado na plataforma soulglobal.com.br.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 8 - DA CONFIDENCIALIDADE</Text>
          <Text style={styles.paragraph}>
            As partes comprometem-se a manter sigilo sobre todas as informacoes trocadas.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.clauseTitle}>CLAUSULA 9 - DO FORO</Text>
          <Text style={styles.paragraph}>
            Fica eleito o foro da comarca de Aguas Claras - DF.
          </Text>
        </View>

        <View style={styles.signatureBlock}>
          <Text>Brasilia - DF, {data.formattedDate}.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateContractPdfBase64(data: ContractData): Promise<string> {
  const component =
    data.orderType === 'DIRECT_ORDER'
      ? <DirectOrderContractDocument data={data} />
      : <OrderContractDocument data={data} />;

  const buffer = await renderToBuffer(component);
  return Buffer.from(buffer).toString('base64');
}
