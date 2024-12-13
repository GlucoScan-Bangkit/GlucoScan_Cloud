# Gunakan base image Python
FROM python:3.11.5

# Set working directory dalam container
WORKDIR /app

# Salin semua file ke container
COPY . .

# Buat folder uploads/ untuk penyimpanan sementara
RUN mkdir -p /app/uploads

# Install dependencies sistem yang diperlukan
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Buat virtual environment dan instal dependencies di dalamnya
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --upgrade pip && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Expose port Flask
EXPOSE 8080

# Perintah untuk menjalankan aplikasi dengan virtual environment
CMD ["/app/venv/bin/python", "app.py"]

