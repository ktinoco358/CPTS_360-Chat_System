// Store chats locally
let chats = {
    "Andres": [],
    "Karen": [],
    "Arni": []
};

let currentChat = "Andres";

// Switch chat
function selectChat(element) {
    const name = element.getAttribute("data-name");
    currentChat = name;

    document.getElementById("chatHeader").innerText = name;

    document.querySelectorAll("#chatList .list-group-item").forEach(item => {
        item.classList.remove("active");
    });

    element.classList.add("active");

    renderMessages();
}

// Render messages
function renderMessages() {
    const container = document.getElementById("messages");
    container.innerHTML = "";

    chats[currentChat].forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("message", msg.type);
        div.innerText = msg.text;
        container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
}

// Send message
function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (text === "") return;

    chats[currentChat].push({
        text: text,
        type: "sent"
    });

    input.value = "";
    renderMessages();
}


document.addEventListener("DOMContentLoaded", () => {

    console.log("JS LOADED"); // make sure this prints

    const chatItems = document.querySelectorAll("#chatList .list-group-item");

    chatItems.forEach(item => {
        item.addEventListener("click", function () {
            console.log("Clicked:", this.dataset.name); // debug

            selectChat(this);
        });
    });

    const input = document.getElementById("messageInput");

    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });
});