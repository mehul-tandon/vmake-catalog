# VMake Product Catalog

A modern, full-stack product catalog application built with React, Express.js, and PostgreSQL. Features include product management, user authentication, file uploads, and an admin dashboard.

## 🚀 Features

- **Product Management**: Add, edit, delete, and view products with images
- **User Authentication**: Secure login system with WhatsApp-based authentication
- **Admin Dashboard**: Comprehensive admin panel for managing products and users
- **File Upload**: Image upload functionality with secure storage
- **Responsive Design**: Modern UI built with React and Tailwind CSS
- **Database Integration**: PostgreSQL with Drizzle ORM
- **Session Management**: Secure session handling with Redis/PostgreSQL storage
- **Rate Limiting**: Built-in protection against abuse
- **CSV Import/Export**: Bulk product management capabilities

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Hook Form** for form management
- **Framer Motion** for animations
- **Recharts** for data visualization

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **Passport.js** for authentication
- **Multer** for file uploads
- **Helmet** for security headers
- **Express Rate Limit** for API protection

### Development Tools
- **TypeScript** for type safety
- **ESBuild** for fast bundling
- **Drizzle Kit** for database migrations

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (local or cloud)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd vmake-product-catalog
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# Session
SESSION_SECRET=your-super-secret-session-key

# Admin Configuration
ADMIN_WHATSAPP=+1234567890

# Security
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# File Upload
MAX_FILE_SIZE=104857600
```

### 4. Database Setup

```bash
# Push database schema
npm run db:push

# Set up admin user and initial data
npm run db:setup
```

### 5. Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5500`

### 6. Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Deployment

### Deploy to Render

This project is configured for easy deployment on Render's free tier.

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service** on [Render](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Update Environment Variables** in `render.yaml`:
   - Replace `YOUR_DATABASE_URL_HERE` with your PostgreSQL connection string
   - Replace `YOUR_ADMIN_WHATSAPP_NUMBER` with your admin WhatsApp number

4. **Deploy**: Render will automatically build and deploy your application

### Manual Deployment

For other platforms:

1. Set up a PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Start with `npm start`

## 📁 Project Structure

```
vmake-product-catalog/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
│   └── index.html
├── server/                # Express backend
│   ├── routes/           # API route handlers
│   ├── migrations/       # Database migrations
│   ├── db.ts            # Database configuration
│   ├── index.ts         # Server entry point
│   └── middleware.ts    # Custom middleware
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema definitions
├── scripts/             # Utility scripts
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Push database schema
- `npm run db:migrate` - Run database migrations
- `npm run db:setup` - Setup database and admin user

## 🔐 Authentication

The application uses WhatsApp number-based authentication:

1. **Admin Setup**: Configure your admin WhatsApp number in environment variables
2. **First Login**: Access `/admin` and set your password
3. **Session Management**: Secure sessions with configurable expiration

## 📊 Admin Features

- **Product Management**: Add, edit, delete products
- **User Management**: Manage user accounts and permissions
- **File Upload**: Secure image upload and management
- **Analytics**: View product and user statistics
- **CSV Import/Export**: Bulk operations for products

## 🛡️ Security Features

- **Rate Limiting**: Protection against API abuse
- **Helmet**: Security headers for production
- **CSRF Protection**: Built-in CSRF protection
- **Input Validation**: Comprehensive input validation with Joi
- **Secure Sessions**: HTTPOnly cookies with secure flags
- **Password Hashing**: Bcrypt for secure password storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) section
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## 🙏 Acknowledgments

- Built with modern web technologies
- UI components from Radix UI
- Icons from Lucide React
- Styling with Tailwind CSS
