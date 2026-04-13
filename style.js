let socket = null;
let currentUser = null;
let currentChat = "Andres";
let chats = {
  "Andres": [],
  "Karen": [],
  "Arni": []
};

// Connect to backend socket
function connectSocket() {
  socket = new WebSocket("ws://localhost:3000");

  socket.onopen = function () {
    console.log("Connected to WebSocket server");
  };

  socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "login_success":
        currentUser = data.username;
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("chatSection").style.display = "block";
        break;

      case "active_users":
        renderUserList(data.users);
        break;

      case "private_message": {
        const otherUser = data.from === currentUser ? data.to : data.from;

        if (!chats[otherUser]) {
          chats[otherUser] = [];
        }

        chats[otherUser].push({
          text: `${data.from}: ${data.text}`,
          type: data.messageType
        });

        if (currentChat === otherUser) {
          renderMessages();
        }

        break;
      }

      case "typing":
        if (currentChat === data.from) {
          const typingIndicator = document.getElementById("typingIndicator");
          typingIndicator.innerText = `${data.from} is typing...`;

          setTimeout(() => {
            typingIndicator.innerText = "";
          }, 1000);
        }
        break;

      case "error":
        alert(data.message);
        break;
    }
  };

  socket.onclose = function () {
    console.log("Disconnected from WebSocket server");
  };
}

// Login
function login() {
  const username = document.getElementById("usernameInput").value.trim();

  if (username === "") return;

  socket.send(JSON.stringify({
    type: "login",
    username: username
  }));
}

// Rebuild sidebar from active users
function renderUserList(users) {
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";

  users.forEach((user) => {
    if (user === currentUser) return;

    if (!chats[user]) {
      chats[user] = [];
    }

    const li = document.createElement("li");
    li.className = "list-group-item";
    li.setAttribute("data-name", user);
    li.innerText = user;

    if (user === currentChat) {
      li.classList.add("active");
    }

    li.addEventListener("click", function () {
      selectChat(this);
    });

    chatList.appendChild(li);
  });

  // if current chat disappeared, pick first online user if possible
  const remainingUsers = users.filter(user => user !== currentUser);
  if (!remainingUsers.includes(currentChat) && remainingUsers.length > 0) {
    currentChat = remainingUsers[0];
    document.getElementById("chatHeader").innerText = currentChat;
    renderMessages();
  }
}

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

  if (!chats[currentChat]) {
    chats[currentChat] = [];
  }

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

  if (text === "" || !currentChat) return;

  socket.send(JSON.stringify({
    type: "private_message",
    to: currentChat,
    text: text
  }));

  input.value = "";
}

// Typing indicator
function sendTyping() {
  if (!currentChat) return;

  socket.send(JSON.stringify({
    type: "typing",
    to: currentChat
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("JS LOADED");

  connectSocket();

  const loginBtn = document.getElementById("loginBtn");
  const sendBtn = document.getElementById("sendBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", login);
  }

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  const input = document.getElementById("messageInput");
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      sendMessage();
    } else {
      sendTyping();
    }
  });

  // keep existing initial render behavior
  document.getElementById("chatHeader").innerText = currentChat;
  renderMessages();
});