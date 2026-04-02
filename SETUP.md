# Vanilla — Setup Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 14+

## 1. Environment Variables
Edit `.env.local`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/vanilla_db"
JWT_SECRET="your-64-char-secret-here"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-password"
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxx"
```

Get your free Groq API key at: https://console.groq.com

## 2. Database Setup
```bash
# Create DB
createdb vanilla_db

# Push schema
npm run db:push

# Seed admin user + default rewards
npm run db:seed
```

## 3. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000 — you will be redirected to `/login`.

## 4. Login
Use the credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env.local`.

## 5. Production Deploy (AWS Ubuntu VPS)
```bash
npm run build
npm install -g pm2
pm2 start npm --name "vanilla" -- start
pm2 save
pm2 startup
```

## Usage Flow
1. **Weekly tab** → enter goals + tasks → AI generates your week
2. **Daily tab** → mark tasks done/missed, add proof
3. **Evaluation tab** → submit day → AI strictly evaluates you
4. **Overview** → see streak, score chart, reward progress
5. **Rewards** → track streak milestones

## AI Models Used
| Feature    | Model                      | Why               |
|------------|----------------------------|--------------------|
| Weekly plan| llama-3.3-70b-versatile    | High reasoning     |
| Daily eval | llama-3.1-8b-instant       | Fast + cheap       |
