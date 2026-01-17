
# Project Structure

This document explains the organized structure of the TUBOY'S POS system for better maintainability and readability.

## 📁 Directory Structure

```
resibo/
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── Toast.tsx         # Toast notification component
│   │   └── ToastProvider.tsx # Toast context provider
│   │
│   ├── features/            # Main feature pages/components
│   │   ├── POSTerminal.tsx   # Point of Sale terminal
│   │   ├── Dashboard.tsx     # Analytics & insights
│   │   ├── InventoryManager.tsx
│   │   ├── CustomerCRM.tsx
│   │   ├── EmployeeTimeClock.tsx
│   │   ├── TableManagement.tsx
│   │   ├── KitchenDisplaySystem.tsx
│   │   ├── CashDrawerManager.tsx
│   │   └── ShiftHistory.tsx
│   │
│   └── layout/              # Layout components
│       ├── LoginScreen.tsx   # Login/authentication screen
│       ├── Sidebar.tsx       # Main navigation sidebar
│       └── NavItem.tsx       # Navigation item component
│
├── services/                 # External services
│   └── geminiService.ts     # AI insights service
│
├── App.tsx                   # Main app component (orchestrator)
├── index.tsx                 # App entry point
├── types.ts                  # TypeScript type definitions
├── constants.ts              # App constants & mock data
└── README.md

```

## 📂 Component Organization

### **components/common/**
Reusable UI components used throughout the app:
- **Toast.tsx** - Notification toast component
- **ToastProvider.tsx** - Toast context and hook

### **components/features/**
Main feature pages - each represents a major section of the POS:
- **POSTerminal.tsx** - Main POS interface
- **Dashboard.tsx** - Analytics dashboard
- **InventoryManager.tsx** - Inventory management
- **CustomerCRM.tsx** - Customer relationship management
- **EmployeeTimeClock.tsx** - Employee management & time tracking
- **TableManagement.tsx** - Table/floor plan management
- **KitchenDisplaySystem.tsx** - Kitchen order display
- **CashDrawerManager.tsx** - Cash drawer operations
- **ShiftHistory.tsx** - Historical shift records

### **components/layout/**
Layout and navigation components:
- **LoginScreen.tsx** - PIN-based login screen
- **Sidebar.tsx** - Main navigation sidebar
- **NavItem.tsx** - Individual navigation item

## 🔄 Import Paths

### From Root Files (types.ts, constants.ts)
```typescript
// In components/features/ or components/layout/
import { Type } from '../../types';
import { CONSTANT } from '../../constants';
```

### From Common Components
```typescript
// In components/features/
import { useToast } from '../common/ToastProvider';
```

### From Feature Components
```typescript
// In App.tsx
import Component from './components/features/Component';
```

## 🎯 Benefits of This Structure

1. **Clear Separation**: Features, layout, and common components are clearly separated
2. **Easy Navigation**: Developers can quickly find what they need
3. **Scalable**: Easy to add new features without cluttering
4. **Maintainable**: Related code is grouped together
5. **Beginner-Friendly**: Structure is intuitive and self-documenting

## 📝 Adding New Components

- **New Feature Page**: Add to `components/features/`
- **Reusable UI Component**: Add to `components/common/`
- **Layout Component**: Add to `components/layout/`
- **New Service**: Add to `services/`

