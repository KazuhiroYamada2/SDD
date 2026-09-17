import type { StaffPerformanceQuery, StaffPerformanceRepository } from './staff-performance-repository.js';

export type StaffPerformanceItemResponseDto = {
  staffId: string;
  staffEmail: string;
  salesAmount: string;
  salesCount: number;
};

export type StaffPerformanceResponseDto = {
  from: string;
  to: string;
  items: StaffPerformanceItemResponseDto[];
};

export type StaffPerformanceService = {
  getStaffPerformance(query: StaffPerformanceQuery): Promise<StaffPerformanceResponseDto>;
};

const formatSalesAmount = (amount: string): string => {
  const [integer, decimal = ''] = amount.split('.');
  return `${integer}.${decimal.padEnd(2, '0')}`;
};

export const createStaffPerformanceService = (repository: StaffPerformanceRepository): StaffPerformanceService => ({
  async getStaffPerformance(query) {
    const staffPerformance = await repository.findStaffPerformance(query);

    return {
      from: query.from,
      to: query.to,
      items: staffPerformance.map(({ staff_id, staff_email, sales_amount, sales_count }) => ({
        staffId: staff_id,
        staffEmail: staff_email,
        salesAmount: formatSalesAmount(sales_amount),
        salesCount: sales_count,
      })),
    };
  },
});
