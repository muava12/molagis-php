# Molagis PHP to React + Supabase Migration Plan

## Current Application Analysis

### Application Overview
- **Name**: Molagis Admin Dashboard
- **Purpose**: Catering business management system for daily orders in Samarinda
- **Current Stack**: PHP + Twig + Supabase + Tabler CSS
- **Target Stack**: React + Vite + Supabase + Tabler CSS (React-compatible)

### Current Features Analysis

#### 1. Authentication System
- **Current**: PHP sessions with Supabase Auth
- **Features**: Login, logout, remember me, token refresh
- **Migration**: Use Supabase Auth directly in React

#### 2. Dashboard Feature
- **Current**: [`DashboardController.php`](src/Features/Dashboard/DashboardController.php)
- **Features**:
  - Overview cards (revenue, profit, customers)
  - Delivery list with date navigation
  - Recent orders display
  - Statistics display
  - Add customer modal
  - Add order modal
- **Key APIs**: `/api/deliveries`, `/api/deliveries/update-status`

#### 3. Customers Feature
- **Current**: [`CustomersController.php`](src/Features/Customers/CustomersController.php)
- **Features**:
  - Customer CRUD operations
  - Customer labeling system
  - Customer search and filtering
- **Key APIs**: `/api/customers/*`, `/api/labels/*`

#### 4. Orders Feature
- **Current**: [`OrdersController.php`](src/Features/Orders/OrdersController.php)
- **Features**:
  - Order creation and management
  - Delivery tracking
  - Order search by ID and date
  - Batch operations
  - Order editing
- **Key APIs**: `/api/orders/*`, `/api/delivery/*`

#### 5. Finance Feature
- **Current**: [`FinanceController.php`](src/Features/Finance/FinanceController.php)
- **Features**:
  - Financial records management
  - Expense categories
  - Financial reporting
  - Data import/export
- **Key APIs**: `/api/finance/*`

#### 6. Reports Feature
- **Current**: [`ReportsController.php`](src/Features/Reports/ReportsController.php)
- **Features**: Basic reporting functionality

#### 7. Settings Feature
- **Current**: [`SettingsController.php`](src/Features/Settings/SettingsController.php)
- **Features**:
  - Business settings management
  - Package (paket) management
  - System configuration

## React Component Architecture Plan

### Project Structure
```
molagis-react/
├── public/
│   ├── images/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Layout/
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   ├── Modal/
│   │   │   ├── Toast/
│   │   │   └── Loading/
│   │   └── ui/
│   │       ├── Button/
│   │       ├── Input/
│   │       ├── Select/
│   │       ├── Table/
│   │       └── Card/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── finance/
│   │   ├── reports/
│   │   └── settings/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── contexts/
│   ├── types/
│   └── App.tsx
├── package.json
└── vite.config.ts
```

### Core Components

#### 1. Layout Components
- **`Layout/MainLayout.tsx`**: Main application layout
- **`Header/Header.tsx`**: Navigation header with user menu
- **`Footer/Footer.tsx`**: Application footer
- **`Sidebar/Sidebar.tsx`**: Navigation sidebar (if needed)

#### 2. Common UI Components
- **`Modal/Modal.tsx`**: Reusable modal component
- **`Toast/Toast.tsx`**: Notification system
- **`Loading/Loading.tsx`**: Loading states
- **`Card/Card.tsx`**: Card container component
- **`Table/Table.tsx`**: Data table component
- **`Button/Button.tsx`**: Button variants
- **`Input/Input.tsx`**: Form input components
- **`Select/Select.tsx`**: Dropdown components

### Feature-Specific Components

#### 1. Authentication (`src/features/auth/`)
```
auth/
├── components/
│   ├── LoginForm.tsx
│   └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useLogin.ts
├── services/
│   └── authService.ts
└── types/
    └── auth.types.ts
```

**Components:**
- **`LoginForm.tsx`**: Login form with email/password
- **`ProtectedRoute.tsx`**: Route protection wrapper

**Hooks:**
- **`useAuth.ts`**: Authentication state management
- **`useLogin.ts`**: Login form logic

