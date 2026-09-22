export const formatSalesAmount = (salesAmount: string): string => {
  const [integer, decimal = ''] = salesAmount.split('.');
  const sign = integer.startsWith('-') ? '-' : '';
  const absoluteInteger = sign === '' ? integer : integer.slice(1);
  const groupedInteger = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${sign}${groupedInteger}.${decimal.padEnd(2, '0')}`;
};
