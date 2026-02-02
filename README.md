# Parwest ERP - Security Guard Management System

A comprehensive ERP system built with Next.js, TypeScript, and Supabase for managing security guard operations, deployments, payroll, and client relationships.

## 🔐 Test Credentials

For testing, use the following credentials (all users share password: **Test123!**):

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **System Admin** | admin@parwest.com | Test123! | Full system access - all modules, users, roles |
| **Regional Manager** | manager@parwest.com | Test123! | Regional operations - guards, deployments, attendance |
| **HR Officer** | hr@parwest.com | Test123! | HR functions - guards, documents, verification, payroll |
| **Operations Supervisor** | supervisor@parwest.com | Test123! | Branch operations - deployments, attendance, rosters |
| **Finance Officer** | finance@parwest.com | Test123! | Financial operations - payroll, billing, invoices |
| **Inventory Officer** | inventory@parwest.com | Test123! | Inventory management - assets, equipment tracking |
| **Auditor** | auditor@parwest.com | Test123! | Read-only access - all modules for audit |
| **Client Portal** | client@parwest.com | Test123! | Client view - invoices, tickets, own data |

> ⚠️ **Security Note**: These are test credentials for development only. Never use in production.
## 📁 Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Authentication pages
│   │   │   ├── login/           # Login page
│   │   │   ├── forgot-password/ # Password reset request
│   │   │   └── reset-password/  # Password reset form
│   │   ├── (dashboard)/         # Main application (protected)
│   │   │   ├── dashboard/       # Overview & KPIs
│   │   │   ├── guards/          # Guard management
│   │   │   ├── clients/         # Client & branch management
│   │   │   ├── deployments/     # Guard deployments & rosters
│   │   │   ├── attendance/      # Attendance tracking
│   │   │   ├── payroll/         # Payroll processing
│   │   │   ├── billing/         # Invoicing & payments
│   │   │   ├── inventory/       # Asset tracking
│   │   │   ├── tickets/         # Support tickets
│   │   │   ├── reports/         # Reports & analytics
│   │   │   └── settings/        # System settings
│   │   └── auth/callback/       # OAuth callback handler
│   ├── components/              # React components by feature
│   ├── lib/                     # Utilities & Supabase clients
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript definitions
├── public/                      # Static assets
└── docs/                        # System documentation
```

## 🎯 Key Features

- 🔐 **Role-Based Access Control (RBAC)** - 8 distinct user roles with granular permissions
- 👥 **Guard Lifecycle Management** - Hiring, onboarding, deployment, clearance
- 📍 **Multi-Branch Operations** - Regional and branch-level management
- 📋 **Deployment & Rosters** - Guard assignment and shift scheduling
- ⏰ **Attendance Tracking** - Real-time attendance with shift support
- 💰 **Payroll Processing** - Automated salary calculations and allowances
- 🧾 **Billing & Invoicing** - Client invoicing and payment tracking
- 📦 **Inventory Management** - Equipment and asset tracking
- 🎫 **Support Tickets** - Issue tracking and resolution
- 📊 **Real-Time Dashboard** - KPIs and alerts
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **State Management**: React hooks
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## 📚 Documentation

Comprehensive system documentation is available in the `docs/` folder:

- [Security ERP System Blueprint](../docs/security_erp_system_blueprint_next.md) - Complete system architecture
- [IAM Access Matrix](../docs/iam_access_matrix.md) - Roles and permissions
- [API Contracts](../docs/api_contracts.md) - Backend API specifications
- [Implementation Plan](../docs/implementation_plan.md) - Development roadmap
- [Workflows](../docs/workflows.md) - Business process workflows

## 🔧 Development

### Current Status
- ✅ Frontend UI complete with mock data
- ✅ Authentication flow implemented
- ✅ Role-based routing and permissions
- ⏳ Backend integration in progress (Phase 8)

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Supabase guides
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com) - Component library

## 🤝 Support

For questions or issues, please refer to the project documentation or contact the development team
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Create test users** (Supabase Cloud):
   ```bash
   # Set service role key for admin operations
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Run the user creation script
   node ../scripts/create-test-users.js
   ```
   
   Alternatively, create users manually via Supabase Dashboard:
   - Go to Authentication → Users → Add user
   - Use emails from the table above with password: Test123!

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) and login with any test credentials above.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
