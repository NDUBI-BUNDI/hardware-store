# Hardware Store Management System
## DASHEL Enterprise

A complete web-based inventory and sales management system for hardware stores with M-Pesa payment integration.

---

## 📋 Features

### Dashboard
- Real-time sales statistics
- Profit calculations
- Inventory value tracking
- Low stock alerts
- Recent sales overview

### Sales Management
- Record new sales transactions
- Track inventory deductions
- View sales history with pagination
- Notes for each transaction

### Inventory Management
- Add/manage products
- Track buying and selling prices
- Profit margin calculations
- Reorder level alerts
- Supplier associations

### Supplier Management
- Maintain supplier database
- Track payment terms
- Contact information
- Products supplied

### M-Pesa Integration
- Send STK Push payment requests
- Track payment status
- View transaction history
- Callback handling

---

## 🏗️ Project Structure

```
hardware-store/
├── docker-compose.yml          # Docker composition
├── Dockerfile                  # PHP/Apache configuration
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
│
├── backend/
│   ├── api.php                 # Main API endpoints
│   ├── config.php              # Database & configuration
│   ├── callback.php            # M-Pesa callback handler
│   ├── database.sql            # Database schema
│   └── logs/                   # Application logs
│
└── frontend/
    ├── index.html              # Main HTML interface
    ├── app.js                  # JavaScript application logic
    └── styles.css              # Application styles
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git (optional)

### Installation

1. **Clone or download the project**
```bash
cd hardware-store
```

2. **Copy environment variables**
```bash
copy .env.example .env
```

3. **Build and start containers**
```bash
docker-compose up -d --build
```

4. **Access the application**
```
http://localhost:8080
```

The MySQL database will automatically initialize with sample data.

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=mysql
DB_PORT=3306
DB_NAME=hardware_store
DB_USER=root
DB_PASSWORD=root123

# M-Pesa (Update with your credentials)
MPESA_CONSUMER_KEY=YOUR_CONSUMER_KEY
MPESA_CONSUMER_SECRET=YOUR_CONSUMER_SECRET
MPESA_SHORTCODE=YOUR_SHORTCODE
MPESA_PASSKEY=YOUR_PASSKEY
MPESA_ENV=sandbox  # Change to 'production' for live

# Application
APP_URL=http://localhost:8080
APP_ENV=development
DEBUG=true
```

### M-Pesa Setup

1. Register for M-Pesa API credentials at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Generate Consumer Key and Consumer Secret
3. Get your Business Shortcode and Passkey
4. Update `.env` file with credentials
5. Change `MPESA_ENV` to `production` when ready

---

## 📊 Database Schema

### Tables

- **sales** - Sales transactions
- **inventory** - Product inventory
- **suppliers** - Supplier information
- **stk_pushes** - M-Pesa payment requests
- **users** - User authentication (future)
- **audit_logs** - System audit logs

---

## 🔌 API Endpoints

### Dashboard
```
GET /backend/api.php?endpoint=dashboard
```

### Sales
```
GET /backend/api.php?endpoint=sales
POST /backend/api.php?endpoint=sales
```

### Inventory
```
GET /backend/api.php?endpoint=inventory
POST /backend/api.php?endpoint=inventory
```

### Suppliers
```
GET /backend/api.php?endpoint=suppliers
POST /backend/api.php?endpoint=suppliers
```

### M-Pesa
```
POST /backend/api.php?endpoint=stk-push
GET /backend/api.php?endpoint=stk-history
```

---

## 📝 Sample API Requests

### Record a Sale
```bash
curl -X POST http://localhost:8080/backend/api.php?endpoint=sales \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Cement 50kg",
    "quantity": 5,
    "unit_price": 500,
    "sale_date": "2025-11-12",
    "notes": "Customer order"
  }'
```

### Add Product
```bash
curl -X POST http://localhost:8080/backend/api.php?endpoint=inventory \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Steel Bars",
    "quantity": 100,
    "buying_price": 800,
    "selling_price": 1000,
    "supplier_id": 1,
    "reorder_level": 30
  }'
```

### Send M-Pesa Payment Request
```bash
curl -X POST http://localhost:8080/backend/api.php?endpoint=stk-push \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 5000
  }'
```

---

## 🐳 Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f php
docker-compose logs -f mysql
```

### Access MySQL
```bash
docker exec -it hardware_db mysql -u root -p hardware_store
```

### Rebuild Images
```bash
docker-compose up -d --build
```

---

## 🔐 Security Considerations

1. Change default database password
2. Store M-Pesa credentials securely
3. Use HTTPS in production
4. Implement user authentication
5. Add input validation and sanitization
6. Set up rate limiting
7. Regular database backups
8. Monitor audit logs

---

## 🐛 Troubleshooting

### Database Connection Failed
- Ensure MySQL container is running: `docker-compose ps`
- Check `.env` file configuration
- Verify database credentials

### M-Pesa Integration Not Working
- Confirm API credentials in `.env`
- Check internet connectivity
- Review logs: `backend/logs/`
- Ensure callback URL is publicly accessible

### Port Already in Use
- Change ports in `docker-compose.yml`
- Or stop other services using those ports

### Permission Denied Errors
- Ensure proper file permissions
- Check Docker daemon is running

---

## 📧 Support & Maintenance

- Review logs regularly in `backend/logs/`
- Monitor database size
- Backup data regularly
- Update dependencies periodically
- Test M-Pesa integration regularly

---

## 📄 License

This project is proprietary to BOAZ NDUBI BINDI.

---

## 👥 Team

**BOAZ NDUBI**

---

## 📞 Contact

For support or inquiries, contact BOAZ NDUBI 
boazbundi1@gmail.com
+254112815454

---

## Version History

### v1.0.0 (2025-11-12)
- Initial release
- Dashboard with real-time stats
- Sales management
- Inventory management
- Supplier management
- M-Pesa STK Push integration
- Responsive UI design

---

**Last Updated:** November 12, 2025
