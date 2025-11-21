$(document).ready(function() {
    // --- Chat Logic ---
    $("#messageArea").on("submit", function(event) {
        event.preventDefault();
        const date = new Date();
        const str_time = date.getHours() + ":" + date.getMinutes();
        var rawText = $("#text").val();
        if(rawText.trim() === "") return;

        var userHtml = '<div class="d-flex justify-content-end mb-4"><div class="msg_cotainer msg_cotainer_send">' + rawText + '</div></div>';
        
        $("#text").val("");
        $("#messageFormeight").append(userHtml);
        scrollToBottom();

        $.ajax({
            data: { msg: rawText },
            type: "POST",
            url: "/get",
        }).done(function(data) {
            var botText = linkify(data.response);
            var botHtml = '<div class="d-flex justify-content-start mb-4"><div class="msg_cotainer msg_cotainer_receive">' + botText;
            
            // Check for Image
            if (data.image) {
                botHtml += '<br><img src="' + data.image + '" class="chat-img" onclick="openModal(this.src)" title="Click to Enlarge">';
            }
            
            botHtml += '</div></div>';
            $("#messageFormeight").append(botHtml);
            scrollToBottom();
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

// State Variables
let scale = 1;
let pointX = 0;
let pointY = 0;
let startX = 0;
let startY = 0;
let isDragging = false;

// 1. Open Modal
function openModal(src) {
    modal.style.display = "block";
    modalImg.src = src;
    resetZoom(); // Always start fresh
}

// 2. Close Modal
span.onclick = function() { modal.style.display = "none"; }
window.onclick = function(event) { if (event.target == modal) { modal.style.display = "none"; } }

// 3. Apply Logic
function setTransform() {
    modalImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function resetZoom() {
    scale = 1;
    pointX = 0;
    pointY = 0;
    setTransform();
}

// 4. Button Controls
function zoomIn() {
    scale += 0.2;
    setTransform();
}
function zoomOut() {
    if (scale > 0.4) { // Prevent inverting
        scale -= 0.2;
        setTransform();
    }
}

// 5. MOUSE WHEEL ZOOM
modalImg.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    // Standardize wheel direction
    var delta = (e.deltaY < 0) ? 1 : -1;
    
    if (delta > 0) {
        scale *= 1.1;
    } else {
        scale /= 1.1;
    }
    
    // Limit min scale
    if (scale < 0.5) scale = 0.5;
    
    setTransform();
});

// 6. DRAG TO PAN
modalImg.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    modalImg.style.cursor = "grabbing";
});

modalImg.addEventListener('mouseup', function(e) {
    isDragging = false;
    modalImg.style.cursor = "grab";
});

modalImg.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    e.preventDefault();
    pointX = e.clientX - startX;
    pointY = e.clientY - startY;
    setTransform();
});

// Prevent dragging image out of browser
modalImg.addEventListener('mouseleave', function() {
    isDragging = false;
    modalImg.style.cursor = "grab";
});