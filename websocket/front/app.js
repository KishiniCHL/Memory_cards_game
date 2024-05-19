const socket = io();
let currentRoom;
let pairCountPlayer1 = 0;
let pairCountPlayer2 = 0;

//Enregistrement du username de l'utilisateur
document.getElementById("form").addEventListener("submit", function (event) {
  event.preventDefault();
  let username = document.getElementById("username").value;
  socket.emit("setUsername", username);
});

//creation d'une salle de jeu
document.getElementById("createRoomButton").addEventListener("click", function (event) {
  event.preventDefault();
  const roomName = document.getElementById("roomNameInput").value;
  if (roomName) {
      // Créer la salle
      socket.emit("createRoom", roomName);

      // Rejoindre la salle automatiquement
      currentRoom = roomName; // Mettez à jour currentRoom
      socket.emit("joinRoom", roomName);
      document.querySelector(".main-content").style.display = "none";
      document.querySelector(".room-content").style.display = "block";

      socket.emit("roomJoined", roomName);
  } else {
      console.log("Veuillez entrer un nom de salle");
  }
});

//leave la salle
document.getElementById("leaveButton").addEventListener("click", function () {
  if (currentRoom) {
      socket.emit("leave", currentRoom);
      currentRoom = null; // Réinitialiser currentRoom
      document.querySelector(".room-content").style.display = "none";
      document.querySelector(".main-content").style.display = "block";
  }
});

//recuperation des salles de jeu quand quelquun accede a la page
socket.on("connect", function () {
  socket.emit("getRooms");
});

socket.on("roomsList", (rooms) => {
  const roomsList = document.getElementById("rooms-list");
  roomsList.innerHTML = "";

  //display des room avec createur et si c'est full ou non
  rooms.forEach(({ room, creator, isFull }) => {
    const creator_details_room = document.createElement("li");
    creator_details_room.textContent = room + " créée par " + creator;

    let div = document.createElement('div');
    div.className = 'container-salon';

    const joinButton = document.createElement("button");
    joinButton.textContent = "Rejoindre la salle";
    joinButton.className = "input button_style";

    if (isFull) {
      joinButton.disabled = true;
      const space = document.createElement("span");
      space.textContent = " (Full)";
      creator_details_room.appendChild(space);
    }

    //join la salle
    joinButton.addEventListener("click", () => {
      //si la salle n'est pas pleine
      if (!isFull) {
        currentRoom = room;
        socket.emit("joinRoom", room);
        document.querySelector(".main-content").style.display = "none";
        document.querySelector(".room-content").style.display = "block";

        socket.emit("roomJoined", room);
      } else {
        alert("La salle est pleine !");
      }
    });

    div.appendChild(creator_details_room);
    div.appendChild(joinButton);
    roomsList.appendChild(div);
  });
});

//quand un utilisateur rejoint une salle
socket.on("userJoined", ({ user, room }) => {
  document.querySelector(".main-content").style.display = "none";
  document.querySelector(".room-content").style.display = "block";

  const message = document.createElement("p");
  message.textContent = `${user} a rejoint ${room}`;
  document.querySelector(".room-content").appendChild(message);

  document.querySelector("p span").textContent = " " + room;
});

socket.on("playerJoinedRoom", function () {
  // Show the rules when a player joins a room
  document.getElementById("rules").style.display = "block";
});

//la salle est pleine contenu
socket.on("roomIsFull", () => {
  console.log("room full");
  document.querySelector(".main-content").style.display = "none";
  document.querySelector(".room-content").style.display = "block";

  const startButton = document.createElement("button");
  startButton.textContent = "Commencer la partie";
  startButton.id = "start-game-button";
  startButton.classList.add("input", "button_style", "width200"); // Add classes here
  document.querySelector(".room-content").appendChild(startButton);

  startButton.addEventListener("click", () => {
    console.log("cool click sur le start button");
    socket.emit("gameStarted", currentRoom);
  });
});

