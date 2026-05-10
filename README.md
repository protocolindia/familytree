# వంశవృక్షం — Family Tree SaaS

Telugu & English family tree builder with AI, admin panel, Railway deployment.

## Project Structure
```
familytree/
├── backend/     Node.js + Express + Prisma (Tier 2)
├── frontend/    React + Vite              (Tier 1)
└── README.md
```

## Railway Environment Variables

### Backend
| Variable | Value |
|---|---|
| DATABASE_URL | Auto-linked from PostgreSQL plugin |
| JWT_SECRET | any long random string |
| ANTHROPIC_API_KEY | sk-ant-... |
| CLOUDINARY_CLOUD_NAME | from cloudinary.com |
| CLOUDINARY_API_KEY | from cloudinary.com |
| CLOUDINARY_API_SECRET | from cloudinary.com |

### Frontend
| Variable | Value |
|---|---|
| VITE_API_URL | https://your-backend.up.railway.app |
