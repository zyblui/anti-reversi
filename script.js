let searchDepth = 6;
let board = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, -1, 1, 0, 0, 0],
    [0, 0, 0, 1, -1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
]//1 for black, -1 for white
let positionsConsidered = 0;
let playerColor = 1;
let computerColor = -1;
let lastCoord = {
    x: 0,/*1~8 */
    y: 0
}
let previousMoves = [];
let maxDepth = 6;
let setupMode = false;
let setupDisc = 1;
let w = new Worker("w.js");
w.onmessage = function (e) {
    if (e.data.length == 2) pd(e.data);
}
render();
for (let i = 0; i <= 7; i++) {
    for (let j = 0; j <= 7; j++) {
        document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).addEventListener("click", function () {
            if (!setupMode) pd(LETTERS[j] + (i + 1));
            else {
                board[i][j] = setupDisc;
                lastCoord = {
                    x: 0,
                    y: 0
                }
                render();
            }
        })
    }
}
document.getElementById("setupButton").addEventListener("click", function () {
    setupMode = !setupMode;
    if (setupMode) document.getElementById("setupButton").classList.add("selected");
    else document.getElementById("setupButton").classList.remove("selected");
});
document.getElementById("setupBlack").addEventListener("click", function () {
    setupDisc = 1;
});
document.getElementById("setupWhite").addEventListener("click", function () {
    setupDisc = -1;
});
document.getElementById("setupErase").addEventListener("click", function () {
    setupDisc = 0;
});
document.getElementById("setupClear").addEventListener("click", function () {
    board = [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, -1, 1, 0, 0, 0],
        [0, 0, 0, 1, -1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ]
    lastCoord = {
        x: 0,
        y: 0
    }
    render();
})
document.getElementById("startGameButton").addEventListener("click", function () {
    if (playerColor == computerColor) {
        //cpu();
        w.postMessage({
            type: "computerPlay",
            board: board,
            sideToMove: playerColor
        });
    }
})
document.getElementById("computerRoleBlack").addEventListener("click", function () {
    computerColor = 1;
});
document.getElementById("computerRoleWhite").addEventListener("click", function () {
    computerColor = -1;
});
document.getElementById("computerRoleNeither").addEventListener("click", function () {
    computerColor = 0;
});
document.getElementById("sideToMoveBlack").addEventListener("click", function () {
    playerColor = 1;
    render();
})
document.getElementById("sideToMoveWhite").addEventListener("click", function () {
    playerColor = -1;
    render();
});
document.getElementById("searchDepth6").addEventListener("click", function () {
    searchDepth = 6;
});
document.getElementById("searchDepth8").addEventListener("click", function () {
    searchDepth = 8;
});
function render() {
    let validMoves = validMovesArr();
    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            if (board[i][j] == 1) {
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.add("black");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("white");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("move");
            } else if (board[i][j] == -1) {
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.add("white");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("black");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("move");
            } else if (validMoves.includes(i * 8 + j)) {
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("white");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("black");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.add("move");
            } else {
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("white");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("black");
                document.querySelector(".r" + (i + 1) + ".c" + (j + 1)).classList.remove("move");
            }
        }
    }
    let discs = discCount(board);
    document.getElementById("blackScore").innerText = discs.black;
    document.getElementById("whiteScore").innerText = discs.white;
    if (playerColor == 1) {
        document.getElementById("indicatorBlack").classList.add("active");
        document.getElementById("indicatorWhite").classList.remove("active");
    } else {
        document.getElementById("indicatorBlack").classList.remove("active");
        document.getElementById("indicatorWhite").classList.add("active");
    }
    if (document.querySelector(".lastMove")) document.querySelector(".lastMove").classList.remove("lastMove")
    if (lastCoord.x != 0) document.querySelector(".r" + lastCoord.x + ".c" + lastCoord.y).classList.add("lastMove");
}
function pd(coord) {
    let y = LETTERS.indexOf(coord[0]);
    let x = Number(coord[1]) - 1;
    let placeResult = placeDisc(board, x, y, playerColor);
    if (!placeResult.isValid) return;
    lastCoord = {
        x: x + 1,
        y: y + 1
    }
    board = placeResult.board;
    playerColor = -playerColor;
    if (!validMovesArr().length) playerColor = -playerColor;
    if (playerColor == 1) {
        document.getElementById("sideToMoveBlack").checked = "checked";
        document.getElementById("sideToMoveWhite").checked = "";
    }
    else {
        document.getElementById("sideToMoveWhite").checked = "checked";
        document.getElementById("sideToMoveBlack").checked = "";
    }
    let boardStr = "";
    for (let i of board) {
        for (let j of i) {
            switch (j) {
                case 0:
                    boardStr += "."
                    break;
                case 1:
                    boardStr += "x"
                    break;
                case -1:
                    boardStr += "o"
            }
        }
        boardStr += "\r\n"
    }
    console.log(((arguments[1]) ? "Computer" : "You") + " placed a disc on " + coord);
    console.log("The currect board is");
    console.log(boardStr);
    render();
    //setTimeout(function () {
    if (computerColor == playerColor) {
        //cpu();
        w.postMessage({
            type: "computerPlay",
            board: board,
            sideToMove: playerColor
        });
    }
    //}, 100)
}