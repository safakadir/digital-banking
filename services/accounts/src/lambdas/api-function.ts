import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import httpRouter from '@middy/http-router';
import { commonApiMiddleware, validatorMiddleware, errorHandlerMiddleware } from '@digital-banking/middleware';
import { CreateAccountRequest } from '../models';
import { createAccountService } from '../services';
import { validateCreateAccountRequest, validateAccountIdParam, validateGetAccountsRequest } from '../validators/account-validators';

/**
 * Creates an API handler with dependency injection support
 * @param queryService - QueryService instance
 * @param logger - Logger instance
 * @param tracer - Tracer instance
 * @param metrics - Metrics instance
 * @returns HTTP router handler
 */
export function createApiFunctionHandler(
  accountService = createAccountService(),
  logger = new Logger(),
  tracer = new Tracer(),
  metrics = new Metrics()
) {
  return httpRouter([
  {
    method: 'POST',
    path: '/accounts',
    handler: commonApiMiddleware(async (event) => {
      logger.info('Creating new account');
      
      // Extract user ID from Cognito authorizer context
      const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
      
      // Parse request body
      const body = event.body as any;
      
      const data: CreateAccountRequest = {
        name: body.name,
        currency: body.currency
      };
      
      // Call service layer
      const result = await accountService.createAccount(userId, data);
      
      // Return success response
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Account created successfully',
          ...result
        })
      };
    }, logger, tracer, metrics)
      .use(validatorMiddleware(validateCreateAccountRequest, logger))
      .use(errorHandlerMiddleware(logger))
  },
  {
    method: 'POST',
    path: '/accounts/{account_id}/close',
    handler: commonApiMiddleware(async (event) => {
      const accountId = event.pathParameters?.account_id as string;
      
      logger.info('Closing account', { accountId });
      
      // Call service layer
      await accountService.closeAccount(accountId);
      
      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Account closed successfully',
          accountId
        })
      };
    }, logger, tracer, metrics)
      .use(validatorMiddleware(validateAccountIdParam, logger))
      .use(errorHandlerMiddleware(logger))
  },
  {
    method: 'GET',
    path: '/accounts/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      const accountId = event.pathParameters?.account_id as string;
      
      logger.info('Getting account details', { accountId });
      
      // Call service layer
      const account = await accountService.getAccount(accountId);
      
      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify(account)
      };
    }, logger, tracer, metrics)
      .use(validatorMiddleware(validateAccountIdParam, logger))
      .use(errorHandlerMiddleware(logger))
  },
  {
    method: 'GET',
    path: '/accounts',
    handler: commonApiMiddleware(async (event) => {
      // Extract user ID from Cognito authorizer context
      const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
      logger.info('Getting all accounts', { userId });
      
      // Call service layer
      const result = await accountService.getAccounts(userId);
      
      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    }, logger, tracer, metrics)
      .use(validatorMiddleware(validateGetAccountsRequest, logger))
      .use(errorHandlerMiddleware(logger))
  }
])};

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
