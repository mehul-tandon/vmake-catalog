#!/usr/bin/env node

/**
 * Security Check Script for VMake Product Catalog
 * 
 * This script checks for common security issues and misconfigurations
 * before deployment to ensure the application is secure.
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 VMake Product Catalog - Security Check');
console.log('=========================================\n');

let hasIssues = false;

// Check 1: Environment Variables
console.log('1. Checking environment variables...');
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'ADMIN_WHATSAPP'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`));
  hasIssues = true;
} else {
  console.log('✅ All required environment variables are set');
}

// Check 2: Default/Weak Values
console.log('\n2. Checking for default/weak values...');
const weakValues = [];

if (process.env.SESSION_SECRET === 'default-session-secret-change-in-production') {
  weakValues.push('SESSION_SECRET is using default value');
}

if (process.env.ADMIN_WHATSAPP === '+1234567890') {
  weakValues.push('ADMIN_WHATSAPP is using default value');
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('YOUR_DATABASE_URL_HERE')) {
  weakValues.push('DATABASE_URL contains placeholder text');
}

if (weakValues.length > 0) {
  console.log('⚠️  Weak or default values detected:');
  weakValues.forEach(issue => console.log(`   - ${issue}`));
  hasIssues = true;
} else {
  console.log('✅ No weak or default values detected');
}

// Check 3: File Permissions
console.log('\n3. Checking sensitive files...');
const sensitiveFiles = ['.env', '.env.local', '.env.production'];
const existingSensitiveFiles = sensitiveFiles.filter(file => fs.existsSync(file));

if (existingSensitiveFiles.length > 0) {
  console.log('⚠️  Sensitive files found (ensure they are in .gitignore):');
  existingSensitiveFiles.forEach(file => console.log(`   - ${file}`));
} else {
  console.log('✅ No sensitive files found in root directory');
}

// Check 4: .gitignore
console.log('\n4. Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  const requiredIgnores = ['.env', 'node_modules/', 'uploads/', '*.log'];
  const missingIgnores = requiredIgnores.filter(pattern => !gitignoreContent.includes(pattern));
  
  if (missingIgnores.length > 0) {
    console.log('⚠️  Missing patterns in .gitignore:');
    missingIgnores.forEach(pattern => console.log(`   - ${pattern}`));
  } else {
    console.log('✅ .gitignore contains required patterns');
  }
} else {
  console.log('❌ .gitignore file not found');
  hasIssues = true;
}

// Check 5: Production Settings
console.log('\n5. Checking production settings...');
if (process.env.NODE_ENV === 'production') {
  const productionIssues = [];
  
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    productionIssues.push('DATABASE_URL should not use localhost in production');
  }
  
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    productionIssues.push('SESSION_SECRET should be at least 32 characters long');
  }
  
  if (productionIssues.length > 0) {
    console.log('⚠️  Production configuration issues:');
    productionIssues.forEach(issue => console.log(`   - ${issue}`));
    hasIssues = true;
  } else {
    console.log('✅ Production settings look good');
  }
} else {
  console.log('ℹ️  Not running in production mode');
}

// Check 6: Package Security
console.log('\n6. Checking package.json...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for dev dependencies in production dependencies
  const devDepsInProd = [];
  const devOnlyPackages = ['nodemon', 'concurrently', '@types/', 'eslint', 'prettier'];
  
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach(dep => {
      if (devOnlyPackages.some(devPkg => dep.includes(devPkg))) {
        devDepsInProd.push(dep);
      }
    });
  }
  
  if (devDepsInProd.length > 0) {
    console.log('⚠️  Development packages in production dependencies:');
    devDepsInProd.forEach(dep => console.log(`   - ${dep}`));
  } else {
    console.log('✅ Package dependencies look clean');
  }
} else {
  console.log('❌ package.json not found');
  hasIssues = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasIssues) {
  console.log('❌ Security check completed with issues');
  console.log('Please address the issues above before deploying to production.');
  process.exit(1);
} else {
  console.log('✅ Security check passed!');
  console.log('Your application appears to be configured securely.');
}

console.log('\n💡 Additional Security Recommendations:');
console.log('   - Regularly update dependencies');
console.log('   - Use HTTPS in production');
console.log('   - Monitor application logs');
console.log('   - Set up database backups');
console.log('   - Use strong, unique passwords');
console.log('   - Enable database SSL connections');
console.log('   - Consider using a Web Application Firewall (WAF)');
