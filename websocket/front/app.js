const socket = io();
    let currentRoom;

    //Enregistrement du username de l'utilisateur
    document.getElementById("form").addEventListener("submit", function (event) {
      event.preventDefault();
      let username = document.getElementById("username").value;
      socket.emit("setUsername", username);
    });

    //creation d'une salle de jeu
    document.getElementById('createRoomButton').addEventListener('click', function(event) {
      event.preventDefault();
      const roomName = document.getElementById('roomNameInput').value;
      if (roomName) {
        // Créer la salle
        socket.emit('createRoom', roomName);
    
        // Rejoindre la salle automatiquement
        socket.emit('joinRoom', roomName);
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('.room-content').style.display = 'block';
    
        socket.emit('roomJoined', roomName);
      } else {
        console.log('Veuillez entrer un nom de salle');
      }
    });

    //leave la salle
    document.getElementById('leaveButton').addEventListener('click', function() {
      if (currentRoom) {
        socket.emit('leave', currentRoom);
        document.querySelector('.room-content').style.display = 'none';
        document.querySelector('.main-content').style.display = 'block';
      }
    });

    //recuperation des salles de jeu quand quelquun accede a la page
    socket.on('connect', function() {
      socket.emit('getRooms');
    });

    socket.on('roomsList', (rooms) => {
      const roomsList = document.getElementById('rooms-list');
      roomsList.innerHTML = ''; 

      //display des room avec createur et si c'est full ou non
      rooms.forEach(({ room, creator, isFull }) => { 
        const creator_details_room = document.createElement('li');
        creator_details_room.textContent = room + ' créée par ' + creator;

        const joinButton = document.createElement('button');
        joinButton.textContent = 'Rejoindre la salle';

        if (isFull) {
          joinButton.disabled = true;
          const space = document.createElement('span');
          space.textContent = ' (Full)';
          creator_details_room.appendChild(space);
        }

        //join la salle
        joinButton.addEventListener('click', () => {

          //si la salle n'est pas pleine
          if (!isFull) {
            currentRoom = room; 
            socket.emit('joinRoom', room);
            document.querySelector('.main-content').style.display = 'none';
            document.querySelector('.room-content').style.display = 'block';

            socket.emit('roomJoined', room);
          } else {
            alert('La salle est pleine !');
          }
        });

        roomsList.appendChild(creator_details_room);
        roomsList.appendChild(joinButton);
      });
    });

    //quand un utilisateur rejoint une salle
    socket.on("userJoined", ({ user, room }) => {
      document.querySelector('.main-content').style.display = 'none';
      document.querySelector('.room-content').style.display = 'block';

      const message = document.createElement("p");
      message.textContent = `${user} a rejoint ${room}`;
      document.querySelector(".room-content").appendChild(message);

      document.querySelector("h2 span").textContent = " " + room;
    });


    socket.on('playerJoinedRoom', function() {
      // Show the rules when a player joins a room
      document.getElementById('rules').style.display = 'block';
    });


    //la salle est pleine contenu
    socket.on('roomIsFull', () => {
      console.log('room full');
      document.querySelector('.main-content').style.display = 'none';
      document.querySelector('.room-content').style.display = 'block';

      const startButton = document.createElement('button');
      startButton.textContent = 'Commencer la partie';
      startButton.id = 'start-game-button'; 
      document.querySelector('.room-content').appendChild(startButton);

      startButton.addEventListener('click', () => {
        console.log('cool click sur le start button');
        socket.emit('gameStarted', currentRoom);
      });
    });

    //la salle est pleine et on ne peut pas la rejoindre 
    socket.on('roomFullAndCannotJoin', () => {
      alert('La salle que vous souhaitez rejoindre est pleine !');
      document.querySelector('.main-content').style.display = 'block';
      document.querySelector('.room-content').style.display = 'none';
    });

    //quand un utilisateur quitte la salle
    socket.on("leave", function ({ user, room }) {
      console.log(`${user} a quitté la salle ${room}`);

      const message = document.createElement("p");
      message.textContent = `${user} a quitté la salle : ${room}`;
      document.querySelector(".room-content").appendChild(message);
    });

    // une fois le bouton start game cliqué
    socket.on('gameStarted', (cardValues) => {
      // Rendre le bouton startButton invisible
      const startButton = document.getElementById('start-game-button');
      const RemoveRules = document.getElementById('rules');
      if (startButton) {
        startButton.style.display = 'none';
        RemoveRules.style.display = 'none';
      }

      generateMemoryCards(cardValues); // Générer les cartes de mémoire avec les valeurs reçues
    });


    // création du jeu de mémoire
    const gameBoard = document.getElementById('game-board');
    let flippedCards = []; // Cartes retournées

    function generateMemoryCards(cardValues) {

      for (let i = 0; i < cardValues.length; i++) {
          const card = document.createElement('div');
          card.classList.add('memory-card');
          card.dataset.value = cardValues[i];
          card.textContent = card.dataset.value; // Afficher initialement la valeur de la carte
          card.addEventListener('click', flipCard);
          gameBoard.appendChild(card);
      }

      // Retourner toutes les cartes face cachée après 4 secondes
      setTimeout(() => {
          const cards = document.querySelectorAll('.memory-card');
          cards.forEach(card => {
              card.textContent = '🎴'; // Emoji pour une carte face cachée
          });
      }, 4000);
    }

    // Fonction pour retourner une carte
    function flipCard(event) {
        const card = event.target;
        card.textContent = card.dataset.value; // Afficher la valeur de la carte
        
        // Si moins de deux cartes sont actuellement retournées, ajouter la carte aux cartes retournées et émettre l'événement cardFlipped
        if (flippedCards.length < 2) {
            flippedCards.push(card); // Ajouter la carte aux cartes retournées

            // Envoyer un événement au serveur pour indiquer qu'une carte a été retournée
            socket.emit('cardFlipped', { index: Array.from(gameBoard.children).indexOf(card), value: card.dataset.value });
        }

        // Si deux cartes ont été retournées, vérifier si elles correspondent
        if (flippedCards.length === 2) {
            if (flippedCards[0].dataset.value === flippedCards[1].dataset.value) {
                // Les cartes correspondent, les rendre invisibles après un délai
                setTimeout(() => {
                    flippedCards[0].classList.add('invisible');
                    flippedCards[1].classList.add('invisible');
                    flippedCards = [];
                }, 1000);
            } else {
                // Les cartes ne correspondent pas, les retourner face cachée après un délai
                setTimeout(() => {
                    flippedCards[0].textContent = '🎴';
                    flippedCards[1].textContent = '🎴';
                    flippedCards = [];
                }, 1000);
            }
        }

        // Envoyer un événement au serveur pour indiquer qu'une carte a été retournée
        //socket.emit('cardFlipped', { index: Array.from(gameBoard.children).indexOf(card) });
    }
    
    // Réception de l'événement 'cardFlipped' côté client
    socket.on('cardFlipped', ({ index }) => {
        const cards = document.querySelectorAll('.memory-card');
        const card = cards[index];
        card.textContent = card.dataset.value; // Afficher la valeur de la carte
    });