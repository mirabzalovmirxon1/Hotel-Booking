# Python image
FROM python:3.11-slim

# Workdir
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Port
EXPOSE 8069

# Run server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8069"]