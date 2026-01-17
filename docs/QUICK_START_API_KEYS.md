# Quick Start: Getting eGovPH API Keys

## 🚀 Quick Steps

### 1. Visit eGovPH Developers Portal
**URL**: https://e.gov.ph/developers

### 2. Register as a Partner
- Click on "Register" or "Become a Partner"
- Fill out the registration form with your business details
- Submit your application

### 3. Wait for Approval
- DICT will review your application
- You'll receive an email with your credentials

### 4. Get Your Credentials
After approval, you'll receive:
- **Partner Code** (`partner_code`)
- **Partner Secret** (`partner_secret`)

### 5. Configure Your App
Add to your `.env` file:
```env
REACT_APP_GOV_API_BASE_URL=https://oauth.e.gov.ph/api
REACT_APP_GOV_PARTNER_CODE=your_partner_code_here
REACT_APP_GOV_PARTNER_SECRET=your_partner_secret_here
```

## 📞 Need Help?

- **Email**: [email protected]
- **Portal**: https://e.gov.ph/developers
- **Full Guide**: See `docs/EGOVPH_API_REGISTRATION.md`

## ⚠️ Important Note

The PWD/Senior Citizen verification endpoints are still under development. Register now to be ready when they become available!

