importScripts("simptable-3000-anti.js");
let board = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, -1, 1, 0, 0, 0],
    [0, 0, 0, 1, -1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
]
let playerColor = 1;
let searchDepth = 6;
const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const STATIC_TABLE = [
    [-99, 48, -8, 6, 6, -8, 48, -99],
    [48, -8, -16, 3, 3, -16, -8, 48],
    [-8, -16, 4, 4, 4, 4, -16, -8],
    [6, 3, 4, 0, 0, 4, 3, 6],
    [6, 3, 4, 0, 0, 4, 3, 6],
    [-8, -16, 4, 4, 4, 4, -16, -8],
    [48, -8, -16, 3, 3, -16, -8, 48],
    [-99, 48, -8, 6, 6, -8, 48, -99]
]

onmessage = function (e) {
    if (e.data.type == "computerPlay") {
        playerColor = e.data.color;
        board = e.data.board;
        searchDepth = e.data.depth;
        if(!validMovesArr().length)return;
        postMessage({
            type: "analysis",
            analysis: cpu(),
            nodes: positionsConsidered
        });
    }
}

function cpu() {
    let discs = discCount(board).black + discCount(board).white;
    let result = initSearchSort(board, searchDepth, playerColor);
    console.log(result);
    result.sort(function (a, b) {
        return b.evaluation - a.evaluation;
    });
    result = result.slice(0, 3);
    let analysis = []
    for (let r of result) {
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (board[i][j] == 0 && r.board[i][j] != 0) {
                    analysis.push({
                        coord: LETTERS[j] + (i + 1),
                        evaluation: r.evaluation
                    });
                }
            }
        }
    }
    return analysis;
}
function placeDisc(currentBoard, x, y, color) {
    if (currentBoard[x][y]) return { isValid: false };
    let tempBoard = JSON.parse(JSON.stringify(currentBoard));
    let isValidMove = false;
    for (let i of DIRECTIONS) {
        if (directionalFlip(tempBoard, x, y, i, color)) {
            isValidMove = true;
        }
    }
    if (isValidMove) {
        tempBoard[x][y] = color;
        return {
            isValid: true,
            board: tempBoard
        }
    }
    return { isValid: false };
}
function directionalFlip(currentBoard, x, y, direction, color) {//return value: is a valid directional flip
    let flipCounter = 0;
    do {
        flipCounter++;
        if (!(x + direction[0] * flipCounter >= 0 && x + direction[0] * flipCounter <= 7 && y + direction[1] * flipCounter >= 0 && y + direction[1] *
            flipCounter <= 7) || !currentBoard[x + direction[0] * flipCounter][y + direction[1] * flipCounter]) return false;
    } while (currentBoard[x + direction[0] * flipCounter][y + direction[1] * flipCounter] == -color);
    flipCounter--;
    if (!flipCounter) return false;
    for (let i = 1; i <= flipCounter; i++) {
        currentBoard[x + direction[0] * i][y + direction[1] * i] = color;
    }
    return true;
}
function getValidMoves(currentBoard, color) {
    let situations = []
    for (let m = 0; m <= 7; m++) {
        for (let n = 0; n <= 7; n++) {
            let placeResult = placeDisc(currentBoard, m, n, color);
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
                situations.push(m * 8 + n);
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

function searchAlpha(currentMove, depth, color, playerColor, parentBestVal, clearNextMoves, isShallowSearch, isLastPass) {
    let currentBoard = currentMove.board;
    if (currentMove.nextMoves.length) {
        for (let i of currentMove.nextMoves) {
            searchAlpha(i, depth - 1, -color, playerColor, currentMove.evaluation, true, false, false);
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
                    let placeResultBoard = placeResult.board;
                    currentMove.nextMoves.push({
                        board: placeResultBoard,
                        lastColorPlayed: color,
                        evaluation: (color == playerColor) ? +Infinity : -Infinity,
                        nextMoves: []
                    });
                    if (depth > 1) {
                        searchAlpha(currentMove.nextMoves[currentMove.nextMoves.length - 1], depth - 1, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch, false);
                    } else {
                        currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation = evaluateNew(placeResultBoard, playerColor);
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
            if (depth > 1 && !isLastPass) {
                searchAlpha(currentMove.nextMoves[0], depth, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch, true);
            } else {
                currentMove.nextMoves[0].evaluation = calculateFinalEval(currentBoard, playerColor)//evaluateNew(currentBoard, playerColor);
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
    }, depth, color, color, +Infinity, false, false, false).nextMoves;
}
function initSearchSort(currentBoard, depth, color) {
    positionsConsidered = 0;
    let shallowDepth = 0, exactDepth = 0;
    if (depth >= 8) {
        shallowDepth = 4;
        exactDepth = 12;
    } else {
        shallowDepth = 2;
        exactDepth = 12;
    }
    let sortedFlat = currentBoard.flat().sort();
    let shallowResult = shallowSearch(currentBoard, shallowDepth, color);
    //Continue searching to the depth set
    let blanks = sortedFlat.indexOf(1) - sortedFlat.indexOf(0);
    if (blanks <= exactDepth) {
        return searchAlpha(shallowResult, blanks + 2, color, color, +Infinity, false, false, false).nextMoves;
    } else {
        return searchAlpha(shallowResult, depth, color, color, +Infinity, false, false, false).nextMoves;
    }
}
function shallowSearch(currentBoard, shallowDepth, color) {
    let shallowResult = searchAlpha({
        board: currentBoard,
        nextMoves: [],
        evaluation: -Infinity,
        lastColorPlayed: -color
    }, shallowDepth, color, color, +Infinity, false, true, false);
    //Sort and reset evaluations
    sort(shallowResult, false);
    return shallowResult;
}
function sort(move, evalIsInfinity) {
    if (move.nextMoves.length) {
        move.nextMoves.sort((a, b) => (evalIsInfinity) ? (a.evaluation - b.evaluation) : (b.evaluation - a.evaluation));
        for (let i of move.nextMoves) {
            sort(i, !evalIsInfinity);
        }
    }
    move.evaluation = (evalIsInfinity) ? Infinity : -Infinity;
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
    ];
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
                    loop = true;
                }
                if (((directionProtected[3][i - 1] && directionProtected[3][i - 1][j - 1] && currentBoard[i - 1][j - 1] == currentBoard[i][j]) || (directionProtected[3][i + 1] && directionProtected[3][i + 1][j + 1] && currentBoard[i + 1][j + 1] == currentBoard[i][j])) && !directionProtected[3][i][j]) {
                    directionProtected[3][i][j] = true;
                    loop = true;
                }
                if (((directionProtected[2][i + 1] && directionProtected[2][i + 1][j - 1] && currentBoard[i + 1][j - 1] == currentBoard[i][j]) || (directionProtected[2][i - 1] && directionProtected[2][i - 1][j + 1] && currentBoard[i - 1][j + 1] == currentBoard[i][j])) && !directionProtected[2][i][j]) {
                    directionProtected[2][i][j] = true;
                    loop = true;
                }
                if (((directionProtected[1][i + 1] && directionProtected[1][i + 1][j] && currentBoard[i + 1][j] == currentBoard[i][j]) || (directionProtected[1][i - 1] && directionProtected[1][i - 1][j] && currentBoard[i - 1][j] == currentBoard[i][j])) && !directionProtected[1][i][j]) {
                    directionProtected[1][i][j] = true;
                    loop = true;
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
    return search({
        board: currentBoard
    }, depth, color, color);
}
let positionsConsidered = 0;
function evaluate(currentBoard, player) {
    positionsConsidered++;
    let flat = currentBoard.flat();
    if (!flat.includes(player)) return 64 * 17;
    else if (!flat.includes(-player)) return -64 * 17;
    else if (!flat.includes(0)) {
        let sortedFlat = flat.sort();
        return (sortedFlat.indexOf(1) - 32) * 2 * player * 17;
    }
    let evaluation = 0;
    let stableDiscs = getStableDiscs(currentBoard);
    for (let m = 0; m < 8; m++) {
        for (let n = 0; n < 8; n++) {
            evaluation += ((stableDiscs[m][n]) ? -17 : STATIC_TABLE[m][n]) * currentBoard[m][n];
        }
    }
    evaluation *= player;
    return evaluation;
}
function calculateFinalEval(bd, player) {
    positionsConsidered++;
    let discs = discCount(bd);
    let blackAdvantageAnti = 0;
    if (discs.black != discs.white) {
        blackAdvantageAnti = (64 - discs.black - discs.white + Math.abs(discs.black - discs.white)) * ((discs.black < discs.white) ? 1 : -1)
    }
    return blackAdvantageAnti * player;
}
function evaluateNew(bd, player) {
    positionsConsidered++;
    let evaluation = 0;
    let discs = discCount(bd);
    /*if (discs.black + discs.white == 64) {
        let blackAdvantageAnti = 0;
        if (discs.black != discs.white) {
            blackAdvantageAnti = (64 - discs.black - discs.white + Math.abs(discs.black - discs.white)) * ((discs.black < discs.white) ? 1 : -1)
        }
        return blackAdvantageAnti * player;
    }*/
    let moveIndex = discs.black + discs.white - 4 - 1;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[1][0], bd[1][1], bd[1][2], bd[2][0], bd[2][1], bd[2][2]),
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[0][1], bd[1][1], bd[2][1], bd[0][2], bd[1][2], bd[2][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[1][7], bd[1][6], bd[1][5], bd[2][7], bd[2][6], bd[2][5]),
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[0][6], bd[1][6], bd[2][6], bd[0][5], bd[1][5], bd[2][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[6][0], bd[6][1], bd[6][2], bd[5][0], bd[5][1], bd[5][2]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[7][1], bd[6][1], bd[5][1], bd[7][2], bd[6][2], bd[5][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[6][7], bd[6][6], bd[6][5], bd[5][7], bd[5][6], bd[5][5]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[7][6], bd[6][6], bd[5][6], bd[7][5], bd[6][5], bd[5][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[1][0], bd[1][1], bd[1][2], bd[1][3], bd[1][4])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[0][1], bd[1][1], bd[2][1], bd[3][1], bd[4][1])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[6][0], bd[6][1], bd[6][2], bd[6][3], bd[6][4])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[7][1], bd[6][1], bd[5][1], bd[4][1], bd[3][1])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[1][7], bd[1][6], bd[1][5], bd[1][4], bd[1][3])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[0][6], bd[1][6], bd[2][6], bd[3][6], bd[4][6])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[7][6], bd[6][6], bd[5][6], bd[4][6], bd[3][6])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[6][7], bd[6][6], bd[6][5], bd[6][4], bd[6][3])
    ] || 0;
    /*evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[0][5], bd[0][6], bd[0][7]),
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[0][2], bd[0][1], bd[0][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[7][5], bd[7][6], bd[7][7]),
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[7][2], bd[7][1], bd[7][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[5][0], bd[6][0], bd[7][0]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[2][0], bd[1][0], bd[0][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[5][7], bd[6][7], bd[7][7]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[2][7], bd[1][7], bd[0][7])
    )]||0;*/
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[1][0], bd[1][1], bd[1][2], bd[1][3], bd[1][4], bd[1][5], bd[1][6], bd[1][7]),
        getPatternNo(bd[1][7], bd[1][6], bd[1][5], bd[1][4], bd[1][3], bd[1][2], bd[1][1], bd[1][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[6][0], bd[6][1], bd[6][2], bd[6][3], bd[6][4], bd[6][5], bd[6][6], bd[6][7]),
        getPatternNo(bd[6][7], bd[6][6], bd[6][5], bd[6][4], bd[6][3], bd[6][2], bd[6][1], bd[6][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[0][1], bd[1][1], bd[2][1], bd[3][1], bd[4][1], bd[5][1], bd[6][1], bd[7][1]),
        getPatternNo(bd[7][1], bd[6][1], bd[5][1], bd[4][1], bd[3][1], bd[2][1], bd[1][1], bd[0][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[0][6], bd[1][6], bd[2][6], bd[3][6], bd[4][6], bd[5][6], bd[6][6], bd[7][6]),
        getPatternNo(bd[7][6], bd[6][6], bd[5][6], bd[4][6], bd[3][6], bd[2][6], bd[1][6], bd[0][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[2][0], bd[2][1], bd[2][2], bd[2][3], bd[2][4], bd[2][5], bd[2][6], bd[2][7]),
        getPatternNo(bd[2][7], bd[2][6], bd[2][5], bd[2][4], bd[2][3], bd[2][2], bd[2][1], bd[2][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[5][0], bd[5][1], bd[5][2], bd[5][3], bd[5][4], bd[5][5], bd[5][6], bd[5][7]),
        getPatternNo(bd[5][7], bd[5][6], bd[5][5], bd[5][4], bd[5][3], bd[5][2], bd[5][1], bd[5][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[0][2], bd[1][2], bd[2][2], bd[3][2], bd[4][2], bd[5][2], bd[6][2], bd[7][2]),
        getPatternNo(bd[7][2], bd[6][2], bd[5][2], bd[4][2], bd[3][2], bd[2][2], bd[1][2], bd[0][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[0][5], bd[1][5], bd[2][5], bd[3][5], bd[4][5], bd[5][5], bd[6][5], bd[7][5]),
        getPatternNo(bd[7][5], bd[6][5], bd[5][5], bd[4][5], bd[3][5], bd[2][5], bd[1][5], bd[0][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[3][0], bd[3][1], bd[3][2], bd[3][3], bd[3][4], bd[3][5], bd[3][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[3][6], bd[3][5], bd[3][4], bd[3][3], bd[3][2], bd[3][1], bd[3][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[4][0], bd[4][1], bd[4][2], bd[4][3], bd[4][4], bd[4][5], bd[4][6], bd[4][7]),
        getPatternNo(bd[4][7], bd[4][6], bd[4][5], bd[4][4], bd[4][3], bd[4][2], bd[4][1], bd[4][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[0][3], bd[1][3], bd[2][3], bd[3][3], bd[4][3], bd[5][3], bd[6][3], bd[7][3]),
        getPatternNo(bd[7][3], bd[6][3], bd[5][3], bd[4][3], bd[3][3], bd[2][3], bd[1][3], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[0][4], bd[1][4], bd[2][4], bd[3][4], bd[4][4], bd[5][4], bd[6][4], bd[7][4]),
        getPatternNo(bd[7][4], bd[6][4], bd[5][4], bd[4][4], bd[3][4], bd[2][4], bd[1][4], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[0][5], bd[0][6], bd[0][7], bd[1][1], bd[1][6]),
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[0][2], bd[0][1], bd[0][0], bd[1][6], bd[1][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[7][5], bd[7][6], bd[7][7], bd[6][1], bd[6][6]),
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[7][2], bd[7][1], bd[7][0], bd[6][6], bd[6][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[5][0], bd[6][0], bd[7][0], bd[1][1], bd[6][1]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[2][0], bd[1][0], bd[0][0], bd[6][1], bd[1][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[5][7], bd[6][7], bd[7][7], bd[1][6], bd[6][6]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[2][7], bd[1][7], bd[0][7], bd[6][6], bd[1][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[0][3], bd[1][2], bd[2][1], bd[3][0]),
        getPatternNo(bd[3][0], bd[2][1], bd[1][2], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[0][4], bd[1][5], bd[2][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[2][6], bd[1][5], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[4][0], bd[5][1], bd[6][2], bd[7][3]),
        getPatternNo(bd[7][3], bd[6][2], bd[5][1], bd[4][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[4][7], bd[5][6], bd[6][5], bd[7][4]),
        getPatternNo(bd[7][4], bd[6][5], bd[5][6], bd[4][7])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[0][4], bd[1][3], bd[2][2], bd[3][1], bd[4][0]),
        getPatternNo(bd[4][0], bd[3][1], bd[2][2], bd[1][3], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[7][4], bd[6][3], bd[5][2], bd[4][1], bd[3][0]),
        getPatternNo(bd[3][0], bd[4][1], bd[5][2], bd[6][3], bd[7][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[0][3], bd[1][4], bd[2][5], bd[3][6], bd[4][7]),
        getPatternNo(bd[4][7], bd[3][6], bd[2][5], bd[1][4], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[7][3], bd[6][4], bd[5][5], bd[4][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[4][6], bd[5][5], bd[6][4], bd[7][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[0][5], bd[1][4], bd[2][3], bd[3][2], bd[4][1], bd[5][0]),
        getPatternNo(bd[5][0], bd[4][1], bd[3][2], bd[2][3], bd[1][4], bd[0][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[0][2], bd[1][3], bd[2][4], bd[3][5], bd[4][6], bd[5][7]),
        getPatternNo(bd[2][0], bd[3][1], bd[4][2], bd[5][3], bd[6][4], bd[7][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[7][5], bd[6][4], bd[5][3], bd[4][2], bd[3][1], bd[2][0]),
        getPatternNo(bd[5][7], bd[4][6], bd[3][5], bd[2][4], bd[1][3], bd[0][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[7][2], bd[6][3], bd[5][4], bd[4][5], bd[3][6], bd[2][7]),
        getPatternNo(bd[2][7], bd[3][6], bd[4][5], bd[5][4], bd[6][3], bd[7][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[0][6], bd[1][5], bd[2][4], bd[3][3], bd[4][2], bd[5][1], bd[6][0]),
        getPatternNo(bd[6][0], bd[5][1], bd[4][2], bd[3][3], bd[2][4], bd[1][5], bd[0][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[0][1], bd[1][2], bd[2][3], bd[3][4], bd[4][5], bd[5][6], bd[6][7]),
        getPatternNo(bd[1][0], bd[2][1], bd[3][2], bd[4][3], bd[5][4], bd[6][5], bd[7][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[7][6], bd[6][5], bd[5][4], bd[4][3], bd[3][2], bd[2][1], bd[1][0]),
        getPatternNo(bd[6][7], bd[5][6], bd[4][5], bd[3][4], bd[2][3], bd[1][2], bd[0][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[7][1], bd[6][2], bd[5][3], bd[4][4], bd[3][5], bd[2][6], bd[1][7]),
        getPatternNo(bd[1][7], bd[2][6], bd[3][5], bd[4][4], bd[5][3], bd[6][2], bd[7][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal8"][Math.min(
        getPatternNo(bd[0][0], bd[1][1], bd[2][2], bd[3][3], bd[4][4], bd[5][5], bd[6][6], bd[7][7]),
        getPatternNo(bd[7][7], bd[6][6], bd[5][5], bd[4][4], bd[3][3], bd[2][2], bd[1][1], bd[0][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal8"][Math.min(
        getPatternNo(bd[0][7], bd[1][6], bd[2][5], bd[3][4], bd[4][3], bd[5][2], bd[6][1], bd[7][0]),
        getPatternNo(bd[7][0], bd[6][1], bd[5][2], bd[4][3], bd[3][4], bd[2][5], bd[1][6], bd[0][7])
    )] || 0;
    evaluation /= /*50 */46;
    if (negateEval) evaluation *= -1;
    return evaluation * player;
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
function getPatternNo() {
    let no = 0;
    for (let i = 0; i < arguments.length; i++) {
        //empty:0 black:1 white:2
        if (arguments[i] == 1) no += 1 * 3 ** (arguments.length - 1 - i);
        else if (arguments[i] == -1) no += 2 * 3 ** (arguments.length - 1 - i);
    }
    return no;
}