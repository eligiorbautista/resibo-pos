# Tuboy's POS Backend API

Backend API for Tuboy's POS System built with Express, TypeScript, Prisma, and PostgreSQL.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret key for JWT tokens
   - `PORT` - Server port (default: 3001)

3. **Set up the database:**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database (optional)
   npm run prisma:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding script
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.ts    # Prisma client
│   │   └── env.ts         # Environment variables
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.ts
│   │   └── validateRequest.ts
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   │   ├── jwt.utils.ts
│   │   └── response.utils.ts
│   └── index.ts           # Application entry point
├── .env.example           # Environment variables template
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with PIN
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Products (TODO)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Transactions (TODO)
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `POST /api/transactions/:id/void` - Void transaction
- `POST /api/transactions/:id/refund` - Process refund

### Customers (TODO)
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Employees (TODO)
### Tables (TODO)
### Cash Drawers (TODO)
### Analytics (TODO)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

1. **Login:**
   ```bash
   POST /api/auth/login
   {
     "pin": "0000"
   }
   ```

2. **Use token in requests:**
   ```
   Authorization: Bearer <token>
   ```

## 🗄️ Database

### Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed the database

### Database Schema

The database schema is defined in `prisma/schema.prisma`. Key models:
- Employee
- Product
- Customer
- Transaction
- Table
- CashDrawer
- TimeRecord
- And more...

## 🧪 Development

- **Development mode:** `npm run dev` (with hot reload)
- **Build:** `npm run build`
- **Start production:** `npm start`

## 📝 Environment Variables

See `.env.example` for all available environment variables.

## 🔒 Security

- JWT token-based authentication
- Password/PIN hashing with bcrypt
- Helmet.js for security headers
- CORS configuration
- Input validation with express-validator

## 🚧 TODO

- [ ] Implement all route controllers
- [ ] Add request validation
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add rate limiting
- [ ] Add logging (Winston/Pino)
- [ ] Add real-time features (Socket.io)
- [ ] Add file upload support
- [ ] Add caching (Redis)

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