#### 2. Dashboard (`src/features/dashboard/`)
```
dashboard/
├── components/
│   ├── DashboardPage.tsx
│   ├── OverviewCards.tsx
│   ├── DeliveryList.tsx
│   ├── RecentOrders.tsx
│   ├── StatisticsCard.tsx
│   ├── AddCustomerModal.tsx
│   └── AddOrderModal.tsx
├── hooks/
│   ├── useDashboard.ts
│   ├── useDeliveries.ts
│   └── useRecentOrders.ts
├── services/
│   └── dashboardService.ts
└── types/
    └── dashboard.types.ts
```

**Components:**
- **`DashboardPage.tsx`**: Main dashboard container
- **`OverviewCards.tsx`**: Revenue, profit, customer cards with charts
- **`DeliveryList.tsx`**: Daily delivery list with navigation
- **`RecentOrders.tsx`**: Recent orders display
- **`StatisticsCard.tsx`**: Daily statistics
- **`AddCustomerModal.tsx`**: Quick customer creation
- **`AddOrderModal.tsx`**: Quick order creation

#### 3. Customers (`src/features/customers/`)
```
customers/
├── components/
│   ├── CustomersPage.tsx
│   ├── CustomerTable.tsx
│   ├── CustomerForm.tsx
│   ├── CustomerModal.tsx
│   ├── LabelManager.tsx
│   └── CustomerSearch.tsx
├── hooks/
│   ├── useCustomers.ts
│   ├── useCustomerForm.ts
│   └── useLabels.ts
├── services/
│   └── customersService.ts
└── types/
    └── customers.types.ts
```

**Components:**
- **`CustomersPage.tsx`**: Main customers management page
- **`CustomerTable.tsx`**: Customers data table
- **`CustomerForm.tsx`**: Customer creation/editing form
- **`CustomerModal.tsx`**: Customer modal wrapper
- **`LabelManager.tsx`**: Customer labeling system
- **`CustomerSearch.tsx`**: Customer search functionality

#### 4. Orders (`src/features/orders/`)
```
orders/
├── components/
│   ├── OrdersPage.tsx
│   ├── OrderTable.tsx
│   ├── OrderForm.tsx
│   ├── OrderModal.tsx
│   ├── DeliveryTracker.tsx
│   ├── OrderSearch.tsx
│   └── BatchActions.tsx
├── hooks/
│   ├── useOrders.ts
│   ├── useOrderForm.ts
│   └── useDeliveryTracking.ts
├── services/
│   └── ordersService.ts
└── types/
    └── orders.types.ts
```

**Components:**
- **`OrdersPage.tsx`**: Main orders management page
- **`OrderTable.tsx`**: Orders data table with pagination
- **`OrderForm.tsx`**: Order creation/editing form
- **`OrderModal.tsx`**: Order modal wrapper
- **`DeliveryTracker.tsx`**: Delivery status tracking
- **`OrderSearch.tsx`**: Order search by ID/date
- **`BatchActions.tsx`**: Batch operations on orders

#### 5. Finance (`src/features/finance/`)
```
finance/
├── components/
│   ├── FinancePage.tsx
│   ├── FinanceTable.tsx
│   ├── FinanceForm.tsx
│   ├── FinanceModal.tsx
│   ├── ExpenseCategories.tsx
│   ├── FinancialSummary.tsx
│   └── ImportExport.tsx
├── hooks/
│   ├── useFinance.ts
│   ├── useFinanceForm.ts
│   └── useExpenseCategories.ts
├── services/
│   └── financeService.ts
└── types/
    └── finance.types.ts
```

**Components:**
- **`FinancePage.tsx`**: Main finance management page
- **`FinanceTable.tsx`**: Financial records table
- **`FinanceForm.tsx`**: Financial record form
- **`FinanceModal.tsx`**: Finance modal wrapper
- **`ExpenseCategories.tsx`**: Expense category management
- **`FinancialSummary.tsx`**: Financial summary cards
- **`ImportExport.tsx`**: Data import/export functionality

