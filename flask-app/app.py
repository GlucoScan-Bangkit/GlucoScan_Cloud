import os
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
import cv2
from werkzeug.utils import secure_filename
from tensorflow.keras.preprocessing import image
from datetime import datetime
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import firebase_admin
from firebase_admin import credentials, firestore
from paddleocr import PaddleOCR

# Secret key untuk JWT
SECRET_KEY = "U2FsdGVkX1/deHDJ8pCXdW64eUSYWclJDXhGKzlmqKo="

# Inisialisasi Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Inisialisasi Firestore
db = firestore.client()

# Inisialisasi Flask dan OCR
IMG_WIDTH = 224
IMG_HEIGHT = 224
UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Memuat model
loaded_model = tf.keras.models.load_model('final_nutrition_model_ML.h5')
ocr = PaddleOCR(use_angle_cls=True, lang='id')

# Fungsi untuk cek ekstensi file gambar
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Fungsi untuk decode dan validasi JWT
def decode_jwt(token):
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded_token.get("id")  # Ambil UID dari payload
    except ExpiredSignatureError:
        print("Token expired")
        return None
    except InvalidTokenError as e:
        print(f"Invalid token: {e}")
        return None
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None

# Fungsi untuk deteksi kandungan gula
def detect_nutrition_facts(image_path, model):
    img = cv2.imread(image_path)
    if img is None:
        return None, 0.0, None, None

    img_orig = img.copy()

    # Preprocessing gambar
    gray = cv2.cvtColor(img_orig, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    blurred = cv2.bilateralFilter(enhanced, 9, 75, 75)
    binary = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15,
        2
    )

    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    nutrition_box = None
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) == 4:
            (x, y, w, h) = cv2.boundingRect(approx)
            aspect_ratio = w / float(h)
            area_ratio = (w * h) / (img.shape[0] * img.shape[1])

            if 0.4 <= aspect_ratio <= 2.5 and 0.05 <= area_ratio <= 0.9:
                nutrition_box = approx
                break

    if nutrition_box is not None:
        cv2.drawContours(img_orig, [nutrition_box], -1, (0, 255, 0), 2)

        mask = np.zeros(gray.shape, dtype=np.uint8)
        cv2.drawContours(mask, [nutrition_box], -1, (255), -1)
        result = cv2.bitwise_and(img_orig, img_orig, mask=mask)

        result = cv2.resize(result, (IMG_WIDTH, IMG_HEIGHT))
        result = result / 255.0
        result = np.expand_dims(result, axis=0)

        prediction = model.predict(result)
        class_index = np.argmax(prediction, axis=1)[0]
        confidence = prediction[0][class_index]

        predicted_class = 'Nutrition Fact' if class_index == 1 else 'Non Nutrition Fact'

        return img_orig, confidence, predicted_class, nutrition_box

    return img_orig, 0.0, None, None

# Fungsi untuk crop gambar
def crop_nutrition_facts(image_path, contour):
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Image could not be loaded.")
        return None

    x, y, w, h = cv2.boundingRect(contour)
    cropped_image = img[y:y+h, x:x+w]

    return cropped_image

