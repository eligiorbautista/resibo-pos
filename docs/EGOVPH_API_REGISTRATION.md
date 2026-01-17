# eGovPH API Registration Guide

## Overview
To integrate with eGovPH for PWD and Senior Citizen verification, you need to register as a partner with the Department of Information and Communications Technology (DICT).

## Step-by-Step Registration Process

### 1. Visit the eGovPH Developers Portal
- **Official URL**: https://e.gov.ph/developers
- This is the main portal for API documentation and registration

### 2. Review API Documentation
- **eGov Partners API**: https://e.gov.ph/developers/egov-partners-api
- **eGov App SSO API**: Available on the developers portal
- Familiarize yourself with the available APIs and their functionalities

### 3. Register as a Partner
To access the APIs, you must become an authorized agency partner. The registration process typically requires:

- **Organization Details**:
  - Business name
  - Business registration number (SEC/DTI)
  - Business address
  - Contact information
  
- **Intended Use**:
  - Purpose of API integration (e.g., "PWD and Senior Citizen discount verification for POS system")
  - Expected volume/usage
  - Integration timeline

- **Technical Contact**:
  - Developer/technical contact person
  - Email address
  - Phone number

### 4. Submit Application
- Complete the registration form on the developers portal
- Provide all required documentation
- Wait for DICT review and approval

### 5. Obtain API Credentials
Upon approval, you will receive:
- **Partner Code** (`partner_code`)
- **Partner Secret** (`partner_secret`)
- **API Base URL**: `https://oauth.e.gov.ph/api`
- **Documentation** for specific endpoints

### 6. Generate Access Tokens
Use your credentials to generate access tokens:

```bash
POST https://oauth.e.gov.ph/api/token
Content-Type: application/x-www-form-urlencoded

partner_code=YOUR_PARTNER_CODE
partner_secret=YOUR_PARTNER_SECRET
scope=SSO_AUTHENTICATION
exchange_code=YOUR_EXCHANGE_CODE
```

## Important Notes

### Current Status
⚠️ **As of 2024**: The PWD and Senior Citizen verification API through e-KYC is still under development by DICT. The eGovPH Super App integration is planned but not yet publicly available.

### What's Available Now
- eGov App SSO API
- eGov Partners API (for general government services)
- Basic authentication and token management

### What's Coming Soon
- e-KYC facility for PWD/Senior Citizen verification
- Direct integration with DSWD (PWD) and OSCA (Senior Citizen) databases
- Real-time ID verification

## Contact Information

### eGovPH Support
- **Email**: [email protected]
- **Website**: https://e.gov.ph
- **Developers Portal**: https://e.gov.ph/developers

### DICT Contact
- **Department**: Department of Information and Communications Technology (DICT)
- **Website**: https://dict.gov.ph

## Alternative: Manual Verification
While waiting for the official API, businesses are encouraged to:
1. Accept valid physical ID cards
2. Implement internal verification systems
3. Maintain audit trails of verified IDs
4. Train staff to recognize valid IDs

## Next Steps
1. ✅ Register on eGovPH Developers Portal
2. ✅ Submit partner application
3. ✅ Wait for approval and credentials
4. ✅ Monitor for PWD/Senior Citizen API availability
5. ✅ Update your system when API becomes available

## Environment Variables Setup

Once you receive your credentials, add them to your `.env` file:

```env
# eGovPH API Configuration
REACT_APP_GOV_API_BASE_URL=https://oauth.e.gov.ph/api
REACT_APP_GOV_PARTNER_CODE=your_partner_code_here
REACT_APP_GOV_PARTNER_SECRET=your_partner_secret_here

# Optional: For specific endpoints when available
REACT_APP_GOV_PWD_ENDPOINT=/pwd/verify
REACT_APP_GOV_SENIOR_ENDPOINT=/senior-citizen/verify
```

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all credentials**
3. **Rotate secrets regularly**
4. **Implement rate limiting**
5. **Log API usage for audit purposes**
6. **Handle API errors gracefully**

## Resources

- [eGovPH Official Website](https://e.gov.ph)
- [eGovPH Developers Portal](https://e.gov.ph/developers)
- [eGov Partners API Documentation](https://e.gov.ph/developers/egov-partners-api)
- [DICT Official Website](https://dict.gov.ph)

