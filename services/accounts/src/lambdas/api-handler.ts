import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import httpRouter from '@middy/http-router';
import { commonApiMiddleware } from '@digital-banking/middleware';
import { AccountService } from '../services/account-service';

// Powertools
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

// Service instance
const accountService = new AccountService();

// Define routes with http-router
export const apiHandler = httpRouter([
  {
    method: 'POST',
    path: '/accounts',
    handler: commonApiMiddleware(async (event) => {
      try {
        logger.info('Creating new account');
        
        // Extract user ID from Cognito authorizer context
        const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
        
        // Parse request body
        const data = event.body ? JSON.parse(event.body) : {};
        
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
      } catch (error) {
        logger.error('Error creating account', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'POST',
    path: '/accounts/{account_id}/close',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
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
      } catch (error) {
        logger.error('Error closing account', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/accounts/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
        logger.info('Getting account details', { accountId });
        
        // Call service layer
        const account = await accountService.getAccount(accountId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(account)
        };
      } catch (error) {
        logger.error('Error getting account', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/accounts',
    handler: commonApiMiddleware(async (event) => {
      try {
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
      } catch (error) {
        logger.error('Error getting accounts', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  }
]);