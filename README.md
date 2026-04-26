# CPTS_360-Chat_System
TEMU CHAT

TEAM:
Andres
Karen
Arni

Below are the instructions to run TEMU CHAT on your computer:

1. open a terminal and cd to project folder location
2. npm install
3. npm start
4. open http://localhost:3000/ in browser

-----------project overview and goals-------------
This project implements a multi-client chat system in C using
event-driven I/O. The system includes non-blocking sockets, message broadcasting,
user sessions, and server-side event loops. Out of all the topics explored in the course,
the four that we chose to explore in our project are event-based concurrency, network
programming, system-level I/O, and control flow. Our project consists of a front-end
user interface to display chats and a backend database to store the chat sessions.

-------------design decisions and trade-offs used-------------
Our application, TEMU CHAT, is a simple functional messaging system where users can send and
recive messages. If the user is not logged in their messages will be saved and accessible when
they log back in. We used Javascript, node.js, websockets, and SQlite. We chose to go with node.js
with websockets so all changes could be seen in realtime opposed to using HTP which wouldnt load 
changes unless we refreshed the page. The trade off was that the logic was a little more complex 
but overall it adds a better use experience thats seamless for the user.