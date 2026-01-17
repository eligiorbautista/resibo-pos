# Resibo POS & Business Hub

<div align="center">
<img width="1200" height="475" alt="Resibo POS Banner" src="https://github.com/user-attachments/assets/" />
</div>

A comprehensive Point of Sale (POS) and business management system built with modern web technologies. Resibo combines powerful POS functionality with business intelligence, employee management, inventory control, and more.

## Features

## Point of Sale

- Fast & Intuitive Interface - Streamlined checkout process
- Product Management - Easy inventory tracking and product catalog
- Multi-payment Support - Cash, card, and digital payments
- Receipt Generation - Professional receipts with QR codes
- Cart Management - Suspend and resume transactions

## Customer Management

- Customer Profiles - Track customer information and preferences
- Loyalty Program - Points-based rewards system
- Transaction History - Complete customer purchase records

## Business Intelligence

- Real-time Analytics - Sales performance dashboards
- Revenue Tracking - Daily, weekly, monthly reports
- Inventory Insights - Stock levels and product performance
- Interactive Charts - Visual data representation with Recharts

## Employee Management

- Staff Profiles - Employee information and roles
- Time Tracking - Clock in/out functionality
- Shift Management - Schedule and worktime tracking
- Payroll Integration - Automated payroll calculations

## Restaurant Features

- Table Management - Track dining tables and orders
- Kitchen Display - Order management for kitchen staff
- Menu Management - Digital menu with categories

## BIR Compliance (Philippines)

- Tax Calculations - Automated VAT and tax computations
- Official Receipts - BIR-compliant receipt formats
- Sales Reports - Government-ready financial reports

## Tech Stack

## Frontend

- React 19 - Modern React with latest features
- TypeScript - Type-safe development
- Vite - Fast build tool and development server
- Tailwind CSS - Production-ready utility-first CSS
- React Router - Client-side routing
- Lucide React - Beautiful icon library
- Recharts - Responsive chart library

## Backend

- Node.js - JavaScript runtime
- TypeScript - Type-safe server development
- Prisma - Modern database ORM
- PostgreSQL - Production database
- Express.js - Web application framework

## Getting Started

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Gemini API Key (for AI features)

## Frontend Setup

1. Clone the repository

   ```bash
   git clone https://github.com/eligiorbautista/resibo-pos.git
   cd resibo-pos
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Environment Configuration
   Create a `.env.local` file in the root directory:

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start development server

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Backend Setup

1. Navigate to backend directory

   ```bash
   cd backend
   ```

2. Install backend dependencies

   ```bash
   npm install
   ```

3. Database setup

   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate

   # Seed the database with sample data
   npm run prisma:seed
   ```

4. Start backend server
   ```bash
   npm run dev
   ```

## Available Scripts

## Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run prisma:studio` - Open Prisma database studio
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data

## Project Structure

```
resibo-pos/
├── src/                    # Frontend source code
├── components/             # React components
│   ├── common/            # Shared components
│   ├── features/          # Feature-specific components
│   └── layout/            # Layout components
├── services/              # API services
├── utils/                 # Utility functions
├── backend/               # Backend API
│   ├── src/               # Backend source code
│   ├── prisma/            # Database schema and migrations
│   └── docs/              # Backend documentation
├── docs/                  # Project documentation
└── public/                # Static assets
```

## Deployment

## Frontend Deployment

```bash
npm run build
```

Deploy the `dist` folder to your preferred hosting service (Vercel, Netlify, etc.)

## Backend Deployment

```bash
cd backend
npm run build
npm run start
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- Setup Guides - Detailed installation instructions
- API Documentation - Backend API endpoints
- BIR Compliance - Philippine tax compliance guides
- Deployment Guides - Production deployment instructions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies
- Designed for small to medium businesses
- BIR compliant for Philippine businesses
- AI-powered business insights

---

<div align="center">
  <p>Built with love for businesses everywhere</p>
  <p>© 2026 Resibo POS & Business Hub</p>
</div>
