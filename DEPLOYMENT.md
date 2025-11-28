# KLE Mentor System - Deployment Guide

## 🚀 Deployment Checklist

### ✅ Pre-Deployment Status
- [x] Server builds successfully (`npm run build` in /server)
- [x] Client builds successfully (`npm run build` in /client)
- [x] Git repository initialized
- [x] Environment variables configured
- [x] `.gitignore` properly configured

---

## 📦 Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

#### Step 1: Push to GitHub
```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/kle-mentor-system.git
git branch -M main
git push -u origin main
```

#### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and create services

#### Step 3: Configure Environment Variables on Render
For **kle-mentor-api** (Backend):
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `CLERK_PUBLISHABLE_KEY`: From Clerk dashboard
- `CLERK_SECRET_KEY`: From Clerk dashboard
- `CLERK_WEBHOOK_SECRET`: From Clerk webhooks
- `CLOUDINARY_CLOUD_NAME`: From Cloudinary dashboard
- `CLOUDINARY_API_KEY`: From Cloudinary dashboard
- `CLOUDINARY_API_SECRET`: From Cloudinary dashboard
- `SMTP_HOST`: smtp.gmail.com
- `SMTP_PORT`: 587
- `SMTP_SECURE`: false
- `SMTP_USER`: Your email
- `SMTP_PASS`: App password
- `EMAIL_FROM`: "KLE Mentor System" <noreply@yourdomain.com>
- `CLIENT_URL`: https://kle-mentor-client.onrender.com

For **kle-mentor-client** (Frontend):
- `VITE_API_URL`: https://kle-mentor-api.onrender.com/api/v1
- `VITE_CLERK_PUBLISHABLE_KEY`: From Clerk dashboard

---

### Option 2: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:
```bash
cd client
npm i -g vercel
vercel
```

#### Backend on Railway:
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repository and set root directory to `/server`
4. Add environment variables

---

### Option 3: DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create App → GitHub repository
3. Configure both components (static site + web service)
4. Set environment variables

---

## 🔧 Required External Services

### 1. MongoDB Atlas (Database)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 Sandbox)
3. Create database user
4. Whitelist all IPs (0.0.0.0/0) for cloud deployment
5. Get connection string

### 2. Clerk (Authentication)
1. Go to [clerk.com](https://clerk.com)
2. Create application
3. Get API keys from dashboard
4. **Important**: Update allowed origins in Clerk to include your deployed URL

### 3. Cloudinary (Image Upload)
1. Go to [cloudinary.com](https://cloudinary.com)
2. Create free account
3. Get cloud name, API key, and API secret

### 4. Email (SMTP) - Optional
- Use Gmail with App Password, or
- SendGrid, Mailgun, etc.

---

## 📝 Post-Deployment Steps

### 1. Update Clerk Settings
- Add your production URL to allowed origins
- Update webhook URL to: `https://your-api-url.com/api/v1/auth/webhook`

### 2. Create Admin User
After deployment, create your admin account:
1. Sign up through the frontend
2. Access your MongoDB Atlas cluster
3. Find your user document and set:
   - `role: "admin"`
   - `isSuperAdmin: true`

### 3. Test the Application
- [ ] User registration/login works
- [ ] Admin dashboard accessible
- [ ] Mentor can see dashboard
- [ ] Student can see dashboard
- [ ] Real-time chat works
- [ ] Meetings can be scheduled
- [ ] Posts can be created

---

## 🔒 Security Recommendations

1. **Environment Variables**: Never commit .env files
2. **MongoDB**: Use strong passwords, enable authentication
3. **CORS**: Update CLIENT_URL to your actual domain
4. **HTTPS**: Ensure all production URLs use HTTPS
5. **Clerk**: Keep API keys secret

---

## 📊 Monitoring

- **Render**: Built-in logs and metrics
- **MongoDB Atlas**: Database monitoring
- **Clerk**: User analytics

---

## 🆘 Troubleshooting

### CORS Errors
- Ensure `CLIENT_URL` env var matches your frontend URL exactly

### Database Connection Issues
- Check MongoDB Atlas IP whitelist
- Verify connection string format

### Authentication Issues
- Verify Clerk keys are correct for environment
- Check webhook configuration

---

## 📞 Support

For deployment issues:
1. Check service logs
2. Verify environment variables
3. Test locally with production config

Good luck with your deployment! 🎉