# Endpoint untuk prediksi
@app.route('/predict', methods=['POST'])
def predict():
    # Ambil token dari header
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": True, "message": "Token not provided"}), 401

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        return jsonify({"error": True, "message": "Invalid Authorization header"}), 400

    # Decode token untuk mendapatkan UID
    uid = decode_jwt(token)
    if not uid:
        return jsonify({"error": True, "message": "Invalid or expired token"}), 401

    # Verifikasi file gambar
    if 'file' not in request.files:
        return jsonify({"error": True, "message": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": True, "message": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        result_image, confidence, predicted_class, contour = detect_nutrition_facts(filepath, loaded_model)

        cropped_image = None
        if contour is not None:
            cropped_image = crop_nutrition_facts(filepath, contour)

            cropped_filename = 'cropped_' + filename
            cropped_filepath = os.path.join(app.config['UPLOAD_FOLDER'], cropped_filename)
            cv2.imwrite(cropped_filepath, cropped_image)

            results = ocr.ocr(cropped_filepath, cls=True)
            kandungan_gula = []
            for i, line in enumerate(results[0]):
                text = line[1][0]
                if "Gula" in text or "gula" in text:
                    if i + 1 < len(results[0]):
                        next_text = results[0][i + 1][1][0]
                        if "g" in next_text and any(char.isdigit() for char in next_text):
                            angka = ''.join(char for char in next_text if char.isdigit() or char == '.')  # Ambil hanya angka dan titik
                            if angka:  # Pastikan angka tidak kosong
                                try:
                                    kandungan_gula.append(float(angka))
                                except ValueError:
                                    print(f"Unable to convert {angka} to float.")

             # Buat timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Gunakan timestamp sebagai document ID
            doc_id = timestamp.replace(" ", "_").replace(":", "-")

            # Data untuk disimpan ke Firestore
            data = {
                'kandungan_gula': kandungan_gula,
                'error': False,
                'timestamp': timestamp
            }

            try:
                # Simpan data ke sub-koleksi 'scan' dalam koleksi 'users' dengan ID dokumen berdasarkan timestamp
                db.collection('users').document(uid).collection('scan').document(doc_id).set(data)
                print("Data saved to Firestore successfully!")

                # Output JSON sesuai format yang diminta
                response_data = {
                    "data": {
                        "scan_date": timestamp,
                        "sugar_content": kandungan_gula[0] if kandungan_gula else "Not detected"
                    },
                    "error": False,
                    "message": "Scan data saved in Firebase"
                }
                return jsonify(response_data)

            except Exception as e:
                print(f"Error saving data: {str(e)}")
                # Jika ada error dalam menyimpan data ke Firestore
                error_data = {
                    'kandungan_gula': [],
                    'error': True,
                    'timestamp': timestamp
                }

                # Simpan error data ke Firestore
                db.collection('users').document(user_id).collection('scan').document(doc_id).set(error_data)

                # Response error
                return jsonify({
                    "error": True,
                    "message": "Scan data not saved"
                }), 500

        return jsonify({'error': 'No nutrition fact detected in the image'}), 400

    return jsonify({'error': 'Invalid file format'}), 400

# Endpoint untuk menghapus hasil scan berdasarkan timestamp
@app.route('/delete_scan', methods=['DELETE'])
def delete_scan():
    # Ambil token dari header
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": True, "message": "Token not provided"}), 401

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        return jsonify({"error": True, "message": "Invalid Authorization header"}), 400

    # Decode token untuk mendapatkan UID
    uid = decode_jwt(token)
    if not uid:
        return jsonify({"error": True, "message": "Invalid or expired token"}), 401

    # Ambil timestamp dari request body
    data = request.get_json()
    if not data or 'timestamp' not in data:
        return jsonify({"error": True, "message": "Missing timestamp in request"}), 400

    timestamp = data['timestamp']
    try:
        doc_ref = db.collection('users').document(uid).collection('scan').document(timestamp)
        doc_ref.delete()
        return jsonify({"error": False, "message": "Data deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting data: {e}")
        return jsonify({"error": True, "message": "Error deleting data"}), 500

@app.route('/get_history', methods=['GET'])
def get_history():
    # Ambil token dari header
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": True, "message": "Token not provided"}), 401

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        return jsonify({"error": True, "message": "Invalid Authorization header"}), 400

    # Decode token untuk mendapatkan UID
    uid = decode_jwt(token)
    if not uid:
        return jsonify({"error": True, "message": "Invalid or expired token"}), 401

    # Ambil tanggal dari query parameter untuk filter
    date_filter = request.args.get('date')  # Format: YYYY-MM-DD
    if not date_filter:
        return jsonify({"error": True, "message": "Missing date filter"}), 400

    try:
        # Query dokumen berdasarkan UID dan filter tanggal
        scan_collection = db.collection('users').document(uid).collection('scan')
        query = scan_collection.where('timestamp', '>=', f"{date_filter} 00:00:00").where('timestamp', '<=', f"{date_filter} 23:59:59")
        results = query.stream()

        # Simpan hasil ke dalam list
        history = []
        for doc in results:
            history.append(doc.to_dict())

        # Jika tidak ada hasil
        if not history:
            return jsonify({"error": False, "message": "No data found for the given date", "data": []}), 200

        return jsonify({"error": False, "message": "History retrieved successfully", "data": history}), 200

    except Exception as e:
        print(f"Error retrieving history: {e}")
        return jsonify({"error": True, "message": "Error retrieving history"}), 500



# Jalankan aplikasi
if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(debug=True, host='0.0.0.0', port=8080)

