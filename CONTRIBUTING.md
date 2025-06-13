# Contributing to VMake Product Catalog

Thank you for your interest in contributing to VMake Product Catalog! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (for local development)
- Git

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/vmake-product-catalog.git
   cd vmake-product-catalog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:setup
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier configuration)
- Use meaningful variable and function names
- Add comments for complex logic
- Follow React best practices for components

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utility functions
├── server/           # Express backend
│   ├── routes/       # API route handlers
│   ├── middleware.ts # Custom middleware
│   └── db.ts        # Database configuration
├── shared/          # Shared types and schemas
└── scripts/         # Utility scripts
```

### Naming Conventions
- **Files**: Use kebab-case for file names (`user-profile.tsx`)
- **Components**: Use PascalCase (`UserProfile`)
- **Functions**: Use camelCase (`getUserProfile`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Database**: Use snake_case for table/column names

## 🔧 Making Changes

### Before You Start
1. Check existing issues to avoid duplicate work
2. Create an issue to discuss major changes
3. Fork the repository and create a feature branch

### Development Workflow
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run check        # Type checking
   npm run build        # Build test
   npm run dev          # Manual testing
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add user profile management"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format
Use conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
- `feat: add product search functionality`
- `fix: resolve image upload issue`
- `docs: update deployment guide`

## 🧪 Testing

### Running Tests
```bash
# Type checking
npm run check

# Build test
npm run build

# Manual testing
npm run dev
```

### Writing Tests
- Add unit tests for utility functions
- Test API endpoints with proper error cases
- Test React components with user interactions
- Include edge cases and error scenarios

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for functions and classes
- Document complex algorithms or business logic
- Include examples for utility functions

### README Updates
- Update README.md for new features
- Add new environment variables to .env.example
- Update deployment instructions if needed

## 🐛 Bug Reports

### Before Reporting
1. Check existing issues
2. Try to reproduce the bug
3. Test with the latest version

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. iOS]
- Browser [e.g. chrome, safari]
- Version [e.g. 22]
```

## 💡 Feature Requests

### Before Requesting
1. Check if the feature already exists
2. Search existing feature requests
3. Consider if it fits the project scope

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions you've considered.

**Additional context**
Any other context or screenshots.
```

## 🔍 Code Review Process

### For Contributors
- Ensure your PR has a clear description
- Link related issues
- Add screenshots for UI changes
- Respond to review feedback promptly

### Review Criteria
- Code quality and style
- Test coverage
- Documentation updates
- Performance impact
- Security considerations

## 🚀 Release Process

### Versioning
We use semantic versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Release Steps
1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to production

## 📞 Getting Help

### Communication Channels
- **Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Email**: For security issues or private matters

### Response Times
- Bug reports: 1-3 days
- Feature requests: 1-7 days
- Security issues: 24 hours

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone.

### Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community

### Enforcement
Instances of abusive behavior may be reported to the project maintainers.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to VMake Product Catalog! 🎉
