import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import httpRouter from '@middy/http-router';
import { commonApiMiddleware } from '@digital-banking/middleware';
import { BankingService } from '../services/banking-service';

// Powertools
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

// Service instance
const bankingService = new BankingService();

// Define routes with http-router
export const apiHandler = httpRouter([
  {
    method: 'POST',
    path: '/deposit',
    handler: commonApiMiddleware(async (event) => {
      try {
        const body = event.body ? JSON.parse(event.body) : {};
        
        // Validate request
        if (!body.accountId || !body.amount) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID and amount are required' })
          };
        }
        
        logger.info('Processing deposit request', { accountId: body.accountId, amount: body.amount });
        
        // Call service layer
        const result = await bankingService.processDeposit(body.accountId, body.amount);
        
        // Return success response
        return {
          statusCode: 202,
          body: JSON.stringify({
            message: 'Deposit operation initiated',
            ...result
          })
        };
      } catch (error) {
        logger.error('Error processing deposit', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'POST',
    path: '/withdraw',
    handler: commonApiMiddleware(async (event) => {
      try {
        const body = event.body ? JSON.parse(event.body) : {};
        
        // Validate request
        if (!body.accountId || !body.amount) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID and amount are required' })
          };
        }
        
        logger.info('Processing withdraw request', { accountId: body.accountId, amount: body.amount });
        
        // Call service layer
        const result = await bankingService.processWithdraw(body.accountId, body.amount);
        
        // Return success response
        return {
          statusCode: 202,
          body: JSON.stringify({
            message: 'Withdraw operation initiated',
            ...result
          })
        };
      } catch (error) {
        logger.error('Error processing withdraw', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/operation-status/{operation_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const operationId = event.pathParameters?.operation_id;
        if (!operationId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Operation ID is required' })
          };
        }
        
        logger.info('Getting operation status', { operationId });
        
        // Call service layer
        const result = await bankingService.getOperationStatus(operationId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting operation status', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  }
]);