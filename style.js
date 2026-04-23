let socket = null;
let currentUser = null;
let currentChat = "Global Chat";
let messages = {
  "Global Chat": []
};

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
        document.getElementById("currentUserDisplay").innerText = "Welcome, " + currentUser;

        currentChat = "Global Chat";
        document.getElementById("chatHeader").innerText = "Global Chat";

        socket.send(JSON.stringify({
          type: "global_history"
        }));
        break;

      case "active_users":
        renderUserList(data.users);

        const otherUsers = data.users.filter(u => u !== currentUser);

        if (otherUsers.length > 0) {
          currentChat = otherUsers[0];
          
          socket.send(JSON.stringify({
          type: "chat_history",
          user: currentChat
        }));
        }

        break;

      case "private_message": {
        const isMe = data.from === currentUser;
        const chatPartner = isMe ? data.to : data.from;

        if (!messages[chatPartner]) {
          messages[chatPartner] = [];
        }

        messages[chatPartner].push({
          text: `${isMe ? "You" : data.from}: ${data.text}`,
          type: isMe ? "sent" : "received"
        });

        if (currentChat === chatPartner) {
          renderMessages();
        }

        break;
      }

      case "global_message": {
        if (!messages["Global Chat"]) {
          messages["Global Chat"] = [];
        }

        const isMe = data.from === currentUser;

        messages["Global Chat"].push({
          text: `${isMe ? "You" : data.from}: ${data.text}`,
          type: isMe ? "sent" : "received"
        });

        if (currentChat === "Global Chat") {
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

      case "chat_history":
        currentChat = data.user;
    
        messages[currentChat] = data.messages.map(m => {
          const isMe = m.sender === currentUser;

          return {
            text: `${isMe ? "You" : m.sender}: ${m.message}`,
            type: isMe ? "sent" : "received"
          };
        });

        document.getElementById("chatHeader").innerText = currentChat;
        renderMessages();
        break;

      case "global_history":
        currentChat = "Global Chat";

        messages["Global Chat"] = data.messages.map(m => {
          const isMe = m.sender === currentUser;

          return {
            text: `${isMe ? "You" : m.sender}: ${m.message}`,
            type: isMe ? "sent" : "received"
          };
        });

        document.getElementById("chatHeader").innerText = "Global Chat";
        renderMessages();
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

function login() {
  const username = document.getElementById("usernameInput").value.trim();

  if (username === "") return;

  socket.send(JSON.stringify({
    type: "login",
    username: username
  }));
}

function renderUserList(users) {
  const chatList = document.getElementById("chatList");
  chatList.innerHTML = "";

  const globalLi = document.createElement("li");
  globalLi.className = "list-group-item";
  globalLi.setAttribute("data-name", "Global Chat");
  globalLi.innerText = "Global Chat";

  if (currentChat === "Global Chat") {
    globalLi.classList.add("active");
  }

  globalLi.addEventListener("click", function () {
    selectChat(this);
  });

  chatList.appendChild(globalLi);

  users.forEach((user) => {
    if (user === currentUser) return;

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
}

function selectChat(element) {
  const name = element.getAttribute("data-name");
  currentChat = name;

  document.getElementById("chatHeader").innerText = name;
  document.getElementById("typingIndicator").innerText = "";

  document.querySelectorAll("#chatList .list-group-item").forEach(item => {
    item.classList.remove("active");
  });

  element.classList.add("active");

  if (name === "Global Chat") {
    socket.send(JSON.stringify({
      type: "global_history"
    }));
  } else {
    socket.send(JSON.stringify({
      type: "chat_history",
      user: name
    }));
  }
}

function renderMessages() {
  const container = document.getElementById("messages");
  container.innerHTML = "";

  const chatMessages = messages[currentChat] || [];

  chatMessages.forEach(msg => {
    const div = document.createElement("div");
    div.classList.add("message", msg.type);
    div.innerText = msg.text;
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (text === "" || !currentChat) return;

  if (currentChat === "Global Chat") {
    socket.send(JSON.stringify({
      type: "global_message",
      text: text
    }));
  } else {
    socket.send(JSON.stringify({
      type: "private_message",
      to: currentChat,
      text: text
    }));
  }

  input.value = "";
}

function sendTyping() {
  if (!currentChat || currentChat === "Global Chat") return;

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
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    } else {
      sendTyping();
    }
  });

  document.getElementById("chatHeader").innerText = "Global Chat";
  renderMessages();
});