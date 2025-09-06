# Dijital Banking Platform (4 days Assignment)

A simple digital banking platform with event-driven microservices architecture. Programming language Node.js, AWS services with SAM CLI to be utilized. Users authenticates with their email-password and can deposit to & withdraw from their accounts.

**Purpose:** Demonstrate architectural thinking, backend craftmanship, AWD and devops knowledge.

**Optional (Nice to have):** 
- Unit and integration testing
- Secrets management
- Observability (will be covered by powertools usage)
- IaC (will be covered by SAM templates)
- Use ApiGW, service discovery (will be automatically covered by using AWS service with SAM)

## Microservices:
- Ledger Service:
  - Description: single source of trust, append only list of transactions with double entry accounting and idempotency.
  - Database tables: ledger, ledger_events(outbox)
  - Lambda functions: ledger_service
  - Commands Received: DEPOSIT_CMD, WITHDRAW_CMD
  - Commands Sent: N/A
  - Events Emitted: DEPOSIT_EVENT, WITHDRAW_EVENT, WITHDRAW_FAILED_EVENT
  - Events Received: N/A
  - HTTP Endpoints: N/A
- Accounts Service:
  - Description: account informations
  - Database tables: accounts, accounts_events(outbox)
  - Lambda functions: accounts_service
  - Commands Received: N/A
  - Commands Sent: N/A
  - Events Emitted: CREATE_ACCOUNT_EVENT, CLOSE_ACCOUNT_EVENT
  - Events Received: N/A
  - HTTP Endpoints:
    - POST /accounts: Creates a new account for the user
    - POST /accounts/{account_id}/close: Closes specified account
    - GET /accounts/{account_id}: Gets information about specified account
    - GET /accounts: Gets information about all accounts of the user
- Query Service: 
  - Description: For reading/queriying balances and transactions histories
  - Database tables: transactions, balances, accounts_projection
  - Lambda functions: query_service
  - Commands Received: N/A
  - Commands Sent: N/A
  - Events Emitted: N/A
  - Events Received: DEPOSIT_EVENT, WITHDRAW_EVENT, WITHDRAW_FAILED_EVENT, CREATE_ACCOUNT_EVENT, CLOSE_ACCOUNT_EVENT
  - HTTP Endpoints:
    - GET /transactions/{account_id}
    - GET /balances/{account_id}
    - GET /balances
- Banking Service: service to handle user operations
  - Description: service to handle user operations
  - Database tables: operations, operations_events(outbox), accounts_projection
  - Lambda functions: banking_service
  - Commands Received: N/A
  - Commands Sent: DEPOSIT_CMD, WITHDRAW_CMD
  - Events Emitted: N/A
  - Events Received: DEPOSIT_EVENT, WITHDRAW_EVENT, WITHDRAW_FAILED_EVENT, CREATE_ACCOUNT_EVENT, CLOSE_ACCOUNT_EVENT
  - HTTP Endpoints:
    - POST /deposit
    - POST /withdraw
    - GET /operation-status/{operation_id}
- Notifications: (won't be implemented)
  - Description: notifications to users via email, sms, etc.
  - Database tables: notifications
  - Lambda functions: notifications_service
  - Commands Received: N/A
  - Commands Sent: N/A
  - Events Emitted: N/A
  - Events Received: DEPOSIT_EVENT, WITHDRAW_EVENT, WITHDRAW_FAILED_EVENT, CREATE_ACCOUNT_EVENT, CLOSE_ACCOUNT_EVENT
  - HTTP Endpoints: N/A


## General flows of some API endpoints: 

### Deposit:
Client /deposit --> APIGW --> Banking Service --DEPOSIT_CMD(with outbox pattern) --> SQS --> Ledger Service --DEPOSIT_EVENT(with outbox pattern)--> SQS --> Query Service 
--Returns 200 ok with status PENDING after writing the command.

### Withdraw:
Client /withdraw --> APIGW --> Banking Service --WITHDRAW_CMD(with outbox pattern) --> SQS --> Ledger Service --WITHDRAW_EVENT(with outbox pattern)--> SQS --> Query Service
--Returns 200 ok with status PENDING after writing the command.

### Query Operation Status:
Client /operation-status --> APIGW --> Banking Service

### Query Balance:
Client /balance --> APIGW --> Query Service

### Query Transactions:
Client /transactions --> APIGW --> Query Service

### Create Account:
Client /accounts --> APIGW --> Accounts Service --CREATE_ACCOUNT_EVENT(with outbox pattern) --> SQS --> Banking Service & Query Service

### Create Account:
Client /accounts --> APIGW --> Accounts Service --CLOSE_ACCOUNT_EVENT(with outbox pattern) --> SQS --> Banking Service & Query Service


## Design Notes:

- Ledger Service: ACID. transaction isolation -> serializable
- DynamoDB Streams will be used for outbox tables, so no relay worker will be needed.
- All event/command receiving services are idempotent via powertools (internally applies inbox pattern)
- Observability concerns will be handled by powertools (logging, tracing, metrics)
- Cognito will be used as Authentication Service. JWT validation will be done at APIGW level with CognitoAuthorizer.
- For banking service, we will demonstrate DI usage with inversifyjs.
- Retry will be handled by SQS with visibilityTimeout, maxReceiveCount, RedrivePolicy.
- Fundamental AWS Services to be used: SQS, DynamoDB, Lambda, APIGW, Cognito.


## Orchestration:

SAM templates will handle the orchestration in a full AWS environment.
For local developent, we cannot set up full ecosystem locally. sam local start-api will just start the lambdas and emulates APIGW basically. We can also get up dynamodb-local in container locally. Lambdas can be triggered manually but full event driven scenario cannot be achieved.
Localstack would be an option but it's both costly and heavy for this project.
All outgoing messages will be written to outbox tables in DynamoDB, then DynamoDB Streams will complete the outbox pattern and trigger the lambdas. Triggering lambdas by event is not available in local environment.
Full end to end scenario is on AWS environment, which is provided.
Since it's monorepo, SAM templates will be placed in the root folder as central template.

## Crosscutting Concerns:

### Microservices crosscutting concerns:
- DLQ
- projection with cache
- outbox relaying
- idempotency

### Devops concerns:
- IaC
- stages
- CI/CD pipelines

### Observability concerns:
- logging
- tracing
- metrics

### General concerns:
- error handling
- validation
- authentication
- open api
- rate limiting
- security
- caching


## Tools

- SAM CLI
- Turborepo
- Powertools
- Typescript
- Jest
- ESLint + Prettier


## Folder structure:

services
|--- banking
|--- ledger
|--- accounts
|--- query
|--- notifications
shared
|--- 
(not completed)