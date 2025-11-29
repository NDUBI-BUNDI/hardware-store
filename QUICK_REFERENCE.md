# QUICK REFERENCE CARD
## Hardware Store Management System - DASHEL Enterprise

---

## 🚀 QUICK START (60 SECONDS)

```bash
# 1. Navigate to project
cd d:\DASHEL\hardware-store

# 2. Start Docker (PowerShell)
docker-compose up -d --build

# 3. Wait 10 seconds for MySQL
Start-Sleep -Seconds 10

# 4. Open browser
Start http://localhost:8080
```

✅ **Done!** System is running

---

## 📍 KEY LOCATIONS

| What | Where |
|------|-------|
| **Web App** | http://localhost:8080 |
| **API Base** | http://localhost:8080/backend/api.php |
| **Database** | MySQL at localhost:3306 |
| **DB Creds** | User: root, Pass: root123 |
| **Source Code** | `d:\DASHEL\hardware-store` |

---

## 📄 KEY FILES

| File | Purpose |
|------|---------|
| `backend/api.php` | REST API endpoints |
| `frontend/index.html` | User interface |
| `frontend/app.js` | Application logic |
| `docker-compose.yml` | Docker setup |
| `backend/database.sql` | Database schema |

---

## 🔌 API QUICK REFERENCE

```bash
# Dashboard
curl http://localhost:8080/backend/api.php?endpoint=dashboard

# Sales (GET all)
curl http://localhost:8080/backend/api.php?endpoint=sales

# Sales (POST new)
curl -X POST http://localhost:8080/backend/api.php?endpoint=sales \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Test","quantity":1,"unit_price":100,"sale_date":"2025-11-12"}'

# Inventory
curl http://localhost:8080/backend/api.php?endpoint=inventory

# Suppliers
curl http://localhost:8080/backend/api.php?endpoint=suppliers

# M-Pesa History
curl http://localhost:8080/backend/api.php?endpoint=stk-history
```

---

## 🔧 DOCKER COMMANDS

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs -f php

# Stop services
docker-compose down

# Restart
docker-compose restart

# MySQL access
docker exec -it hardware_db mysql -u root -p hardware_store
```

---

## 📊 DATABASE QUICK QUERY

```bash
# Count sales
docker exec hardware_db mysql -u root -proot123 hardware_store -e "SELECT COUNT(*) FROM sales;"

# View inventory
docker exec hardware_db mysql -u root -proot123 hardware_store -e "SELECT * FROM inventory;"

# Check suppliers
docker exec hardware_db mysql -u root -proot123 hardware_store -e "SELECT * FROM suppliers;"
```

---

## 🎯 COMMON TASKS

### Add a Product
1. Go to **Inventory** tab
2. Fill form with product details
3. Click **Add Product**
4. Product appears in table

### Record a Sale
1. Go to **Sales** tab
2. Select product from dropdown
3. Enter quantity, price, date
4. Click **Record Sale**
5. Inventory automatically decreases

### Send M-Pesa Payment
1. Go to **M-Pesa STK Push** tab
2. Enter phone: 254712345678
3. Enter amount
4. Click **Send Payment Request**
5. View status in table

### Add Supplier
1. Go to **Suppliers** tab
2. Fill supplier form
3. Click **Add Supplier**
4. Supplier available for inventory items

---

## ⚙️ CONFIGURATION

### Environment Variables (`.env`)
```env
# Database
MYSQL_ROOT_PASSWORD=root123
MYSQL_DATABASE=hardware_store

# M-Pesa (update with your credentials)
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
```

---

## 📚 DOCUMENTATION

| Doc | For |
|-----|-----|
| `README.md` | Overview & setup |
| `API_DOCUMENTATION.md` | API details |
| `DEVELOPMENT.md` | Code development |
| `DEPLOYMENT.md` | Production setup |
| `TESTING.md` | QA procedures |
| `PROJECT_SUMMARY.md` | Full overview |

---

## 🐛 TROUBLESHOOTING

### Can't connect to http://localhost:8080
```bash
# Check containers are running
docker-compose ps

# View PHP logs
docker-compose logs php
```

### Database error
```bash
# Restart MySQL
docker-compose restart mysql

# Check database exists
docker exec hardware_db mysql -u root -proot123 -e "SHOW DATABASES;"
```

### M-Pesa not working
- Verify credentials in `.env`
- Check internet connection
- Review logs: `docker-compose logs php`

---

## 💡 TIPS

✅ **Always run from project directory:** `cd d:\DASHEL\hardware-store`

✅ **Use PowerShell for Docker commands** on Windows

✅ **Check Docker is running:** `docker --version`

✅ **Database auto-initializes** on first run

✅ **Sample data included** for testing

✅ **API available immediately** after containers start

---

## 🚨 IMPORTANT COMMANDS

```powershell
# Start everything
docker-compose up -d --build

# See everything
docker-compose ps

# Watch logs (Ctrl+C to stop)
docker-compose logs -f

# Stop everything
docker-compose down

# Full cleanup (careful!)
docker-compose down -v
```

---

## 📱 FEATURES AT A GLANCE

- 📊 Dashboard with live stats
- 💳 Sales transaction tracking
- 📦 Inventory management
- 🏭 Supplier management
- 💰 M-Pesa payment requests
- 🔍 Search functionality
- 📈 Profit calculations
- ⚠️ Low stock alerts

---

## 🔐 DEFAULT CREDENTIALS

| Service | User | Password |
|---------|------|----------|
| MySQL | root | root123 |
| M-Pesa | - | sandbox (change to production) |

⚠️ **Change credentials before production deployment**

---

## 📞 NEED HELP?

1. **Can't start?** → Check `README.md` "Quick Start"
2. **API question?** → Check `API_DOCUMENTATION.md`
3. **Code issue?** → Check `DEVELOPMENT.md`
4. **Deploy?** → Check `DEPLOYMENT.md`
5. **Testing?** → Check `TESTING.md`
6. **Full overview?** → Check `PROJECT_SUMMARY.md`

---

## ✅ YOU'RE ALL SET!

Everything is configured and ready to go.

**Next Step:** Run `docker-compose up -d` and start using the system!

---

**Hardware Store Management System**
**DASHEL Enterprise**
**Version 1.0.0**

Created: November 12, 2025
