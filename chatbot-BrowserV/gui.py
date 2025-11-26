import tkinter as tk
from tkinter import scrolledtext
import threading
import main
import webbrowser
import re
from PIL import Image, ImageTk 

# GUI Colors & Fonts
BG_GRAY = "#ABB2B9"
BG_COLOR = "#17202A"
TEXT_COLOR = "#EAECEE"
FONT = "Helvetica 14"
FONT_BOLD = "Helvetica 13 bold"
HYPERLINK_COLOR = "#3498DB"

class ChatApplication:
    def __init__(self):
        self.window = tk.Tk()
        self._setup_main_window()
        self.images = [] # List to keep references to images
        
    def run(self):
        self.window.mainloop()
        
    def _setup_main_window(self):
        self.window.title("AI Chatbot")
        self.window.resizable(width=False, height=False)
        self.window.configure(width=500, height=600, bg=BG_COLOR)
        
        # Head Label
        head_label = tk.Label(self.window, bg=BG_COLOR, fg=TEXT_COLOR,
                              text="Chat Assistant", font=FONT_BOLD, pady=10)
        head_label.place(relwidth=1)
        
        # Divider
        line = tk.Label(self.window, width=450, bg=BG_GRAY)
        line.place(relwidth=1, rely=0.07, relheight=0.012)
        
        # Text Widget
        self.text_widget = scrolledtext.ScrolledText(self.window, width=20, height=2,
                                                     bg=BG_COLOR, fg=TEXT_COLOR,
                                                     font=FONT, padx=5, pady=5)
        self.text_widget.place(relheight=0.745, relwidth=1, rely=0.08)
        self.text_widget.configure(cursor="arrow", state=tk.DISABLED)
        
        # Link Config
        self.text_widget.tag_config("hyperlink", foreground=HYPERLINK_COLOR, underline=1)
        self.text_widget.tag_bind("hyperlink", "<Enter>", lambda e: self.text_widget.config(cursor="hand2"))
        self.text_widget.tag_bind("hyperlink", "<Leave>", lambda e: self.text_widget.config(cursor="arrow"))
        self.text_widget.tag_bind("hyperlink", "<Button-1>", self._open_url)

        # Scrollbar
        scrollbar = tk.Scrollbar(self.text_widget)
        scrollbar.place(relheight=1, relx=0.974)
        scrollbar.configure(command=self.text_widget.yview)
        
        # Bottom Label
        bottom_label = tk.Label(self.window, bg=BG_GRAY, height=80)
        bottom_label.place(relwidth=1, rely=0.825)
        
        # Message Entry
        self.msg_entry = tk.Entry(bottom_label, bg="#2C3E50", fg=TEXT_COLOR, font=FONT)
        self.msg_entry.place(relwidth=0.74, relheight=0.06, rely=0.008, relx=0.011)
        self.msg_entry.focus()
        self.msg_entry.bind("<Return>", self._on_enter_pressed)
        
        # Send Button
        send_button = tk.Button(bottom_label, text="Send", font=FONT_BOLD, width=20, bg=BG_GRAY,
                                command=lambda: self._on_enter_pressed(None))
        send_button.place(relx=0.77, rely=0.008, relheight=0.06, relwidth=0.22)

    def _on_enter_pressed(self, event):
        msg = self.msg_entry.get()
        self._insert_message(msg, "You")
        
    def _insert_message(self, msg, sender):
        if not msg:
            return
        
        self.msg_entry.delete(0, tk.END)
        
        msg1 = f"{sender}: {msg}\n\n"
        self.text_widget.configure(state=tk.NORMAL)
        self.text_widget.insert(tk.END, msg1)
        self._highlight_urls()
        self.text_widget.configure(state=tk.DISABLED)
        
        threading.Thread(target=self._get_bot_response, args=(msg,)).start()
        
    def _get_bot_response(self, msg):
        response_text, image_path = main.get_response(msg)
        
        msg2 = f"Bot: {response_text}\n\n"
        
        self.text_widget.configure(state=tk.NORMAL)
        self.text_widget.insert(tk.END, msg2)
        self._highlight_urls()
        
        # --- UPDATED: CLICKABLE IMAGE LOGIC ---
        if image_path:
            try:
                # 1. Load and Resize for Preview (Thumbnail)
                img = Image.open(image_path)
                base_width = 250 # Smaller preview in chat
                w_percent = (base_width / float(img.size[0]))
                h_size = int((float(img.size[1]) * float(w_percent)))
                img_resized = img.resize((base_width, h_size), Image.Resampling.LANCZOS)
                
                photo = ImageTk.PhotoImage(img_resized)
                
                # 2. Create a Clickable Label (Acts like a button inside the text)
                # We bind the image_path to this specific label
                img_label = tk.Label(self.text_widget, image=photo, bg=BG_COLOR, cursor="hand2")
                img_label.image = photo # Keep reference
                
                # Bind Left Click to the Popup Function
                img_label.bind("<Button-1>", lambda e, path=image_path: self._show_full_image(path))
                
                # 3. Insert the Label into the Text Widget
                self.text_widget.window_create(tk.END, window=img_label)
                self.text_widget.insert(tk.END)
                
                self.images.append(photo) # Keep reference so it doesn't vanish
                
            except Exception as e:
                print(f"Could not load image: {e}")
                self.text_widget.insert(tk.END, "[Image could not be loaded]\n\n")
        # --------------------------------------

        self.text_widget.configure(state=tk.DISABLED)
        self.text_widget.see(tk.END)

    def _show_full_image(self, image_path):
        """Opens a new window with the full-size image"""
        try:
            top = tk.Toplevel(self.window)
            top.title("Image Viewer")
            top.configure(bg="#202020")
            
            # Load the full original image
            img = Image.open(image_path)
            
            # Optional: If image is huge (bigger than screen), resize it slightly
            # But usually you want original quality here
            if img.width > 1000 or img.height > 800:
                img.thumbnail((1000, 800))
                
            photo = ImageTk.PhotoImage(img)
            
            # Display in a Label
            label = tk.Label(top, image=photo, bg="#202020")
            label.image = photo # Keep reference
            label.pack(padx=10, pady=10)
            
        except Exception as e:
            print(f"Error opening full image: {e}")

    def _highlight_urls(self):
        url_pattern = r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*"
        start_pos = "1.0"
        while True:
            pos = self.text_widget.search(url_pattern, start_pos, stopindex=tk.END, regexp=True)
            if not pos: break
            text_after = self.text_widget.get(pos, tk.END)
            match = re.match(url_pattern, text_after)
            if match:
                match_len = len(match.group(0))
                end_pos = f"{pos}+{match_len}c"
                self.text_widget.tag_add("hyperlink", pos, end_pos)
                start_pos = end_pos
            else: break

    def _open_url(self, event):
        click_index = self.text_widget.index(f"@{event.x},{event.y}")
        tag_ranges = self.text_widget.tag_ranges("hyperlink")
        for start, end in zip(tag_ranges[0::2], tag_ranges[1::2]):
            if self.text_widget.compare(start, "<=", click_index) and \
               self.text_widget.compare(click_index, "<", end):
                url = self.text_widget.get(start, end)
                webbrowser.open(url)
                return

if __name__ == "__main__":
    app = ChatApplication()
    app.run()