# Document Tracker - Club Event Management System

A modern web application for tracking document approval workflows in club settings. Built with React, TypeScript, and Supabase.

## 🌟 Features

### Core Functionality
- **Document Creation**: Upload PDF/image documents with detailed descriptions
- **Admin Approval Workflow**: Multi-level approval system with admin users (employee codes 0001-0004)
- **External Signer Management**: Track signatures from external authorities
- **Real-time Status Updates**: Live tracking of document progress
- **Mobile-Responsive Design**: Works seamlessly on all devices

### User Management
- **Role-based Access**: Admin users (0001-0004) get special privileges
- **Secure Authentication**: Email/password authentication via Supabase
- **Employee Code Validation**: Automatic admin role assignment

### Document Workflow
1. **Creation**: User uploads document and selects approvers/signers
2. **Admin Approval**: Selected admins review and approve/reject documents
3. **Progress Tracking**: Document moves to "in progress" after approval
4. **Signature Collection**: Track external signatures as they're received
5. **Completion**: Automatic status update when all signatures collected

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd document-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Follow the complete setup guide in `SUPABASE_SETUP.md`
   - Copy `.env.example` to `.env` and add your Supabase credentials

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Create your first admin account with employee code 0001-0004

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React context providers
├── lib/               # Utility functions and Supabase config
├── pages/             # Main application pages
├── types/             # TypeScript type definitions
├── index.css          # Global styles with Tailwind
└── main.tsx           # Application entry point
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Toast notifications
- **Date-fns** - Date formatting

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security** - Database security
- **Supabase Storage** - File storage
- **Supabase Auth** - Authentication

### Development
- **Vite** - Fast build tool
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 📊 Database Schema

The application uses 5 main tables:

1. **Users** - User profiles with admin flags
2. **Documents** - Document metadata and status
3. **Approvers** - Internal approval workflow
4. **External Signers** - External signature tracking
5. **Status Updates** - Activity timeline

See `SUPABASE_SETUP.md` for the complete schema.

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Authentication Required** - All routes protected
- **Role-based Permissions** - Admin vs regular user capabilities
- **Secure File Storage** - Files stored in Supabase Storage
- **Input Validation** - Client and server-side validation

## 📱 User Interface

### Dashboard
- Clean document overview
- Status indicators with color coding
- Quick actions (create, view, admin panel)
- Responsive grid layout

### Document Creation
- Drag & drop file upload
- Multi-select approvers
- Dynamic external signer fields
- Form validation with helpful errors

### Admin Panel
- Pending approvals queue
- Approve/reject with comments
- Document preview links
- Bulk actions support

### Document Details
- Comprehensive status view
- Approver progress tracking
- External signer status updates
- Activity timeline
- Status update functionality

## 🔄 Workflow States

1. **Draft** - Initial creation state
2. **Pending Approval** - Waiting for admin review
3. **Approved** - Ready for signature collection
4. **In Progress** - Collecting signatures
5. **Completed** - All signatures received
6. **Rejected** - Rejected by admin or signer

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Deploy to Netlify
1. Build the project locally
2. Upload `dist` folder to Netlify
3. Add environment variables in Netlify settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the `SUPABASE_SETUP.md` for database issues
2. Review the TypeScript types in `src/types/`
3. Check the browser console for client-side errors
4. Review Supabase dashboard for backend issues

## 🎯 Use Cases

Perfect for:
- **Club Event Management** - Track event approval documents
- **Organization Workflows** - Any multi-approval process
- **Document Tracking** - Monitor signature collection
- **Team Collaboration** - Keep everyone informed of status
- **Audit Trails** - Complete activity history

---

Built with ❤️ for efficient document workflow management.