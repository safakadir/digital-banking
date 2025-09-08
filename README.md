# Digital Banking Platform

A simple digital banking platform with event-driven microservices architecture built using Node.js, TypeScript, and AWS services with SAM CLI.


## Quick Start

### Prerequisites

- Node.js 22+
- AWS SAM CLI
- AWS CLI configured with appropriate credentials

### Setup

1. Install dependencies:

```bash
npm install
```

2. Build all services:

```bash
npm run build
```

### Deployment

```bash
npm run deploy
```

This will deploy the services to AWS with SAM.

### Local Development

```bash
npm run dev:shared
```

This will start the TypeScript compiler in watch mode for shared services.

To start the API locally:

```bash
sam local start-api
```

*NOTE: Local resources needed. Only api endpoints is available.*


## Demo

Live at: https://mfwz73pfc3.execute-api.eu-central-1.amazonaws.com/dev

### Get Authenticated

```bash
aws cognito-idp initiate-auth \
  --client-id 6be0cg2ppovecf7bu6ed5nttbc \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=test@mail.com,PASSWORD=Aa123456
```

Get `IdToken` from the response and use it as *Bearer Token* in `Authorization` header of API requests.

### API Endpoinst

Accounts
- `POST /accounts` - Create new account
- `GET /accounts` - List all user accounts
- `GET /accounts/{account_id}` - Get account details
- `PUT /accounts/{account_id}/close` - Close account

Banking Operations
- `POST /deposit` - Deposit money
- `POST /withdraw` - Withdraw money
- `GET /operation-status/{operation_id}` - Get operation status

Query Operations
- `GET /transactions/{account_id}` - Get account transaction history
- `GET /balances/{account_id}` - Get account balance
- `GET /balances` - Get all user account balances

Find detailed descriptions in [Openapi Spec file](./docs/api-contract.yaml).


## Architecture

This project follows an event-driven microservices architecture with the following components:

- **Banking Service**: Handles user operations (deposit, withdraw)
- **Ledger Service**: Single source of truth for transactions
- **Accounts Service**: Manages account information
- **Query Service**: For reading/querying balances and transaction histories

![Event Driven Architecture](./docs/EDA.png)

### Messages

| Service | Commands Received | Commands Sent | Events Emitted | Events Received |
|---------|------------------|---------------|----------------|-----------------|
| **Accounts Service** | N/A | N/A | `CREATE_ACCOUNT_EVENT`<br>`CLOSE_ACCOUNT_EVENT` | N/A |
| **Banking Service** | N/A | `DEPOSIT_CMD`<br>`WITHDRAW_CMD` | N/A | `DEPOSIT_EVENT`<br>`WITHDRAW_SUCCESS_EVENT`<br>`WITHDRAW_FAILED_EVENT`<br>`CREATE_ACCOUNT_EVENT`<br>`CLOSE_ACCOUNT_EVENT` |
| **Ledger Service** | `DEPOSIT_CMD`<br>`WITHDRAW_CMD` | N/A | `DEPOSIT_EVENT`<br>`WITHDRAW_SUCCESS_EVENT`<br>`WITHDRAW_FAILED_EVENT` | N/A |
| **Query Service** | N/A | N/A | N/A | `DEPOSIT_EVENT`<br>`WITHDRAW_SUCCESS_EVENT`<br>`CREATE_ACCOUNT_EVENT`<br>`CLOSE_ACCOUNT_EVENT` |

### Architectural Notes 

- Message(Event/Command) handling and API request handling are **separated**.
- **Outbox pattern** used to not loose messages.
  - **Method:** Outbox Table -> DynamoDB Streams -> EventBridge Pipes -> optionally SNS(if fan out needed) -> SQS -> Target Lambda Functions (Event or Command Handler)
  - EventBridge Pipes was the only way to **wire up DynamoDB Streams to SQS and SNS**.
  - Domain operations and writing to outbox is **atomic** (single transaction).
- **Inbox pattern** used to handle idempotency.
  - **Method:** SQS Queue -> Lambda Functions (Event or Command Handler) --> Transaction Start -> Inbox Table Insert wiht Idempotency Check -> Domain Operations -> Transaction Commit
  - Domain operations and inbox management is **atomic** (single transaction).
- **Projection Tables:** Used to store a synced copy of other services data to avoid cross-service calls and dependencies.
- **CQRS:** Commands and Queries are separated 
- **Event Sourcing:** Append-only transactions
- **Transaction Isolation:** Serializable
- `/lambdas` folders are **entry layer** for all services. Then lambda events (api or event/command) are routed to their respective handlers.
  - `/api` folder is **n-tier architecture** for handling **API requests**.
  - `/event` or `/command` folder is **event/command handling** layer. Then message handlers are responsible for domain operations and writing to outbox.
  - Because of the nature and limitations of **DynamoDB transactions**, a **database driven architecture** is used in event/command handlers out of necessity.


## Technologies Used

- TypeScript
- Node.js
- Turborepo
- Webpack
- AWS SAM
- AWS Lambda
- AWS DynamoDB
- AWS SQS
- AWS SNS
- AWS Cognito
- AWS Lambda Powertools


## Future Improvements

- Add unit and integration tests.
- Improve observability and ensure X-Ray tracing.
- Add notification service.
- Add CI/CD pipelines.
- Local development resources and local orchestration.
