# Gunakan base image Python
FROM python:3.8-slim

# Set direktori kerja dalam container
WORKDIR /app

# Salin file aplikasi ke dalam container
COPY . .

# Install virtualenv
RUN python -m pip install --upgrade pip && \
    pip install virtualenv && \
    virtualenv venv

# Aktifkan virtual environment dan install dependencies
RUN . venv/bin/activate && pip install -r requirements.txt

# Set environment variables untuk Flask
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=5000

# Expose port untuk Flask
EXPOSE 5000

# Perintah untuk menjalankan aplikasi
CMD ["bash", "-c", ". venv/bin/activate && flask run"]
