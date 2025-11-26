from flask import Flask, render_template, request, jsonify
import main
import os

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chatbot_response():
    data = request.get_json()
    msg = data.get("msg")
    
    # Get response from main.py
    response_text, image_path, video_path, suggestions = main.get_response(msg)
    
    # --- FIX IMAGE PATH ---
    final_image_url = None
    if image_path:
        clean_path = image_path.replace("\\", "/")
        if not clean_path.startswith("static/"):
             clean_path = f"static/{clean_path}"
        final_image_url = f"/{clean_path}"

    # --- FIX VIDEO PATH (SMART CHECK) ---
    final_video_url = None
    if video_path:
        # Clean the path input
        filename = video_path.replace("\\", "/")
        if filename.startswith("static/"):
            filename = filename.replace("static/", "", 1)
        
        # We check two locations:
        # 1. Directly in static/ (e.g., static/leave_apply.mp4)
        # 2. In static/videos/ (e.g., static/videos/leave_apply.mp4)
        
        found_url = None
        
        # Check Option 1: Direct
        path_direct = os.path.join(app.static_folder, filename)
        # Check Option 2: Inside videos/ folder
        path_videos = os.path.join(app.static_folder, "videos", filename)

        if os.path.exists(path_direct):
            found_url = f"/static/{filename}"
            print(f"Video found at root: {found_url}")
        elif os.path.exists(path_videos):
            found_url = f"/static/videos/{filename}"
            print(f"Video found in subfolder: {found_url}")
        else:
            print(f"ERROR: Video NOT found. Checked: \n1. {path_direct}\n2. {path_videos}")
            # Fallback (send generic path so we see the error in browser)
            found_url = f"/static/{filename}"

        final_video_url = found_url

    return jsonify({
        "response": response_text, 
        "image": final_image_url,
        "video": final_video_url,
        "suggestions": suggestions
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)