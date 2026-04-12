# Deployment

Get FieldOpt running in production.

---

## AWS EC2 Deployment

### Prerequisites

- AWS account with EC2 access
- Ubuntu 24.04 LTS instance (t3.small minimum, t3.medium recommended)
- Security group with ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
- Domain name (e.g., demo.fieldopt.dev)
- ~20GB storage for logs and database

### Step 1: Connect & Update System

```bash
ssh -i your-key.pem ubuntu@your-instance-ip

# Update packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget
```

### Step 2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Verify
docker --version
```

Log out and back in for docker group to take effect.

### Step 3: Clone Repository

```bash
git clone https://github.com/zblauser/fieldopt.git
cd fieldopt
```

### Step 4: Build Frontend

```bash
# Install Node
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build
npm install --prefix frontend
npm run build --prefix frontend
```

### Step 5: Start Services with Docker Compose

```bash
# Build and start
docker compose up -d

# Check status
docker compose ps

# Seed database
docker compose exec backend python -m backend.database.reset_db
```

Services running:
- **PostgreSQL** — Port 5432
- **FastAPI Backend** — Port 8000
- **Nginx** — Ports 80, 443

### Step 6: Configure DNS

Point your domain to the EC2 instance:

1. Go to your DNS provider (IONOS, Route53, etc.)
2. Create A record: `demo.fieldopt.dev` → `your-instance-ip`
3. Wait 5-10 minutes for DNS to propagate

Test:
```bash
nslookup demo.fieldopt.dev
```

Should return your EC2 IP.

### Step 7: SSL Certificate

```bash
# Stop nginx temporarily
docker compose stop nginx

# Get certificate from Let's Encrypt
sudo certbot certonly --standalone \
  -d demo.fieldopt.dev \
  -d www.demo.fieldopt.dev \
  --email your-email@example.com \
  --agree-tos --no-eff-email

# Verify
sudo ls /etc/letsencrypt/live/demo.fieldopt.dev/

# Restart nginx
docker compose start nginx
```

Nginx automatically redirects HTTP to HTTPS.

### Step 8: Verify It's Working

```bash
# Test HTTP → HTTPS redirect
curl -I http://demo.fieldopt.dev
# Should return 301 redirect to HTTPS

# Test HTTPS
curl -I https://demo.fieldopt.dev
# Should return 200 OK

# Test API
curl https://demo.fieldopt.dev/api/v1/technicians/
```

---

## Docker Compose Configuration

The `docker-compose.yml` includes:

- **PostgreSQL** — Database (port 5432)
- **FastAPI Backend** — API server (port 8000)
- **Nginx** — Reverse proxy (ports 80, 443)
- **PGAdmin** — Database admin (port 5050, dev only)

### Local Development

```bash
docker compose up
```

### Production

```bash
# Use production config
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f backend
docker compose logs -f nginx
```

---

## Environment Variables

### Backend

Create `.env` in project root:

```env
DATABASE_URL=postgresql+asyncpg://fieldopt:fieldopt@postgres:5432/fieldopt
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=false
CORS_ORIGINS=["https://demo.fieldopt.dev","https://www.demo.fieldopt.dev"]
LOG_LEVEL=INFO
DEBUG=false
```

### Database

Set in `docker-compose.yml`:

```yaml
environment:
  POSTGRES_USER: fieldopt
  POSTGRES_PASSWORD: <secure-password>
  POSTGRES_DB: fieldopt
```

**⚠️ IMPORTANT:** Change the default password in production!

---

## Maintenance

### View Logs

```bash
# Backend
docker compose logs -f backend

# Nginx
docker compose logs -f nginx

# All
docker compose logs -f
```

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U fieldopt fieldopt > backup.sql

# Restore
docker compose exec -T postgres psql -U fieldopt fieldopt < backup.sql
```

### Restart Services

```bash
# Single service
docker compose restart backend

# All services
docker compose restart

# Full restart
docker compose down
docker compose up -d
```

### Update Code

```bash
# Pull latest
git pull origin main

# Rebuild
docker compose build

# Restart
docker compose up -d
```

### Reset Database

```bash
# Careful! This deletes all data
docker compose exec backend python -m backend.database.reset_db --empty

# Then reseed
docker compose exec backend python -m backend.database.reset_db
```

---

## Monitoring

### Health Checks

All services have health checks configured:

```bash
# Check service health
docker compose ps

# All should show "healthy" after 30-60 seconds
```

### Storage Monitoring

```bash
# Check disk usage
df -h

# Check database size
docker compose exec postgres du -sh /var/lib/postgresql/data
```

### Memory & CPU

```bash
# Real-time monitoring
docker stats
```

Nginx should use <100MB, backend <500MB, postgres <1GB (varies by data)

---

## Scaling Considerations

### Current Setup
- Single EC2 instance handles 100-200 techs, 500+ jobs/day
- PostgreSQL single instance (backup recommended)

### Upgrade Path
1. t3.small → t3.medium (more RAM/CPU)
2. Add Redis for caching (v0.0.8)
3. Database read replicas for analytics
4. Multiple backend instances with load balancer

---

## Security Checklist

- [ ] Change PostgreSQL password
- [ ] Enable automatic backups
- [ ] Set up log rotation
- [ ] Configure firewall rules
- [ ] Use strong SSL certificates
- [ ] Monitor disk space
- [ ] Enable authentication (v0.0.9)
- [ ] Set up monitoring alerts

---

## Troubleshooting

### "Connection refused" to database
```bash
# Check if postgres is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Restart
docker compose restart postgres
```

### High memory usage
```bash
# Check what's using memory
docker stats

# Clean up unused images/containers
docker system prune
```

### SSL certificate issues
```bash
# Check certificate validity
sudo certbot certificates

# Renew if needed
sudo certbot renew

# Check nginx config
sudo nginx -t
```

### 502 Bad Gateway from Nginx
```bash
# Check backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Check nginx config
docker compose logs nginx
```

---

## Next Steps

- [Set up monitoring](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring_ec2.html)
- [Configure auto-scaling](https://docs.aws.amazon.com/autoscaling/)
- [Set up RDS for managed database](https://docs.aws.amazon.com/rds/)
- [Use Route53 for DNS](https://docs.aws.amazon.com/route53/)
