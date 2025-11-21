from flask import Flask, render_template, request, jsonify
import main

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get", methods=["POST"])
def chatbot_response():
    msg = request.form["msg"]
    
    # Get response from main.py
    response_text, image_path = main.get_response(msg)
    
    # Correct image path for web (must start with 'static/')
    if image_path:
        if not image_path.startswith('static/'):
            # Assumes your JSON says "Img/leave.png" and folder is static/Img
            image_path = f"static/{image_path}"

    return jsonify({"response": response_text, "image": image_path})

if __name__ == "__main__":
    app.run(debug=True)