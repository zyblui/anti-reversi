onmessage=function(e){
    if(e.data=="computerPlay") this.postMessage(cpu());
}
function cpu() {
    let result = /*initSearchAlpha(board, searchDepth, playerColor)*/initSearchSort(board, searchDepth, playerColor);
    console.log(result)
    let biggestValue = Math.max(...result.map((x) => x.evaluation))
    for (let r of result) {
        if (r.evaluation == biggestValue) {
            for (let i = 0; i <= 7; i++) {
                for (let j = 0; j <= 7; j++) {
                    if (board[i][j] == 0 && r.board[i][j] != 0) {
                        /*pd(LETTERS[j] + (i + 1));
                        return;*/
                        return LETTERS[j] + (i + 1);
                    }
                }
            }
        }
    }
}
function placeDisc(currentBoard, x, y, color) {
    let tempBoard = JSON.parse(JSON.stringify(currentBoard))
    if (tempBoard[x][y]) return { isValid: false };
    let isValidMove = false;
    for (let i of DIRECTIONS) {
        let dirFlip = directionalFlip(tempBoard, x, y, i, color);
        isValidMove = isValidMove || dirFlip.flip;
        if (dirFlip.flip) tempBoard = dirFlip.board;
    }
    if (isValidMove) {
        tempBoard[x][y] = color;
        return {
            isValid: true,
            board: tempBoard
        }
    }
    return { isValid: false }
}
function directionalFlip(currentBoard, x, y, direction, color) {
    let tempBoard = JSON.parse(JSON.stringify(currentBoard))
    let flipCounter = 0;
    do {
        flipCounter++;
        if (!(x + direction[0] * flipCounter >= 0 && x + direction[0] * flipCounter <= 7 && y + direction[1] * flipCounter >= 0 && y + direction[1] *
            flipCounter <= 7) || !tempBoard[x + direction[0] * flipCounter][y + direction[1] * flipCounter]) return { flip: false };
    } while (tempBoard[x + direction[0] * flipCounter][y + direction[1] * flipCounter] == -color);
    flipCounter--;
    if (!flipCounter) return { flip: false };
    for (let i = 1; i <= flipCounter; i++) {
        tempBoard[x + direction[0] * i][y + direction[1] * i] = color;
    }
    return {
        flip: true,
        board: tempBoard
    };
}
function getValidMoves(currentBoard, color) {
    let situations = []
    for (let m = 0; m <= 7; m++) {
        for (let n = 0; n <= 7; n++) {
            let placeResult = placeDisc(currentBoard, m, n, color)
            if (placeResult.isValid) {
                let placeResultBoard = placeResult.board
                situations.push({
                    board: placeResultBoard,
                    lastColorPlayed: color
                });
            }
        }
    }
    return situations;
}
function validMovesArr() {
    let situations = []
    for (let m = 0; m <= 7; m++) {
        for (let n = 0; n <= 7; n++) {
            let placeResult = placeDisc(board, m, n, playerColor);
            if (placeResult.isValid) {
                situations.push(m * 8 + n)
            }
        }
    }
    return situations;
}
function search(currentMove, depth, color, playerColor) {
    if (depth >= 1) {
        let moves = getValidMoves(currentMove.board, color);
        positionsConsidered += moves.length;
        for (let i = 0; i < moves.length; i++) {
            if (depth >= 2) {
                moves[i].nextMoves = search(moves[i], depth - 1, -color, playerColor);
                if (!moves[i].nextMoves.length) moves[i].nextMoves.push({
                    board: moves[i].board,
                    lastColorPlayed: -color,
                    evaluation: evaluate(moves[i].board, playerColor)
                });
                moves[i].evaluation = (color == playerColor) ? Math.min(...moves[i].nextMoves.map((x) => x.evaluation)) : Math.max(...moves[i].nextMoves.map((x) => x.evaluation));
                if (moves[1]?.evaluation) {
                    if ((color == playerColor && moves[0].evaluation >= moves[1].evaluation) || (color != playerColor && moves[0].evaluation <= moves[1].evaluation)) moves.splice(1, 1);
                    else moves.splice(0, 1);
                    i--;
                }
            } else if (depth == 1) {
                moves[i].evaluation = evaluate(moves[i].board, playerColor);
            }
        }
        return moves;
    }
}
let maxDepth = 6;
function searchAlpha(currentMove, depth, color, playerColor, parentBestVal, clearNextMoves, isShallowSearch) {
    let currentBoard = currentMove.board;
    if (currentMove.nextMoves.length) {
        for (let i of currentMove.nextMoves) {
            searchAlpha(i, depth - 1, -color, playerColor, currentMove.evaluation, true, false);
            if (color == playerColor) {//current move is a maximizer, parent is a minimizer
                currentMove.evaluation = Math.max(currentMove.evaluation, i.evaluation);
                if (currentMove.evaluation > parentBestVal) {
                    break;
                }
            } else {//current move is a minimizer, parent is a maximizer
                currentMove.evaluation = Math.min(currentMove.evaluation, i.evaluation);
                if (currentMove.evaluation < parentBestVal) {
                    break;
                }
            }
        }
    } else {
        outerFor: for (let m = 0; m <= 7; m++) {
            for (let n = 0; n <= 7; n++) {
                let placeResult = placeDisc(currentBoard, m, n, color);
                if (placeResult.isValid) {
                    let placeResultBoard = placeResult.board
                    currentMove.nextMoves.push({
                        board: placeResultBoard,
                        lastColorPlayed: color,
                        evaluation: (color == playerColor) ? +Infinity : -Infinity,
                        nextMoves: []
                    });
                    if (depth >= 2) {
                        searchAlpha(currentMove.nextMoves[currentMove.nextMoves.length - 1], depth - 1, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch);
                    } else {
                        currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation = evaluate(placeResultBoard, playerColor);
                    }
                    if (color == playerColor) {//current move is a maximizer, parent is a minimizer
                        currentMove.evaluation = Math.max(currentMove.evaluation, currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation)
                        if (!isShallowSearch && currentMove.evaluation > parentBestVal) {
                            break outerFor;
                        }
                    } else {//current move is a minimizer, parent is a maximizer
                        currentMove.evaluation = Math.min(currentMove.evaluation, currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation);
                        if (!isShallowSearch && currentMove.evaluation < parentBestVal) {
                            break outerFor;
                        }
                    }
                }
            }
        }
        if (!currentMove.nextMoves.length) {
            currentMove.nextMoves = [{
                board: currentBoard,
                lastColorPlayed: -color,
                evaluation: (color == playerColor) ? +Infinity : -Infinity,
                nextMoves: []
            }]
            if (depth >= 2) {
                searchAlpha(currentMove.nextMoves[0], depth - 1, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch)
            } else {
                currentMove.nextMoves[0].evaluation = evaluate(currentBoard, playerColor);
            }
            currentMove.evaluation = currentMove.nextMoves[0].evaluation;
        }
    }
    if (clearNextMoves) currentMove.nextMoves = [];
    return currentMove;
}
function initSearchAlpha(currentBoard, depth, color) {
    return searchAlpha({
        board: currentBoard,
        nextMoves: [],
        evaluation: -Infinity,
        lastColorPlayed: -color
    }, depth, color, color, +Infinity, false, false).nextMoves;
}
function initSearchSort(currentBoard, depth, color) {//!
    let shallowResult = searchAlpha({
        board: currentBoard,
        nextMoves: [],
        evaluation: -Infinity,
        lastColorPlayed: -color
    }, 2, color, color, +Infinity, false, true);
    //Sort and reset evaluations
    for (let i of shallowResult.nextMoves) {
        i.nextMoves.sort((a, b) => a.evaluation - b.evaluation);
        for (let j of i.nextMoves) {
            j.evaluation = -Infinity;
        }
    }
    shallowResult.nextMoves.sort((a, b) => b.evaluation - a.evaluation);
    for (let i of shallowResult.nextMoves) {
        i.evaluation = +Infinity
    }
    shallowResult.evaluation = -Infinity;
    //Continue searching to the depth set
    return searchAlpha(shallowResult, depth, color, color, +Infinity, false, false).nextMoves;
}
function getStableDiscs(currentBoard) {
    let arr = [
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false]
    ]
    /*if (!currentBoard[0][0] && !currentBoard[0][1] && !currentBoard[0][6] && !currentBoard[0][7] && !currentBoard[1][0] && !currentBoard[1][7] && !currentBoard[6][0]
        && !currentBoard[6][7] && !currentBoard[7][0] && !currentBoard[7][1] && !currentBoard[7][6] && !currentBoard[7][7] && currentBoard.flat().includes(1) && currentBoard.flat().includes(-1)){
            console.log("r")
            return arr;
    }*/
    let directionIsFull = [
        [true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
    ]
    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            if (!currentBoard[i][j]) {
                directionIsFull[0][i] = false;
                directionIsFull[1][j] = false;
                directionIsFull[2][i + j] = false;
                directionIsFull[3][7 - i + j] = false;
            }
        }
    }
    let directionProtected = [
        [
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [true, true, true, true, true, true, true, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, true, true, true, true, true, true, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, true, true, true, true, true, true, true]
        ]
    ]
    //!
    for (let i = 0; i < directionIsFull[0].length; i++) {
        if (directionIsFull[0][i]) directionProtected[0][i] = [true, true, true, true, true, true, true, true];
    }
    for (let i = 0; i < directionIsFull[1].length; i++) {
        if (directionIsFull[1][i]) {
            for (let j = 0; j < directionProtected[1].length; j++) {
                directionProtected[1][j][i] = true;
            }
        }
    }
    for (let i = 0; i <= 14; i++) {
        if (directionIsFull[2][i]) {
            for (let j = Math.max(i - 7, 0); j <= Math.min(i, 7); j++) {
                directionProtected[2][j][i - j] = true;
            }
        }
    }
    for (let i = 0; i <= 14; i++) {
        if (directionIsFull[3][i]) {
            for (let j = Math.max(7 - i, 0); j <= Math.min(14 - i, 7); j++) {
                directionProtected[3][j][i - 7 + j] = true;
            }
        }
    }
    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            if (!currentBoard[i][j]) {
                for (let l = 0; l <= 3; l++) {
                    directionProtected[l][i][j] = null;
                }
            } else if (arr[i][j]) {
                for (let l = 0; l <= 3; l++) {
                    directionProtected[l][i][j] = true;
                }
            }
        }
    }
    let loop = true;
    while (loop) {
        loop = false;
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (((directionProtected[0][i][j - 1] && currentBoard[i][j - 1] == currentBoard[i][j]) || (directionProtected[0][i][j + 1] && currentBoard[i][j + 1] == currentBoard[i][j])) && !directionProtected[0][i][j]) {
                    directionProtected[0][i][j] = true;
                    loop = true
                }
                if (((directionProtected[3][i - 1] && directionProtected[3][i - 1][j - 1] && currentBoard[i - 1][j - 1] == currentBoard[i][j]) || (directionProtected[3][i + 1] && directionProtected[3][i + 1][j + 1] && currentBoard[i + 1][j + 1] == currentBoard[i][j])) && !directionProtected[3][i][j]) {
                    directionProtected[3][i][j] = true;
                    loop = true
                }
                if (((directionProtected[2][i + 1] && directionProtected[2][i + 1][j - 1] && currentBoard[i + 1][j - 1] == currentBoard[i][j]) || (directionProtected[2][i - 1] && directionProtected[2][i - 1][j + 1] && currentBoard[i - 1][j + 1] == currentBoard[i][j])) && !directionProtected[2][i][j]) {
                    directionProtected[2][i][j] = true;
                    loop = true
                }
                if (((directionProtected[1][i + 1] && directionProtected[1][i + 1][j] && currentBoard[i + 1][j] == currentBoard[i][j]) || (directionProtected[1][i - 1] && directionProtected[1][i - 1][j] && currentBoard[i - 1][j] == currentBoard[i][j])) && !directionProtected[1][i][j]) {
                    directionProtected[1][i][j] = true;
                    loop = true
                }
            }
        }
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (directionProtected[0][i][j] && directionProtected[1][i][j] && directionProtected[2][i][j] && directionProtected[3][i][j] && !arr[i][j]) {
                    arr[i][j] = true;
                    loop = true;
                }
            }
        }
    }
    return arr;
}
function initSearch(currentBoard, depth, color) {
    positionsConsidered = 0;
    return search({
        board: currentBoard
    }, depth, color, color);
}
function evaluate(currentBoard, player) {
    let flat = currentBoard.flat();
    if (!flat.includes(player)) return Infinity;
    else if (!flat.includes(-player)) return -Infinity;
    let evaluation = 0;
    let stableDiscs = getStableDiscs(currentBoard);
    for (let m = 0; m < 8; m++) {
        for (let n = 0; n < 8; n++) {
            evaluation += ((stableDiscs[m][n]) ? -5.5 : STATIC_TABLE[m][n]) * currentBoard[m][n];
        }
    }
    evaluation *= player;
    return evaluation;
}
function discCount(currentBoard) {
    let discs = {
        black: 0,
        white: 0
    };
    for (let i of currentBoard.flat()) {
        if (i == 1) discs.black++;
        else if (i == -1) discs.white++;
    }
    return discs;
}
let setupMode = false;
let setupDisc = 1;