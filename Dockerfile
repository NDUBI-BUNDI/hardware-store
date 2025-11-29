FROM php:8.1-apache

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Enable CORS headers
RUN echo "Header set Access-Control-Allow-Origin \"*\"" >> /etc/apache2/apache2.conf
RUN echo "Header set Access-Control-Allow-Methods \"GET, POST, PUT, DELETE, OPTIONS\"" >> /etc/apache2/apache2.conf
RUN echo "Header set Access-Control-Allow-Headers \"Content-Type, Authorization\"" >> /etc/apache2/apache2.conf

# Install curl for M-Pesa integration
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /var/www/html

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