//la salle est pleine et on ne peut pas la rejoindre
socket.on("roomFullAndCannotJoin", () => {
  alert("La salle que vous souhaitez rejoindre est pleine !");
  document.querySelector(".main-content").style.display = "block";
  document.querySelector(".room-content").style.display = "none";
});

//quand un utilisateur quitte la salle
socket.on("leave", function ({ user, room }) {
  console.log(`${user} a quitté la salle ${room}`);

  const message = document.createElement("p");
  message.textContent = `${user} a quitté la salle : ${room}`;
  document.querySelector(".room-content").appendChild(message);
});

let startTime; // Variable pour stocker l'heure de début de la partie
let timerInterval; // Variable pour stocker l'intervalle du chronomètre
let cardValues = [];

// une fois le bouton start game cliqué
socket.on("gameStarted", (cardValues) => {
  //cardValues = cardValues; // Stocker les valeurs des cartes reçues

  // Rendre le bouton startButton invisible
  const startButton = document.getElementById("start-game-button");
  const RemoveRules = document.getElementById("rules");
  if (startButton) {
    startButton.style.display = "none";
    RemoveRules.style.display = "none";
  }

  // Obtenir l'élément countdown du DOM
  const countdownElement = document.getElementById("countdown");

  // Start countdown
  let countdown = 5;
  const countdownInterval = setInterval(() => {
    countdown--;
    console.log("countdown:", countdown); // Ajout d'un console.log pour vérifier que le compte à rebours est démarré
    countdownElement.textContent = countdown;
    if (countdown === 0) {
      clearInterval(countdownInterval);
      countdownElement.textContent = "C'est parti !";
      console.log("Starting game..."); // Ajout d'un console.log pour vérifier que le jeu est démarré

        // Enregistrer l'heure de début de la partie
        startTime = Date.now();

        // Créer et afficher le chronomètre
        const timerElement = document.createElement('p');
        timerElement.id = 'timer';
        document.querySelector('.room-content').appendChild(timerElement);

        // Mettre à jour le chronomètre toutes les secondes
        timerInterval = setInterval(updateTimer, 1000);

      generateMemoryCards(cardValues); // Générer les cartes de mémoire avec les valeurs reçues

      // Faire disparaître le message après 3 secondes
      setTimeout(() => {
        countdownElement.style.display = "none";
      }, 1000);
    }
  }, 1000);
});

