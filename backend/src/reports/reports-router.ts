import { Router } from 'express';
import type { CustomerCategoryService } from './customer-category-service.js';
import type { SalesTrendService } from './sales-trend-service.js';
import { validateSalesTrendQuery } from './sales-trend-validation.js';

export const createReportsRouter = (
  salesTrendService: SalesTrendService | undefined,
  customerCategoryService: CustomerCategoryService | undefined,
) => {
  const router = Router();

  router.get('/sales-trend', async (request, response) => {
    const validation = validateSalesTrendQuery(request.query);
    if (!validation.valid) {
      response.status(400).json({ code: 'VALIDATION_ERROR', message: validation.message });
      return;
    }

    if (salesTrendService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      response.status(200).json(await salesTrendService.getSalesTrend(validation.value));
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve sales trend.' });
    }
  });

  router.get('/customer-categories', async (_request, response) => {
    if (customerCategoryService === undefined) {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Database is not configured.' });
      return;
    }

    try {
      response.status(200).json(await customerCategoryService.getCustomerCategories());
    } catch {
      response.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve customer categories.' });
    }
  });

  return router;
};
