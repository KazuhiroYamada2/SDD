import express from 'express';
import { createActivitiesRouter } from './activities/activities-router.js';
import { createActivityReferenceRepository } from './activities/activity-reference-repository.js';
import { createActivityRepository } from './activities/activity-repository.js';
import { createCreateActivityService, type ActivityService } from './activities/activity-service.js';
import { createAuthUserRepository } from './auth/auth-user-repository.js';
import type { AuthUserRepository } from './auth/auth-user-repository.js';
import { createAuthRouter } from './auth/auth-router.js';
import { createAuthenticationMiddleware } from './auth/authentication-middleware.js';
import { createJwtService, type JwtService } from './auth/jwt-service.js';
import { createLoginService, type LoginService } from './auth/login-service.js';
import { createCustomersRouter } from './customers/customers-router.js';
import { createCustomerRepository, type CustomerRepository } from './customers/customer-repository.js';
import { createCustomerReadService, type CustomerReadService } from './customers/customer-read-service.js';
import { createCustomerEditService, type CustomerEditService } from './customers/customer-edit-service.js';
import { createCustomerDeleteService, type CustomerDeleteService } from './customers/customer-delete-service.js';
import { database } from './db.js';
import { handleForbiddenError } from './authorization/forbidden-error-handler.js';
import { createCustomerCategoryRepository } from './reports/customer-category-repository.js';
import { createCustomerCategoryService, type CustomerCategoryService } from './reports/customer-category-service.js';
import { createReportsRouter } from './reports/reports-router.js';
import { createSalesTrendRepository } from './reports/sales-trend-repository.js';
import { createSalesTrendService, type SalesTrendService } from './reports/sales-trend-service.js';
import { createStaffPerformanceRepository } from './reports/staff-performance-repository.js';
import { createStaffPerformanceService, type StaffPerformanceService } from './reports/staff-performance-service.js';
import { createUserRepository } from './users/user-repository.js';
import { createUserService, type UserService } from './users/user-service.js';
import { createUsersRouter } from './users/users-router.js';
import { createCustomerCrypto, type CustomerCrypto } from './customers/customer-crypto.js';
import { config } from './config.js';

type AppDependencies = {
  loginService?: LoginService;
  authUserRepository?: AuthUserRepository;
  jwtService?: JwtService;
  customerRepository?: CustomerRepository;
  customerReadService?: CustomerReadService;
  customerEditService?: CustomerEditService;
  customerDeleteService?: CustomerDeleteService;
  activityService?: ActivityService;
  salesTrendService?: SalesTrendService;
  customerCategoryService?: CustomerCategoryService;
  staffPerformanceService?: StaffPerformanceService;
  userService?: UserService;
  customerCrypto?: CustomerCrypto;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = express();
  const authUserRepository = dependencies.authUserRepository ??
    (database === undefined ? {
      findByEmail: async () => null,
      findById: async () => null,
    } : createAuthUserRepository(database));
  const jwtService = dependencies.jwtService ?? createJwtService();
  const loginService = dependencies.loginService ??
    (database === undefined ? undefined : createLoginService({
      userRepository: authUserRepository,
      issueAccessToken: jwtService.issueAccessToken,
    }));
  const productionCustomerRepository = database === undefined ? undefined : createCustomerRepository(database);
  const customerCrypto = dependencies.customerCrypto ?? createCustomerCrypto(config.customerEncryption);
  const customerRepository = dependencies.customerRepository ?? productionCustomerRepository;
  const customerReadService = dependencies.customerReadService ??
    (productionCustomerRepository === undefined ? undefined : createCustomerReadService(productionCustomerRepository, customerCrypto));
  const customerEditService = dependencies.customerEditService ??
    (productionCustomerRepository === undefined ? undefined : createCustomerEditService(productionCustomerRepository, customerCrypto));
  const customerDeleteService = dependencies.customerDeleteService ??
    (productionCustomerRepository === undefined ? undefined : createCustomerDeleteService(productionCustomerRepository));
  const activityService = dependencies.activityService ??
    (database === undefined
      ? undefined
      : createCreateActivityService({
        activityRepository: createActivityRepository(database),
        referenceRepository: createActivityReferenceRepository(database),
      }));
  const salesTrendService = dependencies.salesTrendService ??
    (database === undefined ? undefined : createSalesTrendService(createSalesTrendRepository(database)));
  const customerCategoryService = dependencies.customerCategoryService ??
    (database === undefined ? undefined : createCustomerCategoryService(createCustomerCategoryRepository(database)));
  const staffPerformanceService = dependencies.staffPerformanceService ??
    (database === undefined ? undefined : createStaffPerformanceService(createStaffPerformanceRepository(database)));
  const userService = dependencies.userService ??
    (database === undefined ? undefined : createUserService(createUserRepository(database)));

  // Auth parses JSON in its own router so malformed login bodies use the auth error DTO.
  app.use('/api/v1/auth', createAuthRouter(loginService));
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/v1', createAuthenticationMiddleware({ userRepository: authUserRepository, jwtService }));
  app.use('/api/v1/customers', createCustomersRouter(
    customerRepository,
    customerReadService,
    customerEditService,
    customerDeleteService,
    customerCrypto,
  ));
  app.use('/api/v1/customers/:customerId/activities', createActivitiesRouter(activityService));
  app.use('/api/v1/reports', createReportsRouter(salesTrendService, customerCategoryService, staffPerformanceService));
  app.use('/api/v1/users', createUsersRouter(userService));
  app.use(handleForbiddenError);

  return app;
};