#### 6. Reports (`src/features/reports/`)
```
reports/
├── components/
│   ├── ReportsPage.tsx
│   ├── ReportBuilder.tsx
│   ├── ReportViewer.tsx
│   └── ReportExport.tsx
├── hooks/
│   └── useReports.ts
├── services/
│   └── reportsService.ts
└── types/
    └── reports.types.ts
```

#### 7. Settings (`src/features/settings/`)
```
settings/
├── components/
│   ├── SettingsPage.tsx
│   ├── BusinessSettings.tsx
│   ├── PackageManager.tsx
│   └── SystemSettings.tsx
├── hooks/
│   ├── useSettings.ts
│   └── usePackages.ts
├── services/
│   └── settingsService.ts
└── types/
    └── settings.types.ts
```

### Global State Management

#### Context Providers
```
src/contexts/
├── AuthContext.tsx      # Authentication state
├── ThemeContext.tsx     # Theme management
├── ToastContext.tsx     # Notification system
└── AppContext.tsx       # Global app state
```

#### Custom Hooks
```
src/hooks/
├── useApi.ts           # API request wrapper
├── useLocalStorage.ts  # Local storage management
├── useDebounce.ts      # Debounced values
├── usePagination.ts    # Pagination logic
└── useModal.ts         # Modal state management
```

### Services Layer

#### Supabase Services
```
src/services/
├── supabase.ts         # Supabase client configuration
├── authService.ts      # Authentication operations
├── apiService.ts       # Generic API operations
└── [feature]Service.ts # Feature-specific services
```

### Type Definitions
```
src/types/
├── common.types.ts     # Common type definitions
├── api.types.ts        # API response types
├── supabase.types.ts   # Supabase-generated types
└── [feature].types.ts  # Feature-specific types
```

### Utilities
```
src/utils/
├── constants.ts        # Application constants
├── helpers.ts          # Helper functions
├── formatters.ts       # Data formatting utilities
├── validators.ts       # Form validation
└── dateUtils.ts        # Date manipulation utilities
```

## Migration Strategy

### Phase 1: Foundation Setup
1. **Project Setup**: Initialize Vite + React + TypeScript project
2. **Supabase Configuration**: Set up Supabase client for React
3. **UI Framework**: Install and configure Tabler CSS for React
4. **Routing**: Set up React Router
5. **State Management**: Implement Context API structure

### Phase 2: Core Features
1. **Authentication**: Implement login/logout with Supabase Auth
2. **Layout**: Create main layout components
3. **Dashboard**: Basic dashboard with overview cards
4. **Navigation**: Implement routing between features

### Phase 3: Feature Migration
1. **Customers Management**: Full CRUD operations
2. **Orders Management**: Order creation and tracking
3. **Finance Management**: Financial records and reporting
4. **Settings**: Business and system settings

### Phase 4: Advanced Features
1. **Real-time Updates**: Implement Supabase real-time subscriptions
2. **Offline Support**: Service worker for offline functionality
3. **Performance Optimization**: Code splitting and lazy loading
4. **Testing**: Unit and integration tests

### Phase 5: Deployment
1. **Build Optimization**: Production build configuration
2. **Environment Setup**: Production environment variables
3. **Deployment**: Deploy to hosting platform
4. **Monitoring**: Error tracking and analytics

## Key Considerations

### Data Migration
- **Database Schema**: Current Supabase schema should remain compatible
- **API Endpoints**: Replace PHP API calls with direct Supabase operations
- **Authentication**: Migrate from PHP sessions to Supabase Auth tokens

### UI/UX Consistency
- **Design System**: Maintain current Tabler CSS design
- **Responsive Design**: Ensure mobile compatibility
- **Accessibility**: Implement proper ARIA attributes

### Performance
- **Code Splitting**: Lazy load feature modules
- **Caching**: Implement proper data caching strategies
- **Bundle Size**: Optimize bundle size with tree shaking

### Security
- **Authentication**: Secure token management
- **Authorization**: Implement proper role-based access
- **Data Validation**: Client and server-side validation

This migration plan provides a comprehensive roadmap for converting the current PHP application to a modern React + Supabase architecture while maintaining all existing functionality and improving the overall user experience.