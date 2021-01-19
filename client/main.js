import {Game} from './game.js';
import {Rack} from './rack.js';
import * as utils from "./scrabbleUtils.js";

const NUMBER_OF_PLAYERS = 2;
let turn = 0; // Player 1 starts the game
const PName = new Array(2);

function updateTurn() {
    document.getElementById("turn").innerText = document.getElementById(`p${turn % NUMBER_OF_PLAYERS}-name`).value;
}

function renderGame(game) {
    game.render(document.getElementById('board'));
}

function renderRacks(racks) {
    racks.forEach((rack, i) => rack.render(document.getElementById(`p${i}-rack`)));
}

window.addEventListener("load", async function() {
    const response = await fetch("dictionary.json");
    if (!response.ok) {
        console.log(response.error);
        return;
    }

    // We make dictionary a global.
    window.dictionary = await response.json();

    const game = new Game();

    updateTurn();

    const racks = [];
    const scores = Array.from(Array(NUMBER_OF_PLAYERS), () => 0);
    for (let i = 0; i < NUMBER_OF_PLAYERS; ++i) {
        racks[i] = new Rack();

        racks[i].takeFromBag(7, game);
        
        document.getElementById(`p${i}-name`).addEventListener("change", updateTurn);
    }

    renderRacks(racks);
    renderGame(game);
    
    document.getElementById('play').addEventListener('click', () => {
        const word = document.getElementById('word').value;
        const x = parseInt(document.getElementById('x').value);
        const y = parseInt(document.getElementById('y').value);
        const direction = document.getElementById('direction').value === 'horizontal';

        const rack = racks[turn % NUMBER_OF_PLAYERS];

        // We need to remove tiles already on the grid from the word trying to be constructed.
        let remaining = word;
        for (let i = 0; i < word.length; ++i) {
            const tile = direction ? game.getGrid()[x + i][y] : game.getGrid()[x][y + i];
            if (tile !== null) {
                if (tile !== word[i]) {
                    alert(`The word intercepts already placed tiles.`);
                    return;
                } else {
                    remaining = remaining.replace(tile, '');
                }
            }
        }

        if (!utils.canConstructWord(rack.getAvailableTiles(), remaining)) {
            alert(`The word ${word} cannot be constructed.`);
        } else {
            try {
                const gScore = game.playAt(word, {x, y}, direction);
                scores[turn % NUMBER_OF_PLAYERS] += gScore;
                document.getElementById('word').value = "";
                document.getElementById(`p${turn % NUMBER_OF_PLAYERS}-score`).innerText = scores[turn % NUMBER_OF_PLAYERS];
                renderGame(game);
    
                const used = utils.constructWord(rack.getAvailableTiles(), remaining);
                used.forEach(tile => rack.removeTile(tile));
                rack.takeFromBag(used.length, game);
                renderRacks(racks);
                if(turn === 0){
                    PName[0] = document.getElementById('p0-name').value;
                    PName[1] = document.getElementById('p1-name').value;
                }

                fetch("/wordScore", {
                        // Adding method type 
                        method: "POST",
                        // Adding body or contents to send 
                        body: JSON.stringify({
                            name: `${PName[turn % NUMBER_OF_PLAYERS]}`,
                            word: word,
                            score: gScore
                        }),
                        // Adding headers to the request 
                        headers: {
                            "Content-type": "application/json"
                        }
                    })
                        // Converting to JSON 
                        .then(response => {response.ok;})
                        .then(json => console.log(json));

                ++turn;
                updateTurn();
            } catch (e) {
                alert(e);
            }
        }
    });
    
    document.getElementById('reset').addEventListener('click', () => {
        document.getElementById("play").disabled = false;
        game.reset();
        renderGame(game);
    });
    
    document.getElementById('shuffle').addEventListener('click', () => {
        racks[turn % NUMBER_OF_PLAYERS].shuffle(game);
        renderRacks(racks);
    });


    fetch("/highestWordScores", {method: 'GET'}) 
    .then(response => response.json()) 
    .then(highestWS => {
        let li;
        for(let i = 0; i<highestWS.length; ++i){
            if(li === undefined){
                li = `<tr> 
                <td>${highestWS[i].name} </td> 
                <td>${highestWS[i].word}</td>
                <td>${highestWS[i].score}</td>              
            </tr>`; 
            }
            else{
            li += `<tr> 
            <td>${highestWS[i].name} </td> 
            <td>${highestWS[i].word}</td>
            <td>${highestWS[i].score}</td>              
        </tr>`;
            } 
        }
        if(li === undefined){
            li = `<tr> 
            <td> </td> 
            <td> </td>
            <td> </td>                  
        </tr>`;
        }
        document.getElementById("HWTable").innerHTML = li;     
});




    fetch("/highestGameScores", {method: 'GET'}) 
.then(response => response.json()) 
.then(highestGS => {
     
    let li2;
    for(let i = 0; i<highestGS.length; ++i){
        if(li2 === undefined){
            li2 = `<tr> 
            <td>${highestGS[i].name} </td> 
            <td>${highestGS[i].score}</td>              
        </tr>`; 
        }
        else{
        li2 += `<tr> 
        <td>${highestGS[i].name} </td> 
        <td>${highestGS[i].score}</td>              
    </tr>`;
        } 
    }
    if(li2 === undefined){
        li2 = `<tr> 
        <td> </td> 
        <td> </td>          
    </tr>`;
    }
    document.getElementById("HGTable").innerHTML = li2;     
});

});

document.getElementById('endgame').addEventListener('click', () => {
    document.getElementById("play").disabled = true; 

    fetch("/highestWordScores", {method: 'GET'}) 
    .then(response => response.json()) 
    .then(highestWS => {
        let li;
        for(let i = 0; i<highestWS.length; ++i){
            if(li === undefined){
                li = `<tr> 
                <td>${highestWS[i].name} </td> 
                <td>${highestWS[i].word}</td>
                <td>${highestWS[i].score}</td>              
            </tr>`; 
            }
            else{
            li += `<tr> 
            <td>${highestWS[i].name} </td> 
            <td>${highestWS[i].word}</td>
            <td>${highestWS[i].score}</td>              
        </tr>`;
            } 
        }
        if(li === undefined){
            li = `<tr> 
            <td> </td> 
            <td> </td>
            <td> </td>                  
        </tr>`;
        }
        document.getElementById("HWTable").innerHTML = li;     
});

if(PName[0] === undefined){
    PName[0] = document.getElementById('p0-name').value;
}

fetch("/gameScore", {
    // Adding method type 
    method: "POST",
    // Adding body or contents to send 
    body: JSON.stringify({
        name: `${PName[0]}`,
        score: document.getElementById(`p0-score`).innerText
    }),
    // Adding headers to the request 
    headers: {
        "Content-type": "application/json"
    }
})
    // Converting to JSON 
    .then(response => {response.ok;})
    .then(json => console.log(json));

    if(PName[1] === undefined){
        PName[1] = document.getElementById('p1-name').value;
    }

    fetch("/gameScore", {
        // Adding method type 
        method: "POST",
        // Adding body or contents to send 
        body: JSON.stringify({
            name: `${PName[1]}`,
            score: document.getElementById(`p1-score`).innerText
        }),
        // Adding headers to the request 
        headers: {
            "Content-type": "application/json"
        }
    })
        // Converting to JSON 
        .then(response => {response.ok;})
        .then(json => console.log(json));



fetch("/highestGameScores", {method: 'GET'}) 
.then(response => response.json()) 
.then(highestGS => {
     
    let li2;
    for(let i = 0; i<highestGS.length; ++i){
        if(li2 === undefined){
            li2 = `<tr> 
            <td>${highestGS[i].name} </td> 
            <td>${highestGS[i].score}</td>              
        </tr>`; 
        }
        else{
        li2 += `<tr> 
        <td>${highestGS[i].name} </td> 
        <td>${highestGS[i].score}</td>              
    </tr>`;
        } 
    }
    document.getElementById("HGTable").innerHTML = li2;     
});


});