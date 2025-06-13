# VMake Product Catalog - Deployment Guide

## 🚀 Deployment Options

This application can be deployed on various platforms. Below are detailed instructions for the most popular options.

## 📋 Prerequisites

Before deploying, ensure you have:
- A PostgreSQL database (local or cloud)
- Environment variables configured
- A domain name (optional, but recommended)

## 🌐 Deploy to Render (Recommended - Free Tier)

Render offers a free tier perfect for this application.

### Step 1: Prepare Your Repository
1. Fork this repository to your GitHub account
2. Clone your fork locally
3. Update the `render.yaml` file with your configuration

### Step 2: Configure render.yaml
Edit the `render.yaml` file and replace the placeholder values:

```yaml
envVars:
  - key: DATABASE_URL
    value: YOUR_ACTUAL_DATABASE_URL  # Replace with your PostgreSQL URL
  - key: ADMIN_WHATSAPP
    value: YOUR_ADMIN_WHATSAPP_NUMBER  # Replace with your WhatsApp number
```

### Step 3: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically:
   - Create a PostgreSQL database
   - Deploy your web service
   - Set up environment variables

### Step 4: Post-Deployment Setup
1. Access your deployed app at `https://your-app-name.onrender.com`
2. Go to `/admin` to set up your admin account
3. Use your configured WhatsApp number to log in

## 🐳 Deploy with Docker

### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5500

# Start the application
CMD ["npm", "start"]
```

### Step 2: Create docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5500:5500"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/vmake_catalog
      - SESSION_SECRET=your-secret-key
      - ADMIN_WHATSAPP=+1234567890
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=vmake_catalog
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Step 3: Deploy
```bash
docker-compose up -d
```

## ☁️ Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Configure vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

### Step 3: Deploy
```bash
vercel --prod
```

## 🚀 Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login and Initialize
```bash
railway login
railway init
```

### Step 3: Add Database
```bash
railway add postgresql
```

### Step 4: Deploy
```bash
railway up
```

## 🔧 Environment Variables Setup

For any deployment platform, configure these environment variables:

### Required Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-super-secret-key
ADMIN_WHATSAPP=+1234567890
NODE_ENV=production
```

### Optional Variables
```env
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
MAX_FILE_SIZE=104857600
PORT=5500
```

## 🗄️ Database Setup

### Option 1: Use Render PostgreSQL (Recommended)
- Automatically provisioned with Render Blueprint
- No additional setup required

### Option 2: External PostgreSQL
Popular options:
- **Supabase** (Free tier available)
- **ElephantSQL** (Free tier available)
- **AWS RDS** (Paid)
- **Google Cloud SQL** (Paid)

### Database Initialization
After deployment, the database will be automatically initialized on first run. If you need to manually initialize:

```bash
# Run database migrations
npm run db:push

# Set up admin user
npm run db:setup
```

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure all dependencies are in `dependencies`, not `devDependencies`
   - Check that `DATABASE_URL` is properly formatted
   - Verify Node.js version compatibility (v18+)

2. **Database Connection Issues**
   - Verify database URL format: `postgresql://user:pass@host:port/db`
   - Check if database allows external connections
   - Ensure SSL mode is configured correctly

3. **Session Issues**
   - Verify `SESSION_SECRET` is set
   - Check if database supports session storage
   - Ensure cookies are configured for your domain

4. **File Upload Issues**
   - Check `MAX_FILE_SIZE` configuration
   - Verify upload directory permissions
   - Ensure sufficient disk space

### Getting Help

1. Check application logs for specific error messages
2. Verify all environment variables are set correctly
3. Test database connection independently
4. Check platform-specific documentation

## 📊 Monitoring

### Health Checks
The application provides a health check endpoint at `/` that returns the application status.

### Logging
Application logs include:
- Request/response logging
- Database operation logs
- Authentication events
- Error tracking

### Performance
- Built-in rate limiting
- Optimized database queries
- Efficient file handling
- Production-ready caching

## 🔄 Updates and Maintenance

### Updating the Application
1. Pull latest changes from the repository
2. Run `npm install` to update dependencies
3. Run `npm run build` to rebuild
4. Restart the application

### Database Migrations
```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Backup Recommendations
- Regular database backups
- Environment variable backups
- Uploaded file backups
- Configuration file backups