// Fonction pour mettre à jour le chronomètre
function updateTimer() {
  const timerElement = document.getElementById('timer');
  const elapsedTime = Date.now() - startTime;
  const seconds = Math.floor(elapsedTime / 1000) % 60;
  const minutes = Math.floor(elapsedTime / (1000 * 60));
  timerElement.textContent = `Temps écoulé : ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Événement 'pairFound'
socket.on('pairFound', ({ player }) => {
  console.log(`Pair found by ${player}`);
  
  if (player === 'player1') {
      pairCountPlayer1++;
      console.log(`Player 1 pair count: ${pairCountPlayer1}`);
  } else if (player === 'player2') {
      pairCountPlayer2++;
      console.log(`Player 2 pair count: ${pairCountPlayer2}`);
  }

  if (pairCountPlayer1 === cardValues.length / 2) {
      console.log('Player 1 a gagné !');
      document.getElementById('winner-message').textContent = 'Player 1 a gagné !';
      socket.emit('gameOver', { winner: 'player1', room: currentRoom });
  } else if (pairCountPlayer2 === cardValues.length / 2) {
      console.log('Player 2 a gagné !');
      document.getElementById('winner-message').textContent = 'Player 2 a gagné !';
      socket.emit('gameOver', { winner: 'player2', room: currentRoom });
  }
});

socket.on('gameOver', ({ winner }) => {
  document.getElementById('winner-message').textContent = `${winner} a gagné !`;
  console.log(`${winner} a gagné !`);
});


// Réception de l'événement 'gameOver'
socket.on('gameOver', ({ winner }) => {
  document.getElementById('winner-message').textContent = `${winner} a gagné !`;
  console.log(`${winner} a gagné !`);
});


// création du jeu de mémoire
const gameBoard = document.getElementById("game-board");
let flippedCards = []; // Cartes retournées

function generateMemoryCards(cardValues) {
  for (let i = 0; i < cardValues.length; i++) {
    const card = document.createElement("div");
    card.classList.add("memory-card");
    card.dataset.value = cardValues[i];
    card.textContent = card.dataset.value; // Afficher initialement la valeur de la carte
    card.addEventListener("click", flipCard);
    gameBoard.appendChild(card);
  }

  // Retourner toutes les cartes face cachée après 4 secondes
  setTimeout(() => {
    const cards = document.querySelectorAll(".memory-card");
    cards.forEach((card) => {
      card.textContent = "🎴"; // Emoji pour une carte face cachée
    });
  }, 4000);
}

let canFlip = true; 

function flipCard(event) {
  if (!canFlip) return; // Si le joueur ne peut pas retourner une carte, retourner

  const card = event.target;
  card.textContent = card.dataset.value; // Afficher la valeur de la carte

  // Si moins de deux cartes sont actuellement retournées, ajouter la carte aux cartes retournées et émettre l'événement cardFlipped
  if (flippedCards.length < 2) {
      flippedCards.push(card); // Ajouter la carte aux cartes retournées

      // Envoyer un événement au serveur pour indiquer qu'une carte a été retournée
      socket.emit("cardFlipped", {
          index: Array.from(gameBoard.children).indexOf(card),
          value: card.dataset.value,
          room: currentRoom
      });
  }

  // Si deux cartes ont été retournées, vérifier si elles correspondent
  if (flippedCards.length === 2) {
      canFlip = false; // Empêcher le joueur de retourner d'autres cartes

      // Obtenir les indices avant de réinitialiser le tableau flippedCards
      const indices = [Array.from(gameBoard.children).indexOf(flippedCards[0]), Array.from(gameBoard.children).indexOf(flippedCards[1])];

      if (flippedCards[0].dataset.value === flippedCards[1].dataset.value) {
          // Les cartes correspondent, les rendre invisibles après un délai
          setTimeout(() => {
              flippedCards[0].classList.add("invisible");
              flippedCards[1].classList.add("invisible");
              flippedCards = [];
              canFlip = true; // Permettre au joueur de retourner des cartes à nouveau

              // Envoyer un événement au serveur pour indiquer qu'une paire a été trouvée
              socket.emit('pairFound', { player: 'player1', indices, room: currentRoom }); // Modifiez ici en fonction du joueur actuel
          }, 1000);
      } else {
          // Si les cartes ne correspondent pas, les retourner face cachée après un délai
          setTimeout(() => {
            flippedCards[0].textContent = "🎴";
            flippedCards[1].textContent = "🎴";
            flippedCards = [];
            canFlip = true; // Permettre au joueur de retourner des cartes à nouveau

            // Envoyer un événement au serveur pour indiquer que les cartes doivent être retournées
            socket.emit('cardsDoNotMatch', { indices, room: currentRoom });
          }, 1000);
      }
  }
}


// Réception de l'événement 'cardFlipped' côté client
socket.on("cardFlipped", ({ index }) => {
  const cards = document.querySelectorAll(".memory-card");
  const card = cards[index];
  card.textContent = card.dataset.value; // Afficher la valeur de la carte
});

// Réception de l'événement 'cardsDoNotMatch' côté client
socket.on("cardsDoNotMatch", ({ indices }) => {
  const cards = document.querySelectorAll(".memory-card");
  const card1 = cards[indices[0]];
  const card2 = cards[indices[1]];

  card1.textContent = "🎴";
  card2.textContent = "🎴";
});

// Réception de l'événement 'pairFound' côté client
socket.on("pairFound", ({ indices }) => {
  console.log('pairFound event received', indices); // Log pour déboguer

  const cards = document.querySelectorAll(".memory-card");
  const card1 = cards[indices[0]];
  const card2 = cards[indices[1]];

  console.log('cards', card1, card2); // Log pour déboguer

  // Masquer les cartes correspondantes
  card1.classList.add("invisible");
  card2.classList.add("invisible");

  console.log('cards after adding invisible', card1, card2); // Log pour déboguer
});