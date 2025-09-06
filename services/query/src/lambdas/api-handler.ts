import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import httpRouter from '@middy/http-router';
import { QueryService } from '../services/query-service';
import { commonApiMiddleware } from '@digital-banking/middleware';

// Powertools
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

// Service instance
const queryService = new QueryService();

// Define routes with http-router
export const apiHandler = httpRouter([
  {
    method: 'GET',
    path: '/transactions/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
        logger.info('Getting transactions', { accountId });
        
        // Call service layer
        const result = await queryService.getTransactions(accountId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting transactions', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/balances/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
        logger.info('Getting balance', { accountId });
        
        // Call service layer
        const result = await queryService.getBalance(accountId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting balance', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/balances',
    handler: commonApiMiddleware(async (event) => {
      try {
        // Extract user ID from Cognito authorizer context
        const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
        logger.info('Getting all balances', { userId });
        
        // Call service layer
        const result = await queryService.getBalances(userId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting balances', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  }
]);