# Calculadora de Parcelas INCC

Este é um projeto bem simples para calcular o valor ajustado das parcelas de um imóvel com base no INCC (Índice Nacional de Custo da Construção), especificamente usando o método M-2 (INCC de dois meses anteriores à data de pagamento), que é comumente usado pelo mercado/construtoras para esse tipo de pagamento parcelado.

## Como Usar

1.  **Valor Total do Imóvel (R$)**: Insira o valor total do imóvel.
2.  **Entrada (Opcional) (R$)**: Insira o valor da entrada, se houver.
3.  **Número de Parcelas**: Insira o número total de parcelas.
4.  **Data Inicial (AAAA-MM)**: Insira a data de início das parcelas.

    - A calculadora usará o índice INCC-M de dois meses anteriores à data de pagamento de cada parcela para ajustar o valor.

5.  Clique em **Calcular** para gerar uma tabela com os valores ajustados das parcelas.

## Resources

- [AllOrigins](https://api.allorigins.win/) - Usado como um proxy para buscar dados do INCC de uma fonte externa.
- [dadosdemercado.com.br](https://www.dadosdemercado.com.br/indices/incc-m) - Fonte dos dados do INCC.
