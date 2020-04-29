const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const usersList = document.getElementById('users');
const userTable = $('#game-user-table');

// Get user and room from URL
const { username, room, password } = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', {
    username,
    room,
    password
});

socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    
    outputUsers(users);
});

socket.on('message', message => {
    outputMessage(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('gameError', message => {
    console.log(message.text);
    alert(message.text);
    window.location = '/';
});

socket.on('gameWarning', message => {
    alert(message.text);
    
    if (message.hasOwnProperty('phase')) {
        if (message.phase === 'voting') {
            $('#btnVoteForCard').show();
        } else if (message.phase === 'selectCard') {
            $('#btnChooseCard').show();
        }
    }
});

socket.on('phase', message => {
    if (message == 'selectCard') {
        $('#btnSetReady').hide();
        $('#btnChooseCard').show();
        $('#game-users-title').html('Selecting cards');
    } else if (message == 'readyOn') {
        $('#btnSetReady').css('background-color', '#5cb85c');
    } else if (message == 'readyOff') {
        $('#btnSetReady').css('background-color', 'darksalmon');
    } else if (message == 'voting') {
        $('#game-users-title').html('Voting');
        $('#btnChooseCard').hide();
        $('#btnVoteForCard').show();
    } else if (message == 'scoring') {
        $('#game-users-title').html('Summary');
        $('#btnVoteForCard').hide();
        $('#btnSeenScoring').show();
    } else if (message == 'narrator') {
        $('#btnVoteForCard').hide();
    }
});

socket.on('gameCardsPack', cardsPack => {
    console.log(cardsPack);
    $('#player-cards').empty();
    var i=0;
    cardsPack.forEach((card)=>{
        $('#player-cards').append(`<img data-index="${i}" onclick="Game.selectCard(event, $('#selected-card-index'))" class="game-card" src="${card}"/>`);
        i++;
    });
    let fakeEvent = {target: $('#player-cards').children()[0]};
    Game.selectCard(fakeEvent, $('#selected-card-index'));
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit('chatMessage', msg);
    
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.userName} <span>${message.time}</span></p>
<p class="text">
    ${message.text}
</p>`;
    document.querySelector('.chat-messages').appendChild(div);
}

function outputRoomName(room) {
    roomName.innerText = room;
}

function outputUsers(users) {
    userTable.html(`
        ${users.map(user => `<tr>
            <td ${user.isHost ? 'style="color: red;"' : ''}>${user.isStoryteller ? 'N:' : ''}${user.username}</td>
            <td>${user.madeMove ? '<i class="fas fa-check-circle"></i>' : ''}</td>
            <td>${user.points}</td>
        </tr>`).join('')}
    `);
}

function setSpotlightCards(selectedCard){
    $('#spotlight-selected-card').attr('src', selectedCard.attr('src'));
    $('#spotlight-left-card').attr('src', selectedCard.prev().length > 0 ? selectedCard.prev().attr('src') : selectedCard.siblings().last().attr('src'));
    $('#spotlight-right-card').attr('src', selectedCard.next().length > 0 ? selectedCard.next().attr('src') : selectedCard.siblings().first().attr('src'));
}

const Game = {
    start : function(event) {
        event.preventDefault();
        socket.emit('gameUserReady', 'ok');
    },
    selectCard: function(event, cardIndexHolder) {
        var element = $(event.target);
        const value = element.data('index');
        cardIndexHolder.val(value);
        $('.game-card').removeClass('selected');
        element.addClass('selected');
        setSpotlightCards(element);
    },
    sendPickedCard : function(event, cardNumber) {
        event.preventDefault();
        socket.emit('gamePickCard', cardNumber);
        console.log('You selected card '+cardNumber);
        var element = $(event.target);
        element.hide();
    },
    voteForCard : function(event, cardNumber) {
        event.preventDefault();
        socket.emit('gameVote', cardNumber);
        console.log('You vote card '+cardNumber);
        var element = $(event.target);
        element.hide();
    },
    nextRound : function(event) {
        event.preventDefault();
        socket.emit('gameNextRound', 'NEXT');
        var element = $(event.target);
        element.hide();
    }
};

function toggleUsers() {
    let userArea = $('#game-users-area');
    if (userArea.hasClass('showed')) {
        userArea.removeClass('showed');    
    } else {
        userArea.addClass('showed');
    }
    
}