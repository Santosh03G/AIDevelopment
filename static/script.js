$(document).ready(function() {
    
    // --- TOGGLE CHAT WIDGET ---
    $("#chat-toggle-btn").click(function() {
        $("#chat-box").fadeToggle(300);
    });
    $("#close-chat").click(function() {
        $("#chat-box").fadeOut(300);
    });

    // --- MESSAGE SUBMISSION ---
    $("#messageArea").on("submit", function(event) {
        event.preventDefault();
        var rawText = $("#text").val();
        if(rawText.trim() === "") return;

        // 1. Show User Message
        var userHtml = '<div class="d-flex justify-content-end mb-4"><div class="msg_cotainer msg_cotainer_send">' + rawText + '</div></div>';
        $("#text").val("");
        $("#messageFormeight").append(userHtml);
        scrollToBottom();

        // 2. Show Typing Animation (Dots + "Thinking..." Text)
        var typingHtml = '<div class="d-flex justify-content-start mb-4" id="typing-indicator">' +
                         '<div style="display: flex; flex-direction: column; align-items: flex-start;">' +
                             '<div class="typing_loader">' +
                                 '<div class="dot"></div><div class="dot"></div><div class="dot"></div>' +
                             '</div>' +
                             '<span class="typing_text">Thinking...</span>' + 
                         '</div>' +
                         '</div>';
        
        $("#messageFormeight").append(typingHtml);
        scrollToBottom();

        // 3. Request to Backend
        $.ajax({
            data: { msg: rawText },
            type: "POST",
            url: "/get",
        }).done(function(data) {
            
            // 4. Wait 2 Seconds (Animation delay)
            setTimeout(function() {
                $("#typing-indicator").remove();

                // Linkify the response text
                var botText = linkify(data.response);
                var botHtml = '<div class="d-flex justify-content-start mb-4"><div class="msg_cotainer msg_cotainer_receive">' + botText;
                
                // Add Image if present
                if (data.image) {
                    botHtml += '<br><img src="' + data.image + '" class="chat-img" onclick="openModal(this.src)" title="Click to Enlarge">';
                }
                
                botHtml += '</div></div>';
                $("#messageFormeight").append(botHtml);
                scrollToBottom();

            }, 2000); // 2000ms = 2 seconds
        });
    });

    function scrollToBottom() {
        var messageBody = document.getElementById("messageFormeight");
        messageBody.scrollTop = messageBody.scrollHeight;
    }

    function linkify(text) {
        var urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function(url) {
            return '<a href="' + url + '" target="_blank" style="color: #4db8ff; text-decoration: underline;">' + url + '</a>';
        });
    }
});

/* --- ZOOM & PAN LOGIC --- */
var modal = document.getElementById("imageModal");
var modalImg = document.getElementById("img01");
var span = document.getElementsByClassName("close")[0];

let scale = 1; let pointX = 0; let pointY = 0; let startX = 0; let startY = 0; let isDragging = false;

function openModal(src) { modal.style.display = "block"; modalImg.src = src; resetZoom(); }
span.onclick = function() { modal.style.display = "none"; }
window.onclick = function(event) { if (event.target == modal) { modal.style.display = "none"; } }

function setTransform() { modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`; }
function resetZoom() { scale = 1; pointX = 0; pointY = 0; setTransform(); }
function zoomIn() { scale += 0.2; setTransform(); }
function zoomOut() { if (scale > 0.4) { scale -= 0.2; setTransform(); } }

modalImg.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = (e.deltaY < 0) ? 1 : -1;
    if (delta > 0) { scale *= 1.1; } else { scale /= 1.1; }
    if (scale < 0.5) scale = 0.5;
    setTransform();
});

modalImg.addEventListener('mousedown', function(e) {
    e.preventDefault(); isDragging = true; startX = e.clientX - pointX; startY = e.clientY - pointY; modalImg.style.cursor = "grabbing";
});
modalImg.addEventListener('mouseup', function(e) { isDragging = false; modalImg.style.cursor = "grab"; });
modalImg.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    e.preventDefault(); pointX = e.clientX - startX; pointY = e.clientY - startY; setTransform();
});
modalImg.addEventListener('mouseleave', function() { isDragging = false; modalImg.style.cursor = "grab"; });