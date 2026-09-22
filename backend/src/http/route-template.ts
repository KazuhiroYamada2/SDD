import type { Request } from 'express';

type RouteDefinition = {
  method: string;
  pattern: RegExp;
  template: string;
};

const routes: readonly RouteDefinition[] = [
  { method: 'POST', pattern: /^\/api\/v1\/auth\/login$/, template: '/api/v1/auth/login' },
  { method: 'GET', pattern: /^\/health$/, template: '/health' },
  { method: 'GET', pattern: /^\/health\/live$/, template: '/health/live' },
  { method: 'GET', pattern: /^\/health\/ready$/, template: '/health/ready' },
  { method: 'GET', pattern: /^\/api\/v1\/customers$/, template: '/api/v1/customers' },
  { method: 'POST', pattern: /^\/api\/v1\/customers$/, template: '/api/v1/customers' },
  { method: 'GET', pattern: /^\/api\/v1\/customers\/[^/]+$/, template: '/api/v1/customers/:id' },
  { method: 'PATCH', pattern: /^\/api\/v1\/customers\/[^/]+$/, template: '/api/v1/customers/:id' },
  { method: 'DELETE', pattern: /^\/api\/v1\/customers\/[^/]+$/, template: '/api/v1/customers/:id' },
  { method: 'GET', pattern: /^\/api\/v1\/customers\/[^/]+\/activities$/, template: '/api/v1/customers/:customerId/activities' },
  { method: 'POST', pattern: /^\/api\/v1\/customers\/[^/]+\/activities$/, template: '/api/v1/customers/:customerId/activities' },
  { method: 'GET', pattern: /^\/api\/v1\/reports\/sales-trend$/, template: '/api/v1/reports/sales-trend' },
  { method: 'GET', pattern: /^\/api\/v1\/reports\/customer-categories$/, template: '/api/v1/reports/customer-categories' },
  { method: 'GET', pattern: /^\/api\/v1\/reports\/staff-performance$/, template: '/api/v1/reports/staff-performance' },
  { method: 'GET', pattern: /^\/api\/v1\/users$/, template: '/api/v1/users' },
  { method: 'PATCH', pattern: /^\/api\/v1\/users\/[^/]+\/role$/, template: '/api/v1/users/:id/role' },
];

export const normalizedRoute = (request: Request): string =>
  routes.find(({ method, pattern }) => method === request.method && pattern.test(request.path))?.template ?? 'UNMATCHED';
